/* CodeIn City · akun warga (login Google lewat Firebase Authentication).
   Tamu tetap bisa jalan-jalan dan mengobrol tanpa login. Warga (anggota yang login) bisa daftar hosting dan mengajukan baliho;
   nanti juga punya rumah di Perumahan CodeIn.
   Firebase hanya dipakai untuk login. Profil warga (nama dan karakter) disimpan di server CodeIn News:
     POST /api/warga/masuk   -> dipanggil setiap login; warga baru dibuat dari profil kota yang sedang dipakai
     GET  /api/warga/saya    -> profil warga
     PUT  /api/warga/profil  -> ganti nama atau karakter
   Setiap permintaan membawa ID token Firebase (header Authorization), yang diperiksa server.
   Pengaturan Firebase ada di KOTA.firebase (config.js). Kalau kosong, tombol login tidak tampil. */

const Akun = (() => {
  const C = KOTA.firebase || {};
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = ((lokal && new URLSearchParams(location.search).get("api")) || KOTA.news).replace(/\/+$/, "");
  const nyala = Boolean(C.apiKey && C.projectId && C.authDomain && window.firebase && firebase.auth);

  let auth = null, warga = null, pesan = "";
  // keadaan: "mati" (login belum disiapkan), "memuat", "tamu", "warga", "galat" (login Google berhasil tapi server tidak bisa dihubungi)
  let keadaan = nyala ? "memuat" : "mati";
  const pendengar = [], penunggu = [];
  let selesai = 0;          // berapa kali login Google sudah selesai diperiksa server (berhasil atau gagal)

  function kabari() {
    for (const f of pendengar) { try { f(keadaan, warga); } catch (e) { console.error(e); } }
    if (keadaan !== "memuat") penunggu.splice(0).forEach(f => f());
  }
  const tunggu = () => keadaan === "memuat" ? new Promise(r => penunggu.push(r)) : Promise.resolve();

  async function minta(metode, jalur, isi) {
    const u = auth && auth.currentUser;
    if (!u) throw Object.assign(new Error("Masuk dulu dengan akun Google, ya."), {status: 401});
    const token = await u.getIdToken();
    const r = await fetch(API + jalur, {method: metode, body: isi === undefined ? undefined : JSON.stringify(isi),
      headers: {"Content-Type": "application/json", "X-NA": "1", Authorization: "Bearer " + token}});
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || `Server menolak (kode ${r.status}).`), {status: r.status, data: d});
    return d;
  }

  async function saatGanti(u) {
    if (!u) { warga = null; keadaan = "tamu"; kabari(); return; }
    keadaan = "memuat"; kabari();
    const p = Profil.muat();
    try {
      warga = await minta("POST", "/api/warga/masuk", {nama: p ? p.nama : "", karakter: p ? p.karakter : 0});
      keadaan = "warga"; pesan = warga.alasan || "";
      if (warga.nama) Profil.simpan({nama: warga.nama, karakter: warga.karakter});
    } catch (e) {
      warga = null;
      if (e.status === 403 || e.status === 401) { pesan = e.message; keadaan = "tamu"; auth.signOut().catch(() => {}); }
      else { pesan = e instanceof TypeError ? "CodeIn News sedang tidak bisa dihubungi. Coba lagi sebentar." : e.message; keadaan = "galat"; }
    }
    selesai++;
    kabari();
  }

  if (nyala) {
    try {
      firebase.initializeApp({apiKey: C.apiKey, authDomain: C.authDomain, projectId: C.projectId, appId: C.appId});
      auth = firebase.auth();
      auth.languageCode = "id";
      auth.onAuthStateChanged(saatGanti);
    } catch (e) { console.error(e); keadaan = "mati"; }
  }

  const GALAT = {
    "auth/popup-closed-by-user": "", "auth/cancelled-popup-request": "", "auth/user-cancelled": "",
    "auth/network-request-failed": "Internet sedang putus. Coba lagi sebentar.",
    "auth/unauthorized-domain": "Alamat ini belum diizinkan untuk login. Kabari admin CodeIn, ya.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.",
  };
  // Masuk dengan Google. Mengembalikan "" kalau berhasil (atau dibatalkan), selain itu pesan untuk ditampilkan.
  async function masuk() {
    if (!auth) return "Login warga belum dibuka.";
    if (auth.currentUser && keadaan === "galat") { await saatGanti(auth.currentUser); return keadaan === "warga" ? "" : pesan; }   // Google sudah, server belum
    const penyedia = new firebase.auth.GoogleAuthProvider();
    penyedia.setCustomParameters({prompt: "select_account"});
    const awal = selesai;
    try {
      await auth.signInWithPopup(penyedia);
      // tunggu sampai server selesai memeriksa login ini (paling lama 20 detik)
      for (let t = 0; selesai === awal && t < 200; t++) await new Promise(r => setTimeout(r, 100));
      return keadaan === "warga" ? "" : pesan;
    } catch (e) {
      if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
        try { await auth.signInWithRedirect(penyedia); return ""; } catch (e2) { e = e2; }
      }
      return e.code in GALAT ? GALAT[e.code] : "Belum bisa masuk: " + (e.message || e.code);
    }
  }
  async function keluar() { if (auth) await auth.signOut(); }

  async function simpanProfil(p) {
    warga = await minta("PUT", "/api/warga/profil", {nama: p.nama, karakter: p.karakter});
    pesan = ""; kabari();
    return warga;
  }

  const sudahWarga = () => keadaan === "warga" && warga && !warga.perluNama;

  /* Pintu fitur khusus warga. Kalau sudah warga, lanjut() langsung jalan; kalau belum, dialog ajakan masuk dibuka
     dan lanjut() dijalankan setelah login berhasil. */
  function pastikan(fitur, lanjut) {
    if (sudahWarga()) { lanjut(); return; }
    if (keadaan === "memuat") { tunggu().then(() => pastikan(fitur, lanjut)); return; }
    if (keadaan === "mati") {
      Panel.buka("Khusus warga", [el("p", null, `${fitur} hanya untuk warga CodeIn City yang sudah masuk dengan akun Google. Login warga sedang disiapkan; coba lagi nanti, ya.`)], [{teks: "Tutup"}]);
      return;
    }
    if (keadaan === "warga" && warga.perluNama) { Judul.tampil(Profil.muat(), "Pilih nama wargamu dulu. " + (pesan || "")); return; }
    const ket = el("p", "pesan"); ket.setAttribute("role", "status");
    if (pesan) ket.textContent = pesan;
    const isi = [el("p", null, `${fitur} khusus warga CodeIn City. Masuk dengan akun Google untuk jadi warga; gratis, cukup sekali.`),
      el("p", "redup", "Tanpa masuk pun kamu tetap bisa jalan-jalan dan mengobrol sebagai tamu. Email akunmu hanya terlihat oleh admin CodeIn."), ket];
    Panel.buka("Masuk sebagai warga", isi, [{teks: "Masuk dengan Google", utama: true, aksi: async () => {
      Kota.kabar("Membuka jendela login Google…");
      const salah = await masuk();
      if (sudahWarga()) { Kota.kabar(`Selamat datang, warga ${warga.nama}.`); lanjut(); }
      else if (keadaan === "warga" && warga.perluNama) Judul.tampil(Profil.muat(), "Pilih nama wargamu dulu. " + (pesan || ""));
      else if (salah) { pesan = salah; pastikan(fitur, lanjut); }
    }}, {teks: "Nanti saja"}]);
  }

  // permintaan ke CodeIn News atas nama warga (dipakai formulir hosting dan baliho)
  const kirim = (jalur, isi, metode = "POST") => minta(metode, jalur, isi);
  const ambil = jalur => minta("GET", jalur);

  return {
    nyala: () => keadaan !== "mati", keadaan: () => keadaan, warga: () => warga, pesan: () => pesan, sudahWarga,
    masuk, keluar, simpanProfil, pastikan, kirim, ambil, tunggu, saatBerubah: f => { pendengar.push(f); },
  };
})();

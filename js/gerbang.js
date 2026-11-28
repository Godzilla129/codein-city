/* CodeIn City · Gerbang CodeIn: layar sambutan setiap kali codeinhub.my.id dibuka, sebelum masuk kota.
   Isinya: pratinjau kota (gambar siang atau malam sesuai jam WIB) dengan jumlah orang di kota dan kemajuan memuat,
   acara terdekat, foto kegiatan terbaru, dan tiga jalan:
     - Masuk Kota: wajib login Google (js/akun.js). Warga yang kembali cukup sekali klik, dan disapa dengan kabar buku
       tamu rumahnya (js/bukutamu.js). Warga baru memilih nama dan karakter dulu (js/judul.js).
     - Intip kota: lihat-lihat tanpa login sebagai tamu. Tidak bisa ngobrol atau masuk rumah warga; aksi lain yang butuh
       akun (mancing, toko, kebun, acara, buku tamu) meminta login seperti biasa. Bilah bawah mengajak masuk.
     - Kenali CodeIn: penjelasan komunitas.
   Keluar dari akun membawa kembali ke gerbang. Uji otomatis di localhost boleh melewati gerbang dengan ?uji=1. */

const Gerbang = (() => {
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const q = new URLSearchParams(location.search);
  const lewati = lokal && q.has("uji");
  const API = ((lokal && q.get("api")) || KOTA.news).replace(/\/+$/, "");
  const g = $("gerbang"), sambut = $("gerbang-sambut"), tentang = $("gerbang-tentang"), pesan = $("gerbang-pesan");
  let sibuk = false, intip = false, kabar = null, jedaRamai = null;

  function lihat(bagian) {
    sambut.hidden = bagian !== "sambut"; tentang.hidden = bagian !== "tentang";
    g.scrollTop = 0;
    (bagian === "sambut" ? $("btn-masuk-kota") : $("tentang-judul")).focus({preventScroll: true});
  }
  function tampil(pesanAwal) {
    berhentiIntip();
    document.body.classList.add("di-gerbang");
    $("hud").hidden = true; $("judul").hidden = true; g.hidden = false;
    pesan.textContent = pesanAwal || "";
    gambarPratinjau(); tulis(); lihat("sambut");
    muatKabar();
    if (!jedaRamai) { muatRamai(); jedaRamai = setInterval(() => { if (terbuka()) muatRamai(); }, 30000); }
  }
  function tutup() { g.hidden = true; document.body.classList.remove("di-gerbang"); }
  const terbuka = () => !g.hidden;

  function tulis() {
    const k = Akun.keadaan(), w = Akun.warga();
    const warga = k === "warga" && w && !w.perluNama;
    const sapa = $("gerbang-sapa");
    sapa.hidden = !warga;
    if (warga) sapa.textContent = `Selamat datang kembali, ${w.nama}.`;
    const ada = warga && kabar && (kabar.baru || kabar.mampir);
    $("gerbang-kabar").hidden = !ada;
    if (ada) $("gerbang-kabar").textContent = [kabar.baru ? `${kabar.baru} tulisan baru` : "", kabar.mampir ? `${kabar.mampir} tamu mampir` : ""]
      .filter(Boolean).join(" dan ") + " di rumahmu.";
    $("btn-masuk-kota").textContent = warga ? "Lanjut ke kota" : k === "memuat" ? "Memeriksa akun…" : "Masuk Kota";
    $("btn-masuk-kota").disabled = sibuk || k === "memuat";
    $("btn-masuk-kota-2").disabled = sibuk || k === "memuat";
    $("btn-intip").hidden = warga;
    $("gerbang-catatan").hidden = warga;
  }

  /* ---------- pratinjau, jumlah orang, kemajuan memuat ---------- */
  function gambarPratinjau() {
    const h = Kota.jam(), malam = h < 5.5 || h >= 18.5;
    const src = malam ? "assets/pratinjau-kota-malam.png" : "assets/pratinjau-kota.png";
    if (!$("gerbang-gambar").src.endsWith(src)) $("gerbang-gambar").src = src;
  }
  async function muatRamai() {
    try {
      const r = await fetch(API + "/api/kota/ramai", {headers: {Accept: "application/json"}});
      const d = r.ok ? await r.json() : null;
      const n = d && Number.isInteger(d.orang) ? d.orang : null;
      $("gerbang-ramai").hidden = n === null;
      if (n !== null) $("gerbang-ramai-teks").textContent = n > 0 ? `${n} orang di kota sekarang` : "Kota sedang sepi. Jadilah yang pertama.";
    } catch (e) { $("gerbang-ramai").hidden = true; }
  }
  Kota.saatMemuat(v => {
    $("gerbang-muat-isi").style.width = Math.round(v * 100) + "%";
    $("gerbang-muat-teks").textContent = v >= 1 ? "Kota siap" : `Memuat kota… ${Math.round(v * 100)}%`;
    if (v >= 1) setTimeout(() => $("gerbang-muat").classList.add("siap"), 600);
  });

  /* ---------- acara terdekat dan foto kegiatan ---------- */
  async function muatKabar() {
    try {
      const r = await fetch(API + "/api/acara", {headers: {Accept: "application/json"}});
      const daftar = r.ok ? ((await r.json()).acara || []) : [];
      const a = daftar.find(a => a.buka) || daftar[0];
      $("gerbang-acara").hidden = !a;
      if (a) {
        $("gerbang-acara-judul").textContent = a.judul;
        const tgl = new Date(a.tanggal + "T00:00:00+07:00").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta"});
        $("gerbang-acara-kapan").textContent = [tgl, a.jam, a.tempat].filter(Boolean).join(" · ");
        $("btn-gerbang-acara").onclick = () => Acara.buka(a);
      }
    } catch (e) { $("gerbang-acara").hidden = true; }
    const foto = await Komunitas.siap().catch(() => []);
    const baris = $("gerbang-foto-baris");
    baris.replaceChildren(...foto.slice(0, 3).map((f, i) => {
      const b = el("button"); b.type = "button"; b.title = f.judul || "Foto kegiatan CodeIn";
      const img = el("img"); Komunitas.pasangGambar(img, f, "kecil");
      b.append(img); b.onclick = () => Komunitas.lihat(i);
      return b;
    }));
    $("gerbang-foto").hidden = !foto.length;
    sambut.querySelector(".gerbang-isi").classList.toggle("tanpa-samping", $("gerbang-acara").hidden && $("gerbang-foto").hidden);
    muatSapa();
  }
  // kabar buku tamu untuk warga yang kembali: tulisan baru dan tamu yang mampir ke rumahnya
  async function muatSapa() {
    if (Akun.keadaan() !== "warga" || Akun.warga().perluNama) { kabar = null; return; }
    kabar = await BukuTamu.ringkas().catch(() => null);
    if (terbuka()) tulis();
  }

  /* ---------- masuk dan intip ---------- */
  async function masukKota() {
    if (sibuk) return;
    sibuk = true; pesan.textContent = ""; tulis();
    try {
      await Akun.tunggu();
      if (Akun.keadaan() === "mati") { pesan.textContent = "Login warga belum dibuka. Coba lagi nanti, ya."; return; }
      if (!(Akun.keadaan() === "warga")) {
        pesan.textContent = "Membuka jendela login Google…";
        const salah = await Akun.masuk();
        pesan.textContent = "";
        if (Akun.keadaan() !== "warga") { pesan.textContent = salah || Akun.pesan() || ""; return; }
      }
      const w = Akun.warga();
      tutup();
      if (w.perluNama) Judul.tampil(Profil.muat(), "Pilih nama dan karakter wargamu dulu. " + (Akun.pesan() || ""));
      else Judul.masuk({nama: w.nama, karakter: w.karakter});
    } finally { sibuk = false; tulis(); }
  }
  function mulaiIntip() {
    intip = true;
    document.body.classList.add("mengintip");
    $("intip-bar").hidden = false;
    tutup();
    const p = Profil.muat();
    Judul.masuk({nama: Profil.cekNama("").nama, karakter: p ? p.karakter : Math.floor(Math.random() * KOTA.karakter.length)});
  }
  function berhentiIntip() {
    intip = false;
    document.body.classList.remove("mengintip");
    $("intip-bar").hidden = true;
  }
  Akun.saatBerubah(k => { if (!terbuka()) return; tulis(); if (k === "warga") muatSapa(); });
  $("btn-masuk-kota").onclick = masukKota;
  $("btn-masuk-kota-2").onclick = masukKota;
  $("btn-intip").onclick = mulaiIntip;
  $("btn-intip-masuk").onclick = masukKota;
  $("btn-kenali").onclick = () => lihat("tentang");
  $("btn-kembali-gerbang").onclick = () => lihat("sambut");

  // cuaca Bengkulu di pojok gerbang (js/cuaca.js memanggil ini saat datanya datang)
  function cuaca(teks) {
    const c = $("gerbang-cuaca");
    c.hidden = !teks; if (teks) c.textContent = `Bengkulu sekarang: ${teks}`;
  }

  return {tampil, tutup, terbuka, lewati, cuaca, masukKota, mengintip: () => intip, selesaiIntip: berhentiIntip};
})();

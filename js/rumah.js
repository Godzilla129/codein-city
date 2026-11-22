/* CodeIn City · hosting proyek anggota (CodeIn Rumah).
   Semua anggota bisa menghosting situs proyeknya; pendaftarannya lewat Kak Rani di Markas (js/warga.js).
   Semua situs yang tayang tercantum di Direktori Proyek. Empat rumah di peta (pintu dengan tujuan "proyek": proyek-1
   sampai proyek-4) adalah hadiah untuk proyek unggulan yang dipilih admin, bukan syarat untuk dihosting.
     GET  /api/rumah          -> semua proyek yang sudah tayang; yang dapat rumah membawa id rumahnya
     POST /api/rumah/ajukan   -> pendaftaran hosting, khusus warga yang login (js/akun.js); admin menyetujui di /admin,
                                 lalu mengirim kunci upload
   Situs proyeknya sendiri disajikan oleh layanan CodeIn Rumah di https://<nama>.codeinhub.my.id. */

const RumahProyek = (() => {
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = ((lokal && new URLSearchParams(location.search).get("api")) || KOTA.news).replace(/\/+$/, "");
  const DOMAIN = KOTA.domain, SEGAR = 120000;
  const POLA = /^[a-z0-9](?:[a-z0-9-]{1,18}[a-z0-9])$/;
  const DIPESAN = new Set(["www", "news", "live", "rumah", "admin", "api", "mail", "smtp", "imap", "pop", "ftp", "cdn", "static",
    "assets", "kota", "city", "codein", "codeinhub", "ns1", "ns2", "status", "login", "auth", "dashboard"]);
  let daftar = [], keadaan = "memuat", isian = null, terakhir = 0;

  /* ---------- data ---------- */
  async function segarkan() {
    if (document.hidden) return;
    terakhir = Date.now();
    const batas = new AbortController(), waktu = setTimeout(() => batas.abort(), 15000);
    try {
      const r = await fetch(API + "/api/rumah", {headers: {Accept: "application/json"}, signal: batas.signal});
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      daftar = Array.isArray(d) ? d.filter(s => s && s.judul && /^https:\/\//.test(s.url || "")) : [];
      keadaan = "siap";
    } catch (e) {
      if (keadaan !== "siap") keadaan = "gagal";
    } finally { clearTimeout(waktu); }
    terapkan();
  }
  // tulis nama proyek di papan nama rumahnya; rumah tanpa proyek kembali bertuliskan "kosong"
  function terapkan() {
    if (Kota.ruang() !== "kota") return;
    for (const p of Kota.pintu()) {
      if (p.tujuan !== "proyek") continue;
      if (!p.namaAsli) p.namaAsli = p.nama;
      const s = daftar.find(d => d.rumah === p.id) || null;
      p.proyek = s;
      p.nama = s ? s.judul : p.namaAsli;
      if (p.labelEl) { p.labelEl.textContent = s ? s.judul : p.namaAsli; p.labelEl.classList.toggle("kosong", !s); }
    }
  }

  /* ---------- dialog ---------- */
  const paragraf = t => el("p", null, t);

  function buka(p) {
    if (p.proyek) {
      const s = p.proyek, isi = [];
      if (s.deskripsi) isi.push(paragraf(s.deskripsi));
      if (s.pemilik) isi.push(el("p", "redup", "Penghuni: " + s.pemilik));
      isi.push(el("p", "redup", s.url.replace("https://", "")));
      // situs proyek dibuka di tab baru supaya pengunjung tidak keluar dari kota
      Panel.buka(s.judul, isi, [{teks: "Masuk ke situsnya ↗", utama: true, aksi: () => window.open(s.url, "_blank", "noopener")}, {teks: "Tutup"}]);
      return;
    }
    if (keadaan === "gagal") {
      Panel.buka(p.namaAsli || p.nama, [el("p", "redup", "Data rumah proyek belum bisa dimuat. CodeIn News mungkin sedang tidak terjangkau, coba lagi sebentar.")], [{teks: "Tutup"}]);
      return;
    }
    Panel.buka(p.namaAsli || p.nama, [
      paragraf("Rumah ini disiapkan untuk proyek unggulan anggota CodeIn, dipilih admin dari proyek yang sudah tayang."),
      paragraf(`Semua proyek bisa dihosting gratis di namaproyek.${DOMAIN} dan tercantum di Direktori Proyek. Daftarnya lewat Kak Rani di meja resepsionis Markas CodeIn.`),
    ], [{teks: "Antar ke Kak Rani", utama: true, aksi: () => Kota.keResepsionis()}, {teks: "Direktori proyek", aksi: direktori}, {teks: "Tutup"}]);
  }

  // dari teks bebas ke subdomain: "Aetheria: Pengembara!" -> "aetheria-pengembara"
  const jadikanNama = t => t.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20).replace(/-+$/, "");

  function periksa(f) {
    if (f.judul.trim().length < 2) return ["judul", "Nama proyek wajib diisi."];
    if (!POLA.test(f.nama)) return ["nama", "Subdomain 3 sampai 20 huruf kecil, angka, atau tanda minus, tanpa minus di awal atau akhir."];
    if (DIPESAN.has(f.nama)) return ["nama", "Subdomain itu dipakai CodeIn sendiri. Pilih nama lain."];
    if (daftar.some(d => d.nama === f.nama)) return ["nama", "Subdomain itu sudah dipakai proyek lain."];
    if (f.deskripsi.trim().length < 5) return ["deskripsi", "Deskripsi minimal 5 huruf."];
    if (f.pemilik.trim().length < 2) return ["pemilik", "Nama kamu atau timmu wajib diisi."];
    if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return ["email", "Format email belum benar."];
    const wa = f.wa.replace(/\D/g, "").length;
    if (f.wa.trim() && (wa < 9 || wa > 15)) return ["wa", "Nomor WhatsApp belum benar."];
    if (!f.setuju) return ["setuju", "Centang persetujuan Aturan Rumah Proyek dulu."];
    return null;
  }

  function formulir() {
    if (!Akun.sudahWarga()) { Akun.pastikan("Daftar hosting proyek", formulir); return; }
    const FITUR = "Daftar hosting proyek", ULANG = formulir;
    if (!isian) {
      const nama = Akun.warga().nama;
      isian = {judul: "", nama: "", deskripsi: "", pemilik: nama, email: "", wa: "", website: "", setuju: false, namaDiubah: false};
    }
    const f = isian;
    const form = el("form", "isian"), medan = {}, pesan = el("p", "pesan"); form.noValidate = true; pesan.setAttribute("role", "status");
    const alamat = el("p", "redup");
    const tulisAlamat = () => { alamat.textContent = f.nama ? `Alamat situsmu: ${f.nama}.${DOMAIN}` : `Alamat situsmu: namaproyek.${DOMAIN}`; };
    const kolom = (label, kunci, maks, tipe, contoh, tambahan) => {
      const l = el("label", null, label), i = el("input");
      i.type = tipe; i.maxLength = maks; i.value = f[kunci]; i.name = kunci; if (contoh) i.placeholder = contoh;
      i.spellcheck = false; i.autocomplete = {pemilik: "name", email: "email", wa: "tel"}[kunci] || "off";
      i.oninput = () => { f[kunci] = i.value; pesan.textContent = ""; if (tambahan) tambahan(i); };
      l.append(i); medan[kunci] = i; return l;
    };
    const kolomJudul = kolom("Nama proyek", "judul", 28, "text", "Maksimal 28 huruf", () => {
      if (!f.namaDiubah) { f.nama = jadikanNama(f.judul); medan.nama.value = f.nama; tulisAlamat(); }      // subdomain mengikuti nama proyek
    });
    const kolomNama = kolom("Subdomain", "nama", 20, "text", "huruf kecil, angka, minus", i => {
      i.value = i.value.toLowerCase().replace(/[^a-z0-9-]/g, ""); f.nama = i.value; f.namaDiubah = true; tulisAlamat();
    });
    tulisAlamat();
    const jebakan = el("input", "jebakan"); jebakan.name = "website"; jebakan.tabIndex = -1; jebakan.autocomplete = "off"; jebakan.setAttribute("aria-hidden", "true");
    jebakan.oninput = () => { f.website = jebakan.value; };
    // persetujuan aturan: wajib dicentang, halaman aturannya ada di layanan CodeIn Rumah
    const setuju = el("label", "setuju"), centang = el("input"), aturan = el("a", null, "Aturan Rumah Proyek");
    centang.type = "checkbox"; centang.name = "setuju"; centang.checked = f.setuju;
    centang.onchange = () => { f.setuju = centang.checked; pesan.textContent = ""; };
    aturan.href = `https://rumah.${DOMAIN}/aturan`; aturan.target = "_blank"; aturan.rel = "noopener";
    const teksSetuju = el("span"); teksSetuju.append("Aku sudah membaca dan setuju dengan ", aturan, ".");
    setuju.append(centang, teksSetuju); medan.setuju = centang;
    const kirim = el("button", "tbl utama", "Kirim pengajuan"); kirim.type = "submit";
    form.append(kolomJudul, kolomNama, alamat,
      kolom("Deskripsi singkat", "deskripsi", 120, "text", "Maksimal 120 huruf"),
      kolom("Nama kamu atau tim", "pemilik", 40, "text"),
      kolom("Email (boleh kosong)", "email", 80, "email", "nama@email.com"),
      kolom("Nomor WhatsApp (boleh kosong)", "wa", 20, "tel", "08…"),
      el("p", "redup", "Kunci upload dikirim ke email atau WhatsApp yang kamu isi. Kalau dua-duanya kosong, admin memakai email akun Google-mu. Hanya admin CodeIn yang bisa melihatnya."));
    form.append(setuju, jebakan, pesan, kirim);
    form.onsubmit = async e => {
      e.preventDefault();
      const salah = periksa(f);
      if (salah) { pesan.textContent = salah[1]; medan[salah[0]].focus(); return; }
      kirim.disabled = true; pesan.textContent = "Mengirim…";
      try {
        const {namaDiubah, ...kirimkan} = f;
        await Akun.kirim("/api/rumah/ajukan", kirimkan);
        const alamatnya = `${f.nama}.${DOMAIN}`;
        isian = null;
        Panel.buka("Pendaftaran terkirim", [paragraf("Terima kasih. Admin CodeIn akan meninjau pendaftaranmu dan mengirim kunci upload lewat kontak yang kamu isi, atau ke email akun Google-mu."),
          paragraf(`Setelah unggahanmu diterbitkan, situsnya tayang di ${alamatnya} dan masuk Direktori Proyek. Proyek yang bagus bisa dipilih admin untuk dapat rumah di kota.`)], [{teks: "Tutup"}]);
      } catch (err) {
        kirim.disabled = false;
        if (err.status === 401) { Akun.pastikan(FITUR, ULANG); return; }
        pesan.textContent = err instanceof TypeError ? "Belum terkirim: CodeIn News sedang tidak bisa dihubungi. Isianmu masih ada, coba lagi sebentar." : "Belum terkirim: " + err.message;
      }
    };
    Panel.buka("Daftar hosting proyek", [paragraf(`Gratis untuk anggota CodeIn. Situsmu tayang di namaproyek.${DOMAIN} dan masuk Direktori Proyek. Yang bisa tayang: HTML, CSS, JavaScript, gambar, suara, dan hasil build React, Vue, atau Vite.`), form], [{teks: "Batal"}], medan.judul);
  }

  /* ---------- Direktori Proyek: semua situs anggota yang sudah tayang ---------- */
  function direktori() {
    const isi = [];
    if (keadaan !== "siap") isi.push(el("p", "redup", keadaan === "gagal" ? "Direktori belum bisa dimuat. CodeIn News mungkin sedang tidak terjangkau, coba lagi sebentar." : "Memuat direktori…"));
    else if (!daftar.length) isi.push(paragraf("Belum ada proyek yang tayang. Punyamu bisa jadi yang pertama."));
    else {
      isi.push(el("p", "redup", `${daftar.length} proyek anggota yang sudah tayang. Yang bertanda rumah sedang menempati rumah di kota.`));
      const ul = el("ul", "galeri");
      for (const s of [...daftar].sort((a, b) => (b.rumah ? 1 : 0) - (a.rumah ? 1 : 0) || a.judul.localeCompare(b.judul))) {
        const li = el("li"), baris = el("div", "galeri-aksi"), buka = el("button", "tbl kecil-tbl", "Buka situsnya ↗");
        buka.type = "button"; buka.onclick = () => window.open(s.url, "_blank", "noopener");
        baris.append(buka);
        if (s.rumah && Kota.ruang() === "kota") {
          const ke = el("button", "tbl kecil-tbl", "Ke rumahnya"); ke.type = "button";
          ke.onclick = () => { Panel.tutup(); Kota.pindahKe(s.rumah); };
          baris.append(ke);
        }
        li.append(el("b", null, (s.rumah ? "🏠 " : "") + s.judul));
        if (s.deskripsi) li.append(el("span", null, s.deskripsi));
        li.append(el("span", "redup", [s.pemilik && "oleh " + s.pemilik, s.url.replace("https://", "")].filter(Boolean).join(" · ")));
        li.append(baris); ul.append(li);
      }
      isi.push(ul);
    }
    // pendaftaran hanya di meja Kak Rani; dari tempat lain, pemain diantar ke sana
    const daftarkan = Kota.ruang() === "markas" ? {teks: "Daftar hosting proyek", utama: true, aksi: () => formulir()}
                                                : {teks: "Antar ke Kak Rani", utama: true, aksi: () => Kota.keResepsionis()};
    Panel.buka("Direktori Proyek", isi, [daftarkan, {teks: "Tutup"}]);
  }

  Kota.saatSiap(() => terapkan());
  segarkan();
  setInterval(segarkan, SEGAR);
  addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - terakhir > SEGAR / 2) segarkan(); });

  return {buka, formulir, direktori, daftar: () => daftar};
})();

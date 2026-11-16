/* CodeIn City · rumah proyek anggota (CodeIn Rumah).
   Empat rumah di peta (pintu dengan tujuan "proyek": proyek-1 sampai proyek-4). Isinya diambil dari CodeIn News:
     GET  /api/rumah          -> proyek yang sudah tayang beserta rumahnya
     POST /api/rumah/ajukan   -> pengajuan rumah dari kota (admin menyetujui di /admin, lalu mengirim kunci upload)
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
      daftar = Array.isArray(d) ? d.filter(s => s && s.rumah && s.judul && /^https:\/\//.test(s.url || "")) : [];
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
  const rumahKosong = () => Kota.ruang() === "kota" ? Kota.pintu().filter(p => p.tujuan === "proyek" && !p.proyek) : [];

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
      paragraf("Rumah ini menunggu proyek anggota CodeIn."),
      paragraf(`Punya situs, game web, atau portofolio? Ajukan rumah ini. Kalau disetujui admin, kamu dapat kunci upload, tinggal unggah zip situsmu, dan situsnya tayang di namaproyek.${DOMAIN}.`),
      el("p", "redup", "Yang bisa tayang: HTML, CSS, JavaScript, gambar, suara, dan hasil build React, Vue, atau Vite. PHP dan database belum bisa."),
    ], [{teks: "Ajukan rumah ini", utama: true, aksi: () => formulir(p.id)}, {teks: "Tutup"}]);
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
    if (!f.email.trim() && !f.wa.trim()) return ["email", "Isi email atau nomor WhatsApp supaya admin bisa mengirim kunci upload."];
    if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return ["email", "Format email belum benar."];
    const wa = f.wa.replace(/\D/g, "").length;
    if (f.wa.trim() && (wa < 9 || wa > 15)) return ["wa", "Nomor WhatsApp belum benar."];
    return null;
  }

  function formulir(rumahId) {
    if (!isian) {
      const pf = Profil.muat(), nama = pf && !/^Pengunjung \d+$/.test(pf.nama) ? pf.nama : "";
      isian = {judul: "", nama: "", deskripsi: "", pemilik: nama, email: "", wa: "", rumah: "", website: "", namaDiubah: false};
    }
    const f = isian, kosong = rumahKosong();
    if (rumahId) f.rumah = rumahId;
    if (!kosong.some(p => p.id === f.rumah)) f.rumah = kosong[0] ? kosong[0].id : "";
    if (!kosong.length && keadaan === "siap") {
      Panel.buka("Rumah proyek penuh", [paragraf("Semua rumah proyek sedang ditempati."), paragraf("Sampaikan ke admin CodeIn lewat grup WhatsApp, rumah baru akan dibangun kalau peminatnya banyak.")], [{teks: "Tutup"}]);
      return;
    }
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
    const pilih = el("select"); pilih.name = "rumah";
    for (const p of kosong) { const o = el("option", null, p.namaAsli + " · " + ({"proyek-1": "dekat pojok pasar", "proyek-2": "selatan alun-alun", "proyek-3": "kampung barat", "proyek-4": "kampung timur"}[p.id] || p.id)); o.value = p.id; pilih.append(o); }
    pilih.value = f.rumah; pilih.onchange = () => { f.rumah = pilih.value; };
    const labelPilih = el("label", null, "Rumah pilihan"); labelPilih.append(pilih);
    const jebakan = el("input", "jebakan"); jebakan.name = "website"; jebakan.tabIndex = -1; jebakan.autocomplete = "off"; jebakan.setAttribute("aria-hidden", "true");
    jebakan.oninput = () => { f.website = jebakan.value; };
    const kirim = el("button", "tbl utama", "Kirim pengajuan"); kirim.type = "submit";
    form.append(kolomJudul, kolomNama, alamat,
      kolom("Deskripsi singkat", "deskripsi", 120, "text", "Maksimal 120 huruf"),
      kolom("Nama kamu atau tim", "pemilik", 40, "text"),
      kolom("Email", "email", 80, "email", "nama@email.com"),
      kolom("Nomor WhatsApp", "wa", 20, "tel", "08…"),
      el("p", "redup", "Isi email atau WhatsApp, salah satu cukup. Kunci upload dikirim ke situ. Hanya admin CodeIn yang bisa melihatnya."));
    if (kosong.length) form.append(labelPilih);
    form.append(jebakan, pesan, kirim);
    form.onsubmit = async e => {
      e.preventDefault();
      const salah = periksa(f);
      if (salah) { pesan.textContent = salah[1]; medan[salah[0]].focus(); return; }
      kirim.disabled = true; pesan.textContent = "Mengirim…";
      try {
        const {namaDiubah, ...kirimkan} = f;
        const r = await fetch(API + "/api/rumah/ajukan", {method: "POST", headers: {"Content-Type": "application/json", "X-NA": "1"}, body: JSON.stringify(kirimkan)});
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || `Server menolak pengajuan (kode ${r.status}).`);
        const alamatnya = `${f.nama}.${DOMAIN}`;
        isian = null;
        Panel.buka("Pengajuan terkirim", [paragraf(`Terima kasih. Admin CodeIn akan meninjau pengajuanmu dan mengirim kunci upload lewat email atau WhatsApp yang kamu isi.`),
          paragraf(`Setelah unggahanmu diterbitkan, situsnya tayang di ${alamatnya} dan namanya muncul di atas pintu rumah ini.`)], [{teks: "Tutup"}]);
      } catch (err) {
        kirim.disabled = false;
        pesan.textContent = err instanceof TypeError ? "Belum terkirim: CodeIn News sedang tidak bisa dihubungi. Isianmu masih ada, coba lagi sebentar." : "Belum terkirim: " + err.message;
      }
    };
    Panel.buka("Ajukan rumah proyek", [paragraf("Gratis untuk anggota CodeIn. Situsmu nanti di-hosting CodeIn dan punya rumah di kota ini."), form], [{teks: "Batal"}], medan.judul);
  }

  Kota.saatSiap(() => terapkan());
  segarkan();
  setInterval(segarkan, SEGAR);
  addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - terakhir > SEGAR / 2) segarkan(); });

  return {buka, formulir, daftar: () => daftar};
})();

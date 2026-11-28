/* CodeIn City · Galeri Komunitas: foto kegiatan CodeIn yang diunggah admin di halaman admin CodeIn News.
     GET /api/galeri-komunitas                  -> [{id, judul, tanggal, lebar, tinggi}], terbaru dulu
     GET /api/galeri-komunitas/<id>/kecil|besar -> JPEG (sudah tanpa metadata)
   Empat foto terbaru dipajang di dinding (papan "foto-1" .. "foto-4" di peta komunitas); meja album membuka semua foto.
   Gambar diambil lewat fetch lalu ditampilkan dari blob, sesuai aturan keamanan kota (CSP). */

const Komunitas = (() => {
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = ((lokal && new URLSearchParams(location.search).get("api")) || KOTA.news).replace(/\/+$/, "");
  let foto = [], keadaan = "memuat", terakhir = 0;
  const bingkai = new Map();            // nomor urut dinding -> elemen papan
  const gambar = new Map();             // "id/ukuran" -> Promise<objectURL>

  const rapikan = d => Array.isArray(d) ? d.filter(f => f && Number.isInteger(f.id) && /^\d{4}-\d{2}-\d{2}$/.test(f.tanggal || ""))
    .map(f => ({id: f.id, judul: String(f.judul || "").slice(0, 90), tanggal: f.tanggal, lebar: +f.lebar || 4, tinggi: +f.tinggi || 3})) : [];
  async function muat() {
    terakhir = Date.now();
    try {
      const r = await fetch(API + "/api/galeri-komunitas", {headers: {Accept: "application/json"}});
      if (!r.ok) throw new Error(r.status);
      foto = rapikan(await r.json()); keadaan = "siap";
    } catch (e) { if (keadaan !== "siap") keadaan = "gagal"; }
    bingkai.forEach((e, n) => gambarBingkai(e, n));
  }
  function url(f, ukuran) {
    const k = f.id + "/" + ukuran;
    if (!gambar.has(k)) gambar.set(k, fetch(`${API}/api/galeri-komunitas/${f.id}/${ukuran}`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(b => URL.createObjectURL(b))
      .catch(e => { gambar.delete(k); throw e; }));
    return gambar.get(k);
  }
  function pasangGambar(img, f, ukuran) {
    img.alt = f.judul || "Foto kegiatan CodeIn";
    url(f, ukuran).then(u => { img.src = u; }).catch(() => { img.replaceWith(el("span", "foto-gagal", "Foto belum bisa dimuat.")); });
  }
  const tanggalTeks = t => new Date(t + "T00:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"});

  /* ---------- papan foto di dinding ---------- */
  function gambarBingkai(e, n) {
    const f = foto[n - 1];
    if (!f) {
      e.classList.add("kosong");
      e.replaceChildren(el("span", "pw-catatan", keadaan === "memuat" ? "Memuat foto…" : keadaan === "gagal" ? "Galeri belum bisa dihubungi." : "Bingkai ini menunggu foto kegiatan berikutnya."));
      return;
    }
    e.classList.remove("kosong");
    const img = el("img"); pasangGambar(img, f, "kecil");
    e.replaceChildren(img, el("span", "foto-cap", f.judul || tanggalTeks(f.tanggal)));
  }
  function buat(b) {
    const e = el("div", "pw foto");
    e.style.setProperty("--pw", b.w); e.style.setProperty("--ph", b.h);
    bingkai.set(b.urutan, e);
    gambarBingkai(e, b.urutan);
    if (Date.now() - terakhir > 60000) muat();
    return e;
  }
  function bersih() { bingkai.clear(); }

  /* ---------- dialog: satu foto besar, dan album semua foto ---------- */
  function lihat(i) {
    const f = foto[i];
    if (!f) { album(); return; }
    const img = el("img", "foto-besar"); img.width = f.lebar; img.height = f.tinggi;
    pasangGambar(img, f, "besar");
    const isi = [img, el("p", "redup", `${tanggalTeks(f.tanggal)} · foto ${i + 1} dari ${foto.length}`)];
    const tombol = [];
    if (i > 0) tombol.push({teks: "Sebelumnya", aksi: () => lihat(i - 1)});
    if (i < foto.length - 1) tombol.push({teks: "Berikutnya", utama: true, aksi: () => lihat(i + 1)});
    tombol.push({teks: "Album", aksi: album}, {teks: "Tutup"});
    Panel.buka(f.judul || "Foto kegiatan CodeIn", isi, tombol);
  }
  function album() {
    if (!foto.length) {
      Panel.buka("Album Galeri Komunitas", [el("p", null, keadaan === "gagal" ? "Album belum bisa dimuat. Coba lagi sebentar lagi."
        : "Belum ada foto. Admin CodeIn akan mengunggah foto kegiatan setelah acara berikutnya.")], [{teks: "Tutup"}]);
      if (keadaan !== "memuat") muat();
      return;
    }
    const grid = el("div", "album");
    foto.forEach((f, i) => {
      const b = el("button", "album-foto"); b.type = "button"; b.title = f.judul || tanggalTeks(f.tanggal);
      const img = el("img"); img.width = 160; img.height = Math.round(160 * f.tinggi / f.lebar);
      pasangGambar(img, f, "kecil");
      b.append(img, el("span", null, f.judul || tanggalTeks(f.tanggal)));
      b.onclick = () => lihat(i);
      grid.append(b);
    });
    Panel.buka("Album Galeri Komunitas", [el("p", "redup", `${foto.length} foto kegiatan CodeIn. Pilih foto untuk melihatnya lebih besar.`), grid], [{teks: "Tutup"}]);
  }

  Kota.saatSiap(({ruang}) => { if (ruang === "komunitas" && Date.now() - terakhir > 60000) muat(); });
  const awal = muat();
  // daftar foto setelah muatan pertama selesai (dipakai gerbang untuk foto kegiatan terbaru)
  const siap = () => awal.then(() => foto);
  return {buat, bersih, lihat, album, siap, pasangGambar, jumlah: () => foto.length};
})();

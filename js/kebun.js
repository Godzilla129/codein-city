/* CodeIn City · kebun halaman di Perumahan CodeIn.
   Setiap rumah punya 3 petak kebun di halaman depan (baris di bawah rumah, kiri dan kanan jalan setapak; petak yang
   ditempati kotak surat dilewati). Data dari CodeIn News (dashboard/services/rumahku.py):
     GET  /api/perumahan       -> tiap kavling berpenghuni membawa kebun: [{petak, tanaman, ditanam, siap}] dan jam server (kini)
     GET  /api/kebun/bibit     -> {bibit: [{tanaman, nama, bibit, menit, harga}], petak}
     POST /api/kebun/tanam     -> {petak, tanaman}: beli bibit dan tanam (pemilik rumah)
     POST /api/kebun/panen     -> {petak}: hasil masuk tas, dijual ke Bu Sayur di Pasar CodeIn
     POST /api/kebun/cabut     -> {petak}: buang tanaman
   Tanaman tumbuh menurut jam asli dalam empat tahap: benih, tunas, tumbuh, siap panen. */

const Kebun = (() => {
  const T = KOTA.ubin;
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = ((lokal && new URLSearchParams(location.search).get("api")) || KOTA.news).replace(/\/+$/, "");
  const PETAK = 3;
  // warga.js memakai rintangan; petak kebun boleh diinjak, jadi di sini cukup lapisan hiasan (kotak surat)
  const BUAH = {kangkung: "#5FAE4E", cabai: "#D9342B", tomat: "#E04A3A", jagung: "#F2C94C", semangka: "#3E8E3A"};
  const TAHAP = [
    // 0 benih: gundukan tanah berbintik
    ["................", "................", "................", "................", "................", "................",
     "................", "................", "................", "....o......o....", "......o..o......", "...o.....o...o..",
     "................", "................", "................", "................"],
    // 1 tunas
    ["................", "................", "................", "................", "................", "................",
     "................", "......g..g......", ".....gGggGg.....", "......gGG.......", ".......G........", ".......G........",
     "................", "................", "................", "................"],
    // 2 tumbuh
    ["................", "................", "................", "................", ".....g...g......", "....gGg.gGg.....",
     "...gGGgggGGg....", "....gGgGgGg.g...", "..g..gGGGg.gGg..", ".gGg..gGg..gG...", "..gGg.GG.gGg....", "....gGGGGg......",
     "......GG........", "................", "................", "................"],
    // 3 siap panen: daun lebat dengan buah
    ["................", "................", ".....g....g.....", "....gGg..gGg....", "...gGbGg.gGGg...", "..gGGbbGgGbGGg..",
     "..gGGGGgGbbGg...", ".gGbGGgGGGGGgg..", ".gGbbGGGbGGbGg..", "..gGGgGbbGGbbg..", "...gGGGGGGGGg...", "....gGGGGGGg....",
     "......GGGG......", "................", "................", "................"],
  ];
  let adegan = null, ruang = null, gambar = [], bibit = null, jeda = 0;

  /* ---------- letak petak ---------- */
  // petak kebun kavling p: [{petak, tx, ty}] dari kiri ke kanan
  function petakDari(p) {
    const peta = adegan && adegan.peta;
    if (!peta) return [];
    const x0 = Math.round(p.kiri / T), ty = Math.round(p.bawah / T), hasil = [];
    for (const dx of [0, 1, 4, 5]) {
      const h = peta.getTileAt(x0 + dx, ty, false, "hiasan");
      if (h && h.index > 0) continue;              // kotak surat
      hasil.push({petak: hasil.length, tx: x0 + dx, ty});
      if (hasil.length === PETAK) break;
    }
    return hasil;
  }

  /* ---------- gambar ---------- */
  function tekstur(tanaman, tahap) {
    const kunci = `kebun-${tahap}-${tanaman}`;
    if (adegan.textures.exists(kunci)) return kunci;
    const c = adegan.textures.createCanvas(kunci, 16, 16), g = c.getContext();
    const warna = {o: "#4A3322", g: "#6CC24A", G: "#2F7A32", b: BUAH[tanaman] || "#E04A3A"};
    if (tanaman === "kangkung") warna.b = "#8BD06A";
    TAHAP[tahap].forEach((baris, y) => [...baris].forEach((h, x) => { if (warna[h]) { g.fillStyle = warna[h]; g.fillRect(x, y, 1, 1); } }));
    c.refresh();
    return kunci;
  }
  const jam = () => Perumahan.jamServer();
  function tahapDari(t) {
    const umur = (jam() - t.ditanam) / Math.max(1, t.siap - t.ditanam);
    return umur >= 1 ? 3 : umur >= .5 ? 2 : umur >= .12 ? 1 : 0;
  }
  function hapus() { gambar.forEach(g => g.destroy()); gambar = []; }
  function gambarSemua() {
    if (!adegan || ruang !== "perumahan") return;
    hapus();
    const data = Perumahan.data() || {};
    const pintu = Kota.pintu();
    for (let i = pintu.length - 1; i >= 0; i--) if (pintu[i].tujuan === "petak") pintu.splice(i, 1);
    for (const p of pintu.filter(p => p.tujuan === "kavling")) {
      const k = data[p.kavling];
      if (!k || !k.pemilik) continue;
      for (const pt of petakDari(p)) {
        // bedengan tanah gembur
        const g = adegan.add.graphics().setDepth(3.8);
        g.fillStyle(0x6B4A2F).fillRect(pt.tx * T + 1, pt.ty * T + 3, 14, 11);
        g.fillStyle(0x4E3421);
        for (let y = 5; y < 14; y += 3) g.fillRect(pt.tx * T + 2, pt.ty * T + y, 12, 1);
        gambar.push(g);
        const t = (k.kebun || []).find(x => x.petak === pt.petak);
        if (t) gambar.push(adegan.add.image(pt.tx * T, pt.ty * T + 14, tekstur(t.tanaman, tahapDari(t))).setOrigin(0, 1).setDepth(10 + pt.ty * T + 14));
        pintu.push({id: `petak-${k.kode}-${pt.petak}`, nama: "Kebun", aksi: "panel", tujuan: "petak", kavling: k.kode, petak: pt.petak,
                    x: pt.tx * T, y: pt.ty * T, w: T, h: T, tanpaLabel: true});
      }
    }
    Kota.segarkanAksi();
  }

  /* ---------- aksi ---------- */
  const kav = p => (Perumahan.data() || {})[p.kavling];
  const tanamanDi = p => { const k = kav(p); return k && (k.kebun || []).find(x => x.petak === p.petak) || null; };
  const milikku = p => { const s = Perumahan.milikku(); return !!(s && s.kode === p.kavling); };
  const namaTanaman = kode => ({kangkung: "Kangkung", cabai: "Cabai rawit", tomat: "Tomat", jagung: "Jagung", semangka: "Semangka"}[kode] || kode);
  function teksAksi(p) {
    const t = tanamanDi(p);
    if (!milikku(p)) return t ? `Lihat ${namaTanaman(t.tanaman).toLowerCase()}` : "Lihat kebun";
    if (!t) return "🌱 Tanam";
    return tahapDari(t) === 3 ? `🧺 Panen ${namaTanaman(t.tanaman).toLowerCase()}` : `Lihat ${namaTanaman(t.tanaman).toLowerCase()}`;
  }
  const sisaWaktu = t => {
    const menit = Math.ceil((t.siap - jam()) / 60);
    return menit >= 60 ? `sekitar ${Math.floor(menit / 60)} jam ${menit % 60 ? (menit % 60) + " menit " : ""}lagi` : `sekitar ${Math.max(1, menit)} menit lagi`;
  };
  async function buka(p) {
    const k = kav(p), t = tanamanDi(p);
    if (!k) return;
    if (!milikku(p)) {
      Panel.buka(`Kebun ${k.pemilik.nama}`, [el("p", null, t ? `${namaTanaman(t.tanaman)} tumbuh di sini${tahapDari(t) === 3 ? " dan sudah siap panen" : ""}.` : "Petak ini masih kosong."),
        el("p", "redup", "Hanya pemilik rumah yang bisa menanam dan memanen di kebunnya.")], [{teks: "Tutup"}]);
      return;
    }
    if (!t) { pilihBibit(p); return; }
    if (tahapDari(t) === 3) { panen(p, t); return; }
    Panel.buka(namaTanaman(t.tanaman), [el("p", null, `Masih tumbuh. Siap panen ${sisaWaktu(t)}.`),
      el("p", "redup", "Tanaman tumbuh walaupun kamu sedang tidak di sini.")],
      [{teks: "Tutup", utama: true}, {teks: "Cabut tanaman", aksi: () => cabut(p, t)}]);
  }
  async function pilihBibit(p, pesan) {
    if (!bibit) {
      try { const r = await fetch(API + "/api/kebun/bibit", {headers: {Accept: "application/json"}}); if (r.ok) bibit = (await r.json()).bibit; } catch (e) { /* biarkan */ }
      if (!Array.isArray(bibit)) { bibit = null; Panel.buka("Kebun", [el("p", null, "Bibit belum bisa diambil dari CodeIn News. Coba lagi sebentar.")], [{teks: "Tutup"}]); return; }
    }
    const d = await Ekonomi.muat();
    const ket = el("p", "pesan"); ket.setAttribute("role", "status"); if (pesan) ket.textContent = pesan;
    const ul = el("ul", "toko");
    for (const b of bibit) {
      const li = el("li", "barang-toko"), teks = el("span");
      const lama = b.menit >= 60 ? `${b.menit / 60} jam` : `${b.menit} menit`;
      teks.append(el("b", null, b.nama), el("span", "redup", ` panen ${lama}, laku ${b.harga} koin`));
      const t = el("button", "tbl", `${b.bibit} koin`); t.type = "button"; t.setAttribute("aria-label", `Tanam ${b.nama}, bibit ${b.bibit} koin`);
      if (d && d.koin < b.bibit) t.disabled = true;
      t.onclick = () => tanam(p, b);
      li.append(Barang.ikon(b.tanaman), teks, t); ul.append(li);
    }
    Panel.buka("Tanam di kebun", [el("p", null, `Pilih bibit untuk petak ini.${d ? ` Koinmu ${d.koin.toLocaleString("id-ID")}.` : ""}`), ket, ul,
      el("p", "redup", "Hasil panen dijual ke Bu Sayur di Pasar CodeIn. Makin lama tumbuh, makin mahal hasilnya.")], [{teks: "Batal"}]);
  }
  async function tanam(p, b) {
    try {
      const h = await Akun.kirim("/api/kebun/tanam", {petak: p.petak, tanaman: b.tanaman});
      const k = kav(p); k.kebun = (k.kebun || []).filter(x => x.petak !== p.petak).concat([{petak: p.petak, tanaman: b.tanaman, ditanam: h.ditanam, siap: h.siap}]);
      Panel.tutup(); gambarSemua(); Ekonomi.muat();
      Kota.ucap(`Menanam ${b.nama.toLowerCase()}!`);
    } catch (e) { pilihBibit(p, "Belum tertanam: " + (e instanceof TypeError ? "CodeIn News sedang tidak bisa dihubungi." : e.message)); }
  }
  async function panen(p, t) {
    try {
      const h = await Akun.kirim("/api/kebun/panen", {petak: p.petak});
      const k = kav(p); k.kebun = (k.kebun || []).filter(x => x.petak !== p.petak);
      gambarSemua(); Ekonomi.muat();
      Kota.ucap(`Panen ${h.panen.nama.toLowerCase()}!`);
      Kota.kabar(`${h.panen.nama} masuk tas. Jual ke Bu Sayur di Pasar CodeIn: ${h.panen.harga} koin.`);
    } catch (e) { Kota.kabar("Belum bisa panen: " + e.message); Perumahan.muat().then(gambarSemua).catch(() => {}); }
  }
  function cabut(p, t) {
    Panel.buka("Cabut tanaman?", [el("p", null, `${namaTanaman(t.tanaman)} di petak ini dibuang. Bibitnya tidak kembali.`)], [
      {teks: "Ya, cabut", aksi: async () => {
        try {
          await Akun.kirim("/api/kebun/cabut", {petak: p.petak});
          const k = kav(p); k.kebun = (k.kebun || []).filter(x => x.petak !== p.petak); gambarSemua();
        } catch (e) { Kota.kabar("Belum berhasil: " + e.message); }
      }}, {teks: "Tidak jadi", utama: true}]);
  }

  Kota.saatSiap(({adegan: sc, ruang: r}) => { adegan = sc; ruang = r; gambar = []; jeda = 30000; });
  Perumahan.saatTata(gambarSemua);
  // tahap tumbuh diperbarui tiap 30 detik selama di perumahan
  Kota.tiapBingkai(dt => { if (ruang === "perumahan" && (jeda -= dt) <= 0) { jeda = 30000; gambarSemua(); } });

  return {teksAksi, buka, gambarSemua};
})();

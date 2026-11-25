/* CodeIn City · isi rumah warga: perabot di dalam rumah dan mode "Tata rumah" untuk pemiliknya.
   Data dari CodeIn News (dashboard/services/rumahku.py):
     GET /api/perumahan/<kode>/isi -> {isi: [{barang, x, y}]}   (rumah terkunci hanya untuk pemiliknya)
     PUT /api/perumahan/isi        -> simpan isi rumah sendiri; server memeriksa aturan letak dan jumlah perabot di tas
   Perabot yang dimiliki ada di tas (js/ekonomi.js); yang baru dibeli di Toko Mbak Tika (js/toko.js).
   Letak (x, y) = petak kiri bawah perabot di peta rumah.tmj. Aturan letak di sini sama dengan services/rumahku.py:
     lantai x 1-12, y 4-8; lukisan dan jendela hanya di baris dinding y 2 dan tidak menutupi gantungan kunci (x 9-10);
     kaki perabot berdiri tidak boleh di depan pintu keluar (6-7, 8) atau di depan gantungan kunci (9-10, 4). Karpet bisa dilewati.
   Mode tata: pilih perabot di bawah layar, ketuk lantai untuk menaruhnya. Ketuk perabot yang sudah terpasang untuk
   memindahkan atau menyimpannya ke tas. Keyboard: panah = geser kursor, E/Enter = taruh atau pilih, Delete = simpan ke tas,
   Escape = batal. Perubahan baru tersimpan setelah tombol Simpan. */

const Tata = (() => {
  const T = KOTA.ubin;
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = ((lokal && new URLSearchParams(location.search).get("api")) || KOTA.news).replace(/\/+$/, "");
  const LANTAI_X = [1, 12], LANTAI_Y = [4, 8], DINDING_Y = 2, KUNCI_X = [9, 10];
  const CADANGAN = new Set(["6,8", "7,8", "9,4", "10,4"]);
  // [nama, letak, lebar, tinggi] sama dengan PERABOT di services/ekonomi.py. tinggi = baris lantai yang ditempati
  // (karpet, dan kasur yang terbaring sepanjang dua petak); perabot lain berdiri di satu baris.
  const PERABOT = {
    "kursi": ["Kursi kayu", "lantai", 1, 1], "tanaman": ["Tanaman pot", "lantai", 1, 1], "tanaman-besar": ["Tanaman besar", "lantai", 1, 1],
    "dispenser": ["Dispenser air", "lantai", 1, 1], "meja-bundar": ["Meja bundar", "lantai", 1, 1], "lampu-lantai": ["Lampu berdiri", "lantai", 1, 1],
    "jam-besar": ["Jam lemari", "lantai", 1, 1], "kulkas": ["Kulkas", "lantai", 1, 1], "kasur": ["Kasur", "lantai", 2, 2],
    "lemari": ["Lemari pakaian", "lantai", 2, 1], "rak-buku": ["Rak buku", "lantai", 2, 1], "sofa-kecil": ["Sofa kecil", "lantai", 2, 1],
    "sofa": ["Sofa panjang", "lantai", 2, 1], "meja-kerja": ["Meja kerja", "lantai", 2, 1], "meja-komputer": ["Meja komputer", "lantai", 2, 1],
    "papan-tulis": ["Papan tulis", "lantai", 2, 1], "bangku-galeri": ["Bangku panjang", "lantai", 2, 1], "konter-kopi": ["Konter kopi", "lantai", 2, 1],
    "meja-panjang": ["Meja panjang", "lantai", 3, 1], "rak-buku-lebar": ["Rak buku besar", "lantai", 3, 1],
    "karpet-biru": ["Karpet biru", "karpet", 3, 2], "karpet": ["Karpet merah", "karpet", 4, 2], "karpet-panjang": ["Karpet panjang", "karpet", 2, 4],
    "lukisan": ["Lukisan", "dinding", 2, 1], "lukisan-hijau": ["Lukisan hijau", "dinding", 2, 1], "jendela-dinding": ["Jendela", "dinding", 2, 1],
  };
  // isi rumah yang belum pernah ditata (sama dengan ISI_AWAL di services/rumahku.py)
  const ISI_AWAL = [
    {barang: "jendela-dinding", x: 2, y: 2}, {barang: "lukisan", x: 5, y: 2}, {barang: "lemari", x: 3, y: 4}, {barang: "rak-buku", x: 11, y: 4},
    {barang: "kasur", x: 1, y: 6}, {barang: "tanaman", x: 1, y: 8}, {barang: "karpet-biru", x: 4, y: 8}, {barang: "sofa-kecil", x: 4, y: 6},
    {barang: "meja-bundar", x: 5, y: 7}, {barang: "meja-komputer", x: 10, y: 7}, {barang: "lampu-lantai", x: 12, y: 8},
  ];
  const MAKS = 40;

  let adegan = null, isi = [], gambar = [], kode = null;
  let aktifkah = false, draf = [], pegang = null, pilih = -1, kursor = [6, 6], punya = {}, bayang = null, kotakKursor = null, titikKamera = null;
  let batasLama = null, turun = 0;        // batas kamera sebelum menata; geser kamera (piksel dunia) supaya ruangan di atas panel

  /* ---------- aturan letak ---------- */
  const info = b => PERABOT[b] || null;
  function salahLetak(barang, x, y) {
    const p = info(barang);
    if (!p) return "Barang ini bukan perabot.";
    const [nama, letak, lebar, tinggi] = p;
    if (x < LANTAI_X[0] || x + lebar - 1 > LANTAI_X[1]) return `${nama} keluar dari dinding.`;
    if (letak === "dinding") {
      if (y !== DINDING_Y) return `${nama} digantung di dinding.`;
      if (x <= KUNCI_X[1] && x + lebar - 1 >= KUNCI_X[0]) return `${nama} menutupi gantungan kunci.`;
      return null;
    }
    if (y - tinggi + 1 < LANTAI_Y[0] || y > LANTAI_Y[1]) return `${nama} harus di atas lantai.`;
    if (letak === "lantai") for (let i = 0; i < lebar; i++) for (let j = 0; j < tinggi; j++)
      if (CADANGAN.has(`${x + i},${y - j}`)) return `${nama} menghalangi pintu atau gantungan kunci.`;
    return null;
  }
  // tile yang ditunjuk -> letak (x, y) perabot: perabot dinding selalu di baris dinding
  const letakDari = (barang, tx, ty) => info(barang) && info(barang)[1] === "dinding" ? [tx, DINDING_Y] : [tx, ty];

  /* ---------- gambar perabot ---------- */
  function hapusGambar() { gambar.forEach(g => { g.img.destroy(); if (g.padat) g.padat.destroy(); }); gambar = []; }
  function gambarSatu(it, i) {
    const p = info(it.barang);
    if (!p || !adegan.textures.get("benda").has(it.barang)) return null;
    const [, letak, lebar, tinggiPetak] = p, f = adegan.textures.getFrame("benda", it.barang);
    const x = it.x * T + Math.round((lebar * T - f.cutWidth) / 2), bawah = (it.y + 1) * T;
    const img = adegan.add.image(x, bawah, "benda", it.barang).setOrigin(0, 1);
    img.setDepth(letak === "dinding" ? 3.6 : letak === "karpet" ? 3.5 : 10 + bawah);
    let padat = null;
    // kotak padat = bagian perabot yang menapak lantai: kasur seluruh panjangnya, perabot berdiri bagian kakinya (12 piksel);
    // bagian atas perabot tinggi (lemari, rak) bisa dilewati di belakangnya
    if (letak === "lantai") {
      const tinggi = Math.min(f.cutHeight, tinggiPetak > 1 ? tinggiPetak * T - 4 : 12);
      padat = Kota.padatkan(x + 1, bawah - tinggi, f.cutWidth - 2, tinggi);
    }
    return {img, padat, i, x, bawah, w: f.cutWidth, h: f.cutHeight};
  }
  // gambar ulang semua perabot: isi rumah, atau draf saat menata (perabot yang sedang dipegang tidak digambar di tempat lamanya)
  function gambarSemua() {
    if (!adegan) return;
    hapusGambar();
    const daftar = aktifkah ? draf : isi;
    daftar.forEach((it, i) => {
      if (aktifkah && pegang && pegang.dari === i) return;
      const g = gambarSatu(it, i); if (g) gambar.push(g);
    });
    if (aktifkah) gambar.forEach(g => g.img.setAlpha(g.i === pilih ? .8 : 1));
    gambarKursor();
  }
  async function muat(k) {
    let d = null;
    try {
      if (Akun.sudahWarga()) d = await Akun.ambil(`/api/perumahan/${k}/isi`);
      else { const r = await fetch(`${API}/api/perumahan/${k}/isi`, {headers: {Accept: "application/json"}}); if (r.ok) d = await r.json(); }
    } catch (e) { /* server lama atau tidak terjangkau: isi starter */ }
    return d && Array.isArray(d.isi) ? d.isi : ISI_AWAL.map(x => ({...x}));
  }

  /* ---------- ikon perabot (dari atlas) untuk daftar di bawah layar dan di toko ---------- */
  function ikon(barang, ukuran = 40) {
    const c = document.createElement("canvas"); c.width = c.height = ukuran; c.className = "ikon-perabot";
    const sc = adegan || Kota.adegan();
    if (!sc || !sc.textures.get("benda").has(barang)) return c;
    const f = sc.textures.getFrame("benda", barang), g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    let k = Math.min(ukuran / f.cutWidth, ukuran / f.cutHeight);
    if (k >= 1) k = Math.floor(k);                 // perbesar bulat supaya piksel tetap tajam
    g.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, (ukuran - f.cutWidth * k) / 2, (ukuran - f.cutHeight * k) / 2, f.cutWidth * k, f.cutHeight * k);
    return c;
  }

  /* ---------- mode tata ---------- */
  const kotak = $("tata"), teks = $("tata-teks"), daftarEl = $("tata-barang"), aksiEl = $("tata-aksi"), tombolTata = $("btn-tata");
  const bisaTata = () => Kota.ruang() === "rumah" && Perumahan.pemilikKini();
  function segarkanTombol() { tombolTata.hidden = !(bisaTata() && !aktifkah && Akun.sudahWarga()); }

  async function mulai() {
    if (!bisaTata() || aktifkah) return;
    Kota.kabar("Membuka tas perabot…");
    const d = await Ekonomi.muat();
    if (!d) { Kota.kabar("Tas perabot belum bisa dibuka. Coba lagi sebentar."); return; }
    punya = {}; d.tas.filter(b => b.jenis === "perabot").forEach(b => { punya[b.barang] = b.jumlah; });
    aktifkah = true; draf = isi.map(x => ({...x})); pegang = null; pilih = -1; kursor = [6, 6];
    kotak.hidden = false; segarkanTombol();
    const sc = adegan, cam = sc.cameras.main;
    kotakKursor = sc.add.graphics().setDepth(6000);
    tulis();
    // panel tata menutupi bagian bawah layar: kamera digeser turun setengah tinggi panel supaya ruangan tampil di atasnya
    const b = cam.getBounds(); batasLama = [b.x, b.y, b.width, b.height];
    cam.removeBounds();
    turun = kotak.getBoundingClientRect().height / 2 / cam.zoom;
    titikKamera = sc.add.zone(7 * T, 6 * T + turun, 1, 1);       // tengah ruangan
    cam.startFollow(titikKamera, true, .25, .25);
  }
  function selesai(simpanKah) {
    if (!aktifkah) return;
    aktifkah = false; pegang = null; pilih = -1;
    gambarSemua();
    if (bayang) { bayang.destroy(); bayang = null; }
    if (kotakKursor) { kotakKursor.destroy(); kotakKursor = null; }
    if (titikKamera) { titikKamera.destroy(); titikKamera = null; }
    const cam = adegan.cameras.main;
    if (batasLama) { cam.setBounds(...batasLama); batasLama = null; }
    const pm = adegan.children.list.find(o => o.body && o.texture && o.texture.key === "orang" && o.body.moves);
    if (pm) cam.startFollow(pm, true);
    kotak.hidden = true; segarkanTombol(); Kota.segarkanAksi();
  }
  async function simpan() {
    tulis("Menyimpan…");
    try {
      const h = await Akun.kirim("/api/perumahan/isi", {isi: draf}, "PUT");
      isi = h.isi; selesai(true);
      Kota.kabar("Rumahmu sudah ditata.");
    } catch (e) {
      tulis("Belum tersimpan: " + (e instanceof TypeError ? "CodeIn News sedang tidak bisa dihubungi." : e.message));
    }
  }

  const sisa = b => (punya[b] || 0) - draf.filter(x => x.barang === b).length;     // yang masih di tas (belum terpasang)
  function tulis(pesan) {
    // pesan + daftar perabot + tombol sesuai keadaan
    if (pesan) teks.textContent = pesan;
    else if (pegang) teks.textContent = `Ketuk lantai untuk menaruh ${info(pegang.barang)[0].toLowerCase()}.` + (info(pegang.barang)[1] === "dinding" ? " Lukisan dan jendela digantung di dinding." : "");
    else if (pilih >= 0) teks.textContent = `${info(draf[pilih].barang)[0]} dipilih.`;
    else teks.textContent = "Pilih perabot dari tasmu, atau ketuk perabot di rumah untuk memindahkannya.";
    daftarEl.replaceChildren();
    const kode = Object.keys(punya).filter(b => info(b)).sort((a, b) => info(a)[0].localeCompare(info(b)[0], "id"));
    for (const b of kode) {
      const n = sisa(b), t = el("button", "perabot-tas"); t.type = "button";
      t.setAttribute("aria-pressed", String(!!(pegang && pegang.barang === b && pegang.dari < 0)));
      t.disabled = n <= 0; t.title = `${info(b)[0]}: ${n} di tas`;
      t.append(ikon(b, 36), el("span", null, info(b)[0]), el("b", null, `× ${n}`));
      t.onclick = () => { pegang = {barang: b, dari: -1}; pilih = -1; gambarSemua(); tulis(); perbaruiBayang(); };
      daftarEl.append(t);
    }
    if (!kode.length) daftarEl.append(el("p", "redup", "Tasmu belum berisi perabot."));
    aksiEl.replaceChildren();
    const tombol = (label, fn, utama) => { const b = el("button", "tbl" + (utama ? " utama" : ""), label); b.type = "button"; b.onclick = fn; aksiEl.append(b); };
    if (pegang) { tombol("Taruh di kursor", () => taruh(), true); tombol("Lepas", () => { batalPegang(); }); }
    else if (pilih >= 0) { tombol("Pindahkan", () => angkat(pilih), true); tombol("Simpan ke tas", () => buang(pilih)); tombol("Batal", () => { pilih = -1; gambarSemua(); tulis(); }); }
    else { tombol("Simpan", simpan, true); tombol("Batal", () => selesai(false)); }
    const beli = el("p", "redup", "Perabot baru dijual di Toko Mbak Tika, samping Pasar CodeIn. Geser layar untuk melihat sisi ruangan yang lain.");
    aksiEl.append(beli);
    gambarKursor();
  }
  // lepas pegangan: perabot yang sedang dipindah tetap di tempat lamanya
  function batalPegang() {
    pegang = null; if (bayang) { bayang.destroy(); bayang = null; }
    gambarSemua(); tulis();
  }
  function angkat(i) {
    pegang = {barang: draf[i].barang, dari: i}; pilih = -1;
    kursor = [draf[i].x, draf[i].y];
    gambarSemua(); tulis(); perbaruiBayang();
  }
  function buang(i) {
    const nama = info(draf[i].barang)[0];
    draf.splice(i, 1); pilih = -1; gambarSemua(); tulis(`${nama} disimpan ke tas.`);
  }
  function taruh() {
    if (!pegang) return;
    const [x, y] = letakDari(pegang.barang, ...kursor), salah = salahLetak(pegang.barang, x, y);
    if (salah) { tulis(salah); return; }
    if (pegang.dari < 0 && draf.length >= MAKS) { tulis(`Paling banyak ${MAKS} perabot dalam satu rumah.`); return; }
    if (pegang.dari >= 0) draf[pegang.dari] = {barang: pegang.barang, x, y};
    else draf.push({barang: pegang.barang, x, y});
    const masihAda = pegang.dari < 0 && sisa(pegang.barang) > 0;
    const barang = pegang.barang;
    pegang = masihAda ? {barang, dari: -1} : null;
    if (!pegang && bayang) { bayang.destroy(); bayang = null; }
    gambarSemua(); tulis(`${info(barang)[0]} ditaruh.`); perbaruiBayang();
  }
  // perabot terpasang di titik dunia (wx, wy): yang paling depan
  function perabotDi(wx, wy) {
    const kena = gambar.filter(g => wx >= g.x && wx <= g.x + g.w && wy >= g.bawah - g.h && wy <= g.bawah);
    kena.sort((a, b) => b.img.depth - a.img.depth);
    return kena.length ? kena[0].i : -1;
  }
  function tindak() {
    if (pegang) { taruh(); return; }
    const i = perabotDi(kursor[0] * T + 8, kursor[1] * T + 8);
    if (i >= 0) { pilih = i; gambarSemua(); tulis(); }
  }
  function perbaruiBayang() {
    if (!adegan) return;
    if (!pegang) { if (bayang) { bayang.destroy(); bayang = null; } gambarKursor(); return; }
    const p = info(pegang.barang), [x, y] = letakDari(pegang.barang, ...kursor);
    const f = adegan.textures.getFrame("benda", pegang.barang);
    if (!bayang || bayang.frame.name !== pegang.barang) { if (bayang) bayang.destroy(); bayang = adegan.add.image(0, 0, "benda", pegang.barang).setOrigin(0, 1).setAlpha(.6); }
    bayang.setPosition(x * T + Math.round((p[2] * T - f.cutWidth) / 2), (y + 1) * T).setDepth(5999);
    gambarKursor();
  }
  function gambarKursor() {
    if (!kotakKursor) return;
    kotakKursor.clear();
    // kotak mengikuti gambar perabot sebenarnya: yang sedang dipegang (hijau = boleh, merah = tidak) atau yang dipilih (kuning)
    const bingkai = (barang, x, y) => {
      const f = adegan.textures.getFrame("benda", barang), kiri = x * T + Math.round((info(barang)[2] * T - f.cutWidth) / 2);
      return [kiri - 1, (y + 1) * T - f.cutHeight - 1, f.cutWidth + 2, f.cutHeight + 2];
    };
    if (pegang) {
      const [x, y] = letakDari(pegang.barang, ...kursor), ok = !salahLetak(pegang.barang, x, y);
      kotakKursor.lineStyle(2, ok ? 0x4CAF6A : 0xE5483B, 1).strokeRect(...bingkai(pegang.barang, x, y));
    } else if (pilih >= 0 && draf[pilih]) {
      kotakKursor.lineStyle(2, 0xE9A23B, 1).strokeRect(...bingkai(draf[pilih].barang, draf[pilih].x, draf[pilih].y));
    } else {
      kotakKursor.lineStyle(2, 0xffffff, .8).strokeRect(kursor[0] * T + 1, kursor[1] * T + 1, T - 2, T - 2);
    }
  }
  function geser(dx, dy) {
    kursor = [Phaser.Math.Clamp(kursor[0] + dx, LANTAI_X[0], LANTAI_X[1]), Phaser.Math.Clamp(kursor[1] + dy, DINDING_Y, LANTAI_Y[1])];
    // kamera ikut kursor keyboard (di layar sempit ruangan tidak muat seluruhnya); ketukan tidak menggeser kamera
    if (titikKamera) titikKamera.setPosition(kursor[0] * T + 8, kursor[1] * T + 8 + turun);
    perbaruiBayang();
  }

  /* ---------- masukan ---------- */
  let tekanAwal = null;
  const dunia = e => { const k = $("game").getBoundingClientRect(); return adegan.cameras.main.getWorldPoint(e.clientX - k.left, e.clientY - k.top); };
  $("game").addEventListener("pointerdown", e => { if (aktifkah) tekanAwal = {x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, geser: false}; });
  $("game").addEventListener("pointermove", e => {
    if (!aktifkah) return;
    // seret = geser pandangan (ruangan lebih lebar dari layar HP)
    if (tekanAwal && (tekanAwal.geser || Math.hypot(e.clientX - tekanAwal.x, e.clientY - tekanAwal.y) > 12)) {
      tekanAwal.geser = true;
      const z = adegan.cameras.main.zoom;
      titikKamera.x = Phaser.Math.Clamp(titikKamera.x - (e.clientX - tekanAwal.lx) / z, 0, 14 * T);
      titikKamera.y = Phaser.Math.Clamp(titikKamera.y - (e.clientY - tekanAwal.ly) / z, 0, 11 * T + turun);
      tekanAwal.lx = e.clientX; tekanAwal.ly = e.clientY;
      return;
    }
    if (!pegang || e.pointerType !== "mouse") return;
    const t = dunia(e); kursor = [Phaser.Math.Clamp(Math.floor(t.x / T), LANTAI_X[0], LANTAI_X[1]), Phaser.Math.Clamp(Math.floor(t.y / T), DINDING_Y, LANTAI_Y[1])];
    perbaruiBayang();
  });
  $("game").addEventListener("pointerup", e => {
    if (!aktifkah || !tekanAwal || Panel.terbuka()) return;
    const geserJauh = tekanAwal.geser || Math.hypot(e.clientX - tekanAwal.x, e.clientY - tekanAwal.y) > 12; tekanAwal = null;
    if (geserJauh) return;
    const t = dunia(e);
    if (pegang) {
      kursor = [Phaser.Math.Clamp(Math.floor(t.x / T), LANTAI_X[0], LANTAI_X[1]), Phaser.Math.Clamp(Math.floor(t.y / T), DINDING_Y, LANTAI_Y[1])];
      perbaruiBayang(); taruh(); return;
    }
    const i = perabotDi(t.x, t.y);
    if (i >= 0) { pilih = i; kursor = [draf[i].x, draf[i].y]; gambarSemua(); tulis(); }
    else if (pilih >= 0) { pilih = -1; gambarSemua(); tulis(); }
  });
  addEventListener("keydown", e => {
    if (!aktifkah || Panel.terbuka() || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const arah = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1]}[e.code];
    if (arah) { e.preventDefault(); e.stopImmediatePropagation(); geser(...arah); return; }
    if ((e.code === "KeyE" || e.code === "Enter" || e.code === "Space") && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); e.stopImmediatePropagation(); tindak(); return; }
    if ((e.code === "Delete" || e.code === "Backspace") && pilih >= 0) { e.preventDefault(); buang(pilih); return; }
    if (e.code === "Escape") {
      e.preventDefault(); e.stopImmediatePropagation();
      if (pegang) batalPegang(); else if (pilih >= 0) { pilih = -1; gambarSemua(); tulis(); } else selesai(false);
    }
  }, true);
  tombolTata.onclick = () => { tombolTata.blur(); mulai(); };

  /* ---------- peta dimuat ---------- */
  Kota.tahan(() => aktifkah);
  Kota.saatSiap(({adegan: sc, ruang}) => {
    adegan = sc; gambar = []; aktifkah = false; kotak.hidden = true; bayang = kotakKursor = titikKamera = batasLama = null;
    if (ruang !== "rumah") { kode = null; isi = []; segarkanTombol(); return; }
    kode = Perumahan.kini();
    isi = ISI_AWAL.map(x => ({...x}));
    gambarSemua();
    segarkanTombol();
    const k = kode;
    muat(k).then(d => { if (adegan === sc && kode === k) { isi = d; if (!aktifkah) gambarSemua(); } });
  });
  Akun.saatBerubah(() => segarkanTombol());

  return {aktif: () => aktifkah, mulai, ikon, info, salahLetak, isi: () => isi, segarkanTombol};
})();

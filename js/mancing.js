/* CodeIn City · mancing di kolam Taman Kota dan danau/kolam Perumahan CodeIn.
   Berdiri di tepi air menghadap ke air, tombol aksi berubah jadi "Mancing". Alurnya:
     1. lempar kail  -> POST /api/mancing/lempar {tempat}. Server memilih ikannya (dirahasiakan) dan kapan umpan dimakan.
     2. tunggu       -> pelampung naik-turun. Menarik sebelum umpan dimakan membuat ikan kabur.
     3. umpan dimakan -> pelampung tenggelam, ada tanda seru. Tekan Tarik dalam waktu singkat.
     4. adu tarik    -> jarum bergerak bolak-balik; tekan saat jarum di zona hijau. Ikan yang lebih langka butuh lebih banyak
                        tekanan tepat dan jarumnya lebih cepat. Dua kali meleset, senarnya putus.
     5. hasil        -> POST /api/mancing/tarik {id, berhasil}. Ikan masuk tas (js/ekonomi.js).
   Air = petak lapisan "tanah" yang ubinnya berproperti air (danau dan kolam dari tools/buat_peta.py). Kolam air mancur tidak termasuk.
   Selama mancing, pemain tidak berjalan; tombol E, spasi, atau Enter = Tarik, Escape = selesai. */

const Mancing = (() => {
  const T = KOTA.ubin;
  const ARAH = {kiri: [-1, 0], kanan: [1, 0], atas: [0, -1], bawah: [0, 1]};
  const KESULITAN = {          // [waktu bereaksi (ms), tekanan tepat yang dibutuhkan, lebar zona hijau, lama satu ayunan jarum (ms)]
    1: [1600, 1, .34, 1500],
    2: [1350, 2, .26, 1150],
    3: [1150, 3, .2, 900],
  };
  let keadaan = null;          // null = tidak mancing; selain itu: lempar, tunggu, gigit, adu, kirim, hasil
  let lemparan = null, waktu = 0, gfx = null, riak = null, target = null, jarum = 0, zona = [0, 0];
  let tepat = 0, meleset = 0, sasaran = 1, seru = null;

  const aktif = () => keadaan !== null;
  // petak air di depan pemain (yang bisa dipancing). Mengembalikan [tx, ty] tile atau null.
  function airDepan(x, y, arah) {
    const sc = Kota.adegan(), peta = sc && sc.peta;
    if (!peta || !["kota", "perumahan"].includes(Kota.ruang())) return null;
    const [dx, dy] = ARAH[arah] || [0, 1];
    const air = (tx, ty) => { const t = peta.getTileAt(tx, ty, false, "tanah"); return !!(t && t.properties && t.properties.air); };
    for (const jauh of [12, 20]) {
      const tx = Math.floor((x + dx * jauh) / T), ty = Math.floor((y + 1 + dy * jauh) / T);
      if (!air(tx, ty)) continue;
      // pelampung jatuh sejauh mungkin (paling jauh 3 petak) selama masih di air, supaya tidak tertutup nama pemain
      let n = 0;
      while (n < 2 && air(tx + dx * (n + 1), ty + dy * (n + 1))) n++;
      return [tx + dx * n, ty + dy * n];
    }
    return null;
  }
  const bisa = () => { const p = Kota.posisi(); return p ? airDepan(p.x, p.y, p.arah) : null; };

  /* ---------- tampilan: kotak di bawah layar + tali pancing di peta ---------- */
  const kotak = $("mancing"), teks = $("mancing-teks"), bar = $("mancing-bar"), nyawa = $("mancing-nyawa");
  const tblTarik = $("mancing-tarik"), tblSelesai = $("mancing-selesai");
  function tulis(isi, kelas) { teks.replaceChildren(...[].concat(isi).map(t => typeof t === "string" ? document.createTextNode(t) : t)); teks.className = kelas || ""; }
  function tombol(tarikTeks, selesaiTeks = "Selesai") {
    tblTarik.hidden = !tarikTeks; if (tarikTeks) tblTarik.textContent = tarikTeks;
    tblSelesai.textContent = selesaiTeks;
  }

  /* ---------- animasi di peta ----------
     Joran digambar dari tangan dengan sudut (derajat dari arah hadap): diam 40, ayun ke belakang 125, lepas ke depan 8,
     ditarik ikan 18, adu tarik 28 (bergetar). Lempar: ayun ke belakang, kibas ke depan, pelampung terbang melengkung,
     cipratan saat jatuh. Tunggu: pelampung naik-turun dengan riak. Gigit: pelampung tenggelam, cipratan. Adu: joran
     melengkung dan bergetar, ikan meronta, tiap tarikan tepat pelampung makin dekat. Dapat: ikan melompat keluar dari air
     ke tangan pemain lalu diangkat di atas kepala. Lepas: senar kendur, bayangan ikan berenang menjauh. */
  const tenang = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const JORAN = 13;
  let lempar0 = -1e9, mendarat = 0, pulang = null, hentak = 0, merah = 0, mendekat = 0, riakBerikut = 0, ronta = 0;
  let percik = [], cincin = [], ikanLompat = null, bayangan = null;

  const lerp = (a, b, t) => a + (b - a) * t;
  const mulus = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  function pangkal(p) {
    const [dx, dy] = ARAH[p.arah];
    return dy ? [p.x + 5, p.y - 4] : [p.x + dx * 3, p.y - 4];
  }
  function ujungJoran(p, sudut) {
    const [dx, dy] = ARAH[p.arah], [bx, by] = pangkal(p), r = sudut * Math.PI / 180;
    const maju = Math.cos(r) * JORAN, naik = Math.sin(r) * JORAN;
    if (!dy) return [bx + dx * maju, by - naik];
    return [bx + 2 + maju * .3, by + dy * maju * .6 - naik];          // menghadap atas/bawah: terlihat agak memendek
  }
  function sudutJoran(kini) {
    if (keadaan === "lempar" || kini < lempar0 + 900) {
      const t = kini - lempar0;
      if (t < 260) return lerp(40, 125, mulus(t / 260));
      if (t < 420) return lerp(125, 8, mulus((t - 260) / 160));
      if (t < 900) return lerp(8, 30, mulus((t - 420) / 480));
      return 30 + Math.sin(waktu / 700) * 2;
    }
    if (keadaan === "gigit") return 16 + (tenang ? 0 : Math.sin(waktu / 50) * 3);
    if (keadaan === "adu") return 26 + (hentak > 0 ? 22 * (hentak / 180) : 0) + (tenang ? 0 : Math.sin(waktu / 38) * 4);
    return 38 + Math.sin(waktu / 900) * 1.5;
  }
  function cipratkan(x, y, n, kuat = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (1.1 + Math.random() * .8);
      percik.push({x, y, vx: Math.cos(a) * (12 + Math.random() * 22) * kuat, vy: Math.sin(a) * (26 + Math.random() * 30) * kuat, t: 0, umur: 380 + Math.random() * 220});
    }
  }
  const beriRiak = (x, y, besar = 1) => cincin.push({x, y, t: 0, umur: 900 * besar, besar});

  function gambarTali(dt) {
    if (!gfx || !target) return;
    const p = Kota.posisi(); if (!p) return;
    const kini = performance.now();
    waktu += dt; hentak = Math.max(0, hentak - dt); merah = Math.max(0, merah - dt);
    const [hx, hy] = pangkal(p), [ux, uy] = ujungJoran(p, sudutJoran(kini));
    // titik pelampung: di air (makin dekat ke pemain saat ditarik), terbang saat dilempar, atau tergantung di ujung joran
    const ax = target[0] * T + 8, ay = target[1] * T + 9;
    const air = [lerp(ax, p.x, mendekat * .55), lerp(ay, p.y + 4, mendekat * .55)];
    let bx, by, diAir = true, kendur = 0;
    const tLempar = kini - lempar0;
    if (pulang) {                                                         // senar digulung: pelampung kembali ke ujung joran
      const t = mulus((kini - pulang.t0) / 380);
      bx = lerp(pulang.x, ux, t); by = lerp(pulang.y, uy + 5, t) - Math.sin(t * Math.PI) * 8; diAir = false;
      if (t >= 1) pulang.selesai = true;
    } else if (keadaan === "lempar" || keadaan === "hasil" || tLempar < 900) {
      if (keadaan === "hasil" || tLempar < 420) { bx = ux; by = uy + 5; diAir = false; }
      else {                                                              // terbang melengkung dari ujung joran ke air
        const t = Math.min(1, (tLempar - 420) / 480);
        bx = lerp(ux, air[0], t); by = lerp(uy, air[1], t) - Math.sin(t * Math.PI) * 24; diAir = t >= 1;
        if (t >= 1 && !mendarat) mendarat = kini;
      }
    } else {
      bx = air[0]; by = air[1]; kendur = keadaan === "tunggu" ? 3 : 0;
      if (keadaan === "tunggu") by += Math.sin(waktu / 380) * .8;
      if (keadaan === "gigit") by += 2 + (tenang ? 0 : Math.sin(waktu / 60) * 1.2);
      if (keadaan === "adu") { by += 1.5 + Math.sin(waktu / 45); bx += tenang ? 0 : Math.sin(waktu / 130) * 2.5; }
    }
    // pelampung baru menyentuh air: cipratan dan riak besar
    if (mendarat && mendarat <= kini && !gambarTali.sudahCiprat) { gambarTali.sudahCiprat = true; cipratkan(bx, by, 9); beriRiak(bx, by + 2, 1.4); }
    if (diAir && keadaan === "tunggu" && kini > riakBerikut) { riakBerikut = kini + 1500; beriRiak(bx, by + 2, .7); }
    if (keadaan === "adu" && !tenang && kini > ronta) { ronta = kini + 380 + Math.random() * 300; cipratkan(bx, by, 3, .7); }

    gfx.clear();
    // riak air
    cincin = cincin.filter(c => (c.t += dt) < c.umur);
    for (const c of cincin) {
      const f = c.t / c.umur;
      gfx.lineStyle(1, 0xffffff, .7 * (1 - f)).strokeEllipse(c.x, c.y, (6 + f * 16) * c.besar, (2.4 + f * 6) * c.besar);
    }
    // bayangan ikan yang kabur
    if (bayangan) {
      const f = (kini - bayangan.t0) / 900;
      if (f >= 1) bayangan = null;
      else gfx.fillStyle(0x1c3550, .35 * (1 - f)).fillEllipse(bayangan.x + bayangan.vx * f, bayangan.y + bayangan.vy * f, 9, 4);
    }
    // joran: dua ruas, ujungnya lebih tipis
    const mx = lerp(hx, ux, .55), my = lerp(hy, uy, .55) + (keadaan === "adu" ? 1.5 : 0);
    gfx.lineStyle(2, 0x5A3D22, 1).lineBetween(hx, hy, mx, my);
    gfx.lineStyle(1, 0x8a5a35, 1).lineBetween(mx, my, ux, uy);
    gfx.fillStyle(0xb9b2c4).fillRect(Math.round(hx + (ux - hx) * .2) - 1, Math.round(hy + (uy - hy) * .2) - 1, 2, 2);    // gulungan senar
    // senar: kendur melengkung saat menunggu, lurus tegang saat ditarik; merah sekejap saat tarikan meleset
    const warnaSenar = merah > 0 ? 0xff5a4a : 0xffffff;
    gfx.lineStyle(1, warnaSenar, .85);
    const n = 8;
    let lx = ux, ly = uy;
    for (let k = 1; k <= n; k++) {
      const t = k / n, x = lerp(ux, bx, t), y = lerp(uy, by - 2, t) + Math.sin(t * Math.PI) * kendur;
      gfx.lineBetween(lx, ly, x, y); lx = x; ly = y;
    }
    // pelampung 4 x 5: merah di atas, putih di bawah, bergaris tepi gelap
    const px_ = Math.round(bx) - 2, py_ = Math.round(by) - 4;
    gfx.fillStyle(0x2A211B).fillRect(px_ - 1, py_ - 1, 6, 7);
    gfx.fillStyle(0xE5483B).fillRect(px_, py_, 4, 3);
    gfx.fillStyle(0xffffff).fillRect(px_, py_ + 3, 4, 2);
    // percikan air
    percik = percik.filter(d => (d.t += dt) < d.umur);
    for (const d of percik) {
      const s = d.t / 1000, x = d.x + d.vx * s, y = d.y + d.vy * s + 140 * s * s;
      gfx.fillStyle(d.t % 120 < 60 ? 0xffffff : 0xbfe6ff, 1 - d.t / d.umur).fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    gfx.setDepth(10 + Math.max(p.y, by) + 1);
    gerakIkan(p, kini);
    if (pulang && pulang.selesai) pulang = null;
  }
  function gerakIkan(p, kini) {
    if (!ikanLompat) return;
    const f = (kini - ikanLompat.t0) / 650, s = ikanLompat.s;
    if (f < 1) {                                                          // melompat melengkung dari air ke tangan
      s.setPosition(lerp(ikanLompat.x, p.x, f), lerp(ikanLompat.y, p.y - 20, f) - Math.sin(f * Math.PI) * 26);
      s.setAngle(tenang ? 0 : f * 540 * ikanLompat.putar);
    } else {                                                              // diangkat di atas kepala, sedikit memantul
      const g = kini - ikanLompat.t0 - 650;
      s.setAngle(0).setPosition(p.x, p.y - 22 - Math.abs(Math.sin(g / 160)) * (g < 480 ? 3 : 0));
      if (g > 1600) s.setAlpha(Math.max(0, 1 - (g - 1600) / 300));
      if (g > 1900) { s.destroy(); ikanLompat = null; return; }
    }
    s.setDepth(10 + p.y + 3);
  }
  function lompatkanIkan(kode, dari) {
    const sc = Kota.adegan(); if (!sc) return;
    const kunci = "ikan-" + kode;
    if (!sc.textures.exists(kunci)) sc.textures.addCanvas(kunci, Barang.kanvas(kode));
    if (ikanLompat) ikanLompat.s.destroy();
    const p = Kota.posisi();
    ikanLompat = {s: sc.add.image(dari[0], dari[1], kunci), t0: performance.now(), x: dari[0], y: dari[1], putar: p && dari[0] > p.x ? -1 : 1};
    cipratkan(dari[0], dari[1], 10, 1.2); beriRiak(dari[0], dari[1] + 2, 1.5);
  }
  function titikPelampung() {
    const p = Kota.posisi();
    if (!target || !p) return null;
    return [lerp(target[0] * T + 8, p.x, mendekat * .55), lerp(target[1] * T + 9, p.y + 4, mendekat * .55)];
  }
  function gulung() {                                                     // pelampung ditarik pulang ke joran
    const b = titikPelampung();
    if (b) pulang = {x: b[0], y: b[1], t0: performance.now()};
  }
  function pasangTali(tile) {
    const sc = Kota.adegan();
    target = tile; waktu = 0;
    gfx = sc.add.graphics();
    riak = null;
  }
  function mulaiAyun() {
    lempar0 = performance.now(); mendarat = 0; gambarTali.sudahCiprat = false;
    mendekat = 0; pulang = null; hentak = 0; merah = 0; percik = []; cincin = []; riakBerikut = 0;
  }
  function lepasTali() {
    if (gfx && gfx.scene) gfx.destroy();
    if (ikanLompat && ikanLompat.s.scene) ikanLompat.s.destroy();
    gfx = riak = target = null; ikanLompat = null; bayangan = null; percik = []; cincin = []; pulang = null;
    lepasSeru();
  }

  /* ---------- alur ---------- */
  let ketukLalu = 0;
  function mulai() {
    if (aktif()) return;
    const tile = bisa();
    if (!tile) return;
    Akun.pastikan("Mancing", () => lempar(tile));
  }
  async function lempar(tile = target || bisa()) {
    if (!tile) { selesai(); return; }
    keadaan = "lempar"; lemparan = null;
    kotak.hidden = false; bar.hidden = true; nyawa.textContent = "";
    tulis("Melempar kail…"); tombol(null, "Batal");
    if (!target) pasangTali(tile);
    target = tile; mulaiAyun();
    try {
      const l = await Akun.kirim("/api/mancing/lempar", {tempat: Kota.ruang()});
      if (keadaan !== "lempar") return;           // dibatalkan saat menunggu server
      lemparan = l; keadaan = "tunggu";
      tulis("Tunggu umpannya dimakan…"); tombol("Tarik");
      // waktu gigit dihitung dari pelampung menyentuh air (animasi lempar kurang dari satu detik). Server hanya menolak
      // tarikan yang terlalu cepat, jadi menggigit sedikit lebih lambat di layar tetap sah.
      lemparan.gigit = Math.max(performance.now(), lempar0 + 900) + l.gigit_ms;
    } catch (e) {
      if (keadaan !== "lempar") return;
      if (e.status === 401 || e.status === 403) { selesai(); Akun.pastikan("Mancing", () => lempar(tile)); return; }
      tulis(e instanceof TypeError ? "CodeIn News sedang tidak bisa dihubungi. Coba lagi sebentar." : e.message); tombol(null, "Tutup");
      keadaan = "hasil";
    }
  }
  function gigit() {
    keadaan = "gigit"; waktu = 0;
    const [reaksi] = KESULITAN[lemparan.kesulitan] || KESULITAN[1];
    lemparan.batas = performance.now() + reaksi;
    tulis("Umpannya dimakan! Tarik sekarang!", "seru"); tombol("Tarik!");
    const b = titikPelampung();
    if (b) { cipratkan(b[0], b[1], 6); beriRiak(b[0], b[1] + 2, 1.1); }
    // tanda seru di atas pelampung
    const bx = target[0] * T + 8, by = target[1] * T;
    seru = Kota.tempelkan(el("div", "seru-ikan", "!"), () => [bx, by - 2]);
    if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) { /* tidak apa-apa */ }
  }
  function zonaBaru() {
    const lebar = (KESULITAN[lemparan.kesulitan] || KESULITAN[1])[2], tengah = .2 + Math.random() * .6;
    zona = [tengah - lebar / 2, tengah + lebar / 2];
    bar.querySelector(".zona").style.left = zona[0] * 100 + "%";
    bar.querySelector(".zona").style.width = lebar * 100 + "%";
  }
  function adu() {
    keadaan = "adu"; tepat = 0; meleset = 0; jarum = 0;
    sasaran = (KESULITAN[lemparan.kesulitan] || KESULITAN[1])[1];
    lemparan.mulaiAdu = performance.now();
    bar.hidden = false; zonaBaru();
    tulis(sasaran > 1 ? `Ikannya melawan! Tekan saat jarum di hijau (${sasaran} kali).` : "Tekan saat jarum di zona hijau!"); tombol("Tarik!");
    perbaruiNyawa();
  }
  function lepasSeru() { if (seru) { Kota.lepaskan(seru); seru = null; } }
  function perbaruiNyawa() { nyawa.textContent = `Tepat ${tepat}/${sasaran}` + (meleset ? " · senar tegang!" : ""); }

  function tekan() {
    const kini = performance.now();
    if (kini - ketukLalu < 120) return;            // ketukan ganda di HP
    ketukLalu = kini;
    if (keadaan === "tunggu") { kirim(false, "Terlalu cepat ditarik, ikannya kabur."); return; }
    if (keadaan === "gigit") { adu(); return; }
    if (keadaan === "adu") {
      lepasSeru();
      if (jarum >= zona[0] && jarum <= zona[1]) {
        tepat++; perbaruiNyawa();
        hentak = 180; mendekat = tepat / sasaran;                         // joran disentak, ikan makin dekat
        const b = titikPelampung(); if (b) cipratkan(b[0], b[1], 4);
        if (tepat >= sasaran) { kirim(true); return; }
        zonaBaru();
      } else {
        meleset++; perbaruiNyawa();
        merah = 260;
        if (meleset >= 2) { kirim(false, "Senarnya putus! Ikannya lepas."); return; }
      }
      return;
    }
    if (keadaan === "hasil") lempar();
  }
  async function kirim(berhasil, alasan) {
    keadaan = "kirim"; bar.hidden = true; nyawa.textContent = "";
    lepasSeru();
    tulis(berhasil ? "Menarik…" : alasan); tombol(null, "Tunggu");
    let h = null;
    try { h = await Akun.kirim("/api/mancing/tarik", {id: lemparan.id, berhasil}); }
    catch (e) { h = {lepas: true, alasan: e.message}; }
    if (keadaan !== "kirim") return;
    keadaan = "hasil";
    const asal = titikPelampung();
    if (h.ikan) {
      Ekonomi.tambah(h.ikan);
      if (asal) lompatkanIkan(h.ikan.kode, asal);
      gulung();                                                           // kail ikut terangkat bersama ikannya
      const kartu = el("span", "tangkapan");
      kartu.append(Barang.ikon(h.ikan.kode, "ikon-barang besar"),
        el("b", null, h.ikan.nama), el("span", null, ` · ${Barang.langka(h.ikan.langka)} · ${h.ikan.harga ? h.ikan.harga + " koin" : "tidak laku"}`));
      tulis([h.ikan.harga ? "Dapat! " : "Yah… ", kartu, h.sisa_hari_ini <= 5 ? ` Sisa ${h.sisa_hari_ini} tangkapan hari ini.` : ""]);
      // balon ucapan setelah ikannya selesai dipamerkan di atas kepala (supaya tidak menutupi ikannya)
      const ucapan = h.ikan.langka === "langka" ? `Wah, ${h.ikan.nama}!` : h.ikan.harga ? `Dapat ${h.ikan.nama}!` : `Dapat ${h.ikan.nama.toLowerCase()}…`;
      setTimeout(() => { if (aktif()) Kota.ucap(ucapan); }, 2500);
    } else {
      tulis(berhasil ? h.alasan || "Ikannya lepas." : alasan);
      if (asal) {                                                         // ikan kabur: bayangannya berenang menjauh
        const p = Kota.posisi(), jx = asal[0] - p.x, jy = asal[1] - p.y, j = Math.hypot(jx, jy) || 1;
        if (!/cepat/.test(alasan || "")) bayangan = {x: asal[0], y: asal[1] + 3, vx: jx / j * 26, vy: jy / j * 26, t0: performance.now()};
        cipratkan(asal[0], asal[1], 5);
        gulung();
      }
    }
    tombol("Lempar lagi");
  }
  function selesai() {
    if (keadaan === "tunggu" || keadaan === "gigit" || keadaan === "adu") Akun.kirim("/api/mancing/tarik", {id: lemparan.id, berhasil: false}).catch(() => {});
    keadaan = null; lemparan = null; kotak.hidden = true;
    lepasSeru();
    lepasTali();
    Kota.segarkanAksi();
  }

  Kota.tiapBingkai(dt => {
    if (!aktif()) return;
    gambarTali(dt);
    const kini = performance.now();
    if (keadaan === "tunggu" && kini >= lemparan.gigit) gigit();
    else if (keadaan === "gigit" && kini > lemparan.batas) kirim(false, "Kelamaan, ikannya lepas.");
    else if (keadaan === "adu") {
      const ayun = (KESULITAN[lemparan.kesulitan] || KESULITAN[1])[3];
      jarum = (1 - Math.cos((kini - lemparan.mulaiAdu) / ayun * Math.PI)) / 2;      // 0..1 bolak-balik
      bar.querySelector(".jarum").style.left = jarum * 100 + "%";
      if (kini - lemparan.mulaiAdu > 20000) kirim(false, "Ikannya kelelahan dan lepas sendiri.");
    }
  });
  Kota.tahan(aktif);
  Kota.saatSiap(() => { keadaan = null; lemparan = null; kotak.hidden = true; gfx = riak = target = seru = null; ikanLompat = null; bayangan = null; pulang = null; percik = []; cincin = []; });

  tblTarik.onclick = () => { tekan(); };
  tblSelesai.onclick = () => { if (keadaan !== "kirim") selesai(); };
  addEventListener("keydown", e => {
    if (!aktif() || Panel.terbuka()) return;
    if (e.code === "Escape") { e.preventDefault(); if (keadaan !== "kirim") selesai(); return; }
    if (e.code === "KeyE" || e.code === "Space" || e.code === "Enter") {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!e.repeat) tekan();
    }
  }, true);

  return {aktif, bisa, mulai};
})();

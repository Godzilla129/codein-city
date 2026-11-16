/* CodeIn City · warga dan rutinitas hariannya.
   Jadwal ada di KOTA.warga (config.js), dibagi empat waktu WIB (KOTA.waktu): pagi, siang, sore, malam.
   Saat waktu berganti, setiap warga berjalan ke tempat barunya lewat trotoar dan zebra cross (pencarian jalur A*),
   lalu jalan-jalan kecil di sekitar tempat itu dengan jeda istirahat. Malam hari sebagian besar pulang ke rumahnya
   di kampung selatan dan menghilang ke dalam rumah. Warga di dalam gedung (Markas, Galeri) berjaga di satu titik. */

const Warga = (() => {
  const T = KOTA.ubin, JARAK_SAPA = 22;
  const ASPAL = new Set([441, 468, 406, 460, 433, 461, 463, 462]), ZEBRA = new Set([405, 432, 459]), RUMPUT = 28;
  const ARAH4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  let daftar = [], adegan = null, ruang = "kota", grid = null, W = 0, H = 0, waktuKini = null, cekWaktu = 0;
  let rumah = {};          // nama penghuni -> tile di depan pintu rumahnya

  const tengah = (x, y) => [x * T + 8, y * T + 12];                       // titik kaki di tengah tile
  const tileDari = s => [Math.floor(s.x / T), Math.floor(s.y / T)];
  const arahDari = (dx, dy) => Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "kiri" : "kanan") : (dy < 0 ? "atas" : "bawah");
  const acak = (a, b) => a + Math.random() * (b - a);

  /* ---------- peta biaya untuk pencarian jalur: trotoar murah, rumput agak mahal, aspal mahal (kecuali zebra cross) ---------- */
  function bangunGrid(peta) {
    W = peta.width; H = peta.height; grid = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const keras = peta.getTileAt(x, y, true, "tabrakan"), dasar = peta.getTileAt(x, y, true, "tanah");
      if (keras && keras.index > 0) { grid[y * W + x] = 0; continue; }
      const t = dasar ? dasar.index - 1 : -1;
      grid[y * W + x] = ASPAL.has(t) ? 6 : ZEBRA.has(t) ? 1 : t === RUMPUT ? 2 : 1;
    }
  }
  const biaya = (x, y) => x < 0 || y < 0 || x >= W || y >= H ? 0 : grid[y * W + x];

  // A* empat arah. Mengembalikan daftar tile [x, y] dari sesudah titik awal sampai tujuan, atau null.
  function jalur(a, b) {
    if (!grid || !biaya(b[0], b[1])) return null;
    const kunci = (x, y) => y * W + x, mulai = kunci(a[0], a[1]), akhir = kunci(b[0], b[1]);
    if (mulai === akhir) return [];
    const g = new Map([[mulai, 0]]), asal = new Map(), antre = [[0, mulai]];
    const masuk = item => {            // antrean berprioritas (heap biner kecil)
      antre.push(item);
      for (let i = antre.length - 1; i > 0;) { const p = (i - 1) >> 1; if (antre[p][0] <= antre[i][0]) break; [antre[p], antre[i]] = [antre[i], antre[p]]; i = p; }
    };
    const keluar = () => {
      const atas = antre[0], akhirItem = antre.pop();
      if (antre.length) {
        antre[0] = akhirItem;
        for (let i = 0; ;) {
          const l = 2 * i + 1, r = l + 1; let m = i;
          if (l < antre.length && antre[l][0] < antre[m][0]) m = l;
          if (r < antre.length && antre[r][0] < antre[m][0]) m = r;
          if (m === i) break; [antre[m], antre[i]] = [antre[i], antre[m]]; i = m;
        }
      }
      return atas;
    };
    let langkah = 0;
    while (antre.length && langkah++ < 20000) {
      const [, c] = keluar();
      if (c === akhir) {
        const hasil = [];
        for (let k = c; k !== mulai; k = asal.get(k)) hasil.push([k % W, Math.floor(k / W)]);
        return hasil.reverse();
      }
      const cx = c % W, cy = Math.floor(c / W), gc = g.get(c);
      for (const [dx, dy] of ARAH4) {
        const nx = cx + dx, ny = cy + dy, k = biaya(nx, ny);
        if (!k) continue;
        const n = kunci(nx, ny), gn = gc + k;
        if (gn < (g.get(n) ?? Infinity)) {
          g.set(n, gn); asal.set(n, c);
          masuk([gn + Math.abs(nx - b[0]) + Math.abs(ny - b[1]), n]);
        }
      }
    }
    return null;
  }

  /* ---------- waktu dan jadwal ---------- */
  function jadwalKini(w) { return w.def.jadwal ? w.def.jadwal[waktuKini] || null : null; }
  // tile tujuan jalan-jalan kecil: acak di sekitar titik jadwal, hanya di tempat yang enak diinjak (bukan aspal)
  function tileSekitar([x0, y0], r) {
    for (let i = 0; i < 12; i++) {
      const x = x0 + Math.round(acak(-r, r)), y = y0 + Math.round(acak(-r, r)), k = biaya(x, y);
      if (k && k <= 2) return [x, y];
    }
    return [x0, y0];
  }
  function sembunyi(w, ya) { w.diRumah = ya; w.s.setVisible(!ya); w.label.elemen.hidden = ya; if (ya && w.hapusBalon) w.hapusBalon(); }

  // tempatkan warga langsung di tempat jadwalnya (saat peta dimuat), tanpa berjalan dari jauh
  function tempatkan(w) {
    const j = jadwalKini(w);
    w.jalur = []; w.titikRute = 0; w.tunggu = acak(300, 2500);
    if (!j) { const [x, y] = tengah(...w.def.di); w.s.setPosition(x, y); sembunyi(w, false); return; }
    if (j.pulang) { const r = rumah[w.def.nama]; if (r) { const [x, y] = tengah(...r); w.s.setPosition(x, y); } sembunyi(w, true); return; }
    const t = j.rute ? j.rute[0] : tileSekitar(j.di, j.r || 0), [x, y] = tengah(...t);
    w.s.setPosition(x, y); sembunyi(w, false);
  }
  // waktu berganti: keluar rumah dulu kalau perlu, lalu berjalan ke tempat jadwal yang baru
  function gantiJadwal(w) {
    const j = jadwalKini(w);
    if (!j) return;
    w.giliran = 0; w.titikRute = 0; w.tunggu = acak(0, 4000);      // tidak semua warga berangkat di detik yang sama
    if (w.diRumah && !j.pulang) {
      const r = rumah[w.def.nama];
      if (r) { const [x, y] = tengah(...r); w.s.setPosition(x, y); }
      sembunyi(w, false);
    }
    w.jalur = null;            // null = hitung jalur ke tempat baru begitu jeda selesai
  }
  function tujuanBerikut(w) {
    const j = jadwalKini(w);
    if (!j) return null;
    if (j.pulang) return rumah[w.def.nama] || null;
    if (j.rute) { const t = j.rute[w.titikRute % j.rute.length]; w.titikRute++; return t; }
    return tileSekitar(j.di, j.r || 0);
  }

  /* ---------- tiap bingkai ---------- */
  function gerak(dt) {
    const pos = Kota.posisi(), pf = Kota.profil();
    if (!pos) return;
    if ((cekWaktu -= dt) <= 0) {
      cekWaktu = 1000;
      const baru = Kota.waktu().kunci;
      if (baru !== waktuKini) { waktuKini = baru; daftar.forEach(gantiJadwal); }
    }
    for (const w of daftar) {
      const s = w.s;
      s.setDepth(10 + s.y);
      if (w.diRumah) continue;
      const j = jadwalKini(w);
      // pemain mendekat: berhenti dan menghadap pemain
      if (pf && Phaser.Math.Distance.Between(s.x, s.y, pos.x, pos.y) < JARAK_SAPA) {
        w.arah = arahDari(pos.x - s.x, pos.y - s.y);
        s.anims.stop(); s.setFrame(Kota.frame(w.def.karakter, w.arah, 0)); continue;
      }
      if (!j) { s.setFrame(Kota.frame(w.def.karakter, w.def.hadap || "bawah", 0)); continue; }      // penjaga dalam gedung
      if (w.tunggu > 0) {
        w.tunggu -= dt;
        // sesekali menoleh saat istirahat
        if (!w.toleh && w.tunggu < w.tungguAwal / 2) { w.toleh = true; if (Math.random() < .5) w.arah = ["bawah", "kiri", "kanan", "atas"][Math.floor(Math.random() * 4)]; }
        s.anims.stop(); s.setFrame(Kota.frame(w.def.karakter, w.arah, 0)); continue;
      }
      if (!w.jalur || !w.jalur.length) {
        if (w.jalur && w.sampai) {           // baru sampai: masuk rumah, atau istirahat beberapa detik
          w.sampai = false;
          if (j.pulang) { sembunyi(w, true); continue; }
          w.tunggu = w.tungguAwal = j.rute ? acak(400, 1600) : acak(2000, 6500); w.toleh = false; w.jalur = []; continue;
        }
        const tujuan = tujuanBerikut(w), dari = tileDari(s);
        w.jalur = tujuan ? jalur(dari, tujuan) : [];
        if (w.jalur === null) {               // tidak ada jalan (mestinya tidak terjadi): pindah diam-diam ke tujuan
          const [x, y] = tengah(...tujuan); s.setPosition(x, y); w.jalur = [];
        }
        w.sampai = true;
        if (!w.jalur.length) { w.tunggu = w.tungguAwal = acak(1500, 4000); w.toleh = false; }
        continue;
      }
      const [tx, ty] = tengah(...w.jalur[0]), dx = tx - s.x, dy = ty - s.y, sisa = Math.hypot(dx, dy);
      const langkah = (j.laju || 26) * dt / 1000;
      if (sisa <= langkah) { s.setPosition(tx, ty); w.jalur.shift(); }
      else {
        s.x += dx / sisa * langkah; s.y += dy / sisa * langkah;
        w.arah = arahDari(dx, dy);
        s.anims.play(`jalan-${w.def.karakter}-${w.arah}`, true);
      }
    }
  }

  /* ---------- peta dimuat ---------- */
  Kota.saatSiap(({adegan: sc, ruang: r, peta}) => {
    adegan = sc; ruang = r; waktuKini = Kota.waktu().kunci; cekWaktu = 1000;
    grid = null; rumah = {};
    if (r === "kota") {
      bangunGrid(peta);
      for (const p of Kota.pintu()) if (p.tujuan === "rumah") {
        const t = [Math.floor((p.x + p.w / 2) / T), Math.floor(p.y / T)];
        for (const w of KOTA.warga) if (p.penghuni.includes(w.nama)) rumah[w.nama] = t;
      }
    }
    daftar = KOTA.warga.filter(d => (d.ruang || "kota") === r).map(def => {
      const s = sc.add.sprite(0, 0, "orang", Kota.frame(def.karakter, def.hadap || "bawah", 0)).setOrigin(.5, .8);
      const label = Kota.tempelkan(el("div", "nama", def.nama), () => [s.x, s.y - 14]);
      const w = {def, s, label, arah: def.hadap || "bawah", jalur: [], tunggu: 0, tungguAwal: 0, giliran: 0, titikRute: 0, diRumah: false, hapusBalon: null};
      tempatkan(w);
      return w;
    });
  });
  Kota.tiapBingkai(gerak);

  /* ---------- disapa pemain ---------- */
  function isiUcapan(t) {
    if (t.includes("{kabar}")) { const k = Papan.kabarTeratas(); if (!k) return null; t = t.replace("{kabar}", k); }
    return t.replace("{pengumuman}", (KOTA.panel.papan.daftar || [""])[0]);
  }
  function resepsionis(w) {
    const p = KOTA.panel.papan.daftar || [], kunci = Kota.waktu().kunci;
    const isi = [el("p", null, w.def.salam[kunci] || "Selamat datang di Markas CodeIn!"),
      el("p", null, "Aku Rani, resepsionis Markas. Aku yang menempel pengumuman di papan alun-alun. Yang terbaru:")];
    if (p.length) { const ul = el("ul"); p.slice(0, 3).forEach(t => ul.append(el("li", null, t))); isi.push(ul); }
    isi.push(el("p", null, "Mau memajang karya? Ajukan lewat Galeri Showcase atau langsung di depan baliho mana saja. Mau situs proyekmu punya rumah di kota? Datangi rumah kosong mana saja dan ajukan, tinggal unggah zip situsnya."),
      el("p", null, "Penasaran sama Warkop CodeIn, atau mau ikut membangun kota ini? Sampaikan ke Jull lewat grup WhatsApp CodeIn."));
    Panel.buka("Kak Rani · Resepsionis", isi, [{teks: "Ke Patung Pendiri", aksi: () => Kota.pindahKe("pendiri")}, {teks: "Tutup"}]);
  }
  function sapa(w) {
    if (w.def.peran === "resepsionis") { resepsionis(w); return; }
    if (w.def.buka) { Papan.tangani({id: w.def.buka, tujuan: ""}); return; }
    const j = jadwalKini(w), daftarUcapan = ((j && j.ucapan) || []).map(isiUcapan).filter(Boolean);
    if (!daftarUcapan.length) return;
    if (w.hapusBalon) w.hapusBalon();
    w.hapusBalon = Kota.balon(w.s, daftarUcapan[w.giliran++ % daftarUcapan.length]);
  }

  return {
    // warga terlihat terdekat dari titik (x, y), dalam jarak sapa
    terdekat: (x, y) => daftar.find(w => !w.diRumah && Phaser.Math.Distance.Between(w.s.x, w.s.y, x, y) < JARAK_SAPA) || null,
    sapa,
    sapaNama: nama => { const w = daftar.find(w => w.def.nama === nama); if (w) sapa(w); },
    sprites: () => daftar.filter(w => !w.diRumah).map(w => w.s),
    // di mana seorang warga sekarang: {diRumah, ket}. Dipakai saat rumah diketuk dan di depan toko.
    dimana(nama) {
      const def = KOTA.warga.find(d => d.nama === nama);
      if (!def) return null;
      if (!def.jadwal) return {diRumah: false, ket: def.ket || ""};
      const j = def.jadwal[Kota.waktu().kunci] || {}, w = daftar.find(w => w.def === def);
      return {diRumah: w ? w.diRumah : !!j.pulang, pulang: !!j.pulang, ket: j.ket || ""};
    },
  };
})();

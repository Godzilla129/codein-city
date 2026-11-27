/* CodeIn City · warga dan rutinitas hariannya.
   Jadwal ada di KOTA.warga (config.js), dibagi empat waktu WIB (KOTA.waktu): pagi, siang, sore, malam.
   Saat waktu berganti, setiap warga berjalan ke tempat barunya lewat jalan batu dan jalan setapak (pencarian jalur A*),
   lalu jalan-jalan kecil di sekitar tempat itu dengan jeda istirahat. Malam hari sebagian besar pulang ke rumahnya
   di kampung selatan dan menghilang ke dalam rumah. Warga di dalam gedung (Markas, Galeri) berjaga di satu titik. */

const Warga = (() => {
  const T = KOTA.ubin, JARAK_SAPA = 22;
  const ARAH4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  let daftar = [], adegan = null, ruang = "kota", grid = null, komp = null, W = 0, H = 0, waktuKini = null, cekWaktu = 0;
  let rumah = {};          // nama penghuni -> tile di depan pintu rumahnya
  let tempat = {};         // id titik "tempat" di peta kota -> tile; jadwal di config.js menyebut tempat dengan id-nya
  let tamu = [];           // warga tambahan dari berkas lain (redaktur CodeIn News yang sedang keliling kota), lihat aturTamu

  const tengah = (x, y) => [x * T + 8, y * T + 12];                       // titik kaki di tengah tile
  const tileDari = s => [Math.floor(s.x / T), Math.floor(s.y / T)];
  const arahDari = (dx, dy) => Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "kiri" : "kanan") : (dy < 0 ? "atas" : "bawah");
  const acak = (a, b) => a + Math.random() * (b - a);
  // titik jadwal: [x, y] langsung, atau id tempat di peta ("depan-papan"). null kalau id tidak ada di peta.
  const titik = v => typeof v === "string" ? tempat[v] || null : v || null;

  /* ---------- peta biaya untuk pencarian jalur: jalan murah, rumput agak mahal, lajur delman mahal ----------
     Rumput dikenali dari properti ubin "rumput" (tools/buat_peta.py). Lajur delman dan sepeda = petak di sepanjang layer "rute":
     warga boleh menyeberang, tetapi tidak berjalan memanjang di tengah jalan. */
  function bangunGrid(peta) {
    W = peta.width; H = peta.height; grid = new Float32Array(W * H);
    const lajur = new Set(), rute = peta.getObjectLayer("rute");
    for (const o of rute ? rute.objects : []) {
      const pts = (o.polyline || []).map(q => [o.x + q.x, o.y + q.y]);
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        if (y0 === y1) {
          const r = Math.floor((y0 - 1) / T);
          for (let x = Math.max(0, Math.floor(Math.min(x0, x1) / T)); x <= Math.min(W - 1, Math.floor(Math.max(x0, x1) / T)); x++) { lajur.add(r * W + x); lajur.add((r - 1) * W + x); }
        } else {
          const c = Math.floor(x0 / T);
          for (let y = Math.max(0, Math.floor(Math.min(y0, y1) / T)); y <= Math.min(H - 1, Math.floor(Math.max(y0, y1) / T)); y++) lajur.add(y * W + c);
        }
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const keras = peta.getTileAt(x, y, true, "rintangan"), dasar = peta.getTileAt(x, y, true, "tanah");
      if (keras && keras.index > 0) { grid[y * W + x] = 0; continue; }
      grid[y * W + x] = lajur.has(y * W + x) ? 5 : dasar && dasar.properties && dasar.properties.rumput ? 2 : 1;
    }
    // nomor wilayah: petak yang saling tersambung punya nomor sama (untuk tahu tujuan mana yang bisa dicapai)
    komp = new Int32Array(W * H).fill(-1);
    for (let i = 0, n = 0; i < W * H; i++) if (grid[i] && komp[i] < 0) {
      const tumpuk = [i]; komp[i] = n;
      while (tumpuk.length) {
        const c = tumpuk.pop(), cx = c % W, cy = (c / W) | 0;
        for (const [dx, dy] of ARAH4) {
          const nx = cx + dx, ny = cy + dy, k = ny * W + nx;
          if (biaya(nx, ny) && komp[k] < 0) { komp[k] = n; tumpuk.push(k); }
        }
      }
      n++;
    }
  }
  const biaya = (x, y) => x < 0 || y < 0 || x >= W || y >= H ? 0 : grid[y * W + x];

  // petak terdekat dari p yang bisa diinjak dan masuk wilayah nomor k (k < 0: wilayah mana saja). null kalau tidak ada.
  function terdekat([x0, y0], k, maks = 8) {
    const cocok = (x, y) => biaya(x, y) && (k < 0 || komp[y * W + x] === k);
    if (cocok(x0, y0)) return [x0, y0];
    for (let r = 1; r <= maks; r++) {
      let hasil = null, jarak = Infinity;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !cocok(x0 + dx, y0 + dy)) continue;
        const j = Math.abs(dx) + Math.abs(dy);
        if (j < jarak) { jarak = j; hasil = [x0 + dx, y0 + dy]; }
      }
      if (hasil) return hasil;
    }
    return null;
  }
  // A* empat arah. Mengembalikan daftar tile [x, y] dari sesudah titik awal sampai tujuan, atau null.
  // Tujuan yang terhalang (lampu, bangku, air) atau tidak tersambung diganti petak terdekat yang bisa dicapai.
  function jalur(a, b) {
    if (!grid) return null;
    if (a[0] === b[0] && a[1] === b[1]) return [];
    const awal = terdekat(a, -1, 2);
    if (!awal) return null;
    b = terdekat(b, komp[awal[1] * W + awal[0]]);
    if (!b) return null;
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
  // tile tujuan jalan-jalan kecil: acak di sekitar titik jadwal, hanya di tempat yang enak diinjak (bukan lajur delman)
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
    if (!j) { const [x, y] = tengah(...titik(w.def.di)); w.s.setPosition(x, y); sembunyi(w, false); return; }
    if (j.pulang) { const r = rumah[w.def.nama]; if (r) { const [x, y] = tengah(...r); w.s.setPosition(x, y); } sembunyi(w, true); return; }
    const t = (j.rute ? titik(j.rute[0]) : titik(j.di) && tileSekitar(titik(j.di), j.r || 0)) || [0, 0], [x, y] = tengah(...t);
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
    if (j.rute) { const t = titik(j.rute[w.titikRute % j.rute.length]); w.titikRute++; return t; }
    return titik(j.di) && tileSekitar(titik(j.di), j.r || 0);
  }

  /* ---------- tiap bingkai ---------- */
  function gerak(dt) {
    const pos = Kota.posisi(), pf = Kota.profil();
    if (!pos) return;
    // pedagang pasar: namanya baru muncul kalau pemain mendekat, supaya pasar yang ramai tidak penuh tulisan
    for (const w of daftar) if (w.def.pedagang && !w.diRumah) w.label.elemen.hidden = Math.abs(w.s.x - pos.x) > 72 || Math.abs(w.s.y - pos.y) > 56;
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
        if (w.jalur === null) {               // tidak ada jalan (mestinya tidak terjadi)
          w.jalur = [];
          // pindah diam-diam hanya kalau warga ini sedang tidak terlihat; kalau terlihat, diam dulu lalu coba tujuan lain
          if (!Kota.terlihat(s.x, s.y) && !Kota.terlihat(...tengah(...tujuan))) { const [x, y] = tengah(...tujuan); s.setPosition(x, y); }
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
    grid = null; rumah = {}; tempat = {};
    const lap = peta.getObjectLayer("titik");
    for (const o of lap ? lap.objects : []) {
      const id = o.name === "tempat" && (o.properties || []).find(q => q.name === "id");
      if (id) tempat[id.value] = [Math.floor(o.x / T), Math.floor(o.y / T)];
    }
    if (r === "kota") {
      bangunGrid(peta);
      for (const p of Kota.pintu()) if (p.tujuan === "rumah") {
        const t = [Math.floor((p.x + p.w / 2) / T), Math.floor(p.y / T)];
        for (const w of KOTA.warga) if (p.penghuni.includes(w.nama)) rumah[w.nama] = t;
      }
    }
    daftar = KOTA.warga.filter(d => (d.ruang || "kota") === r).map(def => buatWarga(def));
    if (r === "kota") tamu.forEach(def => daftar.push(buatWarga(def, true)));
  });
  function buatWarga(def, keluarDariPintu) {
    // angkat = digambar beberapa piksel lebih tinggi (pedagang yang berdiri di balik meja lapak, supaya kepala dan bahunya terlihat)
    const angkat = def.angkat || 0;
    const s = adegan.add.sprite(0, 0, "orang", Kota.frame(def.karakter, def.hadap || "bawah", 0)).setOrigin(.5, .8 + angkat / 16);
    const label = Kota.tempelkan(el("div", "nama" + (def.redaksi ? " redaktur" : ""), def.label || def.nama), () => [s.x, s.y - 14 - angkat - Kota.angkatNama()]);
    const w = {def, s, label, arah: def.hadap || "bawah", jalur: [], tunggu: 0, tungguAwal: 0, giliran: 0, titikRute: 0, diRumah: false, hapusBalon: null};
    tempatkan(w);
    if (keluarDariPintu && def.dari) {         // baru keluar kantor: muncul di depan pintunya lalu berjalan ke rutenya
      const [x, y] = tengah(...(titik(def.dari) || [0, 0])); s.setPosition(x, y); w.jalur = null; w.tunggu = 0;
    }
    return w;
  }
  // Warga tambahan yang berganti-ganti (redaktur yang keluar kantor untuk keliling kota). defs = daftar def lengkap
  // seperti KOTA.warga, ditambah: redaksi (nama redaktur, disapa = dialog redaksi), dari (tile tempat muncul).
  function aturTamu(defs) {
    const lama = new Set(tamu.map(d => d.nama)), baru = new Set(defs.map(d => d.nama));
    tamu = defs;
    if (ruang !== "kota" || !adegan) return;
    for (const w of daftar.filter(w => w.def.redaksi && !baru.has(w.def.nama))) {     // kembali ke kantor
      Kota.lepaskan(w.label); w.s.destroy(); if (w.hapusBalon) w.hapusBalon();
    }
    daftar = daftar.filter(w => !w.def.redaksi || baru.has(w.def.nama));
    for (const def of defs) if (!lama.has(def.nama) || !daftar.some(w => w.def.nama === def.nama)) daftar.push(buatWarga(def, true));
  }
  Kota.tiapBingkai(gerak);

  /* ---------- disapa pemain ---------- */
  function isiUcapan(t) {
    if (t.includes("{kabar}")) { const k = Papan.kabarTeratas(); if (!k) return null; t = t.replace("{kabar}", k); }
    return t.replace("{pengumuman}", (KOTA.panel.papan.daftar || [""])[0]);
  }
  function resepsionis(w) {
    const p = KOTA.panel.papan.daftar || [], kunci = Kota.waktu().kunci;
    const isi = [el("p", null, w.def.salam[kunci] || "Selamat datang di Markas CodeIn!"),
      el("p", null, "Aku Rani, resepsionis Markas. Semua pendaftaran di CodeIn City lewat aku:")];
    const ul = el("ul");
    ul.append(el("li", null, "Hosting proyek: situs, game web, atau portofolio tayang gratis di namaproyek." + KOTA.domain + " dan masuk Direktori Proyek."),
      el("li", null, "Baliho: pajang proyek, acara, atau portofoliomu di baliho kota."));
    const acara = Acara.terbuka();
    if (acara.length) ul.prepend(el("li", null, `Acara: ${acara.map(a => a.judul).join(", ")}. Pendaftarannya juga lewat aku.`));
    isi.push(ul);
    if (Akun.nyala() && !Akun.sudahWarga()) isi.push(el("p", null, "Pendaftaran khusus warga, yaitu anggota yang sudah masuk dengan akun Google. Belum masuk? Nanti aku bantu."));
    if (p.length) isi.push(el("p", "redup", "Pengumuman terbaru: " + p[0]));
    isi.push(el("p", "redup", "Mau ikut membangun kota atau membuka Warkop CodeIn? Sampaikan ke Jull lewat grup WhatsApp CodeIn."));
    Panel.buka("Kak Rani · Resepsionis", isi, [
      ...(acara.length ? [{teks: acara.length > 1 ? "Daftar acara" : `Daftar ${acara[0].judul}`, utama: true, aksi: () => Acara.pilih()}] : []),
      {teks: "Daftar hosting proyek", utama: !acara.length, aksi: () => RumahProyek.formulir()},
      {teks: "Pasang baliho", aksi: () => Papan.formulir(0)},
      {teks: "Direktori proyek", aksi: () => RumahProyek.direktori()},
      {teks: "Tutup"}]);
  }
  // pemandu kota: kenalkan tempat-tempat baru dan antar ke sana (pindah ke depan pintunya)
  const ANTAR = [["Galeri Komunitas", "galeri-komunitas"], ["Menara Jam", "menara-jam"], ["Pasar CodeIn", "pasar"],
                 ["Markas CodeIn", "markas"], ["Perumahan", "gerbang-selatan"]];
  function pemandu() {
    const sapaan = {pagi: "Selamat pagi!", siang: "Selamat siang!", sore: "Selamat sore!", malam: "Selamat malam!"}[Kota.waktu().kunci] || "Halo!";
    const isi = [el("p", null, `${sapaan} Aku Nara, pemandu CodeIn City. Mau ke mana? Aku antar sampai depan pintunya.`)];
    const ul = el("ul");
    ul.append(el("li", null, "Galeri Komunitas: foto kegiatan CodeIn, di seberang jembatan batu."),
      el("li", null, "Menara Jam Server: jam kota sekaligus lampu kesehatan server, di alun-alun."),
      el("li", null, "Pasar CodeIn: jual ikan ke Pak Ikan dan hasil kebun ke Bu Sayur. Mancing bisa di tepi sungai atau kolam taman."),
      el("li", null, "Markas CodeIn: Kak Rani mengurus hosting, baliho, dan pendaftaran acara."),
      el("li", null, "Perumahan CodeIn: rumah warga, lewat Gerbang Selatan."));
    isi.push(ul);
    Panel.buka("Kak Nara · Pemandu Kota", isi, [
      ...ANTAR.map(([teks, pintu], i) => ({teks, utama: i === 0, aksi: () => Kota.keTempat("kota", pintu)})),
      {teks: "Tutup"}]);
  }
  function sapa(w) {
    if (w.def.peran === "pemandu") { pemandu(); return; }
    if (w.def.peran === "resepsionis") { resepsionis(w); return; }
    if (w.def.peran === "satpam") { Perumahan.satpam(); return; }
    if (w.def.peran === "kasir") { Toko.kasir(); return; }
    if (w.def.redaksi) { Redaksi.buka(w.def.redaksi); return; }
    if (w.def.buka) { Papan.tangani({id: w.def.buka, tujuan: ""}); return; }
    const j = jadwalKini(w), daftarUcapan = ((j && j.ucapan) || []).map(isiUcapan).filter(Boolean);
    if (w.def.beli) { Ekonomi.pedagang(w.def, daftarUcapan[w.giliran++ % (daftarUcapan.length || 1)]); return; }      // pedagang yang membeli hasil tangkapan
    if (!daftarUcapan.length) return;
    if (w.hapusBalon) w.hapusBalon();
    w.hapusBalon = Kota.balon(w.s, daftarUcapan[w.giliran++ % daftarUcapan.length]);
  }

  return {
    // warga terlihat terdekat dari titik (x, y), dalam jarak sapa
    terdekat: (x, y) => daftar.find(w => !w.diRumah && Phaser.Math.Distance.Between(w.s.x, w.s.y, x, y) < JARAK_SAPA) || null,
    sapa, aturTamu,
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

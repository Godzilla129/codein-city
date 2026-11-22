/* CodeIn City · adegan (Phaser 3). Satu adegan dipakai untuk semua peta: kota, Perumahan CodeIn, interior Markas, Galeri,
   Kantor Redaksi, dan rumah warga (satu peta "rumah" untuk semua rumah; pemiliknya diatur js/perumahan.js).
   Peta dibaca dari assets/maps/<nama>.tmj (dibuat dan diubah dengan Tiled):
     layer ubin  : tanah, jalan, bangunan, hiasan (di bawah karakter), atas (di atas karakter),
                   tabrakan (tidak digambar; setiap ubin di layer ini tidak bisa dilewati)
     layer objek : benda (gambar dari atlas assets/sprites/gedung.png: gedung ikonik dan pohon hutan; titik = pojok kiri bawah,
                   diurutkan menurut tepi bawahnya; properti bingkai/laju = gambar berganti, misalnya bendera berkibar),
                   pintu (kotak interaksi; properti id, aksi, tujuan, ke, penghuni, label_x, label_y, tanpa_label),
                   titik (mulai, lampu, patung, pancuran), papan (kotak papan HTML; properti id, urutan, tiang),
                   rute (garis jalur kendaraan, dipakai lalulintas.js)
   aksi pintu: pindah = buka alamat web, masuk/keluar = ganti peta, panel = buka dialog (tujuan "sapa" = menyapa warga "penghuni").
   Warga dan jadwal hariannya diurus js/warga.js; Eko, Tekno, dan Rina di Kantor Redaksi diurus js/redaksi.js. Titik "patung" punya properti jenis (lihat KOTA.patung).
   Teks nama gedung, nama karakter, balon ucapan, dan isi papan digambar sebagai elemen HTML di atas kanvas supaya tajam. */

const Kota = (() => {
  const T = KOTA.ubin;
  const KOLOM = {kiri: 0, bawah: 1, atas: 2, kanan: 3};          // kolom arah di orang.png (susunan karakter Kenney)
  const ARAH = ["bawah", "kiri", "kanan", "atas"];               // nomor arah yang dikirim lewat jaringan
  const PETA = ["kota", "markas", "galeri", "redaksi", "perumahan", "rumah"];
  const LUAR = ["kota", "perumahan"];                            // peta di luar ruangan: ada langit malam dan lampu jalan
  // assets/sprites/orang.png (tools/gambar_orang.py): tiap karakter 4 kolom arah x 3 baris langkah, k = urutan karakter
  const frame = (k, arah, langkah) => (k * 3 + langkah) * 4 + KOLOM[arah];
  const tenang = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let adegan = null, pemain = null, profil = null, arah = "bawah", jalan = false, pernahJalan = false, pindah = false, ruang = "kota";
  let pintu = [], papan = [], dekat = null, tempel = [], lapisanMalam = null, cahaya = [], kunang = [], faseKini = null, balonSaya = null;
  const tekan = new Set();          // tombol keyboard yang sedang ditekan
  const saatSiapList = [], tiapBingkaiList = [];      // dipanggil berkas lain (lalulintas.js, ramai.js)

  /* ---------- waktu: siang dan malam mengikuti jam WIB ---------- */
  function jamWIB() {
    const paksa = new URLSearchParams(location.search).get("jam");       // ?jam=21 untuk mencoba suasana malam
    if (paksa !== null && paksa !== "" && Number.isFinite(+paksa)) return ((+paksa % 24) + 24) % 24;
    const d = new Date();
    return (d.getUTCHours() + 7 + d.getUTCMinutes() / 60) % 24;
  }
  // pagi, siang, sore, atau malam menurut KOTA.waktu (dipakai jadwal warga dan tulisan di bilah atas)
  function waktu() {
    const h = jamWIB(), urut = KOTA.waktu;
    let kini = urut[urut.length - 1];
    for (const w of urut) if (h >= w.mulai) kini = w;
    return h < urut[0].mulai ? urut[urut.length - 1] : kini;
  }
  // warna langit dan lampu (lebih halus dari pembagian waktu: ada fajar dan senja)
  function fase() {
    const h = jamWIB();
    if (h >= 18.5 || h < 5) return {nama: "Malam", warna: 0x4a55a0, alfa: .8, lampu: true};
    if (h >= 17) return {nama: "Senja", warna: 0xffab7d, alfa: .45, lampu: false};
    if (h < 6.5) return {nama: "Fajar", warna: 0xd9b8e8, alfa: .4, lampu: true};
    return {nama: "Siang", warna: 0xffffff, alfa: 0, lampu: false};
  }
  function terapkanWaktu() {
    const f = fase(), h = jamWIB(), jj = String(Math.floor(h)).padStart(2, "0"), mm = String(Math.floor(h % 1 * 60)).padStart(2, "0");
    $("jam").textContent = `${waktu().nama} · ${jj}.${mm} WIB`;
    document.body.dataset.fase = f.nama;          // dipakai CSS: baliho di luar sedikit meredup saat langit gelap
    if (!adegan || !lapisanMalam || (faseKini && faseKini.nama === f.nama)) return;
    faseKini = f;
    lapisanMalam.setFillStyle(f.warna, f.alfa);
    cahaya.forEach(c => c.setVisible(f.lampu));
    kunang.forEach(k => k.setVisible(f.nama === "Malam"));
  }

  /* ---------- teks HTML yang menempel pada titik di dunia ---------- */
  function tempelkan(elemen, ambilPosisi) { $("label").append(elemen); const t = {elemen, ambilPosisi}; tempel.push(t); return t; }
  function lepaskan(t) { t.elemen.remove(); tempel = tempel.filter(x => x !== t); }
  function perbaruiTempel() {
    const cam = adegan.cameras.main, v = cam.worldView, z = cam.zoom;
    for (const t of tempel) {
      const [wx, wy] = t.ambilPosisi();
      t.elemen.style.transform = `translate(${Math.round((wx - v.x) * z)}px, ${Math.round((wy - v.y) * z)}px) translate(-50%, -100%)`;
    }
  }
  // balon ucapan di atas sebuah sprite; hilang sendiri. Mengembalikan fungsi untuk menghapusnya lebih awal.
  function balon(sprite, teks, lama = 5200) {
    const b = el("div", "balon", teks), t = tempelkan(b, () => [sprite.x, sprite.y - 24]);
    const waktu = setTimeout(() => lepaskan(t), lama);
    return () => { clearTimeout(waktu); lepaskan(t); };
  }

  // Patung dibuat dari gambar karakter: tiap piksel diganti warna bahan (perunggu atau batu) sesuai terangnya.
  const BAHAN = {perunggu: [[58, 40, 24], [112, 80, 42], [166, 124, 66], [214, 176, 108]],
                 batu: [[64, 62, 70], [112, 110, 118], [162, 160, 166], [214, 212, 216]]};
  function teksturPatung(sc, jenis) {
    const kunci = "patung-" + jenis, cfg = KOTA.patung[jenis] || KOTA.patung.pemula;
    if (sc.textures.exists(kunci)) return kunci;
    const f = frame(cfg.karakter, "bawah", 0);
    const kanvas = sc.textures.createCanvas(kunci, T, T), c = kanvas.getContext();
    c.drawImage(sc.textures.get("orang").getSourceImage(), (f % 4) * T, Math.floor(f / 4) * T, T, T, 0, 0, T, T);
    const d = c.getImageData(0, 0, T, T), tangga = BAHAN[cfg.bahan] || BAHAN.perunggu;
    for (let i = 0; i < d.data.length; i += 4) {
      if (!d.data[i + 3]) continue;
      const terang = (d.data[i] * .3 + d.data[i + 1] * .59 + d.data[i + 2] * .11) / 255, w = tangga[Math.min(3, Math.floor(terang * 4))];
      d.data[i] = w[0]; d.data[i + 1] = w[1]; d.data[i + 2] = w[2];
    }
    c.putImageData(d, 0, 0); kanvas.refresh();
    return kunci;
  }

  // huruf LED 3 x 5 untuk ticker CodeIn News (setiap huruf 15 bit, baris demi baris dari atas)
  const HURUF_LED = {A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
    F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010", K: "101101110101101",
    L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100", Q: "010101101110011",
    R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010", W: "101101111111101",
    X: "101101010101101", Y: "101101010010010", Z: "111001010100111", "0": "111101101101111", "1": "010110010010111",
    "2": "110001010100111", "3": "110001010001110", "4": "101101111001001", "5": "111100110001110", "6": "011100111101111",
    "7": "111001010010010", "8": "111101111101111", "9": "111101111001110", ",": "000000000010100", ".": "000000000000010",
    "!": "010010010000010", "-": "000000111000000", ":": "000010000010000", "*": "000000010000000", " ": "000000000000000"};
  // tulis teks berulang ke tekstur kanvas (supaya bisa berjalan tanpa putus); mengembalikan lebar satu putaran
  function tulisLED(sc, kunci, teks) {
    const lebar = teks.length * 4;
    if (!sc.textures.exists(kunci)) {
      const kanvas = sc.textures.createCanvas(kunci, lebar + 220, 7), c = kanvas.getContext();
      for (let ulang = 0; ulang * lebar < lebar + 220; ulang++) [...teks].forEach((h, i) => {
        const bit = HURUF_LED[h] || HURUF_LED[" "];
        c.fillStyle = h === "*" ? "#4fc3f7" : "#fcaf5f";
        for (let b = 0; b < 15; b++) if (bit[b] === "1") c.fillRect(ulang * lebar + i * 4 + (b % 3), 1 + Math.floor(b / 3), 1, 1);
      });
      kanvas.refresh();
    }
    return lebar;
  }

  class Adegan extends Phaser.Scene {
    constructor() { super("kota"); }
    init(d) { this.kunciPeta = d && PETA.includes(d.peta) ? d.peta : "kota"; this.dariPintu = (d && d.pintu) || null; }

    preload() {
      for (const n of PETA) if (!this.cache.tilemap.exists(n)) this.load.tilemapTiledJSON(n, `assets/maps/${n}.tmj`);
      if (!this.textures.exists("ubin")) {
        this.load.image("ubin", "assets/tiles/urban.png");
        this.load.spritesheet("orang", "assets/sprites/orang.png", {frameWidth: T, frameHeight: T});
        this.load.image("ruang", "assets/tiles/ruang.png");
        this.load.atlas("benda", "assets/sprites/gedung.png", "assets/sprites/gedung.json");
      }
    }

    create() {
      // sisa peta sebelumnya (label HTML, papan, tombol aksi) dibuang dulu
      tempel.forEach(t => t.elemen.remove()); tempel = []; Papan.bersih();
      dekat = null; $("aksi").hidden = true; lapisanMalam = null; cahaya = []; kunang = []; faseKini = null; balonSaya = null;
      adegan = this; ruang = this.kunciPeta; pindah = false;
      const dalam = !LUAR.includes(ruang);
      document.body.dataset.ruang = ruang;

      const peta = this.make.tilemap({key: ruang});
      const ubin = [peta.addTilesetImage("urban", "ubin", T, T, 1, 2), peta.addTilesetImage("ruang", "ruang", T, T, 1, 2)];
      ["tanah", "jalan", "bangunan", "hiasan"].forEach((n, i) => peta.createLayer(n, ubin).setDepth(i));
      peta.createLayer("atas", ubin).setDepth(5000);
      const tabrakan = peta.createLayer("tabrakan", ubin).setVisible(false);
      tabrakan.setCollisionByExclusion([-1]);
      const lebar = peta.widthInPixels, tinggi = peta.heightInPixels;
      this.physics.world.setBounds(0, 0, lebar, tinggi);

      // objek dari peta
      const prop = o => Object.fromEntries((o.properties || []).map(p => [p.name, p.value]));
      const lapis = n => { const l = peta.getObjectLayer(n); return l ? l.objects : []; };
      pintu = lapis("pintu").map(o => {
        const p = prop(o);
        return {id: p.id, nama: o.name, aksi: p.aksi, tujuan: p.tujuan || "", ke: p.ke || "", penghuni: p.penghuni || "",
                kavling: p.kavling || "", kiri: p.kiri || 0, bawah: p.bawah || 0,
                x: o.x, y: o.y, w: o.width, h: o.height,
                lx: p.label_x ?? o.x + o.width / 2, ly: p.label_y ?? o.y - T, tanpaLabel: !!p.tanpa_label};
      });
      papan = lapis("papan").map(o => {
        const p = prop(o);
        return {jenis: o.name, id: p.id || "", urutan: p.urutan || 0, x: o.x, y: o.y, w: o.width, h: o.height, tiang: p.tiang || 0};
      });
      const titik = lapis("titik");
      // benda: gedung ikonik dan pohon. Kedalaman = tepi bawahnya, sama dengan orang, jadi orang bisa lewat di belakangnya.
      for (const o of lapis("benda")) {
        const p = prop(o), g = this.add.image(o.x, o.y, "benda", o.name).setOrigin(0, 1).setDepth(p.datar ? 4 : 10 + o.y + (p.geser || 0));
        if (p.bingkai > 1 && !tenang) {             // gambar bergantian: nama-0, nama-1, ...
          const dasar = o.name.replace(/-\d+$/, "");
          let i = 0;
          this.time.addEvent({delay: p.laju || 400, loop: true, callback: () => { i = (i + 1) % p.bingkai; g.setFrame(`${dasar}-${i}`); }});
        }
      }
      // papan ticker CodeIn News: tulisan LED berjalan yang mengajak masuk (di atas lapisan malam, jadi tetap menyala saat gelap)
      for (const o of titik.filter(o => o.name === "ticker")) {
        const p = prop(o), sapa = {pagi: "SELAMAT PAGI", siang: "SELAMAT SIANG", sore: "SELAMAT SORE", malam: "SELAMAT MALAM"}[waktu().kunci];
        const teks = `${sapa}, WARGA CODEIN CITY! * MAMPIR KE REDAKSI CODEIN NEWS * SAPA EKO, TEKNO, DAN RINA DI MEJANYA * ` +
                     "KABAR EKONOMI, TEKNOLOGI, DAN UMUM TIAP HARI * MASUK LEWAT PINTU KACA DI BAWAH INI * ";
        const kunci = "ticker-" + sapa, w = tulisLED(this, kunci, teks), img = this.add.image(o.x, o.y, kunci).setOrigin(0, 0).setDepth(7004);
        let geser = 0;
        const geserkan = () => { img.setCrop(geser, 0, p.lebar, p.tinggi).setX(o.x - geser); };
        geserkan();
        if (!tenang) this.time.addEvent({delay: 70, loop: true, callback: () => { geser = (geser + 1) % w; geserkan(); }});
      }
      const mulai = titik.find(o => o.name === "mulai") || {x: lebar / 2, y: tinggi / 2};

      // animasi jalan semua karakter (dipakai pemain, warga, dan pengunjung lain)
      for (let k = 0; k < KOTA.lembarOrang; k++) Object.keys(KOLOM).forEach(a => {
        if (!this.anims.exists(`jalan-${k}-${a}`)) this.anims.create({key: `jalan-${k}-${a}`, frameRate: 8, repeat: -1,
          frames: [1, 0, 2, 0].map(l => ({key: "orang", frame: frame(k, a, l)}))});
      });

      // pemain: muncul di depan pintu yang baru dilewati, di posisi terakhir (sepulang dari CodeIn News), atau di titik mulai
      const asal = this.dariPintu && pintu.find(p => p.id === this.dariPintu);
      let pos = asal ? {x: asal.x + asal.w / 2, y: asal.y + asal.h / 2} : (!dalam && Profil.muatPosisi()) || mulai;
      if (pos.x < 0 || pos.y < 0 || pos.x > lebar || pos.y > tinggi || tabrakan.getTileAtWorldXY(pos.x, pos.y)) pos = mulai;
      arah = dalam ? "atas" : "bawah";
      pemain = this.physics.add.sprite(pos.x, pos.y, "orang", frame(0, arah, 0)).setOrigin(.5, .8);
      pemain.body.setSize(8, 5).setOffset(4, 10);
      pemain.setCollideWorldBounds(true);
      this.physics.add.collider(pemain, tabrakan);
      // kotak tabrakan kecil di kaki benda (tiang lampu, batang pohon, kaki perabot, dinding gedung): atap dan puncaknya bisa dilewati di belakangnya
      const padat = this.physics.add.staticGroup();
      for (const o of lapis("padat")) padat.add(this.add.zone(o.x + o.width / 2, o.y + o.height / 2, o.width, o.height));
      this.physics.add.collider(pemain, padat);
      this.padat = padat;                  // js/perumahan.js menambah kotak tabrakan rumah warga setelah datanya datang
      const papanNama = el("div", "nama saya");
      tempelkan(papanNama, () => [pemain.x, pemain.y - 14]);
      this.papanNama = papanNama;

      // papan HTML (baliho, videotron, pengumuman, papan info). Di luar ruangan papan berdiri di atas dua tiang.
      for (const b of papan) {
        if (!dalam && b.tiang > 0) {
          const bawah = b.y + b.h + b.tiang, g = this.add.graphics().setDepth(10 + bawah - 2);
          const kayu = b.jenis === "pengumuman", gelap = kayu ? 0x5E3F22 : 0x3B2A20, terang = kayu ? 0x9A6B3C : 0x8A7361;
          for (const x of [b.x + 8, b.x + b.w - 12]) {
            g.fillStyle(gelap).fillRect(x, b.y + b.h - 2, 4, b.tiang).fillRect(x - 2, bawah - 3, 8, 3);
            g.fillStyle(terang).fillRect(x + 1, b.y + b.h - 2, 1, b.tiang - 2);
          }
        }
        tempelkan(Papan.buat(b), () => [b.x + b.w / 2, b.y + b.h]);
      }

      // papan nama gedung
      for (const p of pintu) {
        if (p.tanpaLabel) continue;
        const kunci = p.tujuan === "kunci";
        const d = el("div", "papan" + (kunci ? " kunci" : "") + (p.aksi === "pindah" || p.aksi === "masuk" ? " utama" : "")
          + (p.tujuan === "rumah" || p.tujuan === "kavling" ? " rumah" : "") + (p.tujuan === "proyek" ? " proyek" : ""), (kunci ? "🔒 " : "") + p.nama);
        p.labelEl = d;                       // rumah proyek mengganti tulisannya setelah data dari CodeIn News datang
        tempelkan(d, () => [p.lx, p.ly]);
      }

      // patung (Si Pemula di alun-alun, Patung Pendiri di Markas) dan pancuran air
      for (const tp of titik.filter(o => o.name === "patung")) {
        const kunci = teksturPatung(this, prop(tp).jenis || "pemula");
        this.add.image(tp.x, tp.y, kunci).setOrigin(.5, 1).setScale(2).setDepth(10 + tp.y);
      }
      titik.filter(o => o.name === "pancuran").forEach((o, i) => {
        const cincin = this.add.ellipse(o.x, o.y + 2, 9, 5).setStrokeStyle(1, 0xffffff, .7).setDepth(4);
        const tetes = this.add.rectangle(o.x, o.y, 2, 3, 0xffffff, .95).setDepth(10 + o.y);
        if (tenang) return;      // pengunjung yang meminta gerak dikurangi melihat pancuran diam
        this.tweens.add({targets: tetes, y: o.y - 9, alpha: .15, duration: 620, yoyo: true, repeat: -1, delay: i * 170, ease: "Sine.easeOut"});
        this.tweens.add({targets: cincin, scaleX: 1.7, scaleY: 1.7, alpha: 0, duration: 1240, repeat: -1, delay: i * 170});
      });

      // malam (hanya di luar ruangan): lapisan warna + cahaya lampu
      if (!dalam) {
        lapisanMalam = this.add.rectangle(lebar / 2, tinggi / 2, lebar, tinggi, 0xffffff, 0).setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(7000);
        if (!this.textures.exists("cahaya")) {
          const kanvas = this.textures.createCanvas("cahaya", 64, 64), c = kanvas.getContext();
          const g = c.createRadialGradient(32, 32, 2, 32, 32, 32);
          g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.45, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
          c.fillStyle = g; c.fillRect(0, 0, 64, 64); kanvas.refresh();
        }
        cahaya = titik.filter(o => o.name === "lampu").map(o =>
          this.add.image(o.x, o.y + 6, "cahaya").setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd27a).setAlpha(.55).setDepth(7001).setVisible(false));
        // kunang-kunang malam di sekitar pepohonan dalam kota
        if (!this.textures.exists("kunang")) {
          const kanvas = this.textures.createCanvas("kunang", 5, 5), c = kanvas.getContext();
          c.fillStyle = "rgba(255,236,150,.45)"; c.fillRect(1, 0, 3, 5); c.fillRect(0, 1, 5, 3);
          c.fillStyle = "#fff4b8"; c.fillRect(2, 1, 1, 3); c.fillRect(1, 2, 3, 1); kanvas.refresh();
        }
        const pohon = lapis("benda").filter(o => o.name.startsWith("pohon") && o.x > 4 * T && o.x < lebar - 5 * T && o.y > 6 * T && o.y < tinggi - 4 * T);
        for (let i = 0; i < 18 && pohon.length; i++) {
          const o = pohon.splice(Math.floor(Math.random() * pohon.length), 1)[0];
          const k = this.add.image(o.x + 4 + Math.random() * 12, o.y - 14 - Math.random() * 14, "kunang").setBlendMode(Phaser.BlendModes.ADD).setDepth(7003).setVisible(false);
          if (!tenang) {
            this.tweens.add({targets: k, alpha: .2, duration: 700 + Math.random() * 900, yoyo: true, repeat: -1, delay: Math.random() * 1000});
            this.tweens.add({targets: k, x: k.x + 10 - Math.random() * 20, y: k.y - 4 - Math.random() * 8, duration: 2600 + Math.random() * 2400, yoyo: true, repeat: -1, ease: "Sine.easeInOut"});
          }
          kunang.push(k);
        }
      }
      terapkanWaktu();
      this.time.addEvent({delay: 20000, loop: true, callback: terapkanWaktu});

      // kamera: mengikuti pemain. Kalau peta lebih kecil dari layar pada satu sumbu (ruangan), peta ditaruh di tengah sumbu itu.
      const cam = this.cameras.main;
      cam.setRoundPixels(true);
      const aturKamera = () => {
        const z = Phaser.Math.Clamp(Math.floor(Math.min(this.scale.width / 352, this.scale.height / 208)), 2, 4);
        cam.setZoom(z);
        $("label").style.setProperty("--z", z);       // ukuran papan HTML mengikuti zoom kamera
        const lv = this.scale.width / z, tv = this.scale.height / z;
        cam.setBounds(Math.min(0, (lebar - lv) / 2), Math.min(0, (tinggi - tv) / 2), Math.max(lebar, lv), Math.max(tinggi, tv));
        cam.startFollow(pemain, true);
      };
      aturKamera();
      this.scale.on("resize", aturKamera);
      this.events.once("shutdown", () => this.scale.off("resize", aturKamera));
      cam.fadeIn(dalam || this.dariPintu ? 260 : 500, 20, 24, 48);

      if (profil) pakaiProfil();
      if (!this.terpasang) { this.events.on("postupdate", perbaruiTempel); this.terpasang = true; }
      saatSiapList.forEach(f => f({adegan: this, ruang, peta}));
    }

    update(_, dt) {
      // gerak pemain
      let vx = 0, vy = 0;
      if (profil && !pindah && !Panel.terbuka()) {
        const j = Kendali.arah(), ada = k => tekan.has(k) ? 1 : 0;
        vx = (ada("KeyD") || ada("ArrowRight")) - (ada("KeyA") || ada("ArrowLeft")) || j.x;
        vy = (ada("KeyS") || ada("ArrowDown")) - (ada("KeyW") || ada("ArrowUp")) || j.y;
      }
      const d = Math.hypot(vx, vy);
      if (d > 1) { vx /= d; vy /= d; }
      pemain.setVelocity(vx * KOTA.kecepatan, vy * KOTA.kecepatan);
      const k = profil ? profil.karakter : 0;
      jalan = d > .15;
      if (jalan) {
        arah = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? "kiri" : "kanan") : (vy < 0 ? "atas" : "bawah");
        pemain.anims.play(`jalan-${k}-${arah}`, true);
        if (!pernahJalan) { pernahJalan = true; $("petunjuk").hidden = true; }
      } else { pemain.anims.stop(); pemain.setFrame(frame(k, arah, 0)); }
      pemain.setDepth(10 + pemain.y);

      cariTerdekat();
      for (const f of tiapBingkaiList) f(dt);
    }
  }

  /* ---------- interaksi: pintu atau warga terdekat ---------- */
  function teksAksi(p) {
    if (p.aksi === "pindah" && /^Baca /.test(p.nama)) return p.nama;          // terminal di Kantor Redaksi
    if (p.aksi === "pindah" || p.aksi === "masuk") return `Masuk ${p.nama}`;
    if (p.aksi === "keluar") return "Keluar ke kota";
    if (p.id === "pendiri") return "Baca plakat patung";
    return {kunci: "Periksa gedung", baliho: ruang === "galeri" ? "Lihat karya" : "Baca baliho", videotron: "Lihat kabar ramai",
            rumah: "Ketuk pintu", info: "Baca papan", sapa: `Sapa ${p.penghuni}`, redaksi: `Sapa ${p.penghuni}`,
            proyek: p.proyek ? `Kunjungi ${p.proyek.judul}` : "Lihat rumah kosong", kavling: Perumahan.teksAksi(p)}[p.tujuan] || (p.id === "papan" ? "Baca pengumuman" : `Lihat ${p.nama}`);
  }
  function cariTerdekat() {
    let baru = null;
    if (profil && !pindah) {
      const fx = pemain.x, fy = pemain.body.bottom - 2;
      const p = pintu.find(p => fx >= p.x && fx <= p.x + p.w && fy >= p.y - 2 && fy <= p.y + p.h + 2);
      if (p) baru = {kunci: "p:" + p.id, pintu: p, teks: teksAksi(p)};
      else {
        const w = Warga.terdekat(pemain.x, pemain.y);
        if (w) baru = {kunci: "w:" + w.def.nama, warga: w, teks: `Sapa ${w.def.nama}`};
        else if (ruang === "redaksi") {
          const a = Redaksi.terdekat(pemain.x, pemain.y);
          if (a) baru = {kunci: "r:" + a.def.nama, redaksi: a.def.nama, teks: `Sapa ${a.def.nama}`};
        }
      }
    }
    if ((baru && baru.kunci) === (dekat && dekat.kunci)) return;
    dekat = baru;
    const b = $("aksi"); b.hidden = !dekat;
    if (dekat) { b.textContent = dekat.teks; b.append(el("kbd", null, "E")); }
  }
  function aksi() {
    if (!dekat || pindah || Panel.terbuka()) return false;
    if (dekat.warga) Warga.sapa(dekat.warga); else if (dekat.redaksi) Redaksi.buka(dekat.redaksi); else lewat(dekat.pintu);
    return true;
  }
  // Ganti peta seketika; peta baru muncul dengan fade-in dari gelap. Tidak menunggu animasi fade-out selesai,
  // supaya perpindahan tidak tertahan di browser yang jarang menggambar ulang (tab latar, mode hemat daya).
  function gantiPeta(kunci, pintuId) {
    if (pindah) return;
    pindah = true; Kendali.lepas(); tekan.clear();
    adegan.scene.restart({peta: kunci, pintu: pintuId});
  }
  // rumah diketuk: penghuninya di dalam (malam) atau sedang di luar (sebut tempatnya sekarang)
  function rumah(p) {
    const nama = KOTA.warga.filter(w => p.penghuni.includes(w.nama)).map(w => w.nama), isi = [el("p", null, "Tok, tok.")];
    const posisi = nama.map(n => [n, Warga.dimana(n)]).filter(([, d]) => d);
    if (posisi.length && posisi.every(([, d]) => d.diRumah)) {
      isi.push(el("p", null, `${p.penghuni} sudah di rumah, tapi sedang istirahat. Coba lagi besok pagi.`));
    } else {
      isi.push(el("p", null, "Tidak ada yang menjawab."));
      for (const [n, d] of posisi) {
        if (d.diRumah) isi.push(el("p", null, `${n} sudah tidur.`));
        else if (d.pulang) isi.push(el("p", null, `${n} sedang dalam perjalanan pulang.`));
        else isi.push(el("p", null, `${n} sedang di luar${d.ket ? ", " + d.ket : ""}.`));
      }
    }
    Panel.buka(p.nama, isi, [{teks: "Tutup"}]);
  }
  function toko(p) {
    const d = Warga.dimana("Mbak Tika"), isi = [el("p", null, "Toko ini belum bisa dimasuki. Isinya masih disiapkan.")];
    if (d) isi.push(el("p", null, d.diRumah ? "Mbak Tika sudah pulang. Tokonya buka lagi besok pagi." : `Mbak Tika sedang ${d.ket}.`));
    Panel.buka(p.nama, isi, [{teks: "Tutup"}]);
  }
  function lewat(p) {
    if (p.aksi === "masuk" || p.aksi === "keluar") {
      // posisi di kota disimpan supaya kalau halaman dimuat ulang di dalam gedung, pengunjung muncul di depan gedung itu
      if (ruang === "kota") Profil.simpanPosisi(p.x + p.w / 2, p.y + p.h / 2);
      gantiPeta(p.tujuan, p.aksi === "keluar" ? p.ke : null); return;
    }
    if (p.aksi !== "pindah") {
      if (Papan.tangani(p)) return;
      if (p.tujuan === "rumah") rumah(p);
      else if (p.tujuan === "sapa") Warga.sapaNama(p.penghuni);
      else if (p.id === "toko") toko(p);
      else if (p.tujuan === "proyek") RumahProyek.buka(p);
      else if (p.tujuan === "kavling") Perumahan.buka(p);
      else if (p.tujuan === "redaksi") Redaksi.buka(p.penghuni);
      else Panel.gedung(KOTA.panel[p.id] ? p.id : p.tujuan, p.nama);
      return;
    }
    pergi(p.tujuan, p.x + p.w / 2, p.y + p.h / 2);
  }
  // Pindah ke halaman lain (CodeIn News). Di kota, posisi disimpan supaya saat kembali pengunjung muncul di tempat yang sama;
  // dari dalam gedung, posisi yang disimpan tetap posisi di depan gedung itu.
  function pergi(alamat, x, y) {
    if (pindah) return;
    pindah = true; Kendali.lepas(); tekan.clear();
    if (ruang === "kota") Profil.simpanPosisi(x, y);
    const u = new URL(alamat);
    u.searchParams.set("dari", "kota"); u.searchParams.set("k", profil.karakter); u.searchParams.set("n", profil.nama);
    const cam = adegan.cameras.main;
    let berangkatSudah = false;
    const berangkat = () => { if (!berangkatSudah) { berangkatSudah = true; location.href = u.href; } };
    cam.once("camerafadeoutcomplete", berangkat);
    setTimeout(berangkat, 600);        // cadangan kalau animasi tertahan
    cam.fadeOut(420, 20, 24, 48);
  }
  // kembali lewat tombol Back: halaman dari cache browser dinyalakan lagi
  addEventListener("pageshow", e => { if (e.persisted && adegan) { pindah = false; adegan.cameras.main.fadeIn(300, 20, 24, 48); } });
  addEventListener("pagehide", () => { if (pemain && profil && !pindah && ruang === "kota") Profil.simpanPosisi(pemain.x, pemain.y); });

  /* ---------- keyboard ---------- */
  // mengetik = fokus di kolom isian. Tombol dan tautan yang sedang fokus tetap boleh memakai Enter dan spasi sendiri,
  // tetapi E selalu untuk aksi (sebelumnya E tidak bekerja kalau fokus tertinggal di tombol Tempat setelah berpindah).
  const mengetik = e => e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  const diTombol = e => e.target instanceof HTMLElement && /^(BUTTON|A)$/.test(e.target.tagName);
  addEventListener("keydown", e => {
    if (Panel.terbuka() || e.ctrlKey || e.metaKey || e.altKey || mengetik(e)) return;
    if (e.code === "KeyE" || ((e.code === "Space" || e.code === "Enter") && !diTombol(e))) {
      // Enter membuka kolom obrolan selama obrolan tersambung (juga di depan pintu, karena orang berkumpul di sana).
      // Kalau obrolan tidak tersambung, Enter menjalankan aksi; tanpa aksi di dekat pemain, muncul kabar singkat.
      if (e.repeat) { e.preventDefault(); return; }
      if (e.code === "Enter" && typeof Ramai !== "undefined" && Ramai.tersambung()) Ramai.fokus();
      else if (!aksi() && e.code === "Enter" && typeof Ramai !== "undefined") kabar(Ramai.alasan());
      e.preventDefault(); return;
    }
    if (e.code === "KeyT" && typeof Ramai !== "undefined" && Ramai.tersambung()) { Ramai.fokus(); e.preventDefault(); return; }
    tekan.add(e.code);
    if (e.code.startsWith("Arrow")) e.preventDefault();
  });
  addEventListener("keyup", e => tekan.delete(e.code));
  addEventListener("blur", () => tekan.clear());
  $("aksi").onclick = () => { aksi(); $("aksi").blur(); };

  /* ---------- ketuk atau klik papan: isinya bisa dibaca tanpa berjalan mendekat ----------
     Label kuning pintu (masuk gedung, buka CodeIn News) juga bisa diketuk langsung, karena bentuknya memang seperti tombol. */
  let tekanAwal = null;
  $("game").addEventListener("pointerdown", e => { tekanAwal = {x: e.clientX, y: e.clientY, t: e.timeStamp}; });
  $("game").addEventListener("pointerup", e => {
    const a = tekanAwal; tekanAwal = null;
    if (!a || !adegan || !profil || pindah || Panel.terbuka()) return;
    if (Math.hypot(e.clientX - a.x, e.clientY - a.y) > 10 || e.timeStamp - a.t > 500) return;     // geseran = joystick, bukan ketukan
    const kotak = $("game").getBoundingClientRect(), t = adegan.cameras.main.getWorldPoint(e.clientX - kotak.left, e.clientY - kotak.top);
    const b = papan.find(b => t.x >= b.x && t.x <= b.x + b.w && t.y >= b.y && t.y <= b.y + b.h);
    if (b) { Kendali.lepas(); Papan.buka(b); return; }
    const kena = r => e.clientX >= r.left - 4 && e.clientX <= r.right + 4 && e.clientY >= r.top - 4 && e.clientY <= r.bottom + 4;
    const p = pintu.find(p => (p.aksi === "pindah" || p.aksi === "masuk") && p.labelEl && !p.labelEl.hidden && kena(p.labelEl.getBoundingClientRect()));
    if (p) { Kendali.lepas(); lewat(p); }
  });

  /* ---------- dipakai berkas lain ---------- */
  function pakaiProfil() {
    pemain.setFrame(frame(profil.karakter, arah, 0));
    adegan.papanNama.textContent = profil.nama;
  }
  function mulai(p) { profil = p; if (adegan) pakaiProfil(); }
  // Pindah seketika ke depan sebuah pintu (tombol "Ke sana"). Posisi, kamera, label, dan tombol aksi diperbarui saat itu juga;
  // fade-in hanya hiasan dan tidak ditunggu.
  function pindahKe(id) {
    const p = pintu.find(x => x.id === id);
    if (!p || !pemain || pindah) return;
    const x = p.x + p.w / 2, y = p.y + p.h / 2;
    tekan.clear(); Kendali.lepas();
    pemain.body.reset(x, y);
    arah = "atas"; pemain.anims.stop(); pemain.setFrame(frame(profil ? profil.karakter : 0, arah, 0)); pemain.setDepth(10 + y);
    const cam = adegan.cameras.main;
    cam.centerOn(x, y); cam.preRender();
    perbaruiTempel(); cariTerdekat();
    cam.fadeIn(220, 20, 24, 48);
  }
  // kabar singkat di tengah atas layar (misalnya "obrolan belum tersambung")
  let waktuKabar = 0;
  function kabar(teks) {
    if (!teks) return;
    const k = $("kabar-kota"); k.textContent = teks; k.hidden = false;
    clearTimeout(waktuKabar); waktuKabar = setTimeout(() => { k.hidden = true; }, 3200);
  }
  function masuk(id) { const p = pintu.find(x => x.id === id); if (p) lewat(p); }
  // tulisan tombol aksi dihitung ulang (misalnya kavling kosong yang baru saja jadi rumah)
  function segarkanAksi() { dekat = null; cariTerdekat(); }
  // pindah ke peta lain dan muncul di depan pintu pintuId (dipakai "Pulang ke rumahku")
  function keTempat(peta, pintuId) {
    if (!adegan || !PETA.includes(peta)) return;
    Panel.tutup();
    if (peta === ruang && pintuId) { pindahKe(pintuId); return; }
    if (ruang === "kota" && pemain) Profil.simpanPosisi(pemain.x, pemain.y);
    gantiPeta(peta, pintuId);
  }
  // kotak tabrakan tambahan (piksel dunia) di peta yang sedang tampil; mengembalikan zonanya supaya bisa dibuang lagi
  function padatkan(x, y, w, h) {
    if (!adegan || !adegan.padat) return null;
    const z = adegan.add.zone(x + w / 2, y + h / 2, w, h);
    adegan.padat.add(z);
    return z;
  }
  // Semua pendaftaran lewat Kak Rani: dari mana pun, pemain diantar ke depan meja resepsionis Markas
  function keResepsionis() {
    Panel.tutup();
    if (ruang === "markas") pindahKe("resepsionis"); else gantiPeta("markas", "resepsionis");
  }
  // buka halaman CodeIn News (jalur = "/", "/buku/12", ...) dengan sapaan dari kota
  function bukaNews(jalur) { if (pemain) pergi(KOTA.news.replace(/\/+$/, "") + (jalur || "/"), pemain.x, pemain.y); }
  function ucap(teks) { if (!pemain) return; if (balonSaya) balonSaya(); balonSaya = balon(pemain, teks, 6000); }

  function nyalakan() {
    return new Phaser.Game({
      type: Phaser.AUTO, parent: "game", backgroundColor: "#141830", pixelArt: true, roundPixels: true, banner: false,
      scale: {mode: Phaser.Scale.RESIZE}, audio: {noAudio: true}, input: {keyboard: false},
      // fixedStep false: fisika maju sekali tiap bingkai layar dengan selang waktu sebenarnya. Dengan langkah tetap 60 Hz,
      // layar HP 90/120 Hz menggerakkan pemain hanya di sebagian bingkai, sehingga jalannya terlihat bergetar.
      physics: {default: "arcade", arcade: {fixedStep: false}}, scene: [Adegan],
    });
  }

  return {
    nyalakan, mulai, pindahKe, masuk, keTempat, padatkan, segarkanAksi, keResepsionis, bukaNews, ucap, balon, tempelkan, lepaskan, frame, ARAH, waktu, kabar,
    pintu: () => pintu, ruang: () => ruang, profil: () => profil, adegan: () => adegan, luar: () => LUAR.includes(ruang),
    // nama ruangan untuk layanan obrolan: tiap rumah warga punya ruangannya sendiri (rumah-A07), jadi tamu di rumah yang sama saling terlihat
    kamar: () => ruang === "rumah" && Perumahan.kini() ? "rumah-" + Perumahan.kini() : ruang,
    posisi: () => pemain ? {x: pemain.x, y: pemain.y, arah, jalan} : null,
    orang: () => pemain ? [pemain, ...Warga.sprites()] : [],                // semua yang perlu dihindari kendaraan
    saatSiap: f => saatSiapList.push(f), tiapBingkai: f => tiapBingkaiList.push(f),
  };
})();

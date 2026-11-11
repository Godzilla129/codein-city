/* CodeIn City · adegan (Phaser 3). Satu adegan dipakai untuk semua peta: kota, dan interior Markas serta Galeri.
   Peta dibaca dari assets/maps/<nama>.tmj (dibuat dan diubah dengan Tiled):
     layer ubin  : tanah, jalan, bangunan, hiasan (di bawah karakter), atas (di atas karakter),
                   tabrakan (tidak digambar; setiap ubin di layer ini tidak bisa dilewati)
     layer objek : pintu (kotak interaksi; properti id, aksi, tujuan, ke, penghuni, label_x, label_y, tanpa_label),
                   titik (mulai, lampu, patung, pancuran), papan (kotak papan HTML; properti id, urutan, tiang),
                   rute (garis jalur kendaraan, dipakai lalulintas.js)
   aksi pintu: pindah = buka alamat web, masuk/keluar = ganti peta, panel = buka dialog.
   Teks nama gedung, nama karakter, balon ucapan, dan isi papan digambar sebagai elemen HTML di atas kanvas supaya tajam. */

const Kota = (() => {
  const T = KOTA.ubin;
  const KOLOM = {kiri: 23, bawah: 24, atas: 25, kanan: 26};      // kolom arah di urban.png
  const ARAH = ["bawah", "kiri", "kanan", "atas"];               // nomor arah yang dikirim lewat jaringan
  const PETA = ["kota", "markas", "galeri"];
  const frame = (k, arah, langkah) => (KOTA.karakter[k].baris + langkah) * 27 + KOLOM[arah];
  const JARAK_SAPA = 22;
  const tenang = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let adegan = null, pemain = null, profil = null, arah = "bawah", jalan = false, pernahJalan = false, pindah = false, ruang = "kota";
  let pintu = [], papan = [], warga = [], dekat = null, tempel = [], lapisanMalam = null, cahaya = [], faseKini = null, balonSaya = null;
  const tekan = new Set();          // tombol keyboard yang sedang ditekan
  const saatSiapList = [], tiapBingkaiList = [];      // dipanggil berkas lain (lalulintas.js, ramai.js)

  /* ---------- waktu: siang dan malam mengikuti jam WIB ---------- */
  function jamWIB() {
    const paksa = new URLSearchParams(location.search).get("jam");       // ?jam=21 untuk mencoba suasana malam
    if (paksa !== null && paksa !== "" && Number.isFinite(+paksa)) return ((+paksa % 24) + 24) % 24;
    const d = new Date();
    return (d.getUTCHours() + 7 + d.getUTCMinutes() / 60) % 24;
  }
  function fase() {
    const h = jamWIB();
    if (h >= 18.5 || h < 5) return {nama: "Malam", warna: 0x4a55a0, alfa: .8, lampu: true};
    if (h >= 17) return {nama: "Senja", warna: 0xffab7d, alfa: .45, lampu: false};
    if (h < 6.5) return {nama: "Fajar", warna: 0xd9b8e8, alfa: .4, lampu: true};
    return {nama: "Siang", warna: 0xffffff, alfa: 0, lampu: false};
  }
  function terapkanWaktu() {
    const f = fase(), h = jamWIB(), jj = String(Math.floor(h)).padStart(2, "0"), mm = String(Math.floor(h % 1 * 60)).padStart(2, "0");
    $("jam").textContent = `${f.nama} · ${jj}.${mm} WIB`;
    document.body.dataset.fase = f.nama;          // dipakai CSS: baliho di luar sedikit meredup saat malam
    if (!adegan || !lapisanMalam || (faseKini && faseKini.nama === f.nama)) return;
    faseKini = f;
    lapisanMalam.setFillStyle(f.warna, f.alfa);
    cahaya.forEach(c => c.setVisible(f.lampu));
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

  // Patung perunggu dibuat dari gambar karakter: tiap piksel diganti warna perunggu sesuai terangnya.
  function teksturPatung(sc) {
    if (sc.textures.exists("patung")) return;
    const k = KOTA.patung.karakter, f = frame(k, "bawah", 0), kol = f % 27, bar = Math.floor(f / 27);
    const kanvas = sc.textures.createCanvas("patung", T, T), c = kanvas.getContext();
    c.drawImage(sc.textures.get("ubin").getSourceImage(), 1 + kol * 18, 1 + bar * 18, T, T, 0, 0, T, T);
    const d = c.getImageData(0, 0, T, T), tangga = [[58, 40, 24], [112, 80, 42], [166, 124, 66], [214, 176, 108]];
    for (let i = 0; i < d.data.length; i += 4) {
      if (!d.data[i + 3]) continue;
      const terang = (d.data[i] * .3 + d.data[i + 1] * .59 + d.data[i + 2] * .11) / 255, w = tangga[Math.min(3, Math.floor(terang * 4))];
      d.data[i] = w[0]; d.data[i + 1] = w[1]; d.data[i + 2] = w[2];
    }
    c.putImageData(d, 0, 0); kanvas.refresh();
  }

  class Adegan extends Phaser.Scene {
    constructor() { super("kota"); }
    init(d) { this.kunciPeta = d && PETA.includes(d.peta) ? d.peta : "kota"; this.dariPintu = (d && d.pintu) || null; }

    preload() {
      for (const n of PETA) if (!this.cache.tilemap.exists(n)) this.load.tilemapTiledJSON(n, `assets/maps/${n}.tmj`);
      if (!this.textures.exists("ubin")) {
        this.load.image("ubin", "assets/tiles/urban.png");
        this.load.spritesheet("orang", "assets/tiles/urban.png", {frameWidth: T, frameHeight: T, margin: 1, spacing: 2});
      }
    }

    create() {
      // sisa peta sebelumnya (label HTML, papan, tombol aksi) dibuang dulu
      tempel.forEach(t => t.elemen.remove()); tempel = []; Papan.bersih();
      dekat = null; $("aksi").hidden = true; lapisanMalam = null; cahaya = []; faseKini = null; balonSaya = null;
      adegan = this; ruang = this.kunciPeta; pindah = false;
      const dalam = ruang !== "kota";
      document.body.dataset.ruang = ruang;

      const peta = this.make.tilemap({key: ruang});
      const ubin = peta.addTilesetImage("urban", "ubin", T, T, 1, 2);
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
                x: o.x, y: o.y, w: o.width, h: o.height,
                lx: p.label_x ?? o.x + o.width / 2, ly: p.label_y ?? o.y - T, tanpaLabel: !!p.tanpa_label};
      });
      papan = lapis("papan").map(o => {
        const p = prop(o);
        return {jenis: o.name, id: p.id || "", urutan: p.urutan || 0, x: o.x, y: o.y, w: o.width, h: o.height, tiang: p.tiang || 0};
      });
      const titik = lapis("titik");
      const mulai = titik.find(o => o.name === "mulai") || {x: lebar / 2, y: tinggi / 2};

      // animasi jalan semua karakter (dipakai pemain, warga, dan pengunjung lain)
      KOTA.karakter.forEach((_, k) => Object.keys(KOLOM).forEach(a => {
        if (!this.anims.exists(`jalan-${k}-${a}`)) this.anims.create({key: `jalan-${k}-${a}`, frameRate: 8, repeat: -1,
          frames: [1, 0, 2, 0].map(l => ({key: "orang", frame: frame(k, a, l)}))});
      }));

      // pemain: muncul di depan pintu yang baru dilewati, di posisi terakhir (sepulang dari CodeIn News), atau di titik mulai
      const asal = this.dariPintu && pintu.find(p => p.id === this.dariPintu);
      let pos = asal ? {x: asal.x + asal.w / 2, y: asal.y + asal.h / 2} : (!dalam && Profil.muatPosisi()) || mulai;
      if (pos.x < 0 || pos.y < 0 || pos.x > lebar || pos.y > tinggi || tabrakan.getTileAtWorldXY(pos.x, pos.y)) pos = mulai;
      arah = dalam ? "atas" : "bawah";
      pemain = this.physics.add.sprite(pos.x, pos.y, "orang", frame(0, arah, 0)).setOrigin(.5, .8);
      pemain.body.setSize(8, 5).setOffset(4, 10);
      pemain.setCollideWorldBounds(true);
      this.physics.add.collider(pemain, tabrakan);
      const papanNama = el("div", "nama saya");
      tempelkan(papanNama, () => [pemain.x, pemain.y - 14]);
      this.papanNama = papanNama;

      // warga di peta ini
      warga = KOTA.warga.filter(w => (w.ruang || "kota") === ruang).map(w => {
        const [x, y] = w.rute[0], s = this.add.sprite(x * T + 8, y * T + 12, "orang", frame(w.karakter, "bawah", 0)).setOrigin(.5, .8);
        tempelkan(el("div", "nama", w.nama), () => [s.x, s.y - 14]);
        return {...w, s, ke: 1 % w.rute.length, tunggu: 600, arah: "bawah", giliran: 0, hapusBalon: null};
      });

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
        const d = el("div", "papan" + (kunci ? " kunci" : "") + (p.aksi === "pindah" || p.aksi === "masuk" ? " utama" : "") + (p.tujuan === "rumah" ? " rumah" : ""),
          (kunci ? "🔒 " : "") + p.nama);
        tempelkan(d, () => [p.lx, p.ly]);
      }

      // patung dan pancuran air di alun-alun
      const tp = titik.find(o => o.name === "patung");
      if (tp) {
        teksturPatung(this);
        this.add.image(tp.x, tp.y, "patung").setOrigin(.5, 1).setScale(2).setDepth(10 + tp.y);
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

      gerakWarga(dt);
      cariTerdekat();
      for (const f of tiapBingkaiList) f(dt);
    }
  }

  /* ---------- warga: berjalan mengikuti rute, berhenti kalau pemain mendekat ---------- */
  function gerakWarga(dt) {
    for (const w of warga) {
      const s = w.s, jarak = Phaser.Math.Distance.Between(s.x, s.y, pemain.x, pemain.y);
      s.setDepth(10 + s.y);
      if (jarak < JARAK_SAPA && profil) {            // menghadap pemain
        const dx = pemain.x - s.x, dy = pemain.y - s.y;
        w.arah = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "kiri" : "kanan") : (dy < 0 ? "atas" : "bawah");
        s.anims.stop(); s.setFrame(frame(w.karakter, w.arah, 0)); continue;
      }
      if (w.rute.length < 2) { s.setFrame(frame(w.karakter, w.hadap || "bawah", 0)); continue; }      // warga yang berjaga di tempat
      if (w.tunggu > 0) { w.tunggu -= dt; s.anims.stop(); s.setFrame(frame(w.karakter, w.arah, 0)); continue; }
      const [tx, ty] = w.rute[w.ke], gx = tx * T + 8, gy = ty * T + 12, dx = gx - s.x, dy = gy - s.y, sisa = Math.hypot(dx, dy);
      const langkah = (w.laju || 26) * dt / 1000;
      if (sisa <= langkah) {
        s.setPosition(gx, gy); w.ke = (w.ke + 1) % w.rute.length; w.tunggu = 700 + Math.random() * 2200;
      } else {
        s.x += dx / sisa * langkah; s.y += dy / sisa * langkah;
        w.arah = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "kiri" : "kanan") : (dy < 0 ? "atas" : "bawah");
        s.anims.play(`jalan-${w.karakter}-${w.arah}`, true);
      }
    }
  }
  function bicara(w) {
    if (w.buka) { Papan.tangani({id: w.buka, tujuan: ""}); return; }      // warga penjaga: langsung membuka dialognya
    if (w.hapusBalon) w.hapusBalon();
    w.hapusBalon = balon(w.s, w.ucapan[w.giliran++ % w.ucapan.length]);
  }

  /* ---------- interaksi: pintu atau warga terdekat ---------- */
  function teksAksi(p) {
    if (p.aksi === "pindah" || p.aksi === "masuk") return `Masuk ${p.nama}`;
    if (p.aksi === "keluar") return "Keluar ke kota";
    return {kunci: "Periksa gedung", baliho: ruang === "galeri" ? "Lihat karya" : "Baca baliho", videotron: "Lihat kabar ramai",
            rumah: "Ketuk pintu", info: "Baca papan"}[p.tujuan] || (p.id === "papan" ? "Baca pengumuman" : `Lihat ${p.nama}`);
  }
  function cariTerdekat() {
    let baru = null;
    if (profil && !pindah) {
      const fx = pemain.x, fy = pemain.body.bottom - 2;
      const p = pintu.find(p => fx >= p.x && fx <= p.x + p.w && fy >= p.y - 2 && fy <= p.y + p.h + 2);
      if (p) baru = {kunci: "p:" + p.id, pintu: p, teks: teksAksi(p)};
      else {
        const w = warga.find(w => Phaser.Math.Distance.Between(w.s.x, w.s.y, pemain.x, pemain.y) < JARAK_SAPA);
        if (w) baru = {kunci: "w:" + w.nama, warga: w, teks: `Sapa ${w.nama}`};
      }
    }
    if ((baru && baru.kunci) === (dekat && dekat.kunci)) return;
    dekat = baru;
    const b = $("aksi"); b.hidden = !dekat;
    if (dekat) { b.textContent = dekat.teks; b.append(el("kbd", null, "E")); }
  }
  function aksi() {
    if (!dekat || pindah || Panel.terbuka()) return false;
    if (dekat.warga) bicara(dekat.warga); else lewat(dekat.pintu);
    return true;
  }
  function gantiPeta(kunci, pintuId) {
    if (pindah) return;
    pindah = true; Kendali.lepas(); tekan.clear();
    const cam = adegan.cameras.main;
    cam.once("camerafadeoutcomplete", () => adegan.scene.restart({peta: kunci, pintu: pintuId}));
    cam.fadeOut(240, 20, 24, 48);
  }
  function rumah(p) {
    const w = KOTA.warga.find(w => p.penghuni.includes(w.nama)), isi = [el("p", null, "Tok, tok. Tidak ada yang menjawab.")];
    isi.push(el("p", null, w && w.tempat ? `${p.penghuni} sedang di luar. Biasanya ada ${w.tempat}.` : `${p.penghuni} sedang di luar.`));
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
      if (p.tujuan === "rumah") rumah(p); else Panel.gedung(KOTA.panel[p.id] ? p.id : p.tujuan, p.nama);
      return;
    }
    // pindah halaman: posisi disimpan supaya saat kembali pengunjung muncul di depan gedung ini
    pindah = true; Kendali.lepas(); tekan.clear();
    Profil.simpanPosisi(p.x + p.w / 2, p.y + p.h / 2);
    const u = new URL(p.tujuan);
    u.searchParams.set("dari", "kota"); u.searchParams.set("k", profil.karakter); u.searchParams.set("n", profil.nama);
    const cam = adegan.cameras.main;
    cam.once("camerafadeoutcomplete", () => { location.href = u.href; });
    cam.fadeOut(420, 20, 24, 48);
  }
  // kembali lewat tombol Back: halaman dari cache browser dinyalakan lagi
  addEventListener("pageshow", e => { if (e.persisted && adegan) { pindah = false; adegan.cameras.main.fadeIn(300, 20, 24, 48); } });
  addEventListener("pagehide", () => { if (pemain && profil && !pindah && ruang === "kota") Profil.simpanPosisi(pemain.x, pemain.y); });

  /* ---------- keyboard ---------- */
  const sedangMengetik = e => e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target.tagName);
  addEventListener("keydown", e => {
    if (Panel.terbuka() || e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.code === "KeyE" || e.code === "Space" || e.code === "Enter") && !sedangMengetik(e)) {
      // Enter tanpa pintu atau warga di dekat pemain membuka kolom obrolan
      if (!e.repeat && !aksi() && e.code === "Enter" && typeof Ramai !== "undefined") Ramai.fokus();
      e.preventDefault(); return;
    }
    if (sedangMengetik(e) && e.target.tagName === "INPUT") return;
    if (e.code === "KeyT" && typeof Ramai !== "undefined") { Ramai.fokus(); e.preventDefault(); return; }
    tekan.add(e.code);
    if (e.code.startsWith("Arrow")) e.preventDefault();
  });
  addEventListener("keyup", e => tekan.delete(e.code));
  addEventListener("blur", () => tekan.clear());
  $("aksi").onclick = () => { aksi(); $("aksi").blur(); };

  /* ---------- ketuk atau klik papan: isinya bisa dibaca tanpa berjalan mendekat ---------- */
  let tekanAwal = null;
  $("game").addEventListener("pointerdown", e => { tekanAwal = {x: e.clientX, y: e.clientY, t: e.timeStamp}; });
  $("game").addEventListener("pointerup", e => {
    const a = tekanAwal; tekanAwal = null;
    if (!a || !adegan || !profil || pindah || Panel.terbuka()) return;
    if (Math.hypot(e.clientX - a.x, e.clientY - a.y) > 10 || e.timeStamp - a.t > 500) return;     // geseran = joystick, bukan ketukan
    const kotak = $("game").getBoundingClientRect(), t = adegan.cameras.main.getWorldPoint(e.clientX - kotak.left, e.clientY - kotak.top);
    const b = papan.find(b => t.x >= b.x && t.x <= b.x + b.w && t.y >= b.y && t.y <= b.y + b.h);
    if (b) { Kendali.lepas(); Papan.buka(b); }
  });

  /* ---------- dipakai berkas lain ---------- */
  function pakaiProfil() {
    pemain.setFrame(frame(profil.karakter, arah, 0));
    adegan.papanNama.textContent = profil.nama;
  }
  function mulai(p) { profil = p; if (adegan) pakaiProfil(); }
  function pindahKe(id) {
    const p = pintu.find(x => x.id === id);
    if (!p || !pemain) return;
    const cam = adegan.cameras.main;
    cam.once("camerafadeoutcomplete", () => { pemain.setPosition(p.x + p.w / 2, p.y + p.h / 2); arah = "atas"; cam.fadeIn(220, 20, 24, 48); });
    cam.fadeOut(180, 20, 24, 48);
  }
  function masuk(id) { const p = pintu.find(x => x.id === id); if (p) lewat(p); }
  function ucap(teks) { if (!pemain) return; if (balonSaya) balonSaya(); balonSaya = balon(pemain, teks, 6000); }

  function nyalakan() {
    return new Phaser.Game({
      type: Phaser.AUTO, parent: "game", backgroundColor: "#141830", pixelArt: true, roundPixels: true, banner: false,
      scale: {mode: Phaser.Scale.RESIZE}, audio: {noAudio: true}, input: {keyboard: false},
      physics: {default: "arcade"}, scene: [Adegan],
    });
  }

  return {
    nyalakan, mulai, pindahKe, masuk, ucap, balon, tempelkan, lepaskan, frame, ARAH,
    pintu: () => pintu, ruang: () => ruang, profil: () => profil, adegan: () => adegan,
    posisi: () => pemain ? {x: pemain.x, y: pemain.y, arah, jalan} : null,
    orang: () => pemain ? [pemain, ...warga.map(w => w.s)] : [],            // semua yang perlu dihindari kendaraan
    saatSiap: f => saatSiapList.push(f), tiapBingkai: f => tiapBingkaiList.push(f),
  };
})();

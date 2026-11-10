/* CodeIn City · adegan kota (Phaser 3).
   Peta dibaca dari assets/maps/kota.tmj (dibuat dan diubah dengan Tiled):
     layer ubin  : tanah, jalan, bangunan, hiasan (di bawah karakter), atas (di atas karakter),
                   tabrakan (tidak digambar; setiap ubin di layer ini tidak bisa dilewati)
     layer objek : pintu (kotak interaksi; properti id, aksi, tujuan, label_x, label_y), titik (mulai, lampu)
   Teks nama gedung, nama karakter, dan balon ucapan digambar sebagai elemen HTML di atas kanvas supaya tajam. */

const Kota = (() => {
  const T = KOTA.ubin;
  const KOLOM = {kiri: 23, bawah: 24, atas: 25, kanan: 26};      // kolom arah di urban.png
  const frame = (k, arah, langkah) => (KOTA.karakter[k].baris + langkah) * 27 + KOLOM[arah];
  const JARAK_SAPA = 22;

  let adegan = null, pemain = null, profil = null, arah = "bawah", pernahJalan = false, pindah = false;
  let pintu = [], warga = [], dekat = null, tempel = [], lapisanMalam = null, cahaya = [], faseKini = null;
  const tekan = new Set();          // tombol keyboard yang sedang ditekan

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
    if (!adegan || (faseKini && faseKini.nama === f.nama)) return;
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

  class Adegan extends Phaser.Scene {
    constructor() { super("kota"); }

    preload() {
      this.load.tilemapTiledJSON("kota", "assets/maps/kota.tmj");
      this.load.image("ubin", "assets/tiles/urban.png");
      this.load.spritesheet("orang", "assets/tiles/urban.png", {frameWidth: T, frameHeight: T, margin: 1, spacing: 2});
    }

    create() {
      adegan = this;
      const peta = this.make.tilemap({key: "kota"});
      const ubin = peta.addTilesetImage("urban", "ubin", T, T, 1, 2);
      ["tanah", "jalan", "bangunan", "hiasan"].forEach((n, i) => peta.createLayer(n, ubin).setDepth(i));
      peta.createLayer("atas", ubin).setDepth(5000);
      const tabrakan = peta.createLayer("tabrakan", ubin).setVisible(false);
      tabrakan.setCollisionByExclusion([-1]);
      const lebar = peta.widthInPixels, tinggi = peta.heightInPixels;
      this.physics.world.setBounds(0, 0, lebar, tinggi);

      // objek dari peta
      const prop = o => Object.fromEntries((o.properties || []).map(p => [p.name, p.value]));
      pintu = peta.getObjectLayer("pintu").objects.map(o => {
        const p = prop(o);
        return {id: p.id, nama: o.name, aksi: p.aksi, tujuan: p.tujuan || "", x: o.x, y: o.y, w: o.width, h: o.height,
                lx: p.label_x ?? o.x + o.width / 2, ly: p.label_y ?? o.y - T};
      });
      const titik = peta.getObjectLayer("titik").objects;
      const mulai = titik.find(o => o.name === "mulai") || {x: lebar / 2, y: tinggi / 2};

      // animasi jalan semua karakter (dipakai pemain dan warga)
      KOTA.karakter.forEach((_, k) => Object.keys(KOLOM).forEach(a => this.anims.create({
        key: `jalan-${k}-${a}`, frameRate: 8, repeat: -1,
        frames: [1, 0, 2, 0].map(l => ({key: "orang", frame: frame(k, a, l)}))})));

      // pemain: muncul di posisi terakhir (misalnya sepulang dari CodeIn News) atau di alun-alun
      let pos = Profil.muatPosisi() || mulai;
      if (tabrakan.getTileAtWorldXY(pos.x, pos.y)) pos = mulai;
      pemain = this.physics.add.sprite(pos.x, pos.y, "orang", frame(0, "bawah", 0)).setOrigin(.5, .8);
      pemain.body.setSize(8, 5).setOffset(4, 10);
      pemain.setCollideWorldBounds(true);
      this.physics.add.collider(pemain, tabrakan);
      const papanNama = document.createElement("div"); papanNama.className = "nama saya";
      tempelkan(papanNama, () => [pemain.x, pemain.y - 14]);
      this.papanNama = papanNama;

      // warga
      warga = KOTA.warga.map(w => {
        const [x, y] = w.rute[0], s = this.add.sprite(x * T + 8, y * T + 12, "orang", frame(w.karakter, "bawah", 0)).setOrigin(.5, .8);
        const n = document.createElement("div"); n.className = "nama"; n.textContent = w.nama;
        tempelkan(n, () => [s.x, s.y - 14]);
        return {...w, s, ke: 1 % w.rute.length, tunggu: 600, arah: "bawah", giliran: 0, balon: null};
      });

      // papan nama gedung
      for (const p of pintu) {
        const d = document.createElement("div");
        d.className = "papan" + (p.tujuan === "kunci" ? " kunci" : "") + (p.aksi === "pindah" ? " utama" : "");
        d.textContent = (p.tujuan === "kunci" ? "🔒 " : "") + p.nama;
        tempelkan(d, () => [p.lx, p.ly]);
      }

      // malam: lapisan warna + cahaya lampu
      lapisanMalam = this.add.rectangle(lebar / 2, tinggi / 2, lebar, tinggi, 0xffffff, 0).setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(7000);
      const kanvas = this.textures.createCanvas("cahaya", 64, 64), c = kanvas.getContext();
      const g = c.createRadialGradient(32, 32, 2, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.45, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g; c.fillRect(0, 0, 64, 64); kanvas.refresh();
      cahaya = titik.filter(o => o.name === "lampu").map(o =>
        this.add.image(o.x, o.y + 6, "cahaya").setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd27a).setAlpha(.55).setDepth(7001).setVisible(false));
      terapkanWaktu();
      this.time.addEvent({delay: 20000, loop: true, callback: terapkanWaktu});

      // kamera
      const cam = this.cameras.main;
      cam.setBounds(0, 0, lebar, tinggi).startFollow(pemain, true).setRoundPixels(true);
      const aturZoom = () => cam.setZoom(Phaser.Math.Clamp(Math.floor(Math.min(this.scale.width / 352, this.scale.height / 208)), 2, 4));
      aturZoom(); this.scale.on("resize", aturZoom);
      cam.fadeIn(500, 20, 24, 48);

      if (profil) pakaiProfil();
      this.events.on("postupdate", perbaruiTempel);
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
      if (d > .15) {
        arah = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? "kiri" : "kanan") : (vy < 0 ? "atas" : "bawah");
        pemain.anims.play(`jalan-${k}-${arah}`, true);
        if (!pernahJalan) { pernahJalan = true; $("petunjuk").hidden = true; }
      } else { pemain.anims.stop(); pemain.setFrame(frame(k, arah, 0)); }
      pemain.setDepth(10 + pemain.y);

      gerakWarga(dt);
      cariTerdekat();
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
      if (w.tunggu > 0) { w.tunggu -= dt; s.anims.stop(); s.setFrame(frame(w.karakter, w.arah, 0)); continue; }
      const [tx, ty] = w.rute[w.ke], gx = tx * T + 8, gy = ty * T + 12, dx = gx - s.x, dy = gy - s.y, sisa = Math.hypot(dx, dy);
      const langkah = 26 * dt / 1000;
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
    if (w.balon) { clearTimeout(w.balon.waktu); lepaskan(w.balon); }
    const b = document.createElement("div"); b.className = "balon"; b.textContent = w.ucapan[w.giliran++ % w.ucapan.length];
    w.balon = tempelkan(b, () => [w.s.x, w.s.y - 24]);
    w.balon.waktu = setTimeout(() => { lepaskan(w.balon); w.balon = null; }, 5200);
  }

  /* ---------- interaksi: pintu atau warga terdekat ---------- */
  function cariTerdekat() {
    let baru = null;
    if (profil && !pindah) {
      const fx = pemain.x, fy = pemain.body.bottom - 2;
      const p = pintu.find(p => fx >= p.x && fx <= p.x + p.w && fy >= p.y - 2 && fy <= p.y + p.h + 2);
      if (p) baru = {kunci: "p:" + p.id, pintu: p, teks: p.aksi === "pindah" ? `Masuk ${p.nama}` : p.tujuan === "kunci" ? "Periksa gedung" : `Lihat ${p.nama}`};
      else {
        const w = warga.find(w => Phaser.Math.Distance.Between(w.s.x, w.s.y, pemain.x, pemain.y) < JARAK_SAPA);
        if (w) baru = {kunci: "w:" + w.nama, warga: w, teks: `Sapa ${w.nama}`};
      }
    }
    if ((baru && baru.kunci) === (dekat && dekat.kunci)) return;
    dekat = baru;
    const b = $("aksi"); b.hidden = !dekat;
    if (dekat) { b.textContent = dekat.teks; const k = document.createElement("kbd"); k.textContent = "E"; b.append(k); }
  }
  function aksi() {
    if (!dekat || pindah || Panel.terbuka()) return;
    if (dekat.warga) bicara(dekat.warga); else lewat(dekat.pintu);
  }
  function lewat(p) {
    if (p.aksi !== "pindah") { Panel.gedung(p.tujuan || p.id, p.nama); return; }
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
  addEventListener("pagehide", () => { if (pemain && profil && !pindah) Profil.simpanPosisi(pemain.x, pemain.y); });

  /* ---------- keyboard ---------- */
  const sedangMengetik = e => e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target.tagName);
  addEventListener("keydown", e => {
    if (Panel.terbuka() || e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.code === "KeyE" || e.code === "Space" || e.code === "Enter") && !sedangMengetik(e)) { if (!e.repeat) aksi(); e.preventDefault(); return; }
    if (sedangMengetik(e) && e.target.tagName === "INPUT") return;
    tekan.add(e.code);
    if (e.code.startsWith("Arrow")) e.preventDefault();
  });
  addEventListener("keyup", e => tekan.delete(e.code));
  addEventListener("blur", () => tekan.clear());
  $("aksi").onclick = () => { aksi(); $("aksi").blur(); };

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

  function nyalakan() {
    return new Phaser.Game({
      type: Phaser.AUTO, parent: "game", backgroundColor: "#141830", pixelArt: true, roundPixels: true, banner: false,
      scale: {mode: Phaser.Scale.RESIZE}, audio: {noAudio: true}, input: {keyboard: false},
      physics: {default: "arcade"}, scene: [Adegan],
    });
  }

  return {nyalakan, mulai, pindahKe, masuk, pintu: () => pintu, posisi: () => pemain ? {x: pemain.x, y: pemain.y, arah} : null};
})();

/* CodeIn City · kendaraan yang masuk dan keluar lewat gerbang kota.
   Jalurnya dibaca dari layer objek "rute" di peta kota (garis patah, bisa diubah di Tiled).
   Kendaraan berhenti kalau ada orang (pemain, warga, pengunjung lain) atau kendaraan lain di depannya,
   dan membunyikan klakson kalau terlalu lama menunggu. Kendaraan tidak menabrak dan tidak mendorong siapa pun. */

const LaluLintas = (() => {
  // Kendaraan dari atlas benda (assets/sprites/benda.png): tiap jenis punya gambar tampak kanan, kiri, depan (bawah), dan belakang (atas).
  // Mobil 32x16 dari samping dan 16x32 dari depan/belakang, motor 16x16. Motor dan ojol lebih jarang muncul.
  const JENIS = ["sedan", "suv", "angkot", "sedan", "suv", "angkot", "motor", "ojol"];
  const LAJU = 46, MAKS = 5, T = KOTA.ubin;
  let adegan = null, rute = [], mobil = [], tunggu = 0;

  Kota.saatSiap(({adegan: sc, ruang, peta}) => {
    mobil = [];                                   // sprite lama ikut hilang saat peta berganti
    adegan = ruang === "kota" ? sc : null;
    if (!adegan) return;
    const lapis = peta.getObjectLayer("rute");
    rute = (lapis ? lapis.objects : []).filter(o => o.polyline).map(o => o.polyline.map(q => ({x: o.x + q.x, y: o.y + q.y})));
    tunggu = 800;
  });

  function muncul() {
    const bebas = rute.filter(r => !mobil.some(m => Math.hypot(m.s.x - r[0].x, m.s.y - r[0].y) < 90));
    if (!bebas.length) return;
    const r = bebas[Math.floor(Math.random() * bebas.length)], jenis = Math.floor(Math.random() * JENIS.length);
    const s = adegan.add.image(r[0].x, r[0].y, "benda", `mobil-${JENIS[jenis]}-kanan`).setOrigin(.5, 1);
    mobil.push({s, r, ke: 1, jenis, arah: "", diam: 0, klakson: false});
  }

  // ada sesuatu di depan kendaraan? Diukur dari titik tengah bodi, searah laju.
  function terhalang(m, ux, uy) {
    const cx = m.s.x, cy = m.s.y - 8;
    const depan = (x, y, jauh, lebar) => { const dx = x - cx, dy = y - cy, f = dx * ux + dy * uy; return f > -6 && f < jauh && Math.abs(dx * uy - dy * ux) < lebar; };
    const orang = Kota.orang().concat(typeof Ramai !== "undefined" ? Ramai.orang() : []);
    if (orang.some(o => depan(o.x, o.y, 34, 14))) return "orang";
    if (mobil.some(o => o !== m && depan(o.s.x, o.s.y - 8, 46, 12) && (o.s.x - cx) * ux + (o.s.y - 8 - cy) * uy > 4)) return "mobil";
    return "";
  }

  Kota.tiapBingkai(dt => {
    if (!adegan) return;
    tunggu -= dt;
    if (tunggu <= 0) { if (mobil.length < MAKS) muncul(); tunggu = 3500 + Math.random() * 6000; }
    for (const m of mobil.slice()) {
      const t = m.r[m.ke], dx = t.x - m.s.x, dy = t.y - m.s.y, sisa = Math.hypot(dx, dy);
      const arah = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "kiri" : "kanan") : (dy < 0 ? "atas" : "bawah");
      if (arah !== m.arah) { m.arah = arah; m.s.setFrame(`mobil-${JENIS[m.jenis]}-${arah}`); }
      m.s.setDepth(10 + m.s.y - 3);
      const ux = sisa ? dx / sisa : 0, uy = sisa ? dy / sisa : 0, halang = terhalang(m, ux, uy);
      // dua kendaraan yang saling menunggu di persimpangan: setelah 6 detik yang satu jalan terus
      if (halang === "orang" || (halang === "mobil" && m.diam < 6000)) {
        m.diam += dt;
        if (halang === "orang" && m.diam > 2600 && !m.klakson) { m.klakson = true; Kota.balon(m.s, "Tin tin!", 1500); }
        continue;
      }
      if (!halang) { m.diam = 0; m.klakson = false; }
      const langkah = LAJU * dt / 1000;
      if (sisa <= langkah) {
        m.s.setPosition(t.x, t.y);
        if (++m.ke >= m.r.length) { m.s.destroy(); mobil = mobil.filter(x => x !== m); }      // keluar lewat gerbang
      } else { m.s.x += ux * langkah; m.s.y += uy * langkah; }
    }
  });

  return {jumlah: () => mobil.length};
})();

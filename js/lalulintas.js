/* CodeIn City · kendaraan yang masuk dan keluar lewat gerbang kota.
   Jalurnya dibaca dari layer objek "rute" di peta kota (garis patah, bisa diubah di Tiled).
   Kendaraan berhenti kalau ada orang (pemain, warga, pengunjung lain) atau kendaraan lain di depannya,
   dan membunyikan klakson kalau terlalu lama menunggu. Kendaraan tidak menabrak dan tidak mendorong siapa pun. */

const LaluLintas = (() => {
  // Tileset hanya punya tampak samping untuk mobil hijau. Warna lain dibuat dari gambar itu dengan menggeser ronanya.
  // rona = derajat warna pengganti hijau (null = tetap hijau). depan/belakang = tile tampak depan dan belakang (1 tile lebar, 2 tile tinggi).
  const SISI = {kiri: [453, 454], kanan: [480, 481]};
  const JENIS = [
    {rona: null, depan: [399, 426], belakang: [400, 427]},                      // hijau
    {rona: 4, depan: [449, 476], belakang: [452, 479]},                         // merah
    {rona: 40, depan: [395, 422], belakang: [398, 425]},                        // kuning
    {rona: 212, depan: [399, 426], belakang: [400, 427], warnaiDepan: true},    // biru
  ];
  const LAJU = 46, MAKS = 5, T = KOTA.ubin;
  let adegan = null, rute = [], mobil = [], tunggu = 0;

  // ganti rona semua piksel hijau di kanvas; terang dan pekatnya dipertahankan supaya bayangan bodi tetap ada
  function geserRona(c, lebar, tinggi, rona) {
    const d = c.getImageData(0, 0, lebar, tinggi), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const r = p[i] / 255, g = p[i + 1] / 255, b = p[i + 2] / 255, maks = Math.max(r, g, b), min = Math.min(r, g, b), l = (maks + min) / 2, selisih = maks - min;
      if (selisih < .08 || maks !== g || l > .8) continue;                       // abu, putih, kaca: biarkan
      // hijau aslinya gelap, jadi warna pengganti sedikit diterangkan dan dipekatkan agar senada dengan tampak depannya
      const s = selisih / (1 - Math.abs(2 * l - 1)), t = Math.min(.82, l + .1), h = rona / 60;
      const k = (1 - Math.abs(2 * t - 1)) * Math.min(1, s * 1.5), x = k * (1 - Math.abs(h % 2 - 1)), m = t - k / 2;
      const [r2, g2, b2] = h < 1 ? [k, x, 0] : h < 2 ? [x, k, 0] : h < 3 ? [0, k, x] : h < 4 ? [0, x, k] : h < 5 ? [x, 0, k] : [k, 0, x];
      p[i] = (r2 + m) * 255; p[i + 1] = (g2 + m) * 255; p[i + 2] = (b2 + m) * 255;
    }
    c.putImageData(d, 0, 0);
  }
  // gambar kendaraan disusun dari beberapa tile menjadi satu tekstur per jenis dan arah
  function tekstur(sc) {
    const sumber = sc.textures.get("ubin").getSourceImage();
    JENIS.forEach((j, i) => Object.entries({kiri: SISI.kiri, kanan: SISI.kanan, bawah: j.depan, atas: j.belakang}).forEach(([a, tile]) => {
      const kunci = `mobil-${i}-${a}`;
      if (sc.textures.exists(kunci)) return;
      const samping = a === "kiri" || a === "kanan", lebar = samping ? 2 : 1, tinggi = tile.length / lebar;
      const kanvas = sc.textures.createCanvas(kunci, lebar * T, tinggi * T), c = kanvas.getContext();
      tile.forEach((n, k) => c.drawImage(sumber, 1 + (n % 27) * 18, 1 + Math.floor(n / 27) * 18, T, T, (k % lebar) * T, Math.floor(k / lebar) * T, T, T));
      if (j.rona !== null && (samping || j.warnaiDepan)) geserRona(c, lebar * T, tinggi * T, j.rona);
      kanvas.refresh();
    }));
  }

  Kota.saatSiap(({adegan: sc, ruang, peta}) => {
    mobil = [];                                   // sprite lama ikut hilang saat peta berganti
    adegan = ruang === "kota" ? sc : null;
    if (!adegan) return;
    const lapis = peta.getObjectLayer("rute");
    rute = (lapis ? lapis.objects : []).filter(o => o.polyline).map(o => o.polyline.map(q => ({x: o.x + q.x, y: o.y + q.y})));
    tekstur(sc);
    tunggu = 800;
  });

  function muncul() {
    const bebas = rute.filter(r => !mobil.some(m => Math.hypot(m.s.x - r[0].x, m.s.y - r[0].y) < 90));
    if (!bebas.length) return;
    const r = bebas[Math.floor(Math.random() * bebas.length)], jenis = Math.floor(Math.random() * JENIS.length);
    const s = adegan.add.image(r[0].x, r[0].y, `mobil-${jenis}-kanan`).setOrigin(.5, 1);
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
      if (arah !== m.arah) { m.arah = arah; m.s.setTexture(`mobil-${m.jenis}-${arah}`); }
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

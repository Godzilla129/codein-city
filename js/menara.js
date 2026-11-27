/* CodeIn City · Menara Jam Server di alun-alun.
   Jarum jamnya mengikuti jam WIB (sama dengan bilah atas). Dua jendela lampu server menyala hijau kalau semua layanan
   CodeIn normal, kuning kalau ada yang perlu dicek, toska kalau statusnya belum terbaca:
     GET /api/kota/menara -> {sehat: true/false/null, normal, jumlah}   (ringkasan /api/health, disimpan server 5 menit)
   Letak jam dan jendela dibaca dari titik "menara" di peta kota (properti r, kiri, atas, led). */

const Menara = (() => {
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = ((lokal && new URLSearchParams(location.search).get("api")) || KOTA.news).replace(/\/+$/, "");
  const WARNA = {sehat: 0x4cd97b, gangguan: 0xf2c94c, entah: 0x38d6e8};
  let data = null, jarum = null, lampu = [], titik = null, menitTadi = -1;

  async function muat() {
    try {
      const r = await fetch(API + "/api/kota/menara", {headers: {Accept: "application/json"}});
      const d = r.ok ? await r.json() : null;
      data = d && typeof d === "object" ? {sehat: d.sehat === true ? true : d.sehat === false ? false : null,
        normal: Math.max(0, d.normal | 0), jumlah: Math.max(0, d.jumlah | 0)} : null;
    } catch (e) { /* tetap memakai data terakhir */ }
    warnai();
  }
  const keadaan = () => !data || data.sehat === null ? "entah" : data.sehat ? "sehat" : "gangguan";
  function warnai() { lampu.forEach(l => l.setFillStyle(WARNA[keadaan()], 1)); }

  // jarum jam piksel demi piksel supaya tetap tajam di layar
  function gambarJarum() {
    if (!jarum || !titik) return;
    const h = Kota.jam(), menit = Math.floor(h * 60) % 60;
    if (menit === menitTadi) return;
    menitTadi = menit;
    jarum.clear();
    const garis = (sudut, panjang, warna) => {
      jarum.fillStyle(warna);
      for (let t = 0; t <= panjang; t += .5) jarum.fillRect(Math.round(titik.x + Math.sin(sudut) * t), Math.round(titik.y - Math.cos(sudut) * t), 1, 1);
    };
    garis((h % 12) / 12 * Math.PI * 2, titik.r - 6, 0x3b2a20);
    garis(menit / 60 * Math.PI * 2, titik.r - 3, 0x3b2a20);
    jarum.fillStyle(0xc0473a).fillRect(titik.x, titik.y, 1, 1);
  }

  Kota.saatSiap(({adegan: sc, ruang, peta}) => {
    jarum = null; lampu = []; titik = null; menitTadi = -1;
    if (ruang !== "kota") return;
    const lapis = peta.getObjectLayer("titik"), o = lapis && lapis.objects.find(o => o.name === "menara");
    if (!o) return;
    const pr = Object.fromEntries((o.properties || []).map(p => [p.name, p.value]));
    titik = {x: o.x, y: o.y, r: +pr.r || 12};
    const bawah = (+pr.atas || 0) + 160;
    jarum = sc.add.graphics().setDepth(10 + bawah + 1);
    // lampu jendela server: menyala lembut, tetap terang saat malam (di atas lapisan malam)
    lampu = String(pr.led || "").split(";").filter(Boolean).map(t => {
      const [x, y, w, h] = t.split(",").map(Number);
      const r = sc.add.rectangle(pr.kiri + x + w / 2, pr.atas + y + h / 2, w, h, WARNA[keadaan()], 1)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(.32).setDepth(7002);
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
        sc.tweens.add({targets: r, alpha: .5, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut"});
      return r;
    });
    gambarJarum();
  });
  Kota.tiapBingkai(() => gambarJarum());

  function buka() {
    const h = Kota.jam(), jj = String(Math.floor(h)).padStart(2, "0"), mm = String(Math.floor(h % 1 * 60)).padStart(2, "0");
    const c = typeof Cuaca !== "undefined" ? Cuaca.kini() : null;
    const isi = [el("p", null, `Sekarang pukul ${jj}.${mm} WIB` + (c ? `. Cuaca Bengkulu: ${c.teks.toLowerCase()}, ${c.suhu}°C.` : "."))];
    const k = keadaan();
    isi.push(el("p", null, k === "sehat" ? `Semua layanan server CodeIn normal (${data.normal} dari ${data.jumlah}). Lampu jendela menara menyala hijau.`
      : k === "gangguan" ? `Ada layanan server yang perlu dicek: ${data.normal} dari ${data.jumlah} normal. Lampu jendela menara menyala kuning sampai semuanya normal lagi.`
      : "Status server CodeIn belum terbaca. Lampu jendela menara menyala toska sampai datanya masuk."));
    isi.push(el("p", "redup", "Menara ini jam kota sekaligus papan status server yang menjalankan CodeIn News, CodeIn City, dan situs anggota."));
    Panel.buka("Menara Jam Server", isi, [{teks: "Tutup"}]);
    muat();
  }

  muat();
  setInterval(() => { if (!document.hidden) muat(); }, 5 * 60 * 1000);
  return {buka, keadaan};
})();

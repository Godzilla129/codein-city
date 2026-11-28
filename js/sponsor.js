/* CodeIn City · papan iklan LED CodeIn di pinggir lapangan dan di tepi taman (titik "sponsor" di peta kota).
   Semua papan memakai satu layar 60 x 9 piksel yang sama, jadi animasinya serempak seperti papan sponsor di stadion:
     1. tulisan berjalan: logo, CODEIN, motto, dan alamat situs
     2. logo dan CODEIN berkedip
     3. GET IN, LEARN, GROW bergantian
     4. sapuan biru lalu huruf CODEIN muncul satu per satu
   Malam hari layarnya tetap terang (lapisan cahaya di atas gelapnya malam). Pengunjung yang memilih gerak dikurangi
   melihat logo dan tulisan diam. */

const Sponsor = (() => {
  const W = 60, H = 9;
  const tenang = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PUTIH = "#ffffff", BIRU = "#1f8ef5", BIRU_T = "#4fb0ff", REDUP = "#161b25";
  // huruf piksel 3 x 5 (baris atas ke bawah)
  const HURUF = {
    A: ["010", "101", "111", "101", "101"], B: ["110", "101", "110", "101", "110"], C: ["011", "100", "100", "100", "011"],
    D: ["110", "101", "101", "101", "110"], E: ["111", "100", "110", "100", "111"], G: ["011", "100", "101", "101", "011"],
    H: ["101", "101", "111", "101", "101"], I: ["111", "010", "010", "010", "111"], L: ["100", "100", "100", "100", "111"],
    M: ["101", "111", "111", "101", "101"], N: ["101", "111", "111", "111", "101"], O: ["010", "101", "101", "101", "010"],
    R: ["110", "101", "110", "101", "101"], T: ["111", "010", "010", "010", "010"], U: ["101", "101", "101", "101", "111"],
    W: ["101", "101", "111", "111", "101"], Y: ["101", "101", "010", "010", "010"], ".": ["000", "000", "000", "000", "010"],
    ",": ["000", "000", "000", "010", "100"], "!": ["010", "010", "010", "000", "010"], "·": ["000", "000", "010", "000", "000"],
    " ": ["000", "000", "000", "000", "000"]};
  const lebarTeks = t => t.length * 4 - 1;

  let kanvas = null, ctx = null, logo = null, papan = [], jeda = 0, t0 = performance.now();

  function huruf(t, x, y, warna) {
    ctx.fillStyle = warna;
    for (const ch of t) {
      const g = HURUF[ch] || HURUF[" "];
      g.forEach((baris, gy) => [...baris].forEach((b, gx) => { if (b === "1") ctx.fillRect(x + gx, y + gy, 1, 1); }));
      x += 4;
    }
    return x;
  }
  // CODE putih + IN biru, seperti tulisan logo CodeIn
  function merek(x, y) { x = huruf("CODE", x, y, PUTIH); return huruf("IN", x, y, BIRU_T); }
  function gambarLogo(x) { if (logo) ctx.drawImage(logo.img, logo.x, logo.y, logo.w, logo.h, x, 0, logo.w, logo.h); return x + (logo ? logo.w : 0); }
  const lebarLogo = () => logo ? logo.w : 0;

  // satu pita tulisan berjalan: [logo] CODEIN · GET IN, LEARN AND GROW · [logo] CODEINHUB.MY.ID ·
  function pita(x) {
    const mulai = x;
    x = gambarLogo(x) + 3; x = merek(x, 2) + 4;
    x = huruf("· GET IN, LEARN AND GROW ·", x, 2, BIRU_T) + 4;
    x = gambarLogo(x) + 3; x = huruf("CODEINHUB.MY.ID", x, 2, PUTIH) + 4;
    x = huruf("·", x, 2, BIRU) + 5;
    return x - mulai;
  }

  function lukis(kini) {
    ctx.fillStyle = "#0b0e14"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = REDUP;
    for (let x = 0; x < W; x += 2) for (let y = 0; y < H; y += 2) ctx.fillRect(x, y, 1, 1);
    const tengahLogo = () => (W - (lebarLogo() + 3 + lebarTeks("CODEIN"))) / 2 | 0;
    if (tenang) { const x = tengahLogo(); merek(gambarLogo(x) + 3, 2); return; }
    const t = (kini - t0) % 16000;
    if (t < 7000) {                                                  // 1. tulisan berjalan
      const panjang = pita(-1000);                                   // ukur dulu (di luar layar)
      ctx.fillStyle = "#0b0e14"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = REDUP;
      for (let x = 0; x < W; x += 2) for (let y = 0; y < H; y += 2) ctx.fillRect(x, y, 1, 1);
      const geser = Math.floor(t / 45) % panjang;
      for (let x = -geser; x < W; x += panjang) pita(x);
    } else if (t < 10000) {                                          // 2. logo dan CODEIN berkedip
      const k = Math.floor((t - 7000) / 250);
      if (k % 2 === 0 || k > 7) { const x = tengahLogo(); merek(gambarLogo(x) + 3, 2); }
      if (k % 2 === 1 && k <= 7) { ctx.fillStyle = BIRU; ctx.fillRect(0, 0, W, 1); ctx.fillRect(0, H - 1, W, 1); }
    } else if (t < 13000) {                                          // 3. GET IN / LEARN / GROW
      const kata = ["GET IN,", "LEARN", "AND GROW!"][Math.min(2, Math.floor((t - 10000) / 1000))];
      const x = (W - lebarTeks(kata)) / 2 | 0;
      huruf(kata, x, 2, Math.floor((t - 10000) / 1000) === 1 ? BIRU_T : PUTIH);
    } else {                                                         // 4. sapuan biru, huruf muncul satu per satu
      const f = (t - 13000) / 3000;
      const x0 = tengahLogo();
      if (f < .3) {
        const lebar = Math.round(W * f / .3);
        ctx.fillStyle = BIRU; ctx.fillRect(0, 0, lebar, H);
        ctx.fillStyle = BIRU_T; ctx.fillRect(Math.max(0, lebar - 2), 0, 2, H);
      } else {
        const x = gambarLogo(x0) + 3, n = Math.min(6, Math.floor((f - .3) / .08) + 1);
        const tulisan = "CODEIN".slice(0, n);
        huruf(tulisan.slice(0, 4), x, 2, PUTIH);
        if (n > 4) huruf(tulisan.slice(4), x + 16, 2, BIRU_T);
      }
    }
  }

  Kota.saatSiap(({adegan: sc, ruang, peta}) => {
    papan = [];
    if (ruang !== "kota") return;
    const lapis = peta.getObjectLayer("titik");
    const titik = lapis ? lapis.objects.filter(o => o.name === "sponsor") : [];
    if (!titik.length) return;
    if (!kanvas) {
      kanvas = sc.textures.exists("sponsor-layar") ? sc.textures.get("sponsor-layar") : sc.textures.createCanvas("sponsor-layar", W, H);
      ctx = kanvas.getContext();
    }
    const f = sc.textures.get("benda").get("logo-led");
    logo = f && f.name === "logo-led" ? {img: f.source.image, x: f.cutX, y: f.cutY, w: f.cutWidth, h: f.cutHeight} : null;
    for (const o of titik) {
      const pr = Object.fromEntries((o.properties || []).map(p => [p.name, p.value]));
      const dasar = +pr.dasar || o.y + 12;
      const layar = sc.add.image(o.x, o.y, "sponsor-layar").setOrigin(0, 0).setDepth(10 + dasar + .5);
      // cahaya layar tetap terlihat saat malam
      const pendar = sc.add.image(o.x, o.y, "sponsor-layar").setOrigin(0, 0).setDepth(7003)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(Kota.fase() === "Malam" ? .45 : 0);
      papan.push({layar, pendar});
    }
    lukis(performance.now()); kanvas.refresh();
  });
  Kota.tiapBingkai(dt => {
    if (!papan.length || !ctx) return;
    jeda -= dt;
    if (jeda > 0) return;
    jeda = 50;
    lukis(performance.now()); kanvas.refresh();
    const malam = Kota.fase() === "Malam" || Kota.fase() === "Senja";
    papan.forEach(p => p.pendar.setAlpha(malam ? .45 : 0));
  });
  return {jumlah: () => papan.length};
})();

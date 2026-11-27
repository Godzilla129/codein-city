/* CodeIn City · cuaca mengikuti cuaca asli Kota Bengkulu.
   Server CodeIn News mengambil cuaca dari Open-Meteo paling sering tiap 30 menit (GET /api/cuaca -> {kondisi, teks, suhu,
   intensitas, siang}); kota membacanya saat dibuka lalu tiap 10 menit. Kondisi: cerah, berawan, mendung, kabut, gerimis, hujan, badai.
   Efek hanya di luar ruangan (kota dan Perumahan): warna langit, bayangan awan lewat, kabut, hujan dan cipratannya, payung warga,
   dan kilat saat badai. Lampu jalan menyala saat mendung, berkabut, atau hujan (js/kota.js aturCuaca).
   Suara rintik ikut tombol Musik. Pengunjung yang memilih gerak dikurangi tidak melihat kilat dan hujan bergerak.
   Di localhost bisa dicoba: ?cuaca=hujan (atau cerah, berawan, mendung, kabut, gerimis, badai). */

const Cuaca = (() => {
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const q = new URLSearchParams(location.search);
  const API = ((lokal && q.get("api")) || KOTA.news).replace(/\/+$/, "");
  const PAKSA = lokal ? q.get("cuaca") : null;
  const tenang = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ULANG = 10 * 60 * 1000;

  // warna: lapisan MULTIPLY di atas peta (di bawah lapisan malam). awan = banyak bayangan awan, hujan = 1 gerimis .. 3 lebat
  const GAYA = {
    cerah:   {ikon: "☀️", ikonMalam: "🌙"},
    berawan: {ikon: "⛅", warna: 0xdde2e8, alfa: .2, awan: 4},
    mendung: {ikon: "☁️", warna: 0xb0b8c4, alfa: .36, awan: 7, lampu: true},
    kabut:   {ikon: "🌫️", warna: 0xd8dde2, alfa: .2, kabut: .3, lampu: true},
    gerimis: {ikon: "🌦️", warna: 0xa9b7c8, alfa: .3, awan: 5, hujan: 1, lampu: true},
    hujan:   {ikon: "🌧️", warna: 0x8b9cb4, alfa: .42, awan: 7, hujan: 2, lampu: true},
    badai:   {ikon: "⛈️", warna: 0x6a7a9c, alfa: .52, awan: 8, hujan: 3, kilat: true, lampu: true},
  };
  const PAYUNG = [0xc0473a, 0x2f8f8a, 0xe9a23b, 0x7b5ba6, 0x4a7fc1];
  const PAYUNG_T = [0xde6a56, 0x4fb3ac, 0xf6c46b, 0x9c7fc8, 0x6e9fd8];     // sisi yang kena cahaya
  const PAYUNG_G = [0x8f2f27, 0x1f6b67, 0xb87a1f, 0x5a3f80, 0x2f5d99];     // rusuk dan tepi bawah

  let data = null;             // cuaca terakhir dari server (atau ?cuaca=)
  let efek = null;             // objek Phaser untuk peta luar yang sedang tampil
  let suara = null;            // {ctx, gain} rintik hujan
  let disentuh = false;        // browser baru mengizinkan suara setelah pengunjung menekan sesuatu

  const gaya = () => GAYA[data && data.kondisi] || GAYA.cerah;
  const intensitas = () => !data ? 0 : (data.intensitas || gaya().hujan || 0);
  const basah = () => intensitas() > 0;

  /* ---------- data ---------- */
  async function muat() {
    if (PAKSA) {
      const k = GAYA[PAKSA] ? PAKSA : "cerah";
      terima({kondisi: k, teks: {cerah: "Cerah", berawan: "Berawan", mendung: "Mendung", kabut: "Berkabut", gerimis: "Gerimis",
        hujan: "Hujan", badai: "Hujan badai petir"}[k], suhu: 26, intensitas: GAYA[k].hujan || 0, siang: true});
      return;
    }
    try {
      const r = await fetch(API + "/api/cuaca", {headers: {Accept: "application/json"}});
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      if (!d || !GAYA[d.kondisi] || !Number.isFinite(d.suhu)) throw new Error("bentuk");
      terima({kondisi: d.kondisi, teks: String(d.teks || d.kondisi).slice(0, 40), suhu: Math.round(d.suhu),
        intensitas: Math.max(0, Math.min(3, d.intensitas | 0)), siang: d.siang !== false});
    } catch (e) {
      if (!data) terima(null);        // belum pernah dapat: kota tetap cerah tanpa label cuaca
    }
  }
  function terima(d) {
    data = d;
    const malam = Kota.fase() === "Malam";
    if (d) {
      const g = gaya(), ikon = malam && g.ikonMalam ? g.ikonMalam : g.ikon;
      Kota.aturCuaca({label: `${ikon} ${d.suhu}°`, judul: `Cuaca Bengkulu sekarang: ${d.teks}, ${d.suhu}°C (data Open-Meteo)`,
        lampu: !!g.lampu, kunang: !basah()});
      if (typeof Gerbang !== "undefined") Gerbang.cuaca(`${ikon} ${d.teks}, ${d.suhu}°C`);
    } else Kota.aturCuaca({label: "", judul: "", lampu: false, kunang: true});
    pasang();
    atursuara();
  }

  /* ---------- gambar kecil (piksel) ---------- */
  function tekstur(sc) {
    const T = sc.textures;
    const kanvas = (nama, w, h, gambar) => { if (T.exists(nama)) return; const k = T.createCanvas(nama, w, h); gambar(k.getContext(), w, h); k.refresh(); };
    // dua lapis garis hujan: dekat (lebih terang, lebih panjang) dan jauh. Miring ke kiri, mengikuti arah jatuhnya.
    const garis = (c, w, h, n, pj, a) => {
      for (let i = 0; i < n; i++) {
        const x = Math.random() * w, y = Math.random() * h, len = pj + Math.floor(Math.random() * 3);
        for (let j = 0; j < len; j++) {
          c.fillStyle = `rgba(214,230,255,${j === len - 1 ? a : a * .65})`;
          c.fillRect(Math.floor((x - j * .25 + w) % w), Math.floor((y + j) % h), 1, 1);
        }
      }
    };
    kanvas("hujan-dekat", 96, 96, (c, w, h) => garis(c, w, h, 26, 6, .85));
    kanvas("hujan-jauh", 96, 96, (c, w, h) => garis(c, w, h, 34, 4, .5));
    kanvas("cipratan", 7, 3, c => {
      c.fillStyle = "rgba(225,238,255,.9)"; c.fillRect(1, 0, 5, 1); c.fillRect(0, 1, 1, 1); c.fillRect(6, 1, 1, 1); c.fillRect(1, 2, 5, 1);
    });
    kanvas("awan", 160, 90, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.6, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
      c.save(); c.scale(1, h / w); c.fillStyle = g; c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2); c.fill(); c.restore();
    });
    // payung: kanopi berwarna (sudah diwarnai, satu tekstur per warna) dan tangkai kayu lurus yang berakhir di genggaman.
    PAYUNG.forEach((warna, i) => {
      const css = n => "#" + n.toString(16).padStart(6, "0");
      const gelap = PAYUNG_G[i];
      {
        kanvas(`payung-${i}`, 14, 16, c => {
          const pola = ["......##......", "....######....", "..##++++++##..", ".#++-+++-+++#.", "#+++-++++-+++#", "#~#~~#~~#~~#~#"];
          pola.forEach((baris, y) => [...baris].forEach((t, x) => {
            if (t === ".") return;
            c.fillStyle = t === "#" ? "#3b2a20" : t === "~" || t === "-" ? css(gelap) : (x < 6 ? css(PAYUNG_T[i]) : css(warna));
            c.fillRect(x, y, 1, 1);
          }));
          c.fillStyle = "#6b4128";
          c.fillRect(7, 6, 1, 10);
        });
      }
    });
  }

  /* ---------- efek di peta luar ---------- */
  function lepas() {
    if (!efek) return;
    efek.semua.forEach(o => o.destroy());
    if (efek.waktuKilat) efek.waktuKilat.remove();
    efek = null;
  }
  function pasang() {
    const sc = Kota.adegan();
    lepas();
    Kota.aturCuaca({payung: !!(sc && Kota.luar() && data && basah())});
    if (!sc || !sc.peta || !Kota.luar() || !data) return;
    tekstur(sc);
    const g = gaya(), lebar = sc.peta.widthInPixels, tinggi = sc.peta.heightInPixels;
    const malam = Kota.fase() === "Malam";
    efek = {sc, semua: [], awan: [], hujan: [], cipratan: [], payung: new Map(), jedaCiprat: 0, kilat: null};
    const simpan = o => { efek.semua.push(o); return o; };
    // warna langit: saat malam setengahnya saja, lapisan malam sudah menggelapkan
    if (g.warna) simpan(sc.add.rectangle(lebar / 2, tinggi / 2, lebar, tinggi, g.warna, g.alfa * (malam ? .5 : 1))
      .setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(6990));
    // bayangan awan (siang) atau gumpalan kabut, melayang pelan ke barat
    const nAwan = g.kabut ? 9 : (g.awan || 0);
    for (let i = 0; i < nAwan; i++) {
      const a = simpan(sc.add.image(Math.random() * lebar, Math.random() * tinggi, "awan")
        .setScale(1.6 + Math.random() * 1.6, 1.3 + Math.random() * 1.2).setDepth(6985));
      if (g.kabut) a.setTint(0xeef2f4).setAlpha(.32 + Math.random() * .18);
      else a.setTint(0x1c2433).setAlpha(malam ? 0 : .07 + Math.random() * .06);
      a.laju = 5 + Math.random() * 7;
      efek.awan.push(a);
    }
    if (g.kabut) simpan(sc.add.rectangle(lebar / 2, tinggi / 2, lebar, tinggi, 0xe6ecef, g.kabut * (malam ? .5 : 1)).setDepth(6992));
    // hujan: lapisan layar (tidak ikut gulir kamera), dibuat sedikit lebih besar dari layar
    const n = intensitas();
    if (n) {
      const lapis = n === 1 ? [["hujan-jauh", .7, 110]] : [["hujan-jauh", .75, 130], ["hujan-dekat", n === 3 ? .95 : .7, n === 3 ? 260 : 200]];
      for (const [kunci, alfa, laju] of lapis) {
        const t = simpan(sc.add.tileSprite(0, 0, 10, 10, kunci).setScrollFactor(0).setDepth(7005).setAlpha(alfa).setName(kunci));
        t.laju = laju; efek.hujan.push(t);
      }
      for (let i = 0; i < (n === 1 ? 6 : 16); i++) {
        const c = simpan(sc.add.image(0, 0, "cipratan").setDepth(6995).setAlpha(0));
        efek.cipratan.push(c);
      }
      ukurHujan();
    }
    // kilat saat badai: layar memutih sekejap, tidak terlalu terang dan tidak sering
    if (g.kilat && !tenang) {
      efek.kilat = simpan(sc.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setScrollFactor(0).setDepth(7006).setBlendMode(Phaser.BlendModes.ADD));
      ukurHujan();
      const jadwal = () => {
        efek.waktuKilat = sc.time.delayedCall(9000 + Math.random() * 14000, () => {
          if (!efek || !efek.kilat) return;
          sc.tweens.chain({targets: efek.kilat, tweens: [{alpha: .32, duration: 60}, {alpha: 0, duration: 140}, {alpha: .2, duration: 50, delay: 120}, {alpha: 0, duration: 380}]});
          jadwal();
        });
      };
      jadwal();
    }
    const ukur = () => ukurHujan();
    sc.scale.on("resize", ukur);
    sc.events.once("shutdown", () => { sc.scale.off("resize", ukur); if (efek && efek.sc === sc) efek = null; });
  }
  // lapisan layar: dengan scrollFactor 0, zoom kamera tetap berlaku dari tengah layar, jadi ukurannya layar / zoom
  function ukurHujan() {
    if (!efek) return;
    const cam = efek.sc.cameras.main, w = cam.width / cam.zoom + 32, h = cam.height / cam.zoom + 32;
    for (const t of [...efek.hujan, efek.kilat].filter(Boolean)) {
      t.setPosition(cam.width / 2, cam.height / 2).setSize(w, h).setOrigin(.5);
    }
  }

  function gerak(dt) {
    if (!efek || !efek.sc.sys.isActive()) return;
    const sc = efek.sc, detik = dt / 1000, lebar = sc.peta.widthInPixels, tinggi = sc.peta.heightInPixels;
    for (const a of efek.awan) {
      if (!tenang) a.x -= a.laju * detik;
      if (a.x < -a.displayWidth / 2) { a.x = lebar + a.displayWidth / 2; a.y = Math.random() * tinggi; }
    }
    if (!tenang) for (const t of efek.hujan) { t.tilePositionY -= t.laju * detik; t.tilePositionX += t.laju * .25 * detik; }
    // cipratan kecil di tanah yang terlihat
    if (efek.cipratan.length && !tenang && (efek.jedaCiprat -= dt) <= 0) {
      efek.jedaCiprat = intensitas() === 3 ? 25 : intensitas() === 2 ? 45 : 140;
      const c = efek.cipratan.find(x => !x.sibuk), v = sc.cameras.main.worldView;
      if (c) {
        c.sibuk = true; c.setPosition(v.x + Math.random() * v.width, v.y + Math.random() * v.height).setScale(.4).setAlpha(.9);
        sc.tweens.add({targets: c, scaleX: 1.2, scaleY: 1.2, alpha: 0, duration: 320, onComplete: () => { c.sibuk = false; }});
      }
    }
    // payung untuk warga, pemain, dan pengunjung lain selama hujan
    const orang = basah() ? [...Kota.orang(), ...(typeof Ramai !== "undefined" ? Ramai.orang() : [])] : [];
    const ada = new Set();
    for (const s of orang) {
      if (!s || !s.active || !s.visible) continue;
      ada.add(s);
      let p = efek.payung.get(s);
      if (!p) {
        p = sc.add.image(0, 0, "payung-0").setOrigin(7.5 / 14, 1);
        p.warna = efek.payung.size % PAYUNG.length;
        efek.payung.set(s, p); efek.semua.push(p);
      }
      // genggaman di tangan sesuai arah hadap (kolom orang.png: 0 kiri, 1 bawah, 2 atas, 3 kanan).
      // Menghadap depan/belakang: payung di sisi kepala, tangkainya tidak menutupi wajah. Menghadap samping: tangkai
      // di balik badan, jadi kanopinya tampak tepat di atas kepala.
      const kolom = Number(s.frame.name) % 4, langkah = Math.floor(Number(s.frame.name) / 4) % 3;
      const goyang = langkah === 1 ? -1 : 0;
      const TANGAN = [[-1, -.5], [5, .5], [-5, .5], [1, -.5]];
      const [dx, lapis] = TANGAN[kolom] || TANGAN[1];
      if (p.texture.key !== `payung-${p.warna}`) p.setTexture(`payung-${p.warna}`);
      p.setPosition(Math.round(s.x + dx), Math.round(s.y - 2 + goyang)).setDepth(s.depth + lapis).setVisible(true);
    }
    for (const [s, p] of efek.payung) if (!ada.has(s)) { p.setVisible(false); if (!s.active) { p.destroy(); efek.payung.delete(s); } }
  }

  /* ---------- suara rintik (derau yang disaring), ikut tombol Musik ---------- */
  function atursuara() {
    const mau = data && basah() && Kota.luar() && Kota.profil() && !document.hidden && typeof Musik !== "undefined" && Musik.nyala();
    if (!suara) {
      if (!mau || !disentuh) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        const ctx = new AC(), detik = 2, buf = ctx.createBuffer(1, ctx.sampleRate * detik, ctx.sampleRate), d = buf.getChannelData(0);
        let akhir = 0;
        for (let i = 0; i < d.length; i++) { akhir = (akhir + .04 * (Math.random() * 2 - 1)) / 1.04; d[i] = akhir * 3.2; }
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        const saring = ctx.createBiquadFilter(); saring.type = "lowpass"; saring.frequency.value = 1400;
        const gain = ctx.createGain(); gain.gain.value = 0;
        src.connect(saring).connect(gain).connect(ctx.destination); src.start();
        suara = {ctx, gain};
      } catch (e) { return; }
    }
    if (suara.ctx.state === "suspended") suara.ctx.resume().catch(() => {});
    const ke = mau ? [0, .05, .09, .13][intensitas()] : 0, t = suara.ctx.currentTime;
    suara.gain.gain.cancelScheduledValues(t); suara.gain.gain.setValueAtTime(suara.gain.gain.value, t); suara.gain.gain.linearRampToValueAtTime(ke, t + 1.5);
  }
  ["pointerdown", "keydown"].forEach(n => addEventListener(n, () => {
    disentuh = true;
    if (suara && suara.ctx.state === "suspended") suara.ctx.resume().catch(() => {}); else if (!suara) atursuara();
  }, {capture: true, passive: true}));
  document.addEventListener("visibilitychange", atursuara);
  $("btn-musik").addEventListener("click", () => setTimeout(atursuara, 0));

  Kota.saatSiap(() => { efek = null; setTimeout(() => { pasang(); atursuara(); }, 0); });
  Kota.tiapBingkai(gerak);
  muat();
  setInterval(muat, ULANG);
  // malam berganti siang: label ikon (bulan atau matahari) dan kuatnya warna langit ikut diperbarui
  let faseTadi = Kota.fase();
  setInterval(() => { const f = Kota.fase(); if (f !== faseTadi) { faseTadi = f; if (data) terima(data); } }, 30000);

  return {kini: () => data, basah, segarkan: muat};
})();

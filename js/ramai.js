/* CodeIn City · "ramai": pengunjung lain terlihat di kota, dan obrolan singkat antar pengunjung.
   Tersambung lewat WebSocket ke layanan kecil di server CodeIn (KOTA.live). Layanan itu hanya meneruskan pesan:
   tidak ada riwayat obrolan yang disimpan, dan batas kirim serta saringan kata dijalankan di server.
   Kalau layanan tidak terjangkau, kota tetap jalan seperti biasa (sendirian), dan kolom obrolan disembunyikan.
   Semua teks dari server ditulis lewat textContent, jadi tidak bisa menyisipkan HTML. */

const Ramai = (() => {
  // ?live=ws://127.0.0.1:8790 hanya berlaku saat kota dibuka dari komputer sendiri (untuk uji coba)
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const ALAMAT = (lokal && new URLSearchParams(location.search).get("live")) || KOTA.live;
  const ARAH = Kota.ARAH, MAKS_BARIS = 40;

  let ws = null, tersambung = false, jeda = 2000, kunciProfil = "", idSaya = 0, jumlah = 0, adegan = null;
  let terakhir = {t: 0, x: -1, y: -1, a: -1, j: -1};
  const lain = new Map();        // id -> {n, k, r, x, y, a, j, tx, ty, s: sprite, label, hapusBalon}

  const kirim = o => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };

  /* ---------- sambungan ---------- */
  function sambung() {
    const p = Kota.profil(), q = Kota.posisi();
    if (!ALAMAT || !p || !q || ws) return;
    kunciProfil = p.nama + "|" + p.karakter;
    try { ws = new WebSocket(ALAMAT); } catch (e) { ws = null; return; }
    const ini = ws;
    ini.onopen = () => { const q = Kota.posisi(); kirim({t: "gabung", n: p.nama, k: p.karakter, r: Kota.ruang(), x: Math.round(q.x), y: Math.round(q.y)}); };
    ini.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } if (m && typeof m === "object") terima(m); };
    ini.onclose = () => {
      if (ws !== ini) return;
      ws = null; tersambung = false;
      for (const o of lain.values()) buang(o);
      lain.clear(); tampil();
      setTimeout(sambung, jeda); jeda = Math.min(jeda * 2, 30000);        // coba lagi: 2, 4, 8 ... paling lama 30 detik
    };
  }

  function terima(m) {
    if (m.t === "halo") {
      idSaya = m.id; tersambung = true; jeda = 2000; jumlah = m.jumlah || 1;
      (m.orang || []).forEach(tambah);
      tampil();
    } else if (m.t === "masuk" && m.o) {
      tambah(m.o); jumlah = m.jumlah || jumlah; tampil(); baris(null, `${lain.get(m.o.id).n} masuk kota.`);
    } else if (m.t === "keluar") {
      const o = lain.get(m.id);
      if (o) { baris(null, `${o.n} pergi.`); buang(o); lain.delete(m.id); }
      jumlah = m.jumlah || jumlah; tampil();
    } else if (m.t === "gerak") {
      const o = lain.get(m.id);
      if (o) { o.tx = +m.x || 0; o.ty = +m.y || 0; o.a = m.a & 3; o.j = m.j ? 1 : 0; }
    } else if (m.t === "ruang") {
      const o = lain.get(m.id);
      if (o) { o.r = String(m.r); o.x = o.tx = +m.x || 0; o.y = o.ty = +m.y || 0; buang(o); pasang(o); }
    } else if (m.t === "obrol") {
      const teks = String(m.s || "").slice(0, 200);
      if (m.id === idSaya) { baris(Kota.profil().nama, teks, true); Kota.ucap(teks); }
      else {
        const o = lain.get(m.id);
        baris(String(m.n || "?").slice(0, 16), teks);
        if (o && o.s) { if (o.hapusBalon) o.hapusBalon(); o.hapusBalon = Kota.balon(o.s, teks, 6000); }
      }
    } else if (m.t === "tolak") baris(null, String(m.s || "Pesan tidak terkirim.").slice(0, 200));
  }

  /* ---------- pengunjung lain di peta ---------- */
  function tambah(d) {
    const o = {n: String(d.n || "?").slice(0, 16), k: Math.min(KOTA.karakter.length - 1, Math.max(0, d.k | 0)), r: String(d.r),
               x: +d.x || 0, y: +d.y || 0, a: d.a & 3, j: 0, s: null, label: null, hapusBalon: null};
    o.tx = o.x; o.ty = o.y;
    lain.set(d.id, o); pasang(o);
  }
  // sprite hanya dibuat untuk pengunjung yang berada di peta yang sama
  function pasang(o) {
    if (!adegan || o.s || o.r !== Kota.ruang()) return;
    o.s = adegan.add.sprite(o.x, o.y, "orang", Kota.frame(o.k, ARAH[o.a], 0)).setOrigin(.5, .8);
    o.label = Kota.tempelkan(el("div", "nama lain", o.n), () => [o.s.x, o.s.y - 14]);
  }
  function buang(o) {
    if (o.hapusBalon) { o.hapusBalon(); o.hapusBalon = null; }
    if (o.label) { Kota.lepaskan(o.label); o.label = null; }
    if (o.s) { o.x = o.s.x; o.y = o.s.y; o.s.destroy(); o.s = null; }
  }

  Kota.saatSiap(({adegan: sc, ruang}) => {
    adegan = sc;
    for (const o of lain.values()) { o.s = null; o.label = null; o.hapusBalon = null; pasang(o); }      // sprite dan label lama hilang bersama peta lama
    const q = Kota.posisi();
    if (tersambung && q) kirim({t: "ruang", r: ruang, x: Math.round(q.x), y: Math.round(q.y)});
    terakhir.x = -1;
  });

  Kota.tiapBingkai(dt => {
    const p = Kota.profil(), q = Kota.posisi();
    if (!p || !q) return;
    if (!ws && !kunciProfil) sambung();                                           // pertama kali punya profil
    else if (ws && kunciProfil !== p.nama + "|" + p.karakter) { jeda = 300; ws.close(); }       // nama atau karakter diganti: masuk ulang

    // kirim posisi sendiri, paling sering 10 kali per detik dan hanya kalau berubah
    const kini = performance.now(), x = Math.round(q.x), y = Math.round(q.y), a = ARAH.indexOf(q.arah), j = q.jalan ? 1 : 0;
    if (tersambung && kini - terakhir.t >= 100 && (x !== terakhir.x || y !== terakhir.y || a !== terakhir.a || j !== terakhir.j)) {
      kirim({t: "gerak", x, y, a, j}); terakhir = {t: kini, x, y, a, j};
    }
    // pengunjung lain bergerak halus menuju posisi terakhir yang dikabarkan server
    for (const o of lain.values()) {
      const s = o.s;
      if (!s) continue;
      const dx = o.tx - s.x, dy = o.ty - s.y, jauh = Math.hypot(dx, dy);
      if (jauh > 64) s.setPosition(o.tx, o.ty);
      else if (jauh > .5) {
        const langkah = Math.min(jauh, KOTA.kecepatan * 1.3 * dt / 1000);
        s.x += dx / jauh * langkah; s.y += dy / jauh * langkah;
        s.anims.play(`jalan-${o.k}-${ARAH[o.a]}`, true);
      } else { s.anims.stop(); s.setFrame(Kota.frame(o.k, ARAH[o.a], 0)); }
      s.setDepth(10 + s.y);
    }
  });

  /* ---------- tampilan: jumlah orang dan obrolan ---------- */
  function tampil() {
    $("ramai").hidden = !tersambung;
    $("obrol").hidden = !tersambung;
    $("ramai-teks").textContent = jumlah > 1 ? `${jumlah} orang di kota` : "Kamu sendirian di kota";
  }
  // nama = null untuk kabar dari kota (masuk, pergi, pesan ditolak)
  function baris(nama, teks, saya) {
    const log = $("obrol-log"), li = el("li", nama ? (saya ? "saya" : "") : "kabar");
    if (nama) li.append(el("b", null, nama));
    li.append(el("span", null, teks));
    log.append(li);
    while (log.children.length > MAKS_BARIS) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
    setTimeout(() => li.classList.add("lama"), 16000);        // baris lama memudar; muncul lagi saat kolom obrolan dibuka
  }
  $("obrol-form").addEventListener("submit", e => {
    e.preventDefault();
    const isi = $("obrol-isi"), teks = isi.value.trim();
    if (teks && tersambung) kirim({t: "obrol", s: teks.slice(0, 120)});
    isi.value = ""; isi.blur();                               // kembali ke permainan setelah mengirim
  });
  $("obrol-isi").addEventListener("keydown", e => { if (e.key === "Escape") { e.target.blur(); e.stopPropagation(); } });
  $("obrol-isi").addEventListener("focus", () => { const log = $("obrol-log"); log.scrollTop = log.scrollHeight; });

  return {
    fokus: () => { if (tersambung) $("obrol-isi").focus(); },
    orang: () => [...lain.values()].filter(o => o.s).map(o => o.s),
    tersambung: () => tersambung, jumlah: () => jumlah,
  };
})();

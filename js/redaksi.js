/* CodeIn City · Kantor Redaksi CodeIn News (peta "redaksi").
   Eko (ekonomi), Tekno (teknologi), dan Rina (berita umum) bekerja seperti karyawan. Keadaannya dihitung dari data asli
   CodeIn News, sama dengan denah kantor di halaman admin:
     mengetik  ada kabar baru di bidangnya dalam 25 menit terakhir   -> duduk di meja, layar komputernya menyala
     ngopi     belum ada kabar baru 25 menit sampai 3 jam            -> berdiri di dapur
     tidur     sepi lebih dari 3 jam (biasanya malam/akhir pekan)    -> tertidur di meja
     rapat     ada bagian penting sistem yang bermasalah             -> berkumpul di meja rapat
   Data: GET /api/clusters?hours=24, /api/meta, /api/health, /api/books (semua publik). Disegarkan tiap menit selama di dalam kantor. */

const Redaksi = (() => {
  // ?api=http://127.0.0.1:8787 hanya berlaku saat kota dibuka dari komputer sendiri (untuk uji coba), sama dengan js/papan.js
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = ((lokal && new URLSearchParams(location.search).get("api")) || KOTA.news).replace(/\/+$/, "");
  const T = KOTA.ubin, JARAK_SAPA = 22, LAJU = 34;
  const SEGAR = 25, TIDUR = 180;
  // bagian sistem yang membuat redaksi berhenti (sama dengan tingkat "gangguan" di admin)
  const PENTING = ["Kolektor RSS", "Jadwal kolektor", "9router", "Kategorisasi AI", "Clustering AI", "Verifikasi", "Jadwal AI dan verifikasi"];
  const AGEN = [
    {nama: "Eko", gal: "Ekonomi", jabatan: "Redaktur Ekonomi", karakter: 0, istirahat: [3, 9], rapat: [19, 8]},
    {nama: "Tekno", gal: "Teknologi", jabatan: "Redaktur Teknologi", karakter: 6, istirahat: [3, 10], rapat: [20, 8]},
    {nama: "Rina", gal: "Umum", jabatan: "Redaktur Berita Umum", karakter: 5, istirahat: [2, 10], rapat: [21, 8]},
  ];
  const KEADAAN = {
    typing: {ikon: "⌨️", label: "Mengetik", ucap: d => `Lagi sibuk, kabar ${d.toLowerCase()} baru terus masuk.`},
    coffee: {ikon: "☕", label: "Ngopi", ucap: d => `Ngopi dulu. Belum ada kabar ${d.toLowerCase()} baru, nanti juga ramai lagi.`},
    sleep: {ikon: "💤", label: "Tidur", ucap: () => "Zzz… Lagi sepi, biasanya malam atau akhir pekan."},
    alarm: {ikon: "❗", label: "Rapat darurat", ucap: () => "Lagi rapat darurat. Ada bagian sistem yang bermasalah, admin sudah dikabari."},
    offline: {ikon: "❓", label: "Tidak terhubung", ucap: () => "Aku tidak bisa menghubungi server CodeIn News. Coba lagi sebentar."},
    keliling: {ikon: "🚶", label: "Keliling kota", ucap: d => `Kabar ${d.toLowerCase()} lagi sepi, jadi aku keliling kota dulu cari angin. Begitu ada kabar baru, aku balik ke meja.`},
  };
  // Redaktur yang lama tidak bekerja keluar kantor dan berjalan-jalan di kota (siang hari), lewat rute ini (tile kota).
  // Malam hari (mulai 18.00 WIB, lihat KOTA.waktu) mereka tetap di kantor: ngopi atau tertidur di meja.
  const KELILING = 60, PINTU_KANTOR = [21, 11];
  const RUTE = {
    Eko: {rute: [[31, 12], [40, 24], [47, 33], [64, 20], [31, 12]], ket: "keliling kota: videotron, alun-alun, Toko Mbak Tika, bakso di pojok pasar"},
    Tekno: {rute: [[39, 12], [50, 12], [58, 12], [44, 24], [14, 33], [22, 12]], ket: "keliling kota: Galeri, baliho, halte, alun-alun, Markas"},
    Rina: {rute: [[15, 22], [36, 24], [60, 32], [62, 20], [21, 12]], ket: "keliling kota: Papan Pengumuman, alun-alun, kolam, pojok pasar"},
  };

  const data = {kabar: [], galOf: {}, sehat: null, buku: [], online: true, dimuat: false};
  let adegan = null, grid = null, W = 0, H = 0, agen = [], layar = null, kopi = null, jedaMuat = 0, waktuLayar = 0;

  const tengah = ([x, y]) => [x * T + 8, y * T + 12];
  const tileDari = s => [Math.floor(s.x / T), Math.floor(s.y / T)];
  const umurMenit = iso => (Date.now() - new Date(iso)) / 60000;
  function lalu(iso) {
    if (!iso) return "belum ada";
    const m = umurMenit(iso);
    return m < 1 ? "baru saja" : m < 60 ? Math.floor(m) + " menit lalu" : m < 2880 ? Math.floor(m / 60) + " jam lalu" : Math.floor(m / 1440) + " hari lalu";
  }

  /* ---------- data ---------- */
  async function ambil(jalur) {
    const r = await fetch(API + jalur, {cache: "no-store"});
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  async function muat() {
    const [kab, meta, sehat, buku] = await Promise.allSettled([ambil("/api/clusters?hours=24"),
      Object.keys(data.galOf).length ? Promise.resolve(null) : ambil("/api/meta"), ambil("/api/health"), ambil("/api/books?limit=12")]);
    data.online = kab.status === "fulfilled";
    if (data.online) data.kabar = kab.value;
    if (meta.status === "fulfilled" && meta.value && meta.value.galaxies) {
      for (const [g, cats] of Object.entries(meta.value.galaxies)) cats.forEach(c => { data.galOf[c] = g; });
    }
    data.sehat = sehat.status === "fulfilled" ? sehat.value : null;
    if (buku.status === "fulfilled") data.buku = buku.value;
    data.dimuat = true;
    if (adegan && Kota.ruang() === "redaksi") agen.forEach(perbaruiKeadaan);
    perbaruiTamu();
  }
  function kerja(gal) {
    const kl = data.kabar.filter(c => (data.galOf[c.category] || "Ekonomi") === gal);
    const terbaru = kl.reduce((a, c) => !a || c.last_seen > a.last_seen ? c : a, null);
    return {kl, terbaru, berita: kl.reduce((n, c) => n + c.item_count, 0), yakin: kl.filter(c => c.status === "confirmed").length,
            urut: [...kl].sort((a, b) => b.last_seen.localeCompare(a.last_seen))};
  }
  function keadaan(def) {
    if (!data.online) return {kunci: "offline", alasan: "Server CodeIn News tidak bisa dihubungi."};
    const rusak = data.sehat && Array.isArray(data.sehat.checks) ? data.sehat.checks.filter(c => !c.ok && PENTING.includes(c.name)) : [];
    if (rusak.length) return {kunci: "alarm", alasan: `${rusak.map(c => c.name).join(", ")} sedang bermasalah.`};
    const k = kerja(def.gal), umur = k.terbaru ? umurMenit(k.terbaru.last_seen) : Infinity;
    if (umur < SEGAR) return {kunci: "typing", alasan: `Kabar ${def.gal.toLowerCase()} terakhir masuk ${lalu(k.terbaru.last_seen)}.`};
    if (umur >= KELILING && Kota.waktu().kunci !== "malam") return {kunci: "keliling", alasan: k.terbaru ? `Kabar ${def.gal.toLowerCase()} terakhir masuk ${lalu(k.terbaru.last_seen)}, jadi ${def.nama} keluar kantor sebentar.` : `Belum ada kabar ${def.gal.toLowerCase()} dalam 24 jam.`};
    if (umur < TIDUR) return {kunci: "coffee", alasan: `Belum ada kabar ${def.gal.toLowerCase()} baru sejak ${lalu(k.terbaru.last_seen)}.`};
    return {kunci: "sleep", alasan: k.terbaru ? `Kabar ${def.gal.toLowerCase()} terakhir ${lalu(k.terbaru.last_seen)}.` : "Belum ada kabar dalam 24 jam."};
  }

  /* ---------- jalan di dalam kantor (BFS di peta kecil) ---------- */
  function bangunGrid(peta) {
    W = peta.width; H = peta.height; grid = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = peta.getTileAt(x, y, true, "rintangan");
      grid[y * W + x] = t && t.index > 0 ? 0 : 1;
    }
  }
  function jalur(a, b) {
    const k = (x, y) => y * W + x, mulai = k(...a), akhir = k(...b), asal = new Map([[mulai, -1]]), antre = [mulai];
    // titik meja ada di belakang meja dan titik tujuan selalu bisa diinjak; titik awal boleh di petak yang ditandai keras
    const boleh = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (grid[k(x, y)] || k(x, y) === akhir);
    while (antre.length) {
      const c = antre.shift();
      if (c === akhir) break;
      const cx = c % W, cy = Math.floor(c / W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, n = k(nx, ny);
        if (boleh(nx, ny) && !asal.has(n)) { asal.set(n, c); antre.push(n); }
      }
    }
    if (!asal.has(akhir)) return null;
    const hasil = [];
    for (let c = akhir; c !== mulai; c = asal.get(c)) hasil.push([c % W, Math.floor(c / W)]);
    return hasil.reverse();
  }
  const tujuanDari = a => !a.keadaan ? a.meja : a.keadaan.kunci === "alarm" ? a.def.rapat : a.keadaan.kunci === "coffee" ? a.def.istirahat : a.meja;

  function perbaruiKeadaan(a) {
    const baru = keadaan(a.def), ganti = !a.keadaan || baru.kunci !== a.keadaan.kunci;
    a.keadaan = baru;
    a.label.elemen.textContent = `${a.def.nama} ${KEADAAN[baru.kunci].ikon}`;
    if (!ganti) return;
    // keliling kota: kursinya kosong di kantor (dia sedang di peta kota)
    const pergi = baru.kunci === "keliling";
    a.s.setVisible(!pergi); a.label.elemen.hidden = pergi;
    if (pergi) { a.jalur = []; a.siap = true; return; }
    const ke = tujuanDari(a);
    if (!a.siap || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const [x, y] = tengah(ke); a.s.setPosition(x, y); a.jalur = []; a.siap = true;
    } else a.jalur = jalur(tileDari(a.s), ke) || [];
    a.hadap = a.keadaan.kunci === "coffee" ? "kiri" : a.keadaan.kunci === "alarm" ? "bawah" : "bawah";
  }

  /* ---------- gambar tambahan: komputer di meja dan mesin kopi ---------- */
  function gambarLayar(sekarang) {
    if (!layar) return;
    layar.clear();
    agen.forEach((a, i) => {
      const [mx, my] = a.monitor, k = a.keadaan ? a.keadaan.kunci : "sleep", diMeja = a.s.visible && !a.jalur.length && tujuanDari(a) === a.meja;
      layar.fillStyle(0x2e2017).fillRect(mx - 1, my - 1, 12, 9).fillRect(mx + 4, my + 8, 2, 2);
      const warna = k === "typing" && diMeja ? 0x183b33 : k === "alarm" ? 0x4a1e1a : 0x1e2433;
      layar.fillStyle(warna).fillRect(mx, my, 10, 7);
      if (k === "typing" && diMeja) {
        const t = Math.floor(sekarang / 280 + i) % 4;
        for (let b = 0; b < 3; b++) if (b <= t) layar.fillStyle(b % 2 ? 0x7fe0a0 : 0x4fc3f7).fillRect(mx + 1, my + 1 + b * 2, 3 + ((b * 5 + i) % 6), 1);
      } else if (k === "alarm") layar.fillStyle(0xff8a7a).fillRect(mx + 4, my + 1, 2, 3).fillRect(mx + 4, my + 5, 2, 1);
    });
  }
  function gambarKopi(sc, titik) {
    if (!titik) return;
    const g = sc.add.graphics().setDepth(10 + titik.y), x = titik.x - 6, y = titik.y - 14;
    g.fillStyle(0x3b2a20).fillRect(x - 1, y - 1, 14, 16);
    g.fillStyle(0xe5534b).fillRect(x, y, 12, 14);
    g.fillStyle(0x2e2017).fillRect(x + 2, y + 2, 8, 4);
    g.fillStyle(0x7fe0a0).fillRect(x + 3, y + 3, 2, 1);
    g.fillStyle(0xfcf8f1).fillRect(x + 4, y + 9, 4, 4);
    kopi = g;
  }

  /* ---------- tiap bingkai ---------- */
  // redaktur yang sedang keliling jadi warga tambahan di peta kota (js/warga.js)
  function perbaruiTamu() {
    const defs = AGEN.filter(def => keadaan(def).kunci === "keliling").map(def => {
      const r = RUTE[def.nama], ucap = [KEADAAN.keliling.ucap(def.gal)];
      const j = {rute: r.rute, laju: 24, ket: r.ket, ucapan: ucap};
      return {nama: def.nama, label: `${def.nama} 🚶`, karakter: def.karakter, redaksi: def.nama, dari: PINTU_KANTOR,
              jadwal: {pagi: j, siang: j, sore: j, malam: j}};
    });
    Warga.aturTamu(defs);
  }
  function gerak(dt) {
    if (adegan && Kota.ruang() === "kota" && (jedaMuat -= dt) <= 0) { jedaMuat = 120000; muat().catch(() => {}); }
    if (!adegan || Kota.ruang() !== "redaksi") return;
    if ((jedaMuat -= dt) <= 0) { jedaMuat = 60000; muat().catch(() => {}); }
    const pos = Kota.posisi();
    for (const a of agen) {
      const s = a.s;
      s.setDepth(10 + s.y);
      if (a.jalur.length) {
        const [tx, ty] = tengah(a.jalur[0]), dx = tx - s.x, dy = ty - s.y, sisa = Math.hypot(dx, dy), langkah = LAJU * dt / 1000;
        if (sisa <= langkah) { s.setPosition(tx, ty); a.jalur.shift(); }
        else {
          s.x += dx / sisa * langkah; s.y += dy / sisa * langkah;
          a.arah = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "kiri" : "kanan") : (dy < 0 ? "atas" : "bawah");
          s.anims.play(`jalan-${a.def.karakter}-${a.arah}`, true);
          continue;
        }
      }
      s.anims.stop();
      // pemain mendekat: agen menoleh; selain itu menghadap sesuai pekerjaannya
      const dekat = pos && Phaser.Math.Distance.Between(s.x, s.y, pos.x, pos.y) < JARAK_SAPA * 1.6;
      const arah = dekat ? (Math.abs(pos.x - s.x) > Math.abs(pos.y - s.y) ? (pos.x < s.x ? "kiri" : "kanan") : (pos.y < s.y ? "atas" : "bawah")) : a.hadap;
      s.setFrame(Kota.frame(a.def.karakter, arah, 0));
      // tidur di meja: kepala sedikit miring
      s.setAngle(a.keadaan && a.keadaan.kunci === "sleep" && !dekat ? 8 : 0);
    }
    if ((waktuLayar -= dt) <= 0) { waktuLayar = 140; gambarLayar(performance.now()); }
  }

  /* ---------- peta dimuat ---------- */
  Kota.saatSiap(({adegan: sc, ruang, peta}) => {
    adegan = sc; agen = []; layar = null; kopi = null;
    if (ruang === "kota") { jedaMuat = data.dimuat ? 120000 : 300; if (data.dimuat) perbaruiTamu(); }
    if (ruang !== "redaksi") return;
    bangunGrid(peta);
    const titik = (peta.getObjectLayer("titik") || {objects: []}).objects;
    const prop = o => Object.fromEntries((o.properties || []).map(p => [p.name, p.value]));
    gambarKopi(sc, titik.find(o => o.name === "kopi"));
    layar = sc.add.graphics().setDepth(10 + 7 * T);              // di atas daun meja (gambar meja sedikit di belakang), di depan agen yang duduk
    agen = AGEN.map(def => {
      const m = titik.find(o => o.name === "meja" && prop(o).agen === def.nama) || {x: 0, y: 0};
      const meja = [Math.floor(m.x / T), Math.floor(m.y / T)];
      const s = sc.add.sprite(m.x, m.y, "orang", Kota.frame(def.karakter, "bawah", 0)).setOrigin(.5, .8);
      const label = Kota.tempelkan(el("div", "nama", def.nama), () => [s.x, s.y - 14]);
      return {def, s, label, meja, monitor: [m.x + 3, m.y - 2], jalur: [], hadap: "bawah", arah: "bawah", keadaan: null, siap: false};
    });
    jedaMuat = 0;
    if (data.dimuat) agen.forEach(perbaruiKeadaan);
  });
  Kota.tiapBingkai(gerak);

  /* ---------- disapa pemain ---------- */
  function buka(nama) {
    const a = agen.find(x => x.def.nama === nama);
    const def = a ? a.def : AGEN.find(x => x.nama === nama);
    if (!def) return;
    const kd = a && a.keadaan ? a.keadaan : keadaan(def), k = kerja(def.gal), info = KEADAAN[kd.kunci];
    const isi = [el("p", null, `“${info.ucap(def.gal)}”`), el("p", "redup", `${info.ikon} ${info.label}. ${kd.alasan}`)];
    if (data.online && data.dimuat) {
      isi.push(el("p", null, `Dalam 24 jam terakhir ${def.nama} mengolah ${k.berita} berita jadi ${k.kl.length} kabar, ${k.yakin} sudah terkonfirmasi lebih dari satu media.`));
      if (k.urut.length) {
        isi.push(el("p", null, "Kabar terakhir yang dia olah:"));
        const ul = el("ul");
        k.urut.slice(0, 3).forEach(c => {
          const li = el("li"), tautan = el("a", null, c.title);
          tautan.href = `${API}/kabar/${c.id}`; tautan.target = "_blank"; tautan.rel = "noopener";
          li.append(tautan); ul.append(li);
        });
        isi.push(ul);
      }
    }
    const buku = data.buku.find(b => b.galaxy === def.gal);
    const tombol = [];
    if (buku) tombol.push({teks: `Baca Buku Harian ${def.gal}`, utama: true, aksi: () => Kota.bukaNews(`/buku/${buku.id}`)});
    tombol.push({teks: "Tutup"});
    Panel.buka(`${def.nama} · ${def.jabatan}`, isi, tombol);
  }

  return {
    buka,
    terdekat: (x, y) => agen.find(a => a.s.visible && !a.jalur.length && Phaser.Math.Distance.Between(a.s.x, a.s.y, x, y) < JARAK_SAPA) || null,
    sprites: () => agen.map(a => a.s),
  };
})();

/* CodeIn City · koin dan tas warga, dan jual hasil tangkapan ke pedagang Pasar CodeIn.
   Data ada di CodeIn News (dashboard/services/ekonomi.py):
     GET  /api/dompet          -> {koin, tas: [{barang, nama, jenis, jumlah, harga, langka}]}
     POST /api/pasar/jual      -> {jenis: "ikan"}: jual semua barang jenis itu ke pedagangnya
     GET  /api/mancing/juara   -> papan juara mancing hari ini (publik)
   Tombol tas di bilah atas hanya tampil untuk warga (sudah masuk dengan akun Google). */

const Ekonomi = (() => {
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = ((lokal && new URLSearchParams(location.search).get("api")) || KOTA.news).replace(/\/+$/, "");
  let data = null;          // {koin, tas}; null = bukan warga atau belum dimuat

  function tampil() {
    const b = $("btn-tas");
    b.hidden = !data;
    // di bilah atas: ringkas mulai 10 ribu (12rb) supaya tombol lain tetap muat di HP
    if (data) { $("hud-koin").textContent = data.koin >= 10000 ? Math.floor(data.koin / 1000) + "rb" : data.koin.toLocaleString("id-ID"); b.title = `Tas: ${data.koin} koin (tombol I)`; }
  }
  async function muat() {
    if (!Akun.sudahWarga()) { data = null; tampil(); return null; }
    try {
      const d = await Akun.ambil("/api/dompet");
      // server lama (sebelum v27) tidak punya dompet: tombol tas tetap tersembunyi
      if (d && typeof d.koin === "number" && Array.isArray(d.tas)) data = d;
    } catch (e) { /* biarkan data lama */ }
    tampil();
    return data;
  }
  // ikan hasil tangkapan langsung masuk tas di layar, tanpa menunggu muat ulang
  function tambah(b) {
    if (!data) return;
    const ada = data.tas.find(x => x.barang === b.kode);
    if (ada) ada.jumlah++;
    else data.tas.push({barang: b.kode, nama: b.nama, jenis: "ikan", jumlah: 1, harga: b.harga, langka: b.langka});
  }

  const koin = n => `${n.toLocaleString("id-ID")} koin`;
  function barisBarang(b) {
    const li = el("li", "barang");
    const gambar = b.jenis === "perabot" ? Tata.ikon(b.barang, 32) : Barang.ikon(b.barang);
    const nilai = b.jenis === "perabot" ? "perabot" : b.harga ? koin(b.harga * b.jumlah) : "tidak laku";
    li.append(gambar, el("span", null, `${b.nama} × ${b.jumlah}`), el("span", "redup", nilai));
    return li;
  }
  const KATA = {ikan: {barang: "ikan", cara: "Mancing dulu di kolam Taman Kota atau danau Perumahan CodeIn, nanti kubeli."},
                panen: {barang: "hasil kebun", cara: "Tanam sayur dan buah di kebun halaman rumahmu di Perumahan CodeIn, nanti panennya kubeli."}};
  async function juara() {
    try {
      const r = await fetch(API + "/api/mancing/juara", {headers: {Accept: "application/json"}});
      return r.ok ? await r.json() : null;
    } catch (e) { return null; }
  }
  function isiJuara(j) {
    if (!j || !j.juara.length) return [el("p", "redup", "Belum ada yang mancing hari ini. Jadilah yang pertama!")];
    const ol = el("ol", "juara");
    for (const w of j.juara) ol.append(el("li", null, `${w.nama}: ${w.ekor} tangkapan, senilai ${koin(w.nilai)}`));
    const isi = [ol];
    if (j.terlangka) isi.push(el("p", "redup", `Tangkapan paling langka: ${j.terlangka.ikan} oleh ${j.terlangka.nama}.`));
    return isi;
  }

  /* ---------- tas: inventaris bergaya game ----------
     Grid slot berisi ikon dan jumlah, bingkai berwarna menurut kelangkaan, tab kategori, dan rincian barang yang dipilih.
     Tombol I membuka tas (warga). Di grid, panah = pindah slot, Enter = lihat rincian. */
  const TAB = [["semua", "Semua"], ["ikan", "Ikan"], ["panen", "Kebun"], ["perabot", "Perabot"], ["juara", "Juara"]];
  const JUAL_KE = {ikan: "Pak Ikan", panen: "Bu Sayur"};
  let tabKini = "semua", pilihKini = null;
  const ikonBarang = (b, besar) => b.jenis === "perabot" ? Tata.ikon(b.barang, besar ? 56 : 36) : Barang.ikon(b.barang, besar ? "ikon-barang besar" : "ikon-barang");
  const kelangkaan = b => b.jenis === "ikan" ? b.langka : "umum";

  function rincian(b) {
    const kotak = el("div", "rincian-barang");
    if (!b) { kotak.append(el("p", "redup", "Pilih slot untuk melihat rinciannya.")); return kotak; }
    const kepala = el("div", "rincian-kepala"), teks = el("div");
    teks.append(el("b", null, b.nama), el("span", `lencana-langka ${kelangkaan(b)}`, b.jenis === "perabot" ? "perabot" : b.jenis === "panen" ? "hasil kebun" : Barang.langka(b.langka)));
    kepala.append(ikonBarang(b, true), teks);
    kotak.append(kepala, el("p", null, `Dimiliki × ${b.jumlah}`));
    const tombol = [];
    if (b.jenis === "perabot") {
      kotak.append(el("p", "redup", "Perabot dipasang lewat Tata rumah di dalam rumahmu. Jumlah ini termasuk yang sudah terpasang."));
      if (Kota.ruang() === "rumah" && Perumahan.pemilikKini()) tombol.push(["🛋️ Tata rumah", () => { Panel.tutup(); Tata.mulai(); }]);
    } else {
      kotak.append(el("p", null, b.harga ? `Harga jual ${koin(b.harga)} · semuanya ${koin(b.harga * b.jumlah)}` : "Tidak laku dijual. Tapi kalau dibawa ke pasar, pedagangnya mau membuangkan."));
      kotak.append(el("p", "redup", `Dijual ke ${JUAL_KE[b.jenis]} di Pasar CodeIn, timur Taman Kota.`));
      tombol.push(["Ke Pasar CodeIn", () => { Panel.tutup(); Kota.keTempat("kota", "toko"); Kota.kabar(`${JUAL_KE[b.jenis]} ada di lapak pasar, sebelah kanan toko ini.`); }]);
    }
    if (tombol.length) {
      const baris = el("div", "baris-tombol");
      for (const [label, fn] of tombol) { const t = el("button", "tbl", label); t.type = "button"; t.onclick = fn; baris.append(t); }
      kotak.append(baris);
    }
    return kotak;
  }
  function grid(barang) {
    const g = el("div", "inventaris"); g.setAttribute("role", "group"); g.setAttribute("aria-label", "Isi tas");
    const kolom = innerWidth > 480 ? 6 : 5, slot = Math.max(kolom * 4, Math.ceil(barang.length / kolom) * kolom);
    let fokus = null;
    barang.forEach(b => {
      const t = el("button", "slot"); t.type = "button"; t.dataset.langka = kelangkaan(b);
      t.setAttribute("aria-label", `${b.nama}, ${b.jumlah}`); t.setAttribute("aria-pressed", String(pilihKini === b.barang)); t.title = b.nama;
      t.append(ikonBarang(b), el("span", "jumlah", b.jumlah > 999 ? "999+" : String(b.jumlah)));
      t.onclick = () => { pilihKini = b.barang; gambarTas(t.dataset.i); };
      t.dataset.i = String(g.childElementCount);
      if (pilihKini === b.barang) fokus = t;
      g.append(t);
    });
    for (let i = barang.length; i < slot; i++) { const k = el("div", "slot kosong"); k.setAttribute("aria-hidden", "true"); g.append(k); }
    // panah memindah fokus antarslot
    g.addEventListener("keydown", e => {
      const geser = {ArrowRight: 1, ArrowLeft: -1, ArrowDown: kolom, ArrowUp: -kolom}[e.key];
      if (!geser) return;
      const semua = [...g.querySelectorAll("button.slot")], i = semua.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault(); e.stopPropagation();
      const j = Math.max(0, Math.min(semua.length - 1, i + geser));
      semua[j].focus();
    });
    return [g, fokus];
  }
  let juaraKini = null;
  function gambarTas(fokusSlot) {
    const tab = el("div", "tab-tas"); tab.setAttribute("role", "tablist"); tab.setAttribute("aria-label", "Kategori tas");
    let fokus = null;
    for (const [k, label] of TAB) {
      const n = k === "semua" ? data.tas.length : k === "juara" ? 0 : data.tas.filter(b => b.jenis === k).length;
      const t = el("button", "tab", label); t.type = "button"; if (n) t.title = `${n} jenis barang`; t.setAttribute("role", "tab"); t.setAttribute("aria-selected", String(k === tabKini));
      t.onclick = () => { tabKini = k; gambarTas(); };
      if (k === tabKini && fokusSlot === undefined) fokus = t;
      tab.append(t);
    }
    const kepala = el("div", "kepala-tas");
    kepala.append(el("span", "koin-besar", `🪙 ${koin(data.koin)}`));
    const isi = [kepala, tab];
    if (tabKini === "juara") isi.push(...isiJuara(juaraKini));
    else {
      const barang = data.tas.filter(b => tabKini === "semua" || b.jenis === tabKini);
      if (!barang.find(b => b.barang === pilihKini)) pilihKini = barang.length ? barang[0].barang : null;
      const [g, f] = grid(barang);
      isi.push(g, rincian(barang.find(b => b.barang === pilihKini)));
      if (!barang.length) isi.push(el("p", "redup", tabKini === "perabot" ? "Perabot dibeli di Toko Mbak Tika." :
        tabKini === "panen" ? "Tanam bibit di kebun halaman rumahmu di Perumahan CodeIn." : "Cari tepi kolam di Taman Kota atau danau di Perumahan CodeIn, lalu tekan Mancing."));
      if (fokusSlot !== undefined) fokus = f;
    }
    Panel.buka("Tas", isi, [{teks: "Tutup"}], fokus || undefined);
  }
  async function tas() {
    await muat();
    if (!data) { Akun.pastikan("Tas dan koin", tas); return; }
    juaraKini = await juara();
    gambarTas();
  }

  // pedagang yang membeli barang (def.beli = jenis barang). Ucapannya diambil dari jadwal (ucapan pertama).
  async function pedagang(def, ucapan) {
    const salam = el("p", null, ucapan || `Aku ${def.nama}.`);
    if (!Akun.sudahWarga()) {
      Panel.buka(def.nama, [salam, el("p", null, `Mau jual ${KATA[def.beli].barang}? Masuk dulu sebagai warga supaya punya tas dan koin.`)],
        [{teks: "Masuk sebagai warga", utama: true, aksi: () => Akun.pastikan(`Jual ${KATA[def.beli].barang}`, () => pedagang(def, ucapan))}, {teks: "Nanti saja"}]);
      return;
    }
    await muat();
    const barang = (data ? data.tas : []).filter(b => b.jenis === def.beli);
    if (!barang.length) {
      Panel.buka(def.nama, [salam, el("p", null, `Kamu belum bawa ${KATA[def.beli].barang}. ${KATA[def.beli].cara}`)], [{teks: "Siap"}]);
      return;
    }
    const total = barang.reduce((n, b) => n + b.harga * b.jumlah, 0), ul = el("ul", "tas");
    barang.forEach(b => ul.append(barisBarang(b)));
    Panel.buka(def.nama, [salam, el("p", null, def.beli === "ikan" ? "Coba kulihat tangkapanmu…" : "Coba kulihat hasil kebunmu…"), ul, el("p", null, `Semuanya kubeli ${koin(total)}.`)], [
      {teks: `Jual semua (${koin(total)})`, utama: true, aksi: () => jual(def)}, {teks: "Nanti dulu"}]);
  }
  async function jual(def) {
    try {
      const h = await Akun.kirim("/api/pasar/jual", {jenis: def.beli});
      if (data) { data.koin = h.koin; data.tas = data.tas.filter(b => b.jenis !== def.beli); }
      tampil();
      Panel.buka(def.nama, [el("p", null, h.dapat ? `Terima kasih! Ini ${koin(h.dapat)} untukmu.` : "Isinya sampah semua, hehe. Kubuang saja, ya."),
        el("p", "koin-besar", `Koinmu sekarang ${koin(h.koin)}`)], [{teks: "Siap"}]);
    } catch (e) { Kota.kabar("Belum terjual: " + e.message); }
  }

  $("btn-tas").onclick = () => { $("btn-tas").blur(); tas(); };
  // tombol I membuka tas, seperti di game
  addEventListener("keydown", e => {
    if (e.code !== "KeyI" || e.repeat || e.ctrlKey || e.metaKey || e.altKey || Panel.terbuka() || Kota.ditahan()) return;
    if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (!Akun.sudahWarga()) return;
    e.preventDefault(); tas();
  });
  Akun.saatBerubah(k => { if (k !== "memuat") muat(); });

  return {muat, tambah, tas, pedagang, koin: () => data && data.koin};
})();

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
    if (data) { $("hud-koin").textContent = data.koin.toLocaleString("id-ID"); b.title = `Tas dan koin: ${data.koin} koin`; }
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
    li.append(Barang.ikon(b.barang), el("span", null, `${b.nama} × ${b.jumlah}`), el("span", "redup", b.harga ? koin(b.harga * b.jumlah) : "tidak laku"));
    return li;
  }
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

  // dialog tas: koin, isi tas, papan juara mancing hari ini
  async function tas() {
    await muat();
    if (!data) { Akun.pastikan("Tas dan koin", tas); return; }
    const isi = [el("p", "koin-besar", koin(data.koin))];
    if (data.tas.length) {
      const ul = el("ul", "tas"); data.tas.forEach(b => ul.append(barisBarang(b))); isi.push(ul);
      if (data.tas.some(b => b.jenis === "ikan")) isi.push(el("p", "redup", "Ikan bisa dijual ke Pak Ikan di Pasar CodeIn, timur Taman Kota."));
    } else isi.push(el("p", "redup", "Tasmu masih kosong. Cari tepi kolam di Taman Kota atau danau di Perumahan CodeIn, lalu tekan Mancing."));
    isi.push(el("h3", null, "Juara mancing hari ini"), ...isiJuara(await juara()));
    Panel.buka("Tas", isi, [{teks: "Tutup"}]);
  }

  // pedagang yang membeli barang (def.beli = jenis barang). Ucapannya diambil dari jadwal (ucapan pertama).
  async function pedagang(def, ucapan) {
    const salam = el("p", null, ucapan || `Aku ${def.nama}.`);
    if (!Akun.sudahWarga()) {
      Panel.buka(def.nama, [salam, el("p", null, "Mau jual hasil mancing? Masuk dulu sebagai warga supaya punya tas dan koin.")],
        [{teks: "Masuk sebagai warga", utama: true, aksi: () => Akun.pastikan("Jual ikan", () => pedagang(def, ucapan))}, {teks: "Nanti saja"}]);
      return;
    }
    await muat();
    const barang = (data ? data.tas : []).filter(b => b.jenis === def.beli);
    if (!barang.length) {
      Panel.buka(def.nama, [salam, el("p", null, "Kamu belum bawa ikan. Mancing dulu di kolam Taman Kota atau danau Perumahan CodeIn, nanti kubeli.")], [{teks: "Siap"}]);
      return;
    }
    const total = barang.reduce((n, b) => n + b.harga * b.jumlah, 0), ul = el("ul", "tas");
    barang.forEach(b => ul.append(barisBarang(b)));
    Panel.buka(def.nama, [salam, el("p", null, "Coba kulihat tangkapanmu…"), ul, el("p", null, `Semuanya kubeli ${koin(total)}.`)], [
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
  Akun.saatBerubah(k => { if (k !== "memuat") muat(); });

  return {muat, tambah, tas, pedagang, koin: () => data && data.koin};
})();

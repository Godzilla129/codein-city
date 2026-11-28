/* CodeIn City · Lahan Kebun Kota dan Kas Markas.
   Kebun Kota (barat Taman Kota) berisi 12 lahan 2 x 2 petak (K01-K12). Warga membuka satu lahan dengan koin; uangnya masuk
   Kas Markas. Menanam di lahan kota membayar bibit ditambah pajak tanam (persen dari harga jual panennya) yang juga masuk
   Kas Markas. Lahan yang tidak ditanami atau dipanen selama beberapa hari kembali ke kota. Peti Kas Markas di dalam Markas
   menampilkan saldo dan riwayat kas secara terbuka; admin memakai kas untuk hadiah warga.
   Data dari CodeIn News (dashboard/services/lahan.py):
     GET  /api/lahan          -> {lahan: [{kode, pemilik, milikku, tanaman, sampai}], kini, hargaBuka, pajak, petak, hariTerbengkalai}
     POST /api/lahan/buka     -> {lahan}
     POST /api/lahan/tanam    -> {petak, tanaman};  /panen, /cabut -> {petak};  /lepas
     GET  /api/kas            -> {saldo, masuk, keluar, riwayat}
   Pintu lahan berasal dari peta kota (tools/buat_peta.py): satu pintu per petak dengan properti lahan dan petak. */

const Lahan = (() => {
  const T = KOTA.ubin;
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = ((lokal && new URLSearchParams(location.search).get("api")) || KOTA.news).replace(/\/+$/, "");
  const NAMA = {kangkung: "Kangkung", cabai: "Cabai rawit", tomat: "Tomat", jagung: "Jagung", semangka: "Semangka"};
  let data = null, selisih = 0, adegan = null, ruang = null, gambar = [], jeda = 0, bibit = null, memuat = null;

  const jam = () => Date.now() / 1000 + selisih;
  const angka = n => Number(n).toLocaleString("id-ID");
  const tanggal = detik => new Date(detik * 1000).toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta"});
  const lahanDari = p => data && data.lahan.find(l => l.kode === p.lahan) || null;
  const milikku = () => data && data.lahan.find(l => l.milikku) || null;
  const tanamanDi = p => { const l = lahanDari(p); return l && l.tanaman.find(t => t.petak === p.petak) || null; };
  function tahap(t) {
    const umur = (jam() - t.ditanam) / Math.max(1, t.siap - t.ditanam);
    return umur >= 1 ? 3 : umur >= .5 ? 2 : umur >= .12 ? 1 : 0;
  }
  const sisaWaktu = t => {
    const menit = Math.ceil((t.siap - jam()) / 60);
    return menit >= 60 ? `sekitar ${Math.floor(menit / 60)} jam ${menit % 60 ? (menit % 60) + " menit " : ""}lagi` : `sekitar ${Math.max(1, menit)} menit lagi`;
  };

  async function muat() {
    if (memuat) return memuat;
    memuat = (async () => {
      try {
        let d;
        if (Akun.sudahWarga()) d = await Akun.ambil("/api/lahan");
        else {
          const r = await fetch(API + "/api/lahan", {headers: {Accept: "application/json"}});
          if (!r.ok) throw new Error("kode " + r.status);
          d = await r.json();
        }
        if (!d || !Array.isArray(d.lahan)) throw new Error("data lahan tidak dikenal");   // server lama belum punya lahan kota
        data = d; selisih = (+d.kini || Date.now() / 1000) - Date.now() / 1000;
      } finally { memuat = null; }
      gambarSemua();
      return data;
    })();
    return memuat;
  }

  /* ---------- gambar di Kebun Kota ---------- */
  function hapus() { gambar.forEach(g => g.destroy()); gambar = []; }
  function gambarSemua() {
    if (!adegan || ruang !== "kota" || !data) return;
    hapus();
    for (const p of Kota.pintu().filter(p => p.tujuan === "lahan")) {
      const l = lahanDari(p);
      if (!l || !l.pemilik) continue;
      // bedengan tanah gembur menutupi petak sawah
      const g = adegan.add.graphics().setDepth(3.8);
      g.fillStyle(0x6B4A2F).fillRect(p.x + 1, p.y + 1, T - 2, T - 2);
      g.fillStyle(0x4E3421);
      for (let y = 4; y < 15; y += 3) g.fillRect(p.x + 2, p.y + y, T - 4, 1);
      if (l.milikku) { g.lineStyle(1, 0xE9A23B, .9).strokeRect(p.x + .5, p.y + .5, T - 1, T - 1); }
      gambar.push(g);
      const t = l.tanaman.find(x => x.petak === p.petak);
      if (t) gambar.push(adegan.add.image(p.x, p.y + 14, Kebun.tekstur(adegan, t.tanaman, tahap(t))).setOrigin(0, 1).setDepth(10 + p.y + 14));
    }
    Kota.segarkanAksi();
  }

  /* ---------- aksi ---------- */
  function teksAksi(p) {
    const l = lahanDari(p);
    if (!l) return `Lihat lahan ${p.lahan}`;
    if (!l.pemilik) return `🌾 Buka lahan ${l.kode}`;
    if (!l.milikku) return `Lahan ${l.pemilik.nama}`;
    const t = tanamanDi(p);
    if (!t) return "🌱 Tanam";
    return tahap(t) === 3 ? `🧺 Panen ${NAMA[t.tanaman].toLowerCase()}` : `Lihat ${NAMA[t.tanaman].toLowerCase()}`;
  }
  async function buka(p) {
    if (!data) {
      try { await muat(); } catch (e) { Panel.buka("Kebun Kota", [el("p", null, "Data lahan belum bisa diambil dari CodeIn News. Coba lagi sebentar.")], [{teks: "Tutup"}]); return; }
    }
    const l = lahanDari(p);
    if (!l) return;
    if (!l.pemilik) { tawarkan(p, l); return; }
    const t = tanamanDi(p);
    if (!l.milikku) {
      Panel.buka(`Lahan ${l.kode} milik ${l.pemilik.nama}`, [el("p", null, t ? `${NAMA[t.tanaman]} tumbuh di petak ini${tahap(t) === 3 ? " dan sudah siap panen" : ""}.` : "Petak ini sedang kosong."),
        el("p", "redup", "Hanya pemilik lahan yang bisa menanam dan memanen di sini.")], [{teks: "Tutup"}]);
      return;
    }
    if (!t) { pilihBibit(p); return; }
    if (tahap(t) === 3) { panen(p); return; }
    Panel.buka(`${NAMA[t.tanaman]} · lahan ${l.kode}`, [el("p", null, `Masih tumbuh. Siap panen ${sisaWaktu(t)}.`), ketLahan(l)],
      [{teks: "Tutup", utama: true}, {teks: "Cabut tanaman", aksi: () => cabut(p, t)}, {teks: "Lepas lahan", aksi: () => lepas(l)}]);
  }
  const ketLahan = l => el("p", "redup", `Lahan ini tetap milikmu sampai ${tanggal(l.sampai)} selama kamu menanam atau memanen paling lambat ${data.hariTerbengkalai} hari sekali.`);

  async function tawarkan(p, l) {
    if (!Akun.sudahWarga()) { Akun.pastikan(`Membuka lahan ${l.kode} di Kebun Kota`, () => buka(p)); return; }
    const punya = milikku();
    if (punya) {
      Panel.buka(`Lahan ${l.kode}`, [el("p", null, `Lahan ini masih kosong. Kamu sudah punya lahan ${punya.kode}; satu warga satu lahan kota.`)],
        [{teks: "Ke lahanku", utama: true, aksi: () => Kota.pindahKe(`lahan-${punya.kode}-0`)}, {teks: "Tutup"}]);
      return;
    }
    const d = await Ekonomi.muat(), koin = d ? d.koin : 0, cukup = koin >= data.hargaBuka;
    const isi = [
      el("p", null, `Lahan ${l.kode} masih tidur. Buka lahan ini seharga ${data.hargaBuka} koin untuk mendapat ${data.petak} petak kebun di tengah kota.`),
      el("ul", "daftar-aturan", null),
      el("p", cukup ? "redup" : "pesan", cukup ? `Koinmu ${angka(koin)}.` : `Koinmu ${angka(koin)}, kurang ${angka(data.hargaBuka - koin)}. Kumpulkan dari mancing atau kebun halaman, lalu jual di Pasar CodeIn.`)];
    [`Uang pembukaan masuk Kas Markas, kas bersama warga yang bisa dilihat siapa saja di Markas.`,
     `Setiap menanam ada pajak tanam ${data.pajak}% dari harga jual panennya, juga masuk Kas Markas.`,
     `Lahan kembali ke kota kalau ${data.hariTerbengkalai} hari tidak ditanami atau dipanen.`,
     `Satu warga satu lahan kota. Kebun di halaman rumahmu tetap bebas pajak.`].forEach(t => isi[1].append(el("li", null, t)));
    Panel.buka(`Buka lahan ${l.kode}?`, isi, [
      {teks: `Buka lahan (${data.hargaBuka} koin)`, utama: true, nonaktif: !cukup, aksi: () => bukaLahan(p, l)}, {teks: "Nanti saja"}]);
  }
  async function bukaLahan(p, l) {
    try {
      const h = await Akun.kirim("/api/lahan/buka", {lahan: l.kode});
      await muat(); Ekonomi.muat();
      Kota.ucap(`Lahan ${h.lahan} jadi milikku!`);
      Kota.kabar(`Lahan ${h.lahan} terbuka. ${data.hargaBuka} koin masuk Kas Markas.`);
      pilihBibit(p, `Lahan ${h.lahan} sudah milikmu. Mau tanam apa dulu?`);
    } catch (e) {
      Panel.buka("Belum terbuka", [el("p", null, e instanceof TypeError ? "CodeIn News sedang tidak bisa dihubungi." : e.message)], [{teks: "Tutup"}]);
      muat().catch(() => {});
    }
  }
  const pajakDari = b => Math.max(1, Math.ceil(b.harga * data.pajak / 100));
  async function pilihBibit(p, pesan) {
    if (!bibit) {
      try { const r = await fetch(API + "/api/kebun/bibit", {headers: {Accept: "application/json"}}); if (r.ok) bibit = (await r.json()).bibit; } catch (e) { /* biarkan */ }
      if (!Array.isArray(bibit)) { bibit = null; Panel.buka("Lahan kota", [el("p", null, "Bibit belum bisa diambil dari CodeIn News. Coba lagi sebentar.")], [{teks: "Tutup"}]); return; }
    }
    const d = await Ekonomi.muat();
    const ket = el("p", "pesan"); ket.setAttribute("role", "status"); if (pesan) ket.textContent = pesan;
    const ul = el("ul", "toko");
    for (const b of bibit) {
      const pj = pajakDari(b), harga = b.bibit + pj;
      const li = el("li", "barang-toko"), teks = el("span");
      const lama = b.menit >= 60 ? `${b.menit / 60} jam` : `${b.menit} menit`;
      teks.append(el("b", null, b.nama), el("span", "redup", ` panen ${lama}, laku ${b.harga} koin · bibit ${b.bibit} + pajak ${pj}`));
      const t = el("button", "tbl", `${harga} koin`); t.type = "button"; t.setAttribute("aria-label", `Tanam ${b.nama}, ${harga} koin termasuk pajak ${pj}`);
      if (d && d.koin < harga) t.disabled = true;
      t.onclick = () => tanam(p, b);
      li.append(Barang.ikon(b.tanaman), teks, t); ul.append(li);
    }
    Panel.buka(`Tanam di lahan ${p.lahan}`, [el("p", null, `Pilih bibit untuk petak ini.${d ? ` Koinmu ${angka(d.koin)}.` : ""}`), ket, ul,
      el("p", "redup", `Pajak tanam ${data.pajak}% dari harga panen masuk Kas Markas. Hasil panen dijual ke Bu Sayur di Pasar CodeIn.`)], [{teks: "Batal"}]);
  }
  function simpanLokal(kode, ubah) {
    const l = data && data.lahan.find(x => x.kode === kode);
    if (l) ubah(l);
    gambarSemua();
  }
  async function tanam(p, b) {
    try {
      const h = await Akun.kirim("/api/lahan/tanam", {petak: p.petak, tanaman: b.tanaman});
      simpanLokal(h.lahan, l => { l.tanaman = l.tanaman.filter(x => x.petak !== p.petak).concat([{petak: p.petak, tanaman: b.tanaman, ditanam: h.ditanam, siap: h.siap}]); l.sampai = h.sampai; });
      Panel.tutup(); Ekonomi.muat();
      Kota.ucap(`Menanam ${b.nama.toLowerCase()}!`);
      Kota.kabar(`Pajak tanam ${h.pajak} koin masuk Kas Markas.`);
    } catch (e) { pilihBibit(p, "Belum tertanam: " + (e instanceof TypeError ? "CodeIn News sedang tidak bisa dihubungi." : e.message)); }
  }
  async function panen(p) {
    try {
      const h = await Akun.kirim("/api/lahan/panen", {petak: p.petak});
      simpanLokal(h.lahan, l => { l.tanaman = l.tanaman.filter(x => x.petak !== p.petak); l.sampai = h.sampai; });
      Ekonomi.muat();
      Kota.ucap(`Panen ${h.panen.nama.toLowerCase()}!`);
      Kota.kabar(`${h.panen.nama} masuk tas. Jual ke Bu Sayur di Pasar CodeIn: ${h.panen.harga} koin.`);
    } catch (e) { Kota.kabar("Belum bisa panen: " + e.message); muat().catch(() => {}); }
  }
  function cabut(p, t) {
    Panel.buka("Cabut tanaman?", [el("p", null, `${NAMA[t.tanaman]} di petak ini dibuang. Bibit dan pajaknya tidak kembali.`)], [
      {teks: "Ya, cabut", aksi: async () => {
        try { const h = await Akun.kirim("/api/lahan/cabut", {petak: p.petak}); simpanLokal(h.lahan, l => { l.tanaman = l.tanaman.filter(x => x.petak !== p.petak); }); }
        catch (e) { Kota.kabar("Belum berhasil: " + e.message); }
      }}, {teks: "Tidak jadi", utama: true}]);
  }
  function lepas(l) {
    Panel.buka(`Lepas lahan ${l.kode}?`, [el("p", null, "Lahan kembali ke kota beserta tanamannya, dan koin pembukaan tidak kembali. Warga lain bisa membukanya.")], [
      {teks: "Ya, lepas", aksi: async () => {
        try { await Akun.kirim("/api/lahan/lepas", {}); await muat(); Kota.kabar(`Lahan ${l.kode} sudah kamu lepas.`); }
        catch (e) { Kota.kabar("Belum berhasil: " + e.message); }
      }}, {teks: "Tidak jadi", utama: true}]);
  }

  /* ---------- Kas Markas ---------- */
  async function kas() {
    let d;
    try {
      const r = await fetch(API + "/api/kas", {headers: {Accept: "application/json"}});
      if (!r.ok) throw new Error();
      d = await r.json();
    } catch (e) { Panel.buka("Kas Markas", [el("p", null, "Kas belum bisa diambil dari CodeIn News. Coba lagi sebentar.")], [{teks: "Tutup"}]); return; }
    const ringkas = el("div", "kas-ringkas");
    [["Saldo kas", d.saldo], ["Total masuk", d.masuk], ["Dipakai untuk hadiah", d.keluar]].forEach(([n, v]) => {
      const b = el("div"); b.append(el("span", "redup", n), el("b", null, `${angka(v)} koin`)); ringkas.append(b);
    });
    const ul = el("ul", "kas-riwayat");
    d.riwayat.forEach(r => {
      const li = el("li");
      li.append(el("span", null, r.alasan), el("b", r.jumlah < 0 ? "keluar" : "masuk", `${r.jumlah > 0 ? "+" : "−"}${angka(Math.abs(r.jumlah))}`));
      ul.append(li);
    });
    if (!d.riwayat.length) ul.append(el("li", "redup", "Kas masih kosong. Kas terisi saat warga membuka lahan di Kebun Kota dan membayar pajak tanam."));
    Panel.buka("Kas Markas", [el("p", null, "Kas bersama warga CodeIn City. Isinya dari pembukaan lahan Kebun Kota dan pajak tanam, dipakai pengurus untuk hadiah lomba dan kegiatan warga."),
      ringkas, el("h3", null, "Riwayat terbaru"), ul], [{teks: "Tutup"}]);
  }

  Kota.saatSiap(({adegan: sc, ruang: r}) => {
    adegan = sc; ruang = r; gambar = []; jeda = 60000;
    if (r === "kota") muat().catch(() => {});
  });
  Kota.tiapBingkai(dt => {
    if (ruang !== "kota" || (jeda -= dt) > 0) return;
    jeda = 60000;
    if (data) muat().catch(() => {});
  });
  Akun.saatBerubah(k => { if (k !== "memuat" && ruang === "kota") muat().catch(() => {}); });
  return {teksAksi, buka, kas, muat};
})();

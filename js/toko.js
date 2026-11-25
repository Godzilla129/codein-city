/* CodeIn City · Toko Mbak Tika: toko perabot di samping Pasar CodeIn (bisa dimasuki, peta toko.tmj).
   Mbak Tika menjaga kasir di dalam toko: beli perabot, dan jual kembali perabot yang tidak terpasang setengah harga.
   Data dari CodeIn News (dashboard/services/ekonomi.py, services/rumahku.py):
     GET  /api/toko              -> {perabot: [{barang, nama, beli, letak, lebar, tinggi}]}   (publik)
     POST /api/toko/beli         -> {barang}: koin berkurang, perabot masuk tas (khusus warga)
     GET  /api/toko/bisa-dijual  -> {perabot: [{barang, nama, jumlah, harga}]}: perabot di tas yang tidak terpasang
     POST /api/toko/jual         -> {barang}: jual satu perabot ke Mbak Tika
   Perabot yang dibeli dipasang lewat Tata rumah (js/tata.js). */

const Toko = (() => {
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = ((lokal && new URLSearchParams(location.search).get("api")) || KOTA.news).replace(/\/+$/, "");
  const LETAK = {lantai: "Berdiri di lantai", karpet: "Karpet", dinding: "Hiasan dinding"};
  let katalog = null;

  async function muatKatalog() {
    if (katalog) return katalog;
    const r = await fetch(API + "/api/toko", {headers: {Accept: "application/json"}});
    if (!r.ok) throw new Error("kode " + r.status);
    const d = await r.json();
    if (!d || !Array.isArray(d.perabot)) throw new Error("data toko tidak dikenal");
    katalog = d.perabot.slice().sort((a, b) => a.beli - b.beli || a.nama.localeCompare(b.nama, "id"));
    return katalog;
  }

  function sapaan() {
    const salam = {pagi: "Selamat pagi", siang: "Selamat siang", sore: "Selamat sore", malam: "Selamat malam"}[Kota.waktu().kunci] || "Halo";
    return `Mbak Tika: ${salam}! Perabot untuk rumahmu di Perumahan CodeIn, silakan pilih.`;
  }
  // disapa di meja kasir
  function kasir() {
    const isi = [el("p", null, sapaan()), el("p", null, "Mau beli perabot baru, atau jual perabot yang sudah tidak dipakai? Perabot bekas kubeli setengah harga, asal tidak sedang terpasang di rumahmu.")];
    if (!Akun.sudahWarga()) isi.push(el("p", "redup", "Belanja dan jual khusus warga. Lihat-lihat dulu boleh."));
    Panel.buka("Mbak Tika · Kasir", isi, [{teks: "🛒 Beli perabot", utama: true, aksi: () => buka()}, {teks: "💰 Jual perabot", aksi: () => jual()}, {teks: "Tutup"}]);
  }
  async function jual(pesan, gulir = 0) {
    if (!Akun.sudahWarga()) { Akun.pastikan("Jual perabot ke Mbak Tika", () => jual()); return; }
    let d;
    try { d = await Akun.ambil("/api/toko/bisa-dijual"); }
    catch (e) { Panel.buka("Jual perabot", [el("p", null, e instanceof TypeError ? "CodeIn News sedang tidak bisa dihubungi." : e.message)], [{teks: "Tutup"}]); return; }
    const isi = [el("p", null, "Mbak Tika: Coba kulihat perabot yang kamu bawa…")];
    const ket = el("p", pesan && !/^Belum/.test(pesan) ? "berhasil" : "pesan"); ket.setAttribute("role", "status"); if (pesan) ket.textContent = pesan;
    isi.push(ket);
    if (!d.perabot.length) isi.push(el("p", null, "Semua perabotmu sedang terpasang di rumah. Kalau mau menjual, simpan dulu ke tas lewat Tata rumah."));
    const ul = el("ul", "toko");
    for (const p of d.perabot) {
      const li = el("li", "barang-toko"), teks = el("span");
      teks.append(el("b", null, p.nama), el("span", "redup", ` di tas × ${p.jumlah}`));
      const b = el("button", "tbl", `+${p.harga} koin`); b.type = "button"; b.setAttribute("aria-label", `Jual ${p.nama}, dapat ${p.harga} koin`);
      b.onclick = async () => {
        const g = $("panel-isi").scrollTop;
        try {
          const h = await Akun.kirim("/api/toko/jual", {barang: p.barang});
          await Ekonomi.muat();
          jual(`${p.nama} terjual, kamu dapat ${h.dapat} koin. Koinmu ${h.koin.toLocaleString("id-ID")}.`, g);
        } catch (e) { jual("Belum terjual: " + (e instanceof TypeError ? "CodeIn News sedang tidak bisa dihubungi." : e.message), g); }
      };
      li.append(Tata.ikon(p.barang, 40), teks, b); ul.append(li);
    }
    if (d.perabot.length) isi.push(ul);
    Panel.buka("Jual perabot", isi, [{teks: "Kembali ke kasir", aksi: kasir}, {teks: "Tutup"}]);
    if (gulir) $("panel-isi").scrollTop = gulir;
  }

  async function buka(pesan, gulir = 0) {
    let daftar;
    try { daftar = await muatKatalog(); }
    catch (e) { Panel.buka("Toko Mbak Tika", [el("p", null, "Toko belum bisa dibuka: CodeIn News sedang tidak bisa dihubungi atau belum diperbarui. Coba lagi sebentar.")], [{teks: "Tutup"}]); return; }
    const warga = Akun.sudahWarga(), d = warga ? await Ekonomi.muat() : null;
    const punya = {}; (d ? d.tas : []).forEach(b => { punya[b.barang] = b.jumlah; });
    const isi = [el("p", null, sapaan())];
    if (d) isi.push(el("p", "koin-besar", `Koinmu ${d.koin.toLocaleString("id-ID")} koin`));
    else isi.push(el("p", "redup", "Belanja khusus warga. Lihat-lihat dulu boleh; untuk membeli, masuk dengan akun Google."));
    const ket = el("p", pesan && !/^Belum/.test(pesan) ? "berhasil" : "pesan"); ket.setAttribute("role", "status"); if (pesan) ket.textContent = pesan;
    isi.push(ket);
    const ul = el("ul", "toko");
    for (const p of daftar) {
      const li = el("li", "barang-toko"), teks = el("span");
      teks.append(el("b", null, p.nama), el("span", "redup", ` ${LETAK[p.letak] || ""}${punya[p.barang] ? ` · punya ${punya[p.barang]}` : ""}`));
      const b = el("button", "tbl", `${p.beli} koin`); b.type = "button";
      b.setAttribute("aria-label", `Beli ${p.nama}, ${p.beli} koin`);
      if (d && d.koin < p.beli) { b.disabled = true; b.title = "Koinmu belum cukup"; }
      b.onclick = () => beli(p);
      li.append(Tata.ikon(p.barang, 40), teks, b);
      ul.append(li);
    }
    isi.push(ul, el("p", "redup", "Cara dapat koin: mancing di kolam atau danau lalu jual ke Pak Ikan, atau panen kebun di halaman rumahmu lalu jual ke Bu Sayur. Perabot yang dibeli dipasang lewat tombol Tata rumah di dalam rumahmu."));
    const tombol = warga ? [{teks: "Kembali ke kasir", aksi: kasir}, {teks: "Tutup"}] : [{teks: "Masuk sebagai warga", utama: true, aksi: () => Akun.pastikan("Belanja di Toko Mbak Tika", () => buka())}, {teks: "Tutup"}];
    Panel.buka("Toko Mbak Tika", isi, tombol);
    if (gulir) { const kotakIsi = $("panel-isi"); kotakIsi.scrollTop = gulir; }
  }
  async function beli(p) {
    const gulir = $("panel-isi").scrollTop;
    if (!Akun.sudahWarga()) { Akun.pastikan("Belanja di Toko Mbak Tika", () => buka()); return; }
    try {
      const h = await Akun.kirim("/api/toko/beli", {barang: p.barang});
      await Ekonomi.muat();
      Kota.kabar(`${p.nama} masuk tas. Koinmu ${h.koin.toLocaleString("id-ID")}.`);
      buka(`${p.nama} sudah masuk tasmu. Pasang lewat Tata rumah, ya.`, gulir);
    } catch (e) {
      buka("Belum terbeli: " + (e instanceof TypeError ? "CodeIn News sedang tidak bisa dihubungi." : e.message), gulir);
    }
  }

  return {buka, kasir, jual};
})();

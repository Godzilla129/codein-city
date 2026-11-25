/* CodeIn City · Toko Mbak Tika: toko perabot di samping Pasar CodeIn.
   Katalog dan pembelian dari CodeIn News (dashboard/services/ekonomi.py):
     GET  /api/toko        -> {perabot: [{barang, nama, beli, letak, lebar, tinggi}]}   (publik)
     POST /api/toko/beli   -> {barang}: koin berkurang, perabot masuk tas (khusus warga)
   Perabot yang dibeli dipasang lewat Tata rumah (js/tata.js). Toko buka setiap saat: kalau Mbak Tika sedang di pasar
   atau sudah pulang, pembeli membayar di kotak kasir. */

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
    const d = Warga.dimana("Mbak Tika");
    if (d && !d.diRumah && /toko/.test(d.ket)) return "Mbak Tika: Selamat datang! Perabot untuk rumahmu di Perumahan CodeIn, silakan pilih.";
    return "Mbak Tika sedang tidak di toko. Tokonya tetap buka: ambil barangnya, bayar di kotak kasir.";
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
    const ket = el("p", "pesan"); ket.setAttribute("role", "status"); if (pesan) ket.textContent = pesan;
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
    const tombol = warga ? [{teks: "Tutup"}] : [{teks: "Masuk sebagai warga", utama: true, aksi: () => Akun.pastikan("Belanja di Toko Mbak Tika", () => buka())}, {teks: "Tutup"}];
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

  return {buka};
})();

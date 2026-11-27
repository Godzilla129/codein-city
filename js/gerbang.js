/* CodeIn City · Gerbang CodeIn: layar sambutan setiap kali codeinhub.my.id dibuka, sebelum masuk kota.
   Dua jalan: "Kenali CodeIn" (penjelasan komunitas, terbuka untuk siapa saja) dan "Masuk Kota".
   Masuk kota wajib login dengan akun Google (js/akun.js). Warga yang sudah login cukup sekali klik; warga baru memilih
   nama dan karakter dulu di layar judul (js/judul.js). Keluar dari akun membawa kembali ke gerbang.
   Kota tetap dimuat di belakang gerbang (buram), tapi pemain belum ada sampai masuk.
   Uji otomatis di localhost boleh melewati gerbang dengan ?uji=1 (perilaku lama: tamu bisa langsung jalan). */

const Gerbang = (() => {
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const lewati = lokal && new URLSearchParams(location.search).has("uji");
  const g = $("gerbang"), sambut = $("gerbang-sambut"), tentang = $("gerbang-tentang"), pesan = $("gerbang-pesan");
  let sibuk = false;

  function lihat(bagian) {
    sambut.hidden = bagian !== "sambut"; tentang.hidden = bagian !== "tentang";
    g.scrollTop = 0;
    (bagian === "sambut" ? $("btn-masuk-kota") : $("tentang-judul")).focus({preventScroll: true});
  }
  function tampil(pesanAwal) {
    document.body.classList.add("di-gerbang");
    $("hud").hidden = true; $("judul").hidden = true; g.hidden = false;
    pesan.textContent = pesanAwal || "";
    tulis(); lihat("sambut");
  }
  function tutup() { g.hidden = true; document.body.classList.remove("di-gerbang"); }
  const terbuka = () => !g.hidden;

  function tulis() {
    const k = Akun.keadaan(), w = Akun.warga();
    const sapa = $("gerbang-sapa");
    sapa.hidden = !(k === "warga" && w && !w.perluNama);
    if (!sapa.hidden) sapa.textContent = `Selamat datang kembali, ${w.nama}.`;
    $("btn-masuk-kota").textContent = !sapa.hidden ? "Lanjut ke kota" : k === "memuat" ? "Memeriksa akun…" : "Masuk Kota";
    $("btn-masuk-kota").disabled = sibuk || k === "memuat";
    $("btn-masuk-kota-2").disabled = sibuk || k === "memuat";
    $("gerbang-catatan").hidden = !sapa.hidden;
  }

  async function masukKota() {
    if (sibuk) return;
    sibuk = true; pesan.textContent = ""; tulis();
    try {
      await Akun.tunggu();
      if (Akun.keadaan() === "mati") { pesan.textContent = "Login warga belum dibuka. Coba lagi nanti, ya."; return; }
      if (!(Akun.keadaan() === "warga")) {
        pesan.textContent = "Membuka jendela login Google…";
        const salah = await Akun.masuk();
        pesan.textContent = "";
        if (Akun.keadaan() !== "warga") { pesan.textContent = salah || Akun.pesan() || ""; return; }
      }
      const w = Akun.warga();
      tutup();
      if (w.perluNama) Judul.tampil(Profil.muat(), "Pilih nama dan karakter wargamu dulu. " + (Akun.pesan() || ""));
      else Judul.masuk({nama: w.nama, karakter: w.karakter});
    } finally { sibuk = false; tulis(); }
  }

  $("btn-masuk-kota").onclick = masukKota;
  $("btn-masuk-kota-2").onclick = masukKota;
  $("btn-kenali").onclick = () => lihat("tentang");
  $("btn-kembali-gerbang").onclick = () => lihat("sambut");
  Akun.saatBerubah(() => { if (terbuka()) tulis(); });

  // cuaca Bengkulu di pojok gerbang (js/cuaca.js memanggil ini saat datanya datang)
  function cuaca(teks) {
    const c = $("gerbang-cuaca");
    c.hidden = !teks; if (teks) c.textContent = `Bengkulu sekarang: ${teks}`;
  }

  return {tampil, tutup, terbuka, lewati, cuaca, masukKota};
})();

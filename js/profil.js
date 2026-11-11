/* CodeIn City · profil pengunjung (karakter + nama panggilan), disimpan di browser pengunjung saja.
   Tidak ada data yang dikirim ke server. */

const Profil = (() => {
  const KUNCI = "codein-city-profil", KUNCI_POSISI = "codein-city-posisi-2";

  // Kata yang tidak boleh ada di nama. Kata pendek dicek per kata utuh, kata panjang dicek sebagai potongan.
  const KASAR_PANJANG = ["anjing", "anjir", "anjay", "bangsat", "bajingan", "kontol", "memek", "ngentot", "jancok", "jancuk",
    "goblok", "tolol", "bego", "babi", "kampret", "keparat", "brengsek", "pepek", "pantek", "puki", "lonte", "pelacur",
    "perek", "bokep", "titit", "toket", "idiot", "fuck", "shit", "bitch", "pussy", "porn", "nigg", "negro", "cunt", "penis", "vagina"];
  const KASAR_PENDEK = ["asu", "tai", "sex", "seks", "dick"];   // "Dicky" tetap boleh
  const DIPESAN = ["admin", "moderator", "official", "codein"];   // supaya tidak ada yang menyamar jadi pengurus

  // "4nj1iing" -> "anjing": huruf pengganti dikembalikan, simbol dibuang, huruf berulang dirapatkan
  const GANTI = {"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i"};
  const rapikan = s => s.toLowerCase().replace(/[013457@$!]/g, c => GANTI[c]);
  const rapat = s => rapikan(s).replace(/[^a-z]/g, "").replace(/(.)\1+/g, "$1");
  const rapatKata = k => k.replace(/(.)\1+/g, "$1");

  function cekNama(mentah) {
    const nama = String(mentah || "").replace(/\s+/g, " ").trim();
    if (!nama) return {ok: true, nama: "Pengunjung " + (100 + Math.floor(Math.random() * 900))};
    if (nama.length < 2 || nama.length > 16) return {ok: false, alasan: "Nama 2 sampai 16 huruf."};
    if (!/^[\p{L}\p{N} _.\-]+$/u.test(nama)) return {ok: false, alasan: "Pakai huruf, angka, spasi, titik, atau garis saja."};
    const padat = rapat(nama), kata = rapikan(nama).split(/[^a-z]+/).filter(Boolean).map(rapatKata);
    const kasar = KASAR_PANJANG.some(k => padat.includes(rapatKata(k))) || KASAR_PENDEK.some(k => kata.includes(rapatKata(k)));
    if (kasar) return {ok: false, alasan: "Pilih nama lain, ya."};
    if (DIPESAN.some(k => padat.includes(k))) return {ok: false, alasan: "Nama itu khusus pengurus. Pilih nama lain, ya."};
    return {ok: true, nama};
  }

  function baca(kunci) { try { return JSON.parse(localStorage.getItem(kunci)); } catch (e) { return null; } }
  function tulis(kunci, nilai) { try { localStorage.setItem(kunci, JSON.stringify(nilai)); } catch (e) { /* mode privat: tidak tersimpan */ } }

  function muat() {
    const p = baca(KUNCI);
    if (!p || typeof p.nama !== "string" || !KOTA.karakter[p.karakter]) return null;
    return cekNama(p.nama).ok ? {karakter: p.karakter, nama: p.nama} : null;
  }
  const simpan = p => tulis(KUNCI, {karakter: p.karakter, nama: p.nama});

  // Posisi terakhir (maks 24 jam), supaya saat kembali dari CodeIn News pengunjung muncul di depan gedungnya
  function muatPosisi() {
    const p = baca(KUNCI_POSISI);
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) && Date.now() - p.t < 864e5 ? p : null;
  }
  const simpanPosisi = (x, y) => tulis(KUNCI_POSISI, {x: Math.round(x), y: Math.round(y), t: Date.now()});

  return {cekNama, muat, simpan, muatPosisi, simpanPosisi};
})();

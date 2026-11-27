/* CodeIn City · mulai. Kota dimuat di latar; setiap pengunjung melihat Gerbang CodeIn lebih dulu (js/gerbang.js).
   Uji otomatis di localhost (?uji=1) langsung masuk seperti dulu. */

const permainan = Kota.nyalakan();
if (Gerbang.lewati) {
  const profilTersimpan = Profil.muat();
  if (profilTersimpan) Judul.masuk(profilTersimpan); else Judul.tampil(null);
} else Gerbang.tampil();

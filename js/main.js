/* CodeIn City · mulai. Kota langsung dimuat di latar; pengunjung baru melihat layar judul lebih dulu. */

const permainan = Kota.nyalakan();
const profilTersimpan = Profil.muat();
if (profilTersimpan) Judul.masuk(profilTersimpan); else Judul.tampil(null);

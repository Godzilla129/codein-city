/* CodeIn City · pengaturan dan isi teks.
   Berkas ini yang paling sering diubah: isi papan pengumuman, teks gedung, dan ucapan warga.
   Letak gedung dan pintu TIDAK diatur di sini, tetapi di peta (assets/maps/kota.tmj, dibuka dengan Tiled). */

const KOTA = {
  nama: "CodeIn City",
  ubin: 16,                  // ukuran satu tile dalam piksel
  kecepatan: 74,             // kecepatan jalan pemain (piksel dunia per detik)

  // Enam karakter. "baris" = baris pertama karakter itu di assets/tiles/urban.png (kolom 23-26).
  karakter: [
    {baris: 0,  nama: "Kaos hijau"},
    {baris: 3,  nama: "Kaos merah"},
    {baris: 6,  nama: "Rambut perak"},
    {baris: 9,  nama: "Helm kuning"},
    {baris: 12, nama: "Kepala plontos"},
    {baris: 15, nama: "Bando oranye"},
  ],

  // Isi dialog. Kuncinya = properti "id" pintu di peta (atau properti "tujuan" bila diisi).
  // tombol: {teks, url} membuka alamat, {teks, pintu} masuk lewat pintu itu, tanpa keduanya = tutup.
  panel: {
    galeri: {
      judul: "Galeri Showcase",
      isi: ["Tempat memajang proyek, acara, dan portofolio anggota CodeIn.",
            "Galeri masih ditata. Untuk sekarang, karya anggota dipajang di billboard Grand Hall CodeIn News, dan kamu bisa mengajukan proyekmu dari sana, gratis."],
      tombol: [{teks: "Ke CodeIn News", pintu: "news"}, {teks: "Tutup"}],
    },
    markas: {
      judul: "Markas CodeIn",
      isi: ["CodeIn adalah komunitas teknologi tempat belajar bareng dan saling memamerkan karya.",
            "Motto kami: Get in, Learn and Grow with CodeIn.",
            "Mau bergabung atau punya ide kegiatan? Hubungi admin CodeIn lewat grup komunitas."],
      tombol: [{teks: "Tutup"}],
    },
    papan: {
      judul: "Papan Pengumuman",
      daftar: [
        "CodeIn City resmi dibuka. Selamat menjelajah!",
        "CodeIn News menerbitkan Buku Harian dua kali sehari: 06.45 dan 16.30 WIB.",
        "Punya proyek? Ajukan billboard gratis di Grand Hall CodeIn News.",
      ],
      tombol: [{teks: "Tutup"}],
    },
    kunci: {
      judul: "Segera dibuka",
      isi: ["Gedung ini masih kosong.",
            "Proyek kamu bisa jadi gedung di kota ini. Selesaikan satu proyek, kabari admin CodeIn, dan gedung ini bisa jadi milik proyekmu."],
      tombol: [{teks: "Tutup"}],
    },
    gerbang: {
      judul: "Gerbang Kota",
      isi: ["Jalan ke wilayah berikutnya masih dibangun.", "Kota ini bertambah luas seiring bertambahnya proyek anggota."],
      tombol: [{teks: "Tutup"}],
    },
  },

  // Warga yang berjalan bolak-balik. rute = titik-titik tile [x, y]; ucapan dipilih bergantian.
  warga: [
    {nama: "Bu Sari", karakter: 2, rute: [[13, 9], [22, 9]],
     ucapan: ["Gedung beratap oranye itu CodeIn News. Masuk saja, bacaannya gratis.",
              "Tiap pagi dan sore ada Buku Harian baru di perpustakaan redaksi."]},
    {nama: "Bang Jo", karakter: 3, rute: [[16, 19], [31, 19]],
     ucapan: ["Gedung yang masih terkunci itu menunggu proyek anggota. Mungkin proyekmu?",
              "Capek jalan? Tekan tombol Tempat di atas, bisa langsung pindah."]},
    {nama: "Dika", karakter: 4, rute: [[36, 17], [41, 17], [41, 18], [36, 18]],
     ucapan: ["Aku lagi nunggu teman-teman CodeIn mampir ke sini.",
              "Katanya nanti pengunjung lain bisa kelihatan di kota ini. Seru, ya."]},
  ],
};

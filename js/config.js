/* CodeIn City · pengaturan dan isi teks.
   Berkas ini yang paling sering diubah: isi papan pengumuman, teks gedung, dan ucapan warga.
   Letak gedung dan pintu TIDAK diatur di sini, tetapi di peta (assets/maps/*.tmj, dibuka dengan Tiled). */

const KOTA = {
  nama: "CodeIn City",
  ubin: 16,                  // ukuran satu tile dalam piksel
  kecepatan: 74,             // kecepatan jalan pemain (piksel dunia per detik)

  // Alamat CodeIn News. Isi baliho dan videotron diambil dari sini, pengajuan baliho juga dikirim ke sini (lihat js/papan.js).
  news: "https://news.codeinhub.my.id",
  // Alamat layanan "ramai" (pengunjung lain dan obrolan, lihat js/ramai.js dan folder server/). Kosongkan untuk mematikan.
  live: "wss://live.codeinhub.my.id",
  // Pilihan warna pita baliho. Harus sama dengan SWATCHES di server CodeIn News (dashboard/services/billboards.py).
  warna: ["#E9A23B", "#2A9D8F", "#E06D53", "#5466D1", "#3E9E5A", "#C94F7C"],

  // Enam karakter. "baris" = baris pertama karakter itu di assets/tiles/urban.png (kolom 23-26).
  karakter: [
    {baris: 0,  nama: "Kaos hijau"},
    {baris: 3,  nama: "Kaos merah"},
    {baris: 6,  nama: "Rambut perak"},
    {baris: 9,  nama: "Helm kuning"},
    {baris: 12, nama: "Kepala plontos"},
    {baris: 15, nama: "Bando oranye"},
  ],

  // Patung di tengah air mancur: karakter yang dijadikan perunggu.
  patung: {karakter: 0},

  // Isi dialog. Kuncinya = properti "id" pintu di peta (atau properti "tujuan" bila id-nya tidak ada di sini).
  // tombol: {teks, url} membuka alamat, {teks, pintu} masuk lewat pintu itu, tanpa keduanya = tutup.
  // Galeri Showcase, baliho, dan videotron tidak ada di sini: isinya hidup, diambil dari CodeIn News oleh js/papan.js.
  panel: {
    papan: {
      judul: "Papan Pengumuman",
      // tiga yang teratas ikut tampil di papan gabus di kota
      daftar: [
        "Kota diperluas: ada kampung warga di selatan dan tiga gerbang kota.",
        "Pengunjung lain sekarang terlihat, dan bisa diajak mengobrol. Tekan Enter untuk mulai menulis.",
        "Markas CodeIn dan Galeri Showcase sudah bisa dimasuki.",
        "Punya proyek? Pasang di baliho kota, gratis. Ajukan lewat Galeri Showcase atau langsung di depan balihonya.",
        "CodeIn News menerbitkan Buku Harian dua kali sehari: 06.45 dan 16.30 WIB.",
      ],
      tombol: [{teks: "Tutup"}],
    },
    patung: {
      judul: "Patung Si Pemula",
      isi: ["Patung perunggu seorang pemula yang baru masuk CodeIn.",
            "Di alasnya tertulis: Get in, Learn and Grow with CodeIn."],
      tombol: [{teks: "Tutup"}],
    },
    kunci: {
      judul: "Segera dibuka",
      isi: ["Gedung ini masih kosong.",
            "Proyek kamu bisa jadi gedung di kota ini. Selesaikan satu proyek, kabari admin CodeIn, dan gedung ini bisa jadi milik proyekmu."],
      tombol: [{teks: "Tutup"}],
    },
    warkop: {
      judul: "Warkop CodeIn",
      isi: ["Warkop ini belum buka.",
            "Rencananya di sini ada pintu ke obrolan suara grup komunitas. Untuk sekarang, ngobrolnya lewat kolom obrolan di kota."],
      tombol: [{teks: "Tutup"}],
    },
    toko: {
      judul: "Toko Mbak Tika",
      isi: ["Tokonya sedang tutup.", "Mbak Tika berjualan di pojok pasar, sebelah timur alun-alun."],
      tombol: [{teks: "Tutup"}],
    },
    gerbang: {
      judul: "Gerbang Kota",
      isi: ["Jalan ke luar kota belum dibuka untuk pejalan kaki.",
            "Kendaraan keluar masuk lewat sini. Kota ini bertambah luas seiring bertambahnya proyek anggota."],
      tombol: [{teks: "Tutup"}],
    },
  },

  // Papan di dinding Markas. baris = teks singkat di papannya, isi dan daftar = teks lengkap di dialog.
  info: {
    tentang: {
      judul: "Tentang CodeIn",
      baris: ["Komunitas teknologi.", "Belajar bareng, pamer karya.", "Get in, Learn and Grow."],
      isi: ["CodeIn adalah komunitas teknologi tempat belajar bareng dan saling memamerkan karya.",
            "Motto kami: Get in, Learn and Grow with CodeIn.",
            "Mau bergabung atau punya ide kegiatan? Hubungi admin CodeIn lewat grup komunitas."],
    },
    rencana: {
      judul: "Rencana kota",
      baris: ["Sudah: kota, baliho, obrolan.", "Berikutnya: Warkop CodeIn.", "Lalu: Kantor Redaksi piksel."],
      isi: ["Kota ini dibangun bertahap."],
      daftar: ["Sudah jadi: kota yang bisa dijelajahi, baliho dan videotron, pengunjung lain dan obrolan, Markas dan Galeri yang bisa dimasuki.",
               "Berikutnya: Warkop CodeIn, pintu ke obrolan suara grup komunitas.",
               "Setelah itu: Kantor Redaksi CodeIn News dibangun ulang sebagai ruangan piksel di dalam kota.",
               "Kapan saja: gedung yang masih terkunci menunggu proyek anggota."],
    },
  },

  // Warga. rute = titik-titik tile [x, y] yang dilalui bolak-balik (satu titik = berjaga di tempat, menghadap "hadap").
  // ruang = peta tempat warga berada (bawaan "kota"). tempat = dipakai kalimat "Biasanya ada ..." saat rumahnya diketuk.
  // laju = kecepatan jalan (bawaan 26). buka = warga penjaga: disapa langsung membuka dialog itu.
  warga: [
    {nama: "Bu Sari", karakter: 2, rute: [[15, 11], [26, 11]], tempat: "di trotoar depan CodeIn News",
     ucapan: ["Gedung beratap oranye itu CodeIn News. Masuk saja, bacaannya gratis.",
              "Layar besar di sebelahnya itu videotron. Kabar yang lagi ramai muncul di situ.",
              "Tiap pagi dan sore ada Buku Harian baru di perpustakaan redaksi."]},
    {nama: "Bang Jo", karakter: 3, rute: [[26, 23], [34, 23]], tempat: "di alun-alun",
     ucapan: ["Patung di tengah itu namanya Si Pemula. Semua orang di sini pernah jadi dia.",
              "Warkop di selatan belum buka. Katanya nanti bisa ngobrol pakai suara di sana.",
              "Capek jalan? Tekan tombol Tempat di atas, bisa langsung pindah."]},
    {nama: "Dika", karakter: 0, rute: [[58, 20], [69, 20], [69, 21], [58, 21]], tempat: "di pojok pasar",
     ucapan: ["Kalau ada pengunjung lain, kamu bisa lihat mereka jalan-jalan di sini.",
              "Mau ngobrol? Tekan Enter, ketik, lalu Enter lagi."]},
    {nama: "Pak Harun", karakter: 4, rute: [[75, 11]], hadap: "kiri", tempat: "di pos dekat Gerbang Timur",
     ucapan: ["Mobil keluar masuk lewat gerbang ini. Tenang, sopirnya berhenti kalau ada yang menyeberang.",
              "Jalan ke luar kota belum dibuka untuk pejalan kaki."]},
    {nama: "Mbak Tika", karakter: 5, rute: [[62, 19]], tempat: "di lapaknya, pojok pasar",
     ucapan: ["Tokoku di selatan lagi tutup. Aku jaga lapak di sini dulu.",
              "Baliho di kota ini boleh dipakai anggota, gratis. Ajukan saja di Galeri Showcase."]},
    {nama: "Nek Ijah", karakter: 2, rute: [[10, 47], [30, 47]], laju: 16, tempat: "di gang kampung",
     ucapan: ["Kampung ini baru dibangun. Rumahnya masih banyak yang kosong.",
              "Pelan-pelan saja jalannya, Nak."]},
    {nama: "Rafi", karakter: 1, rute: [[36, 18], [43, 18], [43, 23], [36, 23]], laju: 42, tempat: "di alun-alun, lari keliling air mancur",
     ucapan: ["Aku lagi lomba lari keliling air mancur sama Lia!"]},
    {nama: "Lia", karakter: 5, rute: [[21, 12], [21, 16]], laju: 30,
     ucapan: ["Kalau mau nyeberang, lewat zebra cross. Mobilnya pasti berhenti."]},
    {nama: "Om Budi", karakter: 4, rute: [[41, 39], [41, 46]], tempat: "di jalan kampung",
     ucapan: ["Tiap sore aku jalan kaki sampai dekat Gerbang Selatan.",
              "Gedung yang masih terkunci itu menunggu proyek anggota. Mungkin proyekmu?"]},
    {nama: "Kak Rani", karakter: 1, ruang: "markas", rute: [[11, 5]], tempat: "di Markas CodeIn",
     ucapan: ["Selamat datang di Markas. Dua papan di dinding itu isinya tentang CodeIn dan rencana kota.",
              "Mau bergabung atau punya ide kegiatan? Sampaikan ke admin CodeIn lewat grup komunitas."]},
    {nama: "Kak Mita", karakter: 5, ruang: "galeri", rute: [[3, 9]], buka: "galeri", tempat: "di Galeri Showcase", ucapan: []},
  ],
};

/* CodeIn City · pengaturan dan isi teks.
   Berkas ini yang paling sering diubah: isi papan pengumuman, teks gedung, dan ucapan warga.
   Letak gedung dan pintu TIDAK diatur di sini, tetapi di peta (assets/maps/*.tmj, dibuka dengan Tiled). */

const KOTA = {
  nama: "CodeIn City",
  ubin: 16,                  // ukuran satu tile dalam piksel
  kecepatan: 74,             // kecepatan jalan pemain (piksel dunia per detik)

  // Alamat CodeIn News. Isi baliho dan videotron diambil dari sini, pengajuan baliho juga dikirim ke sini (lihat js/papan.js).
  news: "https://news.codeinhub.my.id",
  // Domain utama. Situs proyek anggota tayang di <nama>.<domain> (lihat js/rumah.js).
  domain: "codeinhub.my.id",
  // Alamat layanan "ramai" (pengunjung lain dan obrolan, lihat js/ramai.js dan bagian "Layanan ramai" di README). Kosongkan untuk mematikan.
  live: "wss://live.codeinhub.my.id",
  // Pilihan warna pita baliho. Harus sama dengan SWATCHES di server CodeIn News (dashboard/services/billboards.py).
  warna: ["#E9A23B", "#2A9D8F", "#E06D53", "#5466D1", "#3E9E5A", "#C94F7C"],

  // Enam karakter yang bisa dipilih pengunjung. "lembar" = urutan karakter di assets/sprites/orang.png (dibuat tools/buat_aset.py).
  // Lembar 6 (Jull pemula) tidak bisa dipilih: dipakai untuk Patung Pendiri.
  karakter: [
    {lembar: 0, nama: "Hoodie biru"},
    {lembar: 1, nama: "Kaos kuning"},
    {lembar: 2, nama: "Topi merah"},
    {lembar: 3, nama: "Rambut merah"},
    {lembar: 4, nama: "Kakek"},
    {lembar: 5, nama: "Nenek"},
  ],
  lembarOrang: 7,            // jumlah karakter di orang.png (termasuk yang tidak bisa dipilih)

  // Pembagian waktu WIB untuk jadwal warga dan tulisan di bilah atas. mulai = jam mulai (sampai jam mulai waktu berikutnya).
  waktu: [
    {kunci: "pagi",  nama: "Pagi",  mulai: 6},
    {kunci: "siang", nama: "Siang", mulai: 11},
    {kunci: "sore",  nama: "Sore",  mulai: 15},
    {kunci: "malam", nama: "Malam", mulai: 18},
  ],

  // Patung. Kuncinya = properti "jenis" titik "patung" di peta. karakter = gambar karakter yang dijadikan patung.
  patung: {
    pendiri: {karakter: 6, bahan: "batu"},         // dinding utara Markas CodeIn (Patung Si Pemula di alun-alun sudah ada di gambar air mancurnya)
  },

  // Isi dialog. Kuncinya = properti "id" pintu di peta (atau properti "tujuan" bila id-nya tidak ada di sini).
  // tombol: {teks, url} membuka alamat, {teks, pintu} masuk lewat pintu itu, tanpa keduanya = tutup.
  // Galeri Showcase, baliho, dan videotron tidak ada di sini: isinya hidup, diambil dari CodeIn News oleh js/papan.js.
  panel: {
    papan: {
      judul: "Papan Pengumuman",
      // tiga yang teratas ikut tampil di papan gabus di kota
      daftar: [
        "Kantor Redaksi CodeIn News sudah bisa dimasuki. Lihat Eko, Tekno, dan Rina bekerja, lalu sapa mereka.",
        "Hosting proyek gratis untuk anggota. Daftar lewat Kak Rani di Markas, unggah zip, situsmu tayang dan masuk Direktori Proyek.",
        "Di Markas CodeIn sekarang ada Patung Pendiri dan meja resepsionis. Kak Rani yang jaga.",
        "Warga kota punya jadwal harian. Malam hari kebanyakan pulang ke kampung di selatan.",
        "Pengunjung lain terlihat dan bisa diajak mengobrol. Tekan Enter untuk mulai menulis.",
        "Warkop CodeIn sengaja dikunci, menunggu anggota yang mau ikut membangun kota ini.",
        "Punya proyek? Pasang di baliho kota, gratis. Daftarnya lewat Kak Rani di meja resepsionis Markas CodeIn.",
        "CodeIn News menerbitkan Buku Harian dua kali sehari: 06.45 dan 16.30 WIB.",
      ],
      tombol: [{teks: "Tutup"}],
    },
    pendiri: {
      judul: "Patung Pendiri",
      // Teks plakat. Silakan diubah sendiri, ini yang dibaca setiap pengunjung baru.
      isi: ["Jull, pendiri Komunitas CodeIn.",
            "CodeIn lahir sebagai tempat belajar bareng dan saling memamerkan karya. Mottonya: Get in, Learn and Grow with CodeIn.",
            "Jull mulai membangun CodeIn City pada November 2026, supaya anggota punya tempat berkumpul selain grup WhatsApp: jalan-jalan, mengobrol, membaca kabar dari CodeIn News, dan memajang karya di baliho.",
            "Patung ini ada supaya setiap pengunjung baru tahu siapa yang memulai. Kotanya sendiri dibangun bersama, oleh siapa saja yang mau ikut."],
      tombol: [{teks: "Tutup"}],
    },
    patung: {
      judul: "Patung Si Pemula",
      isi: ["Patung perunggu seorang pemula yang baru masuk CodeIn.",
            "Di alasnya tertulis: Get in, Learn and Grow with CodeIn."],
      tombol: [{teks: "Tutup"}],
    },
    warkop: {
      judul: "🔒 Warkop CodeIn",
      isi: ["Warkop CodeIn masih dikunci.",
            "Tempat nongkrong ini sengaja disiapkan untuk anggota komunitas yang penasaran dan ingin ikut membantu mengembangkan CodeIn City bersama Jull.",
            "Tertarik ikut membangun? Mampir ke Markas CodeIn dan sapa Kak Rani di meja resepsionis."],
      tombol: [{teks: "Ke Markas CodeIn", pintu: "markas"}, {teks: "Tutup"}],
    },
    gerbang: {
      judul: "Gerbang Kota",
      isi: ["Jalan ke luar kota belum dibuka untuk pejalan kaki.",
            "Kendaraan keluar masuk lewat sini. Kota ini bertambah luas seiring bertambahnya proyek anggota."],
      tombol: [{teks: "Tutup"}],
    },
  },

  // Papan di dinding Markas dan Kantor Redaksi. baris = teks singkat di papannya, isi dan daftar = teks lengkap di dialog.
  info: {
    "cara-kerja": {
      judul: "Cara kerja redaksi",
      baris: ["Eko: ekonomi.", "Tekno: teknologi.", "Rina: berita umum."],
      isi: ["Tiga redaktur ini bekerja sesuai kabar yang benar-benar masuk ke CodeIn News, bukan animasi acak."],
      daftar: ["Mengetik di meja: ada kabar baru di bidangnya dalam 25 menit terakhir. Layar komputernya menyala.",
               "Ngopi di dapur: belum ada kabar baru 25 menit sampai 3 jam.",
               "Tertidur di meja: sepi lebih dari 3 jam, biasanya malam atau akhir pekan.",
               "Rapat di meja rapat: ada bagian penting sistem yang bermasalah.",
               "Dua kali sehari, pukul 06.45 dan 16.30 WIB, kabar-kabar itu dirangkum jadi Buku Harian. Sapa redakturnya untuk membaca bukunya."],
    },
    tentang: {
      judul: "Tentang CodeIn",
      baris: ["Komunitas teknologi.", "Belajar bareng, pamer karya.", "Get in, Learn and Grow."],
      isi: ["CodeIn adalah komunitas teknologi tempat belajar bareng dan saling memamerkan karya.",
            "Motto kami: Get in, Learn and Grow with CodeIn.",
            "Mau bergabung atau punya ide kegiatan? Hubungi admin CodeIn lewat grup komunitas.",
            "Kredit kota: perabot, lantai, dan dinding ruangan dari Top-Down Retro Interior karya Penzilla. Musik dari High Quality 16-bit RPG Music karya Hydrogene (CC0)."],
    },
    rencana: {
      judul: "Rencana kota",
      baris: ["Sudah: kota, baliho, obrolan.", "Rumah proyek, Kantor Redaksi.", "Warkop: menunggu kontributor."],
      isi: ["Kota ini dibangun bertahap."],
      daftar: ["Sudah jadi: kota yang bisa dijelajahi, baliho dan videotron, pengunjung lain dan obrolan, Markas dan Galeri yang bisa dimasuki, warga dengan jadwal pagi sampai malam.",
               "Warkop CodeIn sengaja dikunci sampai ada anggota yang mau ikut membangun kota ini.",
               "Hosting proyek: anggota mendaftar lewat Kak Rani, unggah zip, situsnya tayang. Proyek unggulan dapat rumah di kota.",
               "Kantor Redaksi CodeIn News: Eko, Tekno, dan Rina bekerja sesuai kabar yang benar-benar masuk."],
    },
  },

  // Warga dan jadwal hariannya (lihat js/warga.js). Koordinat = tile [x, y] di peta.
  //   jadwal.<waktu>: {di: [x, y], r: jarak jalan-jalan kecil di sekitar titik itu (tile), ket, ucapan}
  //                   {rute: [[x, y], ...], laju, ket, ucapan}   berjalan berkeliling melewati titik-titik itu
  //                   {pulang: true}                              pulang dan masuk rumah (rumahnya dicari dari peta)
  //   ket = keterangan tempat, dipakai saat rumahnya diketuk ("Bu Sari sedang di luar, ada di ...").
  //   ucapan = kalimat saat disapa. {kabar} diganti judul kabar paling ramai, {pengumuman} diganti pengumuman terbaru.
  //   ruang = peta selain kota (Markas, Galeri): warga di sana berjaga di satu titik dan tidak punya jadwal.
  //   Redaktur di Kantor Redaksi bukan warga: mereka diatur js/redaksi.js dari data CodeIn News.
  warga: [
    {nama: "Bu Sari", karakter: 3, jadwal: {
      pagi:  {di: [15, 22], r: 2, ket: "di depan Papan Pengumuman",
              ucapan: ["Pagi! Aku selalu baca Papan Pengumuman dulu sebelum ke mana-mana.", "Pengumuman terbaru: {pengumuman}"]},
      siang: {di: [31, 11], r: 2, ket: "di depan videotron",
              ucapan: ["Siang begini enaknya nonton videotron. Yang lagi ramai: {kabar}", "Gedung beratap oranye itu CodeIn News. Masuk saja, bacaannya gratis."]},
      sore:  {di: [36, 24], r: 2, ket: "di alun-alun, dekat patung",
              ucapan: ["Sore yang adem. Patung di tengah itu namanya Si Pemula.", "Buku Harian sore terbit jam 16.30 di CodeIn News."]},
      malam: {pulang: true}}},
    {nama: "Bang Jo", karakter: 0, jadwal: {
      pagi:  {di: [13, 33], r: 2, ket: "di depan Markas CodeIn",
              ucapan: ["Pagi! Markas sudah buka. Mau daftar hosting atau baliho? Kak Rani jaga di meja resepsionis.", "Di dalam Markas ada patung pendiri CodeIn. Mampir lihat."]},
      siang: {di: [39, 11], r: 2, ket: "di depan Galeri Showcase",
              ucapan: ["Lagi lihat-lihat karya anggota di Galeri.", "Punya proyek? Pajang di baliho, gratis."]},
      sore:  {di: [23, 33], r: 1, ket: "di depan Warkop CodeIn",
              ucapan: ["Warkop ini masih dikunci. Katanya buat anggota yang mau ikut membangun kota.", "Sore-sore begini enaknya ngopi. Sayang belum buka."]},
      malam: {pulang: true}}},
    {nama: "Dika", karakter: 2, jadwal: {
      pagi:  {di: [60, 30], r: 1, ket: "di taman baliho selatan",
              ucapan: ["Pagi. Peregangan dulu di taman sambil baca baliho."]},
      siang: {di: [47, 33], r: 2, ket: "di depan Toko Mbak Tika",
              ucapan: ["Nunggu Mbak Tika. Katanya tokonya sebentar lagi ada isinya.", "Kalau ada pengunjung lain, kamu bisa lihat mereka jalan-jalan di sini."]},
      sore:  {di: [44, 24], r: 2, ket: "di alun-alun",
              ucapan: ["Mau ngobrol sama pengunjung lain? Tekan Enter, ketik, lalu Enter lagi.", "Sore ini alun-alun ramai, ya."]},
      malam: {pulang: true}}},
    {nama: "Pak Harun", karakter: 4, jadwal: {
      pagi:  {di: [75, 11], r: 1, ket: "di pos dekat Gerbang Timur",
              ucapan: ["Pagi. Mobil pertama sudah lewat gerbang dari subuh.", "Jalan ke luar kota belum dibuka untuk pejalan kaki."]},
      siang: {di: [75, 11], r: 1, ket: "di pos dekat Gerbang Timur",
              ucapan: ["Siang ramai mobil. Tenang, sopirnya berhenti kalau ada yang menyeberang."]},
      sore:  {di: [75, 11], r: 1, ket: "di pos dekat Gerbang Timur",
              ucapan: ["Sebentar lagi giliran jaga malam. Eh, yang jaga aku juga."]},
      malam: {di: [75, 11], r: 1, ket: "berjaga malam di Gerbang Timur",
              ucapan: ["Malam begini aku jaga gerbang. Warga lain sudah pulang.", "Kalau lewat alun-alun, lampunya sudah nyala semua."]}}},
    {nama: "Mbak Tika", karakter: 1, jadwal: {
      pagi:  {di: [46, 33], r: 1, ket: "membuka tokonya di selatan alun-alun",
              ucapan: ["Pagi! Lagi buka toko. Isinya belum ada, sabar, ya.", "Baliho di kota ini boleh dipakai anggota, gratis."]},
      siang: {di: [46, 33], r: 1, ket: "di depan tokonya",
              ucapan: ["Tokoku memang belum bisa dimasuki. Nanti, kalau kotanya makin ramai."]},
      sore:  {di: [62, 20], r: 1, ket: "di lapak pojok pasar",
              ucapan: ["Sore aku pindah jaga lapak di pojok pasar.", "Punya proyek? Daftar baliho lewat Kak Rani di Markas."]},
      malam: {pulang: true}}},
    {nama: "Nek Ijah", karakter: 5, jadwal: {
      pagi:  {rute: [[10, 47], [30, 47]], laju: 16, ket: "jalan pagi di gang kampung",
              ucapan: ["Pagi, Nak. Nenek jalan pagi dulu.", "Pelan-pelan saja jalannya."]},
      siang: {di: [18, 22], r: 2, ket: "istirahat di taman Papan Pengumuman",
              ucapan: ["Nenek istirahat dulu di taman. Panas."]},
      sore:  {di: [35, 24], r: 1, ket: "di alun-alun",
              ucapan: ["Sore begini Nenek suka lihat anak-anak lari keliling air mancur."]},
      malam: {pulang: true}}},
    {nama: "Rafi", karakter: 2, jadwal: {
      pagi:  {di: [22, 11], r: 2, ket: "di depan CodeIn News",
              ucapan: ["Pagi! Buku Harian pagi sudah terbit jam 06.45. Aku mau baca dulu.", "Masuk saja ke CodeIn News, gratis kok."]},
      siang: {rute: [[36, 18], [43, 18], [43, 23], [36, 23]], laju: 42, ket: "di alun-alun, lari keliling air mancur",
              ucapan: ["Aku lagi lomba lari keliling air mancur sama Lia!"]},
      sore:  {di: [31, 11], r: 2, ket: "di depan videotron",
              ucapan: ["Aku nunggu kabar sore di videotron. Yang ramai sekarang: {kabar}"]},
      malam: {pulang: true}}},
    {nama: "Lia", karakter: 1, jadwal: {
      pagi:  {di: [20, 12], r: 1, ket: "dekat zebra cross depan CodeIn News",
              ucapan: ["Kalau mau nyeberang, lewat zebra cross. Mobilnya pasti berhenti."]},
      siang: {di: [40, 11], r: 2, ket: "di depan Galeri Showcase",
              ucapan: ["Aku suka lihat baliho. Ada yang pasang proyek baru belum, ya?"]},
      sore:  {di: [42, 24], r: 2, ket: "di alun-alun",
              ucapan: ["Kak, tadi Rafi menang lomba lari. Besok gantian aku."]},
      malam: {pulang: true}}},
    {nama: "Om Budi", karakter: 4, jadwal: {
      pagi:  {rute: [[41, 39], [41, 46]], ket: "jalan pagi di jalan kampung",
              ucapan: ["Pagi! Jalan kaki keliling kampung dulu, biar sehat."]},
      siang: {di: [48, 33], r: 1, ket: "di depan Toko Mbak Tika",
              ucapan: ["Rumah yang masih kosong itu untuk proyek unggulan. Mau situsmu dihosting? Daftar saja lewat Kak Rani di Markas."]},
      sore:  {rute: [[41, 39], [41, 60]], ket: "jalan sore ke arah Gerbang Selatan",
              ucapan: ["Tiap sore aku jalan kaki sampai dekat Gerbang Selatan."]},
      malam: {rute: [[26, 18], [53, 18], [53, 23], [26, 23]], laju: 18, ket: "jalan santai di alun-alun",
              ucapan: ["Malam-malam jalan santai di bawah lampu alun-alun. Tenang rasanya.", "Warga lain sudah pulang. Tinggal aku dan Pak Harun yang masih di luar."]}}},
    // Resepsionis Markas: semua pendaftaran (hosting proyek, baliho) lewat dia; dialognya dibuat di js/warga.js
    {nama: "Kak Rani", karakter: 1, ruang: "markas", di: [16, 7], hadap: "bawah", peran: "resepsionis", ket: "di meja resepsionis Markas CodeIn",
     salam: {pagi: "Selamat pagi, selamat datang di Markas CodeIn!", siang: "Selamat siang, selamat datang di Markas CodeIn!",
             sore: "Selamat sore, selamat datang di Markas CodeIn!", malam: "Malam-malam mampir? Markas tetap buka, aku piket malam."}},
    {nama: "Kak Mita", karakter: 3, ruang: "galeri", di: [3, 9], hadap: "kanan", buka: "galeri", ket: "di Galeri Showcase"},
  ],
};

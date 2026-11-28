/* CodeIn City · pengaturan dan isi teks.
   Berkas ini yang paling sering diubah: isi papan pengumuman, teks gedung, dan ucapan warga.
   Letak gedung dan pintu TIDAK diatur di sini, tetapi di peta (assets/maps/*.tmj, dibuka dengan Tiled). */

const KOTA = {
  nama: "CodeIn City",
  ubin: 16,                  // ukuran satu tile dalam piksel
  versiPeta: 4,               // naikkan saat tata letak peta kota berubah, supaya posisi tersimpan yang lama tidak dipakai
  kecepatan: 74,             // kecepatan jalan pemain (piksel dunia per detik)

  // Alamat CodeIn News. Isi baliho dan videotron diambil dari sini, pengajuan baliho juga dikirim ke sini (lihat js/papan.js).
  news: "https://news.codeinhub.my.id",
  // Domain utama. Situs proyek anggota tayang di <nama>.<domain> (lihat js/rumah.js).
  domain: "codeinhub.my.id",
  // Alamat layanan "ramai" (pengunjung lain dan obrolan, lihat js/ramai.js dan bagian "Layanan ramai" di README). Kosongkan untuk mematikan.
  live: "wss://live.codeinhub.my.id",
  // Login warga (Firebase Authentication, hanya login Google). Isinya disalin dari Firebase Console > Project settings > Your apps.
  // Nilai ini memang publik (ikut tayang di JavaScript); yang menjaga adalah daftar Authorized domains di Firebase dan
  // pemeriksaan token di server CodeIn News. Kosongkan apiKey untuk mematikan login: kota tetap jalan, hanya tanpa fitur warga.
  firebase: {apiKey: "AIzaSyCkoS9aR97PURBoviTtPCdMiPqEH2IwCsM", authDomain: "codein-city.firebaseapp.com",
             projectId: "codein-city", appId: "1:945212767826:web:39ad37be63733b26af698b"},
  // Pilihan warna pita baliho. Harus sama dengan SWATCHES di server CodeIn News (dashboard/services/billboards.py).
  warna: ["#E9A23B", "#2A9D8F", "#E06D53", "#5466D1", "#3E9E5A", "#C94F7C"],

  // Karakter yang bisa dipilih pengunjung. Urutannya = urutan di assets/sprites/orang.png (tools/gambar_orang.py):
  // 0-5 karakter Kenney, 6-11 karakter dari paket CodeIn City Retro yang digambar ulang bergaya Kenney.
  // Karakter 12 (Jull pemula) tidak bisa dipilih: dipakai untuk Patung Pendiri.
  karakter: [
    {nama: "Kaos hijau"}, {nama: "Kaos merah"}, {nama: "Rambut perak"}, {nama: "Helm kuning"}, {nama: "Kepala plontos"}, {nama: "Bando oranye"},
    {nama: "Hoodie biru"}, {nama: "Mahasiswi"}, {nama: "Bocil bertopi"}, {nama: "Ibu warung"}, {nama: "Kakek"}, {nama: "Nenek"},
  ],
  lembarOrang: 13,           // jumlah karakter di orang.png, termasuk yang tidak bisa dipilih

  // Pembagian waktu WIB untuk jadwal warga dan tulisan di bilah atas. mulai = jam mulai (sampai jam mulai waktu berikutnya).
  waktu: [
    {kunci: "pagi",  nama: "Pagi",  mulai: 6},
    {kunci: "siang", nama: "Siang", mulai: 11},
    {kunci: "sore",  nama: "Sore",  mulai: 15},
    {kunci: "malam", nama: "Malam", mulai: 18},
  ],

  // Patung. Kuncinya = properti "jenis" titik "patung" di peta. karakter = gambar karakter yang dijadikan patung.
  patung: {
    pemula:  {karakter: 0, bahan: "perunggu"},     // tengah air mancur alun-alun
    pendiri: {karakter: 12, bahan: "batu"},         // dinding utara Markas CodeIn
  },

  // Isi dialog. Kuncinya = properti "id" pintu di peta (atau properti "tujuan" bila id-nya tidak ada di sini).
  // tombol: {teks, url} membuka alamat, {teks, pintu} masuk lewat pintu itu, tanpa keduanya = tutup.
  // Galeri Showcase, baliho, dan videotron tidak ada di sini: isinya hidup, diambil dari CodeIn News oleh js/papan.js.
  panel: {
    papan: {
      judul: "Papan Pengumuman",
      // tiga yang teratas ikut tampil di papan gabus di kota
      daftar: [
        "Baru: buka lahan di Kebun Kota (100 koin, masuk Kas Markas) dan tulis salam di buku tamu rumah warga lewat kotak suratnya.",
        "CodeIn City 2.0: sungai berjembatan, Menara Jam Server di alun-alun, dan Galeri Komunitas berisi foto kegiatan. Cuacanya ikut cuaca asli Bengkulu.",
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
            "Delman dan sepeda keluar masuk lewat sini. Kota ini bertambah luas seiring bertambahnya proyek anggota."],
      tombol: [{teks: "Tutup"}],
    },
    "galeri-investasi": {
      judul: "Galeri Investasi",
      isi: ["Galeri Investasi sedang dibangun bersama GIBEI (Galeri Investasi Bursa Efek Indonesia).",
            "Nanti di sini warga bisa belajar mengenal pasar modal dan investasi bareng komunitas. Pengumumannya menyusul di Papan Pengumuman dan Instagram CodeIn."],
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
            "Kredit kota: karakter dan sebagian ubin dari RPG Urban Pack karya Kenney (CC0), selebihnya digambar sendiri oleh CodeIn. Musik dari High Quality 16-bit RPG Music karya Hydrogene (CC0). Data cuaca dari Open-Meteo."],
    },
    kebun: {
      judul: "Kebun Kota",
      baris: ["12 lahan untuk warga.", "Buka 100 koin,", "masuk Kas Markas."],
      isi: ["Kebun Kota punya 12 lahan, masing-masing 4 petak. Lahan yang masih tidur bisa dibuka warga seharga 100 koin; uangnya masuk Kas Markas, kas bersama warga yang saldonya bisa dilihat di peti kas dalam Markas.",
            "Setiap menanam di lahan kota ada pajak tanam 10% dari harga jual panennya, juga untuk Kas Markas. Kebun di halaman rumah tetap bebas pajak.",
            "Satu warga satu lahan. Lahan yang 7 hari tidak ditanami atau dipanen kembali ke kota supaya warga lain kebagian. Pematangnya boleh dilewati siapa saja."],
    },
    pasar: {
      judul: "Pasar CodeIn",
      baris: ["Buka pagi sampai sore.", "Sayur, ikan, jamu, kue,", "bunga, bakso."],
      isi: ["Pasar CodeIn buka dari pagi sampai sore; malam hari pedagangnya pulang, tinggal Mas Bakso yang masih jualan.",
            "Dekati lapaknya untuk melihat nama pedagang, lalu sapa mereka."],
    },
    "info-perumahan": {
      judul: "Perumahan CodeIn",
      baris: ["Blok A: 24 kavling.", "Khusus warga.", "Rumah gratis."],
      isi: ["Perumahan CodeIn adalah tempat tinggal warga, yaitu anggota yang sudah masuk dengan akun Google.",
            "Pilih kavling yang masih kosong (bertanda papan kecil), lalu tempati. Rumah starter langsung berdiri dengan nama dan model pilihanmu. Satu warga satu kavling.",
            "Siapa pun boleh bertamu ke rumah warga. Dari menu Tempat, tombol Pulang ke rumahku mengantarmu langsung ke depan rumah.",
            "Mancing: berdiri di tepi danau atau kolam, menghadap ke air, lalu tekan Mancing. Danau Perumahan punya ikan yang lebih beragam daripada kolam Taman Kota, katanya ada arwana. Hasilnya dijual ke Pak Ikan di Pasar CodeIn."],
      daftar: ["Kotak surat di depan setiap rumah adalah buku tamunya. Tamu yang sudah login boleh menulis satu salam sehari, dan pemilik rumah disapa kabarnya di Gerbang CodeIn.",
               "Segera: komputer di rumah yang membuka situs hosting pemiliknya."],
    },
    rencana: {
      judul: "Rencana kota",
      baris: ["Sudah: kota 2.0, galeri foto.", "Mancing, kebun, perabot.", "Segera: Galeri Investasi."],
      isi: ["Kota ini dibangun bertahap."],
      daftar: ["Sudah jadi: kota yang bisa dijelajahi, baliho dan videotron, pengunjung lain dan obrolan, Markas dan Galeri yang bisa dimasuki, warga dengan jadwal pagi sampai malam.",
               "Warkop CodeIn sengaja dikunci sampai ada anggota yang mau ikut membangun kota ini.",
               "Hosting proyek: anggota mendaftar lewat Kak Rani, unggah zip, situsnya tayang. Proyek unggulan dapat rumah di kota.",
               "Kantor Redaksi CodeIn News: Eko, Tekno, dan Rina bekerja sesuai kabar yang benar-benar masuk.",
               "Perumahan CodeIn lewat Gerbang Selatan: warga yang masuk dengan akun Google bisa menempati kavling dan mendapat rumah starter.",
               "Mancing dan koin: pancing ikan di kolam Taman Kota, tepi sungai, atau danau Perumahan, jual ke Pak Ikan di Pasar CodeIn. Koinnya dipakai belanja perabot di Toko Mbak Tika.",
               "Kota 2.0: kota bergaya abad pertengahan dengan sungai dan jembatan, delman dan sepeda, Menara Jam Server, Galeri Komunitas, dan cuaca yang mengikuti Bengkulu. Galeri Investasi bersama GIBEI segera dibuka."],
    },
  },

  // Warga dan jadwal hariannya (lihat js/warga.js). Tempat = id titik "tempat" di peta kota (tools/buat_peta.py), atau tile [x, y].
  //   jadwal.<waktu>: {di: [x, y], r: jarak jalan-jalan kecil di sekitar titik itu (tile), ket, ucapan}
  //                   {rute: [[x, y], ...], laju, ket, ucapan}   berjalan berkeliling melewati titik-titik itu
  //                   {pulang: true}                              pulang dan masuk rumah (rumahnya dicari dari peta)
  //   ket = keterangan tempat, dipakai saat rumahnya diketuk ("Bu Sari sedang di luar, ada di ...").
  //   ucapan = kalimat saat disapa. {kabar} diganti judul kabar paling ramai, {pengumuman} diganti pengumuman terbaru.
  //   ruang = peta selain kota (Markas, Galeri): warga di sana berjaga di satu titik dan tidak punya jadwal.
  //   Redaktur di Kantor Redaksi bukan warga: mereka diatur js/redaksi.js dari data CodeIn News.
  warga: [
    {nama: "Bu Sari", karakter: 2, jadwal: {
      pagi:  {di: "depan-papan", r: 2, ket: "di depan Papan Pengumuman",
              ucapan: ["Pagi! Aku selalu baca Papan Pengumuman dulu sebelum ke mana-mana.", "Pengumuman terbaru: {pengumuman}"]},
      siang: {di: "depan-videotron", r: 2, ket: "di depan videotron",
              ucapan: ["Siang begini enaknya nonton videotron. Yang lagi ramai: {kabar}", "Gedung beratap oranye itu CodeIn News. Masuk saja, bacaannya gratis."]},
      sore:  {di: "dekat-patung", r: 2, ket: "di taman kota, dekat patung",
              ucapan: ["Sore yang adem. Patung di tengah itu namanya Si Pemula.", "Buku Harian sore terbit jam 16.30 di CodeIn News."]},
      malam: {pulang: true}}},
    {nama: "Bang Jo", karakter: 3, jadwal: {
      pagi:  {di: "depan-markas", r: 2, ket: "di depan Markas CodeIn",
              ucapan: ["Pagi! Markas sudah buka. Mau daftar hosting atau baliho? Kak Rani jaga di meja resepsionis.", "Di dalam Markas ada patung pendiri CodeIn. Mampir lihat."]},
      siang: {di: "depan-galeri-komunitas", r: 2, ket: "di depan Galeri Komunitas, seberang jembatan batu",
              ucapan: ["Ada gedung baru: Galeri Komunitas. Isinya foto kegiatan CodeIn, masuk saja.", "Punya proyek? Pajang di baliho, gratis."]},
      sore:  {di: "depan-warkop", r: 1, ket: "di depan Warkop CodeIn",
              ucapan: ["Warkop ini masih dikunci. Katanya buat anggota yang mau ikut membangun kota.", "Sore-sore begini enaknya ngopi. Sayang belum buka."]},
      malam: {pulang: true}}},
    {nama: "Dika", karakter: 6, jadwal: {
      pagi:  {di: "taman-baliho", r: 1, ket: "duduk-duduk di taman baliho",
              ucapan: ["Pagi. Peregangan dulu di taman sambil baca baliho."]},
      siang: {di: "depan-toko", r: 2, ket: "di depan Toko Mbak Tika",
              ucapan: ["Toko Mbak Tika sekarang jual perabot. Aku lagi nabung koin buat beli sofa.", "Kalau ada pengunjung lain, kamu bisa lihat mereka jalan-jalan di sini."]},
      sore:  {di: "depan-menara", r: 2, ket: "di alun-alun, dekat Menara Jam Server",
              ucapan: ["Mau ngobrol sama pengunjung lain? Tekan Enter, ketik, lalu Enter lagi.",
                       "Lampu jendela Menara Jam itu hijau kalau server CodeIn sehat. Kalau kuning, admin lagi turun tangan."]},
      malam: {pulang: true}}},
    {nama: "Pak Harun", karakter: 10, jadwal: {
      pagi:  {di: "pos-timur", r: 1, ket: "di pos dekat Gerbang Timur",
              ucapan: ["Pagi. Delman pertama sudah lewat gerbang dari subuh.", "Jalan ke luar kota belum dibuka untuk pejalan kaki.",
                       "Gedung beratap toska di seberang jembatan itu Galeri Komunitas. Isinya foto-foto kegiatan CodeIn."]},
      siang: {di: "pos-timur", r: 1, ket: "di pos dekat Gerbang Timur",
              ucapan: ["Siang ramai delman dan sepeda. Tenang, kusirnya berhenti kalau ada yang menyeberang.",
                       "Galeri Investasi sebelah itu masih dibangun. Katanya bareng GIBEI, buat belajar pasar modal."]},
      sore:  {di: "pos-timur", r: 1, ket: "di pos dekat Gerbang Timur",
              ucapan: ["Sebentar lagi giliran jaga malam. Eh, yang jaga aku juga."]},
      malam: {di: "pos-timur", r: 1, ket: "berjaga malam di Gerbang Timur",
              ucapan: ["Malam begini aku jaga gerbang. Warga lain sudah pulang.", "Kalau lewat taman kota, lampunya sudah nyala semua."]}}},
    // Mbak Tika menjaga kasir di dalam tokonya (ruang "toko"): beli perabot dan jual perabot yang tidak terpasang (js/toko.js)
    {nama: "Mbak Tika", karakter: 9, ruang: "toko", di: [7, 4], hadap: "bawah", peran: "kasir", ket: "menjaga kasir di Toko Mbak Tika"},
    {nama: "Nek Ijah", karakter: 11, jadwal: {
      pagi:  {rute: ["gang-barat-1", "gang-barat-2"], laju: 16, ket: "jalan pagi di gang kampung",
              ucapan: ["Pagi, Nak. Nenek jalan pagi dulu.", "Pelan-pelan saja jalannya."]},
      siang: {di: "gazebo", r: 1, ket: "istirahat di gazebo taman kota",
              ucapan: ["Nenek istirahat dulu di gazebo. Adem di sini."]},
      sore:  {di: "taman-kolam", r: 1, ket: "di tepi kolam taman kota",
              ucapan: ["Sore begini Nenek suka lihat ikan di kolam taman.", "Mau mancing? Berdiri di tepi kolam atau sungai, menghadap ke air. Ikannya jual ke Pak Ikan di pasar.",
                       "Dulu tempat ini masih sawah semua, Nak."]},
      malam: {pulang: true}}},
    {nama: "Rafi", karakter: 8, jadwal: {
      pagi:  {di: "depan-news", r: 2, ket: "di depan CodeIn News",
              ucapan: ["Pagi! Buku Harian pagi sudah terbit jam 06.45. Aku mau baca dulu.", "Masuk saja ke CodeIn News, gratis kok."]},
      siang: {rute: ["patung-1", "patung-2", "patung-3", "patung-4"], laju: 42, ket: "di taman kota, lari keliling air mancur",
              ucapan: ["Aku lagi lomba lari keliling air mancur sama Lia!"]},
      sore:  {di: "lapangan-1", r: 0, ket: "main badminton dengan Lia di lapangan kampung",
              ucapan: ["Lagi main badminton sama Lia! Skornya 15-13, aku unggul.", "Sore-sore paling enak main di lapangan kampung."]},
      malam: {pulang: true}}},
    {nama: "Lia", karakter: 5, jadwal: {
      pagi:  {di: "zebra-news", r: 1, ket: "di depan CodeIn News",
              ucapan: ["Hati-hati nyeberang, delman sering lewat. Kudanya baik kok, pasti berhenti.", "Aku suka dengar bunyi kring sepeda pagi-pagi."]},
      siang: {di: "depan-galeri", r: 2, ket: "di depan Galeri Showcase",
              ucapan: ["Aku suka lihat baliho. Ada yang pasang proyek baru belum, ya?"]},
      sore:  {di: "lapangan-2", r: 0, ket: "main badminton dengan Rafi di lapangan kampung",
              ucapan: ["Rafi curang, smash terus! Tapi tadi siang aku menang lomba lari.", "Mau ikut main? Raketnya cuma dua, hehe."]},
      malam: {pulang: true}}},
    {nama: "Om Budi", karakter: 4, jadwal: {
      pagi:  {rute: ["kampung-1", "kampung-2"], ket: "jalan pagi di jalan kampung",
              ucapan: ["Pagi! Jalan kaki keliling kampung dulu, biar sehat."]},
      siang: {di: "depan-aetheria", r: 1, ket: "di depan menara Aetheria",
              ucapan: ["Rumah yang masih kosong itu untuk proyek unggulan. Mau situsmu dihosting? Daftar saja lewat Kak Rani di Markas."]},
      sore:  {di: "tepi-sungai", r: 1, ket: "mancing di tepi sungai",
              ucapan: ["Sore begini ikan sungai lagi rajin makan. Coba mancing di sini juga.", "Kalau Bengkulu lagi hujan, ikannya lebih cepat makan umpan, lho."]},
      malam: {rute: ["cincin-1", "cincin-2", "cincin-3", "cincin-4"], laju: 18, ket: "jalan santai di taman kota",
              ucapan: ["Malam-malam jalan santai di bawah lentera taman kota. Tenang rasanya.", "Warga lain sudah pulang. Tinggal aku dan Pak Harun yang masih di luar."]}}},
    // Satpam di gapura Perumahan CodeIn: keterangan perumahan, antar pulang, ganti warna rumah (dialognya di js/perumahan.js)
    {nama: "Pak Darto", karakter: 4, ruang: "perumahan", di: [59, 6], hadap: "kiri", peran: "satpam", ket: "jaga di gapura Perumahan CodeIn"},
    // Resepsionis Markas: semua pendaftaran (hosting proyek, baliho) lewat dia; dialognya dibuat di js/warga.js
    {nama: "Kak Rani", karakter: 7, ruang: "markas", di: [16, 8], hadap: "bawah", peran: "resepsionis", ket: "di meja resepsionis Markas CodeIn",
     salam: {pagi: "Selamat pagi, selamat datang di Markas CodeIn!", siang: "Selamat siang, selamat datang di Markas CodeIn!",
             sore: "Selamat sore, selamat datang di Markas CodeIn!", malam: "Malam-malam mampir? Markas tetap buka, aku piket malam."}},
    // Pasar CodeIn di timur taman kota. Pedagang berdiri di bawah tenda lapaknya; namanya muncul kalau didekati (pedagang: true).
    // Mereka tidak tinggal di kampung: malam hari pasar tutup dan mereka pulang (tidak terlihat).
    // Bu Sayur juga membeli hasil kebun warga (beli: "panen")
    ...[["Bu Sayur", 9, "lapak-sayur", ["Panen dari kebun rumahmu? Bawa ke sini, kubeli.", "Sayurnya baru dipetik subuh tadi, masih segar!"], {beli: "panen", malam: "sayur"}],
        ["Pak Buah", 4, "lapak-buah", ["Jeruk manis, pisang, mangga. Mau dicicip dulu?", "Kalau beli sekilo, kukasih bonus satu."]],
        // Pak Ikan juga membeli hasil mancing warga (beli: "ikan", lihat js/ekonomi.js) dan tetap buka sampai malam
        ["Pak Ikan", 3, "lapak-ikan", ["Dapat ikan dari kolam? Jual ke aku, kubeli harga pas.", "Ikan laut Bengkulu, tadi pagi baru turun dari kapal.",
          "Arwana dari danau Perumahan? Kalau dapat, kubeli mahal!"], {beli: "ikan", malam: "ikan bakar"}],
        ["Mbak Kain", 5, "lapak-kain", ["Kain batik besurek, khas Bengkulu. Motifnya kaligrafi.", "Cocok buat seragam komunitas, lho."]],
        ["Nek Jamu", 11, "lapak-jamu", ["Jamu kunyit asam, beras kencur. Biar kuat ngoding sampai malam.", "Sudah empat puluh tahun Nenek jualan jamu di sini."]],
        ["Bu Kue", 1, "lapak-kue", ["Kue lapis, klepon, onde-onde. Masih hangat!", "Pesanan untuk acara Markas juga bisa."]],
        ["Pak Mainan", 2, "lapak-mainan", ["Gasing, layangan, kelereng. Mainan zaman dulu, sekarang dicari lagi.", "Rafi tadi beli layangan, katanya buat lomba."]],
        ["Pak Kelapa", 10, "lapak-kelapa", ["Es kelapa muda, segar buat siang bolong.", "Kelapanya dari kebun sendiri di Rejang Lebong."]],
        ["Pak Tahu", 0, "lapak-tahu", ["Tahu dan tempe goreng, baru diangkat. Masih kriuk!", "Tempenya bikinan sendiri, kedelainya pilihan."]],
        ["Bu Rempah", 9, "lapak-rempah", ["Kunyit, jahe, lengkuas, kayu manis. Mau masak apa hari ini?", "Rempah Bengkulu terkenal sampai luar negeri, lho."]],
        ["Mbak Bunga", 7, "lapak-bunga", ["Bunga melati dan mawar, buat hiasan rumah di Perumahan.", "Rumah baru? Kasih bunga di teras biar segar."]]]
      .map(([nama, karakter, di, ucapan, lain = {}]) => {
        const buka = {di, r: 0, hadap: "bawah", ket: "berjualan di pasar", ucapan};
        const malam = lain.malam ? {...buka, ket: `jualan ${lain.malam} di pasar`} : {pulang: true};
        return {nama, karakter, pedagang: true, angkat: 8, beli: lain.beli, jadwal: {pagi: buka, siang: buka, sore: buka, malam}};
      }),
    // pembeli yang berkeliling pasar dari pagi sampai sore
    ...[["Bu Ani", 7, ["pasar-1", "pasar-5", "pasar-2", "pasar-3", "pasar-6", "pasar-4"], "Belanja buat masak siang. Sayur di Bu Sayur paling murah."],
        ["Pak Udin", 0, ["pasar-2", "pasar-1", "pasar-4", "pasar-6", "pasar-3"], "Cari kelapa muda buat istri. Panas sekali hari ini."],
        ["Tante Rosa", 5, ["pasar-5", "pasar-4", "pasar-3", "pasar-1", "pasar-6"], "Mau beli kain besurek buat arisan. Kamu ikut ke pasar juga?"]]
      .map(([nama, karakter, rute, kata]) => {
        const j = {rute, laju: 22, ket: "berbelanja di pasar", ucapan: [kata]};
        return {nama, karakter, pedagang: true, jadwal: {pagi: j, siang: j, sore: j, malam: {pulang: true}}};
      }),
    // Pedagang dan tukang ojek di kota. Tidak punya rumah di kampung: malam hari tetap di tempatnya.
    {nama: "Mas Bakso", karakter: 3, jadwal: {
      pagi:  {di: "gerobak-bakso", r: 0, ket: "menyiapkan gerobak bakso di Pasar CodeIn",
              ucapan: ["Pagi! Kuahnya baru dimasak, siang nanti baru siap.", "Gerobak ini kubeli dari hasil jualan tiga tahun, lho."]},
      siang: {di: "gerobak-bakso", r: 1, ket: "jualan bakso di Pasar CodeIn",
              ucapan: ["Bakso, bakso! Satu mangkuk buat yang lagi ngoding?", "Pelanggan setiaku Eko dari CodeIn News. Kalau kabar sepi, dia mampir ke sini."]},
      sore:  {di: "gerobak-bakso", r: 1, ket: "jualan bakso di Pasar CodeIn",
              ucapan: ["Sore ramai, banyak yang pulang dari Markas.", "Yang lagi ramai di videotron: {kabar}"]},
      malam: {di: "gerobak-bakso", r: 0, ket: "masih jualan bakso di Pasar CodeIn",
              ucapan: ["Bakso malam paling enak. Tinggal sepuluh mangkuk lagi.", "Kunang-kunang keluar dari pohon dekat sini kalau malam."]}}},
    // Kak Nara, pemandu kota: menjelaskan kota 2.0 dan bisa mengantar pengunjung ke tempat penting (js/warga.js pemandu)
    {nama: "Kak Nara", karakter: 6, peran: "pemandu", jadwal: {
      pagi:  {di: "halte", r: 1, ket: "menyambut pengunjung di dekat sumur utara"},
      siang: {di: "depan-menara", r: 1, ket: "di alun-alun, dekat Menara Jam Server"},
      sore:  {di: "depan-galeri-komunitas", r: 1, ket: "di depan Galeri Komunitas, seberang jembatan batu"},
      malam: {di: "alun-alun", r: 1, ket: "jalan santai di alun-alun"}}},
    {nama: "Kak Mita", karakter: 1, ruang: "galeri", di: [2, 9], hadap: "bawah", buka: "galeri", ket: "di Galeri Showcase"},
  ],
};

# CodeIn City

Kota kecil bergaya RPG piksel sebagai halaman depan komunitas CodeIn (`codeinhub.my.id`). Pengunjung memilih karakter, berjalan-jalan di kota, dan masuk ke gedung. Setiap gedung mewakili satu proyek komunitas. Gedung pertama adalah **CodeIn News** (`news.codeinhub.my.id`).

Situs ini statis: hanya HTML, CSS, dan JavaScript, tanpa server dan tanpa proses build. Satu-satunya data dari luar adalah isi baliho dan videotron, yang diambil dari API publik CodeIn News.

## Fitur

- Layar judul: enam pilihan karakter dan nama panggilan dengan penyaring kata kasar.
- Jalan dengan WASD atau tombol panah. Di ponsel, sentuh layar lalu geser.
- Kota 80 x 64 petak: jalan utama dengan tiga gerbang, alun-alun dengan air mancur dan Patung Si Pemula, pojok pasar, dan kampung warga di selatan.
- Gedung: Kantor Redaksi CodeIn News, Galeri Showcase, dan Markas CodeIn (bisa dimasuki), Warkop CodeIn dan dua gedung lain (belum buka), Toko Mbak Tika.
- **Pengunjung lain terlihat** di kota dan di dalam gedung, lengkap dengan nama. Jumlah orang tampil di bilah atas.
- **Obrolan**: tekan Enter (atau T), ketik, lalu Enter. Pesan muncul sebagai balon di atas kepala dan di daftar obrolan. Tidak ada riwayat yang disimpan.
- **Videotron** di sebelah CodeIn News: lima kabar yang sedang ramai dalam 24 jam, berganti tiap 6 detik.
- **Enam baliho** (empat di jalan utama, dua di taman selatan) berisi proyek anggota. Nomor baliho sama dengan nomor slot billboard di CodeIn News. Di dalam Galeri, keenamnya dipajang sebagai karya di dinding.
- Pengajuan baliho lewat Kak Rani di Markas. Admin memutuskan di halaman admin CodeIn News.
- **Papan Pengumuman** berupa papan gabus: tiga pengumuman teratas terbaca langsung dari jauh.
- Sebelas warga yang bisa disapa, sepuluh di antaranya punya rumah di kampung. Warga kota punya jadwal pagi, siang, sore, dan malam (WIB): berjalan ke tempatnya lewat trotoar dan zebra cross, jalan-jalan kecil di sekitarnya, dan malam hari sebagian besar pulang ke rumah.
- Markas CodeIn: Patung Pendiri dengan plakat, dan Kak Rani di meja resepsionis yang membacakan pengumuman terbaru.
- **Kantor Redaksi CodeIn News**: Eko (ekonomi), Tekno (teknologi), dan Rina (berita umum) bekerja sesuai kabar yang benar-benar masuk: mengetik di meja dengan layar menyala, ngopi di dapur saat sepi, tertidur saat malam, dan rapat bersama saat bagian penting sistem bermasalah. Sapa mereka untuk melihat kabar yang mereka olah dan membuka Buku Harian; terminal di dekat pintu membuka `news.codeinhub.my.id`.
- Warkop CodeIn sengaja dikunci sebagai tantangan untuk anggota yang mau ikut membangun kota.
- **Hosting proyek lewat Kak Rani**: semua pendaftaran (hosting proyek dan baliho) dilakukan di meja resepsionis Markas. Anggota mendaftar, admin menyetujui di CodeIn News, anggota mengunggah zip situsnya di `rumah.codeinhub.my.id` (wajib menyetujui [Aturan Rumah Proyek](https://rumah.codeinhub.my.id/aturan)), lalu situsnya tayang di `<nama>.codeinhub.my.id` dan tercantum di **Direktori Proyek**. Empat rumah di kota (dua gedung dan dua rumah kampung) adalah hadiah untuk proyek unggulan pilihan admin.
- Kendaraan masuk dan keluar lewat gerbang, dan berhenti kalau ada orang di depannya.
- Tombol **Tempat** untuk berpindah langsung ke depan gedung tanpa berjalan. Papan bisa diketuk atau diklik dari jauh.
- Siang dan malam mengikuti jam WIB, dengan lampu jalan yang menyala dan kunang-kunang di sela pepohonan saat malam.
- **Musik latar** 16-bit: lagu kota siang, kota malam, di dalam gedung, dan Galeri. Tombol ♪ di bilah atas mematikannya, dan pilihannya diingat di browser pengunjung. Musik baru diputar setelah pengunjung menekan sesuatu (aturan browser).
- Gaya piksel retro 16 x 16 yang seragam di luar dan di dalam gedung: gedung ikonik (Markas berbendera, Galeri berkubah kaca, CodeIn News dengan menara radio, menara Aetheria), rumah warga, kendaraan empat arah (sedan, SUV, angkot, motor, ojol), dan perabot ruangan.
- Posisi terakhir diingat, sehingga pengunjung yang kembali dari CodeIn News muncul di depan gedungnya.

## Struktur berkas

| Berkas | Isi |
|---|---|
| `index.html` | Kerangka halaman: kanvas, bilah atas, dialog, layar judul |
| `css/style.css` | Tampilan antarmuka |
| `js/config.js` | **Isi yang paling sering diubah**: teks gedung, papan pengumuman, papan Markas, daftar warga dan ucapannya |
| `js/profil.js` | Karakter dan nama pengunjung (disimpan di browser pengunjung), penyaring nama |
| `js/panel.js` | Dialog dan daftar tempat |
| `js/papan.js` | Papan HTML: baliho, videotron, Papan Pengumuman, papan Markas, dialog Galeri, dan formulir pengajuan baliho |
| `js/kendali.js` | Kendali sentuh |
| `js/kota.js` | Adegan (Phaser) untuk semua peta: pemain, pintu, masuk dan keluar gedung, patung, siang dan malam |
| `js/redaksi.js` | Kantor Redaksi: Eko, Tekno, dan Rina; keadaannya dihitung dari API publik CodeIn News, dialog tiap redaktur |
| `js/rumah.js` | Hosting proyek anggota: formulir pendaftaran, Direktori Proyek, dan nama proyek unggulan di pintu rumahnya (data dari CodeIn News) |
| `js/warga.js` | Warga dan jadwal hariannya: pencarian jalur, jalan-jalan kecil, pulang ke rumah, ucapan per waktu |
| `js/lalulintas.js` | Kendaraan yang mengikuti jalur di peta dan berhenti untuk pejalan kaki |
| `js/ramai.js` | Pengunjung lain dan obrolan (WebSocket ke layanan ramai) |
| `js/musik.js` | Musik latar: pilih lagu menurut tempat dan waktu, tombol musik |
| `js/judul.js` | Layar judul |
| `js/main.js` | Titik mulai |
| `assets/maps/kota.tmj` | Peta kota (format Tiled) |
| `assets/maps/markas.tmj`, `galeri.tmj`, `redaksi.tmj` | Peta ruangan Markas CodeIn, Galeri Showcase, dan Kantor Redaksi |
| `assets/tiles/retro.png` | Ubin tanah, jalan, trotoar, lantai, dan dinding (disusun `tools/buat_peta.py`) |
| `assets/sprites/benda.png`, `benda.json` | Atlas gambar benda: gedung, pohon, lampu, perabot, kendaraan, efek malam (disusun `tools/buat_aset.py`) |
| `assets/sprites/orang.png` | Lembar karakter: tujuh karakter, masing-masing 4 x 6 bingkai 16 x 16 |
| `assets/musik/*.mp3` | Musik latar (96 kbps) |
| `vendor/phaser.min.js` | Phaser 3.90.0 (lisensi MIT) |
| `tools/buat_aset.py` | Penyusun atlas benda, lembar karakter, dan musik dari folder paket aset (paket aslinya tidak disimpan di sini) |
| `tools/buat_peta.py` | Pembuat keempat peta dan `retro.png`. Sampai versi ini peta masih sama persis dengan hasil skrip. Jangan dijalankan lagi setelah peta diubah di Tiled |

Berkas JavaScript dimuat berurutan dari `index.html`, dan setiap berkas memakai isi berkas sebelumnya.

## Menjalankan di komputer sendiri

```bash
python3 -m http.server 8090
```

Lalu buka `http://localhost:8090`. Halaman tidak bisa dibuka langsung dari berkas (`file://`) karena peta dimuat lewat HTTP.

Untuk mencoba suasana waktu tertentu, tambahkan `?jam=21` di akhir alamat.

Baliho dan videotron mengambil data dari `https://news.codeinhub.my.id`, dan server itu hanya menjawab halaman yang dibuka dari `https://codeinhub.my.id`. Saat dibuka dari `localhost`, papan akan bertulisan "belum bisa dimuat", dan kota berjalan tanpa pengunjung lain. Itu wajar.

Untuk menguji lengkap di komputer sendiri, jalankan dashboard NewsAgent dan layanan ramai di komputer yang sama, lalu buka:

```
http://localhost:8090/?api=http://127.0.0.1:8787&live=ws://127.0.0.1:8790
```

`?api=` dan `?live=` hanya berlaku di `localhost`. Kedua layanan perlu diberi izin untuk alamat uji: `CORS_ORIGINS=http://localhost:8090` di `.env` NewsAgent, dan `KOTA_ORIGINS=http://localhost:8090` saat menjalankan layanan ramai.

## Layanan ramai (pengunjung lain dan obrolan)

Kota ini statis, jadi posisi pengunjung dan obrolan lewat satu layanan kecil di server CodeIn (`kota_server.py`, Python + WebSocket). Kodenya sengaja tidak disimpan di repositori ini, karena semua isi repositori ini terbit ke internet.

- Alamatnya diatur di `KOTA.live` (`js/config.js`). Kalau dikosongkan atau layanannya mati, kota tetap jalan: pengunjung lain dan kolom obrolan tidak tampil.
- Layanan hanya meneruskan pesan antar pengunjung yang sedang membuka kota. Tidak ada database dan tidak ada riwayat obrolan.
- Yang dijaga di server: hanya menerima sambungan dari `https://codeinhub.my.id`, nama disaring ulang, obrolan dibatasi 120 huruf dan satu pesan tiap dua detik, kata jorok ditolak, pesan berlebihan dibuang.

## Mengubah isi teks

Buka `js/config.js`. Isi papan pengumuman ada di `panel.papan.daftar` (tiga yang teratas tampil di papan gabus), teks setiap gedung di `panel`, papan di dinding Markas di `info`, dan warga beserta jadwal dan ucapannya di `warga` (penjelasan formatnya ada di komentar di atas daftar itu). Teks plakat Patung Pendiri ada di `panel.pendiri`. Pembagian jam pagi, siang, sore, dan malam ada di `waktu`.

Untuk mencoba jadwal warga di jam tertentu, buka `?jam=8`, `?jam=12`, `?jam=16`, atau `?jam=21`.

Isi baliho tidak diubah di sini. Baliho diisi dari halaman admin CodeIn News (`/admin`): setujui pengajuan atau ubah slot, dan dalam dua menit baliho di kota ikut berubah.

## Mengubah peta dengan Tiled

1. Pasang [Tiled](https://www.mapeditor.org/) (gratis), lalu buka `assets/maps/kota.tmj`.
2. Layer ubin, dari bawah ke atas:
   - `tanah`, `bangunan`, `hiasan`: digambar di bawah karakter.
   - `atas`: digambar di atas karakter.
   Gedung, pohon, lampu, dan perabot bukan ubin, tetapi objek di layer `benda` (lihat di bawah).
   - `tabrakan`: tidak digambar di permainan. Setiap ubin di layer ini tidak bisa dilewati, apa pun gambarnya.
3. Layer objek:
   - `pintu`: kotak interaksi. Nama objek menjadi nama gedung. Properti: `id`, `aksi` (`pindah` untuk pindah ke alamat lain, `masuk` dan `keluar` untuk berganti peta, `panel` untuk membuka dialog), `tujuan` (alamat web untuk `pindah`, nama peta untuk `masuk` dan `keluar`, atau kunci dialog di `config.js`), `ke` (`id` pintu tempat muncul setelah `keluar`), `penghuni` (nama warga untuk rumah), serta `label_x` dan `label_y` (letak papan nama, dalam piksel).
   - `benda`: titik dengan nama gambar dari atlas `benda.json` (misalnya `gedung-markas`, `pohon-cemara`, `perabot-sofa`). Letak titik = pojok kiri bawah gambar. Benda digambar berurutan menurut tepi bawahnya, jadi pengunjung bisa lewat di belakang pohon dan atap. Properti `datar` = 1 untuk benda di lantai (karpet, kolam), `geser` untuk menggeser urutannya beberapa piksel. Tapak benda tetap harus ditutup di layer `tabrakan`.
   - `titik`: `mulai` (tempat pengunjung baru muncul), `lampu` (cahaya saat malam), `patung`, dan `pancuran`.
   - `rute`: garis patah (polyline) jalur kendaraan, dari luar peta ke luar peta.
   - `papan`: kotak papan HTML. Nama objek `baliho`, `videotron`, `pengumuman`, atau `info`. Properti: `id`, `urutan` (nomor slot billboard untuk baliho, 1 sampai 6), dan `tiang` (panjang tiang di bawah papan, dalam piksel). Papan yang bisa dibaca dari dekat butuh pasangan kotak di layer `pintu` (zona baca di depannya) dengan `tanpa_label` = 1. Tapak papan dan tiangnya ditutup di layer `tabrakan`.
4. Simpan tetap dalam format JSON (`.tmj`) dengan tileset tertanam (embedded).

### Menambah gedung baru

1. Taruh gambarnya sebagai titik di layer `benda` (gambar baru ditambahkan dulu ke `tools/buat_aset.py`), lalu tutup tapaknya di layer `tabrakan`.
2. Buat kotak di layer `pintu` tepat di depan pintunya, lalu isi properti `id`, `aksi`, dan `tujuan`.
3. Untuk gedung berisi dialog, tambahkan isinya di `panel` pada `js/config.js` dengan kunci yang sama dengan `id`.
4. Untuk gedung yang bisa dimasuki, buat peta ruangannya (contoh: `markas.tmj`), daftarkan namanya di `PETA` pada `js/kota.js`, lalu pakai `aksi` = `masuk`.

## Menerbitkan

Situs diterbitkan lewat Cloudflare (Workers dengan aset statis) yang terhubung ke repositori ini. Setiap perubahan di cabang `main` terbit otomatis, tanpa proses build.

## Rencana

| Level | Isi | Status |
|---|---|---|
| 1 | Kota satu pemain, gedung, masuk ke CodeIn News | Selesai |
| 2 | Sapaan di CodeIn News dan tombol kembali ke kota | Selesai |
| 3 | Baliho, videotron, dan pengajuan baliho dari kota | Selesai |
| 4 | Kota diperluas, kampung warga, kendaraan, Markas dan Galeri bisa dimasuki | Selesai |
| 5 | Pengunjung lain terlihat dan obrolan | Selesai |
| 6 | Tahap 1: perbaikan dialog Tempat, obrolan, dan perpindahan; Patung Pendiri dan resepsionis; jadwal harian warga | Selesai |
| 7 | Tahap 2: rumah proyek anggota dengan hosting situs statis (unggah zip) | Selesai |
| - | Lahan kosong untuk rumah proyek berikutnya, akun anggota, poin | Rencana |
| 8 | Kantor Redaksi CodeIn News jadi ruangan piksel di dalam kota | Selesai |
| - | Warkop CodeIn: dibuka bersama anggota yang mau ikut membangun | Menunggu kontributor |

## Lisensi aset

- Gedung, rumah, jalan, kendaraan, karakter, pohon, properti jalan, ikon, dan efek malam: paket "CodeIn City Retro 16x16" milik CodeIn.
- Lantai, dinding, dan perabot ruangan: [Top-Down Retro Interior](https://penzilla.itch.io/top-down-retro-interior) karya Penzilla. Dipakai dengan mencantumkan nama pembuatnya; perabotnya dipotong dari lembar aslinya dan lantai serta dinding disusun ulang menjadi `assets/tiles/retro.png`. Untuk pemakaian komersial, pembuatnya meminta aset dibeli minimal seharga yang disarankan.
- Musik: [High Quality 16-bit RPG Music](https://hydrogene.itch.io/high-quality-16-bit-music) karya Hydrogene, CC0 1.0 (Lively City, Peaceful Village, East Town, Ancient Library), diubah ke MP3 96 kbps.
- Phaser: lisensi MIT. Lihat `vendor/PHASER-LICENSE.md`.

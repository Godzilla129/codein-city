# CodeIn City

Kota kecil bergaya RPG piksel sebagai halaman depan komunitas CodeIn (`codeinhub.my.id`). Pengunjung memilih karakter, berjalan-jalan di kota, dan masuk ke gedung. Setiap gedung mewakili satu proyek komunitas. Gedung pertama adalah **CodeIn News** (`news.codeinhub.my.id`).

Situs ini statis: hanya HTML, CSS, dan JavaScript, tanpa server dan tanpa proses build. Satu-satunya data dari luar adalah isi baliho dan videotron, yang diambil dari API publik CodeIn News.

## Fitur

- Layar judul: enam pilihan karakter dan nama panggilan dengan penyaring kata kasar.
- Jalan dengan WASD atau tombol panah. Di ponsel, sentuh layar lalu geser.
- Kota 80 x 64 petak: jalan utama dengan tiga gerbang, alun-alun dengan air mancur dan Patung Si Pemula, pojok pasar, dan kampung warga di selatan.
- Gedung: CodeIn News (pindah ke `news.codeinhub.my.id`), Galeri Showcase dan Markas CodeIn (bisa dimasuki), Warkop CodeIn dan dua gedung lain (belum buka), Toko Mbak Tika.
- **Pengunjung lain terlihat** di kota dan di dalam gedung, lengkap dengan nama. Jumlah orang tampil di bilah atas.
- **Obrolan**: tekan Enter (atau T), ketik, lalu Enter. Pesan muncul sebagai balon di atas kepala dan di daftar obrolan. Tidak ada riwayat yang disimpan.
- **Videotron** di sebelah CodeIn News: lima kabar yang sedang ramai dalam 24 jam, berganti tiap 6 detik.
- **Enam baliho** (empat di jalan utama, dua di taman selatan) berisi proyek anggota. Nomor baliho sama dengan nomor slot billboard di CodeIn News. Di dalam Galeri, keenamnya dipajang sebagai karya di dinding.
- Pengajuan baliho langsung dari kota: lewat penjaga Galeri atau dari depan balihonya. Admin memutuskan di halaman admin CodeIn News.
- **Papan Pengumuman** berupa papan gabus: tiga pengumuman teratas terbaca langsung dari jauh.
- Sebelas warga yang bisa disapa, sepuluh di antaranya punya rumah di kampung.
- Kendaraan masuk dan keluar lewat gerbang, dan berhenti kalau ada orang di depannya.
- Tombol **Tempat** untuk berpindah langsung ke depan gedung tanpa berjalan. Papan bisa diketuk atau diklik dari jauh.
- Siang dan malam mengikuti jam WIB, dengan lampu jalan yang menyala saat malam.
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
| `js/kota.js` | Adegan (Phaser) untuk semua peta: pemain, warga, pintu, masuk dan keluar gedung, patung, siang dan malam |
| `js/lalulintas.js` | Kendaraan yang mengikuti jalur di peta dan berhenti untuk pejalan kaki |
| `js/ramai.js` | Pengunjung lain dan obrolan (WebSocket ke layanan ramai) |
| `js/judul.js` | Layar judul |
| `js/main.js` | Titik mulai |
| `assets/maps/kota.tmj` | Peta kota, dibuka dan diubah dengan Tiled |
| `assets/maps/markas.tmj`, `galeri.tmj` | Peta ruangan Markas CodeIn dan Galeri Showcase |
| `assets/tiles/urban.png` | Tileset dan karakter (Kenney, CC0) |
| `vendor/phaser.min.js` | Phaser 3.90.0 (lisensi MIT) |
| `tools/buat_peta.py` | Pembuat ketiga peta. Sampai versi ini peta masih sama persis dengan hasil skrip. Jangan dijalankan lagi setelah peta diubah di Tiled |

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

Buka `js/config.js`. Isi papan pengumuman ada di `panel.papan.daftar` (tiga yang teratas tampil di papan gabus), teks setiap gedung di `panel`, papan di dinding Markas di `info`, dan warga beserta ucapannya di `warga`.

Isi baliho tidak diubah di sini. Baliho diisi dari halaman admin CodeIn News (`/admin`): setujui pengajuan atau ubah slot, dan dalam dua menit baliho di kota ikut berubah.

## Mengubah peta dengan Tiled

1. Pasang [Tiled](https://www.mapeditor.org/) (gratis), lalu buka `assets/maps/kota.tmj`.
2. Layer ubin, dari bawah ke atas:
   - `tanah`, `jalan`, `bangunan`, `hiasan`: digambar di bawah karakter.
   - `atas`: digambar di atas karakter (pucuk pohon, kepala lampu).
   - `tabrakan`: tidak digambar di permainan. Setiap ubin di layer ini tidak bisa dilewati, apa pun gambarnya.
3. Layer objek:
   - `pintu`: kotak interaksi. Nama objek menjadi nama gedung. Properti: `id`, `aksi` (`pindah` untuk pindah ke alamat lain, `masuk` dan `keluar` untuk berganti peta, `panel` untuk membuka dialog), `tujuan` (alamat web untuk `pindah`, nama peta untuk `masuk` dan `keluar`, atau kunci dialog di `config.js`), `ke` (`id` pintu tempat muncul setelah `keluar`), `penghuni` (nama warga untuk rumah), serta `label_x` dan `label_y` (letak papan nama, dalam piksel).
   - `titik`: `mulai` (tempat pengunjung baru muncul), `lampu` (cahaya saat malam), `patung`, dan `pancuran`.
   - `rute`: garis patah (polyline) jalur kendaraan, dari luar peta ke luar peta.
   - `papan`: kotak papan HTML. Nama objek `baliho`, `videotron`, `pengumuman`, atau `info`. Properti: `id`, `urutan` (nomor slot billboard untuk baliho, 1 sampai 6), dan `tiang` (panjang tiang di bawah papan, dalam piksel). Papan yang bisa dibaca dari dekat butuh pasangan kotak di layer `pintu` (zona baca di depannya) dengan `tanpa_label` = 1. Tapak papan dan tiangnya ditutup di layer `tabrakan`.
4. Simpan tetap dalam format JSON (`.tmj`) dengan tileset tertanam (embedded).

### Menambah gedung baru

1. Gambar gedung di layer `bangunan`, lalu tutup tapaknya di layer `tabrakan`.
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
| 6 | Warkop CodeIn (pintu ke obrolan suara grup) | Berikutnya |
| 7 | Kantor Redaksi CodeIn News jadi ruangan piksel di dalam kota | Rencana |

## Lisensi aset

- Tileset dan karakter: RPG Urban Pack karya [Kenney](https://kenney.nl), CC0 1.0. Lihat `assets/tiles/LISENSI-KENNEY.txt`.
- Phaser: lisensi MIT. Lihat `vendor/PHASER-LICENSE.md`.

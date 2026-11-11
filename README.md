# CodeIn City

Kota kecil bergaya RPG piksel sebagai halaman depan komunitas CodeIn (`codeinhub.my.id`). Pengunjung memilih karakter, berjalan-jalan di kota, dan masuk ke gedung. Setiap gedung mewakili satu proyek komunitas. Gedung pertama adalah **CodeIn News** (`news.codeinhub.my.id`).

Situs ini statis: hanya HTML, CSS, dan JavaScript, tanpa server dan tanpa proses build. Satu-satunya data dari luar adalah isi baliho dan videotron, yang diambil dari API publik CodeIn News.

## Fitur

- Layar judul: enam pilihan karakter dan nama panggilan dengan penyaring kata kasar.
- Jalan dengan WASD atau tombol panah. Di ponsel, sentuh layar lalu geser.
- Tujuh titik interaksi: CodeIn News, Galeri Showcase, Markas CodeIn, dua gedung terkunci, Papan Pengumuman, dan Gerbang Kota.
- **Videotron** di sebelah CodeIn News: lima kabar yang sedang ramai dalam 24 jam, berganti tiap 6 detik.
- **Enam baliho** (empat di jalan utama, dua di taman selatan) berisi proyek anggota. Nomor baliho sama dengan nomor slot billboard di CodeIn News.
- Pengajuan baliho langsung dari kota, lewat Galeri Showcase atau dari depan balihonya. Admin memutuskan di halaman admin CodeIn News.
- Papan bisa diketuk atau diklik dari jauh untuk membaca isinya.
- Tombol **Tempat** untuk berpindah langsung ke depan gedung tanpa berjalan.
- Tiga warga yang bisa disapa.
- Siang dan malam mengikuti jam WIB, dengan lampu jalan yang menyala saat malam.
- Posisi terakhir diingat, sehingga pengunjung yang kembali dari CodeIn News muncul di depan gedungnya.

## Struktur berkas

| Berkas | Isi |
|---|---|
| `index.html` | Kerangka halaman: kanvas, bilah atas, dialog, layar judul |
| `css/style.css` | Tampilan antarmuka |
| `js/config.js` | **Isi yang paling sering diubah**: teks gedung, papan pengumuman, ucapan warga |
| `js/profil.js` | Karakter dan nama pengunjung (disimpan di browser pengunjung), penyaring nama |
| `js/panel.js` | Dialog dan daftar tempat |
| `js/papan.js` | Baliho, videotron, Galeri Showcase, dan formulir pengajuan baliho (data dari CodeIn News) |
| `js/kendali.js` | Kendali sentuh |
| `js/kota.js` | Adegan kota (Phaser): peta, pemain, warga, pintu, siang dan malam |
| `js/judul.js` | Layar judul |
| `js/main.js` | Titik mulai |
| `assets/maps/kota.tmj` | Peta kota, dibuka dan diubah dengan Tiled |
| `assets/tiles/urban.png` | Tileset dan karakter (Kenney, CC0) |
| `vendor/phaser.min.js` | Phaser 3.90.0 (lisensi MIT) |
| `tools/buat_peta.py` | Pembuat peta. Sampai versi ini peta masih sama persis dengan hasil skrip. Jangan dijalankan lagi setelah peta diubah di Tiled |

Berkas JavaScript dimuat berurutan dari `index.html`, dan setiap berkas memakai isi berkas sebelumnya.

## Menjalankan di komputer sendiri

```bash
python3 -m http.server 8090
```

Lalu buka `http://localhost:8090`. Halaman tidak bisa dibuka langsung dari berkas (`file://`) karena peta dimuat lewat HTTP.

Untuk mencoba suasana waktu tertentu, tambahkan `?jam=21` di akhir alamat.

Baliho dan videotron mengambil data dari `https://news.codeinhub.my.id`, dan server itu hanya menjawab halaman yang dibuka dari `https://codeinhub.my.id`. Saat dibuka dari `localhost`, papan akan bertulisan "belum bisa dimuat". Itu wajar. Untuk menguji dengan dashboard NewsAgent yang jalan di komputer yang sama, tambahkan `CORS_ORIGINS=http://localhost:8090` di `.env` NewsAgent, lalu buka `http://localhost:8090/?api=http://127.0.0.1:8787` (`?api=` hanya berlaku di `localhost`).

## Mengubah isi teks

Buka `js/config.js`. Isi papan pengumuman ada di `panel.papan.daftar`, teks setiap gedung di `panel`, dan ucapan warga di `warga`.

Isi baliho tidak diubah di sini. Baliho diisi dari halaman admin CodeIn News (`/admin`): setujui pengajuan atau ubah slot, dan dalam dua menit baliho di kota ikut berubah.

## Mengubah peta dengan Tiled

1. Pasang [Tiled](https://www.mapeditor.org/) (gratis), lalu buka `assets/maps/kota.tmj`.
2. Layer ubin, dari bawah ke atas:
   - `tanah`, `jalan`, `bangunan`, `hiasan`: digambar di bawah karakter.
   - `atas`: digambar di atas karakter (pucuk pohon, kepala lampu).
   - `tabrakan`: tidak digambar di permainan. Setiap ubin di layer ini tidak bisa dilewati, apa pun gambarnya.
3. Layer objek:
   - `pintu`: kotak interaksi. Nama objek menjadi nama gedung. Properti: `id`, `aksi` (`pindah` untuk pindah ke alamat lain, `panel` untuk membuka dialog), `tujuan` (alamat web untuk `pindah`, atau kunci dialog di `config.js`), serta `label_x` dan `label_y` (letak papan nama, dalam piksel).
   - `titik`: `mulai` (tempat pengunjung baru muncul) dan `lampu` (cahaya saat malam).
   - `papan`: kotak baliho dan videotron. Nama objek `baliho` atau `videotron`. Properti: `urutan` (nomor slot billboard, 1 sampai 6) dan `tiang` (panjang tiang di bawah papan, dalam piksel). Setiap papan butuh pasangan kotak di layer `pintu` (zona baca di trotoar depannya) dengan `tujuan` = `baliho` atau `videotron`, `id` = `baliho-<nomor>` atau `videotron`, dan `tanpa_label` = 1. Tapak papan dan tiangnya ditutup di layer `tabrakan`.
4. Simpan tetap dalam format JSON (`.tmj`) dengan tileset tertanam (embedded).

### Menambah gedung baru

1. Gambar gedung di layer `bangunan`, lalu tutup tapaknya di layer `tabrakan`.
2. Buat kotak di layer `pintu` tepat di depan pintunya, lalu isi properti `id`, `aksi`, dan `tujuan`.
3. Untuk gedung berisi dialog, tambahkan isinya di `panel` pada `js/config.js` dengan kunci yang sama dengan `id`.

## Menerbitkan

Situs diterbitkan lewat Cloudflare (Workers dengan aset statis) yang terhubung ke repositori ini. Setiap perubahan di cabang `main` terbit otomatis, tanpa proses build.

## Rencana

| Level | Isi | Status |
|---|---|---|
| 1 | Kota satu pemain, gedung, masuk ke CodeIn News | Selesai |
| 2 | Sapaan di CodeIn News dan tombol kembali ke kota | Selesai |
| 2.5 | Baliho, videotron, dan pengajuan baliho dari kota | Selesai |
| 3 | Pengunjung lain terlihat, jumlah orang di kota, emote | Berikutnya |
| 4 | Obrolan singkat antar pengunjung | Rencana |
| 5 | Warkop CodeIn (pintu ke obrolan suara grup) | Rencana |
| 6 | Kantor Redaksi CodeIn News jadi interior piksel di dalam kota | Rencana |

## Lisensi aset

- Tileset dan karakter: RPG Urban Pack karya [Kenney](https://kenney.nl), CC0 1.0. Lihat `assets/tiles/LISENSI-KENNEY.txt`.
- Phaser: lisensi MIT. Lihat `vendor/PHASER-LICENSE.md`.

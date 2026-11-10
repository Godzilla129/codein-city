# CodeIn City

Kota kecil bergaya RPG piksel sebagai halaman depan komunitas CodeIn (`codeinhub.my.id`). Pengunjung memilih karakter, berjalan-jalan di kota, dan masuk ke gedung. Setiap gedung mewakili satu proyek komunitas. Gedung pertama adalah **CodeIn News** (`news.codeinhub.my.id`).

Situs ini statis: hanya HTML, CSS, dan JavaScript, tanpa server dan tanpa proses build.

## Fitur (Level 1)

- Layar judul: enam pilihan karakter dan nama panggilan dengan penyaring kata kasar.
- Jalan dengan WASD atau tombol panah. Di ponsel, sentuh layar lalu geser.
- Tujuh titik interaksi: CodeIn News, Galeri Showcase, Markas CodeIn, dua gedung terkunci, Papan Pengumuman, dan Gerbang Kota.
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
| `js/kendali.js` | Kendali sentuh |
| `js/kota.js` | Adegan kota (Phaser): peta, pemain, warga, pintu, siang dan malam |
| `js/judul.js` | Layar judul |
| `js/main.js` | Titik mulai |
| `assets/maps/kota.tmj` | Peta kota, dibuka dan diubah dengan Tiled |
| `assets/tiles/urban.png` | Tileset dan karakter (Kenney, CC0) |
| `vendor/phaser.min.js` | Phaser 3.90.0 (lisensi MIT) |
| `tools/buat_peta.py` | Pembuat peta awal. Jangan dijalankan lagi setelah peta diubah di Tiled |

Berkas JavaScript dimuat berurutan dari `index.html`, dan setiap berkas memakai isi berkas sebelumnya.

## Menjalankan di komputer sendiri

```bash
python3 -m http.server 8090
```

Lalu buka `http://localhost:8090`. Halaman tidak bisa dibuka langsung dari berkas (`file://`) karena peta dimuat lewat HTTP.

Untuk mencoba suasana waktu tertentu, tambahkan `?jam=21` di akhir alamat.

## Mengubah isi teks

Buka `js/config.js`. Isi papan pengumuman ada di `panel.papan.daftar`, teks setiap gedung di `panel`, dan ucapan warga di `warga`.

## Mengubah peta dengan Tiled

1. Pasang [Tiled](https://www.mapeditor.org/) (gratis), lalu buka `assets/maps/kota.tmj`.
2. Layer ubin, dari bawah ke atas:
   - `tanah`, `jalan`, `bangunan`, `hiasan`: digambar di bawah karakter.
   - `atas`: digambar di atas karakter (pucuk pohon, kepala lampu).
   - `tabrakan`: tidak digambar di permainan. Setiap ubin di layer ini tidak bisa dilewati, apa pun gambarnya.
3. Layer objek:
   - `pintu`: kotak interaksi. Nama objek menjadi nama gedung. Properti: `id`, `aksi` (`pindah` untuk pindah ke alamat lain, `panel` untuk membuka dialog), `tujuan` (alamat web untuk `pindah`, atau kunci dialog di `config.js`), serta `label_x` dan `label_y` (letak papan nama, dalam piksel).
   - `titik`: `mulai` (tempat pengunjung baru muncul) dan `lampu` (cahaya saat malam).
4. Simpan tetap dalam format JSON (`.tmj`) dengan tileset tertanam (embedded).

### Menambah gedung baru

1. Gambar gedung di layer `bangunan`, lalu tutup tapaknya di layer `tabrakan`.
2. Buat kotak di layer `pintu` tepat di depan pintunya, lalu isi properti `id`, `aksi`, dan `tujuan`.
3. Untuk gedung berisi dialog, tambahkan isinya di `panel` pada `js/config.js` dengan kunci yang sama dengan `id`.

## Menerbitkan

Situs diterbitkan lewat Cloudflare Pages yang terhubung ke repositori ini. Setiap perubahan di cabang `main` terbit otomatis.

- Build command: kosong
- Build output directory: `/`

## Rencana

| Level | Isi | Status |
|---|---|---|
| 1 | Kota satu pemain, gedung, masuk ke CodeIn News | Selesai |
| 2 | Karakter muncul di Grand Hall CodeIn News dan tombol kembali ke kota | Berikutnya |
| 3 | Melihat pengunjung lain dan emote | Rencana |
| 4 | Gedung proyek anggota, papan pengumuman dari halaman admin | Rencana |

## Lisensi aset

- Tileset dan karakter: RPG Urban Pack karya [Kenney](https://kenney.nl), CC0 1.0. Lihat `assets/tiles/LISENSI-KENNEY.txt`.
- Phaser: lisensi MIT. Lihat `vendor/PHASER-LICENSE.md`.

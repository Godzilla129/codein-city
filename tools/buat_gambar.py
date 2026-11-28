"""Penyusun gambar CodeIn City -> assets/sprites/gedung.png + gedung.json (atlas Phaser), orang.png, ruang.json, ikon-musik.png,
dan assets/tiles/ruang.png. Gedung ikonik digambar di berkas ini; perabot, properti kota, kendaraan, dan ubin ruangan
di gambar_benda.py; karakter di gambar_orang.py; palet dan alat gambar di kanvas.py.

Gedung digambar piksel demi piksel dengan palet dan gaya RPG Urban Pack (Kenney) yang dipakai kota ini:
garis luar cokelat keabuan yang lembut, tanpa garis hitam, bayangan satu warna lebih gelap.
Bentuknya mengacu ke paket "CodeIn City Retro" (Markas berbendera, Galeri berkubah kaca, CodeIn News bermenara radio,
menara observatorium Aetheria, ruko Toko Mbak Tika, Warkop CodeIn), tapi ukurannya mengikuti tapak gedung di peta.
Atlas ini juga berisi pohon-pohon Kenney yang dipotong utuh, dipakai untuk hutan di tepi kota.

Jalankan dari folder proyek (tidak butuh berkas lain selain assets/tiles/urban-kenney.png):
    python3 tools/buat_gambar.py
lalu tools/buat_peta.py. Butuh Pillow.
"""
import json

from PIL import Image

from kanvas import *          # noqa: F401,F403  (palet, Kanvas, kenney, PROYEK)
import gambar_benda
import gambar_orang


def rumah(ubin, atap, dinding, varian, kol_pintu=2):
    """Rumah warga (dan rumah proyek): atap perisai genteng, cerobong, pintu di kolom ke-3, jendela berkotak bunga.
    ubin = lebar dalam ubin (6 atau 7). atap: "merah"/"oranye". dinding: "krem"/"batu"/"kayu". varian 0-2 mengubah detail."""
    A = 10
    W = ubin * 16
    k = Kanvas(W, 96 + A)
    b = A
    warna_atap = {"merah": (GENTENG, GENTENG_G, GENTENG_T), "oranye": (ORANYE, ORANYE_G, ORANYE_T)}[atap]
    if varian != 1:                                    # cerobong
        k.panel(W - 30, 0, W - 21, b + 16, BATU, BATU_T, BATU_G)
    k.atap(2, b + 4, W - 3, b + 50, *warna_atap, miring=3)
    if varian == 1:                                    # jendela loteng
        k.panel(W // 2 - 9, b + 18, W // 2 + 8, b + 36, KREM, KREM_T, KREM_G)
        k.jendela(W // 2 - 5, b + 22, 10, 10)
    if dinding == "kayu":
        k.dinding(6, b + 51, W - 7, b + 95, hx("d9b48a"), hx("b88d63"), hx("ead0ad"))
        for x in range(10, W - 8, 6):
            k.garis_v(x, b + 53, b + 92, hx("b88d63"))
    elif dinding == "batu":
        k.dinding(6, b + 51, W - 7, b + 95, BATU, BATU_G, BATU_T)
    else:
        k.dinding(6, b + 51, W - 7, b + 95)
    # pintu di kolom ke-3 (tengahnya 40 piksel dari kiri), tangga kecil
    px = kol_pintu * 16
    k.pintu(px, b + 66, 16, 26, ganda=False)
    if varian == 2:                                    # kanopi kecil di atas pintu
        for x in range(px - 4, px + 20):
            k.p(x, b + 61, GARIS); k.p(x, b + 62, MERAH if (x // 4) % 2 else PUTIH); k.p(x, b + 63, MERAH if (x // 4) % 2 else PUTIH)
        k.p(px - 4, b + 64, GARIS); k.p(px + 19, b + 64, GARIS)
    k.panel(px - 2, b + 92, px + 17, b + 95, BATU, BATU_T, BATU_G)
    # jendela kanan dengan kotak bunga, jendela kiri kecil
    k.jendela(W - 38, b + 62, 22, 16)
    k.panel(W - 40, b + 80, W - 15, b + 84, KAYU, KAYU_T, KAYU_G)
    for x in range(W - 38, W - 16, 3):
        k.p(x, b + 79, MERAH if (x // 3) % 2 else KUNING); k.p(x + 1, b + 79, HIJAU)
    k.jendela(12, b + 64, 12, 12)
    return k, A


def markas():
    """Markas CodeIn: balai dengan menara tengah berpelana, bendera, papan logo CodeIn, dua sayap beratap genteng merah. 9 x 6 ubin + 28 piksel atas."""
    A = 28
    k = Kanvas(144, 96 + A)
    b = A                       # y tepi atas badan (baris ubin 0)
    # sayap kiri dan kanan
    for x0, x1 in ((0, 49), (94, 143)):
        k.atap(x0, b + 14, x1, b + 44, GENTENG, GENTENG_G, GENTENG_T, miring=2)
        k.dinding(x0 + 2, b + 45, x1 - 2, b + 95)
    # menara tengah
    k.dinding(46, b + 10, 97, b + 95)
    k.pelana(72, b - 22, 64, 34, GENTENG, GENTENG_G, GENTENG_T)
    # tiang bendera di puncak
    k.garis_v(72, 0, b - 20, GARIS); k.garis_v(73, 1, b - 20, BATU_T)
    k.kotak(71, 0, 74, 1, KUNING)
    # jendela sayap
    for x in (12, 28, 104, 120):
        k.jendela(x, b + 56, 12, 16)
    # papan nama: logo CodeIn di papan krem berbingkai kayu
    k.panel(54, b + 14, 90, b + 34, PUTIH, KREM_S, KREM_G)
    k.bingkai(53, b + 13, 91, b + 35, BALOK)
    k.tempel(logo_piksel(16), 72 - logo_piksel(16).width // 2, b + 16)
    # tiang dan pintu ganda dengan anak tangga
    k.tiang(52, b + 42, b + 92)
    k.tiang(88, b + 42, b + 92)
    k.kotak(48, b + 39, 95, b + 41, KREM_T); k.bingkai(48, b + 38, 95, b + 41, GARIS)
    k.jendela(64, b + 46, 16, 10)
    k.pintu(62, b + 62, 20, 30)
    k.panel(58, b + 92, 85, b + 95, BATU, BATU_T, BATU_G)
    return k, A


def bendera(frame):
    """Bendera CodeIn berkibar, 18 x 12, dua bingkai: kain putih, logo CodeIn, lis biru di bawah."""
    k = Kanvas(18, 12)
    logo = logo_piksel(7).load()
    lw = logo_piksel(7).width
    for x in range(17):
        ombak = (1 if (x // 4 + frame) % 2 else 0)
        for y in range(1 + ombak, 10 + ombak):
            k.p(x, y, hx("1f8ef5") if y - ombak >= 8 else PUTIH)
        k.p(x, 1 + ombak, GARIS); k.p(x, 10 + ombak, GARIS)
        lx = x - 4
        if 0 <= lx < lw:
            for ly in range(7):
                if logo[lx, ly][3]:
                    k.p(x, 2 + ly + ombak - (1 if ly == 6 else 0) * 0, logo[lx, ly])
    k.garis_v(17 - (frame % 2), 2, 10, GARIS)
    return k


def galeri():
    """Galeri Showcase: museum kubah kaca, tiang-tiang, poster karya di jendela. 9 x 6 ubin + 30 piksel atas."""
    A = 30
    k = Kanvas(144, 96 + A)
    b = A
    k.kubah(72, b + 6, 34, 34, UNGU, UNGU_G, UNGU_T, rusuk=5)
    k.kotak(70, 0, 74, 2, KUNING); k.bingkai(70, 0, 74, 2, GARIS)
    # atap datar dengan lis
    k.panel(0, b + 8, 143, b + 22, BATU, BATU_T, BATU_G)
    for x in range(4, 140, 8):
        k.kotak(x, b + 18, x + 3, b + 20, BATU_G)
    k.dinding(4, b + 23, 139, b + 95, BATU, BATU_G, BATU_T)
    # tiang depan
    for x in (14, 40, 100, 126):
        k.tiang(x, b + 30, b + 90, BATU_T, BATU_G)
    # poster karya di jendela kiri-kanan
    for x0, warna in ((20, hx("e9a23b")), (106, hx("2a9d8f"))):
        k.panel(x0, b + 38, x0 + 17, b + 70, hx("efe6d6"), PUTIH, KREM_G)
        k.kotak(x0 + 3, b + 42, x0 + 14, b + 54, warna)
        k.kotak(x0 + 3, b + 58, x0 + 12, b + 59, KREM_G); k.kotak(x0 + 3, b + 62, x0 + 9, b + 63, KREM_G)
    # pintu kaca besar
    k.kotak(56, b + 40, 87, b + 92, BATU_T); k.bingkai(56, b + 40, 87, b + 92, GARIS)
    k.jendela(60, b + 44, 24, 18)
    k.pintu(62, b + 66, 20, 26, KACA, KACA_G, KACA_T)
    k.panel(50, b + 92, 93, b + 95, BATU_T, PUTIH, BATU_G)
    return k, A


def news():
    """CodeIn News: kantor berita dua lantai, menara radio dan parabola di atap, papan ticker LED, kotak pos merah.
    11 x 6 ubin + 34 piksel atas. Ticker dihidupkan js/kota.js (titik 'ticker')."""
    A = 34
    k = Kanvas(176, 96 + A)
    b = A
    # menara radio (rangka segitiga) di kanan atap
    for y in range(0, b + 8):
        lebar = 2 + y * 10 // (b + 8)
        k.p(132 - lebar, y, GARIS); k.p(132 + lebar, y, GARIS)
        if y % 6 == 0:
            k.garis_h(132 - lebar, 132 + lebar, y, GARIS)
        if y % 6 == 3:
            k.p(132, y, GARIS)
    k.kotak(130, 0, 134, 3, MERAH); k.bingkai(130, 0, 134, 3, GARIS)
    # parabola di kiri atap
    for y in range(12):
        for x in range(40, 58):
            if (x - 49) ** 2 / 81 + (y - 6) ** 2 / 36 <= 1 and x + y > 52:
                k.p(x, b - 14 + y, BATU_T if x < 49 else BATU)
    k.garis_v(50, b - 6, b + 8, GARIS); k.kotak(47, b + 4, 53, b + 8, BATU_G)
    k.p(44, b - 12, GARIS); k.p(45, b - 11, GARIS); k.p(46, b - 10, GARIS)
    # atap datar oranye
    k.atap(0, b + 6, 175, b + 22, ORANYE, ORANYE_G, ORANYE_T)
    k.dinding(4, b + 23, 171, b + 95)
    # lantai atas: lima jendela
    for x in (14, 46, 78, 110, 142):
        k.jendela(x, b + 28, 18, 14)
    # papan ticker (diisi animasi)
    k.panel(6, b + 48, 169, b + 60, hx("1e2433"), hx("2a3148"), hx("141830"))
    # lantai bawah: etalase, pintu, kotak pos
    k.jendela(18, b + 66, 28, 18)
    k.jendela(110, b + 66, 28, 18)
    k.pintu(78, b + 64, 20, 28, KACA, KACA_G, KACA_T)
    k.panel(146, b + 72, 157, b + 92, MERAH, GENTENG_T, GENTENG_G)
    k.kotak(148, b + 76, 155, b + 78, PUTIH)
    k.panel(72, b + 92, 103, b + 95, BATU, BATU_T, BATU_G)
    return k, A, (8, b + 51, 160, 7)          # kotak ticker: x, y, lebar, tinggi (relatif gambar)


def aetheria():
    """Menara observatorium batu (rumah proyek 2): kubah ungu, teleskop, jendela bundar. 7 x 6 ubin + 34 piksel atas."""
    A = 34
    k = Kanvas(112, 96 + A)
    b = A
    k.dinding(10, b + 10, 101, b + 95, BATU, BATU_G, BATU_T)
    # kubah dan teleskop
    for i in range(16):
        k.p(80 + i, b - 22 - i // 2, GARIS); k.p(80 + i, b - 21 - i // 2, KUNING); k.p(80 + i, b - 20 - i // 2, ORANYE_G)
    k.kubah(56, b + 8, 40, 40, UNGU, UNGU_G, UNGU_T, rusuk=6)
    k.kotak(54, 0, 58, 2, KUNING); k.bingkai(54, 0, 58, 2, GARIS)
    k.garis_v(56, 2, b - 30, KUNING)
    # jendela bundar
    for y in range(b + 22, b + 47):
        for x in range(43, 70):
            d = ((x - 56) ** 2 + (y - b - 34) ** 2) ** .5
            if d <= 12:
                k.p(x, y, GARIS if d > 11 else KUNING if d > 9.5 else KACA_T if (x - y) % 7 < 2 else KACA)
    k.garis_h(46, 66, b + 34, GARIS); k.garis_v(56, b + 24, b + 44, GARIS)
    # tanaman merambat dan pintu lengkung
    for (x, y) in ((14, 50), (15, 52), (13, 54), (14, 57), (16, 59), (15, 62), (96, 30), (97, 33), (95, 36), (96, 39)):
        k.p(x, b + y, HIJAU); k.p(x + 1, b + y, hx("4c7d3f"))
    for y in range(b + 56, b + 93):
        for x in range(44, 68):
            d = ((x - 55.5) ** 2 + (y - b - 66) ** 2) ** .5
            if y >= b + 66 or d <= 11.5:
                k.p(x, y, GARIS if (y < b + 66 and d > 10.5) or x in (44, 67) else UNGU_G if x > 56 else UNGU)
    k.p(62, b + 78, KUNING)
    for x in (24, 82):
        k.jendela(x, b + 58, 10, 16)
    k.panel(40, b + 92, 71, b + 95, BATU, BATU_T, BATU_G)
    return k, A


def toko():
    """Toko Mbak Tika: ruko dua lantai dengan balkon, tenda bergaris, etalase dan peti sayur. 7 x 6 ubin + 16 piksel atas."""
    A = 16
    k = Kanvas(112, 96 + A)
    b = A
    k.pelana(56, 0, 40, 14, GENTENG, GENTENG_G, GENTENG_T)
    k.atap(0, b - 2, 111, b + 24, GENTENG, GENTENG_G, GENTENG_T, miring=2)
    k.dinding(4, b + 25, 107, b + 95)
    k.jendela(52, 4, 8, 8)
    # balkon lantai atas
    for x in (16, 80):
        k.jendela(x, b + 30, 16, 14)
    k.kotak(4, b + 46, 107, b + 48, KAYU_T); k.bingkai(4, b + 46, 107, b + 48, GARIS)
    for x in range(8, 106, 6):
        k.garis_v(x, b + 42, b + 46, KAYU_G)
    k.garis_h(4, 107, b + 42, KAYU_G)
    # tenda bergaris
    for x in range(2, 110):
        warna = MERAH if (x // 8) % 2 == 0 else PUTIH
        for y in range(b + 50, b + 58):
            k.p(x, y, warna)
        if (x % 8) in (3, 4):
            k.p(x, b + 58, warna)
    k.garis_h(2, 109, b + 49, GARIS)
    for x in range(2, 110):
        if (x % 8) in (0, 7):
            k.p(x, b + 58, GARIS)
        if (x % 8) in (3, 4):
            k.p(x, b + 59, GARIS)
        if (x % 8) in (1, 2, 5, 6):
            k.p(x, b + 58, GARIS)
    # pintu, etalase, peti sayur
    k.pintu(48, b + 64, 16, 28, ganda=False)
    k.jendela(70, b + 64, 30, 18)
    k.jendela(10, b + 64, 26, 18)
    for x0, isi in ((70, HIJAU), (88, KUNING), (14, MERAH)):
        k.panel(x0, b + 84, x0 + 17, b + 94, KAYU, KAYU_T, KAYU_G)
        for x in range(x0 + 2, x0 + 16, 3):
            k.kotak(x, b + 82, x + 1, b + 84, isi)
    return k, A


def warkop():
    """Warkop CodeIn (masih dikunci): kedai kayu, tenda hijau-krem, papan nama, jendela tertutup. 7 x 6 ubin + 6 piksel atas."""
    A = 6
    k = Kanvas(112, 96 + A)
    b = A
    k.atap(0, 0, 111, b + 30, KAYU, KAYU_G, KAYU_T, miring=2)
    k.dinding(4, b + 31, 107, b + 95, hx("d9b48a"), hx("b88d63"), hx("ead0ad"))
    for x in range(8, 104, 8):
        k.garis_v(x, b + 33, b + 92, hx("b88d63"))
    k.panel(30, b + 34, 81, b + 46, hx("2a9d8f"), hx("5cc0b2"), hx("1f6f66"))
    k.tulis("WARKOP", 56, b + 38, PUTIH)
    for x in range(2, 110):
        warna = hx("2a9d8f") if (x // 8) % 2 == 0 else PUTIH
        for y in range(b + 50, b + 57):
            k.p(x, y, warna)
        k.p(x, b + 57, GARIS if (x % 8) in (0, 7) else warna)
    k.garis_h(2, 109, b + 49, GARIS)
    # rolling door tertutup dan jendela berpapan
    k.panel(40, b + 62, 71, b + 92, BATU, BATU_T, BATU_G)
    for y in range(b + 65, b + 91, 3):
        k.garis_h(41, 70, y, BATU_G)
    for x in (12, 80):
        k.panel(x, b + 64, x + 19, b + 82, KAYU, KAYU_T, KAYU_G)
        k.garis_h(x + 1, x + 18, b + 70, KAYU_G); k.garis_h(x + 1, x + 18, b + 76, KAYU_G)
    return k, A




BESI_LENTERA = hx("3b3346")


def galeri_komunitas():
    """Galeri Komunitas: rumah kayu berangka balok, atap toska, jendela atap bundar, etalase berisi foto kegiatan,
    papan GALERI, lentera gantung. 6 x 6 ubin + 30 piksel atas."""
    A = 30
    k = Kanvas(96, 96 + A)
    b = A
    k.atap(1, 2, 94, b + 22, TEAL, TEAL_G, TEAL_T, miring=3)
    for y in range(8, 25):                                     # jendela atap bundar
        for x in range(38, 59):
            d = ((x - 48) ** 2 + (y - 16) ** 2) ** .5
            if d <= 8.5:
                k.p(x, y, GARIS if d > 7.5 else BALOK if d > 6.3 else KACA_T if (x - y) % 6 < 2 else KACA)
    k.garis_h(42, 54, 16, BALOK); k.garis_v(48, 10, 22, BALOK)
    k.dinding(4, b + 23, 91, b + 95)
    k.panel(24, b + 27, 71, b + 37, BALOK, KAYU, BALOK_G)      # papan nama
    k.tulis("GALERI", 48, b + 30, KUNING)
    # etalase lengkung berisi foto
    k.kotak(18, b + 46, 60, b + 89, BALOK); k.bingkai(18, b + 46, 60, b + 89, GARIS)
    k.kotak(20, b + 48, 58, b + 89, hx("cfe8ee"))
    foto = (hx("e9a23b"), HIJAU, MERAH, BIRU, KUNING, UNGU)
    for i, c in enumerate(foto):
        x, y = 23 + (i % 3) * 12, b + 52 + (i // 3) * 16
        k.kotak(x, y, x + 9, y + 11, PUTIH); k.kotak(x + 1, y + 1, x + 8, y + 7, c)
        k.p(x + 3, y + 3, PUTIH); k.garis_h(x + 2, x + 7, y + 9, BATU_G)
    k.garis_v(39, b + 48, b + 89, BALOK)
    k.pintu(66, b + 62, 18, 30, ganda=False)
    k.panel(16, b + 90, 86, b + 95, BATU, BATU_T, BATU_G)
    k.kotak(9, b + 46, 10, b + 52, BESI_LENTERA); k.panel(7, b + 52, 12, b + 59, KUNING, hx("fff3c4"), ORANYE)   # lentera
    k.jendela(7, b + 64, 9, 12, kayu=True)
    return k, A


def galeri_investasi():
    """Galeri Investasi (bersama GIBEI, segera dibuka): balai batu bertiang, atap tembaga berpatina, papan ticker LED,
    perancah kayu dan spanduk SEGERA. 6 x 6 ubin + 34 piksel atas."""
    A = 34
    k = Kanvas(96, 96 + A)
    b = A
    PATINA, PATINA_G, PATINA_T = hx("4e9d86"), hx("3a7a68"), hx("72bea6")
    k.panel(40, 2, 55, 12, hx("b87333"), hx("d9944f"), hx("8a5222"))      # menara kecil tembaga
    k.pelana(48, 0, 18, 4, hx("b87333"), hx("8a5222"), hx("d9944f"))
    k.atap(0, 12, 95, b + 16, PATINA, PATINA_G, PATINA_T, miring=4)
    k.panel(18, b - 10, 77, b + 2, hx("1a2228"), hx("26323a"), hx("10161a"))   # papan ticker LED
    for i, x in enumerate(range(21, 75, 3)):
        tinggi = 2 + (i * 7) % 5
        k.garis_v(x, b - 2 - tinggi, b - 2, hx("4cd97b") if i % 5 else hx("e8504a"))
    k.dinding(4, b + 17, 91, b + 95, BATU, BATU_G, BATU_T)
    k.kotak(4, b + 17, 91, b + 20, BATU_T); k.garis_h(4, 91, b + 21, GARIS)
    for x in (12, 28, 64, 80):
        k.tiang(x, b + 26, b + 90, PUTIH, BATU_G)
    k.kotak(38, b + 52, 57, b + 92, BALOK); k.kotak(40, b + 54, 55, b + 92, KACA)
    k.garis_v(47, b + 54, b + 92, BALOK); k.p(42, b + 56, KACA_T); k.p(43, b + 57, KACA_T)
    k.panel(30, b + 92, 65, b + 95, BATU_T, PUTIH, BATU_G)
    # perancah dan spanduk "segera"
    for x in (1, 94):
        k.garis_v(x, b + 4, b + 95, KAYU); k.garis_v(x + 1, b + 4, b + 95, KAYU_G)
    for y in (b + 30, b + 60):
        k.kotak(0, y, 95, y + 1, KAYU); k.garis_h(0, 95, y + 2, KAYU_G)
    k.panel(14, b + 40, 81, b + 50, hx("e9a23b"), hx("f6c46b"), hx("b87a1f"))
    k.tulis("SEGERA", 48, b + 43, hx("3b2a20"))
    for x in range(0, 96, 8):                                   # pita pembatas kuning-hitam di alas
        k.kotak(x, b + 93, x + 3, b + 95, KUNING); k.kotak(x + 4, b + 93, x + 7, b + 95, GELAP)
    return k, A


def menara_jam():
    """Menara Jam Server di alun-alun: menara batu, atap genteng runcing, antena berlampu toska, jam (jarumnya digambar
    js/menara.js sesuai jam WIB), dua jendela lampu server (warnanya mengikuti kesehatan server), pintu lengkung.
    64 x 160; tapaknya 4 x 2 ubin. Mengembalikan juga letak jam dan jendela server (relatif gambar)."""
    W, H = 64, 160
    k = Kanvas(W, H)
    k.garis_v(32, 0, 14, GELAP); k.garis_h(27, 37, 8, GELAP)            # antena
    k.kotak(30, 0, 34, 3, SERVER); k.bingkai(30, 0, 34, 3, GARIS)
    k.pelana(32, 12, 62, 30, GENTENG, GENTENG_G, GENTENG_T)
    k.dinding(6, 42, 57, H - 1, BATU, BATU_G, BATU_T)
    k.kotak(4, 40, 59, 44, BATU_T); k.bingkai(4, 40, 59, 44, GARIS)
    jam = (32, 62, 12)
    cx, cy, r = jam
    for y in range(cy - r - 2, cy + r + 3):
        for x in range(cx - r - 2, cx + r + 3):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** .5
            if d <= r + 2:
                k.p(x, y, GARIS if d > r + 1 else BALOK if d > r else PUTIH)
    for i in range(12):                                          # titik jam
        import math
        a = i * math.pi / 6
        k.p(round(cx + math.sin(a) * (r - 2)), round(cy - math.cos(a) * (r - 2)), GARIS if i % 3 else MERAH)
    led = []
    for y0 in (84, 106):
        k.panel(16, y0, 47, y0 + 14, hx("1a2228"), hx("26323a"), hx("10161a"))
        for yy in (y0 + 4, y0 + 9):
            for x in range(19, 46, 3):
                k.p(x, yy, SERVER if (x + yy) % 4 else KUNING)
        led.append((17, y0 + 1, 30, 13))
    for y in range(126, H - 2):                                  # pintu lengkung kayu
        for x in range(20, 44):
            d = ((x - 31.5) ** 2 + (y - 138) ** 2) ** .5
            if y >= 138 or d <= 12:
                k.p(x, y, GARIS if (y < 138 and d > 11) or x in (20, 43) else KAYU_G if x % 4 == 0 else KAYU)
    k.p(39, 146, KUNING)
    k.panel(16, H - 3, 47, H - 1, BATU_T, PUTIH, BATU_G)
    return k, {"jam": jam, "led": led}


def papan_sponsor():
    """Papan iklan LED di pinggir lapangan 64 x 16 (4 ubin): rangka besi gelap, layar LED 60 x 9 di (2, 2), dua kaki.
    Isi layarnya (logo dan tulisan CodeIn yang bergerak) digambar js/sponsor.js."""
    k = Kanvas(64, 16)
    for x in (7, 55):
        k.kotak(x, 12, x + 1, 15, hx("3b3346")); k.p(x, 12, hx("5a5068"))
    k.panel(0, 0, 63, 12, hx("2a2f3a"), hx("454c5c"), hx("1a1d24"))
    k.kotak(2, 2, 61, 10, hx("0b0e14"))
    for x in range(2, 62, 2):                                  # kisi LED redup saat layar kosong
        for y in range(2, 11, 2):
            k.p(x, y, hx("161b25"))
    k.garis_h(1, 62, 11, hx("1a1d24"))
    k.p(3, 12, hx("e04a3a"))                                   # lampu daya
    return k


def sumur():
    """Sumur timba 32 x 36: cincin batu, atap kayu kecil di dua tiang, ember di tali."""
    k = Kanvas(32, 36)
    k.pelana(16, 0, 32, 9, GENTENG, GENTENG_G, GENTENG_T)
    for x in (5, 25):
        k.kotak(x, 9, x + 1, 26, BALOK)
    k.garis_h(5, 26, 11, BALOK)
    k.garis_v(16, 12, 17, GARIS); k.panel(13, 17, 19, 22, KAYU, KAYU_T, KAYU_G)
    for y in range(20, 35):
        for x in range(2, 30):
            d = ((x - 15.5) / 13.5) ** 2 + ((y - 27) / 7) ** 2
            if d <= 1:
                k.p(x, y, GARIS if d > .82 else BATU_G if (x + (y // 3) * 3) % 6 == 0 or y % 3 == 0 else BATU if (x // 6) % 2 else BATU_T)
    for y in range(22, 27):
        for x in range(7, 25):
            if ((x - 15.5) / 8) ** 2 + ((y - 24.5) / 2.4) ** 2 <= 1:
                k.p(x, y, hx("2f5f7a"))
    return k


def ikon_musik():
    """Not balok 16 x 16 untuk tombol musik di bilah atas."""
    k = Kanvas(16, 16)
    k.kotak(5, 2, 6, 11, GARIS); k.kotak(11, 1, 12, 10, GARIS)
    k.kotak(5, 1, 12, 3, GARIS); k.kotak(6, 2, 11, 2, KUNING)
    for (cx, cy) in ((4, 12), (10, 11)):
        k.kotak(cx - 2, cy - 1, cx + 2, cy + 1, GARIS); k.kotak(cx - 1, cy - 1, cx + 1, cy, KUNING)
    return k


def pohon():
    """Pohon kota 2.0 digambar sendiri (tools/gambar_benda.py), menggantikan pohon Kenney dengan nama yang sama."""
    return {n: k.im for n, k in gambar_benda.semua_pohon().items()}


def kemas(gambar, lebar=1024, jarak=2):
    urut = sorted(gambar.items(), key=lambda kv: (-kv[1].height, -kv[1].width, kv[0]))
    letak, x, y, rak = {}, jarak, jarak, 0
    for nama, im in urut:
        if x + im.width + jarak > lebar:
            x, y, rak = jarak, y + rak + jarak, 0
        letak[nama] = (x, y, im.width, im.height)
        x += im.width + jarak
        rak = max(rak, im.height)
    lembar = Image.new("RGBA", (lebar, y + rak + jarak), NOL)
    for nama, im in gambar.items():
        lembar.paste(im, letak[nama][:2])
    return lembar, letak


def main():
    gambar, info = {}, {}
    for nama, f in (("gedung-markas", markas), ("gedung-galeri", galeri), ("gedung-news", news),
                    ("gedung-aetheria", aetheria), ("gedung-toko", toko), ("warkop", warkop),
                    ("galeri-komunitas", galeri_komunitas), ("galeri-investasi", galeri_investasi)):
        hasil = f()
        gambar[nama] = hasil[0].im
        info[nama] = {"atas": hasil[1]}
        if len(hasil) > 2:
            info[nama]["ticker"] = hasil[2]
    for i in range(2):
        gambar[f"bendera-{i}"] = bendera(i).im
    k, letak_jam = menara_jam()
    gambar["menara-jam"] = k.im
    info["menara-jam"] = letak_jam
    gambar["sumur"] = sumur().im
    gambar["papan-sponsor"] = papan_sponsor().im
    info["papan-sponsor"] = {"layar": [2, 2, 60, 9]}
    gambar["logo-led"] = logo_piksel(9, terang=True)          # dipakai js/sponsor.js untuk isi layar LED
    # rumah warga: (atap, dinding, varian) seperti gaya rumah kampung sebelumnya
    for i, (atap, dinding, varian) in enumerate((("merah", "krem", 0), ("oranye", "batu", 1), ("merah", "kayu", 2),
                                                 ("oranye", "krem", 2), ("merah", "batu", 1), ("oranye", "kayu", 0))):
        hasil = rumah(6, atap, dinding, varian)
        gambar[f"rumah-{i}"] = hasil[0].im
        info[f"rumah-{i}"] = {"atas": hasil[1]}
    hasil = rumah(7, "oranye", "batu", 1, kol_pintu=3)
    gambar["rumah-proyek"] = hasil[0].im
    info["rumah-proyek"] = {"atas": hasil[1]}
    gambar.update(pohon())
    gambar.update({n: k.im for n, k in gambar_benda.semua().items()})
    keluar = PROYEK / "assets" / "sprites"
    keluar.mkdir(parents=True, exist_ok=True)
    URBAN.save(PROYEK / "assets" / "tiles" / "urban.png", optimize=True)      # tileset Kenney yang sudah diwarnai ulang
    lembar, letak = kemas(gambar)
    lembar.save(keluar / "gedung.png", optimize=True)
    frames = {n: {"frame": {"x": x, "y": y, "w": w, "h": h}, "rotated": False, "trimmed": False,
                  "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h}, "sourceSize": {"w": w, "h": h}} for n, (x, y, w, h) in sorted(letak.items())}
    (keluar / "gedung.json").write_text(json.dumps({"frames": frames, "meta": {"image": "gedung.png", "format": "RGBA8888",
                                         "size": {"w": lembar.width, "h": lembar.height}, "scale": "1", "codein": info}}, separators=(",", ":")))
    ikon_musik().im.save(keluar / "ikon-musik.png", optimize=True)
    gambar_orang.lembar().save(keluar / "orang.png", optimize=True)
    # ubin ruangan: 8 kolom, margin 1, jarak 2, tepi diperpanjang supaya tidak ada garis saat kamera bergeser
    ubin = gambar_benda.ubin_ruang()
    kolom = 8
    baris = (len(ubin) + kolom - 1) // kolom
    lembar_ubin = Image.new("RGBA", (kolom * 18, baris * 18), NOL)
    for i, (_, k) in enumerate(ubin):
        x, y = 1 + (i % kolom) * 18, 1 + (i // kolom) * 18
        g = k.im
        for dx, dy, kotak in ((-1, 0, (0, 0, 1, 16)), (16, 0, (15, 0, 16, 16)), (0, -1, (0, 0, 16, 1)), (0, 16, (0, 15, 16, 16))):
            lembar_ubin.paste(g.crop(kotak), (x + dx, y + dy))
        lembar_ubin.paste(g, (x, y))
    lembar_ubin.save(PROYEK / "assets" / "tiles" / "ruang.png", optimize=True)
    (keluar / "ruang.json").write_text(json.dumps({n: i for i, (n, _) in enumerate(ubin)}, separators=(",", ":")))
    print(f"gedung.png: {lembar.width}x{lembar.height}, {len(letak)} gambar")


main()

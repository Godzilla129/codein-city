"""Benda CodeIn City bergaya Kenney (dipanggil tools/buat_gambar.py): perabot ruangan, properti kota, kendaraan, dan ubin ruangan.
Bentuknya mengacu ke paket "CodeIn City Retro" dan "Top-Down Retro Interior" yang dikirim Jull; warnanya mengikuti RPG Urban Pack.
Setiap fungsi mengembalikan Kanvas; ukurannya ditulis di docstring (lebar x tinggi piksel)."""
from PIL import Image

from kanvas import *          # noqa: F401,F403

# kayu perabot: lebih kalem dari kayu pintu Kenney
MEJA, MEJA_G, MEJA_T, MEJA_GG = hx("c99a6b"), hx("a87a52"), hx("ddb58a"), hx("7f5a3d")
KAIN, KAIN_G, KAIN_T = hx("d98b5f"), hx("b56e47"), hx("eaa77c")      # sofa oranye bata
HIJAU_TUA = hx("4c7d3f")


def bayangan(k, x0, x1, y):
    for x in range(x0, x1 + 1):
        k.p(x, y, (60, 52, 44, 70))


# ======================================================================================================
#  PERABOT
# ======================================================================================================
def meja(w=32, h=20, laci=True):
    """Meja kayu tampak 3/4 seukuran karakter Kenney: daun meja di atas, sisi depan berlaci, kaki. w x h."""
    k = Kanvas(w, h)
    k.panel(0, 0, w - 1, 7, MEJA_T, hx("ecd2b0"), MEJA)
    for x in range(4, w - 4, 6):
        k.p(x, 3, MEJA)
    k.panel(1, 7, w - 2, h - 4, MEJA, MEJA_T, MEJA_G)
    if laci:
        for x0 in range(3, w - 9, 10):
            k.panel(x0, 9, x0 + 7, h - 6, MEJA_G, MEJA, MEJA_GG)
            k.p(x0 + 3, h - 8, KUNING); k.p(x0 + 4, h - 8, KUNING)
    for x in (1, w - 3):
        k.kotak(x, h - 4, x + 1, h - 1, MEJA_GG)
    bayangan(k, 2, w - 3, h - 1)
    return k


def meja_resepsionis():
    """Meja resepsionis Markas 48 x 22: daun meja, panel krem dengan logo </> CodeIn, buku tamu dan telepon."""
    k = Kanvas(48, 22)
    k.panel(0, 0, 47, 6, MEJA_T, hx("ecd2b0"), MEJA)
    k.panel(1, 6, 46, 21, KREM, KREM_T, KREM_G)
    k.panel(16, 9, 31, 17, hx("2a9d8f"), hx("5cc0b2"), hx("1f6f66"))
    for (x, y) in ((20, 11), (19, 12), (18, 13), (19, 14), (20, 15), (27, 11), (28, 12), (29, 13), (28, 14), (27, 15),
                   (24, 11), (24, 12), (23, 13), (23, 14), (22, 15)):
        k.p(x, y, PUTIH)
    k.kotak(3, 1, 9, 4, hx("efe6d6")); k.bingkai(3, 1, 9, 4, GARIS)
    k.kotak(38, 1, 43, 4, GELAP); k.bingkai(38, 1, 43, 4, GARIS); k.p(40, 2, KUNING)
    return k


def kursi(arah="bawah"):
    """Kursi kayu 12 x 14. 'bawah' = sandaran di belakang (menghadap pengunjung), 'atas' = sandaran di depan."""
    k = Kanvas(12, 14)
    if arah == "bawah":
        k.panel(1, 0, 10, 6, MEJA, MEJA_T, MEJA_G)
        k.panel(0, 5, 11, 9, MEJA_T, hx("ecd2b0"), MEJA)
    else:
        k.panel(0, 2, 11, 6, MEJA_T, hx("ecd2b0"), MEJA)
        k.panel(1, 5, 10, 10, MEJA, MEJA_T, MEJA_G)
    for x in (1, 9):
        k.kotak(x, 10, x + 1, 13, MEJA_GG)
    return k


def kursi_kantor():
    """Kursi kerja beroda 12 x 15 tampak belakang."""
    k = Kanvas(12, 15)
    k.panel(1, 0, 10, 8, GELAP_T, hx("736b86"), GELAP)
    k.panel(0, 7, 11, 10, GELAP, GELAP_T, hx("2f2b3a"))
    k.garis_v(5, 11, 13, GARIS); k.garis_v(6, 11, 13, GARIS)
    k.garis_h(1, 10, 13, GARIS)
    for x in (1, 5, 9):
        k.kotak(x, 14, x + 1, 14, GARIS)
    return k


def sofa(w=32):
    """Sofa oranye bata w x 18."""
    k = Kanvas(w, 18)
    k.panel(2, 0, w - 3, 8, KAIN, KAIN_T, KAIN_G)
    k.garis_v(w // 2, 2, 7, KAIN_G)
    k.panel(2, 7, w - 3, 14, KAIN_T, hx("f4c39f"), KAIN)
    k.garis_v(w // 2, 8, 13, KAIN)
    for x0 in (0, w - 5):
        k.panel(x0, 4, x0 + 4, 15, KAIN, KAIN_T, KAIN_G)
    k.kotak(2, 15, 3, 17, KAYU_G); k.kotak(w - 4, 15, w - 3, 17, KAYU_G)
    bayangan(k, 2, w - 3, 17)
    return k


def bangku_galeri():
    """Bangku empuk galeri 32 x 12: dudukan hijau toska berkancing, kaki kayu."""
    k = Kanvas(32, 12)
    k.panel(0, 0, 31, 7, hx("2a9d8f"), hx("5cc0b2"), hx("1f6f66"))
    for x in range(5, 30, 7):
        k.p(x, 3, hx("1f6f66"))
    k.panel(1, 6, 30, 8, MEJA, MEJA_T, MEJA_G)
    for x in (2, 28):
        k.kotak(x, 9, x + 1, 11, MEJA_GG)
    return k


def rak_buku(w=24, h=30):
    """Rak buku w x h: bingkai kayu, tiga papan, buku warna-warni."""
    k = Kanvas(w, h)
    k.panel(0, 0, w - 1, h - 1, MEJA_G, MEJA, MEJA_GG)
    warna = [hx("c75a52"), hx("2a9d8f"), hx("e9a23b"), hx("5466d1"), hx("86c264"), hx("efe6d6"), hx("9f8fc4")]
    tinggi_rak = (h - 4) // 3
    for j in range(3):
        y0, y1 = 2 + j * tinggi_rak, 2 + j * tinggi_rak + tinggi_rak - 3
        k.kotak(2, y0, w - 3, y1, hx("5e3f2b"))
        x, n = 3, j * 3
        while x < w - 3:
            lebar = 2 if n % 3 else 1
            t = y1 - y0 - (n % 2)
            k.kotak(x, y1 - t + 1, x + lebar - 1, y1, warna[n % len(warna)])
            x += lebar + (1 if n % 4 == 3 else 0)
            n += 1
        k.garis_h(1, w - 2, y1 + 1, MEJA_T)
        k.garis_h(1, w - 2, y1 + 2, MEJA_G)
    return k


def lemari():
    """Lemari laci 22 x 22 dengan vas bunga di atasnya."""
    k = Kanvas(22, 22)
    k.panel(0, 6, 21, 21, MEJA, MEJA_T, MEJA_G)
    for y in (8, 13):
        k.panel(2, y, 19, y + 3, MEJA_G, MEJA, MEJA_GG)
        k.kotak(10, y + 2, 11, y + 2, KUNING)
    k.panel(8, 1, 13, 6, hx("5466d1"), hx("7b8be0"), hx("3f4ea8"))
    for (x, y, c) in ((9, 0, MERAH), (11, 0, KUNING), (12, 1, MERAH), (10, 1, HIJAU)):
        k.p(x, y, c)
    return k


def jam_besar():
    """Jam lantai kayu 12 x 28 dengan bandul."""
    k = Kanvas(12, 28)
    k.panel(1, 0, 10, 27, MEJA_G, MEJA, MEJA_GG)
    for y in range(2, 10):
        for x in range(2, 10):
            d = ((x - 5.5) ** 2 + (y - 5.5) ** 2) ** .5
            if d <= 3.8:
                k.p(x, y, GARIS if d > 3 else hx("f4ecd8"))
    k.garis_v(6, 4, 6, GARIS); k.p(7, 6, GARIS)
    k.panel(3, 12, 8, 24, hx("5e3f2b"), MEJA_G, hx("4a3122"))
    k.garis_v(5, 13, 20, KUNING); k.kotak(5, 20, 6, 21, KUNING)
    return k


def lampu_lantai():
    """Lampu berdiri 9 x 24 dengan kap krem."""
    k = Kanvas(9, 24)
    for y in range(0, 7):
        setengah = 1 + y // 2
        k.garis_h(4 - setengah, 4 + setengah, y, hx("f4ecd8") if y < 5 else KREM_G)
        k.p(4 - setengah, y, GARIS); k.p(4 + setengah, y, GARIS)
    k.garis_h(0, 8, 7, GARIS)
    k.garis_v(4, 8, 21, GARIS)
    k.kotak(2, 21, 6, 23, MEJA_GG)
    return k


def tanaman_pot(besar=False):
    """Tanaman dalam pot terakota, 12 x 18 (besar: 14 x 22)."""
    import math
    w, h = (14, 22) if besar else (12, 18)
    k = Kanvas(w, h)
    for i in range(7):
        sudut = -math.pi / 2 + (i - 3) * .45
        for t in range(2, h - 7):
            x = int(w / 2 + math.cos(sudut) * t * .45)
            y = int(h - 8 + math.sin(sudut) * t)
            k.p(x, y, HIJAU if (t + i) % 4 else hx("a0d671"))
            k.p(x - 1, y, HIJAU_TUA); k.p(x + 1, y, HIJAU)
    k.panel(w // 2 - 4, h - 7, w // 2 + 3, h - 1, hx("c4704a"), hx("dd8a5f"), hx("9c5538"))
    return k


def karpet(w=64, h=32, warna=(hx("b5574b"), hx("8f4038"), hx("e9a23b"))):
    """Karpet bermotif belah ketupat dengan rumbai, w x h."""
    isi, gelap, motif = warna
    k = Kanvas(w, h)
    k.kotak(2, 0, w - 3, h - 1, isi)
    k.bingkai(4, 2, w - 5, h - 3, motif)
    for y in range(4, h - 4):
        for x in range(6, w - 6):
            if (abs(x - w // 2) + abs(y - h // 2)) % 10 in (0, 1):
                k.p(x, y, gelap)
    for y in range(0, h, 2):
        k.p(0, y, KREM_T); k.p(1, y, KREM_T); k.p(w - 1, y, KREM_T); k.p(w - 2, y, KREM_T)
    return k


def kulkas():
    """Kulkas dua pintu 14 x 24."""
    k = Kanvas(14, 24)
    k.panel(0, 0, 13, 23, hx("e8eef0"), PUTIH, hx("b9c4c8"))
    k.garis_h(1, 12, 8, hx("b9c4c8"))
    k.kotak(10, 3, 10, 6, GARIS); k.kotak(10, 10, 10, 16, GARIS)
    k.kotak(3, 11, 6, 14, hx("fcaf5f")); k.kotak(3, 16, 5, 17, hx("86c264"))
    return k


def dispenser():
    """Dispenser air galon 9 x 20."""
    k = Kanvas(9, 20)
    k.panel(1, 0, 7, 7, hx("9fd1e8"), hx("c8e8f4"), hx("78b2cc"))
    k.panel(0, 7, 8, 19, hx("e8eef0"), PUTIH, hx("b9c4c8"))
    k.p(2, 10, MERAH); k.p(6, 10, BIRU)
    k.garis_h(2, 6, 13, GARIS)
    return k


def lukisan(w=18, h=13, warna=hx("e9a23b")):
    """Lukisan berbingkai kayu untuk dinding."""
    k = Kanvas(w, h)
    k.panel(0, 0, w - 1, h - 1, MEJA_G, MEJA, MEJA_GG)
    k.kotak(2, 2, w - 3, h - 3, hx("bfe1ea"))
    for x in range(2, w - 2):
        y = h - 5 - int(2 * abs(((x * 7) % 11) / 11 - .5))
        k.garis_v(x, y, h - 3, HIJAU if x % 5 else HIJAU_TUA)
    k.kotak(w - 7, 3, w - 6, 4, warna)
    return k


def jendela_dinding():
    """Jendela di dinding dalam ruangan 22 x 18, tirai di kiri-kanan."""
    k = Kanvas(22, 18)
    k.jendela(4, 2, 14, 12, kayu=True)
    for x0 in (0, 18):
        k.panel(x0, 0, x0 + 3, 16, hx("d98b5f"), hx("eaa77c"), hx("b56e47"))
    k.garis_h(0, 21, 0, MEJA_GG)
    return k


def meja_bundar():
    """Meja bundar kecil 16 x 14 dengan teko dan cangkir."""
    k = Kanvas(16, 14)
    for y in range(0, 7):
        for x in range(16):
            d = ((x - 7.5) / 7.5) ** 2 + ((y - 3) / 3) ** 2
            if d <= 1:
                k.p(x, y, MEJA_G if d > .7 else MEJA_T)
    k.kotak(7, 7, 8, 12, MEJA_G); k.kotak(4, 12, 11, 13, MEJA_GG)
    k.panel(4, 0, 7, 3, PUTIH, PUTIH, KREM_G); k.p(10, 2, PUTIH); k.p(11, 2, KREM_G)
    return k


def mesin_kopi():
    """Konter dapur 32 x 22 dengan mesin kopi merah dan cangkir."""
    k = Kanvas(32, 22)
    k.panel(0, 9, 31, 21, MEJA, MEJA_T, MEJA_G)
    k.panel(0, 7, 31, 10, KREM_T, PUTIH, KREM_G)
    k.panel(3, 0, 13, 9, hx("e5534b"), hx("f07a72"), hx("b83f38"))
    k.kotak(5, 2, 11, 4, hx("2e2017")); k.p(6, 3, hx("7fe0a0"))
    k.kotak(7, 6, 9, 8, PUTIH)
    k.panel(19, 4, 22, 8, PUTIH, PUTIH, KREM_G); k.panel(24, 5, 27, 8, hx("fcaf5f"), KUNING, ORANYE)
    k.garis_v(16, 12, 19, MEJA_G)
    k.kotak(7, 15, 8, 15, KUNING); k.kotak(23, 15, 24, 15, KUNING)
    return k


def meja_komputer():
    """Meja terminal 24 x 22 dengan monitor menyala (layar CodeIn News)."""
    g = Kanvas(24, 22)
    g.tempel(meja(24, 14, laci=False).im, 0, 8)
    g.panel(5, 0, 18, 10, GELAP, GELAP_T, hx("2f2b3a"))
    g.kotak(7, 2, 16, 7, hx("1e2433"))
    g.kotak(8, 3, 13, 3, hx("e9a23b")); g.kotak(8, 5, 15, 5, hx("4fc3f7"))
    g.kotak(11, 10, 12, 11, GARIS)
    return g


def papan_tulis():
    """Papan tulis kecil di kaki tiga, 18 x 22."""
    k = Kanvas(18, 22)
    k.panel(0, 0, 17, 12, hx("f4f6f0"), PUTIH, hx("c9cfc4"))
    for (y, w, c) in ((3, 10, hx("5466d1")), (6, 7, hx("c75a52")), (9, 12, hx("2a9d8f"))):
        k.garis_h(2, 2 + w, y, c)
    for (x0, x1) in ((3, 1), (14, 16)):
        for i in range(9):
            k.p(x0 + (x1 - x0) * i // 8, 13 + i, MEJA_GG)
    return k


# ======================================================================================================
#  PROPERTI KOTA
# ======================================================================================================
def lapak(atap, barang):
    """Lapak pasar 32 x 32: tenda bergaris di dua tiang, ruang terbuka tempat pedagang berdiri (kepala dan bahunya terlihat),
    meja dengan dagangan. atap = (warna, warna2); barang = sayur, buah, ikan, kain, jamu, kue, mainan, kelapa."""
    k = Kanvas(32, 32)
    w1, w2 = atap
    for x in range(0, 32):
        c = w1 if (x // 4) % 2 == 0 else w2
        for y in range(0, 6):
            k.p(x, y, c)
        if x % 4 in (1, 2):
            k.p(x, 6, c)
    k.garis_h(0, 31, 0, GARIS)
    for x in range(32):
        k.p(x, 6 if x % 4 in (0, 3) else 7, GARIS)
    for x in (1, 29):
        k.kotak(x, 7, x + 1, 31, MEJA_GG)
    k.panel(0, 22, 31, 31, MEJA, MEJA_T, MEJA_G)                    # meja depan
    k.garis_h(1, 30, 26, MEJA_G)
    warna = {"sayur": [HIJAU, hx("4c7d3f"), hx("e26c62")], "buah": [hx("e9a23b"), MERAH, KUNING], "ikan": [hx("9fb8c8"), hx("7a95a8"), PUTIH],
             "kain": [hx("5466d1"), hx("c75a52"), hx("e9a23b")], "jamu": [hx("e9a23b"), hx("c4704a"), hx("efe6d6")],
             "kue": [hx("f7a8c4"), hx("efe6d6"), hx("c4704a")], "mainan": [hx("5466d1"), MERAH, KUNING], "kelapa": [hx("8a6a4a"), hx("86c264"), hx("6b4a35")]}[barang]
    for i, x in enumerate(range(3, 29, 4)):
        c = warna[i % len(warna)]
        if barang == "ikan":
            k.kotak(x, 20, x + 3, 21, c); k.p(x + 3, 19, c); k.p(x, 20, GARIS)
        elif barang == "kain":
            k.panel(x, 18, x + 3, 22, c, c, GARIS); k.garis_v(x + 1, 18, 22, PUTIH)
        elif barang == "jamu":
            k.kotak(x + 1, 17, x + 2, 18, GARIS); k.panel(x, 18, x + 3, 22, c, PUTIH, GARIS)
        else:
            k.panel(x, 19, x + 3, 22, c, c, GARIS)
            if barang in ("mainan", "kue"):
                k.p(x + 1, 18, KUNING)
    return k


def halte():
    """Halte bus 48 x 40: atap hijau toska, dinding kaca belakang, bangku, papan rute."""
    k = Kanvas(48, 40)
    k.panel(0, 0, 47, 7, hx("2a9d8f"), hx("5cc0b2"), hx("1f6f66"))
    k.panel(38, 0, 46, 5, KUNING, hx("ffd08c"), ORANYE)
    k.kotak(3, 8, 44, 30, KACA); k.bingkai(3, 8, 44, 30, GARIS)
    for x in range(5, 44, 6):
        k.p(x, 10 + (x % 4), KACA_T); k.p(x + 1, 11 + (x % 4), KACA_T)
    k.panel(28, 12, 40, 22, PUTIH, PUTIH, KREM_G)
    k.garis_h(30, 38, 15, MERAH); k.garis_h(30, 36, 18, BIRU)
    for x in (2, 45):
        k.kotak(x, 8, x + 1, 39, GARIS)
    k.panel(6, 26, 41, 31, MEJA, MEJA_T, MEJA_G)
    for x in (8, 38):
        k.kotak(x, 32, x + 1, 37, MEJA_GG)
    bayangan(k, 2, 45, 39)
    return k


def gerobak():
    """Gerobak bakso 36 x 34: atap seng merah-putih, etalase kaca berisi mangkuk, roda, tulisan BAKSO."""
    k = Kanvas(36, 34)
    for x in range(2, 34):
        k.kotak(x, 0, x, 4, MERAH if (x // 4) % 2 else PUTIH)
    k.bingkai(2, 0, 33, 4, GARIS)
    k.garis_v(4, 5, 14, GARIS); k.garis_v(31, 5, 14, GARIS)
    k.kotak(5, 8, 30, 16, KACA); k.bingkai(5, 8, 30, 16, GARIS)
    for x in (9, 17, 24):
        k.panel(x, 12, x + 4, 15, PUTIH, PUTIH, KREM_G); k.p(x + 2, 12, KUNING)
    k.panel(2, 16, 33, 27, hx("2a9d8f"), hx("5cc0b2"), hx("1f6f66"))
    k.tulis("BAKSO", 18, 19, PUTIH)
    for cx in (8, 27):
        for y in range(26, 34):
            for x in range(cx - 4, cx + 5):
                d = ((x - cx) ** 2 + (y - 29.5) ** 2) ** .5
                if d <= 4.2:
                    k.p(x, y, GARIS if d > 3 else BATU_G if d > 1.5 else GARIS)
    k.garis_h(33, 35, 20, GARIS); k.garis_h(33, 35, 21, MEJA_G)
    return k


def pos_ronda():
    """Pos ronda 48 x 46: atap genteng, tiang kayu, balai-balai, kentongan dan lampu."""
    k = Kanvas(48, 46)
    k.pelana(24, 0, 48, 16, GENTENG, GENTENG_G, GENTENG_T)
    k.kotak(1, 16, 46, 18, MEJA_G); k.bingkai(1, 16, 46, 18, GARIS)
    for x in (3, 42):
        k.panel(x, 18, x + 3, 44, MEJA, MEJA_T, MEJA_G)
    k.kotak(7, 19, 40, 32, hx("8a6a4a"))
    k.panel(5, 32, 42, 38, MEJA_T, hx("ecd2b0"), MEJA)
    for x in range(8, 40, 4):
        k.garis_v(x, 33, 37, MEJA)
    k.kotak(10, 38, 11, 43, MEJA_GG); k.kotak(36, 38, 37, 43, MEJA_GG)
    k.panel(14, 20, 17, 30, MEJA_G, MEJA, MEJA_GG)            # kentongan
    k.garis_h(15, 16, 23, GARIS)
    k.kotak(29, 19, 32, 22, KUNING); k.bingkai(29, 19, 32, 22, GARIS)   # lampu
    bayangan(k, 3, 45, 45)
    return k


def kolam():
    """Kolam teratai 48 x 34 berpinggir batu."""
    k = Kanvas(48, 34)
    for y in range(34):
        for x in range(48):
            d = ((x - 23.5) / 23.5) ** 2 + ((y - 16.5) / 16.5) ** 2
            if d <= 1:
                k.p(x, y, GARIS if d > .9 else BATU_T if d > .78 else BATU if d > .7 else hx("82d5c0") if (x + y) % 13 else hx("8ddec8"))
    for (cx, cy) in ((14, 13), (31, 19), (22, 23), (34, 10)):
        for y in range(cy - 2, cy + 3):
            for x in range(cx - 3, cx + 4):
                if ((x - cx) / 3.2) ** 2 + ((y - cy) / 2.2) ** 2 <= 1 and not (x == cx + 1 and y <= cy):
                    k.p(x, y, HIJAU if y < cy + 1 else HIJAU_TUA)
    k.p(31, 18, hx("f7a8c4")); k.p(32, 18, hx("f7a8c4")); k.p(31, 17, PUTIH)
    for x in range(10, 38, 9):
        k.garis_h(x, x + 3, 21 + x % 3, hx("bdf0e2"))
    return k


def beringin():
    """Pohon beringin besar 56 x 56: tajuk lebar, akar gantung."""
    k = Kanvas(56, 56)
    for y in range(36, 56):
        for x in range(21, 35):
            k.p(x, y, hx("9a6b4c") if x < 28 else hx("7f5a3d"))
    k.garis_v(20, 36, 55, GARIS); k.garis_v(35, 36, 55, GARIS)
    for (cx, cy, r) in ((28, 20, 20), (14, 26, 12), (42, 26, 12), (20, 12, 11), (36, 12, 11)):
        for y in range(cy - r, cy + r):
            for x in range(cx - r - 4, cx + r + 4):
                d = ((x - cx) / (r + 4)) ** 2 + ((y - cy) / r) ** 2
                if d <= 1:
                    k.p(x, y, hx("a0d671") if d < .35 and y < cy else HIJAU if d < .75 else hx("69ae59"))
    px = k.im.load()
    for y in range(56):
        for x in range(56):
            if px[x, y][3] and px[x, y][:3] in (hx("69ae59")[:3], HIJAU[:3], hx("a0d671")[:3]):
                if any(not (0 <= x + dx < 56 and 0 <= y + dy < 56) or not px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    px[x, y] = HIJAU_TUA
    for x in (16, 22, 33, 40):
        for y in range(34, 44 + x % 5):
            k.p(x, y, hx("7f5a3d"))
    for x in range(18, 38):
        k.p(x, 55, (60, 52, 44, 80))
    return k


def palem():
    """Pohon palem 32 x 48."""
    k = Kanvas(32, 48)
    for y in range(14, 47):
        x = 15 + (y - 14) // 12
        k.kotak(x, y, x + 2, y, hx("b88d63") if y % 3 else hx("8a6a4a"))
        k.p(x - 1, y, GARIS); k.p(x + 3, y, GARIS)
    import math
    for i in range(7):
        sudut = math.pi + i * math.pi / 6
        for t in range(2, 15):
            x = int(16 + math.cos(sudut) * t)
            y = int(14 + math.sin(sudut) * t * .7 + t * t * .035)
            k.p(x, y, HIJAU if t % 3 else hx("a0d671"))
            k.p(x, y + 1, HIJAU_TUA)
    k.kotak(14, 12, 17, 15, hx("8a6a4a"))
    return k


def meja_warkop():
    """Meja warkop 32 x 20 dengan dua gelas kopi dan bangku panjang."""
    k = meja(32, 14, laci=False)
    g = Kanvas(32, 20)
    g.tempel(k.im, 0, 0)
    for x in (7, 21):
        g.panel(x, 0, x + 4, 5, PUTIH, PUTIH, KREM_G); g.kotak(x + 1, 1, x + 3, 1, hx("5e3f2b"))
    g.panel(0, 14, 31, 17, MEJA_G, MEJA, MEJA_GG)
    g.kotak(2, 17, 3, 19, MEJA_GG); g.kotak(28, 17, 29, 19, MEJA_GG)
    return g


def net_badminton():
    """Net badminton 48 x 20."""
    k = Kanvas(48, 20)
    for x in (1, 46):
        k.kotak(x, 0, x + 1, 19, GARIS)
    for y in range(3, 12):
        for x in range(3, 46):
            if (x + y) % 3 == 0 or y in (3, 11):
                k.p(x, y, PUTIH if y == 3 else hx("efe6d6"))
    return k


def lampu_merah():
    """Lampu lalu lintas 10 x 30."""
    k = Kanvas(10, 30)
    k.panel(1, 0, 8, 17, GELAP, GELAP_T, hx("2f2b3a"))
    for i, c in enumerate((MERAH, KUNING, HIJAU)):
        k.kotak(3, 2 + i * 5, 6, 5 + i * 5, c)
    k.kotak(4, 18, 5, 29, GARIS)
    return k


# ======================================================================================================
#  KENDARAAN (tampak atas, sama dengan mobil Kenney: samping 32 x 16, depan/belakang 16 x 32; motor 16 x 16)
# ======================================================================================================
def angkot(arah):
    """Angkot hijau toska dengan atap putih dan rak."""
    BADAN, BADAN_G, BADAN_T = hx("2a9d8f"), hx("1f6f66"), hx("5cc0b2")
    if arah in ("kiri", "kanan"):
        k = Kanvas(32, 16)
        k.panel(1, 1, 30, 13, BADAN, BADAN_T, BADAN_G, hx("17504a"))
        k.panel(6, 3, 25, 10, PUTIH, PUTIH, hx("d9dccf"), hx("17504a"))
        for x in range(8, 24, 4):
            k.garis_v(x, 4, 9, hx("d9dccf"))
        depan = 27 if arah == "kanan" else 1
        k.kotak(depan, 3, depan + 2, 11, KACA_T); k.bingkai(depan, 3, depan + 2, 11, hx("17504a"))
        lampu = 30 if arah == "kanan" else 1
        k.p(lampu, 3, KUNING); k.p(lampu, 11, KUNING)
        for x in (6, 22):
            k.kotak(x, 13, x + 4, 15, GARIS)
        return k
    k = Kanvas(16, 32)
    k.panel(1, 1, 14, 30, BADAN, BADAN_T, BADAN_G, hx("17504a"))
    kaca_y = 3 if arah == "atas" else 23
    k.kotak(3, kaca_y, 12, kaca_y + 4, KACA); k.bingkai(3, kaca_y, 12, kaca_y + 4, hx("17504a"))
    k.panel(3, 9 if arah == "bawah" else 9, 12, 20, PUTIH, PUTIH, hx("d9dccf"), hx("17504a"))
    ujung = 29 if arah == "bawah" else 2
    k.p(3, ujung, KUNING if arah == "bawah" else MERAH); k.p(12, ujung, KUNING if arah == "bawah" else MERAH)
    for y in (6, 22):
        k.kotak(0, y, 0, y + 3, GARIS); k.kotak(15, y, 15, y + 3, GARIS)
    return k


def garis_luar(k, warna=hx("3a3440")):
    """Garis tepi 1 piksel di luar siluet (seperti sprite Kenney)."""
    px = k.im.load()
    isi = {(x, y) for y in range(k.h) for x in range(k.w) if px[x, y][3]}
    for (x, y) in list(isi):
        for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if 0 <= n[0] < k.w and 0 <= n[1] < k.h and n not in isi:
                px[n] = warna
    return k


def motor(arah, ojol=False):
    """Motor bebek berpengendara berhelm, bergaris tepi gelap. Tampak samping 28 x 21: dua roda bulat berpelek, bodi,
    jok, tameng depan berlampu, knalpot. Tampak depan/belakang 14 x 23: roda tegak, setang dan spion, lampu.
    Motor biasa merah dengan jaket biru; ojol bodi biru, jaket dan helm hijau, kotak pesanan di jok belakang."""
    BODI, BODI_T, BODI_G = (hx("e26c62"), hx("f08a80"), hx("b8443c")) if not ojol else (hx("5466d1"), hx("7a8be0"), hx("3f4ea8"))
    JAKET, JAKET_T, JAKET_G = (hx("3e9e5a"), hx("62bb7c"), hx("2f7a45")) if ojol else (hx("5b8cc7"), hx("7fa9de"), hx("4870a8"))
    HELM, HELM_T = (hx("2f7a45"), hx("4f9e66")) if ojol else (hx("e9a23b"), hx("f6c46b"))
    BAN, PELEK, KULIT, CELANA, KACA, JOK = hx("2e2a33"), hx("c9c3b8"), hx("ffcb9e"), hx("4a4e6e"), hx("2e2a33"), hx("3b3540")
    KOTAK, KOTAK_T = hx("3e9e5a"), hx("8fd6a5")
    if arah in ("kiri", "kanan"):
        k = Kanvas(28, 21)
        for cx in (6, 21):                                          # roda: ban, pelek, as
            for y in range(11, 21):
                for x in range(cx - 5, cx + 6):
                    d = ((x - cx) ** 2 + (y - 15.5) ** 2) ** .5
                    if d <= 4.4:
                        k.p(x, y, BAN if d > 2.6 else PELEK if d > 1.1 else GARIS)
        k.kotak(3, 10, 9, 11, BODI_G)                               # spakbor belakang
        k.kotak(2, 14, 8, 14, BATU_G)                               # knalpot
        k.kotak(8, 11, 18, 13, BODI); k.garis_h(8, 18, 11, BODI_T); k.garis_h(8, 18, 13, BODI_G)
        for i in range(6):                                          # garpu depan miring
            k.p(19 + i // 3, 8 + i, GARIS); k.p(20 + i // 3, 8 + i, GARIS)
        k.kotak(19, 7, 22, 11, BODI); k.garis_v(19, 7, 11, BODI_T); k.kotak(23, 8, 23, 9, KUNING)   # tameng + lampu
        k.kotak(7, 9, 14, 10, JOK)
        if ojol:
            k.kotak(2, 3, 7, 8, KOTAK); k.garis_h(2, 7, 3, KOTAK_T); k.garis_h(3, 6, 6, KOTAK_T)
        k.kotak(10, 3, 14, 8, JAKET); k.garis_v(10, 3, 8, JAKET_T)  # badan pengendara
        k.kotak(14, 5, 18, 5, JAKET_G); k.p(19, 5, KULIT)           # lengan dan tangan
        k.kotak(19, 6, 20, 6, GARIS)                                # setang
        k.kotak(12, 8, 16, 9, CELANA); k.kotak(15, 10, 16, 12, CELANA); k.kotak(15, 13, 17, 13, GARIS)   # kaki
        k.kotak(10, 0, 15, 3, HELM); k.garis_h(11, 14, 0, HELM_T); k.kotak(14, 1, 15, 2, KACA)          # helm
        garis_luar(k)
        if arah == "kiri":
            k.im = k.im.transpose(Image.FLIP_LEFT_RIGHT); k.px = k.im.load()
        return k
    depan = arah == "bawah"
    k = Kanvas(14, 23)
    k.kotak(6, 15, 7, 22, BAN)                                      # roda tegak
    k.kotak(4, 10, 9, 15, BODI); k.garis_h(4, 9, 10, BODI_T); k.garis_h(4, 9, 15, BODI_G)
    if depan:
        k.kotak(6, 11, 7, 12, KUNING)                               # lampu depan
    else:
        k.kotak(5, 14, 8, 14, MERAH)                                # lampu rem
    k.kotak(1, 8, 12, 8, GARIS)                                     # setang
    k.kotak(1, 5, 1, 7, GARIS); k.kotak(12, 5, 12, 7, GARIS)        # tangkai spion
    k.kotak(0, 4, 2, 5, PELEK); k.kotak(11, 4, 13, 5, PELEK)        # spion
    k.kotak(4, 4, 9, 9, JAKET); k.garis_v(4, 4, 9, JAKET_T); k.garis_v(9, 4, 9, JAKET_G)
    k.p(2, 8, KULIT); k.p(11, 8, KULIT)                             # tangan
    if ojol and not depan:
        k.kotak(3, 6, 10, 11, KOTAK); k.garis_h(3, 10, 6, KOTAK_T); k.garis_h(4, 9, 9, KOTAK_T)
    k.kotak(4, 0, 9, 3, HELM); k.garis_h(5, 8, 0, HELM_T)
    if depan:
        k.kotak(5, 2, 8, 2, KACA)                                   # kaca helm
    garis_luar(k)
    return k


# ======================================================================================================
#  UBIN RUANGAN (assets/tiles/ruang.png): lantai dan dinding dalam gedung
# ======================================================================================================
def _ubin():
    return Kanvas(16, 16)


def lantai_kayu(varian=0):
    k = _ubin()
    w = (hx("d9a978"), hx("cf9d6b"), hx("c79563"), hx("d4a372"))
    for r in range(4):
        y0 = r * 4
        k.kotak(0, y0, 15, y0 + 3, w[(r + varian) % 4])
        k.garis_h(0, 15, y0 + 3, hx("b07f50"))
        sambung = (r * 7 + varian * 5) % 16
        k.garis_v(sambung, y0, y0 + 2, hx("b07f50"))
        k.p((sambung + 5) % 16, y0 + 1, hx("e2b88a"))
    return k


def lantai_ubin(varian=0):
    """Ubin krem-abu bermotif belah ketupat (galeri)."""
    k = _ubin()
    k.kotak(0, 0, 15, 15, hx("e6dcc8"))
    for y in range(16):
        for x in range(16):
            if abs(x - 7.5) + abs(y - 7.5) <= 6:
                k.p(x, y, hx("d6cab2") if varian == 0 else hx("dccfb6"))
            if abs(x - 7.5) + abs(y - 7.5) in (6, 6.0):
                k.p(x, y, hx("c4b79c"))
    k.garis_h(0, 15, 15, hx("cbbfa6")); k.garis_v(15, 0, 15, hx("cbbfa6"))
    return k


def lantai_dapur():
    k = _ubin()
    for y in range(0, 16, 8):
        for x in range(0, 16, 8):
            k.kotak(x, y, x + 7, y + 7, hx("eef2ee") if (x + y) % 16 == 0 else hx("cfe0e2"))
            k.garis_h(x, x + 7, y + 7, hx("b9c9cc")); k.garis_v(x + 7, y, y + 7, hx("b9c9cc"))
    return k


DINDING = {"krem": (hx("eadcbc"), hx("ddcca6")), "zaitun": (hx("b9c08a"), hx("a8b07a")), "oranye": (hx("e8b07c"), hx("dc9f6a")),
           "biru": (hx("b9cfe0"), hx("a7bfd3"))}


def dinding(tema, baris):
    """baris 0 = atas (lis), 1 = tengah (wallpaper bergaris), 2 = bawah (lambersering kayu)."""
    a, b = DINDING[tema]
    k = _ubin()
    if baris == 2:
        k.kotak(0, 0, 15, 15, hx("b98a5e"))
        k.garis_h(0, 15, 0, hx("8f6643")); k.garis_h(0, 15, 1, hx("d4a77a"))
        k.bingkai(2, 4, 13, 12, hx("9c7049")); k.garis_h(3, 12, 5, hx("c99a6b"))
        k.garis_h(0, 15, 14, hx("8f6643")); k.garis_h(0, 15, 15, hx("6e4e33"))
        return k
    for x in range(16):
        k.garis_v(x, 0, 15, a if (x // 4) % 2 == 0 else b)
    if baris == 0:
        k.kotak(0, 0, 15, 3, hx("cbbb97")); k.garis_h(0, 15, 3, GARIS); k.garis_h(0, 15, 4, (0, 0, 0, 30))
    for x in (2, 10):
        k.p(x, 9, b)
    return k


def bingkai_ruang(bagian):
    """Tepi tebal ruangan (tembok tampak dari atas): atas, bawah, kiri, kanan, dan empat sudut."""
    k = _ubin()
    isi, terang, garis = hx("c9bba1"), hx("ddd2bd"), GARIS
    def h(y0, y1):
        k.kotak(0, y0, 15, y1, isi); k.garis_h(0, 15, y0, garis); k.garis_h(0, 15, y1, garis); k.garis_h(0, 15, y0 + 1, terang)
    def v(x0, x1):
        k.kotak(x0, 0, x1, 15, isi); k.garis_v(x0, 0, 15, garis); k.garis_v(x1, 0, 15, garis); k.garis_v(x0 + 1, 0, 15, terang)
    if bagian == "atas":
        h(9, 15)
    elif bagian == "bawah":
        h(0, 6)
    elif bagian == "kiri":
        v(9, 15)
    elif bagian == "kanan":
        v(0, 6)
    else:
        xa, xb = (9, 15) if bagian.startswith("kiri") else (0, 6)
        ya, yb = (9, 15) if bagian.endswith("atas") else (0, 6)
        k.kotak(xa, ya, xb, yb, isi)
        k.bingkai(xa, ya, xb, yb, garis)
        k.garis_h(xa + 1, xb - 1, ya + 1, terang)
    return k


def keset():
    k = _ubin()
    k.kotak(0, 0, 15, 15, hx("b5574b"))
    k.bingkai(1, 1, 14, 14, hx("e9a23b"))
    for y in range(3, 13, 3):
        k.garis_h(3, 12, y, hx("8f4038"))
    return k


# ======================================================================================================
#  PERUMAHAN CODEIN
# ======================================================================================================
TANAH, TANAH_G, TANAH_T = hx("b98a5e"), hx("9c714b"), hx("cfa074")


def kavling_kosong():
    """Kavling kosong 88 x 60 (datar, di bawah karakter): lahan berumput yang ditandai patok kayu kecil di keempat sudutnya
    dan garis kapur putih putus-putus, dengan rumput sedikit lebih terang di dalamnya."""
    k = Kanvas(88, 60)
    for y in range(4, 56):                                  # rumput terpangkas: sedikit lebih terang, bertekstur halus
        for x in range(4, 84):
            if (x * 5 + y * 3) % 11 == 0:
                k.p(x, y, (255, 255, 230, 40))
    kapur = (250, 248, 236, 170)
    for x in range(4, 84):
        if x % 4 < 2:
            k.p(x, 3, kapur); k.p(x, 56, kapur)
    for y in range(3, 57):
        if y % 4 < 2:
            k.p(3, y, kapur); k.p(84, y, kapur)
    for (x, y) in ((2, 1), (83, 1), (2, 54), (83, 54)):     # patok kayu
        k.panel(x, y, x + 2, y + 4, MEJA, MEJA_T, MEJA_G)
    for (x, y, c) in ((20, 18, hx("fcaf5f")), (58, 40, hx("f7a8c4")), (40, 12, PUTIH), (70, 24, hx("fcaf5f"))):   # bunga liar
        k.p(x, y, c); k.p(x + 1, y + 1, HIJAU_TUA)
    return k


def papan_kavling():
    """Papan kavling 14 x 22: papan kayu bertiang dengan gambar rumah kecil (tanda kavling bisa ditempati)."""
    k = Kanvas(14, 22)
    k.kotak(6, 10, 7, 21, MEJA_GG)
    k.panel(0, 0, 13, 11, MEJA_T, hx("ecd2b0"), MEJA)
    for x in range(3, 11):                                  # atap
        k.p(x, 5 - min(x - 3, 10 - x), GENTENG)
    for x in range(4, 10):
        k.p(x, 5, GENTENG_G)
    k.kotak(5, 6, 8, 9, KREM_T); k.kotak(6, 7, 7, 9, KAYU)
    bayangan(k, 4, 9, 21)
    return k


def gerbang_perumahan():
    """Gapura Perumahan CodeIn 96 x 60: dua tiang bata berlampu dan balok atas berpapan (nama ditulis label kota)."""
    k = Kanvas(96, 60)
    for x0 in (0, 82):
        k.panel(x0, 14, x0 + 13, 59, KREM, KREM_T, KREM_G)
        for y in range(18, 58, 5):                           # nat bata
            k.garis_h(x0 + 1, x0 + 12, y, KREM_G)
            for x in range(x0 + 2 + (y // 5 % 2) * 3, x0 + 12, 6):
                k.p(x, y + 1, KREM_G); k.p(x, y + 2, KREM_G)
        k.panel(x0 - 1, 10, x0 + 14, 14, BATU_T, PUTIH, BATU_G)
        k.panel(x0 + 4, 3, x0 + 9, 10, KUNING, hx("ffe0a8"), ORANYE)   # lampu tiang
    k.panel(10, 14, 85, 22, GENTENG, GENTENG_T, GENTENG_G)
    k.panel(24, 4, 71, 16, hx("2a9d8f"), hx("49b8aa"), hx("1f7a70"))   # papan nama
    k.garis_h(28, 67, 9, hx("e9f4e4")); k.garis_h(32, 63, 12, hx("9fd8cf"))
    bayangan(k, 1, 13, 59); bayangan(k, 83, 95, 59)
    return k


def gantungan_kunci():
    """Gantungan kunci di dinding 14 x 12: papan kayu kecil, dua kait, satu kunci kuning."""
    k = Kanvas(14, 12)
    k.panel(0, 0, 13, 5, MEJA_T, hx("ecd2b0"), MEJA_G)
    for x in (4, 9):
        k.kotak(x, 5, x, 6, GARIS)
    k.kotak(8, 7, 10, 8, KUNING); k.p(9, 7, NOL)          # kepala kunci
    k.kotak(9, 9, 9, 11, KUNING); k.p(10, 10, KUNING)    # batang dan gerigi
    return k


def kasur():
    """Kasur 24 x 32 tampak atas: sandaran kayu, bantal, selimut biru bergaris."""
    k = Kanvas(24, 32)
    k.panel(0, 0, 23, 6, MEJA_G, MEJA, MEJA_GG)
    k.panel(1, 5, 22, 30, PUTIH, PUTIH, KREM_G)
    k.panel(4, 7, 19, 12, PUTIH, PUTIH, BATU_G)               # bantal
    k.panel(1, 14, 22, 30, hx("5b8cc7"), hx("7fa9de"), hx("4870a8"))
    for y in (18, 24):
        k.garis_h(2, 21, y, hx("4870a8"))
    k.kotak(1, 31, 2, 31, MEJA_GG); k.kotak(21, 31, 22, 31, MEJA_GG)
    return k


def semua():
    """Semua benda untuk atlas, nama -> Kanvas."""
    g = {"meja-kerja": meja(), "meja-panjang": meja(48, 20), "meja-resepsionis": meja_resepsionis(),
         "kursi": kursi("bawah"), "kursi-belakang": kursi("atas"), "kursi-kantor": kursi_kantor(),
         "sofa": sofa(), "sofa-kecil": sofa(22), "bangku-galeri": bangku_galeri(),
         "rak-buku": rak_buku(), "rak-buku-lebar": rak_buku(36, 30), "lemari": lemari(), "jam-besar": jam_besar(),
         "lampu-lantai": lampu_lantai(), "tanaman": tanaman_pot(), "tanaman-besar": tanaman_pot(True),
         "karpet": karpet(56, 30), "karpet-biru": karpet(40, 26, (hx("5466d1"), hx("3f4ea8"), hx("e9a23b"))),
         "karpet-panjang": karpet(30, 60, (hx("b5574b"), hx("8f4038"), hx("e9a23b"))),
         "kulkas": kulkas(), "dispenser": dispenser(), "lukisan": lukisan(), "lukisan-hijau": lukisan(20, 14, hx("2a9d8f")),
         "jendela-dinding": jendela_dinding(), "meja-bundar": meja_bundar(), "konter-kopi": mesin_kopi(),
         "meja-komputer": meja_komputer(), "papan-tulis": papan_tulis(),
         "halte": halte(),
         "lapak-sayur": lapak((hx("2a9d8f"), PUTIH), "sayur"), "lapak-buah": lapak((MERAH, PUTIH), "buah"),
         "lapak-ikan": lapak((hx("5466d1"), PUTIH), "ikan"), "lapak-kain": lapak((hx("e9a23b"), PUTIH), "kain"),
         "lapak-jamu": lapak((hx("86c264"), PUTIH), "jamu"), "lapak-kue": lapak((hx("f7a8c4"), PUTIH), "kue"),
         "lapak-mainan": lapak((hx("9f8fc4"), PUTIH), "mainan"), "lapak-kelapa": lapak((hx("c4704a"), KREM_T), "kelapa"), "lapak-tahu": lapak((hx("e9a23b"), KREM_T), "kue"), "lapak-rempah": lapak((hx("c4704a"), PUTIH), "jamu"),
         "lapak-bunga": lapak((hx("f7a8c4"), PUTIH), "sayur"), "gerobak": gerobak(), "pos-ronda": pos_ronda(), "kolam": kolam(), "beringin": beringin(),
         "palem": palem(), "meja-warkop": meja_warkop(), "net-badminton": net_badminton(), "lampu-merah": lampu_merah(),
         "kavling-kosong": kavling_kosong(), "papan-kavling": papan_kavling(), "gerbang-perumahan": gerbang_perumahan(), "kasur": kasur(),
         "gantungan-kunci": gantungan_kunci()}
    for arah in ("kiri", "kanan", "bawah", "atas"):
        g[f"mobil-angkot-{arah}"] = angkot(arah)
        g[f"mobil-motor-{arah}"] = motor(arah)
        g[f"mobil-ojol-{arah}"] = motor(arah, ojol=True)
    return g


# ======================================================================================================
#  UBIN ALAM untuk desa di Perumahan CodeIn: jalan setapak tanah, danau, sawah
#  Setapak dan danau berupa autotile 47 bentuk: nama-<topeng>-<sudut>, topeng = U1 + T2 + S4 + B8 (bit = tetangga sejenis),
#  sudut = lekuk dalam yang perlu dibulatkan: UT1 + ST2 + SB4 + UB8 (hanya bila kedua sisi di sudut itu bertetangga
#  tetapi petak diagonalnya bukan). Tepi yang terbuka diisi rumput Kenney (ubin 28) bergerigi, jadi menyatu dengan rumput peta.
# ======================================================================================================
RUMPUT_K = kenney(28)
TANAH_S, TANAH_SG, TANAH_ST, TANAH_SB = hx("c9a477"), hx("b48f63"), hx("d8b88c"), hx("9b7a52")
AIR_D, AIR_DT, AIR_DG = hx("6fc2c9"), hx("9adde0"), hx("4fa3b0")


def _gerigi(sisi, i):
    """Kedalaman tepi (piksel) di posisi i sepanjang sisi; pola tetap, jadi ubin bersebelahan selalu cocok."""
    return 3 + ((i * 7 + sisi * 5) % 5 == 0) - ((i * 3 + sisi) % 7 == 0)


def bentuk_alam():
    """Semua pasangan (topeng, sudut) yang mungkin: 47 bentuk."""
    hasil = []
    for t in range(16):
        boleh = [b for b, (a, c) in ((1, (1, 2)), (2, (4, 2)), (4, (4, 8)), (8, (1, 8))) if t & a and t & c]
        for m in range(16):
            if all(b in boleh for b in (1, 2, 4, 8) if m & b):
                hasil.append((t, m))
    return hasil


def _alam(topeng, isi, tepi_dalam, tepi_luar, sudut=0):
    """isi(x, y) -> warna bagian dalam. Tepi: tepi_luar di batas rumput, tepi_dalam satu piksel ke dalam."""
    k = _ubin()
    rumput = RUMPUT_K.load()
    U, Tm, S, B = topeng & 1, topeng & 2, topeng & 4, topeng & 8
    for y in range(16):
        for x in range(16):
            jarak = 99                                     # jarak ke sisi terbuka terdekat (dikurangi gerigi)
            if not U: jarak = min(jarak, y - _gerigi(0, x))
            if not S: jarak = min(jarak, 15 - y - _gerigi(2, x))
            if not B: jarak = min(jarak, x - _gerigi(3, y))
            if not Tm: jarak = min(jarak, 15 - x - _gerigi(1, y))
            # sudut membulat bila dua sisi bertemu terbuka
            for (cx, cy, a, b) in ((0, 0, U, B), (15, 0, U, Tm), (0, 15, S, B), (15, 15, S, Tm)):
                if not a and not b:
                    jarak = min(jarak, int(((x - cx) ** 2 + (y - cy) ** 2) ** .5) - 6)
            for (bit, cx, cy) in ((1, 15, 0), (2, 15, 15), (4, 0, 15), (8, 0, 0)):     # lekuk dalam
                if sudut & bit:
                    jarak = min(jarak, int(((x - cx) ** 2 + (y - cy) ** 2) ** .5) - 3)
            if jarak < 0:
                k.p(x, y, rumput[x, y])
            elif jarak == 0:
                k.p(x, y, tepi_luar)
            elif jarak == 1:
                k.p(x, y, tepi_dalam(x, y))
            else:
                k.p(x, y, isi(x, y))
    return k


def setapak(topeng, sudut=0):
    def isi(x, y):
        h = (x * 37 + y * 91 + topeng * 13) % 23
        return TANAH_SB if h == 0 else TANAH_ST if h in (3, 11) else TANAH_SG if h in (7, 16) else TANAH_S
    return _alam(topeng, isi, lambda x, y: TANAH_SG, hx("8c7a4f"), sudut)


def danau(topeng, sudut=0):
    def isi(x, y):
        return AIR_DT if (x + y * 3 + topeng) % 17 == 0 and y % 4 == 1 else AIR_D
    return _alam(topeng, isi, lambda x, y: hx("e8d9a8") if (x + y) % 3 else hx("d6c48e"), AIR_DG, sudut)


def sawah(varian):
    """Petak sawah: barisan padi hijau di atas air berlumpur."""
    k = _ubin()
    k.kotak(0, 0, 15, 15, hx("8fb98a"))
    for y in range(1, 16, 4):
        for x in range(16):
            k.p(x, y, hx("a7cfa0") if (x + varian) % 5 else hx("bfe3e6"))
    for y in range(0, 16, 4):
        for x in range(1 + varian, 16, 3):
            k.p(x, y + 2, hx("5f9a4c")); k.p(x, y + 3, hx("4f8540"))
            k.p(x + 1, y + 2, hx("7cb35f"))
    return k


def ubin_ruang():
    """Ubin ruang.png berurutan; nama -> nomor (dipakai tools/buat_peta.py lewat gedung.json)."""
    daftar = [("kayu-0", lantai_kayu(0)), ("kayu-1", lantai_kayu(1)), ("kayu-2", lantai_kayu(2)), ("kayu-3", lantai_kayu(3)),
              ("ubin-0", lantai_ubin(0)), ("ubin-1", lantai_ubin(1)), ("dapur", lantai_dapur()), ("keset", keset())]
    for tema in DINDING:
        for b in range(3):
            daftar.append((f"dinding-{tema}-{b}", dinding(tema, b)))
    for bagian in ("atas", "bawah", "kiri", "kanan", "kiri-atas", "kanan-atas", "kiri-bawah", "kanan-bawah"):
        daftar.append((f"tepi-{bagian}", bingkai_ruang(bagian)))
    # ubin alam ditambahkan di belakang, jadi nomor ubin lama tidak bergeser
    for (t, m) in bentuk_alam():
        daftar.append((f"setapak-{t}-{m}", setapak(t, m)))
    for (t, m) in bentuk_alam():
        daftar.append((f"danau-{t}-{m}", danau(t, m)))
    daftar += [("sawah-0", sawah(0)), ("sawah-1", sawah(1))]
    return daftar

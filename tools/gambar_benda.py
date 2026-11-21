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
def meja(w=48, h=28, laci=True):
    """Meja kayu tampak 3/4: daun meja terang di atas, sisi depan dengan laci, kaki. w x h."""
    k = Kanvas(w, h)
    k.panel(0, 0, w - 1, 11, MEJA_T, hx("ecd2b0"), MEJA)                  # daun meja
    for x in range(4, w - 4, 7):
        k.p(x, 4, MEJA); k.p(x + 2, 7, MEJA)
    k.panel(1, 11, w - 2, h - 5, MEJA, MEJA_T, MEJA_G)                    # sisi depan
    if laci:
        for x0 in range(4, w - 12, 14):
            k.panel(x0, 13, x0 + 10, h - 8, MEJA_G, MEJA, MEJA_GG)
            k.kotak(x0 + 4, h - 11, x0 + 6, h - 11, KUNING)
    for x in (2, w - 5):
        k.kotak(x, h - 5, x + 2, h - 1, MEJA_GG)
    bayangan(k, 2, w - 3, h - 1)
    return k


def meja_resepsionis():
    """Meja resepsionis Markas 56 x 30: daun meja, panel depan krem dengan logo </> CodeIn."""
    k = Kanvas(56, 30)
    k.panel(0, 0, 55, 9, MEJA_T, hx("ecd2b0"), MEJA)
    k.panel(1, 9, 54, 28, KREM, KREM_T, KREM_G)
    k.panel(16, 13, 39, 23, hx("2a9d8f"), hx("5cc0b2"), hx("1f6f66"))
    for (x, y) in ((22, 16), (21, 17), (20, 18), (21, 19), (22, 20), (33, 16), (34, 17), (35, 18), (34, 19), (33, 20),
                   (29, 15), (28, 16), (28, 17), (27, 18), (27, 19), (26, 20), (26, 21)):
        k.p(x, y, PUTIH)
    k.kotak(4, 2, 12, 6, hx("efe6d6")); k.bingkai(4, 2, 12, 6, GARIS)     # buku tamu
    k.kotak(44, 1, 50, 6, GELAP); k.bingkai(44, 1, 50, 6, GARIS)          # telepon
    k.p(46, 3, KUNING)
    bayangan(k, 2, 53, 29)
    return k


def kursi(arah="bawah"):
    """Kursi kayu 14 x 20. arah 'bawah' = menghadap pengunjung (sandaran di belakang), 'atas' = sandaran di depan."""
    k = Kanvas(14, 20)
    if arah == "bawah":
        k.panel(1, 0, 12, 8, MEJA, MEJA_T, MEJA_G)                         # sandaran
        k.garis_h(3, 10, 3, MEJA_G)
        k.panel(0, 8, 13, 13, MEJA_T, hx("ecd2b0"), MEJA)                  # dudukan
    else:
        k.panel(0, 4, 13, 9, MEJA_T, hx("ecd2b0"), MEJA)
        k.panel(1, 7, 12, 15, MEJA, MEJA_T, MEJA_G)
        k.garis_h(3, 10, 11, MEJA_G)
    for x in (1, 11):
        k.kotak(x, 14 if arah == "bawah" else 15, x + 1, 19, MEJA_GG)
    return k


def kursi_kantor():
    """Kursi kerja beroda 16 x 20 tampak belakang (dipakai di belakang meja redaksi)."""
    k = Kanvas(16, 20)
    k.panel(2, 0, 13, 11, GELAP_T, hx("736b86"), GELAP)
    k.panel(1, 10, 14, 14, GELAP, GELAP_T, hx("2f2b3a"))
    k.garis_v(7, 14, 17, GARIS); k.garis_v(8, 14, 17, GARIS)
    for x in (2, 7, 12):
        k.kotak(x, 18, x + 1, 19, GARIS)
    k.garis_h(3, 12, 17, GARIS)
    return k


def sofa(w=48):
    """Sofa oranye bata w x 26: sandaran, dua bantal duduk, lengan."""
    k = Kanvas(w, 26)
    k.panel(3, 0, w - 4, 12, KAIN, KAIN_T, KAIN_G)
    for x in range(w // 2 - 1, w // 2 + 1):
        k.garis_v(x, 2, 11, KAIN_G)
    k.panel(3, 11, w - 4, 21, KAIN_T, hx("f4c39f"), KAIN)
    k.garis_v(w // 2, 12, 20, KAIN)
    for x0 in (0, w - 7):
        k.panel(x0, 6, x0 + 6, 22, KAIN, KAIN_T, KAIN_G)
    k.kotak(3, 22, 5, 25, KAYU_G); k.kotak(w - 6, 22, w - 4, 25, KAYU_G)
    bayangan(k, 3, w - 4, 25)
    return k


def bangku_galeri():
    """Bangku empuk galeri 40 x 18: dudukan hijau toska berkancing, kaki kayu."""
    k = Kanvas(40, 18)
    k.panel(0, 2, 39, 11, hx("2a9d8f"), hx("5cc0b2"), hx("1f6f66"))
    for x in range(6, 36, 8):
        k.p(x, 6, hx("1f6f66"))
    k.panel(1, 10, 38, 13, MEJA, MEJA_T, MEJA_G)
    for x in (2, 35):
        k.kotak(x, 13, x + 2, 17, MEJA_GG)
    return k


def rak_buku(w=32, h=40):
    """Rak buku w x h: bingkai kayu, tiga papan, buku warna-warni."""
    k = Kanvas(w, h)
    k.panel(0, 0, w - 1, h - 1, MEJA_G, MEJA, MEJA_GG)
    warna = [hx("c75a52"), hx("2a9d8f"), hx("e9a23b"), hx("5466d1"), hx("86c264"), hx("efe6d6"), hx("9f8fc4")]
    papan = [3 + i * ((h - 6) // 3) for i in range(3)]
    for j, y0 in enumerate(papan):
        y1 = y0 + (h - 6) // 3 - 3
        k.kotak(2, y0, w - 3, y1, hx("5e3f2b"))
        x = 3
        n = j * 3
        while x < w - 4:
            lebar = 2 + (n * 7 + j) % 2
            tinggi = y1 - y0 - (n % 3)
            k.kotak(x, y1 - tinggi + 1, x + lebar - 1, y1, warna[n % len(warna)])
            k.garis_v(x + lebar - 1, y1 - tinggi + 1, y1, (0, 0, 0, 40))
            x += lebar + (1 if n % 4 == 3 else 0)
            n += 1
        k.garis_h(1, w - 2, y1 + 1, MEJA_T)
        k.garis_h(1, w - 2, y1 + 2, MEJA_G)
    return k


def lemari():
    """Lemari laci 30 x 30 dengan vas bunga di atasnya."""
    k = Kanvas(30, 30)
    k.panel(0, 8, 29, 29, MEJA, MEJA_T, MEJA_G)
    for y in (11, 17, 23):
        k.panel(3, y, 26, y + 4, MEJA_G, MEJA, MEJA_GG)
        k.kotak(13, y + 2, 16, y + 2, KUNING)
    k.panel(11, 1, 18, 8, hx("5466d1"), hx("7b8be0"), hx("3f4ea8"))
    for (x, y, c) in ((12, 0, MERAH), (14, 0, KUNING), (16, 0, MERAH), (13, 1, HIJAU), (15, 1, HIJAU)):
        k.p(x, y, c)
    return k


def jam_besar():
    """Jam lantai kayu 16 x 40 dengan bandul."""
    k = Kanvas(16, 40)
    k.panel(1, 0, 14, 39, MEJA_G, MEJA, MEJA_GG)
    for y in range(3, 13):
        for x in range(3, 13):
            d = ((x - 7.5) ** 2 + (y - 7.5) ** 2) ** .5
            if d <= 5:
                k.p(x, y, GARIS if d > 4.2 else hx("f4ecd8"))
    k.garis_v(8, 5, 8, GARIS); k.garis_h(8, 10, 8, GARIS)
    k.panel(4, 16, 11, 34, hx("5e3f2b"), MEJA_G, hx("4a3122"))
    k.garis_v(7, 17, 28, KUNING); k.kotak(6, 28, 8, 30, KUNING)
    return k


def lampu_lantai():
    """Lampu berdiri 12 x 36 dengan kap krem."""
    k = Kanvas(12, 36)
    for y in range(0, 10):
        setengah = 2 + y // 2
        k.garis_h(6 - setengah, 5 + setengah, y, hx("f4ecd8") if y < 8 else KREM_G)
        k.p(6 - setengah, y, GARIS); k.p(5 + setengah, y, GARIS)
    k.garis_h(1, 10, 0, GARIS); k.garis_h(0, 11, 10, GARIS)
    k.garis_v(5, 11, 33, GARIS); k.garis_v(6, 11, 33, MEJA_G)
    k.kotak(2, 33, 9, 35, MEJA_GG)
    return k


def tanaman_pot(besar=False):
    """Tanaman monstera dalam pot terakota, 16 x 24 (besar: 20 x 30)."""
    w, h = (20, 30) if besar else (16, 24)
    k = Kanvas(w, h)
    import math
    for i in range(7):
        sudut = -math.pi / 2 + (i - 3) * .45
        for t in range(3, h - 9):
            x = int(w / 2 + math.cos(sudut) * t * .5)
            y = int(h - 10 + math.sin(sudut) * t)
            for dx in (-1, 0, 1):
                k.p(x + dx, y, HIJAU if (t + i) % 4 else hx("a0d671"))
            k.p(x - 2, y, HIJAU_TUA); k.p(x + 2, y, HIJAU_TUA)
    k.panel(w // 2 - 5, h - 9, w // 2 + 4, h - 1, hx("c4704a"), hx("dd8a5f"), hx("9c5538"))
    k.garis_h(w // 2 - 6, w // 2 + 5, h - 9, GARIS)
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
    """Kulkas dua pintu 18 x 34."""
    k = Kanvas(18, 34)
    k.panel(0, 0, 17, 33, hx("e8eef0"), PUTIH, hx("b9c4c8"))
    k.garis_h(1, 16, 12, hx("b9c4c8"))
    k.kotak(13, 4, 14, 9, GARIS); k.kotak(13, 15, 14, 24, GARIS)
    k.kotak(3, 16, 8, 21, hx("fcaf5f")); k.kotak(4, 23, 7, 25, hx("86c264"))
    return k


def dispenser():
    """Dispenser air galon 12 x 28."""
    k = Kanvas(12, 28)
    k.panel(2, 0, 9, 10, hx("9fd1e8"), hx("c8e8f4"), hx("78b2cc"))
    k.panel(0, 10, 11, 27, hx("e8eef0"), PUTIH, hx("b9c4c8"))
    k.p(3, 15, MERAH); k.p(8, 15, BIRU)
    k.kotak(3, 19, 8, 20, GARIS)
    return k


def lukisan(w=24, h=18, warna=hx("e9a23b")):
    """Lukisan berbingkai kayu untuk dinding."""
    k = Kanvas(w, h)
    k.panel(0, 0, w - 1, h - 1, MEJA_G, MEJA, MEJA_GG)
    k.kotak(3, 3, w - 4, h - 4, hx("bfe1ea"))
    for x in range(3, w - 3):
        y = h - 6 - int(3 * abs(((x * 7) % 11) / 11 - .5))
        k.garis_v(x, y, h - 4, HIJAU if x % 5 else HIJAU_TUA)
    k.kotak(w - 9, 5, w - 7, 7, warna)
    return k


def jendela_dinding():
    """Jendela di dinding dalam ruangan 26 x 22, tirai di kiri-kanan."""
    k = Kanvas(26, 22)
    k.jendela(4, 2, 18, 15, kayu=True)
    for x0 in (0, 21):
        k.panel(x0, 0, x0 + 4, 19, hx("d98b5f"), hx("eaa77c"), hx("b56e47"))
    k.garis_h(0, 25, 0, MEJA_GG)
    return k


def meja_bundar():
    """Meja bundar kecil 22 x 22 dengan teko dan cangkir."""
    k = Kanvas(22, 22)
    for y in range(0, 10):
        for x in range(0, 22):
            if ((x - 10.5) / 10.5) ** 2 + ((y - 4.5) / 4.5) ** 2 <= 1:
                k.p(x, y, MEJA_T if y < 6 else MEJA)
    for x in range(22):
        for y in range(10):
            if ((x - 10.5) / 10.5) ** 2 + ((y - 4.5) / 4.5) ** 2 <= 1 and not ((x - 10.5) / 9.5) ** 2 + ((y - 4.5) / 3.5) ** 2 <= 1:
                k.p(x, y, MEJA_G)
    k.kotak(9, 10, 12, 19, MEJA_G); k.kotak(5, 19, 16, 21, MEJA_GG)
    k.panel(6, 0, 11, 4, PUTIH, PUTIH, KREM_G); k.p(12, 2, KREM_G)
    k.kotak(14, 2, 16, 4, PUTIH); k.bingkai(14, 2, 16, 4, KREM_G)
    return k


def mesin_kopi():
    """Konter dapur 32 x 30 dengan mesin kopi merah dan cangkir."""
    k = Kanvas(32, 30)
    k.panel(0, 10, 31, 29, MEJA, MEJA_T, MEJA_G)
    k.panel(0, 8, 31, 12, KREM_T, PUTIH, KREM_G)
    k.panel(3, 0, 15, 11, hx("e5534b"), hx("f07a72"), hx("b83f38"))
    k.kotak(5, 2, 13, 5, hx("2e2017")); k.p(6, 3, hx("7fe0a0"))
    k.kotak(7, 8, 10, 10, PUTIH)
    k.panel(20, 5, 24, 10, PUTIH, PUTIH, KREM_G); k.panel(25, 6, 29, 10, hx("fcaf5f"), KUNING, ORANYE)
    k.garis_v(16, 14, 27, MEJA_G)
    k.kotak(7, 19, 9, 19, KUNING); k.kotak(22, 19, 24, 19, KUNING)
    return k


def meja_komputer():
    """Meja terminal 32 x 32 dengan monitor menyala (layar CodeIn News)."""
    k = meja(32, 22, laci=False)
    g = Kanvas(32, 32)
    g.tempel(k.im, 0, 10)
    g.panel(8, 0, 23, 13, GELAP, GELAP_T, hx("2f2b3a"))
    g.kotak(10, 2, 21, 10, hx("1e2433"))
    g.kotak(11, 3, 18, 3, hx("e9a23b")); g.kotak(11, 5, 20, 5, hx("4fc3f7")); g.kotak(11, 7, 17, 7, hx("7fe0a0"))
    g.kotak(14, 13, 17, 15, GARIS)
    g.kotak(9, 16, 22, 17, hx("efe6d6")); g.bingkai(9, 16, 22, 17, GARIS)
    return g


def papan_tulis():
    """Papan tulis kecil di kaki tiga, 24 x 30 (rencana rapat)."""
    k = Kanvas(24, 30)
    k.panel(0, 0, 23, 17, hx("f4f6f0"), PUTIH, hx("c9cfc4"))
    for (y, w, c) in ((4, 14, hx("5466d1")), (8, 10, hx("c75a52")), (12, 16, hx("2a9d8f"))):
        k.garis_h(3, 3 + w, y, c)
    for (x0, x1) in ((4, 1), (19, 22)):
        for i in range(12):
            k.p(x0 + (x1 - x0) * i // 11, 18 + i, MEJA_GG)
    return k


# ======================================================================================================
#  PROPERTI KOTA
# ======================================================================================================
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


def motor(arah, ojol=False):
    """Motor dengan pengendara berhelm; ojol: jaket hijau dan kotak di belakang."""
    BADAN = hx("e26c62") if not ojol else hx("3e9e5a")
    JAKET, HELM = (hx("3e9e5a"), hx("2f7a45")) if ojol else (hx("5466d1"), hx("e9a23b"))
    k = Kanvas(16, 16)
    if arah in ("kiri", "kanan"):
        s = 1 if arah == "kanan" else -1
        cx = 8
        for dx in (-5, 5):
            for y in range(11, 16):
                for x in range(cx + dx - 2, cx + dx + 3):
                    if (x - cx - dx) ** 2 + (y - 13) ** 2 <= 5:
                        k.p(x, y, GARIS)
        k.panel(cx - 5, 9, cx + 5, 12, BADAN, BADAN, GARIS)
        k.kotak(cx - 2 * s - 1, 3, cx - 2 * s + 1, 9, JAKET)
        k.kotak(cx - 2 * s - 1, 0, cx - 2 * s + 1, 3, HELM); k.bingkai(cx - 2 * s - 2, 0, cx - 2 * s + 2, 3, GARIS)
        k.p(cx + 5 * s, 8, GARIS); k.p(cx + 6 * s, 9, KUNING)
        if ojol:
            k.panel(cx - 7 * s - (2 if s > 0 else -1), 4, cx - 7 * s + (1 if s > 0 else 4), 10, hx("3e9e5a"), hx("6cc488"), hx("2f7a45"))
        return k
    k.kotak(7, 0, 8, 15, GARIS)
    k.panel(5, 4, 10, 12, BADAN, BADAN, GARIS)
    k.panel(4, 5, 11, 10, JAKET, JAKET, GARIS)
    k.panel(5, 3 if arah == "bawah" else 7, 10, 7 if arah == "bawah" else 11, HELM, HELM, GARIS)
    k.p(7, 15 if arah == "bawah" else 0, KUNING); k.p(8, 15 if arah == "bawah" else 0, KUNING if arah == "bawah" else MERAH)
    if ojol:
        y0 = 0 if arah == "bawah" else 11
        k.panel(4, y0, 11, y0 + 4, hx("3e9e5a"), hx("6cc488"), hx("2f7a45"))
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


def semua():
    """Semua benda untuk atlas, nama -> Kanvas."""
    g = {"meja-kerja": meja(), "meja-panjang": meja(64, 28), "meja-resepsionis": meja_resepsionis(),
         "kursi": kursi("bawah"), "kursi-belakang": kursi("atas"), "kursi-kantor": kursi_kantor(),
         "sofa": sofa(), "sofa-kecil": sofa(28), "bangku-galeri": bangku_galeri(),
         "rak-buku": rak_buku(), "rak-buku-lebar": rak_buku(48, 40), "lemari": lemari(), "jam-besar": jam_besar(),
         "lampu-lantai": lampu_lantai(), "tanaman": tanaman_pot(), "tanaman-besar": tanaman_pot(True),
         "karpet": karpet(), "karpet-biru": karpet(48, 32, (hx("5466d1"), hx("3f4ea8"), hx("e9a23b"))),
         "karpet-panjang": karpet(32, 64, (hx("b5574b"), hx("8f4038"), hx("e9a23b"))),
         "kulkas": kulkas(), "dispenser": dispenser(), "lukisan": lukisan(), "lukisan-hijau": lukisan(28, 20, hx("2a9d8f")),
         "jendela-dinding": jendela_dinding(), "meja-bundar": meja_bundar(), "konter-kopi": mesin_kopi(),
         "meja-komputer": meja_komputer(), "papan-tulis": papan_tulis(),
         "halte": halte(), "gerobak": gerobak(), "pos-ronda": pos_ronda(), "kolam": kolam(), "beringin": beringin(),
         "palem": palem(), "meja-warkop": meja_warkop(), "net-badminton": net_badminton(), "lampu-merah": lampu_merah()}
    for arah in ("kiri", "kanan", "bawah", "atas"):
        g[f"mobil-angkot-{arah}"] = angkot(arah)
        g[f"mobil-motor-{arah}"] = motor(arah)
        g[f"mobil-ojol-{arah}"] = motor(arah, ojol=True)
    return g


def ubin_ruang():
    """Ubin ruang.png berurutan; nama -> nomor (dipakai tools/buat_peta.py lewat gedung.json)."""
    daftar = [("kayu-0", lantai_kayu(0)), ("kayu-1", lantai_kayu(1)), ("kayu-2", lantai_kayu(2)), ("kayu-3", lantai_kayu(3)),
              ("ubin-0", lantai_ubin(0)), ("ubin-1", lantai_ubin(1)), ("dapur", lantai_dapur()), ("keset", keset())]
    for tema in DINDING:
        for b in range(3):
            daftar.append((f"dinding-{tema}-{b}", dinding(tema, b)))
    for bagian in ("atas", "bawah", "kiri", "kanan", "kiri-atas", "kanan-atas", "kiri-bawah", "kanan-bawah"):
        daftar.append((f"tepi-{bagian}", bingkai_ruang(bagian)))
    return daftar

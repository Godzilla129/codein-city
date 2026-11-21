"""Penggambar gedung ikonik CodeIn City -> assets/sprites/gedung.png + gedung.json (atlas Phaser) dan assets/sprites/ikon-musik.png.

Gedung digambar piksel demi piksel dengan palet dan gaya RPG Urban Pack (Kenney) yang dipakai kota ini:
garis luar cokelat keabuan yang lembut, tanpa garis hitam, bayangan satu warna lebih gelap.
Bentuknya mengacu ke paket "CodeIn City Retro" (Markas berbendera, Galeri berkubah kaca, CodeIn News bermenara radio,
menara observatorium Aetheria, ruko Toko Mbak Tika, Warkop CodeIn), tapi ukurannya mengikuti tapak gedung di peta.
Atlas ini juga berisi pohon-pohon Kenney yang dipotong utuh, dipakai untuk hutan di tepi kota.

Jalankan dari folder proyek (tidak butuh berkas lain selain assets/tiles/urban.png):
    python3 tools/buat_gedung.py
lalu tools/buat_peta.py. Butuh Pillow.
"""
import json
from pathlib import Path

from PIL import Image

PROYEK = Path(__file__).resolve().parent.parent
URBAN = Image.open(PROYEK / "assets" / "tiles" / "urban.png").convert("RGBA")
T = 16


def kenney(i):
    return URBAN.crop((1 + (i % 27) * 18, 1 + (i // 27) * 18, 1 + (i % 27) * 18 + 16, 1 + (i // 27) * 18 + 16))


def hx(s):
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


# palet Kenney RPG Urban
GARIS, GARIS_C = hx("7e7265"), hx("866b5e")
KREM, KREM_G, KREM_T, KREM_S = hx("cbbb97"), hx("bca98c"), hx("dcd2a6"), hx("e8d4be")
BATU, BATU_G, BATU_T = hx("c3b7a9"), hx("b4aa9d"), hx("d7c9b9")
GENTENG, GENTENG_G, GENTENG_T = hx("c75a52"), hx("a94b44"), hx("e26c62")
ORANYE, ORANYE_G, ORANYE_T = hx("cc814d"), hx("ae6c41"), hx("e8975d")
KAYU, KAYU_G, KAYU_T = hx("ca7c56"), hx("804950"), hx("e28d59")
KACA, KACA_T, KACA_G = hx("d3e8da"), hx("e9f4e4"), hx("a9c6c0")
UNGU, UNGU_G, UNGU_T = hx("9f8fc4"), hx("7a6aa0"), hx("c4b8e6")
GELAP, GELAP_T = hx("4a4458"), hx("5d566c")
KUNING, HIJAU, MERAH, BIRU = hx("fcaf5f"), hx("86c264"), hx("e26c62"), hx("7fb6d9")
PUTIH = hx("f2f3e6")
NOL = (0, 0, 0, 0)


class Kanvas:
    def __init__(self, w, h):
        self.im = Image.new("RGBA", (w, h), NOL)
        self.px = self.im.load()
        self.w, self.h = w, h

    def p(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = c

    def kotak(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.p(x, y, c)

    def garis_h(self, x0, x1, y, c):
        self.kotak(x0, y, x1, y, c)

    def garis_v(self, x, y0, y1, c):
        self.kotak(x, y0, x, y1, c)

    def bingkai(self, x0, y0, x1, y1, c):
        self.garis_h(x0, x1, y0, c); self.garis_h(x0, x1, y1, c); self.garis_v(x0, y0, y1, c); self.garis_v(x1, y0, y1, c)

    def panel(self, x0, y0, x1, y1, isi, terang, gelap, garis=GARIS):
        """Kotak bergaya Kenney: garis luar lembut, tepi atas-kiri terang, tepi bawah gelap."""
        self.kotak(x0, y0, x1, y1, isi)
        self.garis_h(x0 + 1, x1 - 1, y0 + 1, terang)
        self.garis_h(x0 + 1, x1 - 1, y1 - 1, gelap)
        self.bingkai(x0, y0, x1, y1, garis)

    def tempel(self, im, x, y):
        self.im.alpha_composite(im, (x, y))
        self.px = self.im.load()

    def ubin(self, i, x, y):
        self.tempel(kenney(i), x, y)

    def tekstur(self, x0, y0, x1, y1, i, ox=0, oy=0):
        t = kenney(i).load()
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                c = t[(x - ox) % 16, (y - oy) % 16]
                if c[3]:
                    self.p(x, y, c)

    def dinding(self, x0, y0, x1, y1, isi=KREM, gelap=KREM_G, terang=KREM_T):
        """Dinding: bata halus (garis tipis tiap 4 piksel), lis atas terang, alas gelap."""
        self.kotak(x0, y0, x1, y1, isi)
        for y in range(y0 + 4, y1 - 2, 4):
            self.garis_h(x0 + 1, x1 - 1, y, gelap)
            for x in range(x0 + 1 + ((y // 4) % 2) * 4, x1, 8):
                self.p(x, y + 1, gelap); self.p(x, y + 2, gelap); self.p(x, y + 3, gelap)
        self.garis_h(x0, x1, y0, terang); self.garis_h(x0, x1, y0 + 1, KREM_S if isi == KREM else BATU_T)
        self.kotak(x0, y1 - 2, x1, y1, gelap)
        self.garis_h(x0, x1, y1, GARIS)
        self.garis_v(x0, y0, y1, GARIS); self.garis_v(x1, y0, y1, GARIS)

    def atap(self, x0, y0, x1, y1, isi, gelap, terang, miring=0):
        """Atap genteng tampak depan: baris genteng tiap 4 piksel, sisi kiri-kanan miring 'miring' piksel per baris genteng."""
        tinggi = y1 - y0
        for y in range(y0, y1 + 1):
            geser = (y1 - y) * miring // 4 if miring else 0
            a, b = x0 + geser, x1 - geser
            for x in range(a, b + 1):
                baris = (y - y0) % 4
                c = gelap if baris == 3 else terang if baris == 0 and (x // 4 + (y - y0) // 4) % 2 == 0 else isi
                self.p(x, y, c)
            self.p(a, y, GARIS); self.p(b, y, GARIS)
        top = x0 + (tinggi * miring // 4 if miring else 0)
        self.garis_h(top, x1 - (tinggi * miring // 4 if miring else 0), y0, GARIS)
        self.garis_h(x0, x1, y1, GARIS)
        self.garis_h(x0 + 1, x1 - 1, y1 - 1, gelap)

    def pelana(self, cx, y0, lebar, tinggi, isi, gelap, terang):
        """Atap pelana segitiga (puncak di cx, y0)."""
        for r in range(tinggi):
            setengah = round((r + 1) * (lebar / 2) / tinggi)
            y = y0 + r
            for x in range(cx - setengah, cx + setengah):
                baris = r % 4
                c = gelap if baris == 3 else terang if baris == 0 and (x // 4 + r // 4) % 2 == 0 else isi
                self.p(x, y, c)
            self.p(cx - setengah, y, GARIS); self.p(cx + setengah - 1, y, GARIS)
            if r < 2:
                self.p(cx - setengah + 1, y, GARIS); self.p(cx + setengah - 2, y, GARIS)
        self.garis_h(cx - lebar // 2, cx + lebar // 2 - 1, y0 + tinggi - 1, GARIS)

    def jendela(self, x0, y0, w, h, kayu=False):
        """Jendela kaca dengan kusen dan pantulan diagonal."""
        bingkai = KAYU_G if kayu else GARIS
        self.kotak(x0, y0, x0 + w - 1, y0 + h - 1, KACA)
        for i in range(min(w, h)):
            if i % 5 in (1, 2):
                self.p(x0 + 2 + i, y0 + 1 + i, KACA_T)
        self.kotak(x0 + 1, y0 + h - 3, x0 + w - 2, y0 + h - 2, KACA_G)
        self.bingkai(x0, y0, x0 + w - 1, y0 + h - 1, bingkai)
        self.garis_v(x0 + w // 2, y0, y0 + h - 1, bingkai)
        self.garis_h(x0, x0 + w - 1, y0 + h // 2, bingkai)
        self.garis_h(x0 - 1, x0 + w, y0 + h, KREM_T)
        self.garis_h(x0 - 1, x0 + w, y0 + h + 1, GARIS)

    def pintu(self, x0, y0, w, h, warna=KAYU, gelap=KAYU_G, terang=KAYU_T, ganda=True):
        self.panel(x0, y0, x0 + w - 1, y0 + h - 1, warna, terang, gelap, GARIS)
        if ganda:
            self.garis_v(x0 + w // 2, y0 + 1, y0 + h - 2, gelap)
            self.p(x0 + w // 2 - 2, y0 + h // 2, KUNING); self.p(x0 + w // 2 + 1, y0 + h // 2, KUNING)
        else:
            self.p(x0 + w - 3, y0 + h // 2, KUNING)
        for x0p in ([x0 + 2, x0 + w // 2 + 2] if ganda else [x0 + 2]):
            self.bingkai(x0p, y0 + 3, x0p + (w // 2 if ganda else w) - 5, y0 + h // 2 - 2, gelap)

    def tiang(self, x, y0, y1, isi=KREM_S, gelap=KREM_G):
        self.kotak(x, y0, x + 3, y1, isi)
        self.garis_v(x + 3, y0, y1, gelap)
        self.garis_v(x - 1, y0, y1, GARIS); self.garis_v(x + 4, y0, y1, GARIS)
        self.kotak(x - 2, y0 - 2, x + 5, y0 - 1, KREM_T); self.bingkai(x - 2, y0 - 2, x + 5, y0 - 1, GARIS)

    def kubah(self, cx, alas, rx, ry, isi, gelap, terang, rusuk=4):
        """Kubah setengah elips dengan rusuk dan kilau."""
        for y in range(alas - ry, alas + 1):
            dy = (alas - y) / ry
            setengah = int(rx * (1 - dy * dy) ** .5 + .5)
            for x in range(cx - setengah, cx + setengah + 1):
                dx = (x - cx) / max(1, rx)
                c = terang if dx < -.15 and dy > .25 and dx > -.65 else gelap if dx > .55 else isi
                self.p(x, y, c)
            self.p(cx - setengah, y, GARIS); self.p(cx + setengah, y, GARIS)
        for y in range(alas - ry, alas + 1):
            dy = (alas - y) / ry
            setengah = int(rx * (1 - dy * dy) ** .5 + .5)
            if y == alas - ry or (alas - ry + 1 >= y):
                self.garis_h(cx - setengah, cx + setengah, y, GARIS)
        for k in range(1, rusuk):
            f = -1 + 2 * k / rusuk
            for y in range(alas - ry + 2, alas):
                dy = (alas - y) / ry
                setengah = rx * (1 - dy * dy) ** .5
                self.p(int(cx + f * setengah), y, gelap)
        self.garis_h(cx - rx - 2, cx + rx + 2, alas, GARIS)
        self.garis_h(cx - rx - 2, cx + rx + 2, alas + 1, KREM_T)
        self.garis_h(cx - rx - 2, cx + rx + 2, alas + 2, GARIS)


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


# huruf piksel 3 x 5 untuk papan nama
HURUF = {"W": ["101", "101", "101", "111", "101"], "A": ["010", "101", "111", "101", "101"], "R": ["110", "101", "110", "101", "101"],
         "K": ["101", "110", "100", "110", "101"], "O": ["010", "101", "101", "101", "010"], "P": ["110", "101", "110", "100", "100"]}


def _tulis(self, teks, cx, y, warna):
    x = cx - (len(teks) * 4 - 1) // 2
    for h in teks:
        for r, baris in enumerate(HURUF[h]):
            for c, bit in enumerate(baris):
                if bit == "1":
                    self.p(x + c, y + r, warna)
        x += 4


Kanvas.tulis = _tulis


def markas():
    """Markas CodeIn: balai dengan menara tengah berpelana, bendera, papan </>, dua sayap beratap genteng merah. 9 x 6 ubin + 28 piksel atas."""
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
    # papan nama </>
    k.panel(56, b + 16, 88, b + 32, GELAP, GELAP_T, hx("2f2b3a"))
    for (x, y) in ((63, 22), (62, 23), (61, 24), (62, 25), (63, 26), (80, 22), (81, 23), (82, 24), (81, 25), (80, 26),
                   (73, 21), (73, 22), (72, 23), (72, 24), (71, 25), (71, 26), (70, 27)):
        k.p(x, b + y, KUNING)
    # tiang dan pintu ganda dengan anak tangga
    k.tiang(52, b + 42, b + 92)
    k.tiang(88, b + 42, b + 92)
    k.kotak(48, b + 39, 95, b + 41, KREM_T); k.bingkai(48, b + 38, 95, b + 41, GARIS)
    k.jendela(64, b + 46, 16, 10)
    k.pintu(62, b + 62, 20, 30)
    k.panel(58, b + 92, 85, b + 95, BATU, BATU_T, BATU_G)
    return k, A


def bendera(frame):
    """Bendera CodeIn berkibar, 18 x 10, dua bingkai."""
    k = Kanvas(18, 10)
    for x in range(17):
        ombak = (1 if (x // 4 + frame) % 2 else 0)
        for y in range(1 + ombak, 8 + ombak):
            k.p(x, y, hx("e9a23b") if y - ombak < 5 else hx("2a9d8f"))
        k.p(x, 1 + ombak, GARIS); k.p(x, 8 + ombak, GARIS)
    k.garis_v(17 - (frame % 2), 2, 8, GARIS)
    for (x, y) in ((5, 4), (6, 3), (6, 5), (10, 3), (11, 4), (10, 5)):
        k.p(x, y + (1 if (x // 4 + frame) % 2 else 0), PUTIH)
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
    """Menara observatorium (rumah proyek 2): menara bulat, kubah ungu, teleskop, jendela bundar. 7 x 6 ubin + 34 piksel atas."""
    A = 34
    k = Kanvas(112, 96 + A)
    b = A
    k.dinding(10, b + 10, 101, b + 95)
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




def ikon_musik():
    """Not balok 16 x 16 untuk tombol musik di bilah atas."""
    k = Kanvas(16, 16)
    k.kotak(5, 2, 6, 11, GARIS); k.kotak(11, 1, 12, 10, GARIS)
    k.kotak(5, 1, 12, 3, GARIS); k.kotak(6, 2, 11, 2, KUNING)
    for (cx, cy) in ((4, 12), (10, 11)):
        k.kotak(cx - 2, cy - 1, cx + 2, cy + 1, GARIS); k.kotak(cx - 1, cy - 1, cx + 1, cy, KUNING)
    return k


def pohon():
    """Pohon Kenney dipotong utuh (puncak dan batang jadi satu gambar) untuk hutan dan pohon pengisi."""
    def susun(kolom, baris):
        g = Image.new("RGBA", (16 * len(kolom), 16 * baris), NOL)
        for c, i in enumerate(kolom):
            for r in range(baris):
                g.alpha_composite(kenney(i + 27 * r), (c * 16, r * 16))
        return g.crop(g.getchannel("A").getbbox())
    return {"pohon-a": susun([232], 2), "pohon-b": susun([233], 2), "pohon-kecil": susun([238], 2),
            "pohon-gugur-a": susun([313], 2), "pohon-gugur-b": susun([314], 2), "pohon-gugur-kecil": susun([319], 2),
            "rumpun": susun([234, 235, 236], 3), "rumpun-gugur": susun([315, 316, 317], 3)}


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
                    ("gedung-aetheria", aetheria), ("gedung-toko", toko), ("warkop", warkop)):
        hasil = f()
        gambar[nama] = hasil[0].im
        info[nama] = {"atas": hasil[1]}
        if len(hasil) > 2:
            info[nama]["ticker"] = hasil[2]
    for i in range(2):
        gambar[f"bendera-{i}"] = bendera(i).im
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
    keluar = PROYEK / "assets" / "sprites"
    keluar.mkdir(parents=True, exist_ok=True)
    lembar, letak = kemas(gambar)
    lembar.save(keluar / "gedung.png", optimize=True)
    frames = {n: {"frame": {"x": x, "y": y, "w": w, "h": h}, "rotated": False, "trimmed": False,
                  "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h}, "sourceSize": {"w": w, "h": h}} for n, (x, y, w, h) in sorted(letak.items())}
    (keluar / "gedung.json").write_text(json.dumps({"frames": frames, "meta": {"image": "gedung.png", "format": "RGBA8888",
                                         "size": {"w": lembar.width, "h": lembar.height}, "scale": "1", "codein": info}}, separators=(",", ":")))
    ikon_musik().im.save(keluar / "ikon-musik.png", optimize=True)
    print(f"gedung.png: {lembar.width}x{lembar.height}, {len(letak)} gambar")


main()

"""Alat gambar piksel bergaya RPG Urban Pack (Kenney) untuk tools/buat_gambar.py: palet, kanvas, dan bentuk dasar."""
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


# huruf piksel 3 x 5 untuk papan nama
HURUF = {"W": ["101", "101", "101", "111", "101"], "A": ["010", "101", "111", "101", "101"], "R": ["110", "101", "110", "101", "101"],
         "K": ["101", "110", "100", "110", "101"], "B": ["110", "101", "110", "101", "110"], "S": ["011", "100", "010", "001", "110"], "O": ["010", "101", "101", "101", "010"], "P": ["110", "101", "110", "100", "100"]}


def _tulis(self, teks, cx, y, warna):
    x = cx - (len(teks) * 4 - 1) // 2
    for h in teks:
        for r, baris in enumerate(HURUF[h]):
            for c, bit in enumerate(baris):
                if bit == "1":
                    self.p(x + c, y + r, warna)
        x += 4


Kanvas.tulis = _tulis



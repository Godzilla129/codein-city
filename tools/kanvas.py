"""Alat gambar piksel CodeIn City untuk tools/buat_gambar.py: palet, kanvas, dan bentuk dasar.

Gaya kota 2.0: kota abad pertengahan yang hangat dan cerah (rumah berangka kayu, dinding batu, atap genteng, lentera),
dipadu aksen teknologi (lampu server toska). Garis luar cokelat tua, bayangan satu warna lebih gelap.
Tileset Kenney (assets/tiles/urban-kenney.png) diwarnai ulang di sini supaya serasi, lalu disimpan sebagai urban.png.
"""
import colorsys
from pathlib import Path

from PIL import Image

PROYEK = Path(__file__).resolve().parent.parent
T = 16


def warnai_kenney(im):
    """Warna tileset Kenney dibuat lebih segar: lebih jenuh, air lebih biru."""
    im = im.convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if .14 < h < .40 and s > .15:                  # rumput dan daun: lebih hijau segar
                h += (.27 - h) * .3
                s = min(1, s * 1.2)
            elif .45 < h < .56 and s > .12:                # toska -> biru air
                h += (.54 - h) * .4
                s = min(1, s * 1.25)
            else:
                s = min(1, s * 1.15)
                v = min(1, v * 1.02)
            r2, g2, b2 = colorsys.hsv_to_rgb(h % 1, s, v)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im


URBAN_ASLI = Image.open(PROYEK / "assets" / "tiles" / "urban-kenney.png").convert("RGBA")     # untuk karakter (warna kulit tetap)
URBAN = warnai_kenney(URBAN_ASLI)


def kenney(i):
    return URBAN.crop((1 + (i % 27) * 18, 1 + (i // 27) * 18, 1 + (i % 27) * 18 + 16, 1 + (i // 27) * 18 + 16))


def hx(s):
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


# palet kota 2.0: hangat dan jenuh seperti game bertani yang nyaman
GARIS, GARIS_C = hx("4f3a2e"), hx("6b4a3a")
KREM, KREM_G, KREM_T, KREM_S = hx("f1e3c6"), hx("d6c19a"), hx("fbf1da"), hx("fff8e8")
BATU, BATU_G, BATU_T = hx("bdb3a3"), hx("948a7b"), hx("d9d0c0")
GENTENG, GENTENG_G, GENTENG_T = hx("c0473a"), hx("8f2f27"), hx("de6a56")
ORANYE, ORANYE_G, ORANYE_T = hx("d9813f"), hx("a85c2b"), hx("f0a35c")
KAYU, KAYU_G, KAYU_T = hx("a8693f"), hx("6b4128"), hx("c98a58")
BALOK, BALOK_G = hx("6b4128"), hx("4f2f1d")              # balok rangka kayu rumah
TEAL, TEAL_G, TEAL_T = hx("2f8f8a"), hx("1f6b67"), hx("4fb3ac")
KACA, KACA_T, KACA_G = hx("a9dbe6"), hx("e2f5f8"), hx("6fa8bd")
UNGU, UNGU_G, UNGU_T = hx("8f72c4"), hx("6a51a0"), hx("b39be0")
GELAP, GELAP_T = hx("3b3346"), hx("514760")
KUNING, HIJAU, MERAH, BIRU = hx("f2c94c"), hx("6cc24a"), hx("e04a3a"), hx("4aa3d8")
SERVER = hx("38d6e8")                                     # lampu server toska, aksen teknologi
PUTIH = hx("fbf7ea")
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

    def dinding(self, x0, y0, x1, y1, isi=KREM, gelap=KREM_G, terang=KREM_T, gaya=None):
        """Dinding. gaya "kayu" (bawaan untuk dinding krem): plester berangka balok kayu di atas alas batu;
        "batu" (bawaan untuk dinding batu): susunan batu potong; "polos": bata halus seperti dulu."""
        gaya = gaya or ("kayu" if isi == KREM else "batu" if isi == BATU else "polos")
        if gaya == "kayu":
            self.kotak(x0, y0, x1, y1, isi)
            for y in range(y0 + 2, y1 - 6):                 # plester bertekstur halus
                for x in range(x0 + 1, x1):
                    if (x * 7 + y * 13) % 29 == 0:
                        self.p(x, y, gelap)
            tinggi = y1 - y0
            tengah = y0 + tinggi // 2 if tinggi > 26 else None
            alas = y1 - 6
            self.kotak(x0, y0, x1, y0 + 1, BALOK); self.garis_h(x0, x1, y0 + 2, BALOK_G)
            if tengah:
                self.kotak(x0, tengah, x1, tengah + 1, BALOK)
            lebar = x1 - x0
            n = max(2, round(lebar / 22))
            tiang = [x0 + round(i * lebar / n) for i in range(n + 1)]
            for i, x in enumerate(tiang):
                xx = min(max(x, x0), x1 - 1)
                self.kotak(xx, y0, xx + 1, alas, BALOK)
                if i < n and (i % 2 == 0) and tengah:           # palang silang di panel atas
                    a, b = xx + 2, tiang[i + 1] - 1
                    for t in range(b - a + 1):
                        yy = y0 + 3 + (t * (tengah - y0 - 3)) // max(1, b - a)
                        self.p(a + t, yy, BALOK); self.p(b - t, yy, BALOK)
            for y in range(alas, y1 + 1):                    # alas batu
                for x in range(x0, x1 + 1):
                    baris = (y - alas) // 3
                    nat = (y - alas) % 3 == 0 or (x + baris * 4) % 8 == 0
                    self.p(x, y, BATU_G if nat else BATU if (x // 8 + baris) % 3 else BATU_T)
            self.garis_h(x0, x1, alas, BALOK_G)
        elif gaya == "batu":
            for y in range(y0, y1 + 1):
                baris = (y - y0) // 5
                for x in range(x0, x1 + 1):
                    nat = (y - y0) % 5 == 4 or (x + baris * 5 + (baris % 3) * 2) % 10 == 0
                    blok = (x + baris * 5 + (baris % 3) * 2) // 10 + baris * 3
                    self.p(x, y, gelap if nat else terang if blok % 5 == 0 else isi)
            self.garis_h(x0, x1, y0, terang)
        else:
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


def garis_luar(k, warna=GARIS):
    """Garis tepi 1 piksel di luar siluet gambar."""
    px = k.im.load()
    isi = {(x, y) for y in range(k.h) for x in range(k.w) if px[x, y][3]}
    for (x, y) in list(isi):
        for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if 0 <= n[0] < k.w and 0 <= n[1] < k.h and n not in isi:
                px[n] = warna
    return k


# logo CodeIn (assets/logo/codein-logo.png dari Jull) dalam bentuk piksel: C biru tua kehitaman dan panah < biru.
LOGO_PALET = {"gelap": hx("141b26"), "biru_t": hx("4fb0ff"), "biru": hx("1f8ef5"), "biru_g": hx("0f5fd0")}


def logo_piksel(tinggi, terang=False):
    """Logo CodeIn setinggi `tinggi` piksel, warnanya dikunci ke palet supaya tajam. terang=True: huruf C putih
    (untuk latar gelap seperti layar LED)."""
    asli = Image.open(PROYEK / "assets" / "logo" / "codein-logo.png").convert("RGBA")
    lebar = max(1, round(asli.width * tinggi / asli.height))
    kecil = asli.resize((lebar, tinggi), Image.LANCZOS)
    px = kecil.load()
    out = Image.new("RGBA", (lebar, tinggi), NOL)
    op = out.load()
    pilihan = [LOGO_PALET["gelap"], LOGO_PALET["biru_t"], LOGO_PALET["biru"], LOGO_PALET["biru_g"]]
    for y in range(tinggi):
        for x in range(lebar):
            r, g, b, a = px[x, y]
            if a < 110:
                continue
            c = min(pilihan, key=lambda q: (q[0] - r) ** 2 + (q[1] - g) ** 2 + (q[2] - b) ** 2)
            if terang and c == LOGO_PALET["gelap"]:
                c = PUTIH
            op[x, y] = c
    return out


# huruf piksel 3 x 5 untuk papan nama
HURUF = {"W": ["101", "101", "101", "111", "101"], "A": ["010", "101", "111", "101", "101"], "R": ["110", "101", "110", "101", "101"],
         "K": ["101", "110", "100", "110", "101"], "B": ["110", "101", "110", "101", "110"], "S": ["011", "100", "010", "001", "110"], "O": ["010", "101", "101", "101", "010"], "P": ["110", "101", "110", "100", "100"],
         "G": ["011", "100", "101", "101", "011"], "L": ["100", "100", "100", "100", "111"], "E": ["111", "100", "110", "100", "111"],
         "I": ["111", "010", "010", "010", "111"], "T": ["111", "010", "010", "010", "010"], "N": ["101", "111", "111", "101", "101"],
         "M": ["101", "111", "101", "101", "101"], "U": ["101", "101", "101", "101", "111"], "D": ["110", "101", "101", "101", "110"],
         "C": ["011", "100", "100", "100", "011"], "H": ["101", "101", "111", "101", "101"], " ": ["000", "000", "000", "000", "000"]}


def _tulis(self, teks, cx, y, warna):
    x = cx - (len(teks) * 4 - 1) // 2
    for h in teks:
        for r, baris in enumerate(HURUF[h]):
            for c, bit in enumerate(baris):
                if bit == "1":
                    self.p(x + c, y + r, warna)
        x += 4


Kanvas.tulis = _tulis



"""Pembuat peta CodeIn City -> assets/maps/kota.tmj, markas.tmj, galeri.tmj, redaksi.tmj, perumahan.tmj, rumah.tmj (Tiled JSON).

PERHATIAN: skrip ini menulis ulang semua peta dari nol. Setelah peta diubah lewat aplikasi Tiled,
JANGAN jalankan skrip ini lagi (perubahan di Tiled akan hilang). Skrip disimpan sebagai dokumentasi
cara peta disusun, dan untuk membuat peta baru dari awal.

Jalankan dari folder proyek:  python3 tools/buat_gedung.py  lalu  python3 tools/buat_peta.py
Nomor tile = urutan di assets/tiles/urban.png (27 kolom), dihitung dari 0.
Gedung ikonik (CodeIn News, Galeri, Markas, Warkop, menara Aetheria, Toko Mbak Tika) dan pohon hutan bukan ubin, tetapi gambar
dari atlas assets/sprites/gedung.png (dibuat tools/buat_gedung.py) yang ditaruh di layer objek "benda".
"""
import json
import math
import random
from pathlib import Path

T, COLS = 16, 27
_ATLAS = json.loads((Path(__file__).resolve().parent.parent / "assets" / "sprites" / "gedung.json").read_text())
UKURAN = {n: (f["frame"]["w"], f["frame"]["h"]) for n, f in _ATLAS["frames"].items()}
INFO = _ATLAS["meta"]["codein"]
RUANG = json.loads((Path(__file__).resolve().parent.parent / "assets" / "sprites" / "ruang.json").read_text())
R0 = 486                    # nomor ubin pertama ruang.png (setelah 486 ubin urban.png)


def ruang(nama):
    return R0 + RUANG[nama]
LAYERS = ["tanah", "jalan", "bangunan", "hiasan", "atas", "tabrakan", "rintangan"]
# tabrakan = petak yang tidak bisa dilewati pengunjung (hutan, dinding ruangan, kolam air mancur).
# Benda kecil dan gedung tidak memakai petak penuh: tabrakannya kotak kecil di kakinya (layer objek "padat"),
# jadi pengunjung bisa lewat di belakang lampu, pohon, perabot, dan atap rumah.
# rintangan = petak yang dihindari warga saat mencari jalan (tabrakan + petak di bawah kotak padat).
DINDING = {"gedung-news": 73, "gedung-galeri": 73, "gedung-markas": 51, "gedung-aetheria": 80, "gedung-toko": 71, "warkop": 65}
BLOCK = 222           # tile penanda di layer "tabrakan" (pagar merah-putih, hanya terlihat di Tiled)
RUMPUT = 28
BATU, KREM, ABU_KREM, AIR = 8, 81, 89, 170      # dasar tile berbingkai 9 potong: trotoar, alun-alun/dinding krem, dinding abu, air
ROOF = {"oranye": (125, 152, 179, 206), "merah": (17, 44, 71, 98)}   # baris: atas, bubungan, tengah, bawah
ARCH, ARCH_L = (336, 363), (417, 444)           # jendela lengkung krem / lavender (atas, bawah)
POHON = {"A": (232, 259), "B": (233, 260), "O": (313, 340), "P": (232, 286), "Q": (233, 287)}   # P/Q = pohon dalam pot


def cells(x0, y0, x1, y1):
    return {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}


class Peta:
    def __init__(self, w, h, seed=7):
        self.W, self.H = w, h
        self.L = {n: [0] * (w * h) for n in LAYERS}
        self.rnd = random.Random(seed)
        self.keras, self.lantai = set(), set()        # petak yang tidak bisa dilewati / petak berubin (tidak ditanami pohon)
        self.doors, self.points, self.boards, self.routes, self.lamps = [], [], [], [], []
        self.oid = 0
        self.benda = []
        self.tapak = []           # (x0, y0, w) gedung gambar: papan namanya ditaruh di garis atapnya
        self.kotak = []           # kotak tabrakan kecil (piksel), lihat halangi()
        self.urut_aspal = False   # peta baru: petak aspal diurutkan supaya hasil acaknya tetap (kota memakai urutan lama)

    # ----- ubin -----
    def put(self, layer, x, y, idx):
        if 0 <= x < self.W and 0 <= y < self.H:
            self.L[layer][y * self.W + x] = idx + 1

    def block(self, x, y):
        self.put("tabrakan", x, y, BLOCK)
        self.put("rintangan", x, y, BLOCK)
        self.keras.add((x, y))

    def halangi(self, x, y, w, h):
        """Kotak tabrakan kecil (piksel) di kaki benda. Petak di bawahnya ditandai rintangan untuk jalur warga."""
        x, y, w, h = int(x), int(y), int(w), int(h)
        self.kotak.append((x, y, w, h))
        for cx in range((x + 1) // T, (x + w - 2) // T + 1):
            for cy in range((y + 1) // T, (y + h - 2) // T + 1):
                self.put("rintangan", cx, cy, BLOCK)
                self.keras.add((cx, cy))

    def autotile(self, layer, area, base):
        """Pasang tile berbingkai (9 potong) mengikuti bentuk area. base = nomor tile pojok kiri atas."""
        for (x, y) in area:
            n, s, w, e = (x, y - 1) in area, (x, y + 1) in area, (x - 1, y) in area, (x + 1, y) in area
            if not n and not s:
                off = 60 if not w and not e else 57 if not w else 59 if not e else 58
            elif not w and not e:
                off = 7 if not n else 61 if not s else 34
            else:
                off = (0 if not n else 54 if not s else 27) + (0 if not w else 2 if not e else 1)
            self.put(layer, x, y, base + off)

    def ubin(self, area, base):
        """Lantai berubin di layer tanah (trotoar, alun-alun, pelataran)."""
        self.autotile("tanah", area, base)
        self.lantai |= area

    # ----- benda -----
    def tree(self, x, y, kind="A"):
        top, bottom = POHON[kind]
        self.put("hiasan", x, y, bottom)
        self.put("atas", x, y - 1, top)
        self.halangi(x * T + 5, y * T + 9, 6, 6)          # batang saja

    def sprite(self, nama, kiri, bawah, **props):
        """Gambar dari atlas gedung.png; titik objek = pojok kiri bawah gambar (piksel)."""
        assert nama in UKURAN, nama
        self.obj(self.benda, nama, int(kiri), int(bawah), **props)

    def perabot(self, nama, x, y, padat=True, datar=False, geser=0, dx=0, dy=0):
        """Benda dengan tepi kiri di kolom x (+dx piksel) dan tepi bawah di bawah baris y. padat = tutup baris bawahnya
        (dan baris di atasnya kalau bendanya tinggi), selebar gambarnya."""
        w, h = UKURAN[nama]
        props = {}
        if datar:
            props["datar"] = 1
        if geser:
            props["geser"] = geser
        self.sprite(nama, x * T + dx, (y + 1) * T + dy, **props)
        if padat:                                          # kaki benda saja (8 piksel terbawah), sisanya bisa dilewati di belakangnya
            tinggi = min(h, 8)
            self.halangi(x * T + dx + 2, (y + 1) * T + dy - tinggi, w - 4, tinggi)

    def landmark(self, nama, x0, y0, w):
        """Gedung ikonik selebar w ubin dan setinggi 6 ubin (tapaknya), mulai (x0, y0). Bagian atasnya (kubah, menara, bendera)
        boleh lebih tinggi dari tapak. Mengembalikan y piksel tepi atas gambar."""
        _, h = UKURAN[nama]
        bawah = (y0 + 6) * T
        self.sprite(nama, x0 * T, bawah)
        self.tapak.append((x0, y0, w))
        dinding = DINDING.get(nama, 45)                    # rumah: dinding 45 piksel; atapnya bisa dilewati di belakangnya
        self.halangi(x0 * T + 4, bawah - dinding + 8, w * T - 8, dinding - 8)
        return bawah - h

    def pohon(self, cx, bawah, nama):
        """Pohon (gambar utuh) dengan tengah batang di cx dan tepi bawah di 'bawah' (piksel)."""
        w, _ = UKURAN[nama]
        self.sprite(nama, cx - w / 2, bawah)

    def lamp(self, x, y):
        self.put("hiasan", x, y, 196)
        self.put("atas", x, y - 1, 169)
        self.halangi(x * T + 6, y * T + 11, 4, 5)          # tiang lampu
        self.lamps.append((x, y - 1))

    def thing(self, x, y, idx, solid=True):
        self.put("hiasan", x, y, idx)
        if solid:
            self.halangi(x * T + 2, y * T + 8, 12, 8)

    def building(self, x0, y0, w, roof, wall, door, door_idx, windows=()):
        """Bangunan tinggi 6 tile: 4 baris atap + 2 baris dinding. door = kolom pintu (x). Semua tapaknya tabrakan."""
        x1 = x0 + w - 1
        if roof in ROOF:
            for r, base in enumerate(ROOF[roof]):
                for x in range(x0, x1 + 1):
                    self.put("bangunan", x, y0 + r, base + (0 if x == x0 else 2 if x == x1 else 1))
        else:                                    # atap datar: roof = nomor tile dasar 9 potong
            self.autotile("bangunan", cells(x0, y0, x1, y0 + 3), roof)
        for x in range(x0, x1 + 1):
            side = 0 if x == x0 else 2 if x == x1 else 1
            self.put("bangunan", x, y0 + 4, wall + side)
            self.put("bangunan", x, y0 + 5, wall + 54 + side)
        self.put("bangunan", door, y0 + 5, door_idx)
        for (wx, top, bottom) in windows:
            if top is not None:
                self.put("hiasan", wx, y0 + 4, top)
            if bottom is not None:
                self.put("hiasan", wx, y0 + 5, bottom)
        for c in cells(x0, y0, x1, y0 + 5):
            self.block(*c)

    def board(self, kind, ident, x0, y0, w, h, ground, order=0, name="", zone=True):
        """Papan HTML (lihat js/papan.js) selebar w tile dan setinggi h tile mulai dari (x0, y0).
        ground = baris tempat orang berdiri membacanya. Tapak papan dan tiangnya tidak bisa dilewati."""
        self.boards.append((kind, ident, x0, y0, w, h, ground, order))
        if ground > y0 + h:                                # papan bertiang: hanya tiangnya yang menghalangi
            for c in cells(x0, y0, x0 + w - 1, y0 + h - 1):
                self.put("rintangan", *c, BLOCK)
            for x in (x0, x0 + w - 1):
                self.halangi(x * T + 5, (y0 + h) * T, 6, (ground - y0 - h) * T)
        else:
            for c in cells(x0, y0, x0 + w - 1, y0 + h - 1):
                self.block(*c)
        if zone:
            self.door(ident, name, x0, ground - 1, "panel", kind, zone=(x0 * T, ground * T, w * T, T), label=False)

    # ----- objek -----
    def obj(self, bucket, name, x, y, w=0, h=0, **props):
        self.oid += 1
        o = {"id": self.oid, "name": name, "type": "", "x": x, "y": y, "width": w, "height": h, "rotation": 0, "visible": True}
        if not w and not h:
            o["point"] = True
        if props:
            o["properties"] = [{"name": k, "type": "int" if isinstance(v, int) else "string", "value": v} for k, v in props.items()]
        bucket.append(o)
        return o

    def door(self, ident, name, dx, dy, action, target="", zone=None, label=True, **extra):
        """Zona interaksi = satu baris di depan pintu, dilebarkan setengah tile kiri-kanan."""
        zx, zy, zw, zh = zone or ((dx - .5) * T, (dy + 1) * T, 2 * T, T)
        if not label:
            extra["tanpa_label"] = 1
        atap = next((y0 * T + 14 for (x0, y0, w) in self.tapak if x0 <= dx < x0 + w and y0 <= dy <= y0 + 5), int((dy - 1) * T + 4))
        lx, ly = extra.pop("label_x", int((dx + .5) * T)), extra.pop("label_y", atap)
        self.obj(self.doors, name, zx, zy, zw, zh, id=ident, aksi=action, tujuan=target, label_x=lx, label_y=ly, **extra)

    def route(self, name, pts):
        """Rute kendaraan: garis patah (polyline Tiled) dalam piksel."""
        x0, y0 = pts[0]
        o = self.obj(self.routes, name, x0, y0)
        del o["point"]
        o["polyline"] = [{"x": x - x0, "y": y - y0} for (x, y) in pts]

    # ----- tulis berkas Tiled -----
    def tulis(self, nama):
        papan = []
        for (kind, ident, x0, y0, w, h, ground, order) in self.boards:
            self.obj(papan, kind, x0 * T, y0 * T, w * T, h * T, id=ident, urutan=order, tiang=(ground - y0 - h) * T)
        for (x, y) in self.lamps:
            self.obj(self.points, "lampu", x * T + 8, y * T + 8)
        tile_layers = [{"id": i + 1, "name": n, "type": "tilelayer", "x": 0, "y": 0, "width": self.W, "height": self.H,
                        "opacity": .45 if n in ("tabrakan", "rintangan") else 1, "visible": n != "rintangan", "data": self.L[n]} for i, n in enumerate(LAYERS)]
        padat = []
        for (x, y, w, h) in self.kotak:
            self.obj(padat, "padat", x, y, w, h)
        groups = (("benda", self.benda), ("padat", padat), ("pintu", self.doors), ("titik", self.points), ("papan", papan), ("rute", self.routes))
        obj_layers = [{"id": len(LAYERS) + 1 + i, "name": n, "type": "objectgroup", "draworder": "topdown", "x": 0, "y": 0,
                       "opacity": 1, "visible": True, "objects": o} for i, (n, o) in enumerate(groups)]
        tmj = {"type": "map", "version": "1.10", "tiledversion": "1.11.0", "orientation": "orthogonal", "renderorder": "right-down",
               "infinite": False, "width": self.W, "height": self.H, "tilewidth": T, "tileheight": T, "compressionlevel": -1,
               "nextlayerid": len(LAYERS) + len(groups) + 1, "nextobjectid": self.oid + 1, "layers": tile_layers + obj_layers,
               "tilesets": [{"firstgid": 1, "name": "urban", "image": "../tiles/urban.png", "imagewidth": 486, "imageheight": 324,
                             "tilewidth": T, "tileheight": T, "margin": 1, "spacing": 2, "columns": COLS, "tilecount": 486}, {"firstgid": R0 + 1, "name": "ruang", "image": "../tiles/ruang.png", "imagewidth": 144, "imageheight": 18 * ((len(RUANG) + 7) // 8),
                             "tilewidth": T, "tileheight": T, "margin": 1, "spacing": 2, "columns": 8, "tilecount": 8 * ((len(RUANG) + 7) // 8),
                             # petak air danau dan kolam: bisa dipancing (js/mancing.js). Kolam air mancur memakai ubin urban, jadi tidak termasuk.
                             "tiles": [{"id": i, "properties": [{"name": "air", "type": "bool", "value": True}]} for n, i in sorted(RUANG.items(), key=lambda x: x[1]) if n.startswith("danau-")]}]}
        out = Path(__file__).resolve().parent.parent / "assets" / "maps" / f"{nama}.tmj"
        out.write_text(json.dumps(tmj, separators=(",", ":")))
        print(f"{out.name}: {self.W}x{self.H} tile, {len(self.doors)} pintu, {len(self.boards)} papan, {len(self.routes)} rute, {len(self.lamps)} lampu")


def aspal(p, roads):
    """Jalan aspal 3 ubin bergaris tengah. roads = [(x0, y0, x1, y1, "h"/"v")]. Mengembalikan petak aspal."""
    asphalt = set().union(*(cells(x0, y0, x1, y1) for (x0, y0, x1, y1, _) in roads))
    for (x, y) in sorted(asphalt, key=lambda c: (c[1], c[0])) if p.urut_aspal else asphalt:
        hs = [r for r in roads if r[4] == "h" and r[0] <= x <= r[2] and r[1] <= y <= r[3]]
        vs = [r for r in roads if r[4] == "v" and r[0] <= x <= r[2] and r[1] <= y <= r[3]]
        idx = p.rnd.choice((441, 468))
        if hs and not vs:
            row = y - hs[0][1]
            idx = 406 if row == 0 else 460 if row == 2 else (433 if x % 2 == 0 else idx)
        elif vs and not hs:
            col = x - vs[0][0]
            idx = 461 if col == 0 else 463 if col == 2 else (462 if y % 2 == 0 else idx)
        p.put("tanah", x, y, idx)
    p.lantai |= asphalt
    return asphalt


# =====================================================================================================
#  KOTA (96 x 80), gaya campuran: pusat kota rapi, makin ke selatan makin seperti kampung
#  utara  : jalan raya barat-timur; baliho, CodeIn News, videotron, Galeri, baliho, rumah proyek 1, halte, pos ronda
#  tengah : Taman Kota (ruang terbuka hijau) dikelilingi jalan: plaza air mancur dan patung, jalan taman melingkar,
#           kolam, gazebo, lapangan badminton, Papan Pengumuman, taman baliho; kebun kota di barat; Pasar CodeIn di timur
#  selatan: Markas CodeIn, Warkop, menara Aetheria (rumah proyek 2), Toko Mbak Tika, baliho 5-6; di bawahnya kampung
#           warga dengan jalan setapak tanah, lapangan, dan kolam, sampai Gerbang Selatan (ke Perumahan CodeIn)
#  Titik "tempat" (id) dipakai jadwal warga di js/config.js dan rute redaktur di js/redaksi.js, jadi kalau letak
#  bangunan berubah, cukup titiknya yang dipindah.
# =====================================================================================================
def kota():
    W, H = 96, 80
    p = Peta(W, H, seed=7)
    p.urut_aspal = True
    acak = random.Random(13)
    for y in range(H):
        for x in range(W):
            p.put("tanah", x, y, RUMPUT)
    tempat = lambda ident, x, y: p.obj(p.points, "tempat", x * T + 8, y * T + 8, id=ident)

    # ---------- jalan aspal ----------
    roads = [(0, 14, 95, 16, "h"),       # jalan raya: Gerbang Barat -> Gerbang Timur
             (19, 17, 21, 52, "v"),      # jalan barat taman
             (74, 17, 76, 52, "v"),      # jalan timur taman
             (19, 50, 76, 52, "h"),      # jalan selatan (depan Markas)
             (46, 53, 48, H - 1, "v")]   # jalan kampung -> Gerbang Selatan
    asphalt = aspal(p, roads)
    for (cx, cy) in ((30, 14), (47, 14), (65, 14), (33, 50), (60, 50)):       # zebra cross mendatar
        for i, idx in enumerate((405, 432, 459)):
            p.put("tanah", cx, cy + i, idx)

    # ---------- trotoar ----------
    trotoar = (cells(2, 13, 93, 13) | cells(2, 17, 93, 17)
               | cells(18, 17, 18, 53) | cells(22, 17, 22, 49) | cells(73, 17, 73, 49) | cells(77, 17, 77, 53)
               | cells(22, 49, 73, 49) | cells(18, 53, 77, 53)
               | cells(45, 53, 45, H - 4) | cells(49, 53, 49, H - 4)
               | cells(14, 12, 28, 12) | cells(34, 12, 44, 12) | cells(58, 12, 66, 12)) - asphalt
    p.ubin(trotoar, BATU)

    # ---------- bangunan utara (menghadap jalan raya) ----------
    atas = p.landmark("gedung-news", 16, 6, 11)
    tx, ty, tw, th = INFO["gedung-news"]["ticker"]
    p.obj(p.points, "ticker", 16 * T + tx, atas + ty, lebar=tw, tinggi=th)
    p.landmark("gedung-galeri", 35, 6, 9)
    p.landmark("rumah-proyek", 59, 6, 7)
    p.door("news", "CodeIn News", 21, 11, "masuk", "redaksi")
    p.door("galeri", "Galeri Showcase", 39, 11, "masuk", "galeri")
    p.door("proyek-1", "Gedung kosong", 62, 11, "panel", "proyek")
    p.board("videotron", "videotron", 28, 7, 6, 4, 12, name="Videotron Sedang Ramai")
    for (n, x0) in ((1, 3), (2, 9), (3, 46), (4, 52)):
        p.board("baliho", f"baliho-{n}", x0, 7, 5, 4, 12, order=n, name="Baliho")
    p.perabot("halte", 68, 12)
    p.perabot("pos-ronda", 88, 11)
    p.door("gerbang-barat", "Gerbang Barat", 1, 13, "panel", "gerbang", zone=(0, 14 * T, 2 * T, 3 * T), label_y=13 * T)
    p.door("gerbang-timur", "Gerbang Timur", 94, 13, "panel", "gerbang", zone=(94 * T, 14 * T, 2 * T, 3 * T), label_y=13 * T)
    for (x, y) in ((2, 13), (2, 17), (93, 13), (93, 17)):
        p.thing(x, y, 221)

    # ---------- bangunan selatan taman (menghadap jalan selatan), berjarak dan berselang taman kecil ----------
    # Markas | Warkop | (poros taman ke jalan kampung dibiarkan terbuka) | menara Aetheria | taman baliho 5-6
    atas = p.landmark("gedung-markas", 24, 43, 9)
    p.sprite("bendera-0", 24 * T + 74, atas + 11, bingkai=2, laju=420)
    p.landmark("warkop", 36, 43, 7)
    p.landmark("gedung-aetheria", 51, 43, 7)
    p.door("markas", "Markas CodeIn", 28, 48, "masuk", "markas")
    p.door("warkop", "Warkop CodeIn", 39, 48, "panel", "kunci")
    p.door("proyek-2", "Gedung kosong", 54, 48, "panel", "proyek")
    p.perabot("meja-warkop", 33, 48)
    for (n, x0) in ((5, 61), (6, 67)):
        p.board("baliho", f"baliho-{n}", x0, 41, 5, 4, 47, order=n, name="Baliho")
    p.ubin(cells(60, 46, 72, 48), KREM)
    for (x, y) in ((34, 47), (44, 46), (49, 46), (59, 47)):
        p.halangi(x * T + 5, y * T + 10, 6, 6)
        p.pohon(x * T + 8, y * T + 15, "pohon-a" if x % 2 else "pohon-b")
    # Toko Mbak Tika pindah ke samping Pasar CodeIn, menghadap pelataran depan parkir
    p.landmark("gedung-toko", 80, 43, 7)
    p.door("toko", "Toko Mbak Tika", 83, 48, "masuk", "toko")

    # ---------- Taman Kota (x 23-72, y 18-48) ----------
    cincin = cells(27, 22, 68, 22) | cells(27, 35, 68, 35) | cells(27, 22, 27, 35) | cells(68, 22, 68, 35)
    salib = cells(23, 28, 72, 29) | cells(47, 18, 48, 48)
    plaza = cells(41, 24, 54, 33)
    p.ubin(cincin | salib - plaza, KREM)
    p.ubin(plaza, ABU_KREM)
    pool, alas = cells(45, 26, 50, 31), cells(47, 28, 48, 29)
    p.autotile("jalan", pool, AIR)
    p.autotile("bangunan", alas, BATU)
    for c in pool:
        p.block(*c)
    p.obj(p.points, "patung", 48 * T, 29 * T + 6, jenis="pemula")
    for (x, y) in ((46, 26), (49, 26), (46, 31), (49, 31)):
        p.obj(p.points, "pancuran", x * T + 8, y * T + 8)
    p.door("patung", "Patung Si Pemula", 47, 24, "panel", zone=(45 * T, 32 * T, 6 * T, T), label_x=48 * T, label_y=27 * T + 2)
    for x in (43, 52):
        p.perabot("palem", x, 25, dx=-8)
    # kolam teratai di barat taman, gazebo di tepinya
    kolam = gumpal(random.Random(5), (34, 31), 4, 2.4, 3) - p.lantai
    pasang_alam(p, kolam, "danau")
    for c in kolam:
        p.block(*c)
    p.perabot("pos-ronda", 29, 26)                                # gazebo taman (bentuknya sama dengan pos ronda)
    # Papan Pengumuman di tepi utara taman, dekat zebra cross depan videotron
    p.board("pengumuman", "papan", 31, 18, 7, 3, 22, name="Papan Pengumuman", zone=False)
    p.door("papan", "Papan Pengumuman", 34, 20, "panel", zone=(31 * T, 22 * T, 7 * T, T), label=False)
    # lapangan badminton di timur taman
    p.ubin(cells(58, 30, 65, 33), BATU)
    p.perabot("net-badminton", 60, 32, dx=0)
    # bangku, lampu, semak bunga, dan pohon taman
    for (x, y) in ((30, 21), (40, 21), (56, 21), (64, 21), (30, 36), (40, 36), (56, 36), (64, 36), (44, 34), (51, 34), (38, 30), (57, 27)):
        p.thing(x, y, 250)
    for (x, y) in ((27, 22), (68, 22), (27, 35), (68, 35), (41, 24), (54, 24), (41, 33), (54, 33), (23, 28), (72, 28), (47, 18), (48, 48)):
        p.lamp(x, y)
    taman = cells(23, 18, 72, 48)
    for (x, y) in sorted(taman, key=lambda c: (c[1], c[0])):
        if (x, y) in p.lantai or (x, y) in p.keras or (x, y - 1) in p.lantai or (x, y + 1) in p.lantai or (x, y) in kolam:
            continue
        r = acak.random()
        rimbun = .5 + .5 * math.sin(x * .35) * math.cos(y * .41)
        if r < .05 + .08 * rimbun:
            p.halangi(x * T + 5, y * T + 10, 6, 6)
            p.pohon(x * T + 8 + acak.randint(-3, 3), y * T + 15, acak.choice(("pohon-a", "pohon-b", "pohon-a", "pohon-kecil", "pohon-gugur-b")))
        elif r < .11 + .06 * rimbun:
            p.thing(x, y, acak.choice((291, 292, 329, 331)))
    for x in range(23, 73):                                           # pagar tanaman di tepi taman, terbuka di jalan masuk
        for y in (18, 48):
            if (x, y) not in p.lantai and (x, y) not in p.keras and x not in (47, 48):
                if y == 48 or not (31 <= x <= 37):
                    p.thing(x, y, 329 if x % 5 else 331)

    # ---------- kebun kota di barat taman ----------
    kebun = cells(4, 31, 15, 40)
    pematang = {(x, y) for (x, y) in kebun if (x - 4) % 4 == 0 or (y - 31) % 3 == 0 or x == 15 or y == 40}
    for (x, y) in kebun - pematang:
        p.put("tanah", x, y, ruang(f"sawah-{(x + y) % 2}"))
        p.block(x, y)
    jalan_kebun = pematang | cells(16, 35, 17, 35)
    p.board("info", "kebun", 6, 26, 4, 2, 29, name="Kebun Kota")
    for (x, y) in ((4, 24), (12, 24), (16, 44)):
        p.thing(x, y, 250)

    # ---------- Pasar CodeIn di timur taman ----------
    # tiga baris lapak menghadap lorong; pembeli berkeliling di lorong (baris 24-27, 31-34, 38-39)
    pasar = cells(79, 19, 92, 40)
    p.ubin(pasar, KREM)
    lapak = (("lapak-sayur", 80, 23), ("lapak-buah", 83, 23), ("lapak-ikan", 86, 23), ("lapak-kain", 89, 23),
             ("lapak-jamu", 80, 30), ("lapak-kue", 83, 30), ("lapak-mainan", 86, 30), ("lapak-kelapa", 89, 30),
             ("lapak-tahu", 83, 37), ("lapak-rempah", 86, 37), ("lapak-bunga", 89, 37))
    for (nama, x, y) in lapak:
        p.perabot(nama, x, y, geser=8, dy=4)
    p.perabot("gerobak", 79, 38, dx=4)
    for (x, y, idx) in ((92, 23, 276), (92, 30, 273), (79, 33, 301), (92, 33, 275), (82, 33, 302), (88, 26, 277), (85, 26, 274), (92, 37, 303)):
        p.thing(x, y, idx)
    p.board("info", "pasar", 83, 19, 6, 2, 21, name="Pasar CodeIn")
    for (x, y) in ((79, 19), (92, 19), (79, 39), (92, 39)):
        p.lamp(x, y)
    # parkir kecil di samping Toko Mbak Tika, pelataran depan toko tersambung ke trotoar
    p.ubin(cells(88, 42, 92, 48), ABU_KREM)
    p.ubin(cells(78, 49, 92, 49), BATU)
    for (x, y, tiles) in ((89, 45, (447, 448, 474, 475)), (89, 48, (393, 394, 420, 421))):
        p.put("atas", x, y - 1, tiles[0]); p.put("atas", x + 1, y - 1, tiles[1])
        p.thing(x, y, tiles[2]); p.thing(x + 1, y, tiles[3])

    # ---------- kampung warga (selatan jalan selatan) ----------
    penghuni = {(4, 55): "Bu Sari", (13, 57): "Bang Jo", (23, 55): "Dika", (33, 57): None, (7, 66): "Nek Ijah", (18, 67): "Kak Mita",
                (52, 56): "Pak Harun", (62, 55): "Mbak Tika", (72, 57): "Kak Rani", (82, 55): None, (56, 66): "Om Budi", (67, 67): "Rafi dan Lia"}
    rumah = []
    for n, ((x0, y0), siapa) in enumerate(penghuni.items(), 1):
        p.landmark(f"rumah-{(n - 1) % 6}", x0, y0, 6)
        if siapa:
            p.door(f"rumah-{n}", f"Rumah {siapa}", x0 + 2, y0 + 5, "panel", "rumah", penghuni=siapa)
        else:
            p.door("proyek-3" if x0 < 45 else "proyek-4", "Rumah kosong", x0 + 2, y0 + 5, "panel", "proyek")
        p.thing(x0 + 5, y0 + 6, 305 if n % 2 else 306)
        for x in (x0, x0 + 1, x0 + 4):
            if acak.random() < .7:
                p.thing(x, y0 + 7, 382 if x != x0 + 1 else 384)
        rumah.append((x0, y0))
    # lapangan kampung (Rafi dan Lia main badminton sore hari) dan kolam di timur kampung
    p.ubin(cells(28, 67, 37, 72), BATU)
    p.perabot("net-badminton", 31, 70, dx=0)
    p.perabot("beringin", 40, 64, dx=4)
    kolam_k = gumpal(random.Random(9), (87, 70), 3.5, 2.2, 2) - p.lantai
    pasang_alam(p, kolam_k, "danau")
    for c in kolam_k:
        p.block(*c)
    p.door("gerbang-selatan", "Perumahan CodeIn", 47, H - 2, "masuk", "perumahan", zone=(46 * T, (H - 2) * T, 3 * T, 2 * T), label_y=(H - 2) * T)
    for (x, y) in ((45, H - 3), (49, H - 3)):
        p.thing(x, y, 221)

    # jalan setapak tanah dari tiap rumah ke jalan terdekat (A*), lalu ke lapangan, kolam, dan kebun
    tepi = set()
    for x in range(W):
        tepi |= {(x, y) for y in range(0, 2 + int(1 + math.sin(x * .41)))} | {(x, y) for y in range(H - 2 - int(1 + math.sin(x * .3)), H)}
    for y in range(H):
        tepi |= {(x, y) for x in range(0, 2 + int(1 + math.sin(y * .37)))} | {(x, y) for x in range(W - 2 - int(1 + math.sin(y * .29)), W)}
    tepi -= cells(0, 12, 3, 18) | cells(92, 12, 95, 18) | cells(44, H - 4, 50, H - 1)
    larang = set(p.keras) | tepi | kolam | kolam_k | (kebun - pematang)
    jaringan = (p.lantai - asphalt) | asphalt
    setapak = set(jalan_kebun)
    for (x0, y0) in rumah:
        larang |= cells(x0, y0, x0 + 5, y0 + 6)
    for (x0, y0) in sorted(rumah, key=lambda r: abs(r[0] + 2 - 47) + r[1]):
        mulai = (x0 + 2, y0 + 7)
        jalur = cari_jalan(W, H, mulai, jaringan | setapak, larang - {mulai, (x0 + 2, y0 + 6)}, setapak, set())
        if jalur:
            setapak |= set(jalur) - p.lantai
        setapak |= {(x0 + 2, y0 + 6), (x0 + 3, y0 + 6)} - p.lantai
    for tuju in ((32, 66), (84, 68), (16, 35)):
        jalur = cari_jalan(W, H, tuju, jaringan | (setapak - {tuju}), larang, setapak, set())
        if jalur:
            setapak |= set(jalur) - p.lantai
    pasang_alam(p, setapak, "setapak")
    p.lantai |= setapak
    for (x, y) in ((44, 56), (50, 56), (44, 64), (50, 64), (44, 72), (50, 72), (26, 61), (64, 62)):
        if (x, y) not in p.lantai and (x, y) not in p.keras:
            p.lamp(x, y)

    # ---------- hutan tepi dan pohon pengisi ----------
    pohon_tepi = ("pohon-a", "pohon-b", "pohon-a", "rumpun", "pohon-kecil", "pohon-gugur-a")
    for (x, y) in sorted(tepi, key=lambda c: (c[1], c[0])):
        if (x, y) in p.lantai or (x, y) in p.keras or (x, y - 1) in p.lantai:
            continue
        p.block(x, y)
        p.pohon(x * T + 8 + acak.randint(-5, 5), y * T + 15 + acak.randint(-3, 2), acak.choice(pohon_tepi))
    isian = ((cells(2, 2, 93, 5), .35), (cells(2, 18, 17, 49), .12), (cells(78, 40, 93, 49), .1), (cells(2, 54, 93, H - 4), .09))
    for area, peluang in isian:
        for (x, y) in sorted(area, key=lambda c: (c[1], c[0])):
            if (x, y) in p.keras or (x, y) in p.lantai or (x, y - 1) in p.lantai or (x, y + 1) in p.lantai or (x, y) in tepi:
                continue
            if any(x0 - 1 <= x <= x0 + 6 and y0 - 1 <= y <= y0 + 7 for (x0, y0) in rumah):
                continue
            if acak.random() < peluang:
                p.halangi(x * T + 5, y * T + 10, 6, 6)
                p.pohon(x * T + 8 + acak.randint(-3, 3), y * T + 15 + acak.randint(-2, 1), acak.choice(("pohon-a", "pohon-b", "pohon-kecil", "pohon-gugur-b")))
            elif acak.random() < peluang * .4:
                p.thing(x, y, acak.choice((291, 292)))
    # lampu jalan raya dan jalan lingkar
    for x in (8, 14, 26, 34, 44, 52, 58, 70, 80, 86):
        p.lamp(x, 13)
    for x in (10, 26, 40, 56, 70, 84):
        p.lamp(x, 17)
    for y in (24, 32, 40):
        p.lamp(18, y); p.lamp(77, y)
    for x in (26, 40, 56, 70):
        p.lamp(x, 53)

    # ---------- titik tempat untuk jadwal warga dan redaktur ----------
    # Setiap titik harus di petak yang bisa diinjak (bukan lampu, bangku, palem, atau air): warga yang tujuannya terhalang
    # tidak bisa mencari jalan. Pojok jalan lingkar dan pojok plaza ada lampunya, jadi titiknya satu petak ke dalam.
    for ident, x, y in (("depan-news", 21, 13), ("depan-videotron", 31, 13), ("zebra-news", 29, 13), ("depan-galeri", 39, 13),
                        ("depan-papan", 34, 23), ("alun-alun", 45, 33), ("dekat-patung", 52, 30), ("taman-kolam", 40, 31),
                        ("gazebo", 31, 29), ("taman-timur", 62, 25), ("taman-baliho", 66, 49), ("depan-markas", 28, 49),
                        ("depan-warkop", 39, 49), ("depan-toko", 83, 50), ("depan-aetheria", 54, 49), ("pos-timur", 89, 13), ("pos-timur-2", 87, 13),
                        ("halte", 69, 13), ("gerobak-bakso", 81, 39), ("lapangan-1", 31, 69), ("lapangan-2", 31, 72),
                        ("kebun", 16, 36), ("taman-lapangan", 61, 34),
                        ("patung-1", 45, 25), ("patung-2", 50, 25), ("patung-3", 51, 32), ("patung-4", 44, 32),
                        ("cincin-1", 28, 22), ("cincin-2", 67, 22), ("cincin-3", 67, 35), ("cincin-4", 28, 35),
                        ("trotoar-utara-1", 50, 13), ("trotoar-utara-2", 72, 13), ("kampung-1", 47, 55), ("kampung-2", 45, 74),
                        ("gang-barat-1", 10, 64), ("gang-barat-2", 26, 63),
                        ("pasar-1", 80, 26), ("pasar-2", 91, 27), ("pasar-3", 91, 33), ("pasar-4", 80, 34), ("pasar-5", 86, 25), ("pasar-6", 86, 33)):
        tempat(ident, x, y)
    for (nama, x, y) in lapak:                                        # pedagang berdiri di bawah tenda lapaknya
        tempat("lapak-" + nama.split("-")[1], x + 1, y)

    # ---------- titik mulai dan rute kendaraan ----------
    p.obj(p.points, "mulai", 47 * T + 8, 20 * T + 8)
    U1, S1, U2, S2 = 14 * T + 24, 17 * T - 1, 50 * T + 24, 53 * T - 1
    luar_b, luar_t, luar_s = -3 * T, (W + 3) * T, (H + 3) * T
    p.route("barat-timur", [(luar_b, U1), (luar_t, U1)])
    p.route("timur-barat", [(luar_t, S1), (luar_b, S1)])
    p.route("selatan-timur", [(46 * T + 8, luar_s), (46 * T + 8, U2), (74 * T + 8, U2), (74 * T + 8, U1), (luar_t, U1)])
    p.route("barat-selatan", [(luar_b, U1), (21 * T + 8, U1), (21 * T + 8, U2), (48 * T + 8, U2), (48 * T + 8, luar_s)])
    p.route("timur-selatan", [(luar_t, S1), (76 * T + 8, S1), (76 * T + 8, S2), (48 * T + 8, S2), (48 * T + 8, luar_s)])
    p.tulis("kota")


# =====================================================================================================
#  INTERIOR: ruangan dikelilingi kehampaan (petak kosong), dinding di utara, pintu keluar di selatan
# =====================================================================================================
def ruangan(w, h, tema, lantai, tinggi_dinding, pintu_x, keluar_ke, keluar_peta="kota"):
    """Ruangan selebar w dan setinggi h ubin (peta w+2 x h+3), dengan ubin ruang.png: dinding wallpaper bergaris (tema)
    dengan lis di atas dan lambersering kayu di bawah, lantai (kayu/ubin), tepi tembok tebal, dan keset di pintu keluar."""
    p = Peta(w + 2, h + 3)
    x0, x1, y0 = 1, w, 1
    for x in range(x0, x1 + 1):
        for r in range(tinggi_dinding):
            baris = 0 if r == 0 else 2 if r == tinggi_dinding - 1 else 1
            p.put("bangunan", x, y0 + r, ruang(f"dinding-{tema}-{baris}"))
    lantai_area = cells(x0, y0 + tinggi_dinding, x1, h)
    for (x, y) in lantai_area:
        nama = f"kayu-{(y + x // 3) % 4}" if lantai == "kayu" else f"ubin-{(x + y) % 2}"
        p.put("tanah", x, y, ruang(nama))
    p.lantai |= lantai_area
    for x in range(x0, x1 + 1):
        p.put("bangunan", x, 0, ruang("tepi-atas"))
        if x not in (pintu_x, pintu_x + 1):
            p.put("bangunan", x, h + 1, ruang("tepi-bawah"))
    for y in range(1, h + 1):
        p.put("bangunan", 0, y, ruang("tepi-kiri"))
        p.put("bangunan", w + 1, y, ruang("tepi-kanan"))
    for (x, y, n) in ((0, 0, "kiri-atas"), (w + 1, 0, "kanan-atas"), (0, h + 1, "kiri-bawah"), (w + 1, h + 1, "kanan-bawah")):
        p.put("bangunan", x, y, ruang("tepi-" + n))
    keset = cells(pintu_x, h + 1, pintu_x + 1, h + 1)
    for (x, y) in keset:
        p.put("tanah", x, y, ruang("keset"))
    p.lantai |= keset
    for y in range(p.H):
        for x in range(p.W):
            if (x, y) not in lantai_area and (x, y) not in keset:
                p.block(x, y)
    p.door("keluar", "Pintu keluar", pintu_x, h, "keluar", keluar_peta, zone=(pintu_x * T, (h + 1) * T, 2 * T, T), label=False, ke=keluar_ke)
    p.obj(p.points, "mulai", (pintu_x + 1) * T, h * T + 8)
    return p


def markas():
    """Markas CodeIn: balai kayu, papan Tentang dan Rencana, Patung Pendiri, meja rapat, meja resepsionis Kak Rani, pojok baca.
    Perabot seukuran karakter Kenney (meja setinggi pinggang orang)."""
    p = ruangan(20, 11, "krem", "kayu", 3, 10, "markas")
    p.board("info", "tentang", 3, 1, 6, 3, 4, name="Tentang CodeIn")
    p.board("info", "rencana", 13, 1, 6, 3, 4, name="Rencana kota")
    p.perabot("jendela-dinding", 19, 2, padat=False, datar=True, dx=-2)
    p.perabot("lukisan", 1, 2, padat=False, datar=True, dx=4)
    # Patung Pendiri di tengah dinding utara, di atas alas batu, diapit dua tanaman
    p.autotile("bangunan", cells(10, 4, 11, 4), BATU)
    p.block(10, 4)
    p.block(11, 4)
    p.obj(p.points, "patung", 11 * T, 4 * T + 6, jenis="pendiri")
    p.door("pendiri", "Patung Pendiri (Jull)", 10, 4, "panel", zone=(int(9.5 * T), 5 * T, 3 * T, T), label_x=11 * T, label_y=2 * T + 2)
    p.perabot("tanaman", 9, 4, dx=2)
    p.perabot("tanaman", 12, 4, dx=2)
    # meja resepsionis: Kak Rani berdiri di belakangnya (baris 8, badannya terlihat di atas meja), tamu menyapa dari baris 10
    p.perabot("meja-resepsionis", 15, 9)
    p.door("resepsionis", "Meja resepsionis", 16, 9, "panel", "sapa", zone=(15 * T, 10 * T, 3 * T, T), label=False, penghuni="Kak Rani")
    # meja rapat di atas karpet, kursi di belakang dan di depannya
    p.perabot("karpet", 6, 8, padat=False, datar=True, dx=4)
    for x in (7, 8, 9):
        p.perabot("kursi", x, 6, padat=False, dx=2)
    p.perabot("meja-panjang", 7, 7)
    for x in (7, 8, 9):
        p.perabot("kursi-belakang", x, 8, padat=False, dx=2)
    p.perabot("papan-tulis", 4, 7, dx=4)
    # rak dan lemari di sisi ruangan, pojok baca di kiri bawah
    p.perabot("rak-buku-lebar", 1, 5)
    p.perabot("lemari", 18, 5, dx=8)
    p.perabot("jam-besar", 20, 7, dx=2)
    p.perabot("sofa", 2, 10)
    p.perabot("lampu-lantai", 4, 10, dx=4)
    p.perabot("meja-bundar", 5, 10, dx=4)
    p.perabot("karpet-biru", 9, 11, padat=False, datar=True, dx=12)
    p.perabot("tanaman-besar", 1, 10, dx=-2)
    p.perabot("tanaman-besar", 20, 10, dx=0)
    p.perabot("dispenser", 14, 4, dx=4)
    p.tulis("markas")


def galeri():
    """Galeri Showcase: lantai ubin museum, enam karya (baliho) di dinding, bangku empuk di depan tiap karya, karpet merah dari pintu."""
    p = ruangan(37, 11, "oranye", "ubin", 5, 18, "galeri")
    for n in range(6):                         # enam karya di dinding = enam slot baliho
        p.board("baliho", f"baliho-{n + 1}", 2 + n * 6, 1, 5, 4, 6, order=n + 1, name="Karya")
    for x in (7, 13, 19, 25, 31):              # tanaman di antara karya
        p.perabot("tanaman", x, 6, dx=2)
    for n in range(6):                         # bangku di depan tiap karya
        p.perabot("bangku-galeri", 3 + n * 6, 9, dx=8)
    p.perabot("karpet-panjang", 18, 11, padat=False, datar=True, dx=1)
    p.perabot("meja-kerja", 1, 10, dx=8)       # meja penjaga galeri; Kak Mita berdiri di belakangnya
    for (x, y) in ((1, 6), (37, 6), (37, 11)):
        p.perabot("tanaman-besar", x, y, dx=0)
    p.perabot("jam-besar", 36, 10, dx=2)
    p.tulis("galeri")


def redaksi():
    """Kantor Redaksi CodeIn News. Eko, Tekno, dan Rina diatur js/redaksi.js (keadaannya dari data CodeIn News),
    jadi di peta ini cukup meja, zona sapa di depan meja, dan titik-titik yang dipakai skrip itu."""
    p = ruangan(24, 10, "zaitun", "kayu", 3, 12, "news")
    p.board("info", "cara-kerja", 2, 1, 5, 3, 4, name="Cara kerja redaksi")
    p.board("videotron", "layar-redaksi", 9, 1, 8, 3, 4, name="Sedang ramai")
    p.perabot("jendela-dinding", 19, 2, padat=False, datar=True)
    p.perabot("lukisan-hijau", 22, 2, padat=False, datar=True, dx=-4)
    # tiga meja redaksi; agen duduk di baris 5 di kursinya (badannya terlihat di atas meja), pengunjung menyapa dari baris 7.
    # Layar komputer di meja digambar js/redaksi.js, sedikit di depan meja.
    for agen, x0 in (("Eko", 3), ("Tekno", 11), ("Rina", 19)):
        p.perabot("kursi-kantor", x0 + 1, 5, padat=False, geser=-12, dx=2)
        p.perabot("meja-kerja", x0, 6, geser=-3, dx=8)
        p.obj(p.points, "meja", (x0 + 1) * T + 8, 5 * T + 12, agen=agen)
        p.door("meja-" + agen.lower(), "Meja " + agen, x0 + 1, 6, "panel", "redaksi",
               zone=(x0 * T, 7 * T, 3 * T, T), label=False, penghuni=agen)
    # dapur kecil di kiri bawah: konter dengan mesin kopi dan kulkas; agen ngopi di baris 9-10 kolom 2-3
    p.perabot("konter-kopi", 1, 8)
    p.perabot("kulkas", 1, 10)
    # meja rapat di kanan bawah; agen berkumpul di baris 8 di belakangnya saat ada gangguan sistem
    p.perabot("karpet", 18, 10, padat=False, datar=True, dx=8)
    p.perabot("meja-panjang", 19, 9)
    # terminal untuk membaca CodeIn News di situsnya
    p.perabot("meja-komputer", 7, 9, dx=12)
    p.door("baca", "Baca CodeIn News", 8, 9, "pindah", "https://news.codeinhub.my.id/", zone=(7 * T, 9 * T + 8, 3 * T, 24))
    for (x, y) in ((1, 5), (24, 5), (24, 10), (8, 4)):
        p.perabot("tanaman", x, y, dx=2)
    p.perabot("dispenser", 17, 4, dx=4)
    p.perabot("rak-buku", 22, 4)
    p.tulis("redaksi")


# =====================================================================================================
#  PERUMAHAN CODEIN (112 x 92), lewat Gerbang Selatan kota: desa yang tidak teratur
#  Satu jalan aspal dari gapura ke lapangan desa; selebihnya jalan setapak tanah yang dicari dengan A* dari tiap rumah
#  ke jaringan jalan terdekat, jadi berkelok mengikuti lahan. Ada hutan di tepi dan di tengah desa, danau di timur,
#  kolam di taman barat, dan sawah berpematang di barat daya. 24 kavling (A01-A24) ditaruh acak (benih tetap) di lahan
#  yang lapang. Rumahnya tidak digambar di peta: js/perumahan.js menaruh rumah starter atau tanda kavling kosong
#  menurut data CodeIn News. Pintu "kav-<kode>" menyimpan letak kavling (properti kiri, bawah = pojok kiri bawah rumah).
# =====================================================================================================
import heapq

PAGAR_KIRI, PAGAR_KANAN = 382, 384  # pagar kayu: ujung kiri (tiang di kiri) dan ujung kanan (tiang di kanan)
SEMAK = (291, 292)                  # semak bulat kecil


def gumpal(acak, pusat, rx, ry, potong=3):
    """Bentuk alami: gabungan beberapa elips acak di sekitar pusat."""
    cx, cy = pusat
    hasil = set()
    for i in range(potong):
        ox, oy = (0, 0) if i == 0 else (acak.uniform(-rx * .6, rx * .6), acak.uniform(-ry * .6, ry * .6))
        ex, ey = rx * acak.uniform(.6, 1), ry * acak.uniform(.6, 1)
        for y in range(int(cy + oy - ey) - 1, int(cy + oy + ey) + 2):
            for x in range(int(cx + ox - ex) - 1, int(cx + ox + ex) + 2):
                if ((x - cx - ox) / ex) ** 2 + ((y - cy - oy) / ey) ** 2 <= 1:
                    hasil.add((x, y))
    return hasil


def pasang_alam(p, area, nama):
    """Autotile 47 bentuk (setapak/danau) di layer tanah."""
    for (x, y) in area:
        g = lambda dx, dy: (x + dx, y + dy) in area
        t = g(0, -1) * 1 + g(1, 0) * 2 + g(0, 1) * 4 + g(-1, 0) * 8
        m = ((g(0, -1) and g(1, 0) and not g(1, -1)) * 1 + (g(0, 1) and g(1, 0) and not g(1, 1)) * 2
             + (g(0, 1) and g(-1, 0) and not g(-1, 1)) * 4 + (g(0, -1) and g(-1, 0) and not g(-1, -1)) * 8)
        p.put("tanah", x, y, ruang(f"{nama}-{t}-{m}"))


def cari_jalan(W, H, mulai, tujuan, larang, murah, mahal):
    """A* 4 arah dari mulai ke petak mana pun di tujuan. larang = tak boleh dilewati, murah = jalan yang sudah ada,
    mahal = petak yang boleh dilewati tetapi dihindari (hutan dalam, tepi kavling)."""
    if mulai in larang:
        return None
    def h(c):
        return 0
    buka, asal, biaya = [(0, mulai)], {mulai: None}, {mulai: 0}
    while buka:
        _, c = heapq.heappop(buka)
        if c in tujuan:
            jalur = []
            while c is not None:
                jalur.append(c); c = asal[c]
            return jalur[::-1]
        for d in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (c[0] + d[0], c[1] + d[1])
            if not (2 <= n[0] < W - 2 and 2 <= n[1] < H - 2) or n in larang:
                continue
            # derau halus membuat jalan berkelok, tidak lurus siku-siku
            derau = .9 * (1 + math.sin(n[0] * .45 + math.cos(n[1] * .31) * 2) * math.cos(n[1] * .38 + math.sin(n[0] * .27) * 2))
            b = biaya[c] + (.25 if n in murah else 5 if n in mahal else 1 + derau)
            if b < biaya.get(n, 1e9):
                biaya[n] = b; asal[n] = c
                heapq.heappush(buka, (b + h(n), n))
    return None


def perumahan():
    W, H = 112, 92
    p = Peta(W, H, seed=23)
    p.urut_aspal = True
    acak = random.Random(41)
    for y in range(H):
        for x in range(W):
            p.put("tanah", x, y, RUMPUT)

    # ---------- jalan aspal: gapura -> lapangan desa ----------
    aspal(p, [(55, 0, 57, 21, "v")])
    alun = cells(50, 22, 62, 28)                                   # lapangan desa (pelataran krem)
    p.ubin(alun, KREM)
    p.sprite("gerbang-perumahan", 53 * T, 4 * T)
    p.halangi(53 * T + 1, 4 * T - 8, 12, 8)
    p.halangi(53 * T + 83, 4 * T - 8, 12, 8)
    p.perabot("pos-ronda", 59, 4)
    p.door("gerbang-kota", "Ke CodeIn City", 56, 0, "keluar", "kota", zone=(55 * T, 0, 3 * T, 2 * T), label_y=2 * T, ke="gerbang-selatan")
    p.obj(p.points, "mulai", 56 * T + 8, 6 * T + 8)
    for y in (7, 13, 19):
        p.lamp(54, y); p.lamp(58, y)

    # ---------- alam: hutan tepi, hutan tengah, danau, kolam taman, sawah ----------
    tepi = set()
    for x in range(W):
        tepi |= {(x, y) for y in range(0, 2 + int(1.5 + 1.5 * math.sin(x * .37)))} | {(x, y) for y in range(H - 3 - int(1.5 + 1.5 * math.sin(x * .29 + 1)), H)}
    for y in range(H):
        tepi |= {(x, y) for x in range(0, 3 + int(1.5 + 1.5 * math.sin(y * .41)))} | {(x, y) for x in range(W - 3 - int(1.5 + 1.5 * math.sin(y * .33 + 2)), W)}
    tepi -= cells(52, 0, 60, 5)                                    # gapura
    hutan_tengah = set()
    for (pusat, rx, ry) in (((20, 22), 7, 5), ((88, 17), 8, 5), ((40, 58), 6, 4), ((74, 76), 9, 5), ((102, 46), 5, 7)):
        hutan_tengah |= gumpal(acak, pusat, rx, ry, 4)
    danau_ = gumpal(acak, (82, 48), 9, 6, 4)
    kolam_ = gumpal(acak, (36, 32), 3.5, 2.5, 2)
    sawah_ = cells(8, 70, 27, 81)
    hutan = (tepi | hutan_tengah) - danau_ - kolam_ - sawah_ - alun - p.lantai
    air = danau_ | kolam_

    # pematang sawah: setapak tanah tiap 4 baris dan 5 kolom, petak sawah tidak bisa dimasuki
    pematang = {(x, y) for (x, y) in sawah_ if (x - 8) % 5 == 0 or (y - 70) % 4 == 0 or x == 27 or y == 81}
    for (x, y) in sawah_ - pematang:
        p.put("tanah", x, y, ruang(f"sawah-{(x + y) % 2}"))
        p.block(x, y)

    # ---------- kavling acak ----------
    jalan = set(pematang)                                          # jaringan setapak tanah
    terpakai = set(alun) | air | sawah_ | hutan | p.lantai | cells(48, 0, 64, 8)
    sekitar_alun = alun | cells(55, 0, 57, 21)
    kavling = []
    coba = 0
    while len(kavling) < 24 and coba < 40000:
        coba += 1
        x0, y0 = acak.randint(5, W - 12), acak.randint(6, H - 14)
        tapak = cells(x0 - 1, y0 - 1, x0 + 6, y0 + 8)              # rumah, halaman depan, dan baris jalan di bawahnya
        jarak_lain = cells(x0 - 2, y0 - 2, x0 + 7, y0 + 9)
        if tapak & terpakai or any(jarak_lain & k["tapak"] for k in kavling):
            continue
        halaman = cells(x0 + 2, y0 + 6, x0 + 3, y0 + 7)
        larang = air | (sawah_ - pematang) | tepi | p.keras | set().union(*(k["rumah"] for k in kavling), set()) | cells(x0, y0, x0 + 5, y0 + 7)
        tujuan = jalan | {c for c in sekitar_alun if (c[0], c[1]) not in cells(55, 0, 57, 8)}
        jalur = cari_jalan(W, H, (x0 + 2, y0 + 8), tujuan, larang, jalan, hutan_tengah | {c for k in kavling for c in k["halaman_luar"]})
        if not jalur or len(jalur) > 70:
            continue
        rumah = cells(x0, y0, x0 + 5, y0 + 7)
        kavling.append({"x0": x0, "y0": y0, "tapak": tapak, "rumah": rumah,
                        "halaman_luar": cells(x0, y0 + 6, x0 + 5, y0 + 7) - halaman})
        terpakai |= tapak
        baru = (set(jalur) | halaman) - sekitar_alun - p.lantai
        jalan |= baru
        hutan -= baru | tapak                                       # setapak membelah hutan tengah
    assert len(kavling) == 24, f"hanya {len(kavling)} kavling muat"

    # setapak ke danau, taman, dan sawah
    for tuju in ((82, 40), (36, 28), (27, 69), (70, 52)):
        larang = air | (sawah_ - pematang) | tepi | set().union(*(k["rumah"] for k in kavling))
        calon = [c for c in cells(tuju[0] - 5, tuju[1] - 5, tuju[0] + 5, tuju[1] + 5) if c not in larang and c not in hutan and c not in terpakai]
        if not calon:
            continue
        mulai = min(calon, key=lambda c: abs(c[0] - tuju[0]) + abs(c[1] - tuju[1]))
        jalur = cari_jalan(W, H, mulai, jalan | sekitar_alun, larang, jalan, hutan_tengah)
        if jalur:
            baru = set(jalur) - sekitar_alun - p.lantai
            jalan |= baru; hutan -= baru
    # tepian danau dan kolam dibuat bisa dikelilingi: setapak tidak menutupi air
    pasang_alam(p, air, "danau")
    for c in air:
        p.block(*c)
    pasang_alam(p, jalan, "setapak")
    p.lantai |= jalan

    # urutkan kavling seperti membaca (atas ke bawah, kiri ke kanan) lalu beri kode
    kavling.sort(key=lambda k: (k["y0"] // 12, k["x0"]))
    for n, k in enumerate(kavling, 1):
        x0, y0, kode = k["x0"], k["y0"], f"A{n:02d}"
        p.tapak.append((x0, y0, 6))
        p.door(f"kav-{kode}", f"Kavling {kode}", x0 + 2, y0 + 5, "panel", "kavling", kavling=kode, kiri=x0 * T, bawah=(y0 + 6) * T)
        gaya = acak.random()
        if gaya < .45:                                               # pagar kayu dengan pintu di depan setapak
            for x in (x0, x0 + 1, x0 + 4, x0 + 5):                   # dua ruas pagar di kiri-kanan setapak
                p.thing(x, y0 + 7, PAGAR_KIRI if x in (x0, x0 + 4) else PAGAR_KANAN)
        elif gaya < .8:                                              # pagar tanaman
            for x in (x0, x0 + 1, x0 + 4, x0 + 5):
                p.thing(x, y0 + 7, 329 if x in (x0, x0 + 4) else 330)
        else:                                                        # halaman terbuka, semak di sudut
            p.thing(x0, y0 + 7, SEMAK[n % 2]); p.thing(x0 + 5, y0 + 7, SEMAK[(n + 1) % 2])
        p.thing(x0 + (5 if acak.random() < .5 else 0), y0 + 6, 305 if n % 2 else 306)       # kotak surat
        if (x0 + 4, y0 + 8) not in jalan and (x0 + 4, y0 + 8) not in p.keras:
            p.lamp(x0 + 4, y0 + 8)

    # ---------- lapangan desa dan taman ----------
    p.board("info", "info-perumahan", 51, 23, 4, 2, 26, name="Papan Perumahan CodeIn")
    p.perabot("beringin", 58, 27, dx=4)
    for (x, y) in ((52, 28), (61, 23), (50, 26)):
        p.thing(x, y, 250)
    for (x, y) in ((50, 22), (62, 22), (50, 28), (62, 28)):
        p.lamp(x, y)
    for (x, y) in ((32, 33), (40, 31), (36, 36)):                  # bangku di tepi kolam taman
        if (x, y) not in p.keras and (x, y) not in air:
            p.thing(x, y, 250)
    p.perabot("net-badminton", 65, 26)

    # ---------- hutan (ubin pohon, petaknya ditutup) dan pohon lepas ----------
    jenis_tepi = ("pohon-a", "pohon-b", "pohon-a", "rumpun", "pohon-kecil", "pohon-a", "pohon-b", "rumpun", "pohon-gugur-a")
    bebas = lambda c: c not in jalan and c not in p.keras and c not in air and c not in terpakai and c not in p.lantai
    for (x, y) in sorted(hutan, key=lambda c: (c[1], c[0])):
        if (x, y) in jalan or (x, y) in p.lantai:
            continue
        p.block(x, y)
        tepi_hutan = any((x + dx, y + dy) not in hutan for dx, dy in ((0, 1), (1, 0), (-1, 0), (0, -1)))
        if tepi_hutan or acak.random() < .35:                       # gambar pohon utuh, sedikit digeser supaya tidak berbaris
            p.pohon(x * T + 8 + acak.randint(-5, 5), y * T + 15 + acak.randint(-3, 2), acak.choice(jenis_tepi))
        else:
            p.tree(x, y, acak.choice("AAABBBAABO"))
            p.kotak.pop()                                           # petaknya sudah ditutup penuh
    for y in range(4, H - 4):                                       # pohon lepas dan semak di lahan kosong
        for x in range(4, W - 4):
            c = (x, y)
            if not bebas(c) or (x, y - 1) in jalan or (x, y + 1) in jalan:
                continue
            r = acak.random()
            rimbun = max(0, math.sin(x * .19 + 1.3) * math.cos(y * .23 - .7) + math.sin((x + y) * .11))      # rumpun pohon
            if r < .015 + .07 * rimbun:
                p.halangi(x * T + 5, y * T + 10, 6, 6)
                p.pohon(x * T + 8 + acak.randint(-4, 4), y * T + 15 + acak.randint(-2, 1), acak.choice(("pohon-a", "pohon-b", "pohon-kecil", "pohon-a", "pohon-b", "pohon-gugur-b")))
            elif r < .03 + .09 * rimbun:
                p.thing(x, y, SEMAK[acak.randint(0, 1)])
    p.tulis("perumahan")


def toko_dalam():
    """Toko Mbak Tika: toko perabot. Ruang pamer di kiri dan kanan, meja kasir di tengah belakang dengan Mbak Tika di
    belakangnya (baris 4). Pembeli menyapa dari depan meja (baris 6): beli perabot, atau jual perabot yang tidak terpasang."""
    p = ruangan(14, 8, "zaitun", "ubin", 3, 7, "toko")
    for (nama, x, y) in (("lukisan", 2, 2), ("jendela-dinding", 5, 2), ("lukisan-hijau", 10, 2), ("jendela-dinding", 12, 2)):
        p.perabot(nama, x, y, padat=False, datar=True, dx=2)
    # meja kasir; Mbak Tika berdiri di belakangnya (js/config.js, ruang "toko")
    p.perabot("meja-resepsionis", 6, 5)
    p.door("kasir", "Kasir", 7, 5, "panel", "sapa", zone=(6 * T, 6 * T, 3 * T, T), label=False, penghuni="Mbak Tika")
    p.perabot("tanaman-besar", 9, 4, dx=1)
    # ruang pamer kiri: rak dan lemari di dinding, sofa dan meja, kasir contoh di depan
    p.perabot("rak-buku-lebar", 1, 4, dx=6)
    p.perabot("lemari", 4, 4, dx=4)
    p.perabot("sofa", 1, 6)
    p.perabot("meja-bundar", 3, 6)
    p.perabot("kasur", 1, 8, dx=4)
    p.perabot("karpet", 3, 8, padat=False, datar=True)
    # ruang pamer kanan
    p.perabot("kulkas", 10, 4, dx=1)
    p.perabot("jam-besar", 11, 4, dx=2)
    p.perabot("rak-buku", 12, 4, dx=4)
    p.perabot("meja-kerja", 10, 6)
    p.perabot("kursi", 12, 6, dx=2)
    p.perabot("lampu-lantai", 14, 6, dx=4)
    p.perabot("konter-kopi", 11, 8)
    p.perabot("dispenser", 13, 8, dx=3)
    p.perabot("tanaman", 14, 8, dx=2)
    p.tulis("toko")


def rumah_dalam():
    """Dalam rumah warga (satu peta untuk semua rumah; pemilik dan perabotnya diatur js/perumahan.js dan js/tata.js).
    Perabot tidak digambar di peta: pemilik menatanya sendiri dan datanya disimpan di CodeIn News (services/rumahku.py).
    Lantai x 1-12, y 4-8; lukisan dan jendela digantung di baris 2. Ukuran dan petak cadangan ini harus sama dengan
    LANTAI_X, LANTAI_Y, DINDING_Y, CADANGAN di services/rumahku.py."""
    p = ruangan(12, 8, "krem", "kayu", 3, 6, "", keluar_peta="perumahan")
    # gantungan kunci di dinding: pemilik mengunci atau membuka pintu rumahnya dari sini (js/perumahan.js)
    p.perabot("gantungan-kunci", 9, 2, padat=False, datar=True, dx=9, dy=-3)
    p.door("kunci", "Gantungan kunci", 9, 3, "panel", "kunci-rumah", zone=(9 * T, 4 * T, 2 * T, T), label=False)
    p.tulis("rumah")


kota()
markas()
galeri()
redaksi()
perumahan()
rumah_dalam()
toko_dalam()

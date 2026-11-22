"""Pembuat peta CodeIn City -> assets/maps/kota.tmj, markas.tmj, galeri.tmj, redaksi.tmj (format Tiled JSON).

PERHATIAN: skrip ini menulis ulang ketiga peta dari nol. Setelah peta diubah lewat aplikasi Tiled,
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
                             "tilewidth": T, "tileheight": T, "margin": 1, "spacing": 2, "columns": 8, "tilecount": 8 * ((len(RUANG) + 7) // 8)}]}
        out = Path(__file__).resolve().parent.parent / "assets" / "maps" / f"{nama}.tmj"
        out.write_text(json.dumps(tmj, separators=(",", ":")))
        print(f"{out.name}: {self.W}x{self.H} tile, {len(self.doors)} pintu, {len(self.boards)} papan, {len(self.routes)} rute, {len(self.lamps)} lampu")


# =====================================================================================================
#  KOTA (80 x 64)
#  utara  : baliho, CodeIn News, videotron, Galeri Showcase, gedung terkunci
#  tengah : jalan utama (gerbang barat <-> timur), alun-alun dengan air mancur dan patung, Papan Pengumuman, pojok pasar
#  selatan: Markas CodeIn, Warkop (belum buka), toko, taman baliho, lalu kampung warga sampai gerbang selatan
# =====================================================================================================
def kota():
    p = Peta(80, 64)
    W, H = p.W, p.H
    for y in range(H):
        for x in range(W):
            p.put("tanah", x, y, RUMPUT)

    # ---------- jalan aspal ----------
    roads = [(0, 13, 79, 15, "h"),      # jalan utama: gerbang barat -> gerbang timur
             (4, 34, 75, 36, "h"),      # jalan selatan
             (4, 13, 6, 36, "v"), (73, 13, 75, 36, "v"),     # jalan lingkar barat dan timur
             (38, 37, 40, 63, "v"),     # jalan kampung -> gerbang selatan
             (8, 48, 71, 50, "h")]      # gang kampung
    asphalt = set().union(*(cells(x0, y0, x1, y1) for (x0, y0, x1, y1, _) in roads))
    for (x, y) in asphalt:
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
    for (cx, cy) in ((21, 13), (39, 13), (36, 34)):    # zebra cross: depan CodeIn News, depan Galeri, jalan selatan (ke kampung)
        for i, idx in enumerate((405, 432, 459)):
            p.put("tanah", cx, cy + i, idx)

    # ---------- trotoar, alun-alun, pelataran ----------
    sidewalk = (cells(2, 11, 77, 12) | cells(7, 16, 72, 16) | cells(7, 16, 7, 33) | cells(72, 16, 72, 33) | cells(7, 33, 72, 33)
                | cells(4, 37, 75, 37)
                | cells(37, 38, 37, 61) | cells(41, 38, 41, 61)          # kiri-kanan jalan kampung
                | cells(8, 47, 71, 47) | cells(8, 51, 71, 51)            # kiri-kanan gang
                | cells(8, 59, 71, 59)                                    # setapak depan rumah baris selatan
                | cells(39, 25, 40, 32)                                   # alun-alun -> jalan selatan
                | cells(8, 20, 9, 21) | cells(21, 20, 23, 21)             # ke Papan Pengumuman
                | cells(56, 20, 71, 21)) - asphalt                        # alun-alun -> pojok pasar -> trotoar timur
    p.ubin(sidewalk, BATU)
    p.ubin(cells(24, 17, 55, 24), KREM)        # alun-alun
    p.ubin(cells(10, 17, 20, 23), ABU_KREM)    # pelataran Papan Pengumuman
    p.ubin(cells(35, 18, 44, 23), BATU)        # pelataran batu di sekeliling air mancur

    # ---------- air mancur dan alas patung ----------
    pool, base = cells(37, 19, 42, 22), cells(39, 20, 40, 21)
    p.autotile("jalan", pool, AIR)
    p.autotile("bangunan", base, BATU)
    for c in pool:
        p.block(*c)
    p.obj(p.points, "patung", 40 * T, 21 * T + 6, jenis="pemula")
    for (x, y) in ((38, 19), (41, 19), (38, 22), (41, 22)):
        p.obj(p.points, "pancuran", x * T + 8, y * T + 8)
    p.door("patung", "Patung Si Pemula", 39, 17, "panel", zone=(37 * T, 23 * T, 6 * T, T), label_x=40 * T, label_y=19 * T + 2)

    # ---------- bangunan utara ----------
    # Gedung ikonik digambar tools/buat_gedung.py; tapaknya sama dengan gedung ubin sebelumnya, pintunya di kolom yang sama.
    atas = p.landmark("gedung-news", 16, 5, 11)                 # CodeIn News: menara radio, parabola, papan ticker
    tx, ty, tw, th = INFO["gedung-news"]["ticker"]
    p.obj(p.points, "ticker", 16 * T + tx, atas + ty, lebar=tw, tinggi=th)
    p.landmark("gedung-galeri", 35, 5, 9)                       # Galeri Showcase: kubah kaca
    p.landmark("rumah-proyek", 60, 5, 7)                        # rumah proyek 1
    # ---------- bangunan selatan alun-alun ----------
    atas = p.landmark("gedung-markas", 9, 27, 9)                # Markas CodeIn: menara berpelana, papan </>, bendera berkibar
    p.sprite("bendera-0", 9 * T + 74, atas + 11, bingkai=2, laju=420)
    p.landmark("warkop", 20, 27, 7)                             # Warkop CodeIn (belum buka)
    p.landmark("gedung-aetheria", 29, 27, 7)                    # rumah proyek 2: menara observatorium
    p.landmark("gedung-toko", 43, 27, 7)                        # Toko Mbak Tika: ruko bertenda

    p.door("news", "CodeIn News", 21, 10, "masuk", "redaksi")
    p.door("galeri", "Galeri Showcase", 39, 10, "masuk", "galeri")
    p.door("markas", "Markas CodeIn", 13, 32, "masuk", "markas")
    p.door("warkop", "Warkop CodeIn", 23, 32, "panel", "kunci")
    # rumah proyek anggota (CodeIn Rumah): nama dan isinya diambil dari CodeIn News saat kota dibuka (js/rumah.js)
    p.door("proyek-1", "Gedung kosong", 63, 10, "panel", "proyek")
    p.door("proyek-2", "Gedung kosong", 32, 32, "panel", "proyek")
    p.door("toko", "Toko Mbak Tika", 46, 32, "panel")

    # ---------- papan dunia ----------
    # Nomor baliho = nomor slot billboard di CodeIn News (1 sampai 6). Papan 5 x 4 tile di atas tiang setinggi 1 tile.
    p.board("videotron", "videotron", 28, 6, 6, 4, 11, name="Videotron Sedang Ramai")       # di antara CodeIn News dan Galeri
    for (n, x0, y0, ground) in ((1, 3, 6, 11), (2, 9, 6, 11), (3, 46, 6, 11), (4, 52, 6, 11),     # jalan utama
                                (5, 54, 28, 33), (6, 62, 28, 33)):                              # taman baliho selatan
        p.board("baliho", f"baliho-{n}", x0, y0, 5, 4, ground, order=n, name="Baliho")
    p.board("pengumuman", "papan", 12, 18, 7, 3, 22, name="Papan Pengumuman", zone=False)
    p.door("papan", "Papan Pengumuman", 15, 16, "panel", zone=(12 * T, 22 * T, 7 * T, T), label=False)

    # ---------- rumah warga (kampung) ----------
    penghuni = {(41, 9): "Bu Sari", (41, 17): "Bang Jo", (41, 25): "Dika", (41, 44): "Pak Harun", (41, 52): "Mbak Tika", (41, 60): "Kak Rani",
                (53, 9): "Kak Mita", (53, 17): "Nek Ijah", (53, 44): "Om Budi", (53, 52): "Rafi dan Lia"}
    n = 0
    for y0 in (41, 53):
        for x0 in (9, 17, 25, 44, 52, 60):
            n += 1
            p.landmark(f"rumah-{(n - 1) % 6}", x0, y0, 6)
            siapa = penghuni.get((y0, x0))
            if siapa:
                p.door(f"rumah-{n}", f"Rumah {siapa}", x0 + 2, y0 + 5, "panel", "rumah", penghuni=siapa)
            else:                                                                           # rumah tanpa warga = rumah proyek
                p.door("proyek-3" if x0 < 38 else "proyek-4", "Rumah kosong", x0 + 2, y0 + 5, "panel", "proyek")
            p.thing(x0 + 5, y0 + 6 if y0 == 53 else y0 + 10, 305 if n % 2 else 306)       # kotak surat di seberang trotoar
    for x in (8, 15, 16, 23, 24, 31, 43, 50, 51, 58, 59, 66):                              # pagar kayu di sela rumah
        for y in (46, 58):
            p.thing(x, y, 383)

    # ---------- pagar tanaman, lampu, bangku ----------
    for x in range(8, 72):                     # pagar tanaman antara alun-alun dan gedung selatan
        if x not in (39, 40):
            p.thing(x, 26, 329 if x % 5 else 331)
    for (x, y) in ((25, 17), (54, 17), (25, 24), (54, 24), (33, 24), (46, 24), (10, 17), (20, 17), (57, 23), (70, 23),
                   (14, 12), (27, 12), (34, 12), (44, 12), (58, 12), (67, 12), (8, 33), (19, 33), (28, 33), (36, 33), (42, 33), (51, 33), (60, 33), (70, 33),
                   (11, 51), (20, 51), (33, 51), (47, 51), (55, 51), (68, 51), (20, 59), (34, 59), (48, 59), (68, 59), (36, 37), (42, 37), (36, 61), (42, 61)):
        p.lamp(x, y)
    for (x, y) in ((30, 17), (49, 17), (30, 24), (49, 24), (35, 20), (35, 21), (44, 20), (44, 21), (11, 23), (19, 23), (68, 30), (60, 31)):
        p.thing(x, y, 250)                     # bangku
    for (x, y, k) in ((27, 17, "P"), (52, 17, "P"), (27, 24, "Q"), (52, 24, "Q"),
                      (11, 19, "B"), (19, 19, "B"), (10, 24, "A"), (20, 24, "O"), (15, 24, "B"),
                      (70, 24, "B"),
                      (52, 29, "B"), (68, 28, "A"), (69, 31, "B"), (38, 28, "B"), (41, 28, "B"),
                      (14, 8, "B"), (44, 8, "B"), (68, 7, "O"), (71, 9, "A")):
        p.tree(x, y, k)
    # pasar di timur alun-alun: lapak bertenda di kiri-kanan setapak (gambar di tools/gambar_benda.py).
    # Pedagangnya (js/config.js) berdiri di ruang terbuka di bawah tenda; lapak digambar sedikit di depan mereka.
    for (nama, x, y) in (("lapak-sayur", 58, 19), ("lapak-buah", 60, 19), ("lapak-ikan", 67, 19), ("lapak-kain", 69, 19),
                         ("lapak-jamu", 58, 23), ("lapak-kue", 61, 23), ("lapak-mainan", 64, 23), ("lapak-kelapa", 67, 23)):
        p.perabot(nama, x, y, geser=8, dy=4)
    for (x, y, idx) in ((62, 19, 276), (66, 19, 273), (60, 23, 301), (63, 23, 275), (66, 23, 302), (69, 23, 277)):
        p.thing(x, y, idx)
    # perabot jalan
    for (x, y, idx) in ((24, 12, 306), (13, 12, 280), (45, 12, 280), (35, 12, 278), (18, 33, 280), (37, 33, 306), (50, 33, 280),
                        (59, 9, 307), (67, 9, 307)):
        p.thing(x, y, idx, solid=idx != 307)
    # mobil parkir (baris atas mobil di layer "atas" supaya karakter bisa lewat di belakangnya)
    for (x, y, tiles) in ((69, 49, (447, 448, 474, 475)), (10, 49, (393, 394, 420, 421))):
        p.put("atas", x, y - 1, tiles[0])
        p.put("atas", x + 1, y - 1, tiles[1])
        p.thing(x, y, tiles[2])
        p.thing(x + 1, y, tiles[3])

    # ---------- gerbang ----------
    # Pengunjung tidak bisa keluar kota (tepi peta), tetapi kendaraan masuk dan keluar lewat sini.
    p.door("gerbang-barat", "Gerbang Barat", 1, 12, "panel", "gerbang", zone=(0, 13 * T, 2 * T, 3 * T), label_y=12 * T)
    p.door("gerbang-timur", "Gerbang Timur", 78, 12, "panel", "gerbang", zone=(78 * T, 13 * T, 2 * T, 3 * T), label_y=12 * T)
    p.door("gerbang-selatan", "Gerbang Selatan", 39, 61, "panel", "gerbang", zone=(38 * T, 62 * T, 3 * T, 2 * T), label_y=61 * T)
    for (x, y) in ((2, 12), (2, 16), (77, 12), (77, 16), (37, 62), (41, 62)):
        p.thing(x, y, 221)                     # palang merah-putih di kiri-kanan gerbang
    # ---------- properti kota dari paket CodeIn City Retro, digambar ulang bergaya Kenney (tools/gambar_benda.py) ----------
    p.perabot("pos-ronda", 74, 10)               # pos ronda Pak Harun di dekat Gerbang Timur
    p.perabot("halte", 57, 10)                   # halte di trotoar utara, di antara baliho 4 dan rumah proyek 1
    p.perabot("gerobak", 63, 19)                 # gerobak bakso Mas Bakso di pojok pasar
    p.perabot("meja-warkop", 18, 31)             # meja kopi di samping Warkop
    for x in (36, 43):                           # palem di kiri-kanan air mancur
        p.perabot("palem", x, 17, dx=-8)
    p.perabot("lampu-merah", 41, 33, dx=3)        # lampu lalu lintas di simpang ke kampung
    p.perabot("beringin", 31, 45, dx=4)          # beringin tua di ujung kampung barat
    p.perabot("net-badminton", 67, 42)           # lapangan badminton kampung: Rafi dan Lia main di sini sore hari

    # ---------- hutan tepi kota dan pohon pengisi ----------
    # Hutan = pohon Kenney utuh yang ditaruh agak acak dan saling menumpuk (diurutkan menurut batangnya),
    # tebalnya berubah-ubah 2-4 ubin, sesekali rumpun tiga pohon, dan sedikit pohon gugur. Petaknya tetap ditutup.
    acak = random.Random(11)
    gates = cells(0, 12, 2, 16) | cells(77, 12, 79, 16) | cells(37, 61, 41, 63)
    dekat_gedung = cells(14, 0, 28, 4) | cells(33, 0, 45, 4)          # di atas menara CodeIn News dan kubah Galeri
    def tebal(t, fase):
        return 2 + (math.sin(t * .23 + fase) + math.sin(t * .51 + fase * 2) > .4) + (math.sin(t * .17 + fase * 3) > .75)
    hutan = set()
    for x in range(W):
        hutan |= {(x, y) for y in range(0, min(tebal(x, 0), 2 if (x, 2) in dekat_gedung else 4))}
        hutan |= {(x, y) for y in range(H - tebal(x, 1), H)}
    for y in range(H):
        hutan |= {(x, y) for x in range(0, tebal(y, 2))}
        hutan |= {(x, y) for x in range(W - tebal(y, 3), W)}
    hutan = {c for c in hutan if c not in gates and c not in p.lantai and c not in p.keras}
    def jenis():
        r = acak.random()
        return ("pohon-a" if r < .4 else "pohon-b" if r < .64 else "pohon-kecil" if r < .78 else "rumpun" if r < .92
                else "pohon-gugur-a" if r < .96 else "pohon-gugur-b" if r < .99 else "rumpun-gugur")
    # petak hutan tepat di bawah trotoar dibiarkan berumput: pohonnya akan menutupi trotoar
    hutan = {(x, y) for (x, y) in hutan if (x, y - 1) not in p.lantai}
    for (x, y) in sorted(hutan, key=lambda c: (c[1], c[0])):
        p.block(x, y)
        for _ in range(2 if acak.random() < .3 else 1):
            nama = jenis()
            if (x, y - 2) in p.lantai:                    # dua petak dari trotoar: cukup pohon pendek
                nama = "pohon-kecil"
            p.pohon(x * T + 8 + acak.randint(-5, 5), y * T + 15 + acak.randint(-2 if (x, y - 2) in p.lantai else -4, 2), nama)
    # pohon pengisi di sela gedung dan rumah: satu-satu, sesekali rumpun, letaknya digeser sedikit supaya tidak berbaris
    isian = ((cells(2, 2, 77, 4), .4), (cells(2, 17, 3, 33), .5), (cells(76, 17, 77, 33), .5), (cells(2, 38, 6, 61), .45), (cells(73, 38, 77, 61), .45),
             (cells(8, 38, 71, 39), .28), (cells(8, 60, 71, 61), .35), (cells(8, 53, 71, 55), .12))
    for area, peluang in isian:
        for (x, y) in sorted(area - hutan - dekat_gedung, key=lambda c: (c[1], c[0])):
            bebas = (x, y) not in p.keras and (x, y) not in p.lantai and (x, y - 1) not in p.lantai and (x, y + 1) not in p.lantai
            if bebas and acak.random() < peluang:
                p.halangi(x * T + 5, y * T + 10, 6, 6)    # batangnya saja
                nama = jenis()
                p.pohon(x * T + 8 + acak.randint(-3, 3), y * T + 15 + acak.randint(-2, 1), nama.replace("rumpun-gugur", "pohon-gugur-a").replace("rumpun", "pohon-a"))

    # ---------- titik mulai dan rute kendaraan ----------
    p.obj(p.points, "mulai", 40 * T, 24 * T + 8)
    # Lalu lintas kiri: ke timur lewat lajur utara, ke barat lewat lajur selatan; ke selatan lewat lajur timur.
    # y = tepi bawah bodi kendaraan di tiap lajur (gambar kendaraan lebih tinggi dari satu lajur)
    U1, S1, U2, S2 = 13 * T + 24, 16 * T - 1, 34 * T + 24, 37 * T - 1
    luar_b, luar_t, luar_s = -3 * T, (W + 3) * T, (H + 3) * T
    p.route("barat-timur", [(luar_b, U1), (luar_t, U1)])
    p.route("timur-barat", [(luar_t, S1), (luar_b, S1)])
    p.route("selatan-timur", [(38 * T + 8, luar_s), (38 * T + 8, U2), (73 * T + 8, U2), (73 * T + 8, U1), (luar_t, U1)])
    p.route("barat-selatan", [(luar_b, U1), (6 * T + 8, U1), (6 * T + 8, U2), (40 * T + 8, U2), (40 * T + 8, luar_s)])
    p.route("timur-selatan", [(luar_t, S1), (75 * T + 8, S1), (75 * T + 8, S2), (40 * T + 8, S2), (40 * T + 8, luar_s)])
    p.tulis("kota")


# =====================================================================================================
#  INTERIOR: ruangan dikelilingi kehampaan (petak kosong), dinding di utara, pintu keluar di selatan
# =====================================================================================================
def ruangan(w, h, tema, lantai, tinggi_dinding, pintu_x, keluar_ke):
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
    p.door("keluar", "Pintu keluar", pintu_x, h, "keluar", "kota", zone=(pintu_x * T, (h + 1) * T, 2 * T, T), label=False, ke=keluar_ke)
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


kota()
markas()
galeri()
redaksi()

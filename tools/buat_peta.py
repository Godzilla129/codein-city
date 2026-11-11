"""Pembuat peta CodeIn City -> assets/maps/kota.tmj, markas.tmj, galeri.tmj (format Tiled JSON).

PERHATIAN: skrip ini menulis ulang ketiga peta dari nol. Setelah peta diubah lewat aplikasi Tiled,
JANGAN jalankan skrip ini lagi (perubahan di Tiled akan hilang). Skrip disimpan sebagai dokumentasi
cara peta disusun, dan untuk membuat peta baru dari awal.

Jalankan dari folder proyek:  python3 tools/buat_peta.py
Nomor tile = urutan di assets/tiles/urban.png (27 kolom), dihitung dari 0.
"""
import json
import random
from pathlib import Path

T, COLS = 16, 27
LAYERS = ["tanah", "jalan", "bangunan", "hiasan", "atas", "tabrakan"]
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

    # ----- ubin -----
    def put(self, layer, x, y, idx):
        if 0 <= x < self.W and 0 <= y < self.H:
            self.L[layer][y * self.W + x] = idx + 1

    def block(self, x, y):
        self.put("tabrakan", x, y, BLOCK)
        self.keras.add((x, y))

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
        self.block(x, y)

    def lamp(self, x, y):
        self.put("hiasan", x, y, 196)
        self.put("atas", x, y - 1, 169)
        self.block(x, y)
        self.lamps.append((x, y - 1))

    def thing(self, x, y, idx, solid=True):
        self.put("hiasan", x, y, idx)
        if solid:
            self.block(x, y)

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
        for c in cells(x0, y0, x0 + w - 1, y0 + h - 1):
            self.block(*c)
        for y in range(y0 + h, ground):
            self.block(x0, y)
            self.block(x0 + w - 1, y)
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
        lx, ly = extra.pop("label_x", int((dx + .5) * T)), extra.pop("label_y", int((dy - 1) * T + 4))
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
                        "opacity": .45 if n == "tabrakan" else 1, "visible": True, "data": self.L[n]} for i, n in enumerate(LAYERS)]
        groups = (("pintu", self.doors), ("titik", self.points), ("papan", papan), ("rute", self.routes))
        obj_layers = [{"id": len(LAYERS) + 1 + i, "name": n, "type": "objectgroup", "draworder": "topdown", "x": 0, "y": 0,
                       "opacity": 1, "visible": True, "objects": o} for i, (n, o) in enumerate(groups)]
        tmj = {"type": "map", "version": "1.10", "tiledversion": "1.11.0", "orientation": "orthogonal", "renderorder": "right-down",
               "infinite": False, "width": self.W, "height": self.H, "tilewidth": T, "tileheight": T, "compressionlevel": -1,
               "nextlayerid": len(LAYERS) + len(groups) + 1, "nextobjectid": self.oid + 1, "layers": tile_layers + obj_layers,
               "tilesets": [{"firstgid": 1, "name": "urban", "image": "../tiles/urban.png", "imagewidth": 486, "imageheight": 324,
                             "tilewidth": T, "tileheight": T, "margin": 1, "spacing": 2, "columns": COLS, "tilecount": 486}]}
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
    for cx in (21, 39):                       # zebra cross di depan CodeIn News dan Galeri
        for i, idx in enumerate((405, 432, 459)):
            p.put("tanah", cx, 13 + i, idx)

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
    p.obj(p.points, "patung", 40 * T, 21 * T + 6)
    for (x, y) in ((38, 19), (41, 19), (38, 22), (41, 22)):
        p.obj(p.points, "pancuran", x * T + 8, y * T + 8)
    p.door("patung", "Patung Si Pemula", 39, 17, "panel", zone=(37 * T, 23 * T, 6 * T, T), label_x=40 * T, label_y=19 * T + 2)

    # ---------- bangunan utara ----------
    p.building(16, 5, 11, "oranye", KREM, 21, 284, [(17, *ARCH), (19, *ARCH), (23, *ARCH), (25, *ARCH)])        # CodeIn News
    p.building(35, 5, 9, BATU, ABU_KREM, 39, 285, [(36, *ARCH_L), (37, *ARCH_L), (41, *ARCH_L), (42, *ARCH_L)])  # Galeri Showcase
    for (x, y, idx) in ((38, 6, 11), (39, 6, 12), (38, 7, 38), (39, 7, 39)):   # jendela atap galeri
        p.put("bangunan", x, y, idx)
    p.building(60, 5, 7, KREM, ABU_KREM, 63, 339, [(61, 416, None), (65, 416, None)])                            # gedung terkunci
    # ---------- bangunan selatan alun-alun ----------
    p.building(9, 27, 9, "merah", KREM, 13, 283, [(10, *ARCH), (11, None, 362), (15, None, 362), (16, *ARCH)])   # Markas CodeIn
    p.building(20, 27, 7, KREM, ABU_KREM, 23, 339, [(21, 416, None), (25, 416, None)])                           # Warkop CodeIn (belum buka)
    p.building(29, 27, 7, "merah", KREM, 32, 339, [(30, 335, None), (34, 335, None)])                            # gedung terkunci
    p.building(43, 27, 7, "oranye", ABU_KREM, 46, 285, [(44, *ARCH_L), (48, *ARCH_L)])                           # Toko Mbak Tika

    p.door("news", "CodeIn News", 21, 10, "pindah", "https://news.codeinhub.my.id/")
    p.door("galeri", "Galeri Showcase", 39, 10, "masuk", "galeri")
    p.door("markas", "Markas CodeIn", 13, 32, "masuk", "markas")
    p.door("warkop", "Warkop CodeIn", 23, 32, "panel", "kunci")
    p.door("kunci-a", "Segera dibuka", 63, 10, "panel", "kunci")
    p.door("kunci-b", "Segera dibuka", 32, 32, "panel", "kunci")
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
    gaya = (("merah", KREM, 283), ("oranye", ABU_KREM, 284), (BATU, KREM, 283), ("oranye", KREM, 284), ("merah", ABU_KREM, 283), (KREM, ABU_KREM, 284))
    penghuni = {(41, 9): "Bu Sari", (41, 17): "Bang Jo", (41, 25): "Dika", (41, 44): "Pak Harun", (41, 52): "Mbak Tika", (41, 60): "Kak Rani",
                (53, 9): "Kak Mita", (53, 17): "Nek Ijah", (53, 44): "Om Budi", (53, 52): "Rafi dan Lia"}
    n = 0
    for y0 in (41, 53):
        for x0 in (9, 17, 25, 44, 52, 60):
            roof, wall, door_idx = gaya[n % len(gaya)]
            n += 1
            win = ARCH if wall == KREM else ARCH_L
            p.building(x0, y0, 6, roof, wall, x0 + 2, door_idx, [(x0 + 4, *win)])
            siapa = penghuni.get((y0, x0))
            if siapa:
                p.door(f"rumah-{n}", f"Rumah {siapa}", x0 + 2, y0 + 5, "panel", "rumah", penghuni=siapa)
            p.thing(x0 + 5, y0 + 6 if y0 == 53 else y0 + 10, 305 if n % 2 else 306)       # kotak surat di seberang trotoar
    for x in (8, 15, 16, 23, 24, 31, 43, 50, 51, 58, 59, 66):                              # pagar kayu di sela rumah
        for y in (46, 58):
            p.thing(x, y, 383)

    # ---------- pagar tanaman, lampu, bangku ----------
    for x in range(8, 72):                     # pagar tanaman antara alun-alun dan gedung selatan
        if x not in (39, 40):
            p.thing(x, 26, 329 if x % 5 else 331)
    for (x, y) in ((25, 17), (54, 17), (25, 24), (54, 24), (33, 24), (46, 24), (10, 17), (20, 17), (57, 19), (70, 19),
                   (14, 12), (27, 12), (34, 12), (44, 12), (58, 12), (67, 12), (8, 33), (19, 33), (28, 33), (36, 33), (42, 33), (51, 33), (60, 33), (70, 33),
                   (11, 51), (20, 51), (33, 51), (47, 51), (55, 51), (68, 51), (20, 59), (34, 59), (48, 59), (68, 59), (36, 37), (42, 37), (36, 61), (42, 61)):
        p.lamp(x, y)
    for (x, y) in ((30, 17), (49, 17), (30, 24), (49, 24), (35, 20), (35, 21), (44, 20), (44, 21), (11, 23), (19, 23), (60, 31), (68, 30)):
        p.thing(x, y, 250)                     # bangku
    for (x, y, k) in ((27, 17, "P"), (52, 17, "P"), (27, 24, "Q"), (52, 24, "Q"), (36, 17, "Q"), (43, 17, "Q"),
                      (11, 19, "B"), (19, 19, "B"), (10, 24, "A"), (20, 24, "O"), (15, 24, "B"),
                      (58, 17, "B"), (70, 17, "A"), (58, 24, "A"), (64, 24, "O"), (70, 24, "B"),
                      (52, 29, "B"), (60, 28, "O"), (68, 28, "A"), (69, 31, "B"), (38, 28, "B"), (41, 28, "B"),
                      (14, 8, "B"), (44, 8, "B"), (58, 8, "A"), (68, 7, "O"), (71, 9, "A"), (74, 7, "B")):
        p.tree(x, y, k)
    # pojok pasar di timur alun-alun: lapak di utara dan selatan setapak
    for (x, y, idx) in ((60, 19, 276), (61, 19, 277), (63, 19, 303), (64, 19, 304), (67, 19, 273),
                        (60, 22, 301), (61, 22, 302), (64, 22, 275), (67, 22, 276), (68, 22, 277)):
        p.thing(x, y, idx)
    # perabot jalan
    for (x, y, idx) in ((24, 12, 306), (13, 12, 280), (45, 12, 280), (35, 12, 278), (18, 33, 280), (37, 33, 306), (50, 33, 280),
                        (26, 31, 307), (35, 31, 307), (59, 9, 307), (67, 9, 307)):
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
    p.thing(76, 11, 334)                       # pos satpam

    # ---------- hutan tepi kota dan pohon pengisi ----------
    gates = cells(0, 13, 1, 15) | cells(78, 13, 79, 15) | cells(38, 62, 40, 63)
    border = (cells(0, 0, W - 1, 1) | cells(0, H - 2, W - 1, H - 1) | cells(0, 0, 1, H - 1) | cells(W - 2, 0, W - 1, H - 1)) - gates
    for (x, y) in sorted(border, key=lambda c: (c[1], c[0])):
        p.put("hiasan", x, y, 259)
        p.put("atas", x, y - 1, 232)
        p.block(x, y)
    isian = ((cells(2, 2, 77, 3), .5), (cells(2, 17, 3, 33), .5), (cells(76, 17, 77, 33), .5), (cells(2, 38, 6, 61), .4), (cells(73, 38, 77, 61), .4),
             (cells(8, 38, 71, 39), .28), (cells(8, 60, 71, 61), .35), (cells(8, 53, 71, 55), .12), (cells(32, 41, 35, 45), .3), (cells(67, 41, 71, 45), .3))
    for area, peluang in isian:
        for (x, y) in sorted(area, key=lambda c: (c[1], c[0])):
            bebas = (x, y) not in p.keras and (x, y) not in p.lantai and (x, y - 1) not in p.lantai
            if bebas and p.rnd.random() < peluang:
                p.tree(x, y, p.rnd.choice("AABO"))

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
def ruangan(w, h, dinding, tinggi_dinding, lantai, pintu_x, keluar_ke):
    """Ruangan selebar w dan setinggi h tile (di dalam peta w+2 x h+2). Mengembalikan Peta dengan dinding, lantai, dan pintu keluar."""
    p = Peta(w + 2, h + 3)
    x0, x1, y0 = 1, w, 1
    for x in range(x0, x1 + 1):
        side = 0 if x == x0 else 2 if x == x1 else 1
        for r in range(tinggi_dinding):
            baris = 0 if r == 0 else 54 if r == tinggi_dinding - 1 else 27
            p.put("bangunan", x, y0 + r, dinding + baris + side)
    lantai_area = cells(x0, y0 + tinggi_dinding, x1, h)
    p.ubin(lantai_area, lantai)
    keset = cells(pintu_x, h + 1, pintu_x + 1, h + 1)
    p.ubin(keset, BATU)
    for y in range(p.H):
        for x in range(p.W):
            if (x, y) not in lantai_area and (x, y) not in keset:
                p.block(x, y)
    p.door("keluar", "Pintu keluar", pintu_x, h, "keluar", "kota", zone=(pintu_x * T, (h + 1) * T, 2 * T, T), label=False, ke=keluar_ke)
    p.obj(p.points, "mulai", (pintu_x + 1) * T, h * T + 8)
    return p


def markas():
    p = ruangan(20, 11, ABU_KREM, 3, KREM, 10, "markas")
    # dua papan di dinding: tentang CodeIn dan rencana kota
    p.board("info", "tentang", 3, 1, 6, 3, 4, name="Tentang CodeIn")
    p.board("info", "rencana", 13, 1, 6, 3, 4, name="Rencana kota")
    # meja rapat dengan bangku di kiri-kanannya
    for x in range(8, 14):
        p.thing(x, 7, 275)
    for x in (8, 10, 12):
        p.thing(x, 6, 381)
        p.thing(x + 1, 8, 381)
    for (x, y, idx) in ((1, 5, 303), (1, 6, 304), (1, 7, 303), (20, 5, 304), (20, 6, 303), (20, 7, 300)):
        p.thing(x, y, idx)                     # rak di sisi ruangan
    for (x, y, k) in ((1, 10, "P"), (20, 10, "Q"), (10, 4, "Q"), (11, 4, "Q")):
        p.tree(x, y, k)
    p.thing(16, 10, 250)
    p.thing(4, 10, 250)
    p.tulis("markas")


def galeri():
    p = ruangan(37, 11, KREM, 5, BATU, 18, "galeri")
    # enam karya di dinding = enam slot baliho
    for n in range(6):
        p.board("baliho", f"baliho-{n + 1}", 2 + n * 6, 1, 5, 4, 6, order=n + 1, name="Karya")
    for x in (7, 13, 19, 25, 31):              # pot di antara karya
        p.tree(x, 6, "Q")
    for x in (4, 10, 16, 22, 28, 34):          # bangku untuk duduk memandang karya
        p.thing(x, 9, 250)
    p.thing(2, 10, 275)
    p.thing(3, 10, 275)                        # meja penjaga galeri
    for (x, y, k) in ((1, 6, "P"), (37, 6, "P"), (37, 11, "Q")):
        p.tree(x, y, k)
    p.tulis("galeri")


kota()
markas()
galeri()

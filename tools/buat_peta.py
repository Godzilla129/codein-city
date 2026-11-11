"""Pembuat peta AWAL CodeIn City -> assets/maps/kota.tmj (format Tiled JSON).

PERHATIAN: skrip ini menulis ulang kota.tmj dari nol. Setelah peta diubah lewat aplikasi Tiled,
JANGAN jalankan skrip ini lagi (perubahan di Tiled akan hilang). Skrip disimpan sebagai dokumentasi
cara peta pertama disusun, dan untuk membuat peta baru dari awal.

Jalankan dari folder proyek:  python3 tools/buat_peta.py
Nomor tile = urutan di assets/tiles/urban.png (27 kolom), dihitung dari 0.
"""
import json
import random
from pathlib import Path

W, H, T = 48, 36, 16
COLS = 27
LAYERS = ["tanah", "jalan", "bangunan", "hiasan", "atas", "tabrakan"]
L = {n: [0] * (W * H) for n in LAYERS}
BLOCK = 222           # tile penanda di layer "tabrakan" (pagar merah-putih, hanya terlihat di Tiled)
rnd = random.Random(7)


def put(layer, x, y, idx):
    if 0 <= x < W and 0 <= y < H:
        L[layer][y * W + x] = idx + 1


def block(x, y):
    put("tabrakan", x, y, BLOCK)


def cells(x0, y0, x1, y1):
    return {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}


def autotile(layer, area, base):
    """Pasang tile berbingkai (9 potong) mengikuti bentuk area. base = nomor tile pojok kiri atas."""
    for (x, y) in area:
        n, s, w, e = (x, y - 1) in area, (x, y + 1) in area, (x - 1, y) in area, (x + 1, y) in area
        if not n and not s:
            off = 60 if not w and not e else 57 if not w else 59 if not e else 58
        elif not w and not e:
            off = 7 if not n else 61 if not s else 34
        else:
            off = (0 if not n else 54 if not s else 27) + (0 if not w else 2 if not e else 1)
        put(layer, x, y, base + off)


# ---------- 1. tanah: rumput di mana-mana ----------
for y in range(H):
    for x in range(W):
        put("tanah", x, y, 28)

# ---------- 2. jalan aspal (cincin + keluar ke gerbang timur) ----------
PLAIN = [441, 468]
top_road, bottom_road = cells(2, 11, 45, 13), cells(2, 29, 47, 31)
left_road, right_road = cells(2, 11, 4, 31), cells(43, 11, 45, 31)
asphalt = top_road | bottom_road | left_road | right_road
for (x, y) in asphalt:
    in_h = (x, y) in top_road or (x, y) in bottom_road
    in_v = (x, y) in left_road or (x, y) in right_road
    idx = rnd.choice(PLAIN)
    if in_h and not in_v:
        row = (y - 11) if y <= 13 else (y - 29)
        idx = 406 if row == 0 else 460 if row == 2 else (433 if x % 2 == 0 else idx)
    elif in_v and not in_h:
        col = (x - 2) if x <= 4 else (x - 43)
        idx = 461 if col == 0 else 463 if col == 2 else (462 if y % 2 == 0 else idx)
    put("tanah", x, y, idx)
for cx in (17, 31):                       # zebra cross di depan CodeIn News dan Galeri
    for i, idx in enumerate((405, 432, 459)):
        put("tanah", cx, 11 + i, idx)

# ---------- 3. trotoar, alun-alun, jalan setapak ----------
sidewalk = (cells(2, 9, 45, 10) | cells(5, 14, 42, 14) | cells(5, 14, 5, 28) | cells(42, 14, 42, 28)
            | cells(5, 28, 42, 28) | cells(2, 32, 47, 32)
            | cells(23, 21, 24, 27)          # setapak alun-alun -> jalan bawah
            | cells(6, 17, 6, 18) | cells(12, 17, 13, 18)      # ke Papan Pengumuman
            | cells(34, 17, 41, 18))         # alun-alun -> trotoar kanan
autotile("tanah", sidewalk, 8)
plaza = cells(14, 15, 33, 20)
autotile("tanah", plaza, 81)
pad = cells(7, 16, 11, 19)                   # pelataran Papan Pengumuman
autotile("tanah", pad, 89)

# ---------- 4. air: air mancur alun-alun ----------
fountain = cells(22, 16, 25, 18)
for water in (fountain,):
    autotile("jalan", water, 170)
    for c in water:
        block(*c)


# ---------- 5. bangunan ----------
ROOF = {"oranye": (125, 152, 179, 206), "merah": (17, 44, 71, 98)}   # baris: atas, bubungan, tengah, bawah


def building(x0, y0, w, roof, wall, door, door_idx, windows=()):
    """Bangunan tinggi 6 tile: 4 baris atap + 2 baris dinding. door = kolom pintu (x). Semua tapaknya tabrakan."""
    x1 = x0 + w - 1
    if roof in ROOF:
        for r, base in enumerate(ROOF[roof]):
            for x in range(x0, x1 + 1):
                put("bangunan", x, y0 + r, base + (0 if x == x0 else 2 if x == x1 else 1))
    else:                                    # atap datar: roof = nomor tile dasar 9 potong
        autotile("bangunan", cells(x0, y0, x1, y0 + 3), roof)
    for x in range(x0, x1 + 1):
        side = 0 if x == x0 else 2 if x == x1 else 1
        put("bangunan", x, y0 + 4, wall + side)
        put("bangunan", x, y0 + 5, wall + 54 + side)
    put("bangunan", door, y0 + 5, door_idx)
    for (wx, top, bottom) in windows:
        if top is not None:
            put("hiasan", wx, y0 + 4, top)
        if bottom is not None:
            put("hiasan", wx, y0 + 5, bottom)
    for c in cells(x0, y0, x1, y0 + 5):
        block(*c)


TAN, GREY = 81, 89                            # dinding krem berbingkai ungu / abu berbingkai krem
ARCH, ARCH_L = (336, 363), (417, 444)         # jendela lengkung krem / lavender (atas, bawah)

# CodeIn News (utara, x 12..22)
building(12, 3, 11, "oranye", TAN, 17, 284,
         [(13, *ARCH), (15, *ARCH), (19, *ARCH), (21, *ARCH)])
# Galeri Showcase (utara, x 27..35), atap datar abu
building(27, 3, 9, 8, GREY, 31, 285,
         [(28, *ARCH_L), (29, *ARCH_L), (33, *ARCH_L), (34, *ARCH_L)])
for (x, y, idx) in ((30, 4, 11), (31, 4, 12), (30, 5, 38), (31, 5, 39)):   # jendela atap galeri
    put("bangunan", x, y, idx)
# Markas CodeIn (selatan, x 6..14)
building(6, 22, 9, "merah", TAN, 10, 283, [(7, *ARCH), (8, None, 362), (12, None, 362), (13, *ARCH)])
# Dua gedung terkunci
building(16, 22, 7, 81, GREY, 19, 339, [(17, 416, None), (21, 416, None)])
building(25, 22, 7, "merah", TAN, 28, 339, [(26, 335, None), (30, 335, None)])


# ---------- 6. pohon, lampu, perabot ----------
def tree(x, y, kind="A"):
    # A/B = pohon hijau tinggi/kecil, O = pohon oranye, P/Q = pohon dalam pot (untuk area berubin)
    top, bottom = {"A": (232, 259), "B": (233, 260), "O": (313, 340), "P": (232, 286), "Q": (233, 287)}[kind]
    put("hiasan", x, y, bottom)
    put("atas", x, y - 1, top)
    block(x, y)


lamps = []


def lamp(x, y):
    put("hiasan", x, y, 196)
    put("atas", x, y - 1, 169)
    block(x, y)
    lamps.append((x, y - 1))


def thing(x, y, idx, solid=True):
    put("hiasan", x, y, idx)
    if solid:
        block(x, y)


# hutan tepi kota
border = cells(0, 0, 47, 1) | cells(0, 34, 47, 35) | cells(0, 0, 1, 35) | (cells(46, 0, 47, 35) - cells(46, 29, 47, 32))
for (x, y) in sorted(border, key=lambda c: (c[1], c[0])):
    put("hiasan", x, y, 259)
    put("atas", x, y - 1, 232)
    block(x, y)
for x in range(2, 46):                        # pohon acak di baris paling utara dan selatan
    if rnd.random() < .45:
        tree(x, 2, rnd.choice("AAB"))
    if rnd.random() < .4 and x not in (23, 24):
        tree(x, 33, rnd.choice("ABO"))
# sela bangunan utara: dulu taman kecil, sekarang tempat baliho dan videotron (lihat bagian 7)
for (x, y, k) in ((7, 4, "B"), (41, 4, "B")):
    tree(x, y, k)

# ---------- papan dunia: videotron dan baliho ----------
# Papan digambar sebagai elemen HTML di atas kanvas (lihat js/papan.js). Di peta cukup ditandai: letak, ukuran, tiang.
# Nomor baliho = nomor slot billboard di CodeIn News (1 sampai 6).
boards = []


def board(kind, order, x0, y0, w, h, ground):
    """Papan selebar w tile, tinggi h tile, mulai dari (x0, y0). ground = baris trotoar di depannya (tempat membaca).
    Tapak papan tidak bisa dilewati; dua tiangnya turun sampai tepat di atas trotoar."""
    boards.append((kind, order, x0, y0, w, h, ground))
    for c in cells(x0, y0, x0 + w - 1, y0 + h - 1):
        block(*c)
    for y in range(y0 + h, ground):
        block(x0, y); block(x0 + w - 1, y)


board("videotron", 1, 23, 4, 4, 3, 9)       # di antara CodeIn News dan Galeri
board("baliho", 1, 2, 4, 4, 3, 9)           # jalan utama, sisi barat
board("baliho", 2, 8, 4, 4, 3, 9)
board("baliho", 3, 37, 4, 4, 3, 9)          # jalan utama, sisi timur
board("baliho", 4, 42, 4, 4, 3, 9)
board("baliho", 5, 33, 23, 4, 3, 28)        # taman selatan
board("baliho", 6, 38, 23, 4, 3, 28)
# pagar tanaman antara alun-alun dan gedung selatan (terbuka di jalan setapak)
for x in range(6, 42):
    if x not in (23, 24):
        thing(x, 21, 329 if x % 5 else 331)
# sekitar alun-alun
for (x, y) in ((15, 15), (32, 15), (15, 20), (32, 20), (21, 20), (26, 20), (7, 16), (11, 16)):
    lamp(x, y)
for (x, y) in ((19, 15), (28, 15), (19, 20), (28, 20)):
    thing(x, y, 250)                          # bangku
thing(9, 17, 334)                             # kios informasi = Papan Pengumuman
for (x, y, k) in ((7, 20, "A"), (11, 20, "B"), (9, 15, "O"), (17, 15, "P"), (30, 15, "P"), (17, 20, "Q"), (30, 20, "Q")):
    tree(x, y, k)
# pojok pasar di kanan alun-alun
for (x, y, idx) in ((36, 16, 276), (37, 16, 277), (39, 16, 303), (40, 16, 304), (36, 19, 301), (37, 19, 302), (40, 19, 275)):
    thing(x, y, idx)
for (x, y, k) in ((35, 20, "A"), (41, 20, "B"), (38, 20, "O"), (35, 15, "B"), (41, 15, "A")):
    tree(x, y, k)
# taman baliho (selatan kanan): dua baliho menghadap jalan selatan, bangku di antaranya
for (x, y, k) in ((32, 23, "B"), (35, 22, "A"), (40, 22, "A"), (37, 24, "O"), (32, 26, "B")):
    tree(x, y, k)
thing(37, 27, 250)
lamp(37, 22)
# perabot jalan
thing(23, 10, 306); thing(11, 10, 280); thing(36, 10, 280); thing(26, 10, 278)
thing(15, 28, 280); thing(32, 28, 306)
lamp(14, 10); lamp(20, 10); lamp(29, 10); lamp(33, 10); lamp(8, 28); lamp(21, 28); lamp(30, 28); lamp(40, 28)
thing(18, 27, 307, solid=False); thing(27, 27, 307, solid=False)        # kerucut di depan gedung terkunci
# mobil parkir (baris atas mobil di layer "atas" supaya karakter bisa lewat di belakangnya)
for (x, y, tiles) in ((7, 12, (393, 394, 420, 421)), (36, 30, (447, 448, 474, 475))):
    put("atas", x, y - 1, tiles[0]); put("atas", x + 1, y - 1, tiles[1])
    thing(x, y, tiles[2]); thing(x + 1, y, tiles[3])
# gerbang timur
for y in (29, 30, 31):
    thing(47, y, 222)

# ---------- 7. objek: pintu dan titik ----------
objects, oid = [], [0]


def obj(layer_list, name, x, y, w=0, h=0, **props):
    oid[0] += 1
    o = {"id": oid[0], "name": name, "type": "", "x": x, "y": y, "width": w, "height": h, "rotation": 0, "visible": True}
    if not w and not h:
        o["point"] = True
    if props:
        o["properties"] = [{"name": k, "type": "int" if isinstance(v, int) else "string", "value": v} for k, v in props.items()]
    layer_list.append(o)


doors, points = [], []


def door(ident, name, dx, dy, action, target="", zone=None, label=True):
    """Zona interaksi = satu baris di depan pintu, dilebarkan setengah tile kiri-kanan."""
    zx, zy, zw, zh = zone or ((dx - .5) * T, (dy + 1) * T, 2 * T, T)
    extra = {} if label else {"tanpa_label": 1}
    obj(doors, name, zx, zy, zw, zh, id=ident, aksi=action, tujuan=target,
        label_x=int((dx + .5) * T), label_y=int((dy - 1) * T + 4), **extra)


door("news", "CodeIn News", 17, 8, "pindah", "https://news.codeinhub.my.id/")
door("galeri", "Galeri Showcase", 31, 8, "panel")
door("markas", "Markas CodeIn", 10, 27, "panel")
door("kunci-a", "Segera dibuka", 19, 27, "panel", "kunci")
door("kunci-b", "Segera dibuka", 28, 27, "panel", "kunci")
door("papan", "Papan Pengumuman", 9, 17, "panel")
door("gerbang", "Gerbang Kota", 46, 30, "panel", zone=(45 * T, 29 * T, 2 * T, 3 * T))
# zona baca di trotoar depan setiap papan (nama papan tidak ditulis di atasnya: tanpa_label)
for (kind, order, x0, y0, w, h, ground) in boards:
    ident = "videotron" if kind == "videotron" else f"baliho-{order}"
    door(ident, "Videotron Sedang Ramai" if kind == "videotron" else "Baliho", x0, ground - 1, "panel", kind,
         zone=(x0 * T, ground * T, w * T, T), label=False)
obj(points, "mulai", 24 * T, 19 * T + 8)
papan = []          # layer objek "papan": kotak papan + nomor slot + panjang tiang (piksel)
for (kind, order, x0, y0, w, h, ground) in boards:
    obj(papan, kind, x0 * T, y0 * T, w * T, h * T, urutan=order, tiang=(ground - y0 - h) * T)
for (x, y) in lamps:
    obj(points, "lampu", x * T + 8, y * T + 8)

# ---------- 8. tulis berkas Tiled ----------
tile_layers = [{"id": i + 1, "name": n, "type": "tilelayer", "x": 0, "y": 0, "width": W, "height": H,
                "opacity": .45 if n == "tabrakan" else 1, "visible": True, "data": L[n]} for i, n in enumerate(LAYERS)]
obj_layers = [{"id": len(LAYERS) + 1 + i, "name": n, "type": "objectgroup", "draworder": "topdown", "x": 0, "y": 0,
               "opacity": 1, "visible": True, "objects": o} for i, (n, o) in enumerate((("pintu", doors), ("titik", points), ("papan", papan)))]
tmj = {"type": "map", "version": "1.10", "tiledversion": "1.11.0", "orientation": "orthogonal", "renderorder": "right-down",
       "infinite": False, "width": W, "height": H, "tilewidth": T, "tileheight": T, "compressionlevel": -1,
       "nextlayerid": len(LAYERS) + 4, "nextobjectid": oid[0] + 1, "layers": tile_layers + obj_layers,
       "tilesets": [{"firstgid": 1, "name": "urban", "image": "../tiles/urban.png", "imagewidth": 486, "imageheight": 324,
                     "tilewidth": T, "tileheight": T, "margin": 1, "spacing": 2, "columns": COLS, "tilecount": 486}]}
out = Path(__file__).resolve().parent.parent / "assets" / "maps" / "kota.tmj"
out.write_text(json.dumps(tmj, separators=(",", ":")))
print(f"{out} ditulis: {W}x{H} tile, {len(doors)} pintu, {len(lamps)} lampu")

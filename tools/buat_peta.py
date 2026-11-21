"""Pembuat peta CodeIn City -> assets/maps/kota.tmj, markas.tmj, galeri.tmj, redaksi.tmj (format Tiled JSON) dan assets/tiles/retro.png.

Jalankan dari folder proyek SESUDAH tools/buat_aset.py, dengan folder Assets yang sama:
    python3 tools/buat_aset.py "D:/CodeIn/CodeIn City/Assets"
    python3 tools/buat_peta.py "D:/CodeIn/CodeIn City/Assets"

PERHATIAN: skrip ini menulis ulang semua peta dari nol. Kalau peta diubah lewat aplikasi Tiled, jangan jalankan lagi.

Isi peta:
- layer ubin  : tanah (rumput, aspal, trotoar, lantai), bangunan (dinding ruangan), hiasan (benda kecil 1 ubin), atas, tabrakan.
  Ubinnya disusun di assets/tiles/retro.png dari tileset jalan "CodeIn City Retro" dan lantai/dinding "Top-Down Retro Interior" (Penzilla).
  Ubin trotoar disusun dari empat perempat ubin supaya tepinya selalu nyambung, termasuk trotoar selebar satu ubin.
- layer objek "benda": gambar dari atlas assets/sprites/benda.png (gedung, pohon, lampu, perabot). Titik objek = pojok kiri bawah gambar.
  Benda diurutkan menurut tepi bawahnya, jadi pengunjung bisa lewat di belakang pohon dan atap.
- layer objek pintu, titik, papan, rute: sama seperti sebelumnya (lihat js/kota.js).
"""
import json
import random
import sys
from pathlib import Path

from PIL import Image

if len(sys.argv) < 2:
    sys.exit("Pakai: python3 tools/buat_peta.py <folder Assets>")
SUMBER = Path(sys.argv[1])
PROYEK = Path(__file__).resolve().parent.parent
T = 16
LAYERS = ["tanah", "bangunan", "hiasan", "atas", "tabrakan"]

# ---------------------------------------------------------------------------------------------------
#  Tileset hasil susunan (retro.png). Ubin dibuat saat dipakai, jadi urutannya tetap selama peta tidak berubah.
# ---------------------------------------------------------------------------------------------------
class Ubin:
    KOLOM = 16

    def __init__(self):
        self.lembar = {"jalan": Image.open(SUMBER / "04_tilesets_roads_nature/road_master_tileset_retro_160x80.png").convert("RGBA"),
                       "alam": Image.open(SUMBER / "04_tilesets_roads_nature/road_curb_nature_retro_128x48.png").convert("RGBA"),
                       "ruang": Image.open(SUMBER / "House Asset/TopDownHouse_FloorsAndWalls.png").convert("RGBA")}
        self.gambar, self.kunci = [], {}
        self.blok = self.dari("jalan", 39)          # penanda layer "tabrakan" (palang kuning-hitam, tidak digambar di kota)

    def _ambil(self, nama, i):
        im = self.lembar[nama]
        k = im.width // T
        return im.crop(((i % k) * T, (i // k) * T, (i % k) * T + T, (i // k) * T + T))

    def _daftar(self, kunci, buat):
        if kunci not in self.kunci:
            self.kunci[kunci] = len(self.gambar)
            self.gambar.append(buat())
        return self.kunci[kunci]

    def dari(self, nama, i):
        return self._daftar((nama, i), lambda: self._ambil(nama, i))

    def perempat(self, nama, empat):
        """Ubin dari empat perempat (kiri atas, kanan atas, kiri bawah, kanan bawah), masing-masing diambil dari ubin sumber yang sama letaknya."""
        def buat():
            g = Image.new("RGBA", (T, T))
            for q, i in enumerate(empat):
                x, y = (q % 2) * 8, (q // 2) * 8
                g.paste(self._ambil(nama, i).crop((x, y, x + 8, y + 8)), (x, y))
            return g
        return self._daftar((nama, "q") + tuple(empat), buat)

    def tulis(self):
        """retro.png: margin 1, jarak 2, tepi tiap ubin diperpanjang 1 piksel supaya tidak ada garis tipis saat kamera bergeser."""
        n, k = len(self.gambar), self.KOLOM
        baris = (n + k - 1) // k
        lembar = Image.new("RGBA", (k * (T + 2), baris * (T + 2)), (0, 0, 0, 0))
        for i, g in enumerate(self.gambar):
            x, y = 1 + (i % k) * (T + 2), 1 + (i // k) * (T + 2)
            lembar.paste(g.resize((T + 2, T + 2), Image.NEAREST).crop((0, 0, T + 2, T + 2)), (x - 1, y - 1))
            for dx, dy, kotak in ((-1, 0, (0, 0, 1, T)), (T, 0, (T - 1, 0, T, T)), (0, -1, (0, 0, T, 1)), (0, T, (0, T - 1, T, T))):
                lembar.paste(g.crop(kotak), (x + dx, y + dy))
            lembar.paste(g, (x, y))
        out = PROYEK / "assets" / "tiles" / "retro.png"
        lembar.save(out, optimize=True)
        return {"firstgid": 1, "name": "retro", "image": "../tiles/retro.png", "imagewidth": lembar.width, "imageheight": lembar.height,
                "tilewidth": T, "tileheight": T, "margin": 1, "spacing": 2, "columns": k, "tilecount": baris * k}


U = Ubin()
BENDA = json.loads((PROYEK / "assets" / "sprites" / "benda.json").read_text())["frames"]
ATLAS = Image.open(PROYEK / "assets" / "sprites" / "benda.png").convert("RGBA")


def ukuran(nama):
    f = BENDA[nama]["frame"]
    return f["w"], f["h"]


def batas(nama):
    """Kotak bagian gambar yang tidak transparan (bayangan tipis di bawah ikut dihitung)."""
    f = BENDA[nama]["frame"]
    return ATLAS.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"])).getchannel("A").point(lambda a: 255 if a > 160 else 0).getbbox()


# ubin dari tileset jalan (lihat urutan di road_master_tileset_retro_160x80.png)
ASPAL, ASPAL_TAMBAL, MARKA_H, MARKA_V, ZEBRA_H, ZEBRA_V = (U.dari("jalan", i) for i in (0, 5, 1, 2, 6, 7))
PAVING, KESET, BATA = U.dari("jalan", 26), U.dari("jalan", 25), U.dari("jalan", 24)
TANAH_H, TANAH_V = U.dari("jalan", 27), U.dari("jalan", 28)
RUMPUT = (U.dari("alam", 6), U.dari("alam", 7), U.dari("alam", 18))
# benda kecil satu ubin (layer hiasan)
KERUCUT, RAMBU, TONG, KOTAK_MERAH, PATOK, PAGAR, HIDRAN, SEMAK, POT_BUNGA, PALANG, PETI, POT, PENUNJUK, PAPAN_KECIL, KOTAK_SURAT, \
    LAINNYA, MESIN, PAGAR_BESI, TUNAS, KOTAK_POS = (U.dari("jalan", i) for i in range(30, 50))
JENIS_ASPAL = {ASPAL, ASPAL_TAMBAL, MARKA_H, MARKA_V}
JENIS_ZEBRA = {ZEBRA_H, ZEBRA_V}


def trotoar(area, x, y):
    """Nomor ubin trotoar berbingkai untuk petak (x, y) dalam area. Tiap perempat dipilih dari tetangganya."""
    ada = lambda dx, dy: (x + dx, y + dy) in area
    empat = []
    for (dx, dy, dalam_sudut, tepi_h, tepi_v, sudut) in ((-1, -1, 20, 11, 13, 15), (1, -1, 21, 11, 14, 16), (-1, 1, 22, 12, 13, 17), (1, 1, 23, 12, 14, 18)):
        v, h = ada(0, dy), ada(dx, 0)
        empat.append((10 if ada(dx, dy) else dalam_sudut) if v and h else tepi_h if h else tepi_v if v else sudut)
    return U.perempat("jalan", empat)


def cells(x0, y0, x1, y1):
    return {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}


class Peta:
    def __init__(self, w, h, seed=7):
        self.W, self.H = w, h
        self.L = {n: [0] * (w * h) for n in LAYERS}
        self.rnd = random.Random(seed)
        self.keras, self.lantai, self.terpakai = set(), set(), set()
        self.doors, self.points, self.boards, self.routes, self.lamps, self.benda = [], [], [], [], [], []
        self.oid = 0
        self.atap = {}

    # ----- ubin -----
    def put(self, layer, x, y, idx):
        if 0 <= x < self.W and 0 <= y < self.H:
            self.L[layer][y * self.W + x] = idx + 1

    def block(self, x, y):
        self.put("tabrakan", x, y, U.blok)
        self.keras.add((x, y))

    def ubin(self, area, idx):
        for (x, y) in area:
            self.put("tanah", x, y, idx)
        self.lantai |= area

    def paving(self, area):
        for (x, y) in area:
            self.put("tanah", x, y, trotoar(area, x, y))
        self.lantai |= area

    def thing(self, x, y, idx, solid=True):
        self.put("hiasan", x, y, idx)
        self.terpakai.add((x, y))
        if solid:
            self.block(x, y)

    # ----- benda dari atlas -----
    def sprite(self, nama, kiri, bawah, datar=False, geser=0):
        """Gambar benda dengan pojok kiri bawah di (kiri, bawah) piksel. datar = di lantai (karpet), selalu di bawah orang."""
        assert nama in BENDA, nama
        props = {}
        if datar:
            props["datar"] = 1
        if geser:
            props["geser"] = geser
        self.obj(self.benda, nama, int(kiri), int(bawah), **props)

    def padat(self, nama, kiri, bawah, atas_lewat=1, kiri_tepi=0, kanan_tepi=0):
        """Tandai petak di bawah gambar sebagai tabrakan. atas_lewat = baris teratas yang boleh dilewati di belakangnya."""
        w, h = ukuran(nama)
        bx0, by0, bx1, by1 = batas(nama)
        x0, x1 = int((kiri + bx0 + 3) // T) + kiri_tepi, int((kiri + bx1 - 4) // T) - kanan_tepi
        y0, y1 = int((bawah - h + by0) // T) + atas_lewat, int((bawah - 1) // T)
        for c in cells(x0, y0, x1, y1):
            self.block(*c)
            self.terpakai.add(c)

    def gedung(self, nama, dx, dy, pintu_px, atas_lewat=1):
        """Gedung dengan pintu di petak (dx, dy): tengah pintu di gambar (pintu_px dari tepi kiri) tepat di tengah zona pintu."""
        kiri, bawah = (dx + .5) * T - pintu_px, (dy + 1) * T
        self.sprite(nama, kiri, bawah)
        self.padat(nama, kiri, bawah, atas_lewat)
        self.atap[(dx, dy)] = int(bawah - ukuran(nama)[1] + batas(nama)[1] + 6)     # papan nama gedung menempel di atapnya
        return kiri, bawah

    def tree(self, x, y, kind="zaitun"):
        """Pohon berdiri di petak (x, y): batangnya menghalangi, daunnya bisa dilewati di belakang."""
        nama = "pohon-" + kind
        w, _ = ukuran(nama)
        self.sprite(nama, (x + .5) * T - w / 2, (y + 1) * T)
        self.block(x, y)
        self.terpakai.add((x, y))

    def lamp(self, x, y):
        self.sprite("lampu-jalan", x * T, (y + 1) * T)
        self.block(x, y)
        self.terpakai.add((x, y))
        self.lamps.append((x * T + 8, y * T - 10))

    def bench(self, x, y):
        """Bangku dua ubin (x dan x+1)."""
        self.sprite("bangku", x * T, (y + 1) * T)
        self.block(x, y)
        self.block(x + 1, y)
        self.terpakai |= {(x, y), (x + 1, y)}

    def board(self, kind, ident, x0, y0, w, h, ground, order=0, name="", zone=True):
        """Papan HTML (lihat js/papan.js) selebar w tile dan setinggi h tile mulai dari (x0, y0).
        ground = baris tempat orang berdiri membacanya. Tapak papan dan tiangnya tidak bisa dilewati."""
        self.boards.append((kind, ident, x0, y0, w, h, ground, order))
        for c in cells(x0, y0, x0 + w - 1, y0 + h - 1):
            self.block(*c)
            self.terpakai.add(c)
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
        lx, ly = extra.pop("label_x", int((dx + .5) * T)), extra.pop("label_y", self.atap.get((dx, dy), int((dy - 1) * T + 4)))
        self.obj(self.doors, name, zx, zy, zw, zh, id=ident, aksi=action, tujuan=target, label_x=lx, label_y=ly, **extra)

    def route(self, name, pts):
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
            self.obj(self.points, "lampu", x, y)
        tile_layers = [{"id": i + 1, "name": n, "type": "tilelayer", "x": 0, "y": 0, "width": self.W, "height": self.H,
                        "opacity": .45 if n == "tabrakan" else 1, "visible": True, "data": self.L[n]} for i, n in enumerate(LAYERS)]
        groups = (("benda", self.benda), ("pintu", self.doors), ("titik", self.points), ("papan", papan), ("rute", self.routes))
        obj_layers = [{"id": len(LAYERS) + 1 + i, "name": n, "type": "objectgroup", "draworder": "topdown", "x": 0, "y": 0,
                       "opacity": 1, "visible": True, "objects": o} for i, (n, o) in enumerate(groups)]
        # jenis ubin untuk pencarian jalur warga (js/warga.js): aspal mahal, zebra cross dan trotoar murah, rumput sedang
        props = [{"name": "aspal", "type": "string", "value": ",".join(str(i + 1) for i in sorted(JENIS_ASPAL))},
                 {"name": "zebra", "type": "string", "value": ",".join(str(i + 1) for i in sorted(JENIS_ZEBRA))},
                 {"name": "rumput", "type": "string", "value": ",".join(str(i + 1) for i in RUMPUT)}]
        tmj = {"type": "map", "version": "1.10", "tiledversion": "1.11.0", "orientation": "orthogonal", "renderorder": "right-down",
               "infinite": False, "width": self.W, "height": self.H, "tilewidth": T, "tileheight": T, "compressionlevel": -1,
               "nextlayerid": len(LAYERS) + len(groups) + 1, "nextobjectid": self.oid + 1, "layers": tile_layers + obj_layers,
               "properties": props, "tilesets": [TILESET]}
        out = PROYEK / "assets" / "maps" / f"{nama}.tmj"
        out.write_text(json.dumps(tmj, separators=(",", ":")))
        print(f"{out.name}: {self.W}x{self.H} tile, {len(self.benda)} benda, {len(self.doors)} pintu, {len(self.boards)} papan, {len(self.routes)} rute, {len(self.lamps)} lampu")


# =====================================================================================================
#  KOTA (80 x 64)
#  utara  : baliho, CodeIn News, videotron, Galeri Showcase, rumah proyek 1, halte
#  tengah : jalan utama (gerbang barat <-> timur), alun-alun dengan air mancur Patung Si Pemula, Papan Pengumuman, pojok pasar
#  selatan: Markas CodeIn, Warkop (belum buka), menara Aetheria (rumah proyek 2), Toko Mbak Tika, taman baliho, kampung warga
#  Letak pintu sama dengan peta sebelumnya, jadi jadwal warga di js/config.js tetap berlaku.
# =====================================================================================================
def kota():
    p = Peta(80, 64)
    W, H = p.W, p.H
    for y in range(H):
        for x in range(W):
            r = p.rnd.random()
            p.put("tanah", x, y, RUMPUT[2] if r < .04 else RUMPUT[1] if r < .12 else RUMPUT[0])

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
        idx = ASPAL_TAMBAL if p.rnd.random() < .03 else ASPAL
        if hs and not vs and y - hs[0][1] == 1:
            idx = MARKA_H
        elif vs and not hs and x - vs[0][0] == 1:
            idx = MARKA_V
        p.put("tanah", x, y, idx)
    p.lantai |= asphalt
    for (cx, cy) in ((21, 13), (39, 13)):        # zebra cross jalan utama: depan CodeIn News, depan Galeri
        for i in range(3):
            p.put("tanah", cx, cy + i, ZEBRA_H)
    for i in range(3):                           # jalan selatan, ke kampung
        p.put("tanah", 36, 34 + i, ZEBRA_H)

    # ---------- trotoar, alun-alun, pelataran ----------
    sidewalk = (cells(2, 11, 77, 12) | cells(7, 16, 72, 16) | cells(7, 16, 7, 33) | cells(72, 16, 72, 33) | cells(7, 33, 72, 33)
                | cells(4, 37, 75, 37)
                | cells(37, 38, 37, 61) | cells(41, 38, 41, 61)          # kiri-kanan jalan kampung
                | cells(8, 47, 71, 47) | cells(8, 51, 71, 51)            # kiri-kanan gang
                | cells(8, 59, 71, 59)                                    # setapak depan rumah baris selatan
                | cells(39, 25, 40, 32)                                   # alun-alun -> jalan selatan
                | cells(8, 20, 9, 21) | cells(21, 20, 23, 21)             # ke Papan Pengumuman
                | cells(56, 20, 71, 21)                                   # alun-alun -> pojok pasar -> trotoar timur
                | cells(24, 17, 55, 24)) - asphalt                        # alun-alun
    p.paving(sidewalk)
    for (x, y) in cells(25, 18, 54, 23):       # bagian dalam alun-alun berlantai batu
        p.put("tanah", x, y, PAVING)
    p.ubin(cells(10, 17, 20, 23), PAVING)      # pelataran Papan Pengumuman

    # ---------- air mancur Patung Si Pemula (gambar 5 x 5 ubin di tengah alun-alun) ----------
    p.sprite("alun-patung", 40 * T - 40, 21 * T + 40, datar=True)
    for c in cells(38, 19, 41, 22):            # kolamnya; pinggiran batu di sekelilingnya bisa diinjak
        p.block(*c)
        p.terpakai.add(c)
    for (x, y) in ((622, 316), (658, 316), (620, 350), (660, 350)):
        p.obj(p.points, "pancuran", x, y)
    p.door("patung", "Patung Si Pemula", 39, 17, "panel", zone=(37 * T, 23 * T, 6 * T, T), label_x=40 * T, label_y=18 * T + 4)

    # ---------- bangunan utara ----------
    p.gedung("gedung-news", 21, 10, 32)        # CodeIn News: menara radio dan ticker
    p.gedung("gedung-galeri", 39, 10, 40)      # Galeri Showcase: kubah kaca
    p.gedung("rumah-kayu", 63, 10, 24)         # rumah proyek 1
    p.sprite("halte", 43 * T, 11 * T)          # halte di trotoar utara, antara Galeri dan baliho 3
    p.padat("halte", 43 * T, 11 * T)
    # ---------- bangunan selatan alun-alun ----------
    p.gedung("gedung-markas", 13, 32, 40)      # Markas CodeIn: balai berbendera
    p.gedung("warkop", 23, 32, 12)             # Warkop CodeIn (belum buka)
    p.gedung("gedung-aetheria", 32, 32, 32)    # rumah proyek 2: menara observatorium
    p.gedung("gedung-toko", 46, 32, 14)        # Toko Mbak Tika
    p.sprite("meja-warkop", 26 * T, 33 * T)   # meja warkop di halaman samping
    p.block(26, 32)
    p.block(27, 32)

    p.door("news", "CodeIn News", 21, 10, "masuk", "redaksi")
    p.door("galeri", "Galeri Showcase", 39, 10, "masuk", "galeri")
    p.door("markas", "Markas CodeIn", 13, 32, "masuk", "markas")
    p.door("warkop", "Warkop CodeIn", 23, 32, "panel", "kunci")
    # rumah proyek anggota (CodeIn Rumah): nama dan isinya diambil dari CodeIn News saat kota dibuka (js/rumah.js)
    p.door("proyek-1", "Gedung kosong", 63, 10, "panel", "proyek")
    p.door("proyek-2", "Gedung kosong", 32, 32, "panel", "proyek")
    p.door("toko", "Toko Mbak Tika", 46, 32, "panel")

    # ---------- papan dunia ----------
    p.board("videotron", "videotron", 28, 6, 6, 4, 11, name="Videotron Sedang Ramai")
    for (n, x0, y0, ground) in ((1, 3, 6, 11), (2, 9, 6, 11), (3, 46, 6, 11), (4, 52, 6, 11), (5, 54, 28, 33), (6, 62, 28, 33)):
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
            terakota = n % 2 == 1
            p.gedung("rumah-terakota" if terakota else "rumah-kayu", x0 + 2, y0 + 5, 13 if terakota else 24)
            siapa = penghuni.get((y0, x0))
            if siapa:
                p.door(f"rumah-{n}", f"Rumah {siapa}", x0 + 2, y0 + 5, "panel", "rumah", penghuni=siapa)
            else:                                                                           # rumah tanpa warga = rumah proyek
                p.door("proyek-3" if x0 < 38 else "proyek-4", "Rumah kosong", x0 + 2, y0 + 5, "panel", "proyek")
            p.thing(x0 + 5, y0 + 6 if y0 == 53 else y0 + 10, KOTAK_SURAT)                  # kotak surat di seberang trotoar
            p.thing(x0 + 4, y0 + 2, POT_BUNGA if n % 3 else TUNAS)                          # halaman belakang
            p.tree(x0 + 1, y0 + 2, "zaitun" if n % 2 else "gugur")
    for x in (8, 15, 16, 23, 24, 31, 43, 50, 51, 58, 59, 66):                              # pagar kayu di sela rumah
        for y in (46, 58):
            p.thing(x, y, PAGAR)

    # ---------- pagar tanaman, lampu, bangku ----------
    for x in range(8, 72):                     # pagar tanaman antara alun-alun dan gedung selatan
        if x not in (39, 40):
            p.thing(x, 26, SEMAK if x % 5 else POT_BUNGA)
    for (x, y) in ((25, 17), (54, 17), (25, 24), (54, 24), (33, 24), (46, 24), (10, 17), (20, 17), (57, 19), (70, 19),
                   (14, 12), (27, 12), (34, 12), (45, 12), (58, 12), (67, 12), (8, 33), (19, 33), (28, 33), (36, 33), (42, 33), (51, 33), (60, 33), (70, 33),
                   (11, 51), (20, 51), (33, 51), (47, 51), (55, 51), (68, 51), (20, 59), (34, 59), (48, 59), (68, 59), (36, 37), (42, 37), (36, 61), (42, 61)):
        p.lamp(x, y)
    for (x, y) in ((29, 17), (49, 17), (29, 24), (49, 24), (31, 21), (47, 21), (11, 23), (18, 23), (59, 32)):
        p.bench(x, y)
    for (x, y, k) in ((27, 17, "palem"), (52, 17, "palem"), (27, 24, "palem"), (52, 24, "palem"),
                      (11, 19, "cemara"), (19, 19, "cemara"), (10, 24, "zaitun"), (20, 24, "gugur"), (15, 24, "cemara"),
                      (58, 17, "cemara"), (70, 17, "zaitun"), (58, 24, "zaitun"), (64, 24, "gugur"), (70, 24, "cemara"),
                      (52, 29, "cemara"), (60, 28, "gugur"), (68, 28, "zaitun"), (37, 28, "cemara"), (42, 28, "cemara"),
                      (9, 31, "zaitun"), (18, 30, "palem"), (28, 29, "cemara"), (36, 31, "zaitun"), (43, 31, "palem"), (51, 31, "zaitun"),
                      (14, 8, "cemara"), (17, 9, "zaitun"), (25, 9, "zaitun"), (35, 9, "cemara"), (44, 7, "zaitun"),
                      (58, 8, "zaitun"), (68, 7, "gugur"), (60, 9, "cemara"), (67, 9, "cemara")):
        p.tree(x, y, k)
    p.sprite("pohon-beringin", 70 * T, 10 * T)               # beringin tua di dekat Gerbang Timur
    p.block(71, 9)
    p.terpakai |= cells(70, 7, 72, 9)
    p.sprite("kolam", 67 * T, 32 * T, datar=True)             # kolam teratai di taman baliho selatan
    p.padat("kolam", 67 * T, 32 * T, atas_lewat=0)
    # pojok pasar di timur alun-alun: gerobak, meja, dan peti
    for (x, y) in ((60, 19), (66, 19), (63, 23)):
        p.sprite("gerobak", x * T, (y + 1) * T)
        p.padat("gerobak", x * T, (y + 1) * T, atas_lewat=1)
    for (x, y, idx) in ((62, 19, PETI), (68, 19, PETI), (61, 22, PETI), (66, 22, TONG), (68, 22, POT)):
        p.thing(x, y, idx)
    # perabot jalan
    for (x, y, idx) in ((24, 12, TONG), (13, 12, KOTAK_POS), (47, 12, TONG), (35, 12, POT_BUNGA), (18, 33, TONG), (37, 33, KOTAK_POS), (50, 33, TONG),
                        (26, 12, POT_BUNGA), (55, 12, PENUNJUK)):
        p.thing(x, y, idx)
    # lampu lalu lintas di simpang alun-alun -> jalan selatan
    p.sprite("lampu-merah", 41 * T, 34 * T)
    p.block(41, 33)
    # mobil parkir di ujung gang kampung
    for (nama, x, y) in (("mobil-suv-kanan", 69, 49), ("mobil-angkot-kiri", 9, 49)):
        p.sprite(nama, x * T, (y + 1) * T)
        p.block(x, y)
        p.block(x + 1, y)

    # ---------- gerbang ----------
    p.door("gerbang-barat", "Gerbang Barat", 1, 12, "panel", "gerbang", zone=(0, 13 * T, 2 * T, 3 * T), label_y=12 * T)
    p.door("gerbang-timur", "Gerbang Timur", 78, 12, "panel", "gerbang", zone=(78 * T, 13 * T, 2 * T, 3 * T), label_y=12 * T)
    p.door("gerbang-selatan", "Gerbang Selatan", 39, 61, "panel", "gerbang", zone=(38 * T, 62 * T, 3 * T, 2 * T), label_y=61 * T)
    for (x, y) in ((2, 12), (2, 16), (77, 12), (77, 16), (37, 62), (41, 62)):
        p.thing(x, y, PALANG)
    p.sprite("pos-ronda", 74 * T, 11 * T)       # pos jaga Pak Harun di dekat Gerbang Timur
    p.padat("pos-ronda", 74 * T, 11 * T)

    # ---------- hutan tepi kota dan pohon pengisi ----------
    gates = cells(0, 13, 1, 15) | cells(78, 13, 79, 15) | cells(38, 62, 40, 63)
    border = (cells(0, 0, W - 1, 1) | cells(0, H - 2, W - 1, H - 1) | cells(0, 0, 1, H - 1) | cells(W - 2, 0, W - 1, H - 1)) - gates
    for (x, y) in sorted(border, key=lambda c: (c[1], c[0])):
        if (x + y) % 2 == 0 or x in (0, W - 1) or y in (0, H - 1):
            p.tree(x, y, "cemara" if p.rnd.random() < .7 else "zaitun")
        else:
            p.block(x, y)
    isian = ((cells(2, 2, 77, 4), .45), (cells(2, 17, 3, 33), .5), (cells(76, 17, 77, 33), .5), (cells(2, 38, 6, 61), .4), (cells(73, 38, 77, 61), .4),
             (cells(8, 38, 71, 40), .25), (cells(8, 60, 71, 61), .35), (cells(32, 41, 35, 45), .3), (cells(67, 41, 71, 45), .3))
    for area, peluang in isian:
        for (x, y) in sorted(area, key=lambda c: (c[1], c[0])):
            sekitar = {(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1, 2)}
            bebas = not (sekitar & (p.keras | p.terpakai)) and not ({(x, y), (x, y + 1), (x, y - 1)} & p.lantai)
            if bebas and p.rnd.random() < peluang:
                p.tree(x, y, p.rnd.choice(("cemara", "cemara", "zaitun", "gugur")))

    # ---------- titik mulai dan rute kendaraan ----------
    p.obj(p.points, "mulai", 40 * T, 24 * T + 8)
    # Lalu lintas kiri: ke timur lewat lajur utara, ke barat lewat lajur selatan; ke selatan lewat lajur timur.
    U1, S1, U2, S2 = 13 * T + 24, 16 * T - 1, 34 * T + 24, 37 * T - 1
    luar_b, luar_t, luar_s = -3 * T, (W + 3) * T, (H + 3) * T
    p.route("barat-timur", [(luar_b, U1), (luar_t, U1)])
    p.route("timur-barat", [(luar_t, S1), (luar_b, S1)])
    p.route("selatan-timur", [(38 * T + 8, luar_s), (38 * T + 8, U2), (73 * T + 8, U2), (73 * T + 8, U1), (luar_t, U1)])
    p.route("barat-selatan", [(luar_b, U1), (6 * T + 8, U1), (6 * T + 8, U2), (40 * T + 8, U2), (40 * T + 8, luar_s)])
    p.route("timur-selatan", [(luar_t, S1), (75 * T + 8, S1), (75 * T + 8, S2), (40 * T + 8, S2), (40 * T + 8, luar_s)])
    p.tulis("kota")


# =====================================================================================================
#  INTERIOR: ruangan berdinding dan berlantai dari "Top-Down Retro Interior" (Penzilla), dikelilingi kehampaan.
#  Dinding di utara, pintu keluar (keset) di selatan.
# =====================================================================================================
# Tema ruangan: kolom pertama blok dinding/lantai di TopDownHouse_FloorsAndWalls.png (18 ubin per baris).
# Dinding ada di baris 1-4 lembar itu, lantai di baris 5-7. Dipakai dua kolom tengah tiap blok supaya garis pemisah blok tidak ikut.
TEMA = {"krem": 9, "zaitun": 1, "oranye": 5}


def ruangan(w, h, tema, tinggi_dinding, pintu_x, keluar_ke):
    """Ruangan selebar w dan setinggi h tile (di dalam peta w+2 x h+3). Mengembalikan Peta dengan dinding, lantai, dan pintu keluar."""
    p = Peta(w + 2, h + 3)
    k = TEMA[tema]
    r = lambda baris, x: U.dari("ruang", baris * 18 + k + 1 + (x % 2))
    x0, x1, y0 = 1, w, 1
    for x in range(x0, x1 + 1):
        for i in range(tinggi_dinding):
            baris = 1 if i == 0 else 4 if i == tinggi_dinding - 1 else 3 if i == tinggi_dinding - 2 else 2
            p.put("bangunan", x, y0 + i, r(baris, x))
        for y in range(y0 + tinggi_dinding, h + 1):
            p.put("tanah", x, y, r(5 if y == y0 + tinggi_dinding else 6, x))
    # bingkai luar ruangan (garis cokelat tebal di tepi lembar Penzilla)
    for x in range(x0, x1 + 1):
        p.put("bangunan", x, 0, U.dari("ruang", 2))
        if x not in (pintu_x, pintu_x + 1):
            p.put("bangunan", x, h + 1, U.dari("ruang", 8 * 18 + 1))
    for y in range(1, h + 1):
        p.put("bangunan", 0, y, U.dari("ruang", 5 * 18))
        p.put("bangunan", w + 1, y, U.dari("ruang", 5 * 18 + 17))
    for (x, y, i) in ((0, 0, 0), (w + 1, 0, 17), (0, h + 1, 8 * 18), (w + 1, h + 1, 8 * 18 + 17)):
        p.put("bangunan", x, y, U.dari("ruang", i))
    lantai_area = cells(x0, y0 + tinggi_dinding, x1, h)
    p.lantai |= lantai_area
    keset = cells(pintu_x, h + 1, pintu_x + 1, h + 1)
    p.ubin(keset, KESET)
    for y in range(p.H):
        for x in range(p.W):
            if (x, y) not in lantai_area and (x, y) not in keset:
                p.block(x, y)
    p.door("keluar", "Pintu keluar", pintu_x, h, "keluar", "kota", zone=(pintu_x * T, (h + 1) * T, 2 * T, T), label=False, ke=keluar_ke)
    p.obj(p.points, "mulai", (pintu_x + 1) * T, h * T + 8)
    return p


def perabot(p, nama, x, y, padat=True, datar=False, geser=0, atas_lewat=1):
    """Perabot (gambar di atlas) dengan tepi kiri di kolom x dan tepi bawah di bawah baris y."""
    nama = nama if nama in BENDA else "perabot-" + nama
    p.sprite(nama, x * T, (y + 1) * T, datar=datar, geser=geser)
    if padat:
        p.padat(nama, x * T, (y + 1) * T, atas_lewat=atas_lewat)


def markas():
    p = ruangan(20, 11, "krem", 3, 10, "markas")
    p.board("info", "tentang", 3, 1, 6, 3, 4, name="Tentang CodeIn")
    p.board("info", "rencana", 13, 1, 6, 3, 4, name="Rencana kota")
    # Patung Pendiri di tengah dinding utara, di atas alas paving, diapit dua tanaman
    p.ubin(cells(10, 4, 11, 4), PAVING)
    p.block(10, 4)
    p.block(11, 4)
    p.obj(p.points, "patung", 11 * T, 4 * T + 6, jenis="pendiri")
    p.door("pendiri", "Patung Pendiri (Jull)", 10, 4, "panel", zone=(int(9.5 * T), 5 * T, 3 * T, T), label_x=11 * T, label_y=2 * T + 2)
    perabot(p, "tanaman", 9, 4)
    perabot(p, "tanaman", 12, 4)
    # meja resepsionis di sisi kanan; Kak Rani berdiri di belakangnya, tamu menyapa dari depan meja
    perabot(p, "meja-panjang", 15, 9, geser=-4)
    for x in (15, 16, 17):
        p.block(x, 9)
    p.door("resepsionis", "Meja resepsionis", 16, 9, "panel", "sapa", zone=(15 * T, 10 * T, 3 * T, T), label=False, penghuni="Kak Rani")
    perabot(p, "kecil-telepon", 17, 8, padat=False, geser=4)
    # meja rapat di atas karpet, dengan kursi di belakangnya
    perabot(p, "karpet", 7, 8, padat=False, datar=True)
    perabot(p, "karpet", 10, 8, padat=False, datar=True)
    perabot(p, "meja-panjang", 7, 7)
    perabot(p, "meja-panjang", 10, 7)
    for x in (7, 9, 11, 13):
        perabot(p, "kursi-kayu", x, 5, padat=False, geser=-20)
    perabot(p, "kecil-buku-terbuka", 8, 6, padat=False, geser=2)
    perabot(p, "kecil-kopi", 11, 6, padat=False, geser=2)
    # rak dan lemari di sisi ruangan
    perabot(p, "rak-buku", 1, 6)
    perabot(p, "rak-laci", 17, 6)
    perabot(p, "jam-besar", 20, 7)
    perabot(p, "tanaman", 1, 10)
    perabot(p, "tanaman", 20, 10)
    perabot(p, "sofa", 2, 10)
    perabot(p, "lampu-lantai", 6, 10)
    p.tulis("markas")


def galeri():
    p = ruangan(37, 11, "oranye", 5, 18, "galeri")
    for n in range(6):                         # enam karya di dinding = enam slot baliho
        p.board("baliho", f"baliho-{n + 1}", 2 + n * 6, 1, 5, 4, 6, order=n + 1, name="Karya")
    for x in (7, 13, 19, 25, 31):              # tanaman di antara karya
        perabot(p, "tanaman", x, 6)
    for x in (4, 10, 16, 22, 28, 34):          # bangku untuk duduk memandang karya
        perabot(p, "sofa-panjang", x, 9)
    perabot(p, "meja-kecil", 2, 10)            # meja penjaga galeri
    perabot(p, "kecil-buku-terbuka", 2, 10, padat=False, geser=1)
    p.sprite("perabot-karpet-tegak", 19 * T - 20, 12 * T, datar=True)     # karpet dari pintu masuk
    for (x, y) in ((1, 6), (37, 6), (37, 10)):
        perabot(p, "tanaman", x, y)
    perabot(p, "jam-besar", 1, 10)
    p.tulis("galeri")


def redaksi():
    """Kantor Redaksi CodeIn News. Eko, Tekno, dan Rina diatur js/redaksi.js (keadaannya dari data CodeIn News),
    jadi di peta ini cukup meja, zona sapa di depan meja, dan titik-titik yang dipakai skrip itu."""
    p = ruangan(24, 10, "zaitun", 3, 12, "news")
    p.board("info", "cara-kerja", 2, 1, 5, 3, 4, name="Cara kerja redaksi")
    p.board("videotron", "layar-redaksi", 9, 1, 8, 3, 4, name="Sedang ramai")
    # tiga meja redaksi; agen duduk di baris 4 (di belakang meja, kepalanya terlihat di atas meja), pengunjung menyapa dari baris 7.
    # Meja digambar sedikit di belakang layar komputer yang digambar js/redaksi.js.
    for agen, x0 in (("Eko", 3), ("Tekno", 11), ("Rina", 19)):
        perabot(p, "meja-panjang", x0, 6, padat=False, geser=-3)
        for x in range(x0, x0 + 3):
            p.block(x, 6)
        p.obj(p.points, "meja", (x0 + 1) * T + 8, 4 * T + 12, agen=agen)
        p.door("meja-" + agen.lower(), "Meja " + agen, x0 + 1, 6, "panel", "redaksi",
               zone=(x0 * T, 7 * T, 3 * T, T), label=False, penghuni=agen)
    # dapur kecil di kiri bawah: lemari dan mesin kopi (mesin kopinya digambar js/redaksi.js)
    perabot(p, "lemari-kecil", 1, 9)
    p.block(2, 9)
    p.obj(p.points, "kopi", 2 * T + 8, 9 * T + 12)
    # meja rapat di kanan bawah; agen berkumpul di baris 8 saat ada gangguan sistem
    perabot(p, "karpet", 18, 10, padat=False, datar=True)
    perabot(p, "meja-panjang", 19, 9)
    perabot(p, "meja-bundar", 22, 9)
    # terminal untuk membaca CodeIn News di situsnya
    perabot(p, "meja-komputer", 7, 9, padat=False)
    p.block(8, 9)
    p.door("baca", "Baca CodeIn News", 8, 9, "pindah", "https://news.codeinhub.my.id/", zone=(7 * T, 9 * T + 8, 3 * T, 24))
    for (x, y) in ((1, 5), (24, 5), (24, 10), (8, 4), (17, 4)):
        perabot(p, "tanaman", x, y)
    perabot(p, "rak-rendah", 21, 4)
    p.tulis("redaksi")


TILESET = None
# Ubin dipakai lebih dulu, retro.png ditulis setelah semua peta tersusun; jadi peta ditulis ulang sekali lagi dengan data tileset yang lengkap.
for buat in (kota, markas, galeri, redaksi):
    TILESET = {"firstgid": 1, "name": "retro", "image": "../tiles/retro.png", "tilewidth": T, "tileheight": T, "margin": 1, "spacing": 2,
               "columns": Ubin.KOLOM, "imagewidth": 0, "imageheight": 0, "tilecount": 0}
    buat()
TILESET = U.tulis()
for buat in (kota, markas, galeri, redaksi):
    buat()
print(f"retro.png: {len(U.gambar)} ubin")

"""Karakter CodeIn City -> assets/sprites/orang.png (dipanggil tools/buat_gambar.py).

Lembar ini memakai susunan karakter RPG Urban Pack (Kenney): tiap karakter 4 kolom (kiri, bawah, atas, kanan) x 3 baris
(berdiri, langkah 1, langkah 2), bingkai 16 x 16 tanpa jarak.
- Karakter 0-5 : enam karakter asli Kenney (sama dengan pilihan lama, jadi pengunjung lama tetap memakai karakternya).
- Karakter 6-11: karakter dari paket "CodeIn City Retro" (pemuda berhoodie, mahasiswi, bocil bertopi, ibu warung, kakek
                 bertongkat, nenek) yang digambar ulang dari tubuh karakter Kenney: warna rambut, baju, dan celana diganti,
                 lalu ditambah topi, tongkat, atau celemek.
- Karakter 12  : Jull pemula (rambut hitam, kaos hijau toska, kacamata), hanya untuk Patung Pendiri.
"""
from PIL import Image

from kanvas import URBAN, hx

NAMA = ["Kaos hijau", "Kaos merah", "Rambut perak", "Helm kuning", "Kepala plontos", "Bando oranye",
        "Hoodie biru", "Mahasiswi", "Bocil bertopi", "Ibu warung", "Kakek", "Nenek", "Jull pemula"]
BARIS_KENNEY = [0, 3, 6, 9, 12, 15]
KOLOM_KENNEY = 23            # kolom kiri, bawah, atas, kanan = 23-26 di urban.png

RAMBUT = ("e28d59", "ca7c56")
BAJU = {0: ("829c5c", "728a4f"), 3: ("c75a52", "a94b44"), 6: ("829c5c", "728a4f")}
CELANA = {0: ("dcd2a2", "cab88d"), 3: ("d4c0ab", "ac9a88"), 6: ("d4c0ab", "ac9a88")}


def ambil(baris):
    """Satu karakter Kenney sebagai gambar 64 x 48 (4 arah x 3 langkah)."""
    g = Image.new("RGBA", (64, 48))
    for r in range(3):
        for c in range(4):
            i = (baris + r) * 27 + KOLOM_KENNEY + c
            g.paste(URBAN.crop((1 + (i % 27) * 18, 1 + (i // 27) * 18, 17 + (i % 27) * 18, 17 + (i // 27) * 18)), (c * 16, r * 16))
    return g


def warnai(g, peta):
    px = g.load()
    peta = {hx(a)[:3]: hx(b) for a, b in peta.items()}
    for y in range(g.height):
        for x in range(g.width):
            c = px[x, y]
            if c[3] and c[:3] in peta:
                px[x, y] = peta[c[:3]]
    return g


def ganti(dasar, rambut=None, baju=None, celana=None):
    p = {}
    for lama, baru in ((RAMBUT, rambut), (BAJU[dasar], baju), (CELANA[dasar], celana)):
        if baru:
            p.update(dict(zip(lama, baru)))
    return warnai(ambil(dasar), p)


def per_bingkai(g, f):
    """Jalankan f(bingkai, arah, langkah) untuk tiap bingkai 16 x 16."""
    for r in range(3):
        for c, arah in enumerate(("kiri", "bawah", "atas", "kanan")):
            b = g.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16))
            b = f(b, arah, r) or b
            g.paste(b, (c * 16, r * 16))
    return g


def piksel_rambut(b, warna):
    px = b.load()
    return [(x, y) for y in range(16) for x in range(16) if px[x, y][3] and px[x, y][:3] in [hx(w)[:3] for w in warna]]


def topi(b, arah, r):
    """Topi merah: rambut di lima baris teratas jadi topi, ditambah lidah topi."""
    px = b.load()
    rambut = piksel_rambut(b, ("5a3a2a", "45291d"))
    if not rambut:
        return
    atas = min(y for _, y in rambut)
    for (x, y) in rambut:
        if y <= atas + 3:
            px[x, y] = hx("e05a4f") if y < atas + 3 else hx("b8443c")
    xs = [x for (x, y) in rambut if y == atas + 3]
    if xs and arah != "atas":
        y = atas + 4
        lidah = range(min(xs), max(xs) + 1) if arah == "bawah" else (range(min(xs) - 2, min(xs) + 3) if arah == "kiri" else range(max(xs) - 2, max(xs) + 3))
        for x in lidah:
            if 0 <= x < 16 and px[x, y][3]:
                px[x, y] = hx("b8443c")


def pendek(b, arah, r):
    """Bocil: badan dua piksel lebih pendek (kepala turun, kaki tetap)."""
    g = Image.new("RGBA", (16, 16))
    g.paste(b.crop((0, 0, 16, 9)), (0, 2))
    g.paste(b.crop((0, 11, 16, 16)), (0, 11))
    return g


def tongkat(b, arah, r):
    px = b.load()
    x = {"kiri": 2, "bawah": 13, "atas": 2, "kanan": 13}[arah]
    for y in range(8, 16):
        px[x, y] = hx("8a5a3a") if y > 8 else hx("6b4329")
    px[x, 15] = hx("6b4329")


def celemek(b, arah, r):
    """Celemek krem di depan badan ibu warung (tampak depan dan samping)."""
    if arah == "atas":
        return
    px = b.load()
    hijau = [hx("4f9e6b")[:3], hx("3f8256")[:3]]
    for y in range(9, 13):
        for x in range(16):
            if px[x, y][3] and px[x, y][:3] in hijau:
                if arah == "bawah" and 5 <= x <= 10 or arah == "kiri" and x <= 8 or arah == "kanan" and x >= 7:
                    px[x, y] = hx("f2e6cf") if y < 12 else hx("d9c9a8")


def kacamata(b, arah, r):
    """Kacamata: mata (garis gelap di wajah) diberi lensa biru muda."""
    if arah == "atas":
        return
    px = b.load()
    kulit = [hx(c)[:3] for c in ("ffcc97", "f8b489", "ffcb9e")]
    garis = hx("915745")[:3]
    mata = [(x, y) for y in range(3, 10) for x in range(1, 15)
            if px[x, y][:3] == garis and px[x - 1, y][:3] in kulit and px[x + 1, y][:3] in kulit]
    for (x, y) in mata:
        for dx in (-1, 0, 1):
            if px[x + dx, y][:3] in kulit or dx == 0:
                px[x + dx, y] = hx("a9d6e5") if dx else hx("2f2b3a")
        if px[x, y - 1][:3] in kulit:
            px[x, y - 1] = hx("2f2b3a")


def baru():
    g = []
    g.append(ganti(0, ("6b4a35", "553a2a"), ("5b8cc7", "4870a8"), ("4a4e6e", "3c3f5a")))                    # pemuda berhoodie
    g.append(ganti(3, ("8a5a3a", "6e4630"), ("f2c14e", "d6a43a"), ("4a5687", "3b4570")))                    # mahasiswi
    bocil = ganti(0, ("5a3a2a", "45291d"), ("f2c14e", "d6a43a"), ("5b8cc7", "4870a8"))
    per_bingkai(bocil, pendek)
    per_bingkai(bocil, topi)
    g.append(bocil)
    warung = ganti(3, ("c4504a", "a03e3a"), ("4f9e6b", "3f8256"), ("f2e6cf", "d9c9a8"))                  # ibu warung
    per_bingkai(warung, celemek)
    g.append(warung)
    kakek = ganti(6, None, ("8a9a55", "737f45"), ("5a5e70", "484b5c"))
    per_bingkai(kakek, tongkat)
    g.append(kakek)
    g.append(ganti(3, ("ece8e0", "c9c3b8"), ("a58bc9", "86699f"), ("4a4458", "3a3546")))                    # nenek
    jull = ganti(0, ("2f2b3a", "242130"), ("2a9d8f", "1f7a70"), ("3a3f5a", "2e3248"))
    per_bingkai(jull, kacamata)
    g.append(jull)
    return g


def lembar():
    semua = [ambil(b) for b in BARIS_KENNEY] + baru()
    out = Image.new("RGBA", (64, 48 * len(semua)))
    for i, g in enumerate(semua):
        out.paste(g, (0, i * 48))
    return out

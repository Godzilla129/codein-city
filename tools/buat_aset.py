"""Penyusun aset CodeIn City dari paket aset retro -> assets/sprites/benda.png + benda.json, assets/sprites/orang.png, assets/musik/*.mp3.

Jalankan dari folder proyek, dengan folder Assets (paket "CodeIn City Retro 16x16" + "House Asset" + "Music") sebagai argumen:
    python3 tools/buat_aset.py "D:/CodeIn/CodeIn City/Assets"
lalu jalankan tools/buat_peta.py dengan argumen yang sama (peta membaca ukuran gambar dari benda.json).

File sumber tidak ikut disimpan di repositori ini; yang disimpan hanya hasil susunannya.
- benda.png : satu lembar berisi semua gambar benda (gedung, pohon, perabot, kendaraan, efek, ikon), dibaca Phaser sebagai atlas.
- orang.png : lembar karakter. Tiap karakter 4 kolom x 6 baris ubin 16x16 (diam, bawah, atas, kiri, kanan, aktivitas).
- musik     : diubah ke MP3 96 kbps supaya ringan dibuka lewat data seluler.
Butuh Pillow, dan ffmpeg untuk musik.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image

if len(sys.argv) < 2:
    sys.exit("Pakai: python3 tools/buat_aset.py <folder Assets>")
SUMBER = Path(sys.argv[1])
PROYEK = Path(__file__).resolve().parent.parent
KELUAR = PROYEK / "assets" / "sprites"

# Urutan karakter di orang.png. Enam yang pertama bisa dipilih pengunjung (KOTA.karakter di js/config.js);
# yang ketujuh (Jull pemula) hanya dipakai untuk Patung Pendiri di Markas.
KARAKTER = ["npc_pemuda_hoodie", "npc_mahasiswi", "npc_bocil", "npc_bu_warung", "npc_kakek", "npc_nenek", "jull_pemula"]

# Musik latar (semua CC0, "High Quality 16-bit RPG Music" karya Hydrogene). nama berkas hasil -> judul lagu
MUSIK = {"kota-siang": "02. Lively City", "kota-malam": "04. Peaceful Village", "dalam": "19. East Town", "galeri": "22. Ancient Library"}


def buka(rel):
    return Image.open(SUMBER / rel).convert("RGBA")


def potong(im, kotak, rapikan=False):
    g = im.crop(kotak)
    if rapikan:
        bb = g.getchannel("A").getbbox()
        if bb:
            g = g.crop(bb)
    return g


def kumpulkan():
    g = {}
    # ---- gedung dan bangunan kota (tidak dirapikan: letak pintunya dihitung dari tepi kiri gambar) ----
    gedung = {"gedung-markas": "02_buildings_iconic_v2/markas_codein_v2_80x80.png",
              "gedung-galeri": "02_buildings_iconic_v2/galeri_showcase_v2_80x64.png",
              "gedung-news": "02_buildings_iconic_v2/codein_news_v2_64x80.png",
              "gedung-toko": "02_buildings_iconic_v2/toko_mbak_tika_v2_64x64.png",
              "gedung-aetheria": "02_buildings_iconic_v2/aetheria_v2_64x80.png",
              "alun-patung": "02_buildings_iconic_v2/alun_alun_patung_v2_80x80.png",
              "rumah-terakota": "03_buildings_houses_warkop/house_terracotta_retro_48x48.png",
              "rumah-kayu": "03_buildings_houses_warkop/house_wood_retro_48x48.png",
              "warkop": "03_buildings_houses_warkop/warkop_codein_retro_48x48.png",
              "pos-ronda": "06_props_street_signage/pos_ronda_retro_48x48.png",
              "halte": "06_props_street_signage/bus_stop_retro_48x32.png",
              "gerobak": "06_props_street_signage/gerobak_kuliner_retro_32x32.png",
              "lampu-jalan": "06_props_street_signage/street_lamp_retro_16x32.png",
              "lampu-merah": "06_props_street_signage/traffic_light_retro_16x32.png",
              "bangku": "06_props_street_signage/park_bench_retro_32x16.png",
              "meja-warkop": "06_props_street_signage/warkop_table_retro_32x16.png",
              "net-badminton": "06_props_street_signage/badminton_net_retro_48x16.png",
              "kolam": "07_nature_trees_ponds/garden_pond_48x48.png",
              "pohon-beringin": "07_nature_trees_ponds/tree_beringin_48x48.png",
              "pohon-cemara": "07_nature_trees_ponds/tree_cemara_32x48.png",
              "pohon-palem": "07_nature_trees_ponds/tree_palem_32x48.png",
              "pohon-zaitun": "07_nature_trees_ponds/tree_olive_retro_32x32.png",
              "pohon-gugur": "07_nature_trees_ponds/tree_autumn_retro_32x32.png",
              "cahaya": "09_fx_weather_night/fx_lamp_glow_32x32.png"}
    for nama, rel in gedung.items():
        g[nama] = buka(rel)

    # ---- kendaraan: lembar 64x32 = tampak kanan, kiri (kiri atas, kiri bawah), depan, belakang; motor 64x16 = kanan, kiri, depan, belakang ----
    for jenis, rel in (("sedan", "vehicle_sedan_red_64x32"), ("suv", "vehicle_suv_ochre_64x32"), ("angkot", "vehicle_angkot_teal_64x32")):
        im = buka(f"05_vehicles_4dir/{rel}.png")
        for arah, kotak in (("kanan", (0, 0, 32, 16)), ("kiri", (0, 16, 32, 32)), ("bawah", (32, 0, 48, 32)), ("atas", (48, 0, 64, 32))):
            g[f"mobil-{jenis}-{arah}"] = potong(im, kotak)
    for jenis, rel in (("motor", "vehicle_motor_red_64x16"), ("ojol", "vehicle_motor_ojol_64x16")):
        im = buka(f"05_vehicles_4dir/{rel}.png")
        for i, arah in enumerate(("kanan", "kiri", "bawah", "atas")):
            g[f"mobil-{jenis}-{arah}"] = potong(im, (i * 16, 0, i * 16 + 16, 16))

    # ---- efek dan ikon: lembar sederetan bingkai 16x16 ----
    for nama, rel, n in (("kunang", "09_fx_weather_night/fx_fireflies_glow_64x16.png", 4), ("hujan", "09_fx_weather_night/fx_rain_sheet_64x16.png", 4),
                         ("emote", "08_ui_pixel_art/ui_emote_bubbles_96x16.png", 6), ("ikon", "08_ui_pixel_art/ui_hud_icons_112x16.png", 7)):
        im = buka(rel)
        for i in range(n):
            g[f"{nama}-{i}"] = potong(im, (i * 16, 0, i * 16 + 16, 16))

    # ---- perabot dalam ruangan (Top-Down Retro Interior karya Penzilla), dirapikan ke batas gambarnya ----
    f1 = buka("House Asset/TopDownHouse_FurnitureState1.png")
    perabot = {"meja-kecil": (6, 5, 26, 28), "lemari-kecil": (32, 3, 47, 30), "lemari-dua": (48, 5, 80, 30),
               "kursi-putih": (113, 10, 127, 31), "kursi-kayu": (160, 10, 176, 31), "meja-bundar": (176, 2, 192, 26),
               "meja-panjang": (0, 32, 48, 63), "rak-rendah": (49, 35, 79, 63), "meja-tamu": (84, 44, 108, 63),
               "karpet-oval": (133, 50, 155, 62), "karpet": (160, 32, 208, 64), "karpet-tegak": (164, 64, 204, 112),
               "meja-besar": (1, 64, 31, 110), "rak-buku": (33, 64, 69, 111), "lemari-tinggi": (144, 64, 160, 112),
               "rak-laci": (97, 66, 143, 111), "jam-besar": (70, 112, 92, 158), "lampu-lantai": (97, 112, 112, 158),
               "laci": (4, 117, 29, 152), "cermin": (116, 114, 140, 158), "gantungan": (49, 116, 63, 160), "sofa-kursi": (176, 117, 199, 153),
               "tanaman": (3, 168, 13, 191), "sofa": (88, 161, 140, 192), "sofa-panjang": (24, 167, 74, 191),
               "kursi-sofa": (144, 160, 176, 192), "kulkas": (35, 196, 61, 252), "meja-komputer": (177, 262, 207, 288)}
    for nama, kotak in perabot.items():
        g["perabot-" + nama] = potong(f1, kotak, rapikan=True)
    kecil = buka("House Asset/TopDownHouse_SmallItems.png")
    for nama, i in (("lukisan", 8), ("lukisan-lebar", 9), ("jam-dinding", 13), ("pot-kecil", 14), ("vas-bunga", 15), ("buku-terbuka", 24),
                    ("lilin", 26), ("akuarium", 27), ("guci", 29), ("telepon", 30), ("kopi", 52), ("teko", 63), ("kotak", 23)):
        g["kecil-" + nama] = potong(kecil, ((i % 8) * 16, (i // 8) * 16, (i % 8) * 16 + 16, (i // 8) * 16 + 16), rapikan=True)
    pj = buka("House Asset/TopDownHouse_DoorsAndWindows.png")
    for nama, kotak in (("jendela", (96, 48, 128, 80)), ("jendela-lebar", (128, 48, 160, 80)), ("jendela-krem", (192, 128, 224, 160))):
        g[nama] = potong(pj, kotak, rapikan=True)
    return g


def kemas(gambar, lebar=512, jarak=2):
    """Susun gambar ke satu lembar (rak demi rak, dari yang tertinggi). Mengembalikan (lembar, {nama: (x, y, w, h)})."""
    urut = sorted(gambar.items(), key=lambda kv: (-kv[1].height, -kv[1].width, kv[0]))
    letak, x, y, tinggi_rak = {}, jarak, jarak, 0
    for nama, im in urut:
        if x + im.width + jarak > lebar:
            x, y, tinggi_rak = jarak, y + tinggi_rak + jarak, 0
        letak[nama] = (x, y, im.width, im.height)
        x += im.width + jarak
        tinggi_rak = max(tinggi_rak, im.height)
    tinggi = y + tinggi_rak + jarak
    lembar = Image.new("RGBA", (lebar, (tinggi + 3) // 4 * 4), (0, 0, 0, 0))
    for nama, im in gambar.items():
        lembar.paste(im, letak[nama][:2])
    return lembar, letak


def main():
    KELUAR.mkdir(parents=True, exist_ok=True)
    lembar, letak = kemas(kumpulkan())
    lembar.save(KELUAR / "benda.png", optimize=True)
    frames = {n: {"frame": {"x": x, "y": y, "w": w, "h": h}, "rotated": False, "trimmed": False,
                  "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h}, "sourceSize": {"w": w, "h": h}} for n, (x, y, w, h) in sorted(letak.items())}
    meta = {"image": "benda.png", "format": "RGBA8888", "size": {"w": lembar.width, "h": lembar.height}, "scale": "1"}
    (KELUAR / "benda.json").write_text(json.dumps({"frames": frames, "meta": meta}, separators=(",", ":")))
    print(f"benda.png: {lembar.width}x{lembar.height}, {len(letak)} gambar")

    orang = Image.new("RGBA", (64, 96 * len(KARAKTER)), (0, 0, 0, 0))
    for i, n in enumerate(KARAKTER):
        orang.paste(buka(f"01_characters_16x16_anim/{n}_retro_anim_64x96.png"), (0, i * 96))
    orang.save(KELUAR / "orang.png", optimize=True)
    # ikon not balok untuk tombol musik di bilah atas (dipakai css/style.css, terpisah dari atlas supaya letaknya tidak berubah)
    buka("08_ui_pixel_art/ui_emote_bubbles_96x16.png").crop((64, 0, 80, 16)).save(KELUAR / "ikon-musik.png", optimize=True)
    print(f"orang.png: {len(KARAKTER)} karakter")

    musik = PROYEK / "assets" / "musik"
    musik.mkdir(parents=True, exist_ok=True)
    if not shutil.which("ffmpeg"):
        print("ffmpeg tidak ada: musik dilewati")
        return
    for nama, judul in MUSIK.items():
        asal = next((SUMBER / "Music" / d / f"{judul}.{d}" for d in ("ogg", "mp3", "wav") if (SUMBER / "Music" / d / f"{judul}.{d}").exists()), None)
        if not asal:
            print(f"lagu tidak ditemukan: {judul}")
            continue
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(asal), "-map_metadata", "-1", "-ac", "2", "-b:a", "96k", str(musik / f"{nama}.mp3")], check=True)
        print(f"musik/{nama}.mp3 <- {judul}")


main()

/* CodeIn City · desain rumah buatan warga (Perumahan CodeIn).
   Pemilik rumah menggambar rumahnya sendiri di editor piksel 96 x 106 (sama dengan gambar rumah starter), mulai dari salah
   satu model atau kanvas kosong, atau mengimpor PNG. Desain dikirim ke CodeIn News dan baru tampil di Perumahan setelah
   disetujui admin (dashboard/services/desain.py):
     POST /api/perumahan/desain        -> {png: data URL}; status menunggu
     GET  /api/perumahan/desain/saya   -> {tayang, menunggu, alasan_tolak, versi}
     POST /api/perumahan/desain/lepas  -> kembali ke model rumah biasa
     GET  /api/perumahan/desain/<kode>.png?v=<versi> -> gambar yang tayang (dipakai js/perumahan.js)
   Garis bantu di editor: kotak pintu (posisi pintu rumah di kavling) dan garis dinding (bagian bawah setinggi 45 piksel
   tidak bisa dilewati pemain). Garis bantu tidak ikut tersimpan. */

const Desain = (() => {
  const W = 96, H = 106, DINDING = 45;
  const PINTU = {x: 30, y: 74, w: 20, h: 32};          // tempat pintu di semua model rumah (mengarah ke jalan setapak kavling)
  const PALET = ["#3B2A20", "#5E3F22", "#8A5A35", "#C08552", "#E8D9C3", "#FCF8F1", "#FFFFFF", "#9AA4AD",
                 "#5F6B76", "#C0473A", "#E07B39", "#E9A23B", "#F2C94C", "#6CC24A", "#2F7A32", "#8EC6D8",
                 "#3E7CC9", "#7A5BA8", "#E88BB0", "#000000"];
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = ((lokal && new URLSearchParams(location.search).get("api")) || KOTA.news).replace(/\/+$/, "");

  let kanvas = null, g = null, warna = PALET[0], alat = "pensil", kuas = 1, riwayat = [], gambarSimpanan = null;

  /* ---------- tampilan rumah berdesain di peta Perumahan ---------- */
  const muatGambar = {};
  // kunci tekstur Phaser untuk desain kavling (null kalau belum siap). Saat belum ada, gambar diunduh lalu siap() dipanggil.
  function tekstur(adegan, kode, versi, siap) {
    const kunci = `desain-${kode}-${versi}`;
    if (adegan.textures.exists(kunci)) return kunci;
    if (!muatGambar[kunci]) {
      muatGambar[kunci] = (async () => {
        const r = await fetch(`${API}/api/perumahan/desain/${kode}.png?v=${versi}`);
        if (!r.ok) throw new Error("kode " + r.status);
        const url = URL.createObjectURL(await r.blob()), img = new Image();
        await new Promise((ok, gagal) => { img.onload = ok; img.onerror = gagal; img.src = url; });
        return img;
      })();
    }
    muatGambar[kunci].then(img => {
      const sc = Kota.adegan();
      if (sc && !sc.textures.exists(kunci)) sc.textures.addImage(kunci, img);
      siap();
    }).catch(() => { /* biarkan model biasa */ });
    return null;
  }

  /* ---------- editor ---------- */
  function simpanRiwayat() { riwayat.push(g.getImageData(0, 0, W, H)); if (riwayat.length > 30) riwayat.shift(); }
  function urungkan() { if (riwayat.length) g.putImageData(riwayat.pop(), 0, 0); }
  function mulaiDari(model) {
    simpanRiwayat();
    g.clearRect(0, 0, W, H);
    if (model === "kosong") return;
    const f = Kota.adegan().textures.getFrame("benda", `rumah-${model}`);
    g.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, H - f.cutHeight, f.cutWidth, f.cutHeight);
  }
  const hex = (r, gg, b) => "#" + [r, gg, b].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  function isi(x, y) {
    const d = g.getImageData(0, 0, W, H), p = d.data, i0 = (y * W + x) * 4, asal = [p[i0], p[i0 + 1], p[i0 + 2], p[i0 + 3]];
    const hapus = alat === "hapus", baru = hapus ? [0, 0, 0, 0] : [parseInt(warna.slice(1, 3), 16), parseInt(warna.slice(3, 5), 16), parseInt(warna.slice(5, 7), 16), 255];
    if (asal.every((v, k) => v === baru[k])) return;
    const sama = i => p[i] === asal[0] && p[i + 1] === asal[1] && p[i + 2] === asal[2] && p[i + 3] === asal[3];
    const tumpuk = [[x, y]];
    while (tumpuk.length) {
      const [cx, cy] = tumpuk.pop(), i = (cy * W + cx) * 4;
      if (cx < 0 || cy < 0 || cx >= W || cy >= H || !sama(i)) continue;
      p[i] = baru[0]; p[i + 1] = baru[1]; p[i + 2] = baru[2]; p[i + 3] = baru[3];
      tumpuk.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    g.putImageData(d, 0, 0);
  }
  function titik(x, y) {
    const s = kuas, x0 = x - Math.floor((s - 1) / 2), y0 = y - Math.floor((s - 1) / 2);
    if (alat === "hapus") g.clearRect(x0, y0, s, s);
    else { g.fillStyle = warna; g.fillRect(x0, y0, s, s); }
  }
  function garis(a, b) {         // titik-titik di antara dua posisi penunjuk, supaya goresan cepat tidak putus
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
    for (let i = 0; i <= n; i++) titik(Math.round(a[0] + (b[0] - a[0]) * i / n), Math.round(a[1] + (b[1] - a[1]) * i / n));
  }
  function impor(berkas, pesan) {
    if (!berkas) return;
    if (!/^image\/(png|gif|webp|jpeg)$/.test(berkas.type) || berkas.size > 2 * 1024 * 1024) { pesan.textContent = "Pilih gambar PNG, paling besar 2 MB."; return; }
    const url = URL.createObjectURL(berkas), img = new Image();
    img.onload = () => {
      simpanRiwayat();
      g.clearRect(0, 0, W, H);
      // muat di dalam 96 x 106 tanpa penghalusan; rapat ke bawah supaya rumah berdiri di tanah
      let k = Math.min(W / img.width, H / img.height);
      if (k >= 1) k = Math.floor(k);                    // gambar kecil diperbesar bulat supaya piksel tetap tajam
      const w = Math.round(img.width * k), h = Math.round(img.height * k);
      g.imageSmoothingEnabled = false;
      g.drawImage(img, Math.round((W - w) / 2), H - h, w, h);
      pesan.textContent = img.width === W && img.height === H ? "Gambar dimuat." : `Ukuran gambarmu ${img.width} x ${img.height}; sudah disesuaikan ke ${W} x ${H}. Periksa lagi hasilnya.`;
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { pesan.textContent = "Gambar itu tidak bisa dibuka."; URL.revokeObjectURL(url); };
    img.src = url;
  }

  function editor(status) {
    kanvas = el("canvas", "kanvas-desain"); kanvas.width = W; kanvas.height = H;
    kanvas.setAttribute("aria-label", "Kanvas desain rumah 96 kali 106 piksel");
    g = kanvas.getContext("2d", {willReadFrequently: true});
    if (gambarSimpanan) g.putImageData(gambarSimpanan, 0, 0); else mulaiDari((Perumahan.milikku() || {}).rumah || 0);
    riwayat = [];
    const bantu = el("canvas", "bantu-desain"); bantu.width = W; bantu.height = H; bantu.setAttribute("aria-hidden", "true");
    const b = bantu.getContext("2d");
    b.strokeStyle = "rgba(233,162,59,.95)"; b.setLineDash([2, 2]); b.lineWidth = 1;
    b.strokeRect(PINTU.x + .5, PINTU.y + .5, PINTU.w - 1, PINTU.h - 1);
    b.strokeStyle = "rgba(46,125,70,.9)"; b.beginPath(); b.moveTo(0, H - DINDING + .5); b.lineTo(W, H - DINDING + .5); b.stroke();
    const bingkai = el("div", "bingkai-desain"); bingkai.append(kanvas, bantu);

    let lalu = null;
    const posisi = e => { const r = kanvas.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * W), Math.floor((e.clientY - r.top) / r.height * H)]; };
    kanvas.addEventListener("pointerdown", e => {
      e.preventDefault(); kanvas.setPointerCapture(e.pointerId);
      const [x, y] = posisi(e);
      if (alat === "ambil") { const p = g.getImageData(x, y, 1, 1).data; if (p[3]) { warna = hex(p[0], p[1], p[2]); tandaiWarna(); } return; }
      simpanRiwayat();
      if (alat === "isi") { isi(x, y); return; }
      titik(x, y); lalu = [x, y];
    });
    kanvas.addEventListener("pointermove", e => { if (lalu) { const t = posisi(e); garis(lalu, t); lalu = t; } });
    for (const ev of ["pointerup", "pointercancel"]) kanvas.addEventListener(ev, () => { lalu = null; });

    // palet
    const palet = el("div", "palet"); palet.setAttribute("role", "radiogroup"); palet.setAttribute("aria-label", "Warna");
    const tandaiWarna = () => {
      [...palet.querySelectorAll("button")].forEach(t => t.setAttribute("aria-checked", String(t.dataset.w === warna)));
      pilihSendiri.value = warna.toLowerCase();
    };
    for (const w of PALET) {
      const t = el("button"); t.type = "button"; t.dataset.w = w; t.style.background = w; t.setAttribute("role", "radio"); t.setAttribute("aria-label", w);
      t.onclick = () => { warna = w; if (alat === "hapus" || alat === "ambil") pilihAlat("pensil"); tandaiWarna(); };
      palet.append(t);
    }
    const pilihSendiri = el("input"); pilihSendiri.type = "color"; pilihSendiri.setAttribute("aria-label", "Warna lain");
    pilihSendiri.oninput = () => { warna = pilihSendiri.value.toUpperCase(); tandaiWarna(); };
    palet.append(pilihSendiri);

    // alat
    const ALAT = [["pensil", "✏️ Pensil"], ["hapus", "🧽 Hapus"], ["isi", "🪣 Isi"], ["ambil", "💧 Ambil warna"]];
    const barisAlat = el("div", "alat-desain");
    const pilihAlat = a => { alat = a; [...barisAlat.querySelectorAll("[data-alat]")].forEach(t => t.setAttribute("aria-pressed", String(t.dataset.alat === a))); };
    for (const [a, teks] of ALAT) { const t = el("button", "tbl", teks); t.type = "button"; t.dataset.alat = a; t.onclick = () => pilihAlat(a); barisAlat.append(t); }
    const ukuran = el("button", "tbl", "Kuas 1 px"); ukuran.type = "button";
    ukuran.onclick = () => { kuas = kuas === 1 ? 2 : kuas === 2 ? 4 : 1; ukuran.textContent = `Kuas ${kuas} px`; };
    const urung = el("button", "tbl", "↶ Urungkan"); urung.type = "button"; urung.onclick = urungkan;
    barisAlat.append(ukuran, urung);
    pilihAlat(alat); tandaiWarna();

    // mulai dari model / impor
    const pesan = el("p", "pesan"); pesan.setAttribute("role", "status");
    const dasar = el("div", "alat-desain");
    const pilihDasar = el("select"); pilihDasar.setAttribute("aria-label", "Mulai dari");
    [["", "Mulai dari…"], ["0", "Model genteng merah"], ["1", "Model loteng oranye"], ["2", "Model bata merah"], ["3", "Model teras oranye"],
     ["4", "Model loteng merah"], ["5", "Model bata oranye"], ["kosong", "Kanvas kosong"]].forEach(([v, t]) => { const o = el("option", null, t); o.value = v; pilihDasar.append(o); });
    pilihDasar.onchange = () => { if (pilihDasar.value) { mulaiDari(pilihDasar.value === "kosong" ? "kosong" : Number(pilihDasar.value)); pilihDasar.value = ""; } };
    const berkas = el("input"); berkas.type = "file"; berkas.accept = "image/png,image/gif,image/webp"; berkas.className = "sr"; berkas.id = "impor-desain";
    berkas.onchange = () => { impor(berkas.files[0], pesan); berkas.value = ""; };
    const labelBerkas = el("label", "tbl", "📂 Impor PNG"); labelBerkas.htmlFor = "impor-desain";
    dasar.append(pilihDasar, labelBerkas, berkas);

    const info = [];
    if (status.menunggu) info.push(el("p", "berhasil", "Desainmu sebelumnya sedang menunggu persetujuan admin. Mengirim lagi akan menggantinya."));
    if (status.alasan_tolak) info.push(el("p", "pesan galat", "Desain terakhirmu belum disetujui: " + status.alasan_tolak));
    if (status.tayang) info.push(el("p", "redup", "Rumahmu sedang memakai desain sendiri."));
    const isiPanel = [...info,
      el("p", "redup", `Gambar rumahmu ${W} x ${H} piksel. Kotak oranye = pintu (tetap di situ supaya tamu bisa masuk). Di bawah garis hijau adalah dinding yang tidak bisa dilewati.`),
      bingkai, palet, barisAlat, dasar, pesan,
      el("p", "redup", "Desain ditinjau admin CodeIn dulu sebelum tampil di Perumahan. Gambar yang kasar, berisi tulisan iklan, atau meniru karya orang lain akan ditolak.")];
    const tombol = [{teks: "Kirim ke admin", utama: true, aksi: () => kirim()}, {teks: "Tutup", aksi: () => { gambarSimpanan = g.getImageData(0, 0, W, H); }}];
    if (status.tayang || status.menunggu) tombol.splice(1, 0, {teks: "Kembali ke model biasa", aksi: () => lepas()});
    Panel.buka("Desain rumahku", isiPanel, tombol);
  }

  async function buka() {
    if (!Akun.sudahWarga()) { Akun.pastikan("Mendesain rumah sendiri", buka); return; }
    if (!Perumahan.milikku()) { Panel.buka("Desain rumahku", [el("p", null, "Tempati kavling dulu di Perumahan CodeIn, baru rumahnya bisa kamu desain.")], [{teks: "Tutup"}]); return; }
    let status = {tayang: false, menunggu: false, alasan_tolak: ""};
    try { status = await Akun.ambil("/api/perumahan/desain/saya"); } catch (e) { /* server lama: anggap belum ada */ }
    editor(status);
  }
  async function kirim() {
    const data = kanvas.toDataURL("image/png");
    gambarSimpanan = g.getImageData(0, 0, W, H);
    Kota.kabar("Mengirim desain…");
    try {
      await Akun.kirim("/api/perumahan/desain", {png: data});
      gambarSimpanan = null;
      Panel.buka("Desain terkirim", [el("p", null, "Desain rumahmu sudah dikirim ke admin CodeIn. Setelah disetujui, rumahmu di Perumahan langsung berganti rupa."),
        el("p", "redup", "Sampai itu, rumahmu tetap memakai model yang sekarang.")], [{teks: "Siap"}]);
    } catch (e) {
      Panel.buka("Desain belum terkirim", [el("p", null, e instanceof TypeError ? "CodeIn News sedang tidak bisa dihubungi." : e.message), el("p", "redup", "Gambarmu masih tersimpan di editor.")],
        [{teks: "Buka editor lagi", utama: true, aksi: buka}, {teks: "Tutup"}]);
    }
  }
  async function lepas() {
    try {
      await Akun.kirim("/api/perumahan/desain/lepas", {});
      await Perumahan.muat().catch(() => {});
      if (Kota.ruang() === "perumahan") Perumahan.tataUlang();
      Kota.kabar("Rumahmu kembali ke model biasa.");
    } catch (e) { Kota.kabar("Belum berhasil: " + e.message); }
  }

  return {buka, tekstur, W, H};
})();

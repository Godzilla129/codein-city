/* CodeIn City · mancing di kolam Taman Kota dan danau/kolam Perumahan CodeIn.
   Berdiri di tepi air menghadap ke air, tombol aksi berubah jadi "Mancing". Alurnya:
     1. lempar kail  -> POST /api/mancing/lempar {tempat}. Server memilih ikannya (dirahasiakan) dan kapan umpan dimakan.
     2. tunggu       -> pelampung naik-turun. Menarik sebelum umpan dimakan membuat ikan kabur.
     3. umpan dimakan -> pelampung tenggelam, ada tanda seru. Tekan Tarik dalam waktu singkat.
     4. adu tarik    -> jarum bergerak bolak-balik; tekan saat jarum di zona hijau. Ikan yang lebih langka butuh lebih banyak
                        tekanan tepat dan jarumnya lebih cepat. Dua kali meleset, senarnya putus.
     5. hasil        -> POST /api/mancing/tarik {id, berhasil}. Ikan masuk tas (js/ekonomi.js).
   Air = petak lapisan "tanah" yang ubinnya berproperti air (danau dan kolam dari tools/buat_peta.py). Kolam air mancur tidak termasuk.
   Selama mancing, pemain tidak berjalan; tombol E, spasi, atau Enter = Tarik, Escape = selesai. */

const Mancing = (() => {
  const T = KOTA.ubin;
  const ARAH = {kiri: [-1, 0], kanan: [1, 0], atas: [0, -1], bawah: [0, 1]};
  const KESULITAN = {          // [waktu bereaksi (ms), tekanan tepat yang dibutuhkan, lebar zona hijau, lama satu ayunan jarum (ms)]
    1: [1600, 1, .34, 1500],
    2: [1350, 2, .26, 1150],
    3: [1150, 3, .2, 900],
  };
  let keadaan = null;          // null = tidak mancing; selain itu: lempar, tunggu, gigit, adu, kirim, hasil
  let lemparan = null, waktu = 0, gfx = null, riak = null, target = null, jarum = 0, zona = [0, 0];
  let tepat = 0, meleset = 0, sasaran = 1, seru = null;

  const aktif = () => keadaan !== null;
  // petak air di depan pemain (yang bisa dipancing). Mengembalikan [tx, ty] tile atau null.
  function airDepan(x, y, arah) {
    const sc = Kota.adegan(), peta = sc && sc.peta;
    if (!peta || !["kota", "perumahan"].includes(Kota.ruang())) return null;
    const [dx, dy] = ARAH[arah] || [0, 1];
    const air = (tx, ty) => { const t = peta.getTileAt(tx, ty, false, "tanah"); return !!(t && t.properties && t.properties.air); };
    for (const jauh of [12, 20]) {
      const tx = Math.floor((x + dx * jauh) / T), ty = Math.floor((y + 1 + dy * jauh) / T);
      if (!air(tx, ty)) continue;
      // pelampung jatuh sejauh mungkin (paling jauh 3 petak) selama masih di air, supaya tidak tertutup nama pemain
      let n = 0;
      while (n < 2 && air(tx + dx * (n + 1), ty + dy * (n + 1))) n++;
      return [tx + dx * n, ty + dy * n];
    }
    return null;
  }
  const bisa = () => { const p = Kota.posisi(); return p ? airDepan(p.x, p.y, p.arah) : null; };

  /* ---------- tampilan: kotak di bawah layar + tali pancing di peta ---------- */
  const kotak = $("mancing"), teks = $("mancing-teks"), bar = $("mancing-bar"), nyawa = $("mancing-nyawa");
  const tblTarik = $("mancing-tarik"), tblSelesai = $("mancing-selesai");
  function tulis(isi, kelas) { teks.replaceChildren(...[].concat(isi).map(t => typeof t === "string" ? document.createTextNode(t) : t)); teks.className = kelas || ""; }
  function tombol(tarikTeks, selesaiTeks = "Selesai") {
    tblTarik.hidden = !tarikTeks; if (tarikTeks) tblTarik.textContent = tarikTeks;
    tblSelesai.textContent = selesaiTeks;
  }

  function gambarTali(dt) {
    if (!gfx || !target) return;
    const p = Kota.posisi(); if (!p) return;
    const [dx, dy] = ARAH[p.arah];
    // joran dipegang tangan kanan: pangkal di samping badan, ujung condong ke arah air (tidak menutupi kepala)
    const sisi = dy ? 6 : 0, px = p.x + dx * 4 + sisi, py = p.y - 5;
    const ux = p.x + dx * 13 + sisi + (dy ? 2 : 0), uy = p.y - 15 + (dy > 0 ? 10 : 0);
    const bx = target[0] * T + 8, dasarY = target[1] * T + 9;
    waktu += dt;
    let by = dasarY + Math.sin(waktu / 380) * .8;                  // terapung, naik-turun pelan
    if (keadaan === "gigit") by = dasarY + 2 + Math.sin(waktu / 60) * 1.2;   // ditarik ikan: tenggelam dan bergetar
    if (keadaan === "adu") by = dasarY + 1.5 + Math.sin(waktu / 45);
    gfx.clear();
    gfx.lineStyle(1, 0x5A3D22, 1).lineBetween(px, py, ux, uy);                       // joran
    gfx.lineStyle(1, 0xffffff, .8).lineBetween(ux, uy, bx, by - 2);                   // senar
    // pelampung 4 x 5: merah di atas, putih di bawah, bergaris tepi gelap
    const ax = Math.round(bx) - 2, ay = Math.round(by) - 4;
    gfx.fillStyle(0x2A211B).fillRect(ax - 1, ay - 1, 6, 7);
    gfx.fillStyle(0xE5483B).fillRect(ax, ay, 4, 3);
    gfx.fillStyle(0xffffff).fillRect(ax, ay + 3, 4, 2);
    gfx.setDepth(10 + Math.max(p.y, by) + 1);
    riak.setPosition(bx, dasarY + 2);
  }
  function pasangTali(tile) {
    const sc = Kota.adegan();
    target = tile; waktu = 0;
    gfx = sc.add.graphics();
    riak = sc.add.ellipse(0, 0, 10, 4).setStrokeStyle(1, 0xffffff, .6).setDepth(5);
    sc.tweens.add({targets: riak, scaleX: 1.8, scaleY: 1.8, alpha: 0, duration: 1400, repeat: -1});
  }
  function lepasTali() {
    [gfx, riak].forEach(o => { if (o && o.scene) o.destroy(); });
    gfx = riak = target = null;
    lepasSeru();
  }

  /* ---------- alur ---------- */
  let ketukLalu = 0;
  function mulai() {
    if (aktif()) return;
    const tile = bisa();
    if (!tile) return;
    Akun.pastikan("Mancing", () => lempar(tile));
  }
  async function lempar(tile = target || bisa()) {
    if (!tile) { selesai(); return; }
    keadaan = "lempar"; lemparan = null;
    kotak.hidden = false; bar.hidden = true; nyawa.textContent = "";
    tulis("Melempar kail…"); tombol(null, "Batal");
    if (!target) pasangTali(tile);
    try {
      const l = await Akun.kirim("/api/mancing/lempar", {tempat: Kota.ruang()});
      if (keadaan !== "lempar") return;           // dibatalkan saat menunggu server
      lemparan = l; keadaan = "tunggu";
      tulis("Tunggu umpannya dimakan…"); tombol("Tarik");
      lemparan.gigit = performance.now() + l.gigit_ms;
    } catch (e) {
      if (keadaan !== "lempar") return;
      if (e.status === 401 || e.status === 403) { selesai(); Akun.pastikan("Mancing", () => lempar(tile)); return; }
      tulis(e instanceof TypeError ? "CodeIn News sedang tidak bisa dihubungi. Coba lagi sebentar." : e.message); tombol(null, "Tutup");
      keadaan = "hasil";
    }
  }
  function gigit() {
    keadaan = "gigit"; waktu = 0;
    const [reaksi] = KESULITAN[lemparan.kesulitan] || KESULITAN[1];
    lemparan.batas = performance.now() + reaksi;
    tulis("Umpannya dimakan! Tarik sekarang!", "seru"); tombol("Tarik!");
    // tanda seru di atas pelampung
    const bx = target[0] * T + 8, by = target[1] * T;
    seru = Kota.tempelkan(el("div", "seru-ikan", "!"), () => [bx, by - 2]);
    if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) { /* tidak apa-apa */ }
  }
  function zonaBaru() {
    const lebar = (KESULITAN[lemparan.kesulitan] || KESULITAN[1])[2], tengah = .2 + Math.random() * .6;
    zona = [tengah - lebar / 2, tengah + lebar / 2];
    bar.querySelector(".zona").style.left = zona[0] * 100 + "%";
    bar.querySelector(".zona").style.width = lebar * 100 + "%";
  }
  function adu() {
    keadaan = "adu"; tepat = 0; meleset = 0; jarum = 0;
    sasaran = (KESULITAN[lemparan.kesulitan] || KESULITAN[1])[1];
    lemparan.mulaiAdu = performance.now();
    bar.hidden = false; zonaBaru();
    tulis(sasaran > 1 ? `Ikannya melawan! Tekan saat jarum di hijau (${sasaran} kali).` : "Tekan saat jarum di zona hijau!"); tombol("Tarik!");
    perbaruiNyawa();
  }
  function lepasSeru() { if (seru) { Kota.lepaskan(seru); seru = null; } }
  function perbaruiNyawa() { nyawa.textContent = `Tepat ${tepat}/${sasaran}` + (meleset ? " · senar tegang!" : ""); }

  function tekan() {
    const kini = performance.now();
    if (kini - ketukLalu < 120) return;            // ketukan ganda di HP
    ketukLalu = kini;
    if (keadaan === "tunggu") { kirim(false, "Terlalu cepat ditarik, ikannya kabur."); return; }
    if (keadaan === "gigit") { adu(); return; }
    if (keadaan === "adu") {
      lepasSeru();
      if (jarum >= zona[0] && jarum <= zona[1]) {
        tepat++; perbaruiNyawa();
        if (tepat >= sasaran) { kirim(true); return; }
        zonaBaru();
      } else {
        meleset++; perbaruiNyawa();
        if (meleset >= 2) { kirim(false, "Senarnya putus! Ikannya lepas."); return; }
      }
      return;
    }
    if (keadaan === "hasil") lempar();
  }
  async function kirim(berhasil, alasan) {
    keadaan = "kirim"; bar.hidden = true; nyawa.textContent = "";
    lepasSeru();
    tulis(berhasil ? "Menarik…" : alasan); tombol(null, "Tunggu");
    let h = null;
    try { h = await Akun.kirim("/api/mancing/tarik", {id: lemparan.id, berhasil}); }
    catch (e) { h = {lepas: true, alasan: e.message}; }
    if (keadaan !== "kirim") return;
    keadaan = "hasil";
    if (h.ikan) {
      Ekonomi.tambah(h.ikan);
      const kartu = el("span", "tangkapan");
      kartu.append(Barang.ikon(h.ikan.kode, "ikon-barang besar"),
        el("b", null, h.ikan.nama), el("span", null, ` · ${Barang.langka(h.ikan.langka)} · ${h.ikan.harga ? h.ikan.harga + " koin" : "tidak laku"}`));
      tulis([h.ikan.harga ? "Dapat! " : "Yah… ", kartu, h.sisa_hari_ini <= 5 ? ` Sisa ${h.sisa_hari_ini} tangkapan hari ini.` : ""]);
      Kota.ucap(h.ikan.langka === "langka" ? `Wah, ${h.ikan.nama}!` : h.ikan.harga ? `Dapat ${h.ikan.nama}!` : `Dapat ${h.ikan.nama.toLowerCase()}…`);
    } else tulis(berhasil ? h.alasan || "Ikannya lepas." : alasan);
    tombol("Lempar lagi");
  }
  function selesai() {
    if (keadaan === "tunggu" || keadaan === "gigit" || keadaan === "adu") Akun.kirim("/api/mancing/tarik", {id: lemparan.id, berhasil: false}).catch(() => {});
    keadaan = null; lemparan = null; kotak.hidden = true;
    lepasSeru();
    lepasTali();
    Kota.segarkanAksi();
  }

  Kota.tiapBingkai(dt => {
    if (!aktif()) return;
    gambarTali(dt);
    const kini = performance.now();
    if (keadaan === "tunggu" && kini >= lemparan.gigit) gigit();
    else if (keadaan === "gigit" && kini > lemparan.batas) kirim(false, "Kelamaan, ikannya lepas.");
    else if (keadaan === "adu") {
      const ayun = (KESULITAN[lemparan.kesulitan] || KESULITAN[1])[3];
      jarum = (1 - Math.cos((kini - lemparan.mulaiAdu) / ayun * Math.PI)) / 2;      // 0..1 bolak-balik
      bar.querySelector(".jarum").style.left = jarum * 100 + "%";
      if (kini - lemparan.mulaiAdu > 20000) kirim(false, "Ikannya kelelahan dan lepas sendiri.");
    }
  });
  Kota.tahan(aktif);
  Kota.saatSiap(() => { keadaan = null; lemparan = null; kotak.hidden = true; gfx = riak = target = seru = null; });

  tblTarik.onclick = () => { tekan(); };
  tblSelesai.onclick = () => { if (keadaan !== "kirim") selesai(); };
  addEventListener("keydown", e => {
    if (!aktif() || Panel.terbuka()) return;
    if (e.code === "Escape") { e.preventDefault(); if (keadaan !== "kirim") selesai(); return; }
    if (e.code === "KeyE" || e.code === "Space" || e.code === "Enter") {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!e.repeat) tekan();
    }
  }, true);

  return {aktif, bisa, mulai};
})();

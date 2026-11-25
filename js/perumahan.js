/* CodeIn City · Perumahan CodeIn: rumah untuk warga terdaftar (js/akun.js).
   Peta perumahan.tmj (lewat Gerbang Selatan) berisi 24 kavling Blok A. Setiap pintu "kav-<kode>" menyimpan letak kavlingnya
   (properti kiri, bawah = pojok kiri bawah rumah). Data dari CodeIn News:
     GET  /api/perumahan          -> kavling terisi (pemilik: kode warga, nama, karakter; rumah = model 0-5) dan kosong
     POST /api/perumahan/klaim    -> warga menempati satu kavling kosong (satu warga satu kavling), rumah starter langsung jadi
     PUT  /api/perumahan/model    -> ganti model rumah sendiri
     PUT  /api/perumahan/kunci    -> pemilik mengunci atau membuka pintu rumahnya (lewat gantungan kunci di dalam rumah)
   Kavling terisi digambar dengan rumah dari atlas (rumah-0 .. rumah-5) dan nama pemiliknya; kavling kosong dengan tanah berpatok.
   Semua rumah memakai satu peta dalam "rumah.tmj"; Perumahan.kini() = kode rumah yang sedang dikunjungi. */

const Perumahan = (() => {
  const T = KOTA.ubin;
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = ((lokal && new URLSearchParams(location.search).get("api")) || KOTA.news).replace(/\/+$/, "");
  const MODEL = ["Genteng merah", "Loteng oranye", "Bata merah", "Teras oranye", "Loteng merah", "Bata oranye"];   // rumah-0 .. rumah-5 di atlas
  const DINDING = 45;                    // tinggi dinding rumah (piksel); atapnya bisa dilewati di belakangnya

  let data = null, dimuat = 0, memuat = null;      // data = {kode: kavling}
  let adegan = null, ruang = null, kini = null, gambar = {}, jedaMuat = 0;
  let selisihJam = 0;                    // jam server - jam perangkat (detik), untuk umur tanaman kebun
  const saatTataList = [];               // dipanggil setelah kavling digambar ulang (js/kebun.js)

  async function muat() {
    if (memuat) return memuat;
    memuat = (async () => {
      try {
        const r = await fetch(API + "/api/perumahan", {headers: {Accept: "application/json"}});
        if (!r.ok) throw new Error("kode " + r.status);
        const d = await r.json();
        data = Object.fromEntries(d.kavling.map(k => [k.kode, k])); dimuat = Date.now();
        if (typeof d.kini === "number") selisihJam = d.kini - Date.now() / 1000;
      } finally { memuat = null; }
      return data;
    })();
    return memuat;
  }
  const milikku = () => {
    const w = Akun.sudahWarga() && Akun.warga();
    return w && data ? Object.values(data).find(k => k.pemilik && k.pemilik.kode === w.kode) || null : null;
  };

  /* ---------- gambar kavling di peta perumahan ---------- */
  function hapusGambar(kode) {
    const g = gambar[kode];
    if (!g) return;
    g.benda.forEach(b => b.destroy());
    g.padat.forEach(z => z && z.destroy());
    delete gambar[kode];
  }
  function gambarKavling(p, baru) {
    const k = data && data[p.kavling];
    hapusGambar(p.kavling);
    if (!k || !adegan) return;
    const g = gambar[p.kavling] = {benda: [], padat: []};
    if (k.pemilik) {
      const r = adegan.add.image(p.kiri, p.bawah, "benda", `rumah-${k.rumah || 0}`).setOrigin(0, 1).setDepth(10 + p.bawah);
      g.benda.push(r);
      g.padat.push(Kota.padatkan(p.kiri + 4, p.bawah - DINDING + 8, 6 * T - 8, DINDING - 8));
      if (baru) { r.setAlpha(0).setScale(1, .6).setY(p.bawah); adegan.tweens.add({targets: r, alpha: 1, scaleY: 1, duration: 650, ease: "Back.easeOut"}); }
    } else {
      g.benda.push(adegan.add.image(p.kiri + 4, p.bawah - 2, "benda", "kavling-kosong").setOrigin(0, 1).setDepth(4));
      const px = p.kiri + 4 * T + 1, pb = p.bawah + 13;          // papan kecil di halaman depan, di kanan jalan setapak
      g.benda.push(adegan.add.image(px, pb, "benda", "papan-kavling").setOrigin(0, 1).setDepth(10 + pb));
      g.padat.push(Kota.padatkan(px + 5, pb - 4, 4, 4));
    }
    tulisLabel(p);
  }
  function tulisLabel(p) {
    if (!p.labelEl) return;
    const k = data && data[p.kavling], saya = milikku();
    p.nama = k && k.pemilik ? `Rumah ${k.pemilik.nama}` : `Kavling ${p.kavling}`;
    p.labelEl.textContent = k && k.pemilik ? (k.terkunci ? "🔒 " : "") + p.nama : `${p.nama} · kosong`;
    p.labelEl.classList.toggle("kosong", !(k && k.pemilik));
    p.labelEl.classList.toggle("milikku", !!(saya && saya.kode === p.kavling));
  }
  function tataSemua(baru) {
    for (const p of Kota.pintu()) if (p.tujuan === "kavling") gambarKavling(p, baru === p.kavling);
    saatTataList.forEach(f => { try { f(); } catch (e) { console.error(e); } });
    Kota.segarkanAksi();
  }

  /* ---------- pintu kavling ---------- */
  function teksAksi(p) {
    const k = data && data[p.kavling], saya = milikku();
    if (!k) return `Lihat kavling ${p.kavling}`;
    if (!k.pemilik) return `Lihat kavling ${p.kavling}`;
    if (saya && saya.kode === p.kavling) return "Masuk rumahku";
    return k.terkunci ? `Ketuk pintu rumah ${k.pemilik.nama}` : `Bertamu ke rumah ${k.pemilik.nama}`;
  }
  function masukRumah(kode) {
    kini = kode;
    Kota.keTempat("rumah", null);
  }
  async function buka(p) {
    if (!data) {
      try { await muat(); } catch (e) { Panel.buka(p.nama, [el("p", null, "Data Perumahan belum bisa diambil dari CodeIn News. Coba lagi sebentar.")], [{teks: "Tutup"}]); return; }
      tataSemua();
    }
    const k = data[p.kavling];
    if (!k) return;
    if (k.pemilik) {
      const saya = milikku();
      if (k.terkunci && !(saya && saya.kode === k.kode)) {
        Panel.buka(`Rumah ${k.pemilik.nama}`, [el("p", null, "Tok, tok."), el("p", null, `Pintunya dikunci. ${k.pemilik.nama} sedang tidak menerima tamu.`)], [{teks: "Tutup"}]);
        return;
      }
      masukRumah(k.kode); return;
    }
    if (!Akun.sudahWarga()) { Akun.pastikan("Menempati rumah di Perumahan CodeIn", () => buka(p)); return; }
    const saya = milikku();
    if (saya) {
      Panel.buka(`Kavling ${k.kode}`, [el("p", null, `Kavling ini masih kosong. Kamu sudah punya rumah di kavling ${saya.kode}; satu warga satu kavling.`)],
        [{teks: "Pulang ke rumahku", utama: true, aksi: () => pulang()}, {teks: "Tutup"}]);
      return;
    }
    tawarkan(p, k);
  }

  // pratinjau rumah dari atlas, digambar ke kanvas kecil untuk pilihan model
  function pratinjau(i) {
    const f = adegan.textures.getFrame("benda", `rumah-${i}`), c = document.createElement("canvas");
    c.width = f.cutWidth; c.height = f.cutHeight; c.className = "pratinjau-rumah";
    c.getContext("2d").drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
    return c;
  }
  function pilihanModel(awal, saatPilih) {
    const kotak = el("div", "pilih-rumah"); kotak.setAttribute("role", "radiogroup"); kotak.setAttribute("aria-label", "Model rumah");
    let pilih = awal;
    const tandai = () => [...kotak.children].forEach((b, i) => { b.setAttribute("aria-checked", String(i === pilih)); b.tabIndex = i === pilih ? 0 : -1; });
    MODEL.forEach((nama, i) => {
      const b = el("button", "rumah-pilihan"); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-label", nama); b.title = nama;
      b.append(pratinjau(i));
      b.onclick = () => { pilih = i; tandai(); saatPilih(i); };
      kotak.append(b);
    });
    kotak.addEventListener("keydown", e => {
      const geser = {ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1}[e.key];
      if (!geser) return;
      e.preventDefault(); e.stopPropagation();
      pilih = (pilih + geser + MODEL.length) % MODEL.length; tandai(); saatPilih(pilih); kotak.children[pilih].focus();
    });
    tandai();
    return kotak;
  }

  function tawarkan(p, k, pesan) {
    let model = Math.floor(Math.random() * MODEL.length);
    const ket = el("p", "pesan"); ket.setAttribute("role", "status"); if (pesan) ket.textContent = pesan;
    const isi = [el("p", null, `Kavling ${k.kode} masih kosong. Tempati kavling ini dan rumah starter langsung berdiri, gratis. Satu warga satu kavling, jadi pilih yang kamu suka.`),
      el("p", "redup", "Pilih model rumahmu"), pilihanModel(model, i => { model = i; }), ket];
    Panel.buka(`Kavling ${k.kode}`, isi, [{teks: "Tempati kavling ini", utama: true, aksi: async () => {
      Kota.kabar("Menyiapkan rumahmu…");
      try {
        const hasil = await Akun.kirim("/api/perumahan/klaim", {kavling: k.kode, rumah: model});
        await muat().catch(() => { data[k.kode] = {...k, rumah: hasil.rumah, pemilik: {kode: Akun.warga().kode, nama: Akun.warga().nama, karakter: Akun.warga().karakter}}; });
        if (Kota.ruang() === "perumahan") tataSemua(k.kode);
        Kota.kabar(`Rumahmu di kavling ${k.kode} sudah berdiri.`);
        Kota.ucap("Ini rumahku!");
      } catch (e) {
        if (e.status === 401) { Akun.pastikan("Menempati rumah di Perumahan CodeIn", () => buka(p)); return; }
        await muat().catch(() => {});
        if (Kota.ruang() === "perumahan") tataSemua();
        const k2 = data && data[k.kode];
        if (k2 && !k2.pemilik && e.status !== 409) tawarkan(p, k2, "Belum berhasil: " + (e instanceof TypeError ? "CodeIn News sedang tidak bisa dihubungi." : e.message));
        else Panel.buka(`Kavling ${k.kode}`, [el("p", null, e.message)], [{teks: "Tutup"}]);
      }
    }}, {teks: "Nanti saja"}]);
  }

  /* ---------- pulang ---------- */
  async function pulang() {
    if (!Akun.sudahWarga()) { Akun.pastikan("Punya rumah di Perumahan CodeIn", pulang); return; }
    try { await muat(); } catch (e) { Kota.kabar("Data Perumahan belum bisa diambil. Coba lagi sebentar."); return; }
    const saya = milikku();
    if (!saya) {
      Kota.keTempat("perumahan", "gerbang-kota");
      Kota.kabar("Kamu belum punya rumah. Pilih kavling yang masih kosong, ya.");
      return;
    }
    if (Kota.ruang() === "rumah" && kini === saya.kode) { Kota.kabar("Kamu sudah di rumah."); return; }
    Kota.keTempat("perumahan", "kav-" + saya.kode);
  }
  function tombolPulang() {
    if (!Akun.nyala()) return null;
    const b = el("button", "tbl utama pulang", "Pulang ke rumahku"); b.type = "button";
    b.onclick = () => { Panel.tutup(); if (document.activeElement) document.activeElement.blur(); pulang(); };
    return b;
  }

  /* ---------- kunci rumah: gantungan kunci di dalam rumah ---------- */
  const rumahKini = () => data && kini ? data[kini] : null;
  const pemilikKini = () => { const k = rumahKini(), saya = milikku(); return !!(k && saya && saya.kode === k.kode); };
  function teksKunci() {
    if (!pemilikKini()) return "Lihat gantungan kunci";
    return rumahKini().terkunci ? "Buka kunci pintu" : "Kunci pintu rumah";
  }
  function aturKunci() {
    const k = rumahKini();
    if (!k || !k.pemilik) return;
    if (!pemilikKini()) {
      Panel.buka("Gantungan kunci", [el("p", null, `Kunci rumah ini dipegang ${k.pemilik.nama}. Hanya pemilik yang bisa mengunci atau membuka pintunya.`)], [{teks: "Tutup"}]);
      return;
    }
    const kunci = !k.terkunci;
    const isi = [el("p", null, k.terkunci
      ? "Pintu rumahmu sedang terkunci: warga lain dan tamu tidak bisa masuk. Mereka hanya bisa mengetuk pintu."
      : "Pintu rumahmu sedang terbuka: siapa pun boleh bertamu."),
      el("p", "redup", "Tamu yang sudah di dalam tetap di dalam sampai mereka keluar.")];
    Panel.buka("Kunci rumah", isi, [{teks: kunci ? "Kunci pintu" : "Buka kunci", utama: true, aksi: async () => {
      try {
        await Akun.kirim("/api/perumahan/kunci", {terkunci: kunci}, "PUT");
        data[k.kode] = {...k, terkunci: kunci};
        muat().catch(() => {});
        Kota.segarkanAksi();
        Kota.kabar(kunci ? "Pintu rumahmu sudah dikunci." : "Pintu rumahmu terbuka lagi untuk tamu.");
      } catch (e) {
        Kota.kabar("Belum berhasil: " + (e instanceof TypeError ? "CodeIn News sedang tidak bisa dihubungi." : e.message));
      }
    }}, {teks: "Tutup"}]);
  }

  /* ---------- satpam di gapura: keterangan perumahan ---------- */
  async function satpam() {
    await muat().catch(() => {});
    const isi = [], tombol = [];
    if (data) {
      const terisi = Object.values(data).filter(k => k.pemilik).length, jumlah = Object.keys(data).length;
      isi.push(el("p", null, `Selamat datang di Perumahan CodeIn. Blok A punya ${jumlah} kavling; ${terisi ? terisi + " sudah ditempati warga" : "belum ada yang menempati"}.`));
    } else isi.push(el("p", null, "Selamat datang di Perumahan CodeIn."));
    const saya = milikku();
    if (saya) {
      isi.push(el("p", null, `Rumahmu di kavling ${saya.kode}, model ${MODEL[saya.rumah || 0].toLowerCase()}.`));
      tombol.push({teks: "Antar ke rumahku", utama: true, aksi: pulang}, {teks: "Ganti model rumah", aksi: () => gantiModel(saya)});
    } else if (Akun.sudahWarga()) {
      isi.push(el("p", null, "Kamu belum punya rumah. Datangi kavling yang bertanda papan kecil, lalu tempati. Rumah starternya gratis."));
    } else {
      isi.push(el("p", null, "Rumah di sini khusus warga, yaitu anggota yang sudah masuk dengan akun Google. Tamu boleh jalan-jalan dan bertamu ke rumah warga."));
      if (Akun.nyala()) tombol.push({teks: "Masuk sebagai warga", utama: true, aksi: () => Akun.pastikan("Menempati rumah di Perumahan CodeIn", satpam)});
    }
    tombol.push({teks: "Tutup"});
    Panel.buka("Pak Darto, satpam perumahan", isi, tombol);
  }
  function gantiModel(saya) {
    let model = saya.rumah || 0;
    const ket = el("p", "pesan"); ket.setAttribute("role", "status");
    Panel.buka("Model rumahku", [el("p", null, `Rumah di kavling ${saya.kode}. Pilih model barunya; isi rumah tidak berubah.`), pilihanModel(model, i => { model = i; }), ket],
      [{teks: "Simpan model", utama: true, aksi: async () => {
        try {
          await Akun.kirim("/api/perumahan/model", {rumah: model}, "PUT");
          await muat().catch(() => {});
          if (Kota.ruang() === "perumahan") tataSemua(saya.kode);
          Kota.kabar("Rumahmu sudah direnovasi.");
        } catch (e) { Kota.kabar("Belum berhasil: " + e.message); }
      }}, {teks: "Batal"}]);
  }

  /* ---------- peta dimuat ---------- */
  Kota.saatSiap(({adegan: sc, ruang: r}) => {
    adegan = sc; ruang = r; gambar = {};
    if (r === "perumahan") {
      jedaMuat = 60000;
      if (data) tataSemua();
      muat().then(() => { if (adegan === sc && ruang === "perumahan") tataSemua(); }).catch(() => Kota.kabar("Data Perumahan belum bisa diambil dari CodeIn News."));
    } else if (r === "rumah") {
      const k = data && data[kini];
      const keluar = Kota.pintu().find(p => p.id === "keluar");
      if (keluar) keluar.ke = "kav-" + kini;          // keluar rumah: muncul lagi di depan kavlingnya
      const nama = k && k.pemilik ? k.pemilik.nama : "warga";
      const plakat = el("div", "papan rumah", `Rumah ${nama} · ${kini || ""}`);
      Kota.tempelkan(plakat, () => [7 * T, T + 6]);
      const saya = milikku();
      Kota.kabar(saya && saya.kode === kini ? "Selamat datang di rumahmu." : `Kamu bertamu ke rumah ${nama}.`);
    } else kini = null;
  });
  // selama di perumahan, data disegarkan tiap menit (rumah warga lain yang baru berdiri ikut muncul)
  Kota.tiapBingkai(dt => {
    if (ruang !== "perumahan" || (jedaMuat -= dt) > 0) return;
    jedaMuat = 60000;
    muat().then(() => { if (ruang === "perumahan") tataSemua(); }).catch(() => {});
  });
  // masuk atau keluar akun: label "rumahku" dan tombol aksi ikut berubah
  Akun.saatBerubah(() => {
    if (ruang !== "perumahan" || !data) return;
    for (const p of Kota.pintu()) if (p.tujuan === "kavling") tulisLabel(p);
    Kota.segarkanAksi();
  });

  return {buka, teksAksi, teksKunci, aturKunci, pulang, tombolPulang, satpam, kini: () => kini, data: () => data, muat, pemilikKini, milikku,
    jamServer: () => Date.now() / 1000 + selisihJam, saatTata: f => saatTataList.push(f)};
})();

/* CodeIn City · buku tamu rumah warga di Perumahan CodeIn.
   Kotak surat di halaman setiap rumah berpenghuni adalah buku tamunya. Tamu yang sudah login boleh menulis satu salam
   singkat (pilih salam siap pakai atau tulis sendiri, maks. 80 huruf) sekali sehari per rumah. Pemilik membaca semua
   tulisan dan boleh menghapusnya; di Gerbang CodeIn pemilik disapa dengan jumlah tulisan baru dan tamu yang mampir.
   Menulis tidak memberi koin. Data dari CodeIn News (dashboard/services/bukutamu.py):
     GET    /api/bukutamu/<kavling>          -> {pemilik, milikku, tulisan: [{id, isi, waktu, penulis}], bisaLagi}
     POST   /api/bukutamu/<kavling>          -> {isi}
     DELETE /api/bukutamu/<kavling>/<id>     -> pemilik rumah atau penulisnya
     POST   /api/bukutamu/<kavling>/mampir   -> dicatat saat warga masuk rumah warga lain
     GET    /api/bukutamu/saya/ringkas       -> {kavling, baru, mampir}
     PUT    /api/bukutamu/saya/dibaca        -> pemilik sudah membuka buku tamunya */

const BukuTamu = (() => {
  const T = KOTA.ubin;
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = ((lokal && new URLSearchParams(location.search).get("api")) || KOTA.news).replace(/\/+$/, "");
  const SALAM = ["Rumahnya keren!", "Salam kenal, tetangga!", "Kebunnya subur banget.", "Semangat ngodingnya!",
                 "Mampir sebentar, makasih ya.", "Kapan-kapan main ke rumahku."];
  const MAKS = 80;
  let ringkasan = null;

  const kav = p => (Perumahan.data() || {})[p.kavling];
  const lalu = detik => {
    const s = Math.max(0, Date.now() / 1000 - detik);
    if (s < 90) return "baru saja";
    if (s < 3600) return `${Math.round(s / 60)} menit lalu`;
    if (s < 86400) return `${Math.round(s / 3600)} jam lalu`;
    if (s < 86400 * 7) return `${Math.round(s / 86400)} hari lalu`;
    return new Date(detik * 1000).toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "Asia/Jakarta"});
  };
  const jamWIB = detik => new Date(detik * 1000).toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"});

  /* ---------- kotak surat di halaman rumah ---------- */
  function kotakSurat(p) {
    const peta = Kota.adegan() && Kota.adegan().peta;
    if (!peta) return null;
    const x0 = Math.round(p.kiri / T), ty = Math.round(p.bawah / T);
    for (const dx of [0, 5, 1, 4]) {
      const h = peta.getTileAt(x0 + dx, ty, false, "hiasan");
      if (h && h.index > 0) return {tx: x0 + dx, ty};
    }
    return null;
  }
  function pasang() {
    if (Kota.ruang() !== "perumahan") return;
    const data = Perumahan.data() || {}, pintu = Kota.pintu();
    for (let i = pintu.length - 1; i >= 0; i--) if (pintu[i].tujuan === "bukutamu") pintu.splice(i, 1);
    for (const p of pintu.filter(p => p.tujuan === "kavling")) {
      const k = data[p.kavling], s = k && k.pemilik && kotakSurat(p);
      if (!s) continue;
      pintu.push({id: `bukutamu-${k.kode}`, nama: `Buku tamu ${k.pemilik.nama}`, aksi: "panel", tujuan: "bukutamu", kavling: k.kode,
                  x: s.tx * T, y: s.ty * T, w: T, h: T, tanpaLabel: true});
    }
    Kota.segarkanAksi();
  }
  function teksAksi(p) {
    const k = kav(p), saya = Perumahan.milikku();
    if (saya && saya.kode === p.kavling) return ringkasan && ringkasan.baru ? `📬 Buku tamuku (${ringkasan.baru} baru)` : "📬 Buku tamuku";
    return k && k.pemilik ? `📬 Buku tamu ${k.pemilik.nama}` : "Kotak surat";
  }

  /* ---------- dialog ---------- */
  async function ambil(kavling) {
    if (Akun.sudahWarga()) return Akun.ambil(`/api/bukutamu/${kavling}`);
    const r = await fetch(`${API}/api/bukutamu/${kavling}`, {headers: {Accept: "application/json"}});
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || `Server menolak (kode ${r.status}).`), {status: r.status});
    return d;
  }
  function baris(t, bolehHapus, kavling) {
    const li = el("li", "tamu-baris");
    const muka = el("span", "muka kecil"); muka.style.backgroundPosition = `calc(var(--s) * -16px) calc(var(--s) * -${(t.penulis.karakter || 0) * 48}px)`;
    const isi = el("div", "tamu-isi");
    const kepala = el("div", "tamu-kepala"); kepala.append(el("b", null, t.penulis.nama), el("span", "redup", lalu(t.waktu)));
    isi.append(kepala, el("p", null, t.isi));
    li.append(muka, isi);
    if (bolehHapus) {
      const h = el("button", "tbl kecil", "Hapus"); h.type = "button"; h.setAttribute("aria-label", `Hapus tulisan ${t.penulis.nama}`);
      h.onclick = async () => {
        h.disabled = true;
        try { await Akun.kirim(`/api/bukutamu/${kavling}/${t.id}`, {}, "DELETE"); li.remove(); }
        catch (e) { h.disabled = false; Kota.kabar("Belum terhapus: " + e.message); }
      };
      li.append(h);
    }
    return li;
  }
  async function buka(p, pesan) {
    const k = kav(p);
    if (!k || !k.pemilik) return;
    let d;
    try { d = await ambil(p.kavling); }
    catch (e) {
      Panel.buka(`Buku tamu ${k.pemilik.nama}`, [el("p", null, e.status === 403 ? e.message
        : e instanceof TypeError ? "CodeIn News sedang tidak bisa dihubungi. Coba lagi sebentar." : e.message)], [{teks: "Tutup"}]);
      return;
    }
    const w = Akun.sudahWarga() ? Akun.warga() : null;
    const isi = [];
    if (pesan) { const s = el("p", "pesan"); s.setAttribute("role", "status"); s.textContent = pesan; isi.push(s); }
    isi.push(el("p", "redup", d.milikku ? "Ini buku tamu rumahmu. Tulisan tamu muncul di sini, dan kamu boleh menghapusnya."
      : `Tinggalkan salam untuk ${d.pemilik}. Satu tulisan per hari, dan pemiliknya akan melihatnya saat datang ke kota.`));
    const ul = el("ul", "buku-tamu");
    d.tulisan.forEach(t => ul.append(baris(t, d.milikku || (w && t.penulis.kode === w.kode), p.kavling)));
    if (!d.tulisan.length) ul.append(el("li", "redup kosong", d.milikku ? "Belum ada tamu yang menulis. Ajak teman mampir, ya." : "Belum ada tulisan. Jadilah yang pertama."));
    const tombol = [{teks: "Tutup"}];
    if (!d.milikku) {
      if (!w) {
        isi.push(ul);
        tombol.unshift({teks: "Masuk untuk menulis", utama: true, aksi: () => Akun.pastikan(`Menulis di buku tamu ${d.pemilik}`, () => buka(p))});
      } else if (d.bisaLagi) {
        isi.push(el("p", "catatan-tamu", `Kamu sudah menulis hari ini. Bisa menulis lagi besok mulai pukul ${jamWIB(d.bisaLagi)} WIB.`), ul);
      } else {
        isi.push(formulir(p, d), ul);
      }
    } else {
      isi.push(ul);
      Akun.kirim("/api/bukutamu/saya/dibaca", {}, "PUT").then(() => { if (ringkasan) { ringkasan.baru = 0; ringkasan.mampir = 0; } Kota.segarkanAksi(); }).catch(() => {});
    }
    Panel.buka(d.milikku ? "Buku tamu rumahku" : `Buku tamu ${d.pemilik}`, isi, tombol);
  }
  function formulir(p, d) {
    const f = el("form", "tulis-tamu");
    const pil = el("div", "salam-siap"); pil.setAttribute("role", "group"); pil.setAttribute("aria-label", "Salam siap pakai");
    const masukan = el("input"); masukan.type = "text"; masukan.maxLength = MAKS; masukan.placeholder = "Tulis salammu sendiri";
    masukan.setAttribute("aria-label", "Salam untuk buku tamu"); masukan.autocomplete = "off";
    const sisa = el("span", "redup sisa", `0/${MAKS}`);
    const hitung = () => { sisa.textContent = `${masukan.value.length}/${MAKS}`; };
    masukan.addEventListener("input", hitung);
    SALAM.forEach(s => {
      const b = el("button", "chip", s); b.type = "button";
      b.onclick = () => { masukan.value = s; hitung(); masukan.focus(); };
      pil.append(b);
    });
    const kirim = el("button", "tbl utama", "Tulis di buku tamu"); kirim.type = "submit";
    const baris = el("div", "tulis-baris"); baris.append(masukan, kirim);
    const salah = el("p", "pesan"); salah.setAttribute("role", "status");
    f.append(pil, baris, sisa, salah);
    // tombol keyboard di dalam kotak teks tidak boleh menggerakkan pemain
    masukan.addEventListener("keydown", e => e.stopPropagation());
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const teks = masukan.value.trim();
      if (teks.length < 2) { salah.textContent = "Tulis salam singkat dulu, ya."; masukan.focus(); return; }
      kirim.disabled = true; salah.textContent = "Menulis…";
      try {
        await Akun.kirim(`/api/bukutamu/${p.kavling}`, {isi: teks});
        Kota.ucap("Menulis di buku tamu.");
        buka(p, `Salammu sudah tertulis di buku tamu ${d.pemilik}.`);
      } catch (err) {
        kirim.disabled = false;
        salah.textContent = err instanceof TypeError ? "CodeIn News sedang tidak bisa dihubungi." : err.message;
      }
    });
    return f;
  }

  /* ---------- catatan mampir dan ringkasan untuk gerbang ---------- */
  function mampir(kavling) {
    const k = (Perumahan.data() || {})[kavling], saya = Perumahan.milikku();
    if (!Akun.sudahWarga() || !k || !k.pemilik || (saya && saya.kode === kavling)) return;
    Akun.kirim(`/api/bukutamu/${kavling}/mampir`, {}).catch(() => {});
  }
  async function ringkas() {
    if (!Akun.sudahWarga()) return null;
    ringkasan = await Akun.ambil("/api/bukutamu/saya/ringkas");
    return ringkasan;
  }

  Perumahan.saatTata(pasang);
  Akun.saatBerubah(k => { if (k !== "warga") ringkasan = null; });
  return {buka, teksAksi, mampir, ringkas};
})();

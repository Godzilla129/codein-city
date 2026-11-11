/* CodeIn City · papan dunia: baliho (6 slot billboard) dan videotron "Sedang ramai".
   Isinya diambil dari API publik CodeIn News (KOTA.news) dan disegarkan tiap 2 menit:
     GET  /api/billboards            -> isi 6 slot baliho
     GET  /api/clusters?hours=24&top=5 -> kabar paling ramai untuk videotron
     POST /api/billboards/ajukan     -> pengajuan baliho dari formulir di kota
   Letak papan diatur di peta (layer objek "papan"); kota.js yang menempelkannya ke dunia.
   Semua teks dari server ditulis lewat textContent, jadi tidak bisa menyisipkan HTML. */

const Papan = (() => {
  // ?api=http://127.0.0.1:8787 hanya berlaku saat kota dibuka dari komputer sendiri (untuk uji coba)
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = ((lokal && new URLSearchParams(location.search).get("api")) || KOTA.news).replace(/\/+$/, "");
  const SEGAR = 120000, GANTI = 6000, KUNCI = "codein-city-papan", JUMLAH = 6;
  const STATUS = {
    confirmed: ["Terkonfirmasi", "#2F9E5F"], single: ["Baru satu media", "#E0A100"], unverified: ["Baru dari akun X", "#D9822B"],
    disputed: ["Dibantah", "#D9483B"], unchecked: ["Belum dicek", "#A8998A"],
  };
  const status = s => STATUS[s] || STATUS.unchecked;

  // keadaan tiap sumber: "memuat" (belum ada jawaban), "siap", atau "gagal" (server tidak terjangkau dan tidak ada simpanan)
  let slot = [], kabar = [], keadaan = {slot: "memuat", kabar: "memuat"}, giliran = 0, isian = null;
  const baliho = new Map();       // nomor slot -> elemen baliho di dunia
  let layar = null;               // elemen videotron
  let terakhir = 0;               // kapan terakhir bertanya ke server
  let gagalBeruntun = 0;

  /* ---------- data ---------- */
  const teks = (v, maks) => String(v == null ? "" : v).trim().slice(0, maks);
  const warna = v => /^#[0-9a-f]{6}$/i.test(v || "") ? v : KOTA.warna[0];
  const tautan = v => /^https?:\/\/[^\s<>"']+$/.test(v || "") ? v : "";
  const rapikanSlot = d => Array.isArray(d) ? d.filter(s => s && Number.isInteger(s.id)).map(s => ({
    id: s.id, empty: !!s.empty || !teks(s.title, 28), badge: teks(s.badge, 14), title: teks(s.title, 28), sub: teks(s.sub, 90),
    owner: teks(s.owner, 40), link: tautan(s.link), theme: warna(s.theme)})) : [];
  const rapikanKabar = d => Array.isArray(d) ? d.filter(k => k && k.title)
    .sort((a, b) => (b.item_count || 0) - (a.item_count || 0) || String(b.last_seen).localeCompare(String(a.last_seen))).slice(0, 5)
    .map(k => ({title: teks(k.title, 160), status: k.status, berita: +k.item_count || 0, media: +k.media_count || 0})) : [];

  async function ambil(jalur) {
    // batas 15 detik: server yang menggantung dihitung gagal, supaya papan tidak selamanya bertulisan "Memuat"
    const batas = new AbortController(), waktu = setTimeout(() => batas.abort(), 15000);
    try {
      const r = await fetch(API + jalur, {headers: {Accept: "application/json"}, signal: batas.signal});
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } finally { clearTimeout(waktu); }
  }
  // Simpanan di browser: papan langsung terisi saat kota dibuka lagi, dan tetap terisi kalau CodeIn News sedang mati.
  function bacaSimpanan() {
    try {
      const s = JSON.parse(localStorage.getItem(KUNCI));
      if (!s || Date.now() - s.t > 864e5) return;
      if (s.slot) { slot = rapikanSlot(s.slot); keadaan.slot = "siap"; }
      if (s.kabar) { kabar = s.kabar; keadaan.kabar = "siap"; }
    } catch (e) { /* simpanan rusak atau mode privat: abaikan */ }
  }
  function tulisSimpanan() {
    try { localStorage.setItem(KUNCI, JSON.stringify({t: Date.now(), slot: keadaan.slot === "siap" ? slot : null, kabar: keadaan.kabar === "siap" ? kabar : null})); }
    catch (e) { /* tidak tersimpan, tidak apa-apa */ }
  }
  async function segarkan() {
    if (document.hidden) return;
    terakhir = Date.now();
    const [a, b] = await Promise.allSettled([ambil("/api/billboards"), ambil("/api/clusters?hours=24&top=5")]);
    if (a.status === "fulfilled") { slot = rapikanSlot(a.value); keadaan.slot = "siap"; } else if (keadaan.slot !== "siap") keadaan.slot = "gagal";
    if (b.status === "fulfilled") { kabar = rapikanKabar(b.value); keadaan.kabar = "siap"; } else if (keadaan.kabar !== "siap") keadaan.kabar = "gagal";
    tulisSimpanan(); gambarSemua();
    // gagal (misalnya sinyal putus sebentar): coba lagi 20 detik kemudian, paling banyak 3 kali, sebelum kembali ke jadwal 2 menit
    gagalBeruntun = a.status === "fulfilled" && b.status === "fulfilled" ? 0 : gagalBeruntun + 1;
    if (gagalBeruntun && gagalBeruntun <= 3) setTimeout(segarkan, 20000);
  }
  const slotKe = n => slot.find(s => s.id === n) || null;

  /* ---------- gambar papan ---------- */
  const judulKecil = s => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
  function gambarBaliho(e, s, k) {
    e.className = "pw baliho" + (e.classList.contains("pratinjau") ? " pratinjau" : "");
    e.style.removeProperty("--tema");
    if (k !== "siap") { e.classList.add("kosong"); e.replaceChildren(el("span", "pw-catatan", k === "memuat" ? "Memuat baliho…" : "Baliho belum bisa dimuat.")); return; }
    if (!s || s.empty) {
      e.classList.add("kosong");
      e.replaceChildren(el("b", "pw-judul", "Baliho kosong"), el("span", "pw-catatan", "Pasang proyekmu di sini, gratis."));
      return;
    }
    e.style.setProperty("--tema", s.theme);
    e.replaceChildren(el("span", "pw-pita"), el("span", "pw-cap", judulKecil(s.badge)), el("b", "pw-judul", s.title),
      el("span", "pw-kaki", s.owner ? "oleh " + s.owner : ""));
  }
  function gambarLayar(ganti) {
    if (!layar) return;
    const kepala = el("span", "pw-kepala"); kepala.append(el("span", null, "Sedang ramai"));
    const isi = [kepala];
    if (keadaan.kabar !== "siap") isi.push(el("span", "pw-catatan", keadaan.kabar === "memuat" ? "Memuat kabar…" : "Kabar belum bisa dimuat."));
    else if (!kabar.length) isi.push(el("span", "pw-catatan", "Belum ada kabar dalam 24 jam terakhir."));
    else {
      const i = giliran % kabar.length, k = kabar[i], kaki = el("span", "pw-kaki"), t = el("i", "titik");
      t.style.setProperty("--c", status(k.status)[1]);
      kaki.append(t, el("span", null, `${k.berita} berita` + (k.media ? ` · ${k.media} media` : "")));
      kepala.append(el("span", null, `${i + 1}/${kabar.length}`));
      isi.push(el("b", "pw-judul", k.title), kaki);
    }
    layar.replaceChildren(...isi);
    if (ganti) { layar.classList.remove("ganti"); void layar.offsetWidth; layar.classList.add("ganti"); }   // kedip halus tanda kabar berganti
  }
  function gambarSemua() {
    for (const [n, e] of baliho) gambarBaliho(e, slotKe(n), keadaan.slot);
    gambarLayar(false);
  }
  /* Dipanggil kota.js untuk setiap objek di layer "papan" */
  function buat(jenis, urutan) {
    const e = el("div", "pw");
    if (jenis === "videotron") { e.classList.add("layar"); layar = e; gambarLayar(false); }
    else { baliho.set(urutan, e); gambarBaliho(e, slotKe(urutan), keadaan.slot); }
    return e;
  }

  /* ---------- dialog ---------- */
  const paragraf = t => el("p", null, t);
  const keadaanP = (k, memuat, gagal) => el("p", "redup", k === "memuat" ? memuat : gagal);
  function tautanLuar(url, label) {
    const a = el("a", "tautan", label); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; return a;
  }

  function panelLayar() {
    const isi = [paragraf("Lima kabar dengan pemberitaan terbanyak dalam 24 jam terakhir, dirangkum CodeIn News dari banyak media.")];
    if (keadaan.kabar !== "siap") isi.push(keadaanP(keadaan.kabar, "Memuat kabar…", "Kabar belum bisa dimuat. CodeIn News mungkin sedang tidak terjangkau, coba lagi sebentar."));
    else if (!kabar.length) isi.push(el("p", "redup", "Belum ada kabar dalam 24 jam terakhir."));
    else {
      const ol = el("ol", "kabar");
      for (const k of kabar) {
        const li = el("li"), s = el("span", "status"), t = el("i", "titik");
        t.style.setProperty("--c", status(k.status)[1]);
        s.append(t, el("span", null, `${status(k.status)[0]} · ${k.berita} berita` + (k.media ? ` · ${k.media} media` : "")));
        li.append(el("b", null, k.title), s); ol.append(li);
      }
      isi.push(ol, el("p", "redup", "Rangkuman lengkapnya ada di Buku Harian, di perpustakaan CodeIn News."));
    }
    Panel.buka("Sedang ramai", isi, [{teks: "Masuk CodeIn News", utama: true, aksi: () => Kota.masuk("news")}, {teks: "Tutup"}]);
  }

  function panelBaliho(n) {
    const s = slotKe(n), isi = [el("p", "redup", `Baliho nomor ${n}` + (s && !s.empty && s.badge ? ` · ${judulKecil(s.badge)}` : ""))];
    const ajukan = {teks: "Ajukan proyekmu", aksi: () => formulir(n)};
    if (keadaan.slot !== "siap") {
      isi.push(keadaanP(keadaan.slot, "Memuat isi baliho…", "Isi baliho belum bisa dimuat. CodeIn News mungkin sedang tidak terjangkau, coba lagi sebentar."));
      Panel.buka("Baliho", isi, [{teks: "Tutup"}]); return;
    }
    if (!s || s.empty) {
      isi.push(paragraf("Baliho ini belum ada isinya."),
        paragraf("Anggota CodeIn boleh memasang proyek, acara, atau portofolio di sini, gratis. Admin akan menghubungi kamu sebelum balihonya tayang."));
      Panel.buka("Baliho kosong", isi, [{...ajukan, utama: true}, {teks: "Tutup"}]); return;
    }
    if (s.sub) isi.push(paragraf(s.sub));
    if (s.owner) isi.push(el("p", "redup", "Dipasang oleh " + s.owner));
    // panah ↗ dipakai hanya di sini dan di Galeri: tanda bahwa tautannya membuka situs lain di tab baru
    if (s.link) { const p = el("p"); p.append(tautanLuar(s.link, "Buka tautan proyek ↗")); isi.push(p); }
    Panel.buka(s.title, isi, [ajukan, {teks: "Tutup"}]);
  }

  function panelGaleri() {
    const isi = [paragraf("Proyek, acara, dan portofolio anggota CodeIn yang sedang tayang di baliho kota.")];
    if (keadaan.slot !== "siap") isi.push(keadaanP(keadaan.slot, "Memuat daftar proyek…", "Daftar proyek belum bisa dimuat. CodeIn News mungkin sedang tidak terjangkau, coba lagi sebentar."));
    else {
      const tayang = slot.filter(s => !s.empty), kosong = JUMLAH - tayang.length;
      if (!tayang.length) isi.push(el("p", "redup", "Belum ada proyek yang tayang. Punyamu bisa jadi yang pertama."));
      else {
        const ul = el("ul", "galeri");
        for (const s of tayang) {
          const li = el("li"), baris = el("div", "galeri-aksi"), lihat = el("button", "tbl kecil-tbl", `Ke baliho ${s.id}`);
          lihat.type = "button"; lihat.onclick = () => { Panel.tutup(); Kota.pindahKe("baliho-" + s.id); };
          baris.append(lihat); if (s.link) baris.append(tautanLuar(s.link, "Buka tautan ↗"));
          li.append(el("b", null, s.title)); if (s.sub) li.append(el("span", null, s.sub));
          if (s.owner) li.append(el("span", "redup", "oleh " + s.owner));
          li.append(baris); ul.append(li);
        }
        isi.push(ul);
      }
      isi.push(el("p", "redup", kosong ? `${kosong} dari ${JUMLAH} baliho masih kosong.` : "Semua baliho sedang terisi. Pengajuan baru masuk antrean admin."));
    }
    Panel.buka("Galeri Showcase", isi, [{teks: "Ajukan proyekmu", utama: true, aksi: () => formulir(0)}, {teks: "Tutup"}]);
  }

  /* ---------- formulir pengajuan baliho ---------- */
  function periksa(f) {
    const j = f.title.trim().length, d = f.sub.trim().length, n = f.name.trim().length, wa = f.wa.replace(/\D/g, "").length;
    if (j < 3) return ["title", "Judul proyek minimal 3 huruf."];
    if (d < 5) return ["sub", "Deskripsi minimal 5 huruf."];
    if (f.link.trim() && !tautan(f.link.trim())) return ["link", "Tautan harus diawali http:// atau https://"];
    if (n < 2) return ["name", "Nama kamu wajib diisi."];
    if (!f.email.trim() && !f.wa.trim()) return ["email", "Isi email atau nomor WhatsApp supaya admin bisa menghubungi kamu."];
    if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return ["email", "Format email belum benar."];
    if (f.wa.trim() && (wa < 9 || wa > 15)) return ["wa", "Nomor WhatsApp belum benar."];
    return null;
  }
  function formulir(n) {
    if (!isian) {
      const p = Profil.muat(), nama = p && !/^Pengunjung \d+$/.test(p.nama) ? p.nama : "";
      isian = {title: "", sub: "", link: "", name: nama, email: "", wa: "", theme: KOTA.warna[0], slot: 0, website: ""};
    }
    const f = isian; if (n) f.slot = n;
    const pratinjau = el("div", "pw baliho pratinjau"); pratinjau.setAttribute("aria-hidden", "true");
    const segar = () => gambarBaliho(pratinjau, {title: f.title.trim() || "Judul proyekmu", badge: "ANGGOTA", owner: f.name.trim(), theme: f.theme}, "siap");
    const form = el("form", "isian"); form.noValidate = true;
    const medan = {};
    const kolom = (label, kunci, maks, tipe, contoh) => {
      const l = el("label", null, label), i = el("input");
      i.type = tipe; i.maxLength = maks; i.value = f[kunci]; i.name = kunci; if (contoh) i.placeholder = contoh;
      i.spellcheck = false; i.autocomplete = {name: "name", email: "email", wa: "tel", link: "url"}[kunci] || "off";
      i.oninput = () => { f[kunci] = i.value; pesan.textContent = ""; segar(); };
      l.append(i); medan[kunci] = i; return l;
    };
    const pesan = el("p", "pesan"); pesan.setAttribute("role", "status");

    const pilih = el("select"); pilih.name = "slot";
    for (let i = 0; i <= JUMLAH; i++) {
      const s = slotKe(i), o = el("option", null, i ? `Baliho ${i}` + (keadaan.slot === "siap" ? (s && !s.empty ? " (sedang terisi)" : " (kosong)") : "") : "Mana saja yang kosong");
      o.value = i; pilih.append(o);
    }
    pilih.value = f.slot; pilih.onchange = () => { f.slot = +pilih.value; };
    const labelPilih = el("label", null, "Baliho pilihan"); labelPilih.append(pilih);

    const warnaBaris = el("div", "warna"); warnaBaris.setAttribute("role", "group"); warnaBaris.setAttribute("aria-label", "Warna pita baliho");
    KOTA.warna.forEach((c, i) => {
      const b = el("button"); b.type = "button"; b.style.background = c; b.setAttribute("aria-label", `Warna ${i + 1}`);
      b.setAttribute("aria-pressed", String(f.theme === c));
      b.onclick = () => { f.theme = c; [...warnaBaris.children].forEach(x => x.setAttribute("aria-pressed", String(x === b))); segar(); };
      warnaBaris.append(b);
    });
    // jebakan bot: kolom tersembunyi yang tidak akan diisi manusia (server menolak pengajuan yang mengisinya)
    const jebakan = el("input", "jebakan"); jebakan.name = "website"; jebakan.tabIndex = -1; jebakan.autocomplete = "off"; jebakan.setAttribute("aria-hidden", "true");
    jebakan.oninput = () => { f.website = jebakan.value; };
    const kirim = el("button", "tbl utama", "Kirim pengajuan"); kirim.type = "submit";

    form.append(
      kolom("Judul proyek", "title", 28, "text", "Maksimal 28 huruf"),
      kolom("Deskripsi singkat", "sub", 90, "text", "Maksimal 90 huruf"),
      kolom("Tautan (opsional)", "link", 200, "url", "https://…"),
      kolom("Nama kamu", "name", 40, "text"),
      kolom("Email", "email", 80, "email", "nama@email.com"),
      kolom("Nomor WhatsApp", "wa", 20, "tel", "08…"),
      el("p", "redup", "Isi email atau nomor WhatsApp, salah satu cukup. Hanya admin CodeIn yang bisa melihatnya."),
      labelPilih, el("span", "label", "Warna pita"), warnaBaris, jebakan, pesan, kirim);

    form.onsubmit = async e => {
      e.preventDefault();
      const salah = periksa(f);
      if (salah) { pesan.textContent = salah[1]; medan[salah[0]].focus(); return; }
      kirim.disabled = true; pesan.textContent = "Mengirim…";
      try {
        const r = await fetch(API + "/api/billboards/ajukan", {method: "POST", headers: {"Content-Type": "application/json", "X-NA": "1"}, body: JSON.stringify(f)});
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || `Server menolak pengajuan (kode ${r.status}).`);
        isian = null;
        Panel.buka("Pengajuan terkirim", [paragraf("Terima kasih. Admin CodeIn akan menghubungi kamu lewat email atau WhatsApp yang kamu isi."),
          paragraf("Balihonya tayang setelah disetujui admin.")], [{teks: "Tutup"}]);
      } catch (err) {
        kirim.disabled = false;
        pesan.textContent = err instanceof TypeError ? "Belum terkirim: CodeIn News sedang tidak bisa dihubungi. Isianmu masih ada, coba lagi sebentar." : "Belum terkirim: " + err.message;
      }
    };
    segar();
    Panel.buka("Ajukan proyekmu", [paragraf("Gratis untuk anggota CodeIn: proyek, acara, atau portofolio. Begini tampilannya di baliho:"), pratinjau, form],
      [{teks: "Batal"}], medan.title);
  }

  /* ---------- dipakai kota.js ---------- */
  function buka(jenis, urutan) { if (jenis === "videotron") panelLayar(); else panelBaliho(urutan); }
  // pintu = zona interaksi dari peta; true kalau dialognya ditangani di sini
  function tangani(p) {
    if (p.tujuan === "videotron") panelLayar();
    else if (p.tujuan === "baliho") panelBaliho(+p.id.split("-")[1]);
    else if (p.id === "galeri") panelGaleri();
    else return false;
    return true;
  }

  bacaSimpanan();
  segarkan();
  setInterval(segarkan, SEGAR);
  setInterval(() => { if (!document.hidden && kabar.length > 1) { giliran++; gambarLayar(true); } }, GANTI);
  addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - terakhir > SEGAR / 2) segarkan(); });   // kembali ke tab ini

  return {buat, buka, tangani};
})();

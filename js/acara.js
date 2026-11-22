/* CodeIn City · acara CodeIn (workshop, kelas, kopdar) dan pendaftarannya.
   Acara dibuat admin di halaman admin CodeIn News. Di kota, acara yang sedang buka ditempel di Papan Pengumuman alun-alun
   dan disebut Kak Rani di meja resepsionis Markas; dari keduanya warga bisa mendaftar. Pendaftaran khusus warga (js/akun.js).
     GET  /api/acara                 -> acara yang tampil (publik): judul, tanggal, jam, tempat, kuota, terisi, buka
     GET  /api/acara/saya            -> acara yang sudah diikuti warga ini dan nomor urutnya
     POST /api/acara/<id>/daftar     -> {wa, pengalaman, catatan}; nomor WhatsApp hanya untuk admin (grup acara)
     POST /api/acara/<id>/batal      -> batal ikut */

const Acara = (() => {
  const lokal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = ((lokal && new URLSearchParams(location.search).get("api")) || KOTA.news).replace(/\/+$/, "");
  const PENGALAMAN = [["belum", "Belum pernah"], ["sedikit", "Pernah sedikit"], ["biasa", "Sudah biasa"]];
  let acara = [], saya = {}, isian = {};

  const tanggal = (a, opsi = {weekday: "long", day: "numeric", month: "long", year: "numeric"}) =>
    new Date(a.tanggal + "T00:00:00+07:00").toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", ...opsi});
  const kapan = a => [tanggal(a), a.jam].filter(Boolean).join(", ");

  async function muat() {
    try {
      const r = await fetch(API + "/api/acara", {headers: {Accept: "application/json"}});
      if (r.ok) acara = (await r.json()).acara || [];
    } catch (e) { /* server tidak terjangkau: papan tetap berisi pengumuman biasa */ }
    await muatSaya();
    Papan.segarkanGabus();
  }
  async function muatSaya() {
    if (!Akun.sudahWarga()) { saya = {}; return; }
    try {
      saya = (await Akun.ambil("/api/acara/saya")).terdaftar || {};
    } catch (e) { /* biarkan */ }
  }

  /* ---------- dialog ---------- */
  function rincian(a) {
    const isi = [el("p", "redup", kapan(a) + (a.tempat ? ` · ${a.tempat}` : ""))];
    if (a.ringkas) isi.push(el("p", null, a.ringkas));
    if (a.deskripsi) a.deskripsi.split(/\n+/).filter(Boolean).forEach(t => isi.push(el("p", null, t)));
    isi.push(el("p", "redup", a.kuota ? `Pendaftar: ${a.terisi} dari ${a.kuota} kursi.` : `Pendaftar: ${a.terisi} orang.`));
    return isi;
  }
  // satu acara: rincian, lalu tombol sesuai keadaan (daftar, sudah terdaftar, ditutup)
  function buka(a) {
    const urut = saya[String(a.id)], isi = rincian(a), tombol = [];
    if (urut) {
      isi.push(el("p", "berhasil", `Kamu sudah terdaftar, pendaftar ke-${urut}. Admin CodeIn akan menghubungimu lewat WhatsApp.`));
      tombol.push({teks: "Batalkan pendaftaran", aksi: () => batal(a)});
    } else if (a.buka) tombol.push({teks: "Daftar sekarang", utama: true, aksi: () => formulir(a)});
    else isi.push(el("p", null, a.kuota && a.terisi >= a.kuota ? "Kursinya sudah penuh." : "Pendaftaran acara ini sudah ditutup."));
    tombol.push({teks: "Tutup"});
    Panel.buka(a.judul, isi, tombol);
  }
  function formulir(a, pesanAwal) {
    if (!Akun.sudahWarga()) { Akun.pastikan(`Mendaftar ${a.judul}`, async () => { await muatSaya(); saya[String(a.id)] ? buka(a) : formulir(a); }); return; }
    const f = isian[a.id] || (isian[a.id] = {wa: "", pengalaman: "", catatan: ""});
    const pesan = el("p", "pesan"); pesan.setAttribute("role", "alert"); if (pesanAwal) pesan.textContent = pesanAwal;
    const form = el("form", "isian"); form.noValidate = true;
    form.onsubmit = e => { e.preventDefault(); Panel.tutup(); kirim(a); };
    const wa = el("input"); Object.assign(wa, {type: "tel", inputMode: "tel", autocomplete: "tel", maxLength: 20, placeholder: "08…", value: f.wa, name: "wa"});
    wa.oninput = () => { f.wa = wa.value; pesan.textContent = ""; };
    const labWa = el("label", null, "Nomor WhatsApp"); labWa.append(wa);
    const grup = el("fieldset", "pilihan"); grup.append(el("legend", "label", "Pengalamanmu soal materi acara ini"));
    for (const [nilai, teks] of PENGALAMAN) {
      const lab = el("label", "setuju"), r = el("input"); Object.assign(r, {type: "radio", name: "pengalaman", value: nilai, checked: f.pengalaman === nilai});
      r.onchange = () => { f.pengalaman = nilai; pesan.textContent = ""; };
      lab.append(r, el("span", null, teks)); grup.append(lab);
    }
    const cat = el("textarea"); Object.assign(cat, {maxLength: 300, rows: 3, value: f.catatan, name: "catatan", placeholder: "Contoh: pengen bisa setting MikroTik buat kos"});
    cat.oninput = () => { f.catatan = cat.value; };
    const labCat = el("label", null, "Harapan atau pertanyaan (boleh kosong)"); labCat.append(cat);
    form.append(labWa, grup, labCat);
    const isi = [el("p", "redup", kapan(a) + (a.tempat ? ` · ${a.tempat}` : "")),
      el("p", null, `Daftar sebagai warga ${Akun.warga().nama}.`), form,
      el("p", "redup", "Nomor WhatsApp hanya terlihat oleh admin CodeIn, untuk grup dan kabar acara ini."), pesan];
    Panel.buka(`Daftar ${a.judul}`, isi, [{teks: "Kirim pendaftaran", utama: true, aksi: () => kirim(a)}, {teks: "Batal"}], wa);
  }
  async function kirim(a) {
    const f = isian[a.id];
    if (!/^(\+?62|0)8[\d\s-]{8,16}$/.test(f.wa.trim())) { formulir(a, "Nomor WhatsApp belum benar. Contoh: 081234567890."); return; }
    if (!f.pengalaman) { formulir(a, "Pilih pengalamanmu dulu, ya."); return; }
    Kota.kabar("Mengirim pendaftaran…");
    try {
      const h = await Akun.kirim(`/api/acara/${a.id}/daftar`, f);
      delete isian[a.id];
      saya[String(a.id)] = h.urut;
      await muat();
      Panel.buka("Pendaftaran terkirim", [el("p", null, `Kamu terdaftar di ${a.judul}, pendaftar ke-${h.urut}${h.kuota ? " dari " + h.kuota : ""}.`),
        el("p", null, `${kapan(a)}${a.tempat ? ", " + a.tempat : ""}.`),
        el("p", "redup", "Admin CodeIn akan menghubungimu lewat WhatsApp. Kalau berhalangan, batalkan dari Papan Pengumuman supaya kursinya bisa dipakai orang lain.")],
        [{teks: "Siap"}]);
      Kota.ucap("Aku ikut workshop!");
    } catch (e) {
      if (e.status === 401) { Akun.pastikan(`Mendaftar ${a.judul}`, () => formulir(a)); return; }
      if (e.status === 409) { await muat(); const b = acara.find(x => x.id === a.id); if (b) { buka(b); Kota.kabar(e.message); return; } }
      formulir(a, "Belum terkirim: " + (e instanceof TypeError ? "CodeIn News sedang tidak bisa dihubungi. Isianmu masih ada." : e.message));
    }
  }
  function batal(a) {
    Panel.buka("Batalkan pendaftaran?", [el("p", null, `Kursimu di ${a.judul} akan dilepas dan bisa dipakai orang lain.`)], [
      {teks: "Ya, batalkan", aksi: async () => {
        try { await Akun.kirim(`/api/acara/${a.id}/batal`, {}); delete saya[String(a.id)]; await muat(); Kota.kabar("Pendaftaranmu dibatalkan."); }
        catch (e) { Kota.kabar("Belum berhasil: " + e.message); }
      }},
      {teks: "Tidak jadi", utama: true}]);
  }

  // Papan Pengumuman: acara (kalau ada) di atas pengumuman biasa
  function papan() {
    const tampil = acara.filter(a => a.buka || saya[String(a.id)]);
    if (!tampil.length) { Panel.gedung("papan", "Papan Pengumuman"); return; }
    if (tampil.length === 1) { buka(tampil[0]); return; }
    pilih(tampil);
  }
  function pilih(daftar = terbuka()) {
    if (daftar.length === 1) { buka(daftar[0]); return; }
    const ul = el("ul", "tempat");
    for (const a of daftar) {
      const li = el("li"), b = el("button", "tbl", saya[String(a.id)] ? "Terdaftar" : "Lihat"); b.type = "button";
      b.onclick = () => buka(a);
      li.append(el("span", null, `${a.judul} · ${tanggal(a, {day: "numeric", month: "short"})}`), b); ul.append(li);
    }
    Panel.buka("Acara CodeIn", [el("p", null, "Pilih acara untuk melihat rinciannya dan mendaftar."), ul], [{teks: "Tutup"}]);
  }
  const terbuka = () => acara.filter(a => a.buka);
  // teks kertas acara di papan gabus
  function tempelan() {
    const a = terbuka()[0];
    return a ? `📅 ${a.judul} · ${tanggal(a, {weekday: "short", day: "numeric", month: "short"})}. Daftar di sini atau lewat Kak Rani.` : "";
  }

  muat();
  setInterval(() => { if (!document.hidden) muat(); }, 5 * 60 * 1000);
  Akun.saatBerubah(k => { if (k !== "memuat") muatSaya().then(() => Papan.segarkanGabus()); });

  return {papan, pilih, terbuka, tempelan, buka, muat};
})();

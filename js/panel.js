/* CodeIn City · dialog (isi gedung, daftar tempat) dan tombol aksi.
   Saat dialog terbuka, permainan dijeda lewat Panel.terbuka(). */

const $ = id => document.getElementById(id);
const el = (tag, cls, teks) => { const e = document.createElement(tag); if (cls) e.className = cls; if (teks != null) e.textContent = teks; return e; };

const Panel = (() => {
  let sebelum = null;     // elemen yang punya fokus sebelum dialog dibuka

  function buka(judul, isi, tombol) {
    sebelum = document.activeElement;
    $("panel-judul").textContent = judul;
    $("panel-isi").replaceChildren(...isi);
    const baris = $("panel-tombol"); baris.replaceChildren();
    for (const t of tombol) {
      const b = el("button", "tbl" + (t.utama ? " utama" : ""), t.teks); b.type = "button";
      b.onclick = () => { tutup(); if (t.aksi) t.aksi(); };
      baris.append(b);
    }
    $("panel").hidden = false;
    baris.querySelector("button").focus();
  }
  function tutup() {
    if ($("panel").hidden) return;
    $("panel").hidden = true;
    if (sebelum && document.contains(sebelum)) sebelum.focus();
  }
  const terbuka = () => !$("panel").hidden || !$("judul").hidden;

  /* Dialog satu gedung, isinya dari KOTA.panel di config.js */
  function gedung(kunci, nama) {
    const p = KOTA.panel[kunci];
    if (!p) return;
    const isi = (p.isi || []).map(t => el("p", null, t));
    if (p.daftar) { const ul = el("ul"); p.daftar.forEach(t => ul.append(el("li", null, t))); isi.push(ul); }
    const tombol = (p.tombol || [{teks: "Tutup"}]).map((t, i) => ({teks: t.teks, utama: i === 0 && (t.url || t.pintu),
      aksi: t.url ? () => { location.href = t.url; } : t.pintu ? () => Kota.masuk(t.pintu) : null}));
    buka(p.judul || nama, isi, tombol);
  }

  /* Daftar tempat: cara cepat (dan cara tanpa berjalan) untuk mencapai setiap gedung */
  function tempat() {
    const ul = el("ul", "tempat"), sudah = new Set();
    for (const p of Kota.pintu()) {
      const kunci = p.aksi === "pindah" ? p.id : (p.tujuan || p.id);
      if (sudah.has(kunci)) continue; sudah.add(kunci);
      const li = el("li"), b = el("button", "tbl", "Ke sana"); b.type = "button";
      b.onclick = () => { tutup(); Kota.pindahKe(p.id); };
      li.append(el("span", null, p.nama), b); ul.append(li);
    }
    buka("Tempat di CodeIn City", [el("p", null, "Pilih tempat untuk langsung berpindah ke depannya."), ul], [{teks: "Tutup"}]);
  }

  $("panel").addEventListener("click", e => { if (e.target.id === "panel") tutup(); });
  addEventListener("keydown", e => {
    if ($("panel").hidden) return;
    if (e.key === "Escape") { e.preventDefault(); tutup(); }
    if (e.key === "Tab") {    // fokus tetap di dalam dialog
      const f = [...$("panel").querySelectorAll("button, a[href]")], i = f.indexOf(document.activeElement);
      e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
    }
  });

  return {buka, tutup, terbuka, gedung, tempat};
})();

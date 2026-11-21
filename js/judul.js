/* CodeIn City · layar judul: pilih karakter dan nama panggilan. */

const Judul = (() => {
  let pilih = 0;
  const kotak = $("pilih-karakter");

  // gambar wajah karakter diambil dari urban.png (kolom 24 = menghadap depan)
  function aturMuka(span, k) {
    const x = 1 + 24 * 18, y = 1 + KOTA.karakter[k].baris * 18;
    span.style.backgroundPosition = `calc(var(--s) * -${x}px) calc(var(--s) * -${y}px)`;
  }
  function tandai() {
    [...kotak.children].forEach((b, i) => { b.setAttribute("aria-checked", String(i === pilih)); b.tabIndex = i === pilih ? 0 : -1; });
  }
  KOTA.karakter.forEach((k, i) => {
    const b = el("button", "kar"); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-label", k.nama); b.title = k.nama;
    const m = el("span", "muka"); aturMuka(m, i); b.append(m);
    b.onclick = () => { pilih = i; tandai(); };
    kotak.append(b);
  });
  kotak.addEventListener("keydown", e => {
    const geser = {ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1}[e.key];
    if (!geser) return;
    e.preventDefault(); e.stopPropagation();
    pilih = (pilih + geser + KOTA.karakter.length) % KOTA.karakter.length; tandai(); kotak.children[pilih].focus();
  });

  function masuk(p) {
    Profil.simpan(p);
    $("judul").hidden = true; $("hud").hidden = false;
    $("hud-nama").textContent = p.nama; aturMuka($("hud-muka"), p.karakter);
    $("petunjuk").hidden = !matchMedia("(hover: hover) and (pointer: fine)").matches;
    Kota.mulai(p);
    if (document.activeElement) document.activeElement.blur();
  }
  function tampil(p) {
    pilih = p ? p.karakter : Math.floor(Math.random() * KOTA.karakter.length);
    $("nama").value = p ? p.nama : ""; $("pesan-nama").textContent = "";
    tandai(); $("hud").hidden = true; $("judul").hidden = false;
  }
  $("form-judul").addEventListener("submit", e => {
    e.preventDefault();
    const cek = Profil.cekNama($("nama").value);
    if (!cek.ok) { $("pesan-nama").textContent = cek.alasan; $("nama").focus(); return; }
    masuk({karakter: pilih, nama: cek.nama});
  });
  $("nama").addEventListener("input", () => { $("pesan-nama").textContent = ""; });
  $("btn-profil").onclick = () => tampil(Profil.muat());
  $("btn-tempat").onclick = () => { $("btn-tempat").blur(); Panel.tempat(); };

  return {tampil, masuk};
})();

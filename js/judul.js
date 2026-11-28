/* CodeIn City · layar judul: pilih karakter dan nama panggilan, dan masuk sebagai warga (js/akun.js). */

const Judul = (() => {
  let pilih = 0;
  const kotak = $("pilih-karakter");

  // gambar wajah karakter diambil dari assets/sprites/orang.png (kolom kedua = menghadap depan, tiap karakter 3 baris)
  function aturMuka(span, k) {
    span.style.backgroundPosition = `calc(var(--s) * -16px) calc(var(--s) * -${k * 48}px)`;
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

  const diJudul = () => !$("judul").hidden;

  function masuk(p) {
    if (Akun.keadaan() === "warga") Gerbang.selesaiIntip();
    Profil.simpan(p);
    $("judul").hidden = true; $("hud").hidden = false;
    $("hud-nama").textContent = p.nama; aturMuka($("hud-muka"), p.karakter);
    $("petunjuk").hidden = !matchMedia("(hover: hover) and (pointer: fine)").matches;
    Kota.mulai(p);
    if (document.activeElement) document.activeElement.blur();
  }
  function isi(p) {
    pilih = p ? p.karakter : Math.floor(Math.random() * KOTA.karakter.length);
    $("nama").value = p && !(Akun.keadaan() === "warga" && /^Pengunjung \d+$/.test(p.nama)) ? p.nama : "";
    tandai();
  }
  // pesanAwal: misalnya "Pilih nama wargamu dulu" saat warga baru belum punya nama
  function tampil(p, pesanAwal) {
    isi(p);
    $("pesan-nama").textContent = pesanAwal || "";
    tulisAkun(); $("hud").hidden = true; $("judul").hidden = false;
    if (pesanAwal) $("nama").focus();
  }

  /* ---------- bagian akun di layar judul ---------- */
  let sibuk = false;
  function tulisAkun() {
    const k = Akun.keadaan(), w = Akun.warga(), tombol = $("btn-akun");
    $("akun").hidden = k === "mati";
    $("akun").dataset.k = k;
    $("akun-pesan").textContent = k === "warga" && !w.perluNama ? "" : Akun.pesan();
    tombol.disabled = sibuk || k === "memuat";
    $("nama").placeholder = k === "warga" ? "Nama wargamu" : "Kosongkan untuk nama acak";
    if (k === "warga") {
      $("akun-teks").textContent = w.perluNama ? "Kamu sudah masuk. Pilih nama wargamu, lalu tekan Mulai jelajah."
        : `Kamu masuk sebagai warga ${w.nama}. Nama dan karaktermu tersimpan di akunmu.`;
      tombol.textContent = "Keluar dari akun";
    } else if (k === "memuat") {
      $("akun-teks").textContent = "Memeriksa akun…"; tombol.textContent = "Masuk dengan Google";
    } else {
      $("akun-teks").textContent = "Masuk kota wajib login dengan akun Google. Gratis, cukup sekali. Tanpa login kamu hanya bisa mengintip kota.";
      tombol.textContent = k === "galat" ? "Coba masuk lagi" : "Masuk dengan Google";
    }
  }
  $("btn-akun").onclick = async () => {
    if (sibuk) return;
    sibuk = true; tulisAkun();
    if (Akun.keadaan() === "warga") {
      await Akun.keluar();
      if (!Gerbang.lewati) { location.reload(); return; }      // keluar dari akun = kembali ke Gerbang CodeIn
    } else {
      // profil yang sedang diisi dipakai untuk warga baru
      const cek = Profil.cekNama($("nama").value);
      if (cek.ok && $("nama").value.trim()) Profil.simpan({karakter: pilih, nama: cek.nama});
      const salah = await Akun.masuk();
      const w = Akun.warga();
      if (Akun.keadaan() === "warga" && !w.perluNama) isi({nama: w.nama, karakter: w.karakter});
      if (salah) $("akun-pesan").textContent = salah;
    }
    sibuk = false; tulisAkun();
    if (Akun.keadaan() === "warga" && Akun.warga().perluNama) $("nama").focus();
  };

  // Akun berubah (login dipulihkan saat halaman dibuka, masuk, keluar): layar judul dan bilah atas ikut diperbarui
  Akun.saatBerubah((k, w) => {
    $("btn-profil").classList.toggle("warga", k === "warga");
    $("btn-profil").title = k === "warga" ? "Profil warga: ganti karakter, nama, atau keluar" : "Ganti karakter atau nama, atau masuk sebagai warga";
    if (diJudul()) {
      tulisAkun();
      if (k === "warga" && !w.perluNama && !sibuk) isi({nama: w.nama, karakter: w.karakter});
      return;
    }
    const p = Kota.profil();
    if (Gerbang.mengintip() && k !== "warga") return;            // tamu yang sedang mengintip kota memang belum login
    // sesi login habis atau dicabut saat di kota: kembali ke gerbang
    if ((k === "tamu" || k === "galat") && p && !Gerbang.lewati) { Gerbang.tampil(k === "galat" ? Akun.pesan() : "Sesi loginmu sudah berakhir. Masuk lagi, ya."); return; }
    if (k === "warga" && w.perluNama) tampil(Profil.muat(), "Pilih nama wargamu dulu. " + Akun.pesan());
    else if (k === "warga" && p && (Gerbang.mengintip() || p.nama !== w.nama || p.karakter !== w.karakter)) masuk({nama: w.nama, karakter: w.karakter});
  });

  $("form-judul").addEventListener("submit", async e => {
    e.preventDefault();
    if (sibuk) return;
    if (Akun.keadaan() !== "warga" && !Gerbang.lewati) {          // masuk kota wajib login
      $("pesan-nama").textContent = "Masuk dengan akun Google dulu, lewat tombol di bawah.";
      $("btn-akun").focus(); return;
    }
    const warga = Akun.keadaan() === "warga", w = Akun.warga();
    if (warga && !$("nama").value.trim()) { $("pesan-nama").textContent = "Isi nama wargamu dulu."; $("nama").focus(); return; }
    const cek = Profil.cekNama($("nama").value);
    if (!cek.ok) { $("pesan-nama").textContent = cek.alasan; $("nama").focus(); return; }
    const p = {karakter: pilih, nama: cek.nama};
    if (warga && (w.perluNama || w.nama !== p.nama || w.karakter !== p.karakter)) {
      sibuk = true; $("btn-mulai").disabled = true; $("pesan-nama").textContent = "Menyimpan ke akunmu…";
      try { await Akun.simpanProfil(p); $("pesan-nama").textContent = ""; }
      catch (err) {
        $("pesan-nama").textContent = err instanceof TypeError ? "Belum tersimpan: CodeIn News sedang tidak bisa dihubungi." : err.message;
        $("nama").focus(); return;
      } finally { sibuk = false; $("btn-mulai").disabled = false; }
    }
    masuk(p);
  });
  $("nama").addEventListener("input", () => { $("pesan-nama").textContent = ""; });
  $("btn-profil").onclick = () => tampil(Profil.muat());
  $("btn-tempat").onclick = () => { $("btn-tempat").blur(); Panel.tempat(); };

  return {tampil, masuk};
})();

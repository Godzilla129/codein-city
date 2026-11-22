/* CodeIn City · musik latar.
   Lagu mengikuti tempat dan waktu: kota dan Perumahan siang atau malam, di dalam gedung dan rumah, dan Galeri.
   Musik baru diputar setelah pengunjung menekan tombol atau layar (aturan browser), lalu lagu berganti pelan-pelan.
   Tombol ♪ di bilah atas menyalakan dan mematikannya; pilihannya diingat di browser pengunjung.
   Semua lagu CC0, "High Quality 16-bit RPG Music" karya Hydrogene (lihat README). */

const Musik = (() => {
  const LAGU = {"kota-siang": "assets/musik/kota-siang.mp3", "kota-malam": "assets/musik/kota-malam.mp3",
                dalam: "assets/musik/dalam.mp3", galeri: "assets/musik/galeri.mp3"};
  const KERAS = .32, PUDAR = 1.2, KUNCI = "codein-city-musik";
  const tombol = $("btn-musik");

  let nyala = true, siap = false, ctx = null, kini = null;
  const pemutar = {};          // nama lagu -> {audio, gain}
  try { nyala = localStorage.getItem(KUNCI) !== "0"; } catch (e) { /* penyimpanan diblokir: pakai bawaan */ }

  function laguSekarang() {
    const r = Kota.ruang();
    if (r === "galeri") return "galeri";
    if (!Kota.luar()) return "dalam";
    return Kota.waktu().kunci === "malam" ? "kota-malam" : "kota-siang";
  }

  // Web Audio dipakai supaya volume bisa diatur juga di iPhone (di sana audio.volume tidak bisa diubah)
  function ambil(nama) {
    if (pemutar[nama]) return pemutar[nama];
    const audio = new Audio(LAGU[nama]);
    audio.loop = true; audio.preload = "auto";
    let gain = null;
    if (ctx) {
      gain = ctx.createGain(); gain.gain.value = 0;
      ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination);
    } else audio.volume = 0;
    return (pemutar[nama] = {audio, gain});
  }
  function atur(p, ke) {
    if (p.gain) {
      const t = ctx.currentTime;
      p.gain.gain.cancelScheduledValues(t); p.gain.gain.setValueAtTime(p.gain.gain.value, t); p.gain.gain.linearRampToValueAtTime(ke, t + PUDAR);
    } else p.audio.volume = ke;
  }
  function putar(nama) {
    for (const [n, p] of Object.entries(pemutar)) {
      if (n === nama) continue;
      atur(p, 0);
      clearTimeout(p.henti); p.henti = setTimeout(() => p.audio.pause(), PUDAR * 1000 + 100);
    }
    kini = nama;
    if (!nama) return;
    const p = ambil(nama);
    clearTimeout(p.henti);
    p.audio.play().then(() => atur(p, KERAS)).catch(() => {});
  }
  function segarkan() {
    if (!siap) return;
    const mau = nyala && !document.hidden && Kota.profil() ? laguSekarang() : null;
    if (mau !== kini) putar(mau);
  }

  // dinyalakan oleh tekanan pertama pengunjung (tombol Mulai jelajah, ketukan, atau tombol keyboard)
  function bangun() {
    if (siap) return;
    siap = true;
    const AC = window.AudioContext || window.webkitAudioContext;
    try { if (AC) ctx = new AC(); } catch (e) { ctx = null; }
    if (ctx && ctx.state === "suspended") ctx.resume();
    segarkan();
  }
  ["pointerdown", "keydown"].forEach(n => addEventListener(n, bangun, {capture: true, passive: true}));

  function tampilkan() {
    tombol.setAttribute("aria-pressed", String(nyala));
    tombol.title = nyala ? "Matikan musik" : "Nyalakan musik";
    tombol.querySelector("span").textContent = nyala ? "Musik" : "Musik mati";
  }
  tombol.onclick = () => {
    nyala = !nyala;
    try { localStorage.setItem(KUNCI, nyala ? "1" : "0"); } catch (e) { /* tidak apa-apa */ }
    tampilkan(); bangun(); segarkan(); tombol.blur();
  };
  tampilkan();

  document.addEventListener("visibilitychange", segarkan);
  Kota.saatSiap(() => setTimeout(segarkan, 50));     // ganti peta: lagu ikut ganti
  setInterval(segarkan, 15000);                      // siang berganti malam

  return {nyala: () => nyala, lagu: () => kini};
})();

/* CodeIn City · ikon barang di tas (ikan, dan nanti hasil kebun dan perabot).
   Ikon digambar dari pola 16 x 16 piksel di bawah, dengan warna per barang. Huruf pola:
   o = garis tepi, b = badan, d = perut, f = sirip atau corak, e = putih mata, k = hitam, s = kilap, titik = kosong. */

const Barang = (() => {
  const POLA = {
    ikan: [
      "................", "................", "................", "......oooo......",
      "....oobbbboo.oo.", "...obbbbffbbofo.", "..obekbbbbbbbffo", "..obbbbbbbbbbffo",
      "..oddddddddbofo.", "...oddddddoo.oo.", "....oofffoo.....", "......ooo.......",
      "................", "................", "................", "................"],
    udang: [
      "................", "................", "..........kk....", ".....ooooo..k...",
      "...oobbbbboo.k..", "..obbekbbbbbo...", "..obbbbfbbbbbo..", "...oobbbfbbbbbo.",
      ".....oobbbfbbbo.", "......o.o.oobbo.", "..........obbo..", "..........offo..",
      "...........oo...", "................", "................", "................"],
    belut: [
      "................", "................", "................", "................",
      "..oo............", ".obeoo......oo..", ".obbbboo...obbo.", "..oddbbbooobbbo.",
      "...oodddbbbbdo..", ".....ooodddoo...", "........ooo.....", "................",
      "................", "................", "................", "................"],
    sandal: [
      "......oooo......", ".....obbbbo.....", "....obbfbbbo....", "....obfbfbbo....",
      "....ofbbbfbo....", "....obbbbbbo....", "....obbbbbbo....", ".....obbbbo.....",
      ".....obbbbo.....", "....obbbbbbo....", "....obbbbbbo....", "....obbbbbbo....",
      ".....obbbbo.....", "......oooo......", "................", "................"],
    kaleng: [
      "................", ".....oooooo.....", "....ossssssoo...", "....obbbbbbo....",
      "....offfffbo....", "....obbbbbbo....", "....offfffbo....", "....obbbbbbo....",
      "....obbbbbbo....", "....ossssssoo...", ".....oooooo.....", "................",
      "................", "................", "................", "................"],
  };
  // [pola, badan, perut, sirip]
  const WARNA = {
    mujair: ["ikan", "#6B7D6A", "#B8C4A8", "#4C5A4A"],
    nila:   ["ikan", "#8494A3", "#D9DEE3", "#C75B4A"],
    lele:   ["ikan", "#4A4540", "#8D8578", "#2E2A26"],
    mas:    ["ikan", "#E8A33B", "#F6D38A", "#C8681E"],
    gurame: ["ikan", "#9B8A6A", "#D8CBA8", "#6F5F42"],
    patin:  ["ikan", "#9AA4AD", "#E3E7EA", "#5F6B76"],
    koi:    ["ikan", "#F3EFE6", "#FFFFFF", "#E8622C"],
    arwana: ["ikan", "#E2B04A", "#F7E29A", "#A8701A"],
    udang:  ["udang", "#E9876A", "#F6C1A8", "#C85A3E"],
    belut:  ["belut", "#6A5A3C", "#B9A77E", "#4A3E28"],
    sandal: ["sandal", "#3E7CC9", "#3E7CC9", "#F2F2F2"],
    kaleng: ["kaleng", "#C9473D", "#C9473D", "#F2F2F2"],
  };
  const tembolok = {};

  // kanvas 16 x 16 berisi ikon barang (salinan baru tiap dipanggil, supaya bisa ditaruh di banyak tempat)
  function ikon(kode, kelas = "ikon-barang") {
    if (!tembolok[kode]) {
      const [pola, badan, perut, sirip] = WARNA[kode] || WARNA.kaleng;
      const peta = {o: "#2A211B", b: badan, d: perut, f: sirip, e: "#FFFFFF", k: "#1A1410", s: "#E8E2D6"};
      const c = document.createElement("canvas"); c.width = c.height = 16;
      const g = c.getContext("2d");
      POLA[pola].forEach((baris, y) => [...baris].forEach((h, x) => { if (peta[h]) { g.fillStyle = peta[h]; g.fillRect(x, y, 1, 1); } }));
      tembolok[kode] = c.toDataURL();
    }
    const img = new Image(16, 16); img.src = tembolok[kode]; img.alt = ""; img.className = kelas;
    return img;
  }
  const LANGKA = {sampah: "sampah", umum: "umum", sedang: "lumayan", jarang: "jarang", langka: "langka sekali"};

  return {ikon, langka: k => LANGKA[k] || k};
})();

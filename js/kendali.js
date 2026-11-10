/* CodeIn City · kendali sentuh. Sentuh layar lalu geser: karakter berjalan ke arah geseran (joystick muncul di jari).
   Keyboard ditangani langsung di kota.js. Hasilnya dibaca lewat Kendali.arah() -> {x, y} antara -1 dan 1. */

const Kendali = (() => {
  const RADIUS = 44, MATI = 10;         // jari-jari joystick dan zona mati (piksel layar)
  let id = null, ox = 0, oy = 0, vx = 0, vy = 0;
  const joy = $("joy"), tuas = joy.querySelector("i"), area = $("game");

  function lepas() { id = null; vx = vy = 0; joy.hidden = true; }
  area.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse" || id !== null || Panel.terbuka()) return;
    id = e.pointerId; ox = e.clientX; oy = e.clientY; vx = vy = 0;
    joy.style.left = ox + "px"; joy.style.top = oy + "px"; tuas.style.transform = ""; joy.hidden = false;
  });
  addEventListener("pointermove", e => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - ox, dy = e.clientY - oy;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) { dx *= RADIUS / d; dy *= RADIUS / d; }
    tuas.style.transform = `translate(${dx}px, ${dy}px)`;
    if (d < MATI) { vx = vy = 0; return; }
    vx = dx / RADIUS; vy = dy / RADIUS;
  });
  for (const ev of ["pointerup", "pointercancel"]) addEventListener(ev, e => { if (e.pointerId === id) lepas(); });
  addEventListener("blur", lepas);

  return {arah: () => ({x: vx, y: vy}), lepas};
})();

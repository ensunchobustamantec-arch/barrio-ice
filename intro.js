(() => {
  "use strict";

  // Editables sin tocar la coreografía.
  const PHRASES = ["Congelando el barrio…", "Sirviendo el frío…", "Hoy está sonando duro."];
  const STORAGE_KEY = "barrio-ice-intro-v3";
  const MINIMUM = 5500;
  const MAXIMUM = 10000;
  const query = new URLSearchParams(location.search);
  const intro = document.getElementById("barrioIntro");
  if (!intro) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const forced = query.get("intro") === "1";
  const disabled = query.get("intro") === "0";
  let seen = false;
  try { seen = sessionStorage.getItem(STORAGE_KEY) === "1"; } catch {}
  if (disabled || (!forced && seen)) { intro.hidden = true; return; }

  const restore = { html: document.documentElement.style.overflow, body: document.body.style.overflow };
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  const started = performance.now();
  const fill = intro.querySelector(".frappe-fill");
  const phrase = intro.querySelector(".intro-phrase");
  const mark = intro.querySelector("#introMark");
  let leaving = false, progress = 0, complete = 0, particles;

  function cleanUp() {
    intro.hidden = true;
    document.documentElement.style.overflow = restore.html;
    document.body.style.overflow = restore.body;
    particles?.stop();
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch {}
  }
  function setProgress(value) {
    const next = Math.max(progress, Math.min(100, value));
    if (next === progress || !fill) return;
    const from = `translateY(${100 - progress}%)`, to = `translateY(${100 - next}%)`;
    fill.animate([{ transform: from }, { transform: to }], {
      duration: reduced ? 120 : 380, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards",
    });
    fill.style.transform = to;
    progress = next;
  }
  function loaded() {
    complete += 1;
    setProgress(20 + complete * 25);
    if (complete >= 3) scheduleExit();
  }
  function scheduleExit() {
    if (leaving) return;
    const wait = Math.max(0, MINIMUM - (performance.now() - started));
    window.setTimeout(() => leave(false), wait);
  }
  function launchFlight() {
    if (intro.hasAttribute("data-intro-panel") || reduced) return;
    const target = document.querySelector("#heroStage .hero-logo");
    if (!target || !mark) return;
    const from = mark.getBoundingClientRect(), to = target.getBoundingClientRect();
    if (!from.width || !to.width) return;
    const flight = mark.cloneNode(true);
    flight.removeAttribute("id");
    flight.className = "intro-flight";
    Object.assign(flight.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
    document.body.append(flight);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    flight.animate([
      { transform: "translate3d(0,0,0) scale(1)", opacity: 1 },
      { transform: `translate3d(${dx}px,${dy}px,0) scale(${Math.max(.25, Math.min(1.5, to.width / from.width))})`, opacity: .12 },
    ], { duration: 620, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" }).finished.finally(() => flight.remove());
  }
  function burst() {
    intro.querySelectorAll(".ice-shard").forEach((shard, index) => {
      const angle = (index / 10) * Math.PI * 2;
      shard.animate([
        { opacity: .9, transform: getComputedStyle(shard).transform },
        { opacity: 0, transform: `translate3d(${Math.cos(angle) * 240}px,${Math.sin(angle) * 210}px,0) rotate(${index * 56}deg) scale(.55)` },
      ], { duration: 520, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" });
    });
  }
  function leave(fast) {
    if (leaving) return;
    leaving = true;
    launchFlight();
    if (!reduced) burst();
    intro.classList.add("intro-leaving");
    window.setTimeout(cleanUp, fast || reduced ? 300 : 680);
  }
  function makeSnow(canvas) {
    if (reduced || !canvas.getContext) return null;
    const context = canvas.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1);
    const flakes = Array.from({ length: 32 }, () => ({ x: Math.random(), y: Math.random(), s: 1 + Math.random() * 2, v: .00018 + Math.random() * .00042, d: Math.random() * Math.PI * 2 }));
    let frame = 0, visible = !document.hidden;
    function resize() { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; context.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function draw() {
      if (!visible) return;
      context.clearRect(0, 0, innerWidth, innerHeight);
      flakes.forEach((flake) => { flake.y += flake.v; flake.d += .02; if (flake.y > 1.04) { flake.y = -.04; flake.x = Math.random(); } context.fillStyle = "rgba(198,239,255,.72)"; context.fillRect(flake.x * innerWidth + Math.sin(flake.d) * 9, flake.y * innerHeight, flake.s, flake.s); });
      frame = requestAnimationFrame(draw);
    }
    resize(); draw();
    const visibility = () => { visible = !document.hidden; if (visible && !frame) draw(); if (!visible) { cancelAnimationFrame(frame); frame = 0; } };
    addEventListener("resize", resize, { passive: true }); document.addEventListener("visibilitychange", visibility);
    return { stop() { cancelAnimationFrame(frame); removeEventListener("resize", resize); document.removeEventListener("visibilitychange", visibility); } };
  }

  if (reduced) {
    intro.classList.add("is-copy");
    setProgress(100);
    window.setTimeout(() => leave(true), 700);
    return;
  }
  particles = makeSnow(intro.querySelector(".intro-snow"));
  intro.classList.add("is-waking");
  window.setTimeout(() => intro.classList.add("is-skippable"), 800);
  window.setTimeout(() => { intro.classList.add("is-frosting", "is-assembling"); setProgress(20); }, 1000);
  window.setTimeout(() => intro.classList.add("is-alive"), 2400);
  window.setTimeout(() => { intro.classList.add("is-copy"); setProgress(35); }, 3400);
  let phraseIndex = 0;
  const phraseTimer = window.setInterval(() => { phraseIndex = (phraseIndex + 1) % PHRASES.length; if (phrase) phrase.textContent = PHRASES[phraseIndex]; }, 1250);

  const logoReady = mark?.decode ? mark.decode().catch(() => {}) : Promise.resolve();
  logoReady.then(loaded);
  (document.fonts?.ready || Promise.resolve()).then(loaded);
  addEventListener("barrio:render", loaded, { once: true });
  window.setTimeout(loaded, 7600);
  window.setTimeout(() => leave(false), MAXIMUM - 340);
  intro.querySelector("[data-intro-skip]")?.addEventListener("click", () => leave(true));
  intro.addEventListener("pointerdown", (event) => { if (!event.target.closest("[data-intro-skip]")) leave(true); }, { once: true });
  addEventListener("keydown", (event) => { if (event.key === "Escape") leave(true); }, { once: true });
  const originalLeave = leave;
  leave = (fast) => { window.clearInterval(phraseTimer); originalLeave(fast); };
})();

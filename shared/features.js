(function (root) {
  "use strict";
  const defaults = {
    avisosPedido: true,
    seguimiento: true,
    edad18: true,
    dropDia: true,
    armador: true,
    saboresDistintos2x1: true,
    sonidosCliente: true,
    navidad: true,
    sonidoAdmin: true,
    theme: "normal",
  };
  const storage = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
      } catch { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
  };
  let context = null, audio = null, unlocked = false;
  function config(menu) {
    const source = menu?.funcionesNuevas && typeof menu.funcionesNuevas === "object"
      ? menu.funcionesNuevas : {};
    return Object.assign({}, defaults, source, { theme: menu?.theme === "navidad" ? "navidad" : "normal" });
  }
  function enabled(menu, key) { return config(menu)[key] !== false; }
  function setup(menu) { context = config(menu); return context; }
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    try { if (!audio) audio = new (root.AudioContext || root.webkitAudioContext)(); audio.resume(); } catch {}
  }
  ["pointerdown", "keydown", "touchstart"].forEach((event) =>
    document.addEventListener(event, unlock, { once: true, passive: true }),
  );
  function play(kind = "clink", enabledFlag = true) {
    if (!enabledFlag || !unlocked || !audio) return;
    try {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = kind === "ding" ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(kind === "ding" ? 880 : 1180, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(kind === "ding" ? 660 : 720, audio.currentTime + 0.18);
      oscillator.connect(gain); gain.connect(audio.destination);
      gain.gain.setValueAtTime(0.001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.055, audio.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.22);
      oscillator.start(); oscillator.stop(audio.currentTime + 0.24);
    } catch {}
  }
  function vibrate(duration = 25) { try { root.navigator?.vibrate?.(duration); } catch {} }
  root.BarrioIceFeatures = Object.freeze({
    defaults: Object.freeze(defaults), config, enabled, setup, play, vibrate,
    getLocal: (key, fallback) => storage.get(key, fallback),
    setLocal: (key, value) => storage.set(key, value), unlock,
    get audio() { return audio; }, get context() { return context; },
  });
})(window);

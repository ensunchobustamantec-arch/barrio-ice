(function (root) {
  "use strict";
  const key = "barrio-ice-customer-sound";
  let menu = null;
  function on() { return root.BarrioIceFeatures?.getLocal(key, true) !== false; }
  function update() {
    const button = document.getElementById("biXSoundToggle");
    if (!button) return;
    button.hidden = root.BarrioIceFeatures?.enabled(menu, "sonidosCliente") === false;
    button.setAttribute("aria-pressed", String(on()));
    button.textContent = on() ? "◒ Sonido" : "◌ Silencio";
  }
  function toggle() { root.BarrioIceFeatures?.setLocal(key, !on()); update(); }
  document.addEventListener("barrio:render", (event) => { menu = event.detail?.menu || menu; update(); });
  document.addEventListener("click", (event) => { if (event.target.closest("#biXSoundToggle")) toggle(); });
  document.addEventListener("barrio:item-added", () => { if (on() && root.BarrioIceFeatures?.enabled(menu, "sonidosCliente") !== false) root.BarrioIceFeatures?.play("clink", true); });
  document.addEventListener("barrio:order-created", () => { if (on() && root.BarrioIceFeatures?.enabled(menu, "sonidosCliente") !== false) root.BarrioIceFeatures?.vibrate(45); });
  root.BarrioIceClientSound = Object.freeze({ update });
})(window);

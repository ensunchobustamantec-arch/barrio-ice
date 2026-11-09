(function (root) {
  "use strict";
  const soundKey = "barrio-ice-admin-sound";
  let unread = 0;
  const originalTitle = document.title;
  function enabled() {
    return root.BarrioIceFeatures?.getLocal(soundKey, true) !== false;
  }
  function title() {
    document.title = unread ? "(" + unread + ") Barrio Ice" : originalTitle;
  }
  function text(order) {
    const id = String(order?.id || "").slice(-6).toUpperCase();
    const name = order?.cliente?.nombre || "Cliente";
    const total = Number(order?.total || 0).toLocaleString("es-CO");
    return "Pedido #" + id + " · " + name + " · $" + total;
  }
  function host() {
    let node = document.getElementById("bi-x-admin-notices");
    if (!node) {
      node = document.createElement("div");
      node.id = "bi-x-admin-notices";
      node.className = "bi-x-notice-host";
      node.setAttribute("aria-live", "polite");
      document.body.append(node);
    }
    return node;
  }
  function pulse(id) {
    const card = document.querySelector('[data-order-id="' + CSS.escape(String(id)) + '"]');
    if (!card) return;
    card.classList.remove("bi-x-order-pulse");
    void card.offsetWidth;
    card.classList.add("bi-x-order-pulse");
  }
  function notify(order, options = {}) {
    if (options.enabled === false) return;
    unread += 1;
    title();
    const item = document.createElement("div");
    item.className = "bi-x-order-toast";
    item.innerHTML = "<strong>Pedido nuevo</strong><span></span><button type=\"button\" aria-label=\"Cerrar aviso\">×</button>";
    item.querySelector("span").textContent = text(order);
    item.querySelector("button").onclick = () => item.remove();
    host().prepend(item);
    window.setTimeout(() => item.remove(), 6500);
    pulse(order?.id);
    if (enabled()) {
      root.BarrioIceFeatures?.play("ding", true);
      root.BarrioIceFeatures?.vibrate(35);
      if (root.Notification?.permission === "granted") {
        try { new Notification("Pedido nuevo · Barrio Ice", { body: text(order) }); } catch {}
      }
    }
  }
  function setEnabled(value) {
    root.BarrioIceFeatures?.setLocal(soundKey, value === true);
  }
  window.addEventListener("focus", () => { unread = 0; title(); });
  root.BarrioIceAdminNotice = Object.freeze({ notify, pulse, setEnabled });
})(window);

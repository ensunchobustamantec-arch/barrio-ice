(function () {
  "use strict";
  const key = "barrio-ice-age-confirmed";
  let shown = false, menu = null;
  const $ = (id) => document.getElementById(id);
  function confirmed() { try { return Number(localStorage.getItem(key)) > Date.now(); } catch { return false; } }
  function remember() { try { localStorage.setItem(key, String(Date.now() + 30 * 86400000)); } catch {} }
  function waitForIntro() {
    const intro = $("barrioIntro");
    if (intro && intro.isConnected && !intro.hidden) return window.setTimeout(waitForIntro, 240);
    show();
  }
  function show() {
    if (shown || confirmed() || window.BarrioIceFeatures?.enabled(menu, "edad18") === false) return;
    const dialog = $("biAgeGate");
    if (!dialog) return;
    shown = true;
    dialog.showModal?.(); dialog.setAttribute("open", "");
    $("ageYes")?.focus();
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); return; }
      if (event.key !== "Tab") return;
      const focusables = [...dialog.querySelectorAll("button")].filter((node) => !node.disabled);
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (!first) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    $("ageYes").onclick = () => { remember(); dialog.close?.(); dialog.removeAttribute("open"); dialog.remove(); };
    $("ageNo").onclick = () => {
      dialog.innerHTML = '<div class="bi-x-age-minor"><span class="bi-x-age-mark">❄</span><h2>Lo sentimos</h2><p>Esta tienda es solo para mayores de 18 años.</p></div>';
      dialog.classList.add("bi-x-age-minor-dialog");
      document.documentElement.classList.add("bi-x-age-blocked");
    };
  }
  document.addEventListener("barrio:render", (event) => {
    menu = event.detail?.menu || menu;
    if (window.BarrioIceFeatures?.enabled(menu, "edad18") === false) return;
    waitForIntro();
  });
})();

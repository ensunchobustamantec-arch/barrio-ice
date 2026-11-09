(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  let currentMenu = null;
  function promoText(menu) {
    return window.BarrioDailyPricing.getDayPromo(undefined, menu) === "2x1" ? "Promo 2x1" : "Hoy: sabores del día";
  }
  function render(menu) {
    const banner = $("biXDrop");
    if (!banner || !menu || window.BarrioIceFeatures?.enabled(menu, "dropDia") === false) { banner?.classList.add("hide"); return; }
    const day = window.BarrioDailyPricing.dayIndex(), names = menu.dias?.[day] || [];
    if (!names.length) { banner.classList.add("hide"); return; }
    const tomorrowNames = menu.dias?.[(day + 1) % 7] || [];
    $("biXDropTitle").textContent = promoText(menu);
    $("biXDropFlavors").textContent = names.join(" · ");
    $("biXDropTomorrow").textContent = tomorrowNames.length ? "Mañana sale… " + tomorrowNames.slice(0, 3).join(" · ") : "";
    banner.classList.remove("hide");
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && currentMenu) render(currentMenu); });
  document.addEventListener("barrio:render", (event) => { currentMenu = event.detail?.menu || currentMenu; render(currentMenu); });
})();

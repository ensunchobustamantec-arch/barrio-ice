(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  let currentMenu = null;
  function parts() {
    const values = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(new Date());
    return Object.fromEntries(values.filter((item) => item.type !== "literal").map((item) => [item.type, Number(item.value)]));
  }
  function dayFor(date) { return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay(); }
  function promoText(menu, day) {
    const plan = window.BarrioIcePricing?.planForDay(day, menu);
    return plan?.active ? plan.name : "Hoy: sabores del día";
  }
  function render(menu) {
    const banner = $("biXDrop");
    if (!banner || !menu || window.BarrioIceFeatures?.enabled(menu, "dropDia") === false) { banner?.classList.add("hide"); return; }
    const date = parts(), day = dayFor(date), names = menu.dias?.[day] || [];
    if (!names.length) { banner.classList.add("hide"); return; }
    const tomorrow = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
    const tomorrowNames = menu.dias?.[tomorrow.getUTCDay()] || [];
    $("biXDropTitle").textContent = promoText(menu, day);
    $("biXDropFlavors").textContent = names.join(" · ");
    $("biXDropTomorrow").textContent = tomorrowNames.length ? "Mañana sale… " + tomorrowNames.slice(0, 3).join(" · ") : "";
    banner.classList.remove("hide");
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && currentMenu) render(currentMenu); });
  document.addEventListener("barrio:render", (event) => { currentMenu = event.detail?.menu || currentMenu; render(currentMenu); });
})();

(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  let timer = null, currentMenu = null;
  function parts() {
    const values = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(new Date());
    return Object.fromEntries(values.filter((item) => item.type !== "literal").map((item) => [item.type, Number(item.value)]));
  }
  function dayFor(date) { return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay(); }
  function targetMs(date) { return Date.UTC(date.year, date.month - 1, date.day + 1) - 18000000; }
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
    clearInterval(timer);
    const tick = () => {
      const remaining = Math.max(0, targetMs(parts()) - Date.now());
      const hours = Math.floor(remaining / 3600000), minutes = Math.floor(remaining / 60000) % 60, seconds = Math.floor(remaining / 1000) % 60;
      $("biXDropCountdown").textContent = "Cambia en " + String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    };
    tick(); timer = setInterval(tick, 1000);
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) clearInterval(timer); else if (currentMenu) render(currentMenu); });
  document.addEventListener("barrio:render", (event) => { currentMenu = event.detail?.menu || currentMenu; render(currentMenu); });
})();

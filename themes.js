(function () {
  "use strict";
  let menu = null, lights = null;
  function apply() {
    const navidad = menu?.theme === "navidad" && menu?.funcionesNuevas?.navidad !== false;
    document.documentElement.dataset.theme = navidad ? "navidad" : "dark";
    if (!lights && navidad && document.body) {
      lights = document.createElement("div");
      lights.className = "bi-x-christmas-lights";
      lights.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 18; i += 1) { const bulb = document.createElement("i"); bulb.style.setProperty("--bi-x-delay", (i * -0.18) + "s"); lights.append(bulb); }
      document.body.prepend(lights);
    }
    if (lights) lights.hidden = !navidad;
  }
  document.addEventListener("barrio:render", (event) => { menu = event.detail?.menu || menu; apply(); });
  document.addEventListener("visibilitychange", () => { if (lights) lights.classList.toggle("bi-x-paused", document.hidden); });
})();

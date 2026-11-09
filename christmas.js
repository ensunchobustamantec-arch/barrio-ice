(function () {
  "use strict";
  let scene, hills, banner, active = false;
  const svg = (body, viewBox, className) => `<svg class="${className}" viewBox="${viewBox}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  function mount() {
    if (scene || !document.querySelector("#storefront")) return;
    scene = document.createElement("div");
    scene.className = "bi-x-christmas-scene";
    scene.setAttribute("aria-hidden", "true");
    scene.innerHTML = `
      <div class="bi-x-snow"></div>
      ${svg('<path d="M40 0v22" stroke="#e6cd82" stroke-width="2"/><circle cx="40" cy="38" r="15" fill="#b8394c" stroke="#f6d486" stroke-width="2"/><path d="M32 30q4-5 8-5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>', '0 0 80 60', 'bi-x-ornament bi-x-ornament-left')}
      ${svg('<path d="M40 0v22" stroke="#e6cd82" stroke-width="2"/><circle cx="40" cy="38" r="15" fill="#d5a43d" stroke="#f9e9b5" stroke-width="2"/><path d="M32 30q4-5 8-5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>', '0 0 80 60', 'bi-x-ornament bi-x-ornament-right')}
      ${svg('<path d="M12 83q8-23 29-23t29 23" fill="#dfedf1"/><circle cx="41" cy="47" r="19" fill="#f4ffff"/><path d="M23 37q16-15 35 0" fill="#dfedf1"/><path d="M25 58q17 8 34 0l2 7q-18 9-39 0z" fill="#c94554"/><path class="bi-x-scarf" d="M49 64q12 4 13 20l-9 2q0-10-7-15z" fill="#d6555c"/><g class="bi-x-snow-eyes" fill="#182a33"><circle cx="34" cy="46" r="2"/><circle cx="47" cy="46" r="2"/></g><path d="M40 50l11 3-11 2z" fill="#f1943e"/><path d="M31 28h21l-3-14H34z" fill="#193840"/><path d="M27 29h29" stroke="#193840" stroke-width="4" stroke-linecap="round"/><path class="bi-x-wave" d="M65 67l12-13 4-7m-4 7 8 1m-8-1-1-8" fill="none" stroke="#886744" stroke-width="3" stroke-linecap="round"/><path d="M17 69L6 58M10 62 5 63" fill="none" stroke="#886744" stroke-width="3" stroke-linecap="round"/>', '0 0 90 90', 'bi-x-snowman')}
      ${svg('<path d="M9 76q2-19 25-20t28 20" fill="#bd3547"/><circle cx="36" cy="44" r="20" fill="#f2bf9d"/><path d="M15 38q3-27 25-26 16 0 21 17l-39 7z" fill="#c6374a"/><circle cx="60" cy="28" r="6" fill="#fff"/><path d="M15 37q20-7 43-5" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/><path d="M18 51q2 27 18 29 18-1 19-29-8 10-19 3-9 7-18-3" fill="#f4ffff"/><circle cx="29" cy="44" r="2" fill="#24313c"/><circle cx="43" cy="44" r="2" fill="#24313c"/><circle cx="36" cy="49" r="3" fill="#d78d79"/>', '0 0 75 84', 'bi-x-santa')}
      ${svg('<path d="M20 35q10 13 35 10l16-8-2 14q-7 12-30 12H18q-13 0-12-11" fill="#c83748" stroke="#f5ca78" stroke-width="3"/><path d="M3 65h72q10 0 13-7" fill="none" stroke="#f6d785" stroke-width="3"/><circle cx="40" cy="27" r="8" fill="#f3c7a6"/><path d="M31 26q7-18 19-5l-16 6" fill="#d83c4b"/><path d="M46 35l15-8" stroke="#f6d785" stroke-width="2"/><path d="M80 45h26m8 0h26" stroke="#eed8b0" stroke-width="2"/><g fill="#ba8861"><ellipse cx="111" cy="39" rx="11" ry="6"/><circle cx="122" cy="34" r="4"/><ellipse cx="146" cy="39" rx="11" ry="6"/><circle cx="157" cy="34" r="4"/></g><path d="M104 44l-4 8m16-8 4 8m19-8-4 8m16-8 4 8m-33-20-3-6m3 6 5-6m30 6-3-6m3 6 5-6" stroke="#d3a277" stroke-width="2" fill="none"/>', '0 0 170 75', 'bi-x-sleigh')}
      <div class="bi-x-snow-confetti"></div>`;
    const snow = scene.querySelector(".bi-x-snow");
    for (let layer = 0; layer < 3; layer += 1) {
      const group = document.createElement("div");
      group.className = "bi-x-snow-layer bi-x-snow-layer-" + layer;
      for (let i = 0; i < 18; i += 1) {
        const flake = document.createElement("span");
        flake.innerHTML = "<i></i>";
        flake.style.cssText = `--x:${(i * 37 + layer * 17) % 100}%;--y:${(i * 31 + layer * 13) % 95}%;--delay:-${(i * .71 + layer).toFixed(2)}s;--duration:${10 + layer * 4 + i % 4}s;--drift:${i % 2 ? 24 : -24}px`;
        group.append(flake);
      }
      snow.append(group);
    }
    document.body.append(scene);
    const status = document.querySelector(".hero > .eyebrow");
    if (status) {
      banner = document.createElement("span");
      banner.className = "bi-x-season-banner";
      banner.innerHTML = '<i aria-hidden="true">✦</i> ¡Navidad en Barrio Ice! <i aria-hidden="true">✦</i>';
      status.append(banner);
    }
    const footer = document.querySelector(".footer");
    if (footer) {
      footer.insertAdjacentHTML("beforeend", svg('<path d="M0 38Q100 2 205 39T410 40T620 34T820 38V90H0z" fill="#dff8ff"/><path d="M0 55Q120 25 250 54T480 55T820 52V90H0z" fill="#f5ffff"/><g fill="#286b59"><path d="M110 48l13-30 13 30h-8v9h-10v-9zM610 49l17-38 17 38h-11v10h-12V49zM680 52l11-26 11 26h-7v8h-8v-8z"/></g>', '0 0 820 90', 'bi-x-holiday-hills'));
      hills = footer.querySelector(".bi-x-holiday-hills");
    }
  }
  document.addEventListener("barrio:render", (event) => {
    const menu = event.detail?.menu;
    active = menu?.theme === "navidad" && menu?.funcionesNuevas?.navidad !== false;
    if (active) mount();
    if (scene) scene.hidden = !active;
    if (banner) banner.hidden = !active;
    if (hills) hills.style.display = active ? "" : "none";
  });
  document.addEventListener("visibilitychange", () => document.documentElement.classList.toggle("bi-x-season-paused", document.hidden));
  document.addEventListener("barrio:order-created", () => {
    if (!active || !scene || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const burst = scene.querySelector(".bi-x-snow-confetti");
    burst.innerHTML = Array.from({ length: 24 }, (_, i) => `<i style="--x:${8 + i * 3.6}%;--delay:${(i % 5) * .08}s;--turn:${i % 2 ? 90 : -90}deg"></i>`).join("");
    window.setTimeout(() => { burst.innerHTML = ""; }, 2200);
  });
})();

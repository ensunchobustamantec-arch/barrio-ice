(function () {
  "use strict";
  let menu = null, selection = { names: [], size: "Mediano" };
  const $ = (id) => document.getElementById(id);
  const esc = (value) => window.BarrioShared?.esc(value) || String(value ?? "");
  function tone(hex, amount) {
    const value = /^#[0-9a-f]{6}$/i.test(String(hex || "")) ? String(hex) : "#5bc0eb";
    const rgb = value.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16));
    return "#" + rgb.map((channel) => Math.max(0, Math.min(255, Math.round(channel + (amount > 0 ? (255 - channel) * amount : channel * amount)))).toString(16).padStart(2, "0")).join("");
  }
  function flavorColor(name) { return menu?.cat?.find((item) => item.n === name)?.c || "#5bc0eb"; }
  function draw() {
    const host = $("biXBuilder");
    if (!host || !menu || window.BarrioIceFeatures?.enabled(menu, "armador") === false || !selection.names.length) { host?.classList.add("hide"); return; }
    const colors = selection.names.map(flavorColor), first = colors[0], second = colors[1] || colors[0];
    const scale = selection.size === "Grande" ? 1.14 : selection.size === "Pequeño" ? .84 : 1;
    host.classList.remove("hide");
    host.innerHTML = '<div class="bi-x-builder-copy"><span>Vista del frío</span><strong>' + esc(selection.names.join(" / ")) + '</strong><small>' + esc(selection.size) + '</small></div><svg class="bi-x-builder-svg" viewBox="0 0 220 260" style="--bi-x-scale:' + scale + '" role="img" aria-label="Vaso de granizado de ' + esc(selection.names.join(" y ")) + '"><defs><linearGradient id="biXGlass" x1="0" x2="1"><stop stop-color="#ffffff55"/><stop offset=".45" stop-color="#7deaff33"/><stop offset="1" stop-color="#07192388"/></linearGradient><linearGradient id="biXFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="' + tone(first, .45) + '"/><stop offset=".5" stop-color="' + first + '"/><stop offset="1" stop-color="' + tone(second, -.18) + '"/></linearGradient></defs><ellipse class="bi-x-builder-shadow" cx="110" cy="238" rx="60" ry="10"/><g class="bi-x-builder-cup"><path class="bi-x-builder-fill" d="M55 93h110l-10 122q-2 13-15 13H80q-13 0-15-13z" fill="url(#biXFill)"/><path class="bi-x-builder-glass" d="M55 93h110l-10 122q-2 13-15 13H80q-13 0-15-13z" fill="url(#biXGlass)"/><ellipse class="bi-x-builder-rim" cx="110" cy="93" rx="55" ry="15"/><path class="bi-x-builder-ice" d="M70 87l15-17 16 13 15-19 17 18 16-12 12 17-16 12-23-8-24 8z"/><path class="bi-x-builder-straw" d="M134 83L150 20"/><path class="bi-x-builder-straw-mark" d="M143 47l9 4m-13 12 9 4m-14 12 9 4"/></g></svg>';
  }
  function set(names, size) { selection = { names: names.filter(Boolean).slice(0, 2), size: size || "Mediano" }; draw(); }
  document.addEventListener("barrio:render", (event) => { menu = event.detail?.menu || menu; draw(); });
  document.addEventListener("click", (event) => {
    const size = event.target.closest("[data-flavor][data-size]");
    if (size) { const names = [size.dataset.flavor]; set(names, ["Pequeño", "Mediano", "Grande"][Number(size.dataset.size)]); }
  });
  document.addEventListener("change", (event) => {
    if (!["halfFlavorA", "halfFlavorB", "halfSize"].includes(event.target.id)) return;
    const names = [$("halfFlavorA")?.value, $("halfFlavorB")?.value];
    set(names, ["Pequeño", "Mediano", "Grande"][Number($("halfSize")?.value || 1)]);
  });
})();

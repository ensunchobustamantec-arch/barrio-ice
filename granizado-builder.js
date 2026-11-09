(function () {
  "use strict";
  let menu = null, selection = { names: [], size: "Mediano", gift: "", mixed: false };
  const $ = (id) => document.getElementById(id);
  const esc = (value) => window.BarrioShared.esc(value);
  const sizes = ["Pequeño", "Mediano", "Grande"];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  function flavor(name) { return (menu?.cat || []).find((item) => item.n === name); }
  function color(name) {
    const value = flavor(name)?.c;
    return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : "#5bc0eb";
  }
  function tone(hex, amount) {
    const rgb = hex.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16));
    return "#" + rgb.map((channel) => Math.max(0, Math.min(255, Math.round(channel + (amount > 0 ? (255 - channel) * amount : channel * amount)))).toString(16).padStart(2, "0")).join("");
  }
  function cup(name, index, mixed) {
    const base = color(name), second = mixed ? color(selection.names[1]) : base;
    const dark = flavor(name)?.cupStyle === "black";
    const id = "bi-x-cup-" + index;
    const scale = selection.size === "Grande" ? 1.08 : selection.size === "Pequeño" ? .86 : .97;
    const description = mixed ? selection.names.join(" y ") : name;
    return `<div class="bi-x-cup-scene ${dark ? "bi-x-cup-black" : ""}" role="img" aria-label="Granizado de ${esc(description)}, vaso ${dark ? "negro" : "blanco"}, ${esc(selection.size)}">
      <div class="bi-x-cup-tilt"><div class="bi-x-cup-float" style="--bi-x-cup-scale:${scale}">
        <svg class="bi-x-cup-art bi-x-cup-back" viewBox="40 24 200 310" aria-hidden="true">
          <defs>
            <linearGradient id="${id}-ice" x1="0" x2="0" y1="0" y2="1"><stop stop-color="${tone(base, .78)}"/><stop offset=".48" stop-color="${tone(base, .3)}"/><stop offset="1" stop-color="${tone(second, -.14)}"/></linearGradient>
            <pattern id="${id}-crystals" width="17" height="15" patternUnits="userSpaceOnUse"><path d="M2 4l3-2 2 3-3 2zM12 10l2-2 2 2-2 2z" fill="#fff" opacity=".6"/><circle cx="9" cy="3" r="1.1" fill="#fff" opacity=".75"/></pattern>
          </defs>
          <g class="bi-x-straw-normal"><path d="M170 142l25-103" fill="none" stroke="#e66e21" stroke-width="10" stroke-linecap="round"/><path d="M170 142l25-103" fill="none" stroke="#ffbd62" stroke-width="3" stroke-linecap="round"/></g>
          <g class="bi-x-straw-christmas"><path d="M170 142l25-103" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="M170 142l25-103" fill="none" stroke="#d63242" stroke-width="7" stroke-dasharray="5 7"/></g>
          <g class="bi-x-ice-rise"><path d="M62 162q5-19 17-24 1-14 16-18 4-15 18-16 5-15 24-11 14-13 28 0 16-1 21 14 16 4 17 18 14 8 19 37z" fill="url(#${id}-ice)" stroke="${tone(base, .67)}" stroke-width="2"/><path d="M62 162q5-19 17-24 1-14 16-18 4-15 18-16 5-15 24-11 14-13 28 0 16-1 21 14 16 4 17 18 14 8 19 37z" fill="url(#${id}-crystals)"/><path d="M85 137q8-12 19-10m15-18q10-7 20-5m17 5q12-4 18 7m10 16q10-2 16 8" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="4" stroke-linecap="round"/></g>
        </svg>
        <svg class="bi-x-cup-art bi-x-cup-front" viewBox="40 24 200 310" aria-hidden="true">
          <defs>
            <linearGradient id="${id}-cup" x1="0" x2="1" y1="0" y2="0"><stop stop-color="${dark ? "#101920" : "#c8d9dd"}"/><stop offset=".24" stop-color="${dark ? "#344752" : "#fff"}"/><stop offset=".58" stop-color="${dark ? "#0b1219" : "#f1f9f8"}"/><stop offset="1" stop-color="${dark ? "#344c5a" : "#b8cbd1"}"/></linearGradient>
            <pattern id="${id}-frost" width="13" height="13" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1.1" fill="${dark ? "#b8ecff" : "#fff"}" opacity=".55"/><circle cx="10" cy="10" r=".8" fill="#fff" opacity=".55"/></pattern>
          </defs>
          <ellipse cx="140" cy="167" rx="79" ry="22" fill="${tone(base, .12)}"/>
          <ellipse cx="140" cy="167" rx="79" ry="22" fill="url(#${id}-crystals)" opacity=".55"/>
          <path d="M62 166q78 23 156 0l-17 133q-2 18-18 21-43 8-86 0-16-3-18-21z" fill="url(#${id}-cup)" stroke="${dark ? "#8ccde1" : "#d8eaec"}" stroke-width="2"/>
          <path d="M62 166q78 23 156 0l-17 133q-2 18-18 21-43 8-86 0-16-3-18-21z" fill="url(#${id}-frost)"/>
          ${dark ? '<path d="M64 169q18 7 32 9l2 23q2 8 7 0l3-18 12 2 2 33q1 9 7 0l4-32q39 2 83-17l-3 25q-6 8-11 1l-5 19q-3 7-7 0l-1-19q-43 13-83 2-19-2-38-10z" fill="#050b10" opacity=".9"/>' : ''}
          <path d="M79 185l11 105" stroke="#fff" stroke-width="5" opacity=".36" stroke-linecap="round"/><path d="M203 190l-9 92" stroke="#fff" stroke-width="2" opacity=".28" stroke-linecap="round"/>
          <ellipse cx="140" cy="165" rx="78" ry="20" fill="none" stroke="#a82728" stroke-width="9"/><ellipse cx="140" cy="165" rx="77" ry="20" fill="none" stroke="#ed7551" stroke-width="4" stroke-dasharray="1 5" stroke-linecap="round"/>
          <g fill="#fff" opacity=".58"><ellipse cx="91" cy="223" rx="2" ry="4"/><ellipse cx="193" cy="229" rx="2" ry="4"/><ellipse cx="182" cy="283" rx="1.5" ry="3"/><ellipse cx="100" cy="281" rx="1.5" ry="3"/></g>
          <circle cx="140" cy="251" r="39" fill="#fff" stroke="#d6e7e9" stroke-width="2"/><circle cx="140" cy="251" r="34" fill="#072434"/><image href="/assets/brand/logo-dark-mobile.webp" x="117" y="215" width="46" height="71" preserveAspectRatio="xMidYMid meet"/>
        </svg>
        <svg class="bi-x-cup-art bi-x-cup-toppings" viewBox="40 24 200 310" aria-hidden="true">
          <g class="bi-x-candies"><path d="M102 124l-19-49" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="81" cy="70" r="13" fill="#e74458" stroke="#ffb4a6" stroke-width="3"/><path d="M74 68q6-8 13-2" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2"/>
            <path d="M173 127l34-46" stroke="#e87826" stroke-width="5" stroke-linecap="round"/><circle cx="208" cy="79" r="5" fill="#ffe2a0"/><path d="M204 76l3-5m1 6 5-2m-10 5-4-2" stroke="#fff" stroke-width="2"/>
            <ellipse cx="111" cy="126" rx="17" ry="10" fill="none" stroke="#f8c948" stroke-width="8" transform="rotate(-25 111 126)"/><ellipse cx="111" cy="126" rx="17" ry="10" fill="none" stroke="#fff3b0" stroke-opacity=".7" stroke-width="2" transform="rotate(-25 111 126)"/>
            <ellipse cx="157" cy="134" rx="16" ry="9" fill="none" stroke="#ed6280" stroke-width="8" transform="rotate(18 157 134)"/><ellipse cx="157" cy="134" rx="16" ry="9" fill="none" stroke="#ffe4ee" stroke-opacity=".7" stroke-width="2" transform="rotate(18 157 134)"/>
            <path d="M116 150q4-15 13-10t14-4q4-7 13-3" fill="none" stroke="#258fc7" stroke-width="9" stroke-linecap="round"/><path d="M116 148q6-9 12-6t14-4" fill="none" stroke="#a8eeff" stroke-width="3" stroke-linecap="round"/>
            <circle cx="177" cy="118" r="10" fill="#81c840"/><circle cx="174" cy="114" r="3" fill="#e4ffa9"/>
          </g>
          <g class="bi-x-builder-santa"><path d="M92 108q9-25 29-35 13 9 15 31z" fill="#c93445"/><path d="M91 106q23-5 47 2" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/><circle cx="122" cy="72" r="6" fill="#fff"/></g>
          <g class="bi-x-builder-sparkles" fill="#fff"><path d="M98 99l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M188 142l1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5 5-1.5z"/></g>
        </svg>
      </div></div><span class="bi-x-cup-name">${esc(description)}</span></div>`;
  }
  function draw() {
    const host = $("biXBuilder"), name = selection.names[0];
    if (!host || !menu || window.BarrioIceFeatures?.enabled(menu, "armador") === false || !name || !flavor(name)) { host?.classList.add("hide"); return; }
    const day = window.BarrioShared.now().getDay();
    const promo = window.BarrioIcePricing.planForDay(day, menu).active;
    const gift = selection.gift && flavor(selection.gift) ? selection.gift : name;
    host.classList.remove("hide");
    host.innerHTML = `<div class="bi-x-builder-copy"><span>Tu frío, a tu manera</span><strong>${esc(selection.mixed ? selection.names.join(" / ") : name)}</strong><small>${esc(selection.size)}${promo ? " · 2x1" : ""}</small></div><div class="bi-x-builder-stage ${promo ? "bi-x-builder-pair" : ""}"><div class="bi-x-builder-table" aria-hidden="true"></div>${cup(name, 0, selection.mixed)}${promo ? cup(gift, 1, false) : ""}</div>`;
  }
  function set(names, size, mixed) {
    selection = { names: names.filter(Boolean).slice(0, 2), size: size || "Mediano", gift: "", mixed: !!mixed };
    draw();
  }
  document.addEventListener("barrio:render", (event) => { menu = event.detail?.menu || menu; draw(); });
  document.addEventListener("click", (event) => {
    const size = event.target.closest("[data-flavor][data-size]");
    if (size && !size.disabled) set([size.dataset.flavor], sizes[Number(size.dataset.size)], false);
  });
  document.addEventListener("change", (event) => {
    if (["halfFlavorA", "halfFlavorB", "halfSize"].includes(event.target.id)) {
      set([$("halfFlavorA")?.value, $("halfFlavorB")?.value], sizes[Number($("halfSize")?.value || 1)], true);
    } else if (event.target.id === "promoGiftFlavor" || event.target.matches("[data-gift-flavor]")) {
      selection.gift = event.target.value;
      draw();
    }
  });
  const host = $("biXBuilder");
  let pointer = null;
  function resetTilt() {
    host?.querySelectorAll(".bi-x-cup-tilt").forEach((tilt) => { tilt.style.transform = ""; });
    pointer = null;
  }
  host?.addEventListener("pointerdown", (event) => {
    if (reduced.matches || pointer !== null) return;
    const scene = event.target.closest(".bi-x-cup-scene");
    if (!scene) return;
    pointer = event.pointerId;
    scene.setPointerCapture?.(pointer);
  });
  host?.addEventListener("pointermove", (event) => {
    if (reduced.matches || (event.pointerType !== "mouse" && pointer !== event.pointerId)) return;
    const scene = event.target.closest(".bi-x-cup-scene"), tilt = scene?.querySelector(".bi-x-cup-tilt");
    if (!tilt) return;
    const rect = scene.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
    tilt.style.transform = `perspective(720px) rotateX(${-y * 8}deg) rotateY(${x * 12}deg)`;
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((type) => host?.addEventListener(type, resetTilt));
  document.addEventListener("visibilitychange", () => host?.classList.toggle("bi-x-builder-paused", document.hidden));
  if (host && "IntersectionObserver" in window) new IntersectionObserver(([entry]) => host.classList.toggle("bi-x-builder-offscreen", !entry.isIntersecting)).observe(host);
})();

(function () {
  "use strict";
  const pricing = window.BarrioDailyPricing, order = [1, 2, 3, 4, 5, 6, 0];
  const format = (value) => Number(value).toLocaleString("es-CO", { maximumFractionDigits: 0 });
  const esc = (value) => window.BarrioShared.esc(value);
  let state = null, host = null, context = null;
  function parse(value) {
    const text = String(value).trim();
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(text)) return null;
    const price = Number(text.replace(/\./g, ""));
    return Number.isSafeInteger(price) && price >= 0 ? price : null;
  }
  function sourceKey(menu) { return JSON.stringify([menu.dailyPricing, menu.precios, menu.promos, menu.mitadMitad, pricing.getSizes(menu)]); }
  function markDirty() { state.dirty = true; state.message = ""; refresh(); }
  function refresh() {
    const note = host?.querySelector(".bi-x-pricing-dirty");
    if (note) note.textContent = state.dirty ? "Tienes cambios sin guardar." : "";
    const preview = host?.querySelector(".bi-x-pricing-preview");
    if (preview) {
      const menu = { ...context.menu, dailyPricing: state.draft };
      const plan = pricing.getDayPlan(undefined, menu);
      preview.textContent = "Hoy el cliente verá: " + plan.title + " · " + pricing.getSizes(menu).map((size, i) => size + " $" + format(plan.prices[i] || 0)).join(" · ");
    }
  }
  function render() {
    if (!host?.isConnected || !state) return;
    const sizes = pricing.getSizes(context.menu), today = pricing.dayIndex();
    host.innerHTML = '<p class="notice">Cada día tiene sus propios precios. Los cambios se publican al guardar.</p>' +
      (context.menu.funcionesNuevas?.preciosPorDia === false ? '<p class="notice">Precios por día está desactivado en Ajustes. El cliente sigue viendo los precios anteriores.</p>' : '') +
      '<div class="bi-x-pricing-days">' + order.map((day) => {
        const key = pricing.KEYS[day], entry = state.draft[key];
        return '<details class="bi-x-pricing-day" data-bi-day="' + key + '" ' + (state.open.has(key) ? 'open' : '') + '><summary>' + pricing.LABELS[day] + (day === today ? '<span class="bi-x-pricing-today">Hoy</span>' : '') + '</summary><div class="bi-x-pricing-body"><label class="switch"><span>Promo 2x1 este día</span><input type="checkbox" data-bi-promo="' + key + '" ' + (entry.promo === "2x1" ? 'checked' : '') + '></label>' +
          [["normal", "Precios normales"], ["promoPrices", "Precios 2x1"]].map(([list, title]) => '<fieldset class="bi-x-pricing-list"><legend>' + title + '</legend>' + sizes.map((size, index) => '<label class="bi-x-pricing-field"><span>' + esc(size) + '</span><span class="bi-x-pricing-pesos">$ <input type="text" inputmode="numeric" autocomplete="off" aria-label="' + esc(pricing.LABELS[day] + ' · ' + title + ' · ' + size) + '" data-bi-price="' + key + '" data-list="' + list + '" data-index="' + index + '" value="' + (entry[list][index] === null ? '' : format(entry[list][index])) + '"></span></label>').join('') + '</fieldset>').join('') +
          '<details class="bi-x-pricing-copy"><summary>Copiar a otros días</summary><div class="bi-x-pricing-targets">' + order.filter((target) => target !== day).map((target) => '<label class="check"><input type="checkbox" data-bi-copy-target="' + key + '" value="' + pricing.KEYS[target] + '"> ' + pricing.LABELS[target] + '</label>').join('') + '</div><button type="button" class="secondary" data-bi-copy="' + key + '">Copiar a los días elegidos</button></details></div></details>';
      }).join('') + '</div><label class="switch"><span>Permitir mitad y mitad</span><input id="halfEnabled" type="checkbox" ' + (state.half ? 'checked' : '') + '></label><p class="bi-x-pricing-preview" aria-live="polite"></p><p class="bi-x-pricing-dirty" role="status"></p><div class="save"><button type="button" class="primary" id="savePrices" ' + (state.saving ? 'disabled' : '') + '>' + (state.saving ? 'Guardando…' : 'Guardar cambios') + '</button><span id="priceSaved" class="saved" role="status">' + esc(state.message) + '</span></div>';
    if (state.saving) host.querySelectorAll("input, button").forEach((node) => { node.disabled = true; });
    refresh();
  }
  function readInput(input) {
    const value = parse(input.value);
    state.draft[input.dataset.biPrice][input.dataset.list][Number(input.dataset.index)] = value;
    input.setAttribute("aria-invalid", value === null ? "true" : "false");
    input.setCustomValidity(value === null ? "Escribe un precio entero, sin negativos ni decimales." : "");
    return value;
  }
  function bind() {
    host.addEventListener("toggle", (event) => { if (event.target.dataset?.biDay) event.target.open ? state.open.add(event.target.dataset.biDay) : state.open.delete(event.target.dataset.biDay); }, true);
    host.oninput = (event) => { if (event.target.matches("[data-bi-price]")) { readInput(event.target); markDirty(); } };
    host.onchange = (event) => {
      if (event.target.dataset.biPromo) { state.draft[event.target.dataset.biPromo].promo = event.target.checked ? "2x1" : "ninguna"; markDirty(); }
      if (event.target.id === "halfEnabled") { state.half = event.target.checked; markDirty(); }
    };
    host.onfocusin = (event) => {
      if (event.target.matches("[data-bi-price]") && parse(event.target.value) !== null) event.target.value = String(parse(event.target.value));
    };
    host.onfocusout = (event) => {
      if (!event.target.matches("[data-bi-price]")) return;
      const value = readInput(event.target);
      if (value !== null) event.target.value = format(value);
    };
    host.onclick = async (event) => {
      const copy = event.target.closest("[data-bi-copy]");
      if (copy) {
        const targets = [...host.querySelectorAll('[data-bi-copy-target="' + copy.dataset.biCopy + '"]:checked')];
        if (!targets.length) { state.message = "Elige al menos un día para copiar."; host.querySelector("#priceSaved").textContent = state.message; return; }
        targets.forEach((input) => { state.draft[input.value] = JSON.parse(JSON.stringify(state.draft[copy.dataset.biCopy])); });
        markDirty(); render(); return;
      }
      if (!event.target.closest("#savePrices") || state.saving) return;
      const invalid = [...host.querySelectorAll("[data-bi-price]")].find((input) => readInput(input) === null);
      if (invalid) {
        invalid.closest("details[data-bi-day]").open = true;
        invalid.focus(); invalid.reportValidity(); return;
      }
      state.saving = true; render();
      let saved = false;
      try { saved = await context.onSave(JSON.parse(JSON.stringify(state.draft)), state.half); }
      catch (error) { console.error(error); }
      state.saving = false;
      state.message = saved ? "Precios guardados correctamente." : "No se pudo guardar. Revisa la conexión y vuelve a intentar.";
      if (saved) { state.dirty = false; state.source = sourceKey(context.menu); }
      render();
      if (saved) {
        const message = state.message;
        window.setTimeout(() => { if (state.message === message) { state.message = ""; const note = host?.querySelector("#priceSaved"); if (note) note.textContent = ""; } }, 3600);
      }
    };
  }
  function mount(element, options) {
    host = element; context = options;
    if (!host) return;
    const source = sourceKey(options.menu);
    if (!state || (!state.dirty && !state.saving && state.source !== source)) state = { source, draft: pricing.editorSeed(options.menu), half: options.menu.mitadMitad !== false, dirty: false, saving: false, message: "", open: new Set([pricing.KEYS[pricing.dayIndex()]]) };
    render(); bind();
  }
  window.addEventListener("beforeunload", (event) => { if (state?.dirty) { event.preventDefault(); event.returnValue = ""; } });
  window.BarrioDailyPricingEditor = Object.freeze({ mount });
})();

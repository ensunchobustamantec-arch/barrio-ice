(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BarrioDailyPricing = api;
})(typeof globalThis === "undefined" ? this : globalThis, function (root) {
  "use strict";
  const KEYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const DEFAULT_SIZES = ["Pequeño", "Mediano", "Grande"];
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" });
  function asDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(value + "T12:00:00-05:00") : value === undefined ? new Date() : new Date(value);
  }
  function dateKey(value) {
    const parts = Object.fromEntries(formatter.formatToParts(asDate(value)).map((part) => [part.type, part.value]));
    return parts.year + "-" + parts.month + "-" + parts.day;
  }
  function dayIndex(value) {
    if (Number.isInteger(value) && value >= 0 && value <= 6) return value;
    return new Date(dateKey(value) + "T12:00:00Z").getUTCDay();
  }
  function getSizes(menu = {}) {
    const source = menu.tamanos || menu.sizes;
    const names = Array.isArray(source) ? source.map((item) => typeof item === "string" ? item : item?.n || item?.name).filter(Boolean) : [];
    return names.length ? [...names] : [...DEFAULT_SIZES];
  }
  function legacyPlan(value, menu = {}) {
    const day = dayIndex(value), weekday = menu.precios?.semana || [12000, 15000, 18000];
    const prices = day >= 1 && day <= 3 ? weekday : day === 4 ? menu.precios?.jueves || weekday : menu.precios?.finde || [8000, 12000, 15000];
    return makePlan(menu.promos?.[KEYS[day]] === true ? "2x1" : "ninguna", prices, "legacy");
  }
  function makePlan(promo, prices, source) {
    return promo === "2x1"
      ? { title: "2x1", name: "Promo 2x1", buy: 1, receive: 2, prices: [...prices], active: true, promo, source }
      : { title: "Precios normales", name: "Precios normales", buy: 0, receive: 0, prices: [...prices], active: false, promo: "ninguna", source };
  }
  function entryForDay(menu, value) {
    const day = dayIndex(value), data = menu.dailyPricing || {};
    return data[KEYS[day]] || data[LABELS[day].toLowerCase()];
  }
  function isComplete(entry, sizes) {
    const valid = (values) => Array.isArray(values) && values.length === sizes.length && values.every((price) => Number.isSafeInteger(price) && price >= 0);
    return !!entry && ["ninguna", "2x1"].includes(entry.promo) && valid(entry.normal) && valid(entry.promoPrices);
  }
  function getDayPlan(value, menu = {}, options = {}) {
    const entry = entryForDay(menu, value), enabled = menu.funcionesNuevas?.preciosPorDia !== false;
    if (enabled && isComplete(entry, getSizes(menu))) {
      const promo = options.promo === undefined ? entry.promo : options.promo;
      return makePlan(promo, promo === "2x1" ? entry.promoPrices : entry.normal, "daily");
    }
    const plan = legacyPlan(value, menu);
    return options.promo === undefined ? plan : makePlan(options.promo, plan.prices, "legacy");
  }
  function getDayPromo(value, menu, options) { return getDayPlan(value, menu, options).promo; }
  function getUnitPrice(value, size, menu = {}, options) {
    const index = typeof size === "number" ? size : getSizes(menu).indexOf(size);
    return getDayPlan(value, menu, options).prices[index];
  }
  function repriceItems(items, value, menu = {}, options) {
    const plan = getDayPlan(value, menu, options), sizes = getSizes(menu);
    return (Array.isArray(items) ? items : []).map((source) => {
      const item = { ...source };
      if (!item.regalo && (item.g === true || item.tipo === "granizado")) {
        const price = plan.prices[sizes.indexOf(item.s)];
        if (Number.isSafeInteger(price) && price >= 0) item.p = price;
        if (plan.promo !== "2x1") { delete item.secondFlavor; delete item.giftFlavor; }
      }
      return item;
    });
  }
  function calcOrderTotal(items, value, menu = {}, options) {
    const pricing = typeof module === "object" && module.exports ? require("../pricing.js") : root.BarrioIcePricing;
    return pricing.calculate(repriceItems(items, value, menu, options), value, menu, options);
  }
  function editorSeed(menu = {}) {
    return Object.fromEntries(KEYS.map((key, day) => {
      const entry = entryForDay(menu, day);
      if (isComplete(entry, getSizes(menu))) return [key, { promo: entry.promo, normal: [...entry.normal], promoPrices: [...entry.promoPrices] }];
      const plan = legacyPlan(day, menu), prices = getSizes(menu).map((_, index) => Number.isSafeInteger(plan.prices[index]) ? plan.prices[index] : 0);
      return [key, { promo: plan.promo, normal: [...prices], promoPrices: [...prices] }];
    }));
  }
  function nextMidnight(value = new Date()) { return Date.parse(dateKey(value) + "T00:00:00-05:00") + 86400000; }
  function watchDay(callback) {
    if (!root.document) return () => {};
    let current = dateKey(), timer;
    function check() {
      clearTimeout(timer);
      const next = dateKey();
      if (next !== current) { current = next; callback(next); }
      if (!root.document.hidden) timer = setTimeout(check, Math.max(25, nextMidnight() - Date.now() + 25));
    }
    function visibility() { if (root.document.hidden) clearTimeout(timer); else check(); }
    root.document.addEventListener("visibilitychange", visibility);
    root.addEventListener("pageshow", check);
    check();
    return () => { clearTimeout(timer); root.document.removeEventListener("visibilitychange", visibility); root.removeEventListener("pageshow", check); };
  }
  return Object.freeze({ KEYS, LABELS, DEFAULT_SIZES, dateKey, dayIndex, getSizes, legacyPlan, isComplete, getDayPlan, getDayPromo, getUnitPrice, repriceItems, calcOrderTotal, editorSeed, nextMidnight, watchDay });
});

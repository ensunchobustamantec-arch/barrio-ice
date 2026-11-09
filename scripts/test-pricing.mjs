import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const require = createRequire(import.meta.url);
const daily = require("../shared/daily-pricing.js");
const pricing = require("../pricing.js");
const menu = {
  precios: { semana: [12000, 15000, 18000], jueves: [13000, 16000, 19000], finde: [8000, 12000, 15000] },
  promos: { lunes: true, martes: false, miercoles: true, jueves: false, viernes: false, sabado: true, domingo: false },
};
let checks = 0;
function check(name, run) { run(); checks += 1; console.log("OK " + name); }
const item = (extra = {}) => ({ n: "Granizado", g: true, tipo: "granizado", s: "Pequeño", p: 12000, q: 1, sabores: ["Mango"], ...extra });
const monday = "2026-11-09T17:00:00Z", tuesday = "2026-11-10T17:00:00Z";
const source = JSON.stringify(menu);
const schedule = daily.editorSeed(menu);
check("La precarga no escribe ni altera la configuración", () => {
  assert.equal(JSON.stringify(menu), source);
  for (let day = 0; day < 7; day += 1) {
    const entry = schedule[daily.KEYS[day]], old = pricing.planForDay(day, menu);
    assert.deepEqual(entry.normal, old.prices);
    assert.deepEqual(entry.promoPrices, old.prices);
    assert.equal(entry.promo, old.active ? "2x1" : "ninguna");
  }
});
schedule.lunes = { promo: "2x1", normal: [12000, 15000, 18000], promoPrices: [15000, 18000, 22000] };
schedule.martes = { promo: "ninguna", normal: [12000, 15000, 18000], promoPrices: [16000, 19000, 23000] };
const configured = { ...menu, dailyPricing: schedule };
check("Lunes 2x1: precios por tamaño y dos sabores separados", () => {
  assert.equal(daily.getDayPromo(monday, configured), "2x1");
  [15000, 18000, 22000].forEach((price, i) => assert.equal(daily.getUnitPrice(monday, daily.DEFAULT_SIZES[i], configured), price));
  const single = daily.calcOrderTotal([item({ secondFlavor: "Maracuyá" })], monday, configured);
  const pair = daily.calcOrderTotal([item({ secondFlavor: "Maracuyá" }), item({ sabores: ["Maracuyá"], regalo: true, p: 0 })], monday, configured);
  assert.equal(single.total, 15000);
  assert.equal(pair.total, 15000);
  assert.equal(pair.granizadosRecibidos, 2);
  assert.deepEqual(pair.giftLines[0].sabores, ["Maracuyá"]);
  assert.equal(daily.calcOrderTotal([item({ q: 2 })], monday, configured).total, 30000);
});
check("Martes sin promo: se usa la lista normal", () => {
  assert.equal(daily.getDayPromo(tuesday, configured), "ninguna");
  assert.deepEqual(pricing.planForDay(tuesday, configured).prices, [12000, 15000, 18000]);
  const result = daily.calcOrderTotal([item({ p: 999, s: "Mediano" })], tuesday, configured);
  assert.equal(result.total, 15000); assert.equal(result.granizadosRegalo, 0);
});
check("El interruptor local del Mostrador conserva su efecto", () => {
  assert.equal(daily.calcOrderTotal([item()], monday, configured, { promo: "ninguna" }).total, 12000);
  assert.equal(daily.calcOrderTotal([item()], monday, configured, { promo: "ninguna" }).granizadosRegalo, 0);
});
check("Sin dailyPricing, incompleto o desactivado: mismos precios y totales antiguos", () => {
  for (let day = 0; day < 7; day += 1) {
    const old = pricing.planForDay(day, menu);
    for (const altered of [{ ...menu, dailyPricing: { [daily.KEYS[day]]: { promo: "2x1", normal: [1] } } }, { ...configured, funcionesNuevas: { preciosPorDia: false } }]) {
      assert.deepEqual(pricing.planForDay(day, altered).prices, old.prices);
      assert.equal(daily.getDayPromo(day, altered), old.promo);
      assert.deepEqual(pricing.calculate([item()], day, altered), pricing.calculate([item()], day, menu));
    }
  }
});
check("Los tamaños se leen del catálogo, sin limitarse a tres", () => {
  const four = { ...menu, tamanos: ["Mini", "Pequeño", "Mediano", "Grande"], dailyPricing: { lunes: { promo: "2x1", normal: [1, 2, 3, 4], promoPrices: [5000, 10000, 15000, 20000] } } };
  assert.equal(daily.getUnitPrice(monday, "Grande", four), 20000);
  assert.equal(daily.calcOrderTotal([item({ s: "Mini" })], monday, four).total, 5000);
});
check("23:59 → 00:01 Bogotá aunque el dispositivo esté en Tokio", () => {
  const modulePath = require.resolve("../shared/daily-pricing.js");
  const program = `const assert=require('node:assert/strict');const p=require(${JSON.stringify(modulePath)});const m=${JSON.stringify(configured)};assert.equal(p.dayIndex('2026-11-10T04:59:00Z'),1);assert.equal(p.dayIndex('2026-11-10T05:01:00Z'),2);assert.equal(p.getUnitPrice('2026-11-10T04:59:00Z','Pequeño',m),15000);assert.equal(p.getUnitPrice('2026-11-10T05:01:00Z','Pequeño',m),12000);assert.equal(p.nextMidnight('2026-11-10T04:59:00Z'),Date.parse('2026-11-10T05:00:00Z'));`;
  const result = spawnSync(process.execPath, ["-e", program], { env: { ...process.env, TZ: "Asia/Tokyo" }, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
check("Los pedidos antiguos y sus precios guardados no se modifican", () => {
  const oldOrder = { items: [item({ p: 8000 })], total: 8000 };
  const snapshot = JSON.stringify(oldOrder);
  Object.freeze(oldOrder.items[0]); Object.freeze(oldOrder.items); Object.freeze(oldOrder);
  assert.equal(pricing.calculate(oldOrder.items, monday, configured).total, 8000);
  daily.calcOrderTotal(oldOrder.items, monday, configured);
  assert.equal(JSON.stringify(oldOrder), snapshot);
});
check("Una pestaña abierta se actualiza al volver después de medianoche", () => {
  let instant = Date.parse("2026-11-10T04:59:00Z"), callbackCount = 0, delay = 0;
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [instant])); } static now() { return instant; } }
  const listeners = {}, pageListeners = {};
  const document = { hidden: false, addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener() {} };
  const sandbox = { Date: ClockDate, Intl, document, setTimeout: (_, ms) => { delay = ms; return 1; }, clearTimeout() {}, addEventListener: (name, fn) => { pageListeners[name] = fn; }, removeEventListener() {} };
  vm.runInNewContext(readFileSync(require.resolve("../shared/daily-pricing.js"), "utf8"), sandbox);
  sandbox.BarrioDailyPricing.watchDay(() => { callbackCount += 1; });
  assert.equal(delay, 60025);
  document.hidden = true; listeners.visibilitychange();
  instant = Date.parse("2026-11-10T05:01:00Z");
  document.hidden = false; listeners.visibilitychange();
  assert.equal(callbackCount, 1);
  pageListeners.pageshow();
  assert.equal(callbackCount, 1, "No debe repetir el cambio de día al restaurar la pestaña");
});
console.log(`${checks} comprobaciones aprobadas. 3x2 omitido: ya no existe en la tienda actual.`);

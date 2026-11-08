const assert = require("node:assert/strict");
const stats = require("../admin/stats-core.js");
const result = stats.aggregate([
  { id: "online", fecha: "2026-11-08", total: 12000, descuento: 0, pago: "Efectivo", items: [{ n: "Granizado", sabores: ["Mora"], s: "Pequeño", q: 1, g: true }], entrega: { tipo: "recoger" }, creadoEn: new Date("2026-11-08T12:00:00") },
  { id: "local", canal: "mostrador", fecha: "2026-11-08", total: 15000, descuento: 3000, metodoPago: "Nequi", items: [{ n: "Granizado", sabores: ["Lulo"], s: "Mediano", q: 1, g: true }, { n: "Granizado", sabores: ["Lulo"], s: "Mediano", q: 1, g: true, regalo: true }], creadoEn: new Date("2026-11-08T13:00:00") },
  { id: "void", anulada: true, total: 99000 },
]);
assert.equal(result.total, 27000); assert.equal(result.n, 2); assert.equal(result.channels.online, 12000); assert.equal(result.channels.mostrador, 15000); assert.equal(result.freeGranizados, 1); assert.equal(result.cash, 12000);
console.log("Stats core: 6 casos aprobados.");

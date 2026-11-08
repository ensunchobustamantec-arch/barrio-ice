const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

const pricingPath = path.resolve(__dirname, "..", "pricing.js");
const menu = {
  precios: { semana: [12000, 15000, 18000], jueves: [12000, 15000, 18000], finde: [8000, 12000, 15000] },
  promos: { lunes: true, martes: true, miercoles: true, jueves: false, viernes: false, sabado: false, domingo: false }
};
const granizado = (size, price, flavor = "Mora", q = 1) => ({
  n: "Granizado de " + flavor,
  s: size,
  sabores: [flavor],
  p: price,
  q,
  g: true,
  tipo: "granizado"
});
const drink = (name, price, q = 1) => ({ n: name, s: "", sabores: [], p: price, q, g: false, tipo: "bebida" });

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  try {
    const page = await browser.newPage();
    await page.goto("about:blank");
    await page.addScriptTag({ path: pricingPath });
    const results = await page.evaluate(({ menu, cases }) => {
      const calc = window.BarrioIcePricing.calculate;
      return cases.map(test => {
        const result = calc(test.items, test.day, {
          ...menu,
          promos: { ...menu.promos, ...test.promos },
          domicilio: test.domicilio || 0
        });
        return {
          name: test.name,
          subtotal: result.subtotal,
          discount: result.discount,
          total: result.total,
          gifts: result.granizadosRegalo,
          received: result.granizadosRecibidos,
          nudge: result.nudge,
          deliveryCheck: test.domicilio ? [
            calc(test.items, test.day, { ...menu, promos: { ...menu.promos, ...test.promos }, domicilio: 0 }).total,
            calc(test.items, test.day, { ...menu, promos: { ...menu.promos, ...test.promos }, domicilio: test.domicilio }).total
          ] : null,
          lines: result.lines.map(line => ({ regalo: line.regalo, q: line.q, sabores: line.sabores }))
        };
      });
    }, {
      menu,
      cases: [
        { name: "lunes 1 grande", day: 1, items: [granizado("Grande", 18000)] },
        { name: "lunes grande y mediano", day: 1, items: [granizado("Grande", 18000), granizado("Mediano", 15000, "Limón")] },
        { name: "lunes 2 medianos", day: 1, items: [granizado("Mediano", 15000, "Mora", 2)] },
        { name: "lunes pequeño y gaseosa", day: 1, items: [granizado("Pequeño", 12000), drink("Gaseosa", 3000)] },
        { name: "jueves con 2x1 seleccionado", day: 4, promos: { jueves: true }, items: [granizado("Mediano", 15000, "Mora", 2)] },
        { name: "martes desactivado", day: 2, promos: { martes: false }, items: [granizado("Pequeño", 12000)] },
        { name: "sábado especial 2x1", day: 6, promos: { sabado: true }, items: [granizado("Pequeño", 8000, "Mora", 2)] },
        { name: "domingo especial 2x1", day: 0, promos: { domingo: true }, items: [granizado("Pequeño", 8000)] },
        { name: "viernes sin promo", day: 5, items: [granizado("Grande", 15000)] },
        { name: "domicilio no altera total", day: 1, items: [granizado("Grande", 18000), drink("Gaseosa", 3000)], domicilio: 3000 }
      ]
    });
    const byName = Object.fromEntries(results.map(result => [result.name, result]));

    assert.deepEqual([byName["lunes 1 grande"].received, byName["lunes 1 grande"].total, byName["lunes 1 grande"].discount], [2, 18000, 18000]);
    assert.deepEqual([byName["lunes grande y mediano"].received, byName["lunes grande y mediano"].total], [4, 33000]);
    assert.deepEqual([byName["lunes 2 medianos"].received, byName["lunes 2 medianos"].total], [4, 30000]);
    // La regla comercial de 2x1 sí aplica al granizado aunque el carrito también tenga una bebida.
    assert.deepEqual([byName["lunes pequeño y gaseosa"].received, byName["lunes pequeño y gaseosa"].total], [2, 15000]);
    assert.deepEqual([byName["jueves con 2x1 seleccionado"].gifts, byName["jueves con 2x1 seleccionado"].total], [2, 30000]);
    assert.deepEqual([byName["martes desactivado"].gifts, byName["martes desactivado"].total], [0, 12000]);
    assert.deepEqual([byName["sábado especial 2x1"].received, byName["sábado especial 2x1"].total], [4, 16000]);
    assert.deepEqual([byName["domingo especial 2x1"].received, byName["domingo especial 2x1"].total], [2, 8000]);
    assert.deepEqual([byName["viernes sin promo"].gifts, byName["viernes sin promo"].total], [0, 15000]);
    assert.equal(byName["domicilio no altera total"].total, 21000);
    assert.deepEqual(byName["domicilio no altera total"].deliveryCheck[0], byName["domicilio no altera total"].deliveryCheck[1]);
    console.log("11 pruebas de promos por día en Chromium headless: aprobadas.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});


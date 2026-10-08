const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

const pricingPath = path.resolve(__dirname, "..", "pricing.js");
const menu = {
  precios: { semana: [12000, 15000, 18000], jueves: [12000, 15000, 18000], finde: [8000, 12000, 15000] },
  promos: { lunes: true, martes: true, miércoles: true, jueves: true }
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
        const result = calc(test.items, test.day, { ...menu, domicilio: test.domicilio || 0 });
        return {
          name: test.name,
          subtotal: result.subtotal,
          discount: result.discount,
          total: result.total,
          gifts: result.granizadosRegalo,
          received: result.granizadosRecibidos,
          nudge: result.nudge,
          deliveryCheck: test.domicilio ? [
            calc(test.items, test.day, { ...menu, domicilio: 0 }).total,
            calc(test.items, test.day, { ...menu, domicilio: test.domicilio }).total
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
        { name: "jueves 1 mediano", day: 4, items: [granizado("Mediano", 15000)] },
        { name: "jueves 2 medianos", day: 4, items: [granizado("Mediano", 15000, "Mora", 2)] },
        { name: "jueves 3 medianos", day: 4, items: [granizado("Mediano", 15000, "Mora", 3)] },
        { name: "jueves 4 medianos", day: 4, items: [granizado("Mediano", 15000, "Mora", 4)] },
        { name: "jueves tamaños separados", day: 4, items: [granizado("Grande", 18000), granizado("Mediano", 15000, "Limón")] },
        { name: "sábado 2 pequeños", day: 6, items: [granizado("Pequeño", 8000, "Mora", 2)] },
        { name: "domicilio no altera total", day: 1, items: [granizado("Grande", 18000), drink("Gaseosa", 3000)], domicilio: 3000 }
      ]
    });
    const byName = Object.fromEntries(results.map(result => [result.name, result]));

    assert.deepEqual([byName["lunes 1 grande"].received, byName["lunes 1 grande"].total, byName["lunes 1 grande"].discount], [2, 18000, 18000]);
    assert.deepEqual([byName["lunes grande y mediano"].received, byName["lunes grande y mediano"].total], [4, 33000]);
    assert.deepEqual([byName["lunes 2 medianos"].received, byName["lunes 2 medianos"].total], [4, 30000]);
    // La regla comercial de 2x1 sí aplica al granizado aunque el carrito también tenga una bebida.
    assert.deepEqual([byName["lunes pequeño y gaseosa"].received, byName["lunes pequeño y gaseosa"].total], [2, 15000]);
    assert.deepEqual([byName["jueves 1 mediano"].gifts, byName["jueves 1 mediano"].total], [0, 15000]);
    assert.match(byName["jueves 1 mediano"].nudge, /Agrega 1 más del mismo tamaño/);
    assert.deepEqual([byName["jueves 2 medianos"].received, byName["jueves 2 medianos"].total], [3, 30000]);
    assert.deepEqual([byName["jueves 3 medianos"].received, byName["jueves 3 medianos"].total], [4, 45000]);
    assert.deepEqual([byName["jueves 4 medianos"].received, byName["jueves 4 medianos"].total], [6, 60000]);
    assert.deepEqual([byName["jueves tamaños separados"].gifts, byName["jueves tamaños separados"].total], [0, 33000]);
    assert.deepEqual([byName["sábado 2 pequeños"].gifts, byName["sábado 2 pequeños"].total], [0, 16000]);
    assert.equal(byName["domicilio no altera total"].total, 21000);
    assert.deepEqual(byName["domicilio no altera total"].deliveryCheck[0], byName["domicilio no altera total"].deliveryCheck[1]);
    console.log("11 pruebas promocionales en Chromium headless: aprobadas.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});


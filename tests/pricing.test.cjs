const test = require("node:test");
const assert = require("node:assert/strict");
const { calculate, planForDay } = require("../pricing.js");

const granizado = (s = "Pequeño", p = 12000, q = 1, extra = {}) => ({
  n: "Granizado",
  s,
  p,
  q,
  g: true,
  tipo: "granizado",
  regalo: false,
  sabores: ["Mora"],
  ...extra,
});

function verify(name, items, day, expected, menu = {}) {
  test(name, () => {
    const result = calculate(items, day, menu);
    assert.deepEqual(
      {
        total: result.total,
        discount: result.discount,
        gifts: result.granizadosRegalo,
      },
      expected,
    );
  });
}

verify("Lunes 2x1 activo", [granizado()], 1, {
  total: 12000,
  discount: 12000,
  gifts: 1,
}, { promos: { lunes: true } });
verify("Lunes festivo sin 2x1", [granizado()], 1, {
  total: 12000,
  discount: 0,
  gifts: 0,
}, { promos: { lunes: false } });
verify("Sábado especial con 2x1", [granizado("Pequeño", 8000)], 6, {
  total: 8000,
  discount: 8000,
  gifts: 1,
}, { promos: { sabado: true } });
verify("Domingo especial con 2x1", [granizado("Pequeño", 8000)], 0, {
  total: 8000,
  discount: 8000,
  gifts: 1,
}, { promos: { domingo: true } });
verify("Jueves aplica 2x1 cuando está seleccionado", [granizado()], 4, {
  total: 12000,
  discount: 12000,
  gifts: 1,
}, { promos: { jueves: true } });
verify("Cantidad negativa se normaliza a cero", [granizado("Pequeño", 12000, -2)], 1, {
  total: 0,
  discount: 0,
  gifts: 0,
});
verify("Ítem con regalo inyectado no se cobra ni acumula", [granizado("Pequeño", 12000, 1, { regalo: true })], 1, {
  total: 0,
  discount: 0,
  gifts: 0,
});

test("los días seleccionados ofrecen solo 2x1", () => {
  assert.equal(planForDay(6, { promos: { sabado: true } }).title, "2x1");
  assert.equal(planForDay(4, { promos: { jueves: true } }).title, "2x1");
});

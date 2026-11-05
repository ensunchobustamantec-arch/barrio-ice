const test = require("node:test");
const assert = require("node:assert/strict");
const { calculate } = require("../pricing.js");

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

verify("Lunes 2x1 con un granizado", [granizado()], 1, {
  total: 12000,
  discount: 12000,
  gifts: 1,
});
verify(
  "Lunes 2x1 apagado no regala unidades",
  [granizado()],
  1,
  { total: 12000, discount: 0, gifts: 0 },
  { promos: { lunes: false } },
);
verify("Jueves 3x2 con tres iguales", [granizado("Pequeño", 12000, 3)], 4, {
  total: 36000,
  discount: 12000,
  gifts: 1,
});
verify("Jueves 3x2 con dos iguales", [granizado("Pequeño", 12000, 2)], 4, {
  total: 24000,
  discount: 12000,
  gifts: 1,
});
verify(
  "Jueves 3x2 agrupa por tamaño y precio",
  [granizado("Mediano", 12000, 2), granizado("Grande", 15000)],
  4,
  { total: 39000, discount: 12000, gifts: 1 },
);
verify(
  "Viernes no aplica promociones de granizados",
  [granizado("Pequeño", 12000, 3)],
  5,
  { total: 36000, discount: 0, gifts: 0 },
);
verify(
  "Domingo usa precio normal sin regalos",
  [granizado("Pequeño", 8000, 2)],
  0,
  { total: 16000, discount: 0, gifts: 0 },
);
verify("Cantidad negativa se normaliza a cero", [granizado("Pequeño", 12000, -2)], 1, {
  total: 0,
  discount: 0,
  gifts: 0,
});
verify(
  "Ítem con regalo inyectado no se cobra ni acumula",
  [granizado("Pequeño", 12000, 1, { regalo: true })],
  1,
  { total: 0, discount: 0, gifts: 0 },
);

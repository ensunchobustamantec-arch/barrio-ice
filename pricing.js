(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BarrioIcePricing = api;
})(typeof globalThis === "undefined" ? this : globalThis, function () {
  const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  function planForDay(day, menu = {}) {
    const weekdayPrices = menu.precios?.semana || [12000, 15000, 18000];
    const thursdayPrices = menu.precios?.jueves || weekdayPrices;
    const weekendPrices = menu.precios?.finde || [8000, 12000, 15000];
    const name = DAY_NAMES[day] || "domingo";
    const promoKey = name === "miércoles" ? "miercoles" : name;
    const active = menu.promos?.[promoKey] !== false;

    if (day >= 1 && day <= 3) {
      return { title: "2x1", name: "Promo 2x1", buy: 1, receive: 2, prices: weekdayPrices, active };
    }
    if (day === 4) {
      return { title: "3x2", name: "Promo 3x2", buy: 2, receive: 3, prices: thursdayPrices, active };
    }
    return { title: "Precios normales", name: "Precios normales", buy: 0, receive: 0, prices: weekendPrices, active: false };
  }

  function flavorNames(item) {
    if (Array.isArray(item.sabores) && item.sabores.length) return item.sabores.map(String);
    if (item.sabor) return [String(item.sabor)];
    const name = String(item.n || "").replace(/^Granizado de\s*/i, "").trim();
    return name ? [name] : [];
  }

  function calculate(items = [], day = new Date().getDay(), menu = {}) {
    const plan = planForDay(day, menu);
    const paidLines = [];
    const groups = new Map();
    let subtotal = 0;
    let granizadosPagados = 0;
    const safeItems = Array.isArray(items) ? items : [];

    for (const source of safeItems) {
      if (!source || source.regalo === true) continue;
      const quantity = Math.max(0, Math.floor(Number(source.q) || 0));
      const unitPrice = Math.max(0, Math.round(Number(source.p) || 0));
      if (!quantity) continue;
      const item = { ...source, q: quantity, p: unitPrice, regalo: false };
      paidLines.push(item);
      subtotal += unitPrice * quantity;

      if (source.g === true || source.tipo === "granizado") {
        granizadosPagados += quantity;
        const size = String(source.s || "");
        const key = JSON.stringify([size, unitPrice]);
        const group = groups.get(key) || { size, unitPrice, units: [] };
        for (let i = 0; i < quantity; i += 1) group.units.push(source);
        groups.set(key, group);
      }
    }

    const giftLines = [];
    let granizadosRegalo = 0;
    let discount = 0;
    if (plan.active) {
      for (const group of groups.values()) {
        for (let start = 0; start + plan.buy <= group.units.length; start += plan.buy) {
          const awarded = plan.receive - plan.buy;
          if (!awarded) continue;
          const trigger = group.units[start + plan.buy - 1];
          const originalFlavors = flavorNames(trigger);
          const giftFlavor = String(trigger.giftFlavor || originalFlavors[0] || "Sorpresa");
          const sameGift = giftLines.find(line => line.s === group.size && line.promo === plan.name &&
            line.sabores[0] === giftFlavor && !!line.adulto === !!trigger.adulto);
          if (sameGift) sameGift.q += awarded;
          else giftLines.push({
            n: "Granizado",
            s: group.size,
            sabores: [giftFlavor],
            p: 0,
            q: awarded,
            g: true,
            tipo: "granizado",
            regalo: true,
            promo: plan.name,
            ahorroUnitario: group.unitPrice,
            adulto: !!trigger.adulto
          });
          granizadosRegalo += awarded;
          discount += group.unitPrice * awarded;
        }
      }
    }

    // El subtotal refleja el valor de todo lo recibido; los regalos se compensan
    // con el descuento y el total coincide con el valor pagado por las líneas base.
    const total = subtotal;
    subtotal += discount;
    const nextGift = [];
    if (plan.active) {
      for (const group of groups.values()) {
        const missing = group.units.length % plan.buy === 0 ? 0 : plan.buy - (group.units.length % plan.buy);
        if (missing) nextGift.push({ size: group.size, missing });
      }
    }
    const nudge = nextGift.length && plan.buy === 2
      ? "Agrega 1 más del mismo tamaño y te regalamos el tercero."
      : nextGift.length && plan.buy === 1
        ? "Agrega otro granizado del mismo tamaño y te regalamos uno más."
        : "";

    return {
      plan,
      paidLines,
      giftLines,
      lines: paidLines.concat(giftLines),
      subtotal,
      discount,
      delivery: 0,
      total,
      granizadosPagados,
      granizadosRegalo,
      granizadosRecibidos: granizadosPagados + granizadosRegalo,
      nextGift,
      nudge
    };
  }

  return Object.freeze({ planForDay, calculate, flavorNames });
});


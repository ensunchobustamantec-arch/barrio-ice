(function (root, factory) {
  const daily = typeof module === "object" && module.exports ? require("./shared/daily-pricing.js") : root.BarrioDailyPricing;
  const api = factory(daily);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BarrioIcePricing = api;
})(typeof globalThis === "undefined" ? this : globalThis, function (daily) {
  function planForDay(value, menu = {}, options) { return daily.getDayPlan(value, menu, options); }

  function flavorNames(item) {
    if (Array.isArray(item.sabores) && item.sabores.length) return item.sabores.map(String);
    if (item.sabor) return [String(item.sabor)];
    const name = String(item.n || "").replace(/^Granizado de\s*/i, "").trim();
    return name ? [name] : [];
  }

  function calculate(items = [], day, menu = {}, options) {
    const plan = planForDay(day, menu, options);
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
          const giftFlavor = String(trigger.secondFlavor || trigger.giftFlavor || originalFlavors[0] || "Sorpresa");
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


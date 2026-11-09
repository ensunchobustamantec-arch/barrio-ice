(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BarrioStats = api;
})(typeof globalThis === "undefined" ? this : globalThis, function () {
  function dateOf(value, fallback) { return String(value?.fecha || fallback || "").slice(0, 10); }
  function created(value) {
    const raw = value?.creadoEn;
    return raw?.toDate ? raw.toDate() : raw instanceof Date ? raw : new Date(raw || value?.fecha + "T12:00:00");
  }
  function flavorNames(item) {
    if (Array.isArray(item?.sabores) && item.sabores.length) return item.sabores.map(String);
    return item?.sabor ? [String(item.sabor)] : String(item?.n || "").replace(/^Granizado de\s*/i, "").trim() ? [String(item.n).replace(/^Granizado de\s*/i, "").trim()] : [];
  }
  function normalize(value, fallbackDate) {
    if (!value || value.estado === "Cancelado" || value.anulada) return null;
    return {
      id: value.id || "", canal: value.canal || "online", total: Number(value.total) || 0,
      descuento: Number(value.descuento) || 0, pago: value.metodoPago || value.pago || "Sin método",
      fecha: dateOf(value, fallbackDate), items: Array.isArray(value.items) ? value.items : [],
      entrega: value.entrega || {}, creadoEn: created(value),
    };
  }
  function missingGifts(items) {
    const lines = Array.isArray(items) ? items : [], available = new Map(), missing = new Map();
    const key = (size, name) => JSON.stringify([size || "", name]);
    lines.forEach((item) => {
      if (!item || !item.regalo) return;
      const names = flavorNames(item), quantity = Math.max(0, Number(item.q) || 0);
      names.forEach((name) => {
        const id = key(item.s, name);
        available.set(id, (available.get(id) || 0) + quantity / names.length);
      });
    });
    lines.forEach((item, index) => {
      if (!item || item.regalo || !item.secondFlavor) return;
      const id = key(item.s, item.secondFlavor), quantity = Math.max(0, Number(item.q) || 0);
      const covered = Math.min(quantity, available.get(id) || 0);
      available.set(id, (available.get(id) || 0) - covered);
      if (quantity > covered) missing.set(index, quantity - covered);
    });
    return missing;
  }
  function aggregate(values, options) {
    const list = (values || []).map((value) => normalize(value, options?.dateKey)).filter(Boolean);
    const summary = { total: 0, discount: 0, n: list.length, dom: 0, pickup: 0, cash: 0, flavors: {}, gifts: {}, sizes: {}, pay: {}, weekdays: {}, hours: {}, paidGranizados: 0, freeGranizados: 0, channels: {} };
    list.forEach((sale) => {
      summary.total += sale.total; summary.discount += sale.descuento;
      summary.channels[sale.canal] = (summary.channels[sale.canal] || 0) + sale.total;
      if (sale.entrega.tipo === "domicilio") summary.dom += 1; else summary.pickup += 1;
      summary.pay[sale.pago] = (summary.pay[sale.pago] || 0) + sale.total;
      if (sale.pago === "Efectivo") summary.cash += sale.total;
      const date = new Date(sale.fecha + "T12:00:00");
      const weekday = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][date.getDay()];
      summary.weekdays[weekday] = (summary.weekdays[weekday] || 0) + sale.total;
      const hour = Number.isNaN(sale.creadoEn.getTime()) ? 0 : sale.creadoEn.getHours();
      summary.hours[hour + ":00"] = (summary.hours[hour + ":00"] || 0) + 1;
      const missing = missingGifts(sale.items);
      sale.items.forEach((item, index) => {
        if (!(item.g === true || item.tipo === "granizado" || /granizado/i.test(item.n || ""))) return;
        const q = Number(item.q) || 0, names = flavorNames(item);
        if (item.regalo) summary.freeGranizados += q; else summary.paidGranizados += q;
        names.forEach((name) => { const target = item.regalo ? summary.gifts : summary.flavors; target[name] = (target[name] || 0) + q / Math.max(1, names.length); });
        if (item.s) summary.sizes[item.s] = (summary.sizes[item.s] || 0) + q;
        const extra = missing.get(index) || 0;
        if (extra) {
          summary.gifts[item.secondFlavor] = (summary.gifts[item.secondFlavor] || 0) + extra;
          summary.freeGranizados += extra;
          if (item.s) summary.sizes[item.s] = (summary.sizes[item.s] || 0) + extra;
        }
      });
    });
    summary.avg = summary.n ? summary.total / summary.n : 0;
    return summary;
  }
  return Object.freeze({ normalize, aggregate, missingGifts });
});

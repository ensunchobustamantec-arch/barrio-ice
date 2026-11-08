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
      sale.items.forEach((item) => {
        if (!(item.g === true || item.tipo === "granizado" || /granizado/i.test(item.n || ""))) return;
        const q = Number(item.q) || 0, names = flavorNames(item);
        if (item.regalo) summary.freeGranizados += q; else summary.paidGranizados += q;
        names.forEach((name) => { const target = item.regalo ? summary.gifts : summary.flavors; target[name] = (target[name] || 0) + q / Math.max(1, names.length); });
        if (item.s) summary.sizes[item.s] = (summary.sizes[item.s] || 0) + q;
      });
    });
    summary.avg = summary.n ? summary.total / summary.n : 0;
    return summary;
  }
  return Object.freeze({ normalize, aggregate });
});

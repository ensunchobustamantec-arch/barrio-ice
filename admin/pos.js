/* Barrio Ice · venta presencial. Mantiene la UI aislada de admin.js. */
(function (root) {
  "use strict";

  const state = {
    cart: [], selected: "", promo: true, payment: "Efectivo", adjustment: 0,
    adjustmentReason: "", sales: [], unsubscribe: null, saving: false,
    notice: "", lastSale: null,
  };
  const money = (value, helpers) => helpers.fmt(Math.max(0, Number(value) || 0));
  const saleDate = (value) => value?.toDate ? value.toDate() : new Date(value || 0);
  const saleSort = (left, right) => saleDate(right.creadoEn) - saleDate(left.creadoEn);
  const id = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random())
    .replace(/-/g, "");

  function activeMenu(menu, day, promo) {
    const copy = Object.assign({}, menu, { promos: Object.assign({}, menu.promos) });
    const key = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"][day];
    copy.promos[key] = promo;
    return copy;
  }
  function todayFlavors(menu, day) {
    const sold = new Set(menu.agotados?.[day] || []);
    return (menu.dias?.[day] || []).map((name) => menu.cat.find((flavor) => flavor.n === name))
      .filter((flavor) => flavor && flavor.active !== false)
      .map((flavor) => Object.assign({}, flavor, { sold: sold.has(flavor.n) }));
  }
  function displayName(item) {
    const flavors = Array.isArray(item.sabores) ? item.sabores : [];
    return flavors.length ? "Granizado de " + flavors.join(" / ") : item.n;
  }
  function removeOne(index) {
    const item = state.cart[index];
    if (!item) return;
    if (item.q > 1) item.q -= 1;
    else state.cart.splice(index, 1);
  }
  function addItem(item) {
    const same = state.cart.find((line) => line.n === item.n && line.s === item.s &&
      JSON.stringify(line.sabores || []) === JSON.stringify(item.sabores || []));
    if (same) same.q += 1;
    else state.cart.push(item);
  }
  function current(ctx) {
    const day = ctx.now().getDay();
    const usedMenu = activeMenu(ctx.menu, day, state.promo);
    return ctx.pricing.calculate(state.cart, day, usedMenu);
  }
  function render(ctx) {
    const target = document.getElementById("adminView");
    if (!target || !ctx.menu || !ctx.user) return;
    const day = ctx.now().getDay();
    const plan = ctx.pricing.planForDay(day, ctx.menu);
    if (!state.cart.length) state.promo = plan.active;
    const result = current(ctx);
    const flavors = todayFlavors(ctx.menu, day);
    const selected = flavors.find((flavor) => flavor.n === state.selected);
    const halfOptions = flavors.filter((flavor) => !flavor.sold && flavor.n !== state.selected);
    const hasAlcohol = result.lines.some((item) => item.adulto === true);
    const validSales = state.sales.filter((sale) => !sale.anulada && sale.fecha === ctx.dateKey());
    const cashExpected = validSales.filter((sale) => sale.metodoPago === "Efectivo")
      .reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const paymentRows = ["Efectivo", "Nequi", "Llaves Bre-B", "Bancolombia", "Otro"]
      .map((method) => {
        const total = validSales.filter((sale) => sale.metodoPago === method)
          .reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
        return total ? `<span>${ctx.esc(method)} <b>${money(total, ctx)}</b></span>` : "";
      }).join("");

    target.innerHTML = `
      <section class="pos-shell" aria-label="Mostrador">
        <header class="pos-heading"><div><p class="eyebrow">Venta presencial</p><h2>Mostrador</h2></div>
          <span class="pos-sync ${state.sales.some((sale) => sale.pending) ? "pending" : ""}">
            ${state.sales.filter((sale) => sale.pending).length ? "Sincronizando ventas…" : "Al día"}</span></header>
        ${state.notice ? `<p class="notice ${state.notice.startsWith("✓") ? "success" : "error"}" role="status">${ctx.esc(state.notice)}</p>` : ""}
        <div class="pos-layout">
          <div class="pos-products">
            <section class="card"><div class="section-head"><h3>Sabores de hoy</h3><small>${plan.active ? "2x1 disponible" : "Precio normal"}</small></div>
              <div class="pos-flavors">${flavors.map((flavor) => `<button class="pos-flavor ${state.selected === flavor.n ? "selected" : ""}" data-pos-flavor="${ctx.esc(flavor.n)}" ${flavor.sold ? "disabled" : ""} style="--flavor:${ctx.esc(/^#[0-9a-f]{6}$/i.test(flavor.c || "") ? flavor.c : "#5bc0eb")}">
                <span class="pos-swatch" aria-hidden="true"></span><span>${ctx.esc(flavor.n)}</span>${flavor.adulto || flavor.l ? "<em>+18</em>" : ""}${flavor.sold ? "<small>Agotado</small>" : ""}</button>`).join("") || "<p class=\"muted\">No hay sabores disponibles hoy.</p>"}</div>
              ${selected ? `<div class="pos-picker"><strong>${ctx.esc(selected.n)}</strong><div class="pos-size-row">${["Pequeño", "Mediano", "Grande"].map((size, index) => `<button data-pos-size="${size}" type="button">${size}<small>${money(plan.prices[index], ctx)}</small></button>`).join("")}</div>
                ${ctx.menu.mitadMitad !== false && halfOptions.length ? `<label class="pos-half">Mitad y mitad <select id="posHalf"><option value="">Elige el segundo sabor</option>${halfOptions.map((flavor) => `<option value="${ctx.esc(flavor.n)}">${ctx.esc(flavor.n)}</option>`).join("")}</select></label>` : ""}</div>` : ""}
            </section>
            <section class="card pos-secondary"><h3>Bebidas y combos</h3><div class="pos-secondary-grid">${(ctx.menu.bebidas || []).filter((item) => item.active !== false).map((item) => `<button data-pos-drink="${ctx.esc(item.n)}" type="button">${ctx.esc(item.n)} <b>${money(item.p, ctx)}</b>${item.adulto ? " <em>+18</em>" : ""}</button>`).join("")}${(ctx.menu.combos || []).filter((item) => item.active !== false).map((item) => `<button data-pos-combo="${ctx.esc(item.n)}" type="button">${ctx.esc(item.n)} <b>${money(item.p, ctx)}</b></button>`).join("")}</div></section>
          </div>
          <aside class="card pos-cart"><div class="section-head"><h3>Venta actual</h3>${state.cart.length ? "<button class=\"text-button\" data-pos-clear type=\"button\">Vaciar</button>" : ""}</div>
            <div class="pos-lines">${result.lines.map((item, index) => item.regalo ? `<p class="pos-gift">Regalo: ${ctx.esc(displayName(item))} · ${item.s}</p>` : `<div class="pos-line"><span>${ctx.esc(displayName(item))}<small>${ctx.esc(item.s || "")}</small></span><div><button data-pos-minus="${index}" aria-label="Quitar uno">−</button><b>${item.q}</b><button data-pos-plus="${index}" aria-label="Agregar uno">+</button></div><strong>${money((item.p || 0) * item.q, ctx)}</strong></div>`).join("") || "<p class=\"muted\">Toca un sabor para empezar la venta.</p>"}</div>
            <label class="check pos-promo"><input id="posPromo" type="checkbox" ${state.promo ? "checked" : ""} ${plan.active ? "" : "disabled"}> Aplicar promo del día ${plan.active ? "" : "(no disponible hoy)"}</label>
            <details class="pos-adjust"><summary>Descuento manual</summary><label>Monto <input id="posAdjustment" type="number" min="0" step="1000" value="${state.adjustment || ""}" inputmode="numeric"></label><label>Motivo <input id="posAdjustmentReason" maxlength="160" value="${ctx.esc(state.adjustmentReason)}"></label></details>
            <div class="pos-totals"><span>Subtotal <b>${money(result.subtotal, ctx)}</b></span>${result.discount ? `<span>Ahorro promo <b>−${money(result.discount, ctx)}</b></span>` : ""}${state.adjustment ? `<span>Ajuste <b>−${money(state.adjustment, ctx)}</b></span>` : ""}<strong>Total <b>${money(Math.max(0, result.total - state.adjustment), ctx)}</b></strong></div>
          </aside>
        </div>
        <section class="card pos-history"><div class="section-head"><div><h3>Mis ventas de hoy</h3><small>${validSales.length} ventas · ${money(validSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0), ctx)}</small></div>${state.lastSale ? "<button data-pos-undo type=\"button\">Deshacer última</button>" : ""}</div><div class="pos-payments">${paymentRows || "<span class=\"muted\">Todavía no hay ventas registradas.</span>"}</div>${validSales.slice(0, 8).map((sale) => `<div class="pos-sale"><span>${saleDate(sale.creadoEn).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })} · ${ctx.esc(sale.metodoPago)}</span><b>${money(sale.total, ctx)}</b>${ctx.role === "owner" && !sale.anulada ? `<button data-pos-void="${sale.id}" type="button">Anular</button>` : ""}</div>`).join("")}</section>
        <section class="card pos-closing"><h3>Cierre de caja</h3><p>Efectivo esperado de tus ventas: <b>${money(cashExpected, ctx)}</b></p><div class="pos-closing-fields"><label>Efectivo contado <input id="posCounted" type="number" min="0" inputmode="numeric"></label><label>Notas <input id="posClosingNotes" maxlength="300"></label><button data-pos-close type="button">Guardar cierre</button></div></section>
        ${ctx.role === "owner" ? `<section class="card pos-staff"><h3>Equipo de mostrador</h3><p class="muted">La cuenta se crea primero en Firebase Authentication.</p><div class="pos-staff-fields"><label>UID <input id="staffUid" maxlength="128"></label><label>Nombre <input id="staffName" maxlength="60"></label><label class="check"><input id="staffActive" type="checkbox" checked> Activo</label><button data-pos-staff type="button">Guardar empleado</button></div></section>` : ""}
        <footer class="pos-checkout"><label>Método de pago <select id="posPayment">${["Efectivo", "Nequi", "Llaves Bre-B", "Bancolombia", "Otro"].map((method) => `<option ${state.payment === method ? "selected" : ""}>${ctx.esc(method)}</option>`).join("")}</select></label><button class="primary" data-pos-save type="button" ${!state.cart.length || state.saving ? "disabled" : ""}>${state.saving ? "Registrando…" : "Registrar venta · " + money(Math.max(0, result.total - state.adjustment), ctx)}</button></footer>
      </section>`;
    bind(ctx);
  }
  function bind(ctx) {
    const view = document.getElementById("adminView");
    view.onclick = async (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.posFlavor !== undefined) { state.selected = button.dataset.posFlavor; return render(ctx); }
      if (button.dataset.posSize) {
        const flavor = todayFlavors(ctx.menu, ctx.now().getDay()).find((item) => item.n === state.selected);
        const index = ["Pequeño", "Mediano", "Grande"].indexOf(button.dataset.posSize);
        const other = document.getElementById("posHalf")?.value;
        const second = other && todayFlavors(ctx.menu, ctx.now().getDay()).find((item) => item.n === other);
        if (!flavor) return;
        addItem({ n: "Granizado", s: button.dataset.posSize, sabores: second ? [flavor.n, second.n] : [flavor.n], p: current(ctx).plan.prices[index], q: 1, g: true, tipo: "granizado", adulto: !!(flavor.adulto || flavor.l || second?.adulto || second?.l) });
        state.selected = ""; return render(ctx);
      }
      if (button.dataset.posDrink) { const item = (ctx.menu.bebidas || []).find((line) => line.n === button.dataset.posDrink); if (item) addItem({ n: item.n, p: Number(item.p) || 0, q: 1, adulto: !!item.adulto }); return render(ctx); }
      if (button.dataset.posCombo) { const item = (ctx.menu.combos || []).find((line) => line.n === button.dataset.posCombo); if (item) addItem({ n: item.n, p: Number(item.p) || 0, q: 1, adulto: !!item.adulto }); return render(ctx); }
      if (button.dataset.posMinus !== undefined) { removeOne(+button.dataset.posMinus); return render(ctx); }
      if (button.dataset.posPlus !== undefined) { const item = state.cart[+button.dataset.posPlus]; if (item) item.q += 1; return render(ctx); }
      if (button.hasAttribute("data-pos-clear")) { state.cart = []; state.adjustment = 0; state.adjustmentReason = ""; return render(ctx); }
      if (button.hasAttribute("data-pos-save")) return save(ctx);
      if (button.hasAttribute("data-pos-undo")) return undo(ctx);
      if (button.dataset.posVoid) return voidSale(ctx, button.dataset.posVoid);
      if (button.hasAttribute("data-pos-close")) return closeCash(ctx);
      if (button.hasAttribute("data-pos-staff")) return saveStaff(ctx);
    };
    view.onchange = () => {
      state.promo = !!document.getElementById("posPromo")?.checked;
      state.payment = document.getElementById("posPayment")?.value || state.payment;
      state.adjustment = Math.max(0, Math.round(Number(document.getElementById("posAdjustment")?.value) || 0));
      state.adjustmentReason = document.getElementById("posAdjustmentReason")?.value || "";
      render(ctx);
    };
  }
  async function save(ctx) {
    const result = current(ctx), adjustment = Math.max(0, Math.round(state.adjustment || 0));
    if (adjustment * 2 > result.subtotal || (adjustment && state.adjustmentReason.trim().length < 5)) { state.notice = "El descuento requiere motivo y no puede superar el 50%."; return render(ctx); }
    const alcohol = result.lines.some((item) => item.adulto === true);
    if (alcohol && !window.confirm("¿El cliente es mayor de 18 años?")) { state.notice = "Confirma la mayoría de edad para registrar bebidas con licor."; return render(ctx); }
    state.saving = true; render(ctx);
    const saleId = id();
    try {
      await ctx.store.createLocalSale(saleId, {
        items: result.lines, subtotal: Math.round(result.subtotal), descuento: Math.round(result.discount), ajuste: adjustment,
        total: Math.round(result.total - adjustment), promo: result.plan.name, metodoPago: state.payment,
        mayor18: alcohol, tieneLicor: alcohol, fecha: ctx.dateKey(), creadoEn: ctx.store.time(),
        empleadoUid: ctx.user.uid, empleadoNombre: ctx.staff?.nombre || ctx.user.email || "Empleado",
        canal: "mostrador", anulada: false, anuladaMotivo: "", anuladaPor: "", anuladaEn: null,
        ajusteMotivo: adjustment ? ctx.clean(state.adjustmentReason, 160) : "",
      });
      state.lastSale = saleId; state.cart = []; state.adjustment = 0; state.adjustmentReason = "";
      state.notice = "✓ Venta registrada."; navigator.vibrate?.(30);
      window.setTimeout(() => { if (state.lastSale === saleId) { state.lastSale = null; render(ctx); } }, 120000);
    } catch (error) { state.notice = "No fue posible registrar la venta. Revisa la conexión y permisos."; console.error(error); }
    state.saving = false; render(ctx);
  }
  async function undo(ctx) { const reason = "Anulación inmediata"; try { await ctx.store.voidLocalSale(state.lastSale, reason, ctx.user.uid); state.notice = "Venta anulada."; state.lastSale = null; } catch { state.notice = "No fue posible anular esta venta."; } render(ctx); }
  async function voidSale(ctx, saleId) { const reason = window.prompt("Motivo de anulación (mínimo 5 caracteres):", ""); if (!reason || reason.trim().length < 5) return; try { await ctx.store.voidLocalSale(saleId, ctx.clean(reason, 160), ctx.user.uid); state.notice = "Venta anulada."; } catch { state.notice = "No fue posible anular la venta."; } render(ctx); }
  async function closeCash(ctx) { const counted = Math.max(0, Math.round(Number(document.getElementById("posCounted")?.value) || 0)); const notes = ctx.clean(document.getElementById("posClosingNotes")?.value, 300); const expected = state.sales.filter((sale) => !sale.anulada && sale.fecha === ctx.dateKey() && sale.empleadoUid === ctx.user.uid && sale.metodoPago === "Efectivo").reduce((sum, sale) => sum + (Number(sale.total) || 0), 0); try { await ctx.store.createClosing(id(), { fecha: ctx.dateKey(), creadoEn: ctx.store.time(), empleadoUid: ctx.user.uid, empleadoNombre: ctx.staff?.nombre || ctx.user.email || "Empleado", efectivoEsperado: expected, efectivoContado: counted, diferencia: counted - expected, notas }); state.notice = "✓ Cierre guardado."; } catch { state.notice = "No fue posible guardar el cierre."; } render(ctx); }
  async function saveStaff(ctx) { const uid = document.getElementById("staffUid")?.value.trim(); const nombre = ctx.clean(document.getElementById("staffName")?.value, 60); if (!uid || !nombre) { state.notice = "Ingresa el UID y nombre del empleado."; return render(ctx); } try { await ctx.store.saveStaff(uid, { rol: "empleado", activo: !!document.getElementById("staffActive")?.checked, nombre }); state.notice = "✓ Empleado guardado."; } catch { state.notice = "No fue posible guardar el empleado."; } render(ctx); }
  root.BarrioPos = {
    render(ctx) {
      if (state.unsubscribe) state.unsubscribe();
      state.unsubscribe = ctx.store.watchLocalSales({ uid: ctx.user.uid, all: ctx.role === "owner" }, (sales) => { state.sales = (sales || []).sort(saleSort); render(ctx); }, () => { state.notice = "No se pudieron cargar las ventas de mostrador."; render(ctx); });
      render(ctx);
    },
    stop() {
      state.unsubscribe?.();
      state.unsubscribe = null;
    },
  };
})(window);

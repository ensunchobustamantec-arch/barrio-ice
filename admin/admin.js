const BarrioShared = window.BarrioShared;
const {
  FIREBASE_CONFIG,
  ADMIN_UID,
  APP_CHECK_SITE_KEY,
  DEFAULTS,
  now,
  dateKey,
  esc,
  clean,
  fmt,
} = BarrioShared;
const $ = (id) => document.getElementById(id);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const dayNames = days;
const weekdayKeys = days;
const orderStates = ["Nuevo", "Preparando", "Listo", "En camino", "Entregado", "Cancelado"];
const sizes = ["Pequeño", "Mediano", "Grande"];
const adminState = {
  tab: location.hash === "#orders" ? "orders" : "today",
  from: dateKey(),
  to: dateKey(),
  status: "",
  search: "",
  period: "today",
  statsPeriod: "today",
};
let menu = BarrioShared.mergeMenu();
let orders = [];
let seen = new Set();
let admin = false;
let selectedDay = now().getDay();
let store = null;
let menuDocumentExists = false;
let audio = null;
let unsubscribeOrders = null;
let unsubscribeMenu = null;
let ordersLoaded = false;
let deferredInstall = null;

function flavor(name) {
  return menu.cat.find((item) => item.n === name);
}
function flavorText(item, includeProduct = true) {
  const names = BarrioIcePricing.flavorNames(item);
  if (names.length > 1) return names.join(" / ") + " (mitad y mitad)";
  if (names.length === 1)
    return (includeProduct ? "Granizado de " : "") + names[0];
  return item.n || "Producto";
}
function safeColor(color) {
  return /^#[0-9a-f]{6}$/i.test(String(color || "")) ? color : "#5bc0eb";
}
function dayPlan(day = now().getDay()) {
  const result = BarrioIcePricing.planForDay(day, menu);
  return Object.assign({}, result, {
    g: result.active ? result.receive : 0,
    p: result.prices,
  });
}
function manualStoreState() {
  if (menu.aperturaManual === "abierta" || menu.aperturaManual === "cerrada")
    return menu.aperturaManual;
  return menu.cerradaManual ? "cerrada" : "horario";
}
function openNow() {
  const manualState = manualStoreState();
  if (manualState === "abierta") return true;
  if (manualState === "cerrada") return false;
  const date = now();
  const hours =
    menu.horario?.[date.getDay()] ||
    menu.horario?.[dayNames[date.getDay()]] ||
    menu.horario ||
    {};
  if (hours.abierto === false || hours.cerrado === true) return false;
  const current = date.getHours() * 60 + date.getMinutes();
  const toMinutes = (value) => {
    const [hour, minute] = String(value || "11:00").split(":").map(Number);
    return (hour || 0) * 60 + (minute || 0);
  };
  return (
    current >= toMinutes(hours.abre || hours.open) &&
    current < toMinutes(hours.cierra || hours.close || "22:00")
  );
}
function sold(name) {
  return (menu.agotados?.[now().getDay()] || []).includes(name);
}
function allTodayFlavors() {
  return (menu.dias?.[now().getDay()] || [])
    .map(flavor)
    .filter((item) => item && item.active !== false && !sold(item.n));
}
function render() {}
function orderLineText(item) {
  return (
    (item.regalo
      ? "REGALO " + String(item.promo || "").replace(/^Promo\s+/i, "") + ": "
      : "") +
    (+item.q || 0) +
    " x " +
    flavorText(item) +
    (item.s ? " " + item.s : "") +
    " = " +
    fmt(item.p || 0)
  );
}
function orderTime(dateValue) {
  const date = dateValue?.toDate
    ? dateValue.toDate()
    : dateValue
      ? new Date(dateValue)
      : new Date();
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
function trackUrl(id) {
  return BarrioShared.SITE_URL + "/?pedido=" + encodeURIComponent(id);
}
function activateSound() {
  try {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    localStorage.setItem("barrio-ice-admin-sound", "true");
    $("soundToggle").setAttribute("aria-pressed", "true");
    beep();
  } catch {
    alert("El navegador no permitió activar el sonido.");
  }
}
function beep() {
  if (!audio) return;
  try {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.28);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.3);
  } catch {}
}
  function eligibleOrders(list) {
    const seenIds = new Set();
    return list.filter((order) => {
      if (!order || !order.id || seenIds.has(order.id)) return false;
      seenIds.add(order.id);
      return order.estado !== "Cancelado";
    });
  }
  function orderDate(order) {
    return String(order.fecha || "").slice(0, 10);
  }
  function orderCreatedAt(order) {
    const value = order.creadoEn;
    const date =
      typeof value?.toDate === "function"
        ? value.toDate()
        : value instanceof Date
          ? value
          : new Date(order.fecha || "");
    return date.getTime();
  }
  function publicTracking(order, estado = order.estado || "Nuevo") {
    return {
      estado,
      tipo: order.entrega?.tipo === "domicilio" ? "domicilio" : "recoger",
      fecha: order.fecha || "",
      creadoEn: order.creadoEn || store.time(),
      nombreCorto:
        (order.cliente?.nombre || "").trim().split(/\s+/)[0].slice(0, 20) ||
        "Cliente",
    };
  }
  function linesText(order) {
    return (order.items || []).map(orderLineText).join(" · ");
  }
  function orderWhatsapp(order, status) {
    const first = order.cliente?.nombre?.split(/\s+/)[0] || "";
    const messages = {
      Preparando: "Ya estamos preparando tu pedido",
      Listo: "Tu pedido ya está listo para recoger",
      "En camino": "Tu pedido va en camino",
      Entregado: "Tu pedido fue entregado. Gracias por comprar en Barrio Ice",
      Cancelado: "Necesitamos hablar contigo sobre la cancelación de tu pedido",
    };
    return (
      "Hola " +
      first +
      ". " +
      (messages[status] || "Tenemos una actualización de tu pedido") +
      " #" +
      String(order.id).slice(-6).toUpperCase() +
      ". Total: " +
      fmt(order.total) +
      (order.entrega?.tipo === "domicilio"
        ? ". El domicilio se paga aparte."
        : ".") +
      " Gracias por elegir Barrio Ice."
    );
  }
  function orderContactLink(order, status = order.estado) {
    const phone = String(order.cliente?.celular || "").replace(/\D/g, "");
    return (
      "https://wa.me/" +
      phone +
      "?text=" +
      encodeURIComponent(orderWhatsapp(order, status))
    );
  }
  function setOrderStatus(id, status) {
    if (store?.ready) {
      const order = orders.find((item) => item.id === id);
      return store.update(
        id,
        { estado: status, actualizadoEn: store.time() },
        order,
      );
    }
  }
  function orderAudit(order) {
    const warnings = [];
    const paidLines = (order.items || []).filter((item) => item.regalo !== true);
    const date = new Date((order.fecha || dateKey()) + "T12:00:00");
    const totals = BarrioIcePricing.calculate(
      paidLines,
      Number.isNaN(date.getTime()) ? now().getDay() : date.getDay(),
      menu,
    );
    if (
      totals.total !== Number(order.total || 0) ||
      totals.subtotal !== Number(order.subtotal || 0) ||
      totals.discount !== Number(order.descuento || 0)
    )
      warnings.push("Total no cuadra con los productos y la promo");

    const priceArrays = [
      menu.precios?.semana,
      menu.precios?.jueves,
      menu.precios?.finde,
    ].filter(Array.isArray);
    for (const item of paidLines) {
      const price = Number(item.p);
      const isGranizado = item.g === true || item.tipo === "granizado";
      let valid = false;
      if (isGranizado) {
        const size = ["Pequeño", "Mediano", "Grande"].indexOf(item.s);
        valid =
          size >= 0 &&
          priceArrays.some((prices) => Number(prices[size]) === price);
      } else {
        const catalog = [...(menu.bebidas || []), ...(menu.combos || [])];
        valid = catalog.some(
          (product) => product.n === item.n && Number(product.p) === price,
        );
      }
      if (!valid) {
        warnings.push("Precio fuera del menú: " + (item.n || "producto"));
        break;
      }
    }

    const phone = String(order.cliente?.celular || "").replace(/\D/g, "");
    const created = orderCreatedAt(order);
    if (
      phone &&
      orders.some((other) => {
        if (other.id === order.id) return false;
        const otherPhone = String(other.cliente?.celular || "").replace(/\D/g, "");
        const otherCreated = orderCreatedAt(other);
        return (
          phone === otherPhone &&
          otherPhone &&
          Number.isFinite(created) &&
          Number.isFinite(otherCreated) &&
          Math.abs(created - otherCreated) < 3 * 60 * 1000
        );
      })
    )
      warnings.push("Posible duplicado: mismo celular en menos de 3 minutos");

    if (
      /(?:https?:\/\/|www\.)/i.test(
        [order.cliente?.nombre, order.entrega?.direccion].join(" "),
      ) ||
      String(order.notas || "").length > 250
    )
      warnings.push("Texto sospechoso en nombre, dirección o notas");
    return warnings;
  }
  async function deleteOrders(ids) {
    if (!ids.length) return;
    const message =
      ids.length === 1
        ? "¿Eliminar este pedido y su seguimiento?"
        : "¿Eliminar " + ids.length + " pedidos seleccionados y sus seguimientos?";
    if (!window.confirm(message)) return;
    try {
      await Promise.all(ids.map((id) => store.deleteOrder(id)));
      orders = orders.filter((order) => !ids.includes(order.id));
      ordersView();
    } catch (error) {
      console.error(error);
      window.alert("No se pudieron eliminar los pedidos seleccionados.");
    }
  }
  function printOrder(id) {
    const order = orders.find((item) => item.id === id);
    if (!order) return;
    const popup = window.open("", "_blank", "width=760,height=900");
    if (!popup) return;
    const rows = (order.items || []).map((item) => {
      const details = [item.s, ...(Array.isArray(item.sabores) ? item.sabores : [])]
        .filter(Boolean)
        .map(esc)
        .join(" · ");
      const amount = item.regalo
        ? "CORTESÍA"
        : esc(fmt((+item.p || 0) * (+item.q || 0)));
      return `<div class="item"><div><strong>${+item.q || 1} × ${esc(orderLineText(item))}</strong><small>${details}${item.adulto ? " · +18" : ""}${item.regalo ? " · REGALO" : ""}</small></div><b>${amount}</b></div>`;
    }).join("");
    const address = order.entrega?.tipo === "domicilio"
      ? `<div class="detail"><span>Dirección</span><b>${esc(order.entrega?.direccion || "")}${order.entrega?.referencia ? " · " + esc(order.entrega.referencia) : ""}</b></div>`
      : "";
    const payment = [order.pago, order.conCuanto ? "Paga con " + fmt(order.conCuanto) : ""]
      .filter(Boolean).map(esc).join(" · ");
    const markup = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comanda ${esc(id)}</title><style>
      :root{color-scheme:light;--ink:#07131d;--ice:#087eae;--mist:#eaf7fc;--line:#d6e7ed;--muted:#56717d}
      *{box-sizing:border-box}body{margin:0;padding:28px;background:#edf4f7;color:var(--ink);font:15px/1.45 Inter,Arial,sans-serif}
      .ticket{width:min(100%,680px);margin:0 auto;overflow:hidden;border:1px solid var(--line);border-radius:24px;background:#fff;box-shadow:0 18px 55px #07131d22}
      .brand{display:flex;align-items:center;gap:16px;padding:24px 28px;background:var(--ink);color:#fff}.brand img{width:64px;height:64px;object-fit:contain}.brand strong{display:block;font-size:21px;letter-spacing:.12em}.brand small{color:#9bcde0;letter-spacing:.16em}
      .content{padding:26px 30px}.eyebrow{color:var(--ice);font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin:5px 0 20px}.heading h1{margin:0;font-size:clamp(26px,6vw,38px);line-height:1}.number{border-radius:999px;padding:8px 12px;background:var(--mist);font-weight:800;white-space:nowrap}
      .details{display:grid;grid-template-columns:1fr 1fr;gap:0 20px;margin:0 0 20px}.detail{display:grid;gap:3px;border-top:1px solid var(--line);padding:10px 0;min-width:0}.detail span{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em}.detail b{overflow-wrap:anywhere}
      .items{border-top:2px solid var(--ink)}.item{display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid var(--line);padding:14px 0}.item strong{display:block}.item small{display:block;margin-top:4px;color:var(--muted)}.item>b{text-align:right;white-space:nowrap}
      .totals{width:min(100%,320px);margin:18px 0 0 auto}.total-row{display:flex;justify-content:space-between;gap:16px;padding:5px 0}.grand{margin-top:7px;border-top:2px solid var(--ink);padding-top:12px;font-size:21px;font-weight:900}.notice{margin-top:18px;border-radius:14px;padding:12px 15px;background:var(--mist);color:#194456}.notes{margin-top:18px;border-left:4px solid var(--ice);padding:10px 14px;background:#f6fbfd}.footer{margin-top:22px;color:var(--muted);font-size:12px;text-align:center}.actions{display:flex;justify-content:center;gap:10px;margin:20px auto 0}.actions button{min-height:46px;border:0;border-radius:12px;padding:0 20px;background:var(--ice);color:white;font:inherit;font-weight:800;cursor:pointer}.actions .close{background:#e5eef2;color:var(--ink)}
      @media(max-width:520px){body{padding:10px}.ticket{border-radius:18px}.brand{padding:18px}.content{padding:22px 18px}.details{grid-template-columns:1fr}.actions{position:sticky;bottom:8px}.actions button{flex:1}}
      @media print{@page{size:auto;margin:12mm}body{padding:0;background:#fff}.ticket{width:100%;border:1px solid var(--line);border-radius:0;box-shadow:none}.brand{-webkit-print-color-adjust:exact;print-color-adjust:exact}.actions{display:none}.content{padding:18px 22px}.item{break-inside:avoid}}
      </style></head><body><article class="ticket"><header class="brand"><img src="/assets/brand/logo-mark-light.webp" alt=""><div><strong>BARRIO ICE</strong><small>COLD FLOW · MONTERÍA</small></div></header><main class="content"><div class="eyebrow">Comanda de preparación</div><div class="heading"><h1>Pedido recibido</h1><span class="number">#${esc(String(id).slice(-6).toUpperCase())}</span></div><section class="details"><div class="detail"><span>Cliente</span><b>${esc(order.cliente?.nombre || "")}</b></div><div class="detail"><span>Fecha</span><b>${esc(orderDate(order))}</b></div><div class="detail"><span>Celular</span><b>${esc(order.cliente?.celular || "")}</b></div><div class="detail"><span>Entrega</span><b>${order.entrega?.tipo === "domicilio" ? "Domicilio" : "Recoger en el local"}</b></div>${address}<div class="detail"><span>Pago</span><b>${payment}</b></div></section><section class="items">${rows || "<p>Sin productos</p>"}</section><section class="totals"><div class="total-row"><span>Subtotal</span><b>${esc(fmt(order.subtotal ?? order.total))}</b></div>${order.descuento ? `<div class="total-row"><span>Descuento${order.promo ? " · " + esc(order.promo) : ""}</span><b>−${esc(fmt(order.descuento))}</b></div>` : ""}<div class="total-row grand"><span>Total</span><b>${esc(fmt(order.total))}</b></div></section>${order.entrega?.tipo === "domicilio" ? '<div class="notice">El domicilio se cobra aparte.</div>' : ""}${order.notas ? `<div class="notes"><b>Nota del cliente</b><br>${esc(order.notas)}</div>` : ""}<p class="footer">Seguimiento: ${esc(trackUrl(id))}<br>BARRIO ICE · COLD FLOW · MONTERÍA</p><div class="actions"><button onclick="window.print()">Imprimir comanda</button><button class="close" onclick="window.close()">Cerrar</button></div></main></article></body></html>`;
    popup.document.open();
    popup.document.write(markup);
    popup.document.close();
  }
  const yesterday = () => {
    const date = now();
    date.setDate(date.getDate() - 1);
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  };
  function setOrdersPeriod(period) {
    adminState.period = period;
    if (period === "today") adminState.from = adminState.to = dateKey();
    if (period === "yesterday") adminState.from = adminState.to = yesterday();
    if (period === "week") {
      const start = now();
      start.setDate(start.getDate() - 6);
      adminState.from =
        start.getFullYear() +
        "-" +
        String(start.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(start.getDate()).padStart(2, "0");
      adminState.to = dateKey();
    }
    if (period === "all") adminState.from = adminState.to = "";
    ordersView();
  }
  function orderMatches(order) {
    const date = orderDate(order);
    if (adminState.from && date < adminState.from) return false;
    if (adminState.to && date > adminState.to) return false;
    if (adminState.status && order.estado !== adminState.status) return false;
    if (adminState.search) {
      const value = adminState.search.toLowerCase();
      const haystack = [order.cliente?.nombre, order.cliente?.celular, order.id]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(value)) return false;
    }
    return true;
  }
  function ordersView() {
    const list = [...orders]
      .filter(orderMatches)
      .sort((a, b) =>
        String(b.creadoEn || "").localeCompare(String(a.creadoEn || "")),
      );
    const filterValue = (value) => esc(value || "");
    $("adminView").innerHTML =
      '<article class="card"><h2>Pedidos</h2><p>Busca, filtra por periodo y actualiza el estado.</p><div class="quick-periods">' +
      [
        ["today", "Hoy"],
        ["yesterday", "Ayer"],
        ["week", "Últimos 7 días"],
        ["all", "Todos"],
      ]
        .map(
          ([period, label]) =>
            '<button class="' +
            (adminState.period === period ? "active" : "") +
            '" data-order-period="' +
            period +
            '">' +
            label +
            "</button>",
        )
        .join("") +
      '</div><div class="filter-grid"><input id="orderFrom" type="date" aria-label="Desde" value="' +
      filterValue(adminState.from) +
      '"><input id="orderTo" type="date" aria-label="Hasta" value="' +
      filterValue(adminState.to) +
      '"><select id="orderState"><option value="">Todos los estados</option>' +
      orderStates
        .map(
          (state) =>
            "<option " +
            (adminState.status === state ? "selected" : "") +
            ">" +
            esc(state) +
            "</option>",
        )
        .join("") +
      '</select><input id="orderSearch" type="search" placeholder="Nombre o celular" value="' +
      filterValue(adminState.search) +
      '"></div><div class="toolbar"><strong>' +
      list.length +
      " pedido" +
      (list.length === 1 ? "" : "s") +
      '</strong><button class="secondary" id="deleteSelected" disabled>Eliminar seleccionados</button><button class="secondary" id="sound">Activar sonido</button><button class="primary" id="xlsx">Exportar Excel (.xlsx)</button></div><div class="orders">' +
      (list.length
        ? list
            .map((order) => {
              const warnings = orderAudit(order);
              const options = orderStates
                .map(
                  (state) =>
                    "<option " +
                    (order.estado === state ? "selected" : "") +
                    ">" +
                    esc(state) +
                    "</option>",
                )
                .join("");
              return (
                '<article class="order" data-order-id="' +
                esc(order.id) +
                '"><div class="order-top"><div><label class="order-select"><input type="checkbox" aria-label="Seleccionar pedido" data-order-select="' +
                esc(order.id) +
                '"></label><h3>' +
                esc(order.cliente?.nombre || "Cliente") +
                (order.estado === "Nuevo"
                  ? ' <span class="new">NUEVO</span>'
                  : "") +
                "</h3><p>" +
                esc(orderTime(order.creadoEn)) +
                " · " +
                esc(order.entrega?.tipo || "recoger") +
                " · " +
                esc(order.pago || "") +
                '</p><p class="order-line">' +
                esc(linesText(order)) +
                "</p><p>Domicilio: se paga aparte.</p><b>" +
                fmt(order.total) +
                '</b>' +
                (warnings.length
                  ? '<p class="audit-warning" data-audit-warning><b>⚠ Revisar</b><br>' +
                    warnings.map(esc).join("<br>") +
                    "</p>"
                  : "") +
                '</div><select data-status="' +
                esc(order.id) +
                '" aria-label="Cambiar estado">' +
                options +
                '</select></div><div class="admin-actions"><a class="secondary" href="' +
                esc(orderContactLink(order)) +
                '" target="_blank" rel="noopener">Responder por WhatsApp</a><button class="secondary" data-print="' +
                esc(order.id) +
                '">Imprimir comanda</button><button class="secondary danger-action" data-delete-order="' +
                esc(order.id) +
                '">Eliminar</button></div></article>'
              );
            })
            .join("")
        : '<p class="notice">No hay pedidos con estos filtros.</p>') +
      "</div></article>";
    $("orderFrom").onchange = (event) => {
      adminState.from = event.target.value;
      adminState.period = "custom";
      ordersView();
    };
    $("orderTo").onchange = (event) => {
      adminState.to = event.target.value;
      adminState.period = "custom";
      ordersView();
    };
    $("orderState").onchange = (event) => {
      adminState.status = event.target.value;
      ordersView();
    };
    $("orderSearch").oninput = (event) => {
      adminState.search = clean(event.target.value, 80);
      const start = event.target.selectionStart;
      ordersView();
      const next = $("orderSearch");
      next.focus();
      next.setSelectionRange(start, start);
    };
    $("sound").onclick = activateSound;
    $("xlsx").onclick = exportExcel;
    const deleteSelected = $("deleteSelected");
    const selectedOrders = () => $$('[data-order-select]:checked');
    const syncDeleteButton = () => {
      deleteSelected.disabled = selectedOrders().length === 0;
    };
    $$('[data-order-select]').forEach((input) =>
      input.addEventListener("change", syncDeleteButton),
    );
    deleteSelected.onclick = () =>
      deleteOrders(selectedOrders().map((input) => input.dataset.orderSelect));
    $$('[data-delete-order]').forEach((button) => {
      button.onclick = () => deleteOrders([button.dataset.deleteOrder]);
    });
  }

  function hourOf(order) {
    const value = order.creadoEn?.toDate
      ? order.creadoEn.toDate()
      : new Date(order.creadoEn || order.fecha + "T12:00:00");
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return 0;
    return Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Bogota",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(value),
    );
  }
  function aggregate(list) {
    const valid = eligibleOrders(list),
      summary = {
        total: valid.reduce((sum, order) => sum + (+order.total || 0), 0),
        discount: valid.reduce(
          (sum, order) => sum + (+order.descuento || 0),
          0,
        ),
        n: valid.length,
        dom: 0,
        pickup: 0,
        cash: 0,
        flavors: {},
        gifts: {},
        sizes: {},
        pay: {},
        weekdays: {},
        hours: {},
        paidGranizados: 0,
        freeGranizados: 0,
      };
    summary.avg = summary.n ? summary.total / summary.n : 0;
    valid.forEach((order) => {
      if (order.entrega?.tipo === "domicilio") summary.dom += 1;
      else summary.pickup += 1;
      summary.pay[order.pago || "Sin método"] =
        (summary.pay[order.pago || "Sin método"] || 0) + (+order.total || 0);
      if (order.pago === "Efectivo") summary.cash += +order.total || 0;
      const weekday =
        dayNames[new Date((order.fecha || dateKey()) + "T12:00:00").getDay()];
      summary.weekdays[weekday] =
        (summary.weekdays[weekday] || 0) + (+order.total || 0);
      const hour = hourOf(order);
      summary.hours[hour + ":00"] = (summary.hours[hour + ":00"] || 0) + 1;
      (order.items || []).forEach((item) => {
        const isGranizado =
          item.g === true ||
          item.tipo === "granizado" ||
          /granizado/i.test(item.n || "");
        if (!isGranizado) return;
        const names = BarrioIcePricing.flavorNames(item);
        if (item.regalo) summary.freeGranizados += +item.q || 0;
        else summary.paidGranizados += +item.q || 0;
        names.forEach((name) => {
          const bucket = item.regalo ? summary.gifts : summary.flavors;
          bucket[name] =
            (bucket[name] || 0) + (+item.q || 0) / Math.max(1, names.length);
        });
        if (item.s)
          summary.sizes[item.s] = (summary.sizes[item.s] || 0) + (+item.q || 0);
      });
    });
    return summary;
  }
  function barRows(data, money = false) {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    if (!entries.length)
      return '<p class="notice">Todavía no hay datos para mostrar.</p>';
    const max = Math.max(1, ...entries.map(([, value]) => value));
    return (
      "<div>" +
      entries
        .map(
          ([name, value]) =>
            '<div class="bar-row"><span class="bar-label">' +
            esc(name) +
            '</span><div class="bar-track"><i style="width:' +
            Math.max(3, (value / max) * 100) +
            '%"></i></div><b class="bar-value">' +
            (money ? fmt(value) : value) +
            "</b></div>",
        )
        .join("") +
      "</div>"
    );
  }
  function periodDates(period) {
    const end = now(),
      start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    if (period === "yesterday") {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (period === "week") start.setDate(start.getDate() - 6);
    else if (period === "month") start.setDate(1);
    else if (period === "custom") {
      const from = adminState.from || dateKey(),
        to = adminState.to || dateKey();
      const length = Math.max(
        1,
        Math.round(
          (new Date(to + "T12:00:00") - new Date(from + "T12:00:00")) /
            86400000,
        ) + 1,
      );
      const previousEnd = new Date(from + "T12:00:00");
      previousEnd.setDate(previousEnd.getDate() - 1);
      const previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - length + 1);
      const key = (date) =>
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(date.getDate()).padStart(2, "0");
      return {
        from,
        to,
        previousFrom: key(previousStart),
        previousTo: key(previousEnd),
      };
    }
    const from =
      start.getFullYear() +
      "-" +
      String(start.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(start.getDate()).padStart(2, "0");
    const to =
      end.getFullYear() +
      "-" +
      String(end.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(end.getDate()).padStart(2, "0");
    const length = Math.max(
      1,
      Math.round(
        (new Date(to + "T12:00:00") - new Date(from + "T12:00:00")) / 86400000,
      ) + 1,
    );
    const previousEnd = new Date(start);
    previousEnd.setDate(previousEnd.getDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - length + 1);
    const key = (date) =>
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0");
    return {
      from,
      to,
      previousFrom: key(previousStart),
      previousTo: key(previousEnd),
    };
  }
  function between(order, from, to) {
    const value = orderDate(order);
    return (!from || value >= from) && (!to || value <= to);
  }
  function statsView() {
    const dates = periodDates(adminState.statsPeriod);
    const current = aggregate(
      orders.filter((order) => between(order, dates.from, dates.to)),
    );
    const previous = aggregate(
      orders.filter(
        (order) =>
          dates.previousFrom &&
          between(order, dates.previousFrom, dates.previousTo),
      ),
    );
    const periodButtons = [
      ["today", "Hoy"],
      ["week", "Últimos 7 días"],
      ["month", "Mes"],
      ["custom", "Rango"],
    ];
    const comparison = current.total - previous.total;
    $("adminView").innerHTML =
      '<article class="card"><h2>Ventas y cierre</h2><div class="quick-periods">' +
      periodButtons
        .map(
          ([key, label]) =>
            '<button class="' +
            (adminState.statsPeriod === key ? "active" : "") +
            '" data-stats-period="' +
            key +
            '">' +
            label +
            "</button>",
        )
        .join("") +
      '</div><div class="filter-grid"><input id="statsFrom" type="date" value="' +
      esc(dates.from) +
      '"><input id="statsTo" type="date" value="' +
      esc(dates.to) +
      '"></div><div class="metrics"><div class="metric"><b>' +
      fmt(current.total) +
      "</b><span>VENTAS · " +
      current.n +
      ' PEDIDOS</span></div><div class="metric"><b>' +
      fmt(current.avg) +
      '</b><span>TICKET PROMEDIO</span></div><div class="metric"><b>' +
      fmt(current.discount) +
      '</b><span>AHORRO POR PROMOS</span></div><div class="metric"><b>' +
      fmt(current.cash) +
      '</b><span>EFECTIVO ESPERADO EN CAJA</span></div><div class="metric"><b>' +
      current.paidGranizados +
      '</b><span>GRANIZADOS PAGADOS</span></div><div class="metric"><b>' +
      current.freeGranizados +
      '</b><span>GRANIZADOS DE REGALO</span></div><div class="metric"><b>' +
      current.dom +
      '</b><span>PEDIDOS A DOMICILIO</span></div><div class="metric"><b>' +
      current.pickup +
      '</b><span>PEDIDOS PARA RECOGER</span></div></div><p class="notice">Comparado con el periodo anterior: ' +
      (comparison >= 0 ? "+" : "−") +
      fmt(Math.abs(comparison)) +
      ' en ventas. El cálculo usa pedidos únicos, excluye cancelados y toma las fechas de Colombia.</p></article><div class="chart-grid"><article class="card"><h3>Granizados pagados por sabor</h3>' +
      barRows(current.flavors) +
      '<h3 style="margin-top:16px">Granizados de regalo por sabor</h3>' +
      barRows(current.gifts) +
      '</article><article class="card"><h3>Granizados por tamaño</h3>' +
      barRows(current.sizes) +
      '<h3 style="margin-top:16px">Ventas por método de pago</h3>' +
      barRows(current.pay, true) +
      '</article><article class="card"><h3>Ventas por día de semana</h3>' +
      barRows(current.weekdays, true) +
      '</article><article class="card"><h3>Pedidos por hora</h3>' +
      barRows(current.hours) +
      "</article></div>";
    $("statsFrom").onchange = (event) => {
      adminState.from = event.target.value;
      adminState.statsPeriod = "custom";
      statsView();
    };
    $("statsTo").onchange = (event) => {
      adminState.to = event.target.value;
      adminState.statsPeriod = "custom";
      statsView();
    };
  }

  function saveNotice(node, text, ok) {
    if (!node) return;
    node.textContent = text;
    node.className = ok ? "saved" : "error";
  }
  function syncCatalogFromControls() {
    document.querySelectorAll("[data-cat-name]").forEach((input) => {
      const index = +input.dataset.catName,
        item = menu.cat[index],
        old = item?.n,
        name = clean(input.value, 30);
      if (!item) return;
      if (old && name && old !== name)
        Object.keys(menu.dias || {}).forEach((day) => {
          menu.dias[day] = (menu.dias[day] || []).map((value) =>
            value === old ? name : value,
          );
        });
      item.n = name || old;
    });
    document.querySelectorAll("[data-cat-color]").forEach((input) => {
      const item = menu.cat[+input.dataset.catColor];
      if (item) item.c = safeColor(input.value);
    });
    document.querySelectorAll("[data-cat-adult]").forEach((input) => {
      const item = menu.cat[+input.dataset.catAdult];
      if (item) item.l = item.adulto = input.checked;
    });
    document.querySelectorAll("[data-cat-active]").forEach((input) => {
      const item = menu.cat[+input.dataset.catActive];
      if (item) item.active = input.checked;
    });
  }
  async function saveMenu(noteId) {
    syncCatalogFromControls();
    try {
      await store.save(menu);
      if ($("welcome")) {
        $("welcome").textContent = "Cambios guardados correctamente.";
        $("welcome").className = "notice";
      }
      render();
      adminRender();
      saveNotice($(noteId), "Guardado correctamente.", true);
    } catch (error) {
      console.error(error);
      if ($("welcome")) {
        $("welcome").textContent =
          "No se pudo guardar. Revisa la conexión e inténtalo de nuevo.";
        $("welcome").className = "notice error";
      }
      saveNotice(
        $(noteId),
        "No se pudo guardar. Revisa la conexión e inténtalo de nuevo.",
        false,
      );
    }
  }
  function menuView() {
    const flavors = menu.cat || [],
      chosen = menu.dias?.[selectedDay] || [];
    const catalog = flavors
      .map(
        (item, index) =>
          '<div class="editable-row" data-flavor-row="' +
          index +
          '"><div class="field"><label>Nombre</label><input data-cat-name="' +
          index +
          '" maxlength="30" value="' +
          esc(item.n) +
          '"></div><div class="field"><label>Color</label><input data-cat-color="' +
          index +
          '" type="color" value="' +
          esc(safeColor(item.c)) +
          '"></div><label class="check"><input data-cat-adult="' +
          index +
          '" type="checkbox" ' +
          (item.l || item.adulto ? "checked" : "") +
          '> +18</label><label class="check"><input data-cat-active="' +
          index +
          '" type="checkbox" ' +
          (item.active !== false ? "checked" : "") +
          '> Activo</label><button class="secondary" data-delete-flavor="' +
          index +
          '">Eliminar</button></div>',
      )
      .join("");
    const selectedHours = [1, 2, 3, 4, 5, 6, 0]
      .map((day) => {
        const hours =
          menu.horario?.[day] ||
          menu.horario?.[dayNames[day]] ||
          menu.horario ||
          {};
        return (
          '<div class="editable-row"><strong>' +
          days[day] +
          '</strong><div class="field"><label>Abre</label><input type="time" data-hours-open="' +
          day +
          '" value="' +
          esc(hours.abre || hours.open || "11:00") +
          '"></div><div class="field"><label>Cierra</label><input type="time" data-hours-close="' +
          day +
          '" value="' +
          esc(hours.cierra || hours.close || "22:00") +
          '"></div></div>'
        );
      })
      .join("");
    const prices = ["semana", "jueves", "finde"]
      .map(
        (key, section) =>
          "<div><h3>" +
          ["Lunes a miércoles", "Jueves", "Viernes a domingo"][section] +
          '</h3><div class="row">' +
          sizes
            .map(
              (size, index) =>
                '<div class="field"><label>' +
                size +
                '</label><input type="number" min="0" step="500" data-price-group="' +
                key +
                '" data-price-index="' +
                index +
                '" value="' +
                (+menu.precios[key][index] || 0) +
                '"></div>',
            )
            .join("") +
          "</div></div>",
      )
      .join("");
    const drinks = (menu.bebidas || [])
      .map(
        (item, index) =>
          '<div class="editable-row"><div class="field"><label>Bebida</label><input data-drink-name="' +
          index +
          '" value="' +
          esc(item.n) +
          '"></div><div class="field"><label>Precio</label><input type="number" min="0" data-drink-price="' +
          index +
          '" value="' +
          (+item.p || 0) +
          '"></div><label class="check"><input type="checkbox" data-drink-active="' +
          index +
          '" ' +
          (item.active !== false ? "checked" : "") +
          '> Activa</label><button class="secondary" data-delete-drink="' +
          index +
          '">Eliminar</button></div>',
      )
      .join("");
    const combos = (menu.combos || [])
      .map(
        (item, index) =>
          '<div class="editable-row"><div class="field"><label>Combo</label><input data-combo-name="' +
          index +
          '" value="' +
          esc(item.n) +
          '"></div><div class="field"><label>Descripción</label><input data-combo-description="' +
          index +
          '" value="' +
          esc(item.d || "") +
          '"></div><div class="field"><label>Precio</label><input type="number" min="0" data-combo-price="' +
          index +
          '" value="' +
          (+item.p || 0) +
          '"></div><label class="check"><input type="checkbox" data-combo-active="' +
          index +
          '" ' +
          (item.active !== false ? "checked" : "") +
          '> Activo</label><button class="secondary" data-delete-combo="' +
          index +
          '">Eliminar</button></div>',
      )
      .join("");
    $("adminView").innerHTML =
      '<div class="admin-grid"><article class="card"><h2>Catálogo de sabores</h2><p>Edita nombre, color, edad mínima y disponibilidad.</p><div class="table-like">' +
      catalog +
      '</div><div class="row"><div class="field"><label for="newFlavorName">Nuevo sabor</label><input id="newFlavorName" maxlength="30"></div><div class="field"><label for="newFlavorColor">Color</label><input id="newFlavorColor" type="color" value="#5bc0eb"></div><label class="check"><input id="newFlavorAdult" type="checkbox"> +18</label><button class="secondary" id="addFlavorV4">Agregar</button></div></article><article class="card"><h2>Sabores por día</h2><div class="daypick">' +
      [1, 2, 3, 4, 5, 6, 0]
        .map(
          (day) =>
            '<button type="button" data-v4-day="' +
            day +
            '" class="' +
            (day === selectedDay ? "active" : "") +
            '">' +
            days[day].slice(0, 3) +
            "</button>",
        )
        .join("") +
      '</div><div class="chips">' +
      flavors
        .filter((item) => item.active !== false)
        .map(
          (item) =>
            '<button class="choice ' +
            (chosen.includes(item.n) ? "active" : "") +
            '" data-v4-flavor="' +
            esc(item.n) +
            '">' +
            esc(item.n) +
            "</button>",
        )
        .join("") +
      '</div><div class="row"><div class="field"><label for="copyFromDay">Copiar desde otro día</label><select id="copyFromDay">' +
      [1, 2, 3, 4, 5, 6, 0]
        .filter((day) => day !== selectedDay)
        .map((day) => '<option value="' + day + '">' + days[day] + "</option>")
        .join("") +
      '</select></div><button class="secondary" id="copyDay">Copiar</button><button class="secondary" id="repeatYesterday">Repetir ayer</button></div><div class="save"><button class="primary" id="saveDayMenu">Guardar sabores</button><span class="saved" id="menuSaved"></span></div></article><article class="card"><h2>Precios</h2>' +
      prices +
      '<h2 style="margin-top:15px">Promociones</h2>' +
      ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
        .map(
          (day) =>
            '<label class="switch"><span>' +
            days[(["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"].indexOf(day) + 1) % 7] +
            " 2x1" +
            '</span><input type="checkbox" data-promo-day="' +
            day +
            '" ' +
            (menu.promos[day] !== false ? "checked" : "") +
            "></label>",
        )
        .join("") +
      '<label class="switch"><span>Permitir mitad y mitad</span><input id="halfEnabled" type="checkbox" ' +
      (menu.mitadMitad ? "checked" : "") +
      '></label><div class="save"><button class="primary" id="savePrices">Guardar precios y promos</button><span id="priceSaved" class="saved"></span></div></article><article class="card"><h2>Bebidas</h2><div class="table-like">' +
      drinks +
      '</div><div class="row"><div class="field"><label for="newDrinkName">Nueva bebida</label><input id="newDrinkName"></div><div class="field"><label for="newDrinkPrice">Precio</label><input id="newDrinkPrice" type="number" min="0"></div><button class="secondary" id="addDrinkV4">Agregar bebida</button></div><h2 style="margin-top:22px">Combos</h2><div class="table-like">' +
      combos +
      '</div><div class="form-grid"><div class="field"><label for="newComboName">Nombre del combo</label><input id="newComboName"></div><div class="field"><label for="newComboDescription">Descripción</label><input id="newComboDescription"></div><div class="field"><label for="newComboPrice">Precio</label><input id="newComboPrice" type="number" min="0"></div></div><button class="secondary" id="addComboV4">Agregar combo</button></article></div>';
    const catalogCard = [...document.querySelectorAll("#adminView .card")].find(
      (card) => card.querySelector("#newFlavorName"),
    );
    if (catalogCard && !catalogCard.querySelector("#saveCatalogV4"))
      catalogCard.insertAdjacentHTML(
        "beforeend",
        '<div class="save"><button class="primary" id="saveCatalogV4">Guardar catálogo</button><span id="catalogSaved" class="saved"></span></div>',
      );
    $("saveCatalogV4").onclick = () => saveMenu("catalogSaved");
    $("saveDayMenu").onclick = () => saveMenu("menuSaved");
    $("savePrices").onclick = () => {
      document.querySelectorAll("[data-cat-name]").forEach((input) => {
        const index = +input.dataset.catName;
        const old = menu.cat[index]?.n;
        const name = clean(input.value, 30);
        if (old && name && old !== name) {
          Object.keys(menu.dias).forEach((day) => {
            menu.dias[day] = (menu.dias[day] || []).map((value) =>
              value === old ? name : value,
            );
          });
        }
        if (menu.cat[index]) menu.cat[index].n = name || old;
      });
      document.querySelectorAll("[data-cat-color]").forEach((input) => {
        if (menu.cat[+input.dataset.catColor])
          menu.cat[+input.dataset.catColor].c = safeColor(input.value);
      });
      document.querySelectorAll("[data-cat-adult]").forEach((input) => {
        const item = menu.cat[+input.dataset.catAdult];
        if (item) {
          item.l = input.checked;
          item.adulto = input.checked;
        }
      });
      document.querySelectorAll("[data-cat-active]").forEach((input) => {
        const item = menu.cat[+input.dataset.catActive];
        if (item) item.active = input.checked;
      });
      ["semana", "jueves", "finde"].forEach((key) => {
        menu.precios[key] = [0, 1, 2].map((index) =>
          Math.max(
            0,
            +document.querySelector(
              '[data-price-group="' +
                key +
                '"][data-price-index="' +
                index +
                '"]',
            )?.value || 0,
          ),
        );
      });
      document.querySelectorAll("[data-promo-day]").forEach((input) => {
        menu.promos[input.dataset.promoDay] = input.checked;
      });
      menu.promos.jueves = false;
      menu.mitadMitad = $("halfEnabled").checked;
      document.querySelectorAll("[data-drink-name]").forEach((input) => {
        const item = menu.bebidas[+input.dataset.drinkName];
        if (item) item.n = clean(input.value, 40);
      });
      document.querySelectorAll("[data-drink-price]").forEach((input) => {
        const item = menu.bebidas[+input.dataset.drinkPrice];
        if (item) item.p = Math.max(0, +input.value || 0);
      });
      document.querySelectorAll("[data-drink-active]").forEach((input) => {
        const item = menu.bebidas[+input.dataset.drinkActive];
        if (item) item.active = input.checked;
      });
      document.querySelectorAll("[data-combo-name]").forEach((input) => {
        const item = menu.combos[+input.dataset.comboName];
        if (item) item.n = clean(input.value, 50);
      });
      document.querySelectorAll("[data-combo-description]").forEach((input) => {
        const item = menu.combos[+input.dataset.comboDescription];
        if (item) item.d = clean(input.value, 120);
      });
      document.querySelectorAll("[data-combo-price]").forEach((input) => {
        const item = menu.combos[+input.dataset.comboPrice];
        if (item) item.p = Math.max(0, +input.value || 0);
      });
      document.querySelectorAll("[data-combo-active]").forEach((input) => {
        const item = menu.combos[+input.dataset.comboActive];
        if (item) item.active = input.checked;
      });
      return saveMenu("priceSaved");
    };
  }

  function settingsView() {
    const storeMode = manualStoreState();
    const schedule = [1, 2, 3, 4, 5, 6, 0]
      .map((day) => {
        const hours =
          menu.horario?.[day] ||
          menu.horario?.[dayNames[day]] ||
          menu.horario ||
          {};
        return (
          '<div class="editable-row"><strong>' +
          days[day] +
          '</strong><div class="field"><label>Abre</label><input type="time" data-hours-open="' +
          day +
          '" value="' +
          esc(hours.abre || hours.open || "11:00") +
          '"></div><div class="field"><label>Cierra</label><input type="time" data-hours-close="' +
          day +
          '" value="' +
          esc(hours.cierra || hours.close || "22:00") +
          '"></div></div>'
        );
      })
      .join("");
    $("adminView").innerHTML =
      '<div class="admin-grid"><article class="card"><h2>Horario por día</h2><p>El cambio de horario se aplica con la hora de Colombia.</p><div class="table-like">' +
      schedule +
      '</div><div class="field"><label for="storeMode">Estado de apertura</label><select id="storeMode"><option value="horario" ' +
      (storeMode === "horario" ? "selected" : "") +
      '>Seguir el horario</option><option value="abierta" ' +
      (storeMode === "abierta" ? "selected" : "") +
      '>Abrir manualmente</option><option value="cerrada" ' +
      (storeMode === "cerrada" ? "selected" : "") +
      '>Cerrar manualmente</option></select></div></article><article class="card"><h2>Contacto y pagos</h2><div class="field"><label>WhatsApp</label><input id="waSetting" value="' +
      esc(menu.whatsapp || "") +
      '"></div><div class="field"><label>Nequi</label><input id="nequiSetting" value="' +
      esc(menu.pagos?.Nequi || "") +
      '"></div><div class="field"><label>Daviplata</label><input id="daviSetting" value="' +
      esc(menu.pagos?.Daviplata || "") +
      '"></div><div class="field"><label>Instagram</label><input id="instaSetting" value="' +
      esc(menu.instagram || "") +
      '"></div><div class="field"><label>Google Maps</label><input id="mapsSetting" value="' +
      esc(menu.maps || "") +
      '"></div></article><article class="card"><h2>Mensajes</h2><div class="field"><label>Banner de promoción (opcional)</label><textarea id="promoSetting" maxlength="180">' +
      esc(menu.promoBanner || "") +
      '</textarea></div><div class="field"><label>Mensaje de tienda cerrada</label><textarea id="closedSetting" maxlength="180">' +
      esc(menu.closedMessage || "") +
      '</textarea></div><div class="notice">Domicilio: se paga aparte. No se suma al total.</div><div class="save"><button class="primary" id="saveSettingsV4">Guardar ajustes</button><span id="settingsSaved" class="saved"></span></div></article><article class="card"><h2>Mantenimiento</h2><p>Completa el seguimiento público de pedidos de los últimos 7 días que no tengan documento.</p><div class="admin-actions"><button class="secondary" id="repairTrackingV4">Reparar seguimiento de pedidos recientes</button><span id="trackingRepairResult" class="saved" role="status"></span></div></article><article class="card diagnostics" id="diagnosticsCard"><h2>Diagnóstico</h2><p>Estado actual del menú y la conexión.</p><ul class="diagnostic-list">' +
      diagnosticsMarkup() +
      "</ul></article></div>";
    showPanelVersion();
    $("saveSettingsV4").onclick = async () => {
      const hours = {};
      [0, 1, 2, 3, 4, 5, 6].forEach((day) => {
        hours[day] = {
          abre:
            document.querySelector('[data-hours-open="' + day + '"]').value ||
            "11:00",
          cierra:
            document.querySelector('[data-hours-close="' + day + '"]').value ||
            "22:00",
        };
      });
      menu.horario = hours;
      menu.aperturaManual = $("storeMode").value;
      menu.cerradaManual = menu.aperturaManual === "cerrada";
      menu.whatsapp = clean($("waSetting").value.replace(/[^\d+]/g, ""), 20);
      menu.pagos = Object.assign({}, menu.pagos, {
        Nequi: clean($("nequiSetting").value, 50),
        Daviplata: clean($("daviSetting").value, 50),
      });
      menu.instagram = clean($("instaSetting").value, 200);
      menu.maps = clean($("mapsSetting").value, 300);
      menu.promoBanner = clean($("promoSetting").value, 180);
      menu.closedMessage = clean($("closedSetting").value, 180);
      await saveMenu("settingsSaved");
    };
    $("repairTrackingV4").onclick = async () => {
      const button = $("repairTrackingV4");
      const result = $("trackingRepairResult");
      button.disabled = true;
      result.textContent = "Revisando pedidos recientes…";
      try {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recent = orders.filter((order) => orderCreatedAt(order) >= cutoff);
        const repaired = await store.repairRecentTracking(recent);
        result.textContent =
          repaired + " seguimiento" + (repaired === 1 ? " reparado." : "s reparados.");
      } catch (error) {
        console.error(error);
        result.textContent = "No se pudo reparar el seguimiento.";
      } finally {
        button.disabled = false;
      }
    };
  }

  function todayView() {
    const day = now().getDay(),
      names = menu.dias?.[day] || [];
    const todayOrders = orders.filter(
      (order) => orderDate(order) === dateKey(),
    );
    const current = aggregate(todayOrders);
    const flavors = names
      .map(
        (name) =>
          '<label class="switch"><span>' +
          esc(name) +
          (sold(name) ? " · AGOTADO" : " · DISPONIBLE") +
          '</span><input type="checkbox" data-today-flavor="' +
          esc(name) +
          '" ' +
          (!sold(name) ? "checked" : "") +
          "></label>",
      )
      .join("");
    $("adminView").innerHTML =
      '<div class="admin-grid"><article class="card"><h2>Estado de la tienda</h2><p class="status ' +
      (openNow() ? "open" : "closed") +
      '">' +
      (openNow() ? "Abierta ahora" : "Cerrada ahora") +
      '</p><button class="primary send" id="storeSwitch">' +
      (openNow() ? "Cerrar tienda" : "Abrir tienda") +
      "</button><p>" +
      esc(menu.closedMessage) +
      '</p></article><article class="card"><h2>Sabores de hoy · ' +
      esc(days[day]) +
      "</h2>" +
      (flavors || '<p class="notice">No hay sabores publicados hoy.</p>') +
      '<div class="admin-actions"><button class="secondary" id="saveTodayFlavors">Guardar disponibilidad</button><button class="secondary" id="editTodayFlavors">Cambiar sabores de hoy</button></div><span id="todaySaved" class="saved"></span></article><article class="card"><h2>Pedidos nuevos</h2>' +
      (todayOrders
        .filter((order) => order.estado === "Nuevo")
        .slice(0, 5)
        .map(
          (order) =>
            "<p><b>#" +
            esc(String(order.id).slice(-6).toUpperCase()) +
            " · " +
            esc(order.cliente?.nombre || "Cliente") +
            "</b><br>" +
            esc(linesText(order)) +
            "</p>",
        )
        .join("") || '<p class="notice">No hay pedidos nuevos.</p>') +
      '</article><article class="card"><h2>Ventas del día</h2><div class="metrics"><div class="metric"><b>' +
      fmt(current.total) +
      '</b><span>VENTAS</span></div><div class="metric"><b>' +
      current.n +
      '</b><span>PEDIDOS</span></div><div class="metric"><b>' +
      fmt(current.cash) +
      '</b><span>EFECTIVO ESPERADO</span></div></div><p class="notice">Domicilio se paga aparte.</p></article></div>';
    const statusCopy =
      $("storeSwitch")?.parentElement.querySelector("p:last-child");
    if (statusCopy) {
      const hours = menu.horario?.[day] || menu.horario || {};
      statusCopy.textContent = manualStoreState() === "abierta"
        ? "Abierta manualmente, aunque esté fuera del horario."
        : openNow()
        ? "Horario de hoy: " +
          (hours.abre || hours.open || "11:00") +
          " a " +
          (hours.cierra || hours.close || "22:00")
        : menu.closedMessage;
    }
    $("storeSwitch").onclick = async () => {
      menu.aperturaManual = openNow() ? "cerrada" : "abierta";
      menu.cerradaManual = menu.aperturaManual === "cerrada";
      await saveMenu("todaySaved");
    };
    $("editTodayFlavors").onclick = () => {
      selectedDay = day;
      adminState.tab = "menu";
      adminRender();
    };
    $("saveTodayFlavors").onclick = async () => {
      const set = new Set(menu.agotados[day] || []);
      document
        .querySelectorAll("[data-today-flavor]")
        .forEach((input) =>
          input.checked
            ? set.delete(input.dataset.todayFlavor)
            : set.add(input.dataset.todayFlavor),
        );
      menu.agotados[day] = [...set];
      await saveMenu("todaySaved");
    };
  }

  function adminRender() {
    if (!admin) return;
    document
      .querySelectorAll("[data-admin-tab]")
      .forEach((button) =>
        button.classList.toggle(
          "active",
          button.dataset.adminTab === adminState.tab,
        ),
      );
    if (adminState.tab === "today") todayView();
    if (adminState.tab === "orders") ordersView();
    if (adminState.tab === "menu") menuView();
    if (adminState.tab === "stats") statsView();
    if (adminState.tab === "settings") settingsView();
  };

  async function exportExcel() {
    const button = $("xlsx");
    if (button) {
      button.disabled = true;
      button.textContent = "Preparando Excel…";
    }
    try {
      if (!window.ExcelJS) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
          script.onload = resolve;
          script.onerror = () =>
            reject(new Error("No se pudo cargar ExcelJS."));
          document.head.append(script);
        });
      }
      const selected = orders.filter(
        (order) =>
          (!adminState.from || orderDate(order) >= adminState.from) &&
          (!adminState.to || orderDate(order) <= adminState.to),
      );
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Barrio Ice";
      workbook.created = new Date();
      const ordersSheet = workbook.addWorksheet("Pedidos", {
        views: [{ state: "frozen", ySplit: 1 }],
      });
      const detailSheet = workbook.addWorksheet("Detalle", {
        views: [{ state: "frozen", ySplit: 1 }],
      });
      const summarySheet = workbook.addWorksheet("Resumen", {
        views: [{ state: "frozen", ySplit: 5 }],
      });
      const headerFill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF5BC0EB" },
      };
      const headerFont = { bold: true, color: { argb: "FF07131D" } };
      const headers = [
        "N.º pedido",
        "Fecha",
        "Hora",
        "Cliente",
        "Celular",
        "Entrega",
        "Dirección",
        "Referencia",
        "Método de pago",
        "Estado",
        "Granizados pagados",
        "Granizados de regalo",
        "Subtotal",
        "Descuento promo",
        "Total",
        "Notas",
      ];
      ordersSheet.addRow(headers);
      const detailHeaders = [
        "N.º pedido",
        "Fecha",
        "Producto",
        "Sabor(es)",
        "Tamaño",
        "Cantidad",
        "Precio unitario",
        "Valor",
        "¿Regalo?",
      ];
      detailSheet.addRow(detailHeaders);
      const dateCell = (value) => {
        const text = String(value || "");
        return text ? new Date(text + "T12:00:00") : null;
      };
      const timeCell = (order) => {
        const date = order.creadoEn?.toDate
          ? order.creadoEn.toDate()
          : order.creadoEn
            ? new Date(order.creadoEn)
            : null;
        if (!date || Number.isNaN(date.getTime())) return null;
        const parts = new Intl.DateTimeFormat("en-GB", {
          timeZone: "America/Bogota",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        })
          .format(date)
          .split(":")
          .map(Number);
        return new Date(1899, 11, 30, parts[0], parts[1]);
      };
      selected.forEach((order) => {
        const lines = order.items || [];
        const granizados = lines.filter(
          (item) =>
            item.g ||
            item.tipo === "granizado" ||
            /granizado/i.test(item.n || ""),
        );
        const paid = granizados
          .filter((item) => !item.regalo)
          .reduce((sum, item) => sum + (+item.q || 0), 0);
        const gifts = granizados
          .filter((item) => item.regalo)
          .reduce((sum, item) => sum + (+item.q || 0), 0);
        ordersSheet.addRow([
          safeExcelText(
            String(order.id || "")
              .slice(-6)
              .toUpperCase(),
          ),
          dateCell(order.fecha),
          timeCell(order),
          safeExcelText(order.cliente?.nombre),
          safeExcelText(order.cliente?.celular),
          order.entrega?.tipo === "domicilio" ? "Domicilio" : "Recoger",
          safeExcelText(order.entrega?.direccion),
          safeExcelText(order.entrega?.referencia),
          safeExcelText(order.pago),
          safeExcelText(order.estado),
          paid,
          gifts,
          +order.subtotal || 0,
          +order.descuento || 0,
          +order.total || 0,
          safeExcelText(order.notas),
        ]);
        lines.forEach((item) =>
          detailSheet.addRow([
            safeExcelText(
              String(order.id || "")
                .slice(-6)
                .toUpperCase(),
            ),
            dateCell(order.fecha),
            safeExcelText(item.n || "Producto"),
            safeExcelText(BarrioIcePricing.flavorNames(item).join(" / ")),
            safeExcelText(item.s || ""),
            +item.q || 0,
            +item.p || 0,
            (+item.p || 0) * (+item.q || 0),
            item.regalo ? "Sí" : "No",
          ]),
        );
      });
      summarySheet.addRows([
        ["Resumen del periodo"],
        ["Desde", adminState.from || "Todos"],
        ["Hasta", adminState.to || "Hoy"],
        ["Pedidos", "=COUNTA(Pedidos!A2:A" + (selected.length + 1) + ")"],
        ["Ventas totales", "=SUM(Pedidos!O2:O" + (selected.length + 1) + ")"],
        [
          "Descuento por promos",
          "=SUM(Pedidos!N2:N" + (selected.length + 1) + ")",
        ],
        [],
        ["Ventas por día", "Total"],
        ["Fecha", "Ventas"],
      ]);
      const dates = [
        ...new Set(selected.map((order) => orderDate(order))),
      ].sort();
      dates.forEach((date, index) => {
        const row = 10 + index;
        summarySheet.addRow([
          dateCell(date),
          "=SUMIF(Pedidos!B:B,A" + row + ",Pedidos!O:O)",
        ]);
      });
      const paymentStart = summarySheet.rowCount + 2;
      summarySheet.addRow(["Ventas por método de pago", "Total"]);
      [...new Set(selected.map((order) => order.pago || "Sin método"))].forEach(
        (method, index) => {
          const row = paymentStart + 1 + index;
          summarySheet.addRow([
            safeExcelText(method),
            "=SUMIF(Pedidos!I:I,A" + row + ",Pedidos!O:O)",
          ]);
        },
      );
      const flavorStart = summarySheet.rowCount + 2;
      summarySheet.addRow(["Ventas por sabor", "Valor"]);
      const flavorNames = [
        ...new Set(
          selected.flatMap((order) =>
            (order.items || []).flatMap((item) =>
              BarrioIcePricing.flavorNames(item),
            ),
          ),
        ),
      ];
      flavorNames.forEach((name, index) => {
        const row = flavorStart + 1 + index;
        summarySheet.addRow([
          safeExcelText(name),
          "=SUMIF(Detalle!D:D,A" + row + ",Detalle!H:H)",
        ]);
      });
      const sizeStart = summarySheet.rowCount + 2;
      summarySheet.addRow(["Ventas por tamaño", "Valor"]);
      sizes.forEach((name, index) => {
        const row = sizeStart + 1 + index;
        summarySheet.addRow([
          name,
          "=SUMIF(Detalle!E:E,A" + row + ",Detalle!H:H)",
        ]);
      });
      [ordersSheet, detailSheet, summarySheet].forEach((sheet) => {
        sheet.getRow(1).eachCell((cell) => {
          cell.fill = headerFill;
          cell.font = headerFont;
        });
        sheet.autoFilter = {
          from: "A1",
          to: sheet.getRow(1).getCell(sheet.getRow(1).cellCount).address,
        };
        sheet.columns.forEach((column) => {
          let max = 10;
          column.eachCell?.({ includeEmpty: false }, (cell) => {
            max = Math.max(max, String(cell.value ?? "").length);
          });
          column.width = Math.min(34, Math.max(12, max + 2));
        });
      });
      ["M", "N", "O"].forEach((letter) => {
        ordersSheet.getColumn(letter).numFmt = '"$"#,##0';
      });
      ["G", "H"].forEach((letter) => {
        detailSheet.getColumn(letter).numFmt = '"$"#,##0';
      });
      ordersSheet.getColumn("B").numFmt = "dd/mm/yyyy";
      ordersSheet.getColumn("C").numFmt = "h:mm AM/PM";
      detailSheet.getColumn("B").numFmt = "dd/mm/yyyy";
      summarySheet.getColumn(1).width = 32;
      summarySheet.getColumn(2).width = 20;
      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "barrio-ice-pedidos-" + dateKey() + ".xlsx";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
    } catch (error) {
      console.error(error);
      alert(
        "No se pudo generar el Excel. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Exportar Excel (.xlsx)";
      }
    }
  }

  function adminClick(event) {
    const target = event.target.closest("button, select, input");
    if (!target) return;
    if (target.matches("[data-admin-tab]")) {
      adminState.tab = target.dataset.adminTab;
      if (adminState.tab === "orders" && $("newBadge"))
        $("newBadge").textContent = "";
      adminRender();
      return;
    }
    if (target.matches("[data-order-period]")) {
      setOrdersPeriod(target.dataset.orderPeriod);
      return;
    }
    if (target.matches("[data-stats-period]")) {
      adminState.statsPeriod = target.dataset.statsPeriod;
      if (adminState.statsPeriod !== "custom") statsView();
      return;
    }
    if (target.matches("[data-print]")) {
      printOrder(target.dataset.print);
      return;
    }
    if (target.matches("[data-gift-same]")) {
      const item = cart.find((line) => line.k === target.dataset.giftSame);
      if (item) {
        item.giftFlavor = BarrioIcePricing.flavorNames(item)[0];
        draw();
      }
      return;
    }
    if (target.matches("[data-delete-flavor]")) {
      const index = +target.dataset.deleteFlavor,
        item = menu.cat[index];
      if (
        item &&
        confirm(
          '¿Eliminar el sabor "' +
            item.n +
            '"? También se quitará de los días publicados.',
        )
      ) {
        menu.cat.splice(index, 1);
        Object.keys(menu.dias || {}).forEach((day) => {
          menu.dias[day] = (menu.dias[day] || []).filter(
            (name) => name !== item.n,
          );
        });
        menuView();
      }
      return;
    }
    if (target.matches("[data-delete-drink]")) {
      const index = +target.dataset.deleteDrink;
      if (confirm("¿Eliminar esta bebida del menú?")) {
        menu.bebidas.splice(index, 1);
        menuView();
      }
      return;
    }
    if (target.matches("[data-delete-combo]")) {
      const index = +target.dataset.deleteCombo;
      if (confirm("¿Eliminar este combo?")) {
        menu.combos.splice(index, 1);
        menuView();
      }
      return;
    }
    if (target.matches("[data-v4-day]")) {
      selectedDay = +target.dataset.v4Day;
      menuView();
      return;
    }
    if (target.matches("[data-v4-flavor]")) {
      const name = target.dataset.v4Flavor,
        list = menu.dias[selectedDay] || [];
      menu.dias[selectedDay] = list.includes(name)
        ? list.filter((value) => value !== name)
        : list.concat(name);
      menuView();
      return;
    }
    if (target.id === "addFlavorV4") {
      const name = clean($("newFlavorName").value, 30);
      const adult = $("newFlavorAdult").checked;
      if (
        name &&
        !menu.cat.some((item) => item.n.toLowerCase() === name.toLowerCase())
      )
        menu.cat.push({
          n: name,
          c: safeColor($("newFlavorColor").value),
          l: adult,
          adulto: adult,
          active: true,
        });
      menuView();
      return;
    }
    if (target.id === "copyDay") {
      const from = +$("copyFromDay").value;
      menu.dias[selectedDay] = [...(menu.dias[from] || [])];
      menuView();
      return;
    }
    if (target.id === "repeatYesterday") {
      const from = (selectedDay + 6) % 7;
      menu.dias[selectedDay] = [...(menu.dias[from] || [])];
      menuView();
      return;
    }
    if (target.id === "addDrinkV4") {
      const name = clean($("newDrinkName").value, 40),
        price = Math.max(0, +$("newDrinkPrice").value || 0);
      if (name)
        menu.bebidas.push({ n: name, p: price, icon: "Vaso", active: true });
      menuView();
      return;
    }
    if (target.id === "addComboV4") {
      const name = clean($("newComboName").value, 50),
        description = clean($("newComboDescription").value, 120),
        price = Math.max(0, +$("newComboPrice").value || 0);
      if (name)
        menu.combos.push({
          n: name,
          d: description,
          p: price,
          items: [],
          active: true,
        });
      menuView();
      return;
    }
    if (target.matches("[data-half-launch]")) {
      ensureHalfOptions(target.dataset.halfLaunch);
      if ($("halfDialog").showModal) $("halfDialog").showModal();
      else alert("La opción mitad y mitad necesita un navegador actualizado.");
      return;
    }
  }


document.addEventListener("click", adminClick);
document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches("[data-status]"))
    setOrderStatus(target.dataset.status, target.value);
});

function showLogin(error = "") {
  $("panel").classList.add("hide");
  $("login").classList.remove("hide");
  $("loginError").textContent = error;
}
function showPanel(user) {
  $("login").classList.add("hide");
  $("panel").classList.remove("hide");
  $("welcome").textContent = user?.email || "Conectado";
  admin = true;
  adminRender();
}
function startPanel(user) {
  unsubscribeOrders?.();
  unsubscribeMenu?.();
  ordersLoaded = false;
  unsubscribeOrders = store.watchOrders((nextOrders) => {
    const incoming = nextOrders.filter((order) => !seen.has(order.id));
    orders = nextOrders;
    if (
      ordersLoaded &&
      incoming.some(
        (order) =>
          order.estado === "Nuevo" &&
          !orderAudit(order).some((warning) => warning.startsWith("Total no cuadra")),
      )
    )
      beep();
    orders.forEach((order) => seen.add(order.id));
    if ($("newBadge"))
      $("newBadge").textContent = String(
        orders.filter((order) => order.estado === "Nuevo").length || "",
      );
    ordersLoaded = true;
    adminRender();
  }, showConnectionError);
  unsubscribeMenu = store.watchMenu((data) => {
    menu = BarrioShared.mergeMenu(data || DEFAULTS);
    adminRender();
  }, showConnectionError);
  showPanel(user);
}
function showConnectionError() {
  const welcome = $("welcome");
  if (!welcome) return;
  welcome.textContent = "No se pudieron cargar los datos. Revisa las reglas y el UID.";
  welcome.className = "muted error";
}

function diagnosticRow(key, label, ok, detail) {
  return (
    '<li data-diagnostic="' +
    key +
    '" class="diagnostic-' +
    (ok ? "ok" : "warn") +
    '"><span><b aria-hidden="true">' +
    (ok ? "✓" : "⚠") +
    "</b> " +
    label +
    '</span><small>' +
    esc(detail) +
    "</small></li>"
  );
}

function diagnosticsMarkup() {
  const socialUrlIsSet = (value, hostname) => {
    if (!value) return false;
    try {
      const url = new URL(value);
      if (hostname === "instagram")
        return /^(www\.)?instagram\.com$/i.test(url.hostname) &&
          url.pathname.replace(/\/$/, "") !== "";
      const place = (
        url.searchParams.get("q") ||
        url.searchParams.get("query") ||
        url.pathname.split("/").filter(Boolean).pop() ||
        ""
      )
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return !/^(monteria(?:,? colombia)?|colombia)$/.test(place);
    } catch {
      return false;
    }
  };
  const hoursComplete = [0, 1, 2, 3, 4, 5, 6].every((day) => {
    const hours = menu.horario?.[day] || menu.horario?.[days[day]];
    if (!hours) return false;
    return [hours.abre || hours.open, hours.cierra || hours.close].every(
      (value) => /^\d{2}:\d{2}$/.test(String(value || "")),
    );
  });
  const whatsapp = String(menu.whatsapp || "").replace(/\D/g, ""),
    nequi = String(menu.pagos?.Nequi || "").replace(/\D/g, ""),
    daviplata = String(menu.pagos?.Daviplata || "").replace(/\D/g, ""),
    lastOrder = orders.reduce(
      (latest, order) =>
        !latest || orderCreatedAt(order) > orderCreatedAt(latest)
          ? order
          : latest,
      null,
    ),
    reviewed = orders.filter((order) => orderAudit(order).length).length,
    lastOrderTimestamp = lastOrder ? orderCreatedAt(lastOrder) : NaN,
    lastOrderDate = Number.isFinite(lastOrderTimestamp)
      ? new Intl.DateTimeFormat("es-CO", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(lastOrderTimestamp))
      : lastOrder
        ? "Fecha no disponible"
        : "Sin pedidos";
  return [
    diagnosticRow(
      "instagram",
      "Instagram configurado",
      socialUrlIsSet(menu.instagram, "instagram"),
      menu.instagram || "Falta el enlace real del negocio",
    ),
    diagnosticRow(
      "maps",
      "Ubicación configurada",
      socialUrlIsSet(menu.maps, "maps"),
      menu.maps || "Falta el enlace real de Google Maps",
    ),
    diagnosticRow(
      "whatsapp",
      "WhatsApp internacional",
      /^57\d{10}$/.test(whatsapp),
      whatsapp ? "+" + whatsapp : "Falta un número de 12 dígitos que empiece por 57",
    ),
    diagnosticRow("nequi", "Nequi configurado", nequi.length > 0, nequi || "Sin número"),
    diagnosticRow(
      "daviplata",
      "Daviplata configurado",
      daviplata.length > 0,
      daviplata || "Sin número",
    ),
    diagnosticRow(
      "hours",
      "Horario definido para los 7 días",
      hoursComplete,
      hoursComplete ? "Los siete días tienen hora de apertura y cierre" : "Completa los horarios diarios",
    ),
    diagnosticRow(
      "menu-document",
      "Documento tienda/menu",
      menuDocumentExists,
      menuDocumentExists ? "Documento disponible en Firestore" : "Documento no encontrado en Firestore",
    ),
    diagnosticRow(
      "app-check",
      "App Check configurado",
      Boolean(APP_CHECK_SITE_KEY),
      APP_CHECK_SITE_KEY ? "Clave de sitio presente" : "Falta la clave de sitio reCAPTCHA v3",
    ),
    '<li class="diagnostic-version"><span>Versión del panel</span><small id="diagnosticsVersion" aria-live="polite">Consultando service worker…</small></li>',
    diagnosticRow(
      "orders",
      "Último pedido y revisión",
      reviewed === 0,
      lastOrderDate + " · " + orders.length + " pedidos · " + reviewed + " ⚠ Revisar",
    ),
  ].join("");
}

async function showPanelVersion() {
  const node = $("diagnosticsVersion");
  if (!node) return;
  try {
    const registration = await navigator.serviceWorker?.getRegistration("/admin/"),
      scriptUrl = registration?.active?.scriptURL || "/admin/sw.js",
      response = await fetch(scriptUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Versión no disponible");
    const source = await response.text(),
      build = source.match(/const BUILD = ["']([^"']+)["']/)?.[1];
    node.textContent = build && !build.startsWith("__") ? build : "Desarrollo";
  } catch {
    node.textContent = "No disponible";
  }
}
function stopPanel() {
  unsubscribeOrders?.();
  unsubscribeMenu?.();
  unsubscribeOrders = unsubscribeMenu = null;
  orders = [];
  seen.clear();
  admin = false;
  showLogin();
}

function makeLocalTestStore() {
  const readMenu = () => {
    try {
      return JSON.parse(localStorage.getItem("barrio-ice-visual-menu") || "{}");
    } catch {
      return {};
    }
  };
  const readOrders = () => {
    try {
      return JSON.parse(localStorage.getItem("barrio-ice-visual-orders") || "[]");
    } catch {
      return [];
    }
  };
  menu = BarrioShared.mergeMenu(readMenu());
  menuDocumentExists = true;
  orders = readOrders();
  store = {
    ready: true,
    time: () => new Date(),
    save: async (value) => {
      menu = BarrioShared.mergeMenu(value);
      localStorage.setItem("barrio-ice-visual-menu", JSON.stringify(menu));
    },
    update: async (id, value) => {
      orders = orders.map((order) =>
        order.id === id ? Object.assign({}, order, value) : order,
      );
      localStorage.setItem("barrio-ice-visual-orders", JSON.stringify(orders));
      const tracking = JSON.parse(
        localStorage.getItem("barrio-ice-visual-tracking") || "{}",
      );
      const order = orders.find((item) => item.id === id) || {};
      tracking[id] = Object.assign(
        tracking[id] || publicTracking(order),
        { estado: value.estado, actualizadoEn: value.actualizadoEn },
      );
      localStorage.setItem("barrio-ice-visual-tracking", JSON.stringify(tracking));
    },
    deleteOrder: async (id) => {
      orders = orders.filter((order) => order.id !== id);
      localStorage.setItem("barrio-ice-visual-orders", JSON.stringify(orders));
      const tracking = JSON.parse(
        localStorage.getItem("barrio-ice-visual-tracking") || "{}",
      );
      delete tracking[id];
      localStorage.setItem("barrio-ice-visual-tracking", JSON.stringify(tracking));
    },
    repairRecentTracking: async (recentOrders) => {
      const tracking = JSON.parse(
        localStorage.getItem("barrio-ice-visual-tracking") || "{}",
      );
      let repaired = 0;
      for (const order of recentOrders) {
        if (tracking[order.id]) continue;
        tracking[order.id] = publicTracking(order);
        repaired += 1;
      }
      localStorage.setItem("barrio-ice-visual-tracking", JSON.stringify(tracking));
      return repaired;
    },
    watchMenu: (callback) => {
      callback(menu);
      return () => {};
    },
    watchOrders: (callback) => {
      callback(orders);
      return () => {};
    },
  };
}

const e2eAllowed =
  new URLSearchParams(location.search).get("e2e") === "1" &&
  ["localhost", "127.0.0.1"].includes(location.hostname);
if (e2eAllowed) {
  makeLocalTestStore();
  $("connState").textContent = "Prueba local disponible.";
  window.__barrioAdminE2E = Object.freeze({
    startSession(user) {
      if (!user || user.uid !== ADMIN_UID)
        throw new Error("UID de prueba no autorizado.");
      startPanel(user);
    },
    replaceOrders(nextOrders) {
      orders = nextOrders;
      ordersLoaded = true;
      adminState.period = "all";
      adminState.from = adminState.to = "";
      adminState.status = "";
      localStorage.setItem("barrio-ice-visual-orders", JSON.stringify(nextOrders));
      ordersView();
    },
  });
} else {
  initializeFirebase().catch((error) => {
    console.error(error);
    $("connState").textContent = "Sin conexión con Firebase.";
  });
}

async function initializeFirebase() {
  $("connState").textContent = "Conectando con Firebase…";
  const base = "https://www.gstatic.com/firebasejs/10.12.2/";
  const [appSdk, dbSdk, authSdk] = await Promise.all([
    import(base + "firebase-app.js"),
    import(base + "firebase-firestore.js"),
    import(base + "firebase-auth.js"),
  ]);
  const app = appSdk.initializeApp(FIREBASE_CONFIG);
  if (APP_CHECK_SITE_KEY) {
    if (location.hostname === "localhost") self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    const appCheckSdk = await import(base + "firebase-app-check.js");
    appCheckSdk.initializeAppCheck(app, {
      provider: new appCheckSdk.ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  }
  const db = dbSdk.initializeFirestore(app, {
    localCache: dbSdk.persistentLocalCache({
      tabManager: dbSdk.persistentMultipleTabManager(),
    }),
  });
  const auth = authSdk.getAuth(app);
  store = {
    ready: true,
    time: () => dbSdk.serverTimestamp(),
    login: (email, password) =>
      authSdk.signInWithEmailAndPassword(auth, email, password),
    logout: () => authSdk.signOut(auth),
    save: (value) => dbSdk.setDoc(dbSdk.doc(db, "tienda", "menu"), value),
    update: async (id, value, order) => {
      const batch = dbSdk.writeBatch(db);
      batch.update(dbSdk.doc(db, "pedidos", id), value);
      const trackingRef = dbSdk.doc(db, "seguimiento", id);
      const tracking = await dbSdk.getDoc(trackingRef);
      batch.set(
        trackingRef,
        tracking.exists()
          ? { estado: value.estado, actualizadoEn: value.actualizadoEn }
          : Object.assign(
              publicTracking(order || orders.find((item) => item.id === id) || {}, value.estado),
              { actualizadoEn: value.actualizadoEn },
            ),
        { merge: true },
      );
      await batch.commit();
    },
    async deleteOrder(id) {
      const batch = dbSdk.writeBatch(db);
      batch.delete(dbSdk.doc(db, "pedidos", id));
      batch.delete(dbSdk.doc(db, "seguimiento", id));
      await batch.commit();
    },
    async repairRecentTracking(recentOrders) {
      let repaired = 0;
      for (const order of recentOrders) {
        const reference = dbSdk.doc(db, "seguimiento", order.id);
        const existing = await dbSdk.getDoc(reference);
        if (existing.exists()) continue;
        const first =
          (order.cliente?.nombre || "").trim().split(/\s+/)[0].slice(0, 20) ||
          "Cliente";
        await dbSdk.setDoc(reference, {
          estado: order.estado || "Nuevo",
          tipo: order.entrega?.tipo === "domicilio" ? "domicilio" : "recoger",
          fecha: order.fecha || "",
          creadoEn: order.creadoEn || dbSdk.serverTimestamp(),
          nombreCorto: first,
        });
        repaired += 1;
      }
      return repaired;
    },
    watchMenu(callback, onError) {
      return dbSdk.onSnapshot(
        dbSdk.doc(db, "tienda", "menu"),
        (snapshot) => {
          menuDocumentExists = snapshot.exists();
          callback(snapshot.exists() ? snapshot.data() : DEFAULTS);
        },
        onError,
      );
    },
    watchOrders(callback, onError) {
      const ordersQuery = dbSdk.query(
        dbSdk.collection(db, "pedidos"),
        dbSdk.orderBy("creadoEn", "desc"),
        dbSdk.limit(300),
      );
      return dbSdk.onSnapshot(
        ordersQuery,
        (snapshot) =>
          callback(
            snapshot.docs.map((document) =>
              Object.assign({ id: document.id }, document.data()),
            ),
          ),
        onError,
      );
    },
  };
  authSdk.onAuthStateChanged(auth, (user) => {
    if (user && user.uid !== ADMIN_UID) {
      showLogin("Esta cuenta no tiene permiso de dueño.");
      authSdk.signOut(auth);
      return;
    }
    if (user) startPanel(user);
    else stopPanel();
  });
  $("loginButton").addEventListener("click", async () => {
    try {
      $("loginError").textContent = "";
      await store.login($("email").value.trim(), $("password").value);
    } catch {
      $("loginError").textContent =
        "No fue posible iniciar sesión. Revisa el correo y la contraseña.";
    }
  });
  $("logout").addEventListener("click", () => store.logout());
  $("connState").textContent = "Ingresa con el correo autorizado.";
}

$("theme").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("barrio-ice-theme", JSON.stringify(next));
  applyBrandTheme();
});
$("soundToggle").addEventListener("click", activateSound);
function applyBrandTheme() {
  const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  document.querySelectorAll("img[data-brand]").forEach((image) => {
    image.src = "/assets/brand/" + image.dataset.brand + "-" + theme + ".webp";
  });
}
applyBrandTheme();
new MutationObserver(applyBrandTheme).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-theme"],
});

let updateRegistration = null;
let reloaded = false;
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/admin/sw.js", { scope: "/admin/", updateViaCache: "none" })
    .then((registration) => {
      updateRegistration = registration;
      const showUpdate = () => $("updateBar").classList.remove("hide");
      if (registration.waiting) showUpdate();
      registration.addEventListener("updatefound", () =>
        registration.installing?.addEventListener("statechange", function () {
          if (this.state === "installed" && navigator.serviceWorker.controller)
            showUpdate();
        }),
      );
      registration.update();
      setInterval(() => registration.update(), 30 * 60 * 1000);
    })
    .catch(() => {});
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!reloaded) {
      reloaded = true;
      location.reload();
    }
  });
}
$("updateNow").addEventListener("click", () =>
  updateRegistration?.waiting?.postMessage("SKIP_WAITING"),
);
const installBar = $("installBar");
const installButton = $("installNow");
const installHelp = $("installHelp");
const iosDevice = /iPhone|iPad|iPod/.test(navigator.userAgent);
const installedApp =
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;
if (!installedApp && (iosDevice || window.matchMedia("(max-width: 900px)").matches))
  installBar.classList.remove("hide");
if (iosDevice && !installedApp) {
  installButton.textContent = "Ver pasos";
  installHelp.textContent = "En Safari, usa Compartir y luego Añadir a pantalla de inicio.";
}
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  if (installedApp) return;
  deferredInstall = event;
  installButton.textContent = "Instalar app";
  installHelp.textContent = "Abre el instalador del panel en este navegador.";
  installBar.classList.remove("hide");
});
installButton.addEventListener("click", async () => {
  if (!deferredInstall) {
    installHelp.textContent = iosDevice
      ? "En Safari: Compartir → Añadir a pantalla de inicio → Añadir."
      : "En Chrome: abre el menú ⋮ y elige Instalar aplicación o Añadir a pantalla principal.";
    return;
  }
  const prompt = deferredInstall;
  deferredInstall = null;
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") installBar.classList.add("hide");
    else {
      installButton.textContent = "Ver pasos";
      installHelp.textContent = "Puedes instalarla desde el menú del navegador cuando quieras.";
    }
  } catch (error) {
    console.error(error);
    installButton.textContent = "Ver pasos";
    installHelp.textContent = "Abre el menú del navegador y selecciona Instalar aplicación.";
  }
});
window.addEventListener("appinstalled", () => installBar.classList.add("hide"));

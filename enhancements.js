(function () {
  "use strict";

  const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const orderStates = ["Nuevo", "Preparando", "Listo", "En camino", "Entregado", "Cancelado"];
  const weekdayKeys = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const baseMerge = merge;
  const baseRender = render;
  const revealedKeys = new Set();
  let revealObserver = null;
  const adminState = { tab: "today", from: dateKey(), to: dateKey(), status: "", search: "", period: "today", statsPeriod: "today" };

  function normalMenu(data) {
    const out = data || {};
    out.promos = Object.assign({ lunes: true, martes: true, miercoles: true, jueves: true }, out.promos || {});
    out.precios = Object.assign({ semana: [12000, 15000, 18000], jueves: [12000, 15000, 18000], finde: [8000, 12000, 15000] }, out.precios || {});
    if (!out.precios.jueves) out.precios.jueves = [...out.precios.semana];
    out.mitadMitad = out.mitadMitad !== false;
    out.closedMessage = clean(out.closedMessage || "En este momento estamos cerrados. Vuelve en nuestro horario de atención.", 180);
    out.promoBanner = clean(out.promoBanner || "", 180);
    out.cat = (out.cat || []).map(f => {
      const adult = Boolean(f?.l ?? f?.adulto ?? false);
      return Object.assign({ active: true }, f, { l: adult, adulto: adult });
    });
    out.bebidas = (out.bebidas || []).map(b => Object.assign({ active: true, icon: "Vaso" }, b));
    out.combos = (out.combos || []).map(c => Object.assign({ active: true, p: (c.items || []).reduce((n, x) => n + (+x.p || 0), 0) }, c));
    return out;
  }

  merge = function (data) { return normalMenu(baseMerge(data)); };
  menu = normalMenu(menu);
  if (!menu.precios.jueves) menu.precios.jueves = [...menu.precios.semana];

  function installHero() {
    const hero = document.querySelector(".hero");
    if (!hero) return;
    const art = hero.querySelector(".art");
    const logo = art?.querySelector("img");
    if (logo) {
      logo.className = "hero-logo";
      logo.alt = "Logo de Barrio Ice";
      hero.insertBefore(logo, hero.firstChild);
    }
    const title = hero.querySelector("h1");
    if (title) title.innerHTML = "<span>El barrio se</span><span>sirve bien frío</span>";
    const nav = document.querySelector(".tabs");
    if (nav) {
      const bottom = document.createElement("nav");
      bottom.className = "admin-nav";
      bottom.setAttribute("aria-label", "Navegación del administrador");
      bottom.innerHTML = [
        ["today", "HOY"], ["orders", "PEDIDOS"], ["menu", "MENÚ"], ["stats", "VENTAS"], ["settings", "AJUSTES"]
      ].map(([key, label]) => '<button type="button" data-admin-tab="' + key + '" aria-label="' + label + '">' + label + (key === "orders" ? '<span id="newBadge"></span>' : "") + '</button>').join("");
      nav.replaceWith(bottom);
    }
    if (!document.getElementById("halfDialog")) {
      document.body.insertAdjacentHTML("beforeend", '<dialog id="halfDialog"><form id="halfForm"><h2>Mitad y mitad</h2><p class="notice">Escoge dos sabores de hoy para un mismo vaso.</p><div class="field"><label for="halfSize">Tamaño</label><select id="halfSize"></select></div><div class="field"><label for="halfFirst">Primer sabor</label><select id="halfFirst"></select></div><div class="field"><label for="halfSecond">Segundo sabor</label><select id="halfSecond"></select></div><p id="halfPrice" class="notice"></p><div class="dialog-actions"><button class="secondary" type="button" id="halfCancel">Cancelar</button><button class="primary" type="submit">Agregar al pedido</button></div></form></dialog>');
    }
    if (!document.getElementById("cashChange")) {
      $("cashBox")?.insertAdjacentHTML("beforeend", '<small class="change-copy" id="cashChange" aria-live="polite"></small>');
    }
    if (!document.getElementById("promoBanner")) {
      const buttons = hero.querySelector(".hero-copy .buttons");
      buttons?.insertAdjacentHTML("afterend", '<div class="promo-banner" id="promoBanner" role="status"><strong id="promoBannerTitle">HOY 2X1</strong><span id="promoBannerCopy"></span></div>');
    }
  }

  installHero();

  function installLoadingSkeletons() {
    const card = '<article class="skeleton-card" aria-hidden="true"><span class="skeleton-line short"></span><span class="skeleton-line"></span><span class="skeleton-line short"></span><span class="skeleton-button"></span></article>';
    [
      ["flavors", 3, false],
      ["combos", 2, true],
      ["drinks", 2, true]
    ].forEach(([id, count, compact]) => {
      const grid = $(id);
      if (!grid || grid.childElementCount) return;
      grid.classList.add("skeleton-grid");
      if (compact) grid.dataset.loadingKind = "compact";
      grid.setAttribute("aria-busy", "true");
      grid.innerHTML = card.repeat(count);
    });
  }

  installLoadingSkeletons();

  function dayPlan(day = now().getDay()) {
    const result = BarrioIcePricing.planForDay(day, menu);
    return Object.assign({}, result, { g: result.active ? result.receive : 0, p: result.prices });
  }
  plan = dayPlan;
  openNow = function () {
    if (menu.cerradaManual) return false;
    const n = now(), day = n.getDay(), hours = menu.horario?.[day] || menu.horario?.[dayNames[day]] || menu.horario || {};
    if (hours.abierto === false || hours.cerrado === true) return false;
    const current = n.getHours() * 60 + n.getMinutes();
    const toMinutes = value => { const [h, m] = String(value || "11:00").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
    return current >= toMinutes(hours.abre || hours.open) && current < toMinutes(hours.cierra || hours.close || "22:00");
  };
  totals = function () {
    return BarrioIcePricing.calculate(cart, now().getDay(), menu);
  };

  function allTodayFlavors() {
    const names = menu.dias?.[now().getDay()] || [];
    return names.map(name => flavor(name)).filter(item => item && item.active !== false && !sold(item.n));
  }
  function flavorText(item, includeProduct = true) {
    const names = BarrioIcePricing.flavorNames(item);
    if (names.length > 1) return names.join(" / ") + " (mitad y mitad)";
    if (names.length === 1) return (includeProduct ? "Granizado de " : "") + names[0];
    return item.n || "Producto";
  }
  function safeColor(color) { return /^#[0-9a-f]{6}$/i.test(String(color || "")) ? color : "#5bc0eb"; }
  function showPromoBanner() {
    const p = dayPlan();
    const title = $("promoBannerTitle"), copyNode = $("promoBannerCopy"), banner = $("promoBanner");
    if (!title || !copyNode || !banner) return;
    title.textContent = p.g === 2 ? "HOY 2X1" : p.g === 3 ? "HOY 3X2" : "HOY SIN PROMO";
    let message = menu.promoBanner || (p.g === 2
      ? "Elige un granizado y recibes dos del mismo tamaño y precio."
      : p.g === 3 ? "Por cada dos granizados del mismo tamaño y precio, te regalamos el tercero."
        : "Precios normales de fin de semana.");
    const hours = menu.horario?.[now().getDay()] || menu.horario || {};
    if (openNow()) {
      const [hour, minute] = String(hours.cierra || hours.close || "22:00").split(":").map(Number), end = new Date(now());
      end.setHours(hour || 0, minute || 0, 0, 0);
      const remaining = Math.max(0, Math.floor((end - now()) / 60000));
      message += " · Cierra en " + Math.floor(remaining / 60) + " h " + (remaining % 60) + " min";
    } else if (!menu.cerradaManual) message += " · Abrimos a " + (hours.abre || hours.open || "11:00");
    copyNode.textContent = message;
  }

  render = function () {
    baseRender();
    ["flavors", "combos", "drinks"].forEach(id => {
      const grid = $(id);
      if (!grid) return;
      revealObserver?.unobserve(grid);
      grid.classList.remove("skeleton-grid");
      delete grid.dataset.loadingKind;
      grid.setAttribute("aria-busy", "false");
    });
    showPromoBanner();
    const todayNames = menu.dias?.[now().getDay()] || [];
    document.querySelectorAll(".flavor").forEach(card => {
      const button = card.querySelector("[data-flavor]");
      if (!button) return;
      const item = flavor(button.dataset.flavor);
      const inactive = !item || item.active === false;
      const ageBadge = card.querySelector(".tag.adult");
      if (item && (item.l || item.adulto) && !ageBadge) {
        const badge = document.createElement("span");
        badge.className = "tag adult";
        badge.textContent = "+18 · LICOR";
        const existingBadge = card.querySelector(".tag");
        if (existingBadge) existingBadge.after(badge); else card.prepend(badge);
      } else if ((!item || !(item.l || item.adulto)) && ageBadge) ageBadge.remove();
      card.querySelectorAll("[data-flavor]").forEach(sizeButton => { sizeButton.disabled = sizeButton.disabled || inactive; });
      card.querySelector(".half-trigger")?.remove();
      if (menu.mitadMitad && todayNames.filter(name => flavor(name)?.active !== false && !sold(name)).length > 1) {
        card.insertAdjacentHTML("beforeend", '<button class="half-trigger" type="button" data-half-launch="' + esc(button.dataset.flavor) + '">Mitad y mitad</button>');
      }
    });
    document.querySelectorAll("[data-drink]").forEach(button => { const item = menu.bebidas[+button.dataset.drink]; const card = button.closest(".drink"); if (card) card.hidden = !item || item.active === false; });
    document.querySelectorAll("[data-combo]").forEach(button => {
      const item = menu.combos[+button.dataset.combo], card = button.closest(".combo");
      if (card) { card.hidden = !item || item.active === false; const price = card.querySelector("p"); if (item && price) price.textContent = (item.d || "") + " · " + fmt(item.p); }
    });
    decorateRevealTargets();
  };

  addFlavor = function (name, sizeIndex, source) {
    const item = flavor(name);
    if (!item || item.active === false || sold(name)) return;
    const prices = dayPlan().prices;
    const size = sizes[sizeIndex];
    add({
      k: "g:" + name + ":" + sizeIndex,
      n: "Granizado de " + name,
      s: size,
      sabores: [name],
      p: +prices[sizeIndex],
      q: 1,
      g: true,
      tipo: "granizado",
      adulto: !!(item.l || item.adulto),
      giftFlavor: name
    }, source);
  };
  addCombo = function (index, source) {
    const item = menu.combos[index];
    if (!item || item.active === false) return;
    const price = Math.max(0, +item.p || (item.items || []).reduce((sum, line) => sum + (+line.p || 0), 0));
    add({ k: "combo:" + index, n: item.n, s: item.d || "Combo", p: price, q: 1, g: false, tipo: "combo", adulto: !!item.adulto, sabores: [] }, source);
  };
  addDrink = function (index, source) {
    const item = menu.bebidas[index];
    if (!item || item.active === false) return;
    add({ k: "b:" + index, n: item.n, s: "", p: +item.p || 0, q: 1, g: false, tipo: "bebida", adulto: !!item.adulto, sabores: [] }, source);
  };

  function flavorOptions(selected) {
    return allTodayFlavors().map(item => '<option value="' + esc(item.n) + '" ' + (item.n === selected ? "selected" : "") + '>' + esc(item.n) + '</option>').join("");
  }
  function draw() {
    const result = totals();
    const qty = cart.reduce((sum, item) => sum + (+item.q || 0), 0);
    $$(".count").forEach(node => { node.textContent = qty; });
    $("fabTotal").textContent = fmt(result.total);
    const paid = result.paidLines.map(item => {
      const isGranizado = item.g === true || item.tipo === "granizado";
      const offerSelect = isGranizado && dayPlan().active
        ? '<label><small>¿Qué sabor quieres de regalo?</small><select class="gift-select" data-gift-flavor="' + esc(item.k) + '">' + flavorOptions(item.giftFlavor || BarrioIcePricing.flavorNames(item)[0]) + '</select></label><button type="button" class="secondary gift-same" data-gift-same="' + esc(item.k) + '">El mismo</button>' : "";
      return '<div class="cart-line"><div><b>' + esc(flavorText(item)) + (item.s ? " · " + esc(item.s) : "") + '</b><small>' + fmt(item.p) + ' c/u</small>' + offerSelect + '</div><div class="qty"><button data-change="' + esc(item.k) + '" data-d="-1" aria-label="Quitar uno">−</button>' + item.q + '<button data-change="' + esc(item.k) + '" data-d="1" aria-label="Agregar uno">+</button></div></div>';
    }).join("");
    const gifts = result.giftLines.map(item => '<div class="cart-line gift"><div><b>REGALO ' + esc(String(item.promo).replace(/^Promo\s+/i, "")) + ': ' + item.q + ' x ' + esc(flavorText(item)) + ' · ' + esc(item.s) + '</b><small>Valor: ' + fmt(0) + '</small></div><strong>' + fmt(0) + '</strong></div>').join("");
    $("lines").innerHTML = cart.length ? paid + gifts : '<p class="notice">Agrega algo frío para empezar.</p>';
    $("summary").innerHTML = cart.length
      ? '<div><span>Subtotal</span><b>' + fmt(result.subtotal) + '</b></div><div class="discount"><span>Ahorro por promo</span><b>' + (result.discount ? "−" : "") + fmt(result.discount) + '</b></div><div><span>Domicilio</span><b>Se paga aparte</b></div><div class="total"><span>Total</span><b>' + fmt(result.total) + '</b></div>'
      : "";
    $("nudge").textContent = result.nudge || (dayPlan().g ? "La promo se aplica sola según el tamaño y precio." : "Fin de semana sin promo: precios normales.");
    $("total").textContent = fmt(result.total);
    $("ageBox").classList.toggle("hide", !cart.some(item => item.adulto));
    paymentChanged();
    updateCashChange();
    markPicked();
  }
  function updateCashChange() {
    const node = $("cashChange");
    if (!node) return;
    const total = totals().total, amount = +$("cash")?.value || 0;
    node.textContent = $("payment")?.value === "Efectivo" && amount >= total && total > 0
      ? "Cambio para devolver: " + fmt(amount - total)
      : "";
  }
  function promoNudge() { return totals().nudge || "La promoción se calcula según los granizados elegidos."; }
  nudgeText = promoNudge;
  window.draw = draw;

  function ensureHalfOptions(initialFlavor) {
    const options = allTodayFlavors();
    $("halfFirst").innerHTML = options.map(item => '<option value="' + esc(item.n) + '" ' + (item.n === initialFlavor ? "selected" : "") + '>' + esc(item.n) + '</option>').join("");
    $("halfSecond").innerHTML = options.map((item, index) => '<option value="' + esc(item.n) + '" ' + ((item.n !== initialFlavor && index === options.findIndex(other => other.n !== initialFlavor)) ? "selected" : "") + '>' + esc(item.n) + '</option>').join("");
    const p = dayPlan();
    $("halfSize").innerHTML = sizes.map((size, index) => '<option value="' + index + '">' + size + ' · ' + fmt(p.prices[index]) + '</option>').join("");
    $("halfPrice").textContent = "Precio del vaso: " + fmt(p.prices[0]);
  }

  function safeExcelText(value) {
    const text = String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ");
    return /^[\s]*[=+\-@]/.test(text) ? "'" + text : text;
  }
  function orderLineText(item) {
    const product = flavorText(item);
    return (item.regalo ? "REGALO " + String(item.promo || "").replace(/^Promo\s+/i, "") + ": " : "") + item.q + " x " + product + (item.s ? " " + item.s : "") + " = " + fmt(item.p || 0);
  }
  function orderTime(dateValue) {
    const date = dateValue?.toDate ? dateValue.toDate() : dateValue ? new Date(dateValue) : new Date();
    return new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
  }
  function trackUrl(id) { return location.origin + location.pathname + "?pedido=" + encodeURIComponent(id); }
  orderMessage = function (order) {
    const items = (order.items || []).map(item => "- " + orderLineText(item));
    const address = order.entrega?.tipo === "domicilio"
      ? ["Domicilio: " + (order.entrega.direccion || ""), order.entrega.referencia ? "Referencia: " + order.entrega.referencia : "", "El domicilio se paga aparte."]
      : ["Entrega: Recoger en el local"];
    const payment = ["Método: " + (order.pago || "")];
    if (order.pago === "Efectivo" && Number(order.conCuanto) > 0) payment.push("Paga con: " + fmt(order.conCuanto) + " (devolver " + fmt(Math.max(0, order.conCuanto - order.total)) + ")");
    const sections = [
      "*NUEVO PEDIDO - BARRIO ICE*\nPedido #" + String(order.id || "").slice(-6).toUpperCase() + " - " + orderTime(order.creadoEn),
      "*CLIENTE*\nNombre: " + (order.cliente?.nombre || "") + "\nCelular: " + (order.cliente?.celular || ""),
      "*PEDIDO*\n" + items.join("\n"),
      "*ENTREGA*\n" + address.filter(Boolean).join("\n"),
      "*PAGO*\n" + payment.join("\n"),
      "*RESUMEN*\nSubtotal: " + fmt(order.subtotal) + "\n" + (order.descuento ? (order.promo || "Ahorro por promo") + ": -" + fmt(order.descuento) + "\n" : "") + "*TOTAL A PAGAR: " + fmt(order.total) + "*" + (order.entrega?.tipo === "domicilio" ? " (sin domicilio)" : ""),
      order.notas ? "Notas: " + order.notas : "",
      "Seguimiento: " + trackUrl(order.id)
    ];
    return sections.filter(Boolean).join("\n\n");
  };

  async function sendOrder(event) {
    event.preventDefault();
    const result = totals();
    const delivery = $("delivery").value === "domicilio";
    const name = clean($("name").value, 60), phone = clean($("phone").value, 18);
    const address = clean($("address").value, 140), reference = clean($("reference").value, 140);
    const notes = clean($("notes").value, 300), method = $("payment").value, cash = +$("cash").value || 0;
    const errors = [];
    if (!cart.length) errors.push("Agrega al menos un producto.");
    if (!openNow()) errors.push(menu.closedMessage || "La tienda está cerrada ahora.");
    if (!name) errors.push("Escribe tu nombre.");
    if (phone.replace(/\D/g, "").length < 10) errors.push("Escribe un celular válido de 10 dígitos.");
    if (delivery && !address) errors.push("Escribe la dirección y el barrio.");
    if (cart.some(item => item.adulto) && !$("age").checked) errors.push("Confirma que eres mayor de 18 años.");
    if (method === "Efectivo" && cash < result.total) errors.push("Escribe con cuánto pagas. Debe ser igual o mayor al total.");
    if (errors.length) { $("checkoutError").textContent = errors.join(" "); return; }
    if (!store.ready) { $("checkoutError").textContent = "No hay conexión con la tienda. Revisa internet e inténtalo de nuevo."; return; }
    saveCustomer();
    const popup = window.open("", "_blank");
    $("send").disabled = true;
    $("send").textContent = "Guardando tu pedido…";
    const promo = dayPlan();
    const items = result.lines.map(line => ({
      n: clean(line.n || "Producto", 80), s: clean(line.s || "", 30),
      sabores: BarrioIcePricing.flavorNames(line).map(name => clean(name, 30)).slice(0, 2),
      p: line.regalo ? 0 : +line.p, q: +line.q, g: !!line.g,
      tipo: line.tipo || (line.g ? "granizado" : "bebida"), adulto: !!line.adulto,
      regalo: !!line.regalo, promo: clean(line.promo || "", 30),
      ahorroUnitario: +line.ahorroUnitario || 0
    }));
    const order = {
      items, cliente: { nombre: name, celular: phone },
      entrega: { tipo: delivery ? "domicilio" : "recoger", direccion: delivery ? address : "", referencia: delivery ? reference : "" },
      pago: method, conCuanto: method === "Efectivo" ? cash : 0, notas,
      subtotal: result.subtotal, descuento: result.discount, domicilio: 0,
      total: result.total, promo: promo.active ? promo.name : "Sin promo",
      promoBuy: promo.buy, promoReceive: promo.receive,
      estado: "Nuevo", fecha: dateKey(), creadoEn: store.time()
    };
    try {
      order.id = await store.create(order);
      local.set("last", order);
      cart = [];
      draw(); closeCart();
      const url = "https://wa.me/" + String(menu.whatsapp).replace(/\D/g, "") + "?text=" + encodeURIComponent(orderMessage(order));
      if (popup) popup.location = url; else window.open(url, "_blank");
      history.pushState({}, "", "?pedido=" + encodeURIComponent(order.id));
      showTracking(order.id);
    } catch (error) {
      console.error(error); popup?.close();
      $("checkoutError").textContent = "No se pudo guardar el pedido. Revisa tu conexión e inténtalo de nuevo.";
    } finally {
      $("send").disabled = false;
      $("send").textContent = "Enviar pedido por WhatsApp";
    }
  }
  $("checkout").onsubmit = sendOrder;

  function eligibleOrders(list) {
    const seenIds = new Set();
    return list.filter(order => {
      if (!order || !order.id || seenIds.has(order.id)) return false;
      seenIds.add(order.id);
      return order.estado !== "Cancelado";
    });
  }
  function orderDate(order) { return String(order.fecha || "").slice(0, 10); }
  function linesText(order) { return (order.items || []).map(orderLineText).join(" · "); }
  function orderWhatsapp(order, status) {
    const first = order.cliente?.nombre?.split(/\s+/)[0] || "";
    const messages = {
      Preparando: "Ya estamos preparando tu pedido",
      Listo: "Tu pedido ya está listo para recoger",
      "En camino": "Tu pedido va en camino",
      Entregado: "Tu pedido fue entregado. Gracias por comprar en Barrio Ice",
      Cancelado: "Necesitamos hablar contigo sobre la cancelación de tu pedido"
    };
    return "Hola " + first + ". " + (messages[status] || "Tenemos una actualización de tu pedido") + " #" + String(order.id).slice(-6).toUpperCase() + ". Total: " + fmt(order.total) + (order.entrega?.tipo === "domicilio" ? ". El domicilio se paga aparte." : ".") + " Gracias por elegir Barrio Ice.";
  }
  function orderContactLink(order, status = order.estado) {
    const phone = String(order.cliente?.celular || "").replace(/\D/g, "");
    return "https://wa.me/" + phone + "?text=" + encodeURIComponent(orderWhatsapp(order, status));
  }
  function setOrderStatus(id, status) {
    if (store?.ready) return store.update(id, { estado: status, actualizadoEn: store.time() });
  }
  function printOrder(id) {
    const order = orders.find(item => item.id === id);
    if (!order) return;
    const popup = window.open("", "_blank", "width=380,height=640");
    if (!popup) return;
    const rows = (order.items || []).map(item => '<div class="line"><span>' + esc(orderLineText(item)) + '</span></div>').join("");
    popup.document.write('<!doctype html><html lang="es"><meta charset="utf-8"><title>Comanda ' + esc(id) + '</title><style>@page{size:58mm auto;margin:3mm}body{width:52mm;font:12px/1.35 Arial,sans-serif;color:#111}h1,h2,p{margin:4px 0;text-align:center}.line{padding:5px 0;border-bottom:1px dashed #aaa}.sum{padding:8px 0;border-top:1px solid #222;font-weight:bold}button{width:100%;min-height:40px;margin-top:10px}@media print{button{display:none}}</style><h1>BARRIO ICE</h1><h2>Comanda</h2><p>#' + esc(String(id).slice(-6).toUpperCase()) + '</p><p>' + esc(order.cliente?.nombre || "") + ' · ' + esc(orderDate(order)) + '</p>' + rows + '<div class="sum">Total: ' + esc(fmt(order.total)) + '<br>Domicilio: se paga aparte</div><p>Entrega: ' + esc(order.entrega?.tipo || "recoger") + '</p><button onclick="print()">Imprimir</button></html>');
    popup.document.close();
  }

  const yesterday = () => {
    const date = now(); date.setDate(date.getDate() - 1);
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  };
  function setOrdersPeriod(period) {
    adminState.period = period;
    if (period === "today") adminState.from = adminState.to = dateKey();
    if (period === "yesterday") adminState.from = adminState.to = yesterday();
    if (period === "week") {
      const start = now(); start.setDate(start.getDate() - 6);
      adminState.from = start.getFullYear() + "-" + String(start.getMonth() + 1).padStart(2, "0") + "-" + String(start.getDate()).padStart(2, "0");
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
      const haystack = [order.cliente?.nombre, order.cliente?.celular, order.id].join(" ").toLowerCase();
      if (!haystack.includes(value)) return false;
    }
    return true;
  }
  function ordersView() {
    const list = [...orders].filter(orderMatches).sort((a, b) => String(b.creadoEn || "").localeCompare(String(a.creadoEn || "")));
    const filterValue = value => esc(value || "");
    $("adminView").innerHTML = '<article class="card"><h2>Pedidos</h2><p>Busca, filtra por periodo y actualiza el estado.</p><div class="quick-periods">' +
      [["today", "Hoy"], ["yesterday", "Ayer"], ["week", "Últimos 7 días"], ["all", "Todos"]].map(([period, label]) => '<button class="' + (adminState.period === period ? "active" : "") + '" data-order-period="' + period + '">' + label + '</button>').join("") +
      '</div><div class="filter-grid"><input id="orderFrom" type="date" aria-label="Desde" value="' + filterValue(adminState.from) + '"><input id="orderTo" type="date" aria-label="Hasta" value="' + filterValue(adminState.to) + '"><select id="orderState"><option value="">Todos los estados</option>' + orderStates.map(state => '<option ' + (adminState.status === state ? "selected" : "") + '>' + esc(state) + '</option>').join("") + '</select><input id="orderSearch" type="search" placeholder="Nombre o celular" value="' + filterValue(adminState.search) + '"></div><div class="toolbar"><strong>' + list.length + ' pedido' + (list.length === 1 ? "" : "s") + '</strong><button class="secondary" id="sound">Activar sonido</button><button class="primary" id="xlsx">Exportar Excel (.xlsx)</button></div><div class="orders">' + (list.length ? list.map(order => {
        const options = orderStates.map(state => '<option ' + (order.estado === state ? "selected" : "") + '>' + esc(state) + '</option>').join("");
        return '<article class="order"><div class="order-top"><div><h3>' + esc(order.cliente?.nombre || "Cliente") + (order.estado === "Nuevo" ? ' <span class="new">NUEVO</span>' : "") + '</h3><p>' + esc(orderTime(order.creadoEn)) + ' · ' + esc(order.entrega?.tipo || "recoger") + ' · ' + esc(order.pago || "") + '</p><p class="order-line">' + esc(linesText(order)) + '</p><p>Domicilio: se paga aparte.</p><b>' + fmt(order.total) + '</b></div><select data-status="' + esc(order.id) + '" aria-label="Cambiar estado">' + options + '</select></div><div class="admin-actions"><a class="secondary" href="' + esc(orderContactLink(order)) + '" target="_blank" rel="noopener">Responder por WhatsApp</a><button class="secondary" data-print="' + esc(order.id) + '">Imprimir comanda</button></div></article>';
      }).join("") : '<p class="notice">No hay pedidos con estos filtros.</p>') + '</div></article>';
    $("orderFrom").onchange = event => { adminState.from = event.target.value; adminState.period = "custom"; ordersView(); };
    $("orderTo").onchange = event => { adminState.to = event.target.value; adminState.period = "custom"; ordersView(); };
    $("orderState").onchange = event => { adminState.status = event.target.value; ordersView(); };
    $("orderSearch").oninput = event => { adminState.search = clean(event.target.value, 80); const start = event.target.selectionStart; ordersView(); const next = $("orderSearch"); next.focus(); next.setSelectionRange(start, start); };
    $("sound").onclick = activateSound;
    $("xlsx").onclick = exportExcel;
  }

  function hourOf(order) {
    const value = order.creadoEn?.toDate ? order.creadoEn.toDate() : new Date(order.creadoEn || order.fecha + "T12:00:00");
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return 0;
    return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "2-digit", hourCycle: "h23" }).format(value));
  }
  function aggregate(list) {
    const valid = eligibleOrders(list), summary = {
      total: valid.reduce((sum, order) => sum + (+order.total || 0), 0),
      discount: valid.reduce((sum, order) => sum + (+order.descuento || 0), 0),
      n: valid.length, dom: 0, pickup: 0, cash: 0, flavors: {}, gifts: {}, sizes: {}, pay: {}, weekdays: {}, hours: {}, paidGranizados: 0, freeGranizados: 0
    };
    summary.avg = summary.n ? summary.total / summary.n : 0;
    valid.forEach(order => {
      if (order.entrega?.tipo === "domicilio") summary.dom += 1; else summary.pickup += 1;
      summary.pay[order.pago || "Sin método"] = (summary.pay[order.pago || "Sin método"] || 0) + (+order.total || 0);
      if (order.pago === "Efectivo") summary.cash += (+order.total || 0);
      const weekday = dayNames[new Date((order.fecha || dateKey()) + "T12:00:00").getDay()];
      summary.weekdays[weekday] = (summary.weekdays[weekday] || 0) + (+order.total || 0);
      const hour = hourOf(order);
      summary.hours[hour + ":00"] = (summary.hours[hour + ":00"] || 0) + 1;
      (order.items || []).forEach(item => {
        const isGranizado = item.g === true || item.tipo === "granizado" || /granizado/i.test(item.n || "");
        if (!isGranizado) return;
        const names = BarrioIcePricing.flavorNames(item);
        if (item.regalo) summary.freeGranizados += +item.q || 0;
        else summary.paidGranizados += +item.q || 0;
        names.forEach(name => {
          const bucket = item.regalo ? summary.gifts : summary.flavors;
          bucket[name] = (bucket[name] || 0) + (+item.q || 0) / Math.max(1, names.length);
        });
        if (item.s) summary.sizes[item.s] = (summary.sizes[item.s] || 0) + (+item.q || 0);
      });
    });
    return summary;
  }
  function barRows(data, money = false) {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return '<p class="notice">Todavía no hay datos para mostrar.</p>';
    const max = Math.max(1, ...entries.map(([, value]) => value));
    return '<div>' + entries.map(([name, value]) => '<div class="bar"><span>' + esc(name) + '</span><i style="width:' + Math.max(3, value / max * 100) + '%"></i><b>' + (money ? fmt(value) : value) + '</b></div>').join("") + '</div>';
  }
  function periodDates(period) {
    const end = now(), start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    if (period === "yesterday") { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
    else if (period === "week") start.setDate(start.getDate() - 6);
    else if (period === "month") start.setDate(1);
    else if (period === "custom") {
      const from = adminState.from || dateKey(), to = adminState.to || dateKey();
      const length = Math.max(1, Math.round((new Date(to + "T12:00:00") - new Date(from + "T12:00:00")) / 86400000) + 1);
      const previousEnd = new Date(from + "T12:00:00"); previousEnd.setDate(previousEnd.getDate() - 1);
      const previousStart = new Date(previousEnd); previousStart.setDate(previousStart.getDate() - length + 1);
      const key = date => date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
      return { from, to, previousFrom: key(previousStart), previousTo: key(previousEnd) };
    }
    const from = start.getFullYear() + "-" + String(start.getMonth() + 1).padStart(2, "0") + "-" + String(start.getDate()).padStart(2, "0");
    const to = end.getFullYear() + "-" + String(end.getMonth() + 1).padStart(2, "0") + "-" + String(end.getDate()).padStart(2, "0");
    const length = Math.max(1, Math.round((new Date(to + "T12:00:00") - new Date(from + "T12:00:00")) / 86400000) + 1);
    const previousEnd = new Date(start); previousEnd.setDate(previousEnd.getDate() - 1);
    const previousStart = new Date(previousEnd); previousStart.setDate(previousStart.getDate() - length + 1);
    const key = date => date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
    return { from, to, previousFrom: key(previousStart), previousTo: key(previousEnd) };
  }
  function between(order, from, to) { const value = orderDate(order); return (!from || value >= from) && (!to || value <= to); }
  function statsView() {
    const dates = periodDates(adminState.statsPeriod);
    const current = aggregate(orders.filter(order => between(order, dates.from, dates.to)));
    const previous = aggregate(orders.filter(order => dates.previousFrom && between(order, dates.previousFrom, dates.previousTo)));
    const periodButtons = [["today", "Hoy"], ["week", "Últimos 7 días"], ["month", "Mes"], ["custom", "Rango"]];
    const comparison = current.total - previous.total;
    $("adminView").innerHTML = '<article class="card"><h2>Ventas y cierre</h2><div class="quick-periods">' + periodButtons.map(([key, label]) => '<button class="' + (adminState.statsPeriod === key ? "active" : "") + '" data-stats-period="' + key + '">' + label + '</button>').join("") + '</div><div class="filter-grid"><input id="statsFrom" type="date" value="' + esc(dates.from) + '"><input id="statsTo" type="date" value="' + esc(dates.to) + '"></div><div class="metrics"><div class="metric"><b>' + fmt(current.total) + '</b><span>VENTAS · ' + current.n + ' PEDIDOS</span></div><div class="metric"><b>' + fmt(current.avg) + '</b><span>TICKET PROMEDIO</span></div><div class="metric"><b>' + fmt(current.discount) + '</b><span>AHORRO POR PROMOS</span></div><div class="metric"><b>' + fmt(current.cash) + '</b><span>EFECTIVO ESPERADO EN CAJA</span></div><div class="metric"><b>' + current.paidGranizados + '</b><span>GRANIZADOS PAGADOS</span></div><div class="metric"><b>' + current.freeGranizados + '</b><span>GRANIZADOS DE REGALO</span></div><div class="metric"><b>' + current.dom + '</b><span>PEDIDOS A DOMICILIO</span></div><div class="metric"><b>' + current.pickup + '</b><span>PEDIDOS PARA RECOGER</span></div></div><p class="notice">Comparado con el periodo anterior: ' + (comparison >= 0 ? "+" : "−") + fmt(Math.abs(comparison)) + ' en ventas. El cálculo usa pedidos únicos, excluye cancelados y toma las fechas de Colombia.</p></article><div class="chart-grid"><article class="card"><h3>Granizados pagados por sabor</h3>' + barRows(current.flavors) + '<h3 style="margin-top:16px">Granizados de regalo por sabor</h3>' + barRows(current.gifts) + '</article><article class="card"><h3>Granizados por tamaño</h3>' + barRows(current.sizes) + '<h3 style="margin-top:16px">Ventas por método de pago</h3>' + barRows(current.pay, true) + '</article><article class="card"><h3>Ventas por día de semana</h3>' + barRows(current.weekdays, true) + '</article><article class="card"><h3>Pedidos por hora</h3>' + barRows(current.hours) + '</article></div>';
    $("statsFrom").onchange = event => { adminState.from = event.target.value; adminState.statsPeriod = "custom"; statsView(); };
    $("statsTo").onchange = event => { adminState.to = event.target.value; adminState.statsPeriod = "custom"; statsView(); };
  }

  function saveNotice(node, text, ok) {
    if (!node) return;
    node.textContent = text;
    node.className = ok ? "saved" : "error";
  }
  function syncCatalogFromControls() {
    document.querySelectorAll("[data-cat-name]").forEach(input => {
      const index = +input.dataset.catName, item = menu.cat[index], old = item?.n, name = clean(input.value, 30);
      if (!item) return;
      if (old && name && old !== name) Object.keys(menu.dias || {}).forEach(day => { menu.dias[day] = (menu.dias[day] || []).map(value => value === old ? name : value); });
      item.n = name || old;
    });
    document.querySelectorAll("[data-cat-color]").forEach(input => { const item = menu.cat[+input.dataset.catColor]; if (item) item.c = safeColor(input.value); });
    document.querySelectorAll("[data-cat-adult]").forEach(input => { const item = menu.cat[+input.dataset.catAdult]; if (item) item.l = item.adulto = input.checked; });
    document.querySelectorAll("[data-cat-active]").forEach(input => { const item = menu.cat[+input.dataset.catActive]; if (item) item.active = input.checked; });
  }
  async function saveMenu(noteId) {
    syncCatalogFromControls();
    try {
      await store.save(menu);
      if ($("welcome")) { $("welcome").textContent = "Cambios guardados correctamente."; $("welcome").className = "notice"; }
      render(); adminRender();
      saveNotice($(noteId), "Guardado correctamente.", true);
    } catch (error) {
      console.error(error);
      if ($("welcome")) { $("welcome").textContent = "No se pudo guardar. Revisa la conexión e inténtalo de nuevo."; $("welcome").className = "notice error"; }
      saveNotice($(noteId), "No se pudo guardar. Revisa la conexión e inténtalo de nuevo.", false);
    }
  }
  function menuView() {
    const flavors = menu.cat || [], chosen = menu.dias?.[selectedDay] || [];
    const catalog = flavors.map((item, index) => '<div class="editable-row" data-flavor-row="' + index + '"><div class="field"><label>Nombre</label><input data-cat-name="' + index + '" maxlength="30" value="' + esc(item.n) + '"></div><div class="field"><label>Color</label><input data-cat-color="' + index + '" type="color" value="' + esc(safeColor(item.c)) + '"></div><label class="check"><input data-cat-adult="' + index + '" type="checkbox" ' + (item.l || item.adulto ? "checked" : "") + '> +18</label><label class="check"><input data-cat-active="' + index + '" type="checkbox" ' + (item.active !== false ? "checked" : "") + '> Activo</label><button class="secondary" data-delete-flavor="' + index + '">Eliminar</button></div>').join("");
    const selectedHours = [1, 2, 3, 4, 5, 6, 0].map(day => {
      const hours = menu.horario?.[day] || menu.horario?.[dayNames[day]] || menu.horario || {};
      return '<div class="editable-row"><strong>' + days[day] + '</strong><div class="field"><label>Abre</label><input type="time" data-hours-open="' + day + '" value="' + esc(hours.abre || hours.open || "11:00") + '"></div><div class="field"><label>Cierra</label><input type="time" data-hours-close="' + day + '" value="' + esc(hours.cierra || hours.close || "22:00") + '"></div></div>';
    }).join("");
    const prices = ["semana", "jueves", "finde"].map((key, section) => '<div><h3>' + ["Lunes a miércoles", "Jueves", "Viernes a domingo"][section] + '</h3><div class="row">' + sizes.map((size, index) => '<div class="field"><label>' + size + '</label><input type="number" min="0" step="500" data-price-group="' + key + '" data-price-index="' + index + '" value="' + (+menu.precios[key][index] || 0) + '"></div>').join("") + '</div></div>').join("");
    const drinks = (menu.bebidas || []).map((item, index) => '<div class="editable-row"><div class="field"><label>Bebida</label><input data-drink-name="' + index + '" value="' + esc(item.n) + '"></div><div class="field"><label>Precio</label><input type="number" min="0" data-drink-price="' + index + '" value="' + (+item.p || 0) + '"></div><label class="check"><input type="checkbox" data-drink-active="' + index + '" ' + (item.active !== false ? "checked" : "") + '> Activa</label><button class="secondary" data-delete-drink="' + index + '">Eliminar</button></div>').join("");
    const combos = (menu.combos || []).map((item, index) => '<div class="editable-row"><div class="field"><label>Combo</label><input data-combo-name="' + index + '" value="' + esc(item.n) + '"></div><div class="field"><label>Descripción</label><input data-combo-description="' + index + '" value="' + esc(item.d || "") + '"></div><div class="field"><label>Precio</label><input type="number" min="0" data-combo-price="' + index + '" value="' + (+item.p || 0) + '"></div><label class="check"><input type="checkbox" data-combo-active="' + index + '" ' + (item.active !== false ? "checked" : "") + '> Activo</label><button class="secondary" data-delete-combo="' + index + '">Eliminar</button></div>').join("");
    $("adminView").innerHTML = '<div class="admin-grid"><article class="card"><h2>Catálogo de sabores</h2><p>Edita nombre, color, edad mínima y disponibilidad.</p><div class="table-like">' + catalog + '</div><div class="row"><div class="field"><label for="newFlavorName">Nuevo sabor</label><input id="newFlavorName" maxlength="30"></div><div class="field"><label for="newFlavorColor">Color</label><input id="newFlavorColor" type="color" value="#5bc0eb"></div><label class="check"><input id="newFlavorAdult" type="checkbox"> +18</label><button class="secondary" id="addFlavorV4">Agregar</button></div></article><article class="card"><h2>Sabores por día</h2><div class="daypick">' + [1, 2, 3, 4, 5, 6, 0].map(day => '<button type="button" data-v4-day="' + day + '" class="' + (day === selectedDay ? "active" : "") + '">' + days[day].slice(0, 3) + '</button>').join("") + '</div><div class="chips">' + flavors.filter(item => item.active !== false).map(item => '<button class="choice ' + (chosen.includes(item.n) ? "active" : "") + '" data-v4-flavor="' + esc(item.n) + '">' + esc(item.n) + '</button>').join("") + '</div><div class="row"><div class="field"><label for="copyFromDay">Copiar desde otro día</label><select id="copyFromDay">' + [1, 2, 3, 4, 5, 6, 0].filter(day => day !== selectedDay).map(day => '<option value="' + day + '">' + days[day] + '</option>').join("") + '</select></div><button class="secondary" id="copyDay">Copiar</button><button class="secondary" id="repeatYesterday">Repetir ayer</button></div><div class="save"><button class="primary" id="saveDayMenu">Guardar sabores</button><span class="saved" id="menuSaved"></span></div></article><article class="card"><h2>Precios</h2>' + prices + '<h2 style="margin-top:15px">Promociones</h2>' + ["lunes", "martes", "miercoles", "jueves"].map((day, index) => '<label class="switch"><span>' + ["Lunes 2x1", "Martes 2x1", "Miércoles 2x1", "Jueves 3x2"][index] + '</span><input type="checkbox" data-promo-day="' + day + '" ' + (menu.promos[day] !== false ? "checked" : "") + '></label>').join("") + '<label class="switch"><span>Permitir mitad y mitad</span><input id="halfEnabled" type="checkbox" ' + (menu.mitadMitad ? "checked" : "") + '></label><div class="save"><button class="primary" id="savePrices">Guardar precios y promos</button><span id="priceSaved" class="saved"></span></div></article><article class="card"><h2>Bebidas</h2><div class="table-like">' + drinks + '</div><div class="row"><div class="field"><label for="newDrinkName">Nueva bebida</label><input id="newDrinkName"></div><div class="field"><label for="newDrinkPrice">Precio</label><input id="newDrinkPrice" type="number" min="0"></div><button class="secondary" id="addDrinkV4">Agregar bebida</button></div><h2 style="margin-top:22px">Combos</h2><div class="table-like">' + combos + '</div><div class="form-grid"><div class="field"><label for="newComboName">Nombre del combo</label><input id="newComboName"></div><div class="field"><label for="newComboDescription">Descripción</label><input id="newComboDescription"></div><div class="field"><label for="newComboPrice">Precio</label><input id="newComboPrice" type="number" min="0"></div></div><button class="secondary" id="addComboV4">Agregar combo</button></article></div>';
    const catalogCard = [...document.querySelectorAll("#adminView .card")].find(card => card.querySelector("#newFlavorName"));
    if (catalogCard && !catalogCard.querySelector("#saveCatalogV4")) catalogCard.insertAdjacentHTML("beforeend", '<div class="save"><button class="primary" id="saveCatalogV4">Guardar catálogo</button><span id="catalogSaved" class="saved"></span></div>');
    $("saveCatalogV4").onclick = () => saveMenu("catalogSaved");
    $("saveDayMenu").onclick = () => saveMenu("menuSaved");
    $("savePrices").onclick = () => {
      document.querySelectorAll("[data-cat-name]").forEach(input => { const index = +input.dataset.catName; const old = menu.cat[index]?.n; const name = clean(input.value, 30); if (old && name && old !== name) { Object.keys(menu.dias).forEach(day => { menu.dias[day] = (menu.dias[day] || []).map(value => value === old ? name : value); }); } if (menu.cat[index]) menu.cat[index].n = name || old; });
      document.querySelectorAll("[data-cat-color]").forEach(input => { if (menu.cat[+input.dataset.catColor]) menu.cat[+input.dataset.catColor].c = safeColor(input.value); });
      document.querySelectorAll("[data-cat-adult]").forEach(input => { const item = menu.cat[+input.dataset.catAdult]; if (item) { item.l = input.checked; item.adulto = input.checked; } });
      document.querySelectorAll("[data-cat-active]").forEach(input => { const item = menu.cat[+input.dataset.catActive]; if (item) item.active = input.checked; });
      ["semana", "jueves", "finde"].forEach(key => { menu.precios[key] = [0, 1, 2].map(index => Math.max(0, +document.querySelector('[data-price-group="' + key + '"][data-price-index="' + index + '"]')?.value || 0)); });
      document.querySelectorAll("[data-promo-day]").forEach(input => { menu.promos[input.dataset.promoDay] = input.checked; });
      menu.mitadMitad = $("halfEnabled").checked;
      document.querySelectorAll("[data-drink-name]").forEach(input => { const item = menu.bebidas[+input.dataset.drinkName]; if (item) item.n = clean(input.value, 40); });
      document.querySelectorAll("[data-drink-price]").forEach(input => { const item = menu.bebidas[+input.dataset.drinkPrice]; if (item) item.p = Math.max(0, +input.value || 0); });
      document.querySelectorAll("[data-drink-active]").forEach(input => { const item = menu.bebidas[+input.dataset.drinkActive]; if (item) item.active = input.checked; });
      document.querySelectorAll("[data-combo-name]").forEach(input => { const item = menu.combos[+input.dataset.comboName]; if (item) item.n = clean(input.value, 50); });
      document.querySelectorAll("[data-combo-description]").forEach(input => { const item = menu.combos[+input.dataset.comboDescription]; if (item) item.d = clean(input.value, 120); });
      document.querySelectorAll("[data-combo-price]").forEach(input => { const item = menu.combos[+input.dataset.comboPrice]; if (item) item.p = Math.max(0, +input.value || 0); });
      document.querySelectorAll("[data-combo-active]").forEach(input => { const item = menu.combos[+input.dataset.comboActive]; if (item) item.active = input.checked; });
      return saveMenu("priceSaved");
    };
  }

  function settingsView() {
    const schedule = [1, 2, 3, 4, 5, 6, 0].map(day => {
      const hours = menu.horario?.[day] || menu.horario?.[dayNames[day]] || menu.horario || {};
      return '<div class="editable-row"><strong>' + days[day] + '</strong><div class="field"><label>Abre</label><input type="time" data-hours-open="' + day + '" value="' + esc(hours.abre || hours.open || "11:00") + '"></div><div class="field"><label>Cierra</label><input type="time" data-hours-close="' + day + '" value="' + esc(hours.cierra || hours.close || "22:00") + '"></div></div>';
    }).join("");
    $("adminView").innerHTML = '<div class="admin-grid"><article class="card"><h2>Horario por día</h2><p>El cambio de horario se aplica con la hora de Colombia.</p><div class="table-like">' + schedule + '</div><label class="switch"><span>Tienda cerrada manualmente</span><input type="checkbox" id="manualClosed" ' + (menu.cerradaManual ? "checked" : "") + '></label></article><article class="card"><h2>Contacto y pagos</h2><div class="field"><label>WhatsApp</label><input id="waSetting" value="' + esc(menu.whatsapp || "") + '"></div><div class="field"><label>Nequi</label><input id="nequiSetting" value="' + esc(menu.pagos?.Nequi || "") + '"></div><div class="field"><label>Daviplata</label><input id="daviSetting" value="' + esc(menu.pagos?.Daviplata || "") + '"></div><div class="field"><label>Instagram</label><input id="instaSetting" value="' + esc(menu.instagram || "") + '"></div><div class="field"><label>Google Maps</label><input id="mapsSetting" value="' + esc(menu.maps || "") + '"></div></article><article class="card"><h2>Mensajes</h2><div class="field"><label>Banner de promoción (opcional)</label><textarea id="promoSetting" maxlength="180">' + esc(menu.promoBanner || "") + '</textarea></div><div class="field"><label>Mensaje de tienda cerrada</label><textarea id="closedSetting" maxlength="180">' + esc(menu.closedMessage || "") + '</textarea></div><div class="notice">Domicilio: se paga aparte. No se suma al total.</div><div class="save"><button class="primary" id="saveSettingsV4">Guardar ajustes</button><span id="settingsSaved" class="saved"></span></div></article></div>';
    $("saveSettingsV4").onclick = async () => {
      const hours = {};
      [0, 1, 2, 3, 4, 5, 6].forEach(day => { hours[day] = { abre: document.querySelector('[data-hours-open="' + day + '"]').value || "11:00", cierra: document.querySelector('[data-hours-close="' + day + '"]').value || "22:00" }; });
      menu.horario = hours;
      menu.cerradaManual = $("manualClosed").checked;
      menu.whatsapp = clean($("waSetting").value.replace(/[^\d+]/g, ""), 20);
      menu.pagos = Object.assign({}, menu.pagos, { Nequi: clean($("nequiSetting").value, 50), Daviplata: clean($("daviSetting").value, 50) });
      menu.instagram = clean($("instaSetting").value, 200);
      menu.maps = clean($("mapsSetting").value, 300);
      menu.promoBanner = clean($("promoSetting").value, 180);
      menu.closedMessage = clean($("closedSetting").value, 180);
      await saveMenu("settingsSaved");
    };
  }

  function todayView() {
    const day = now().getDay(), names = menu.dias?.[day] || [];
    const todayOrders = orders.filter(order => orderDate(order) === dateKey());
    const current = aggregate(todayOrders);
    const flavors = names.map(name => '<label class="switch"><span>' + esc(name) + (sold(name) ? ' · AGOTADO' : ' · DISPONIBLE') + '</span><input type="checkbox" data-today-flavor="' + esc(name) + '" ' + (!sold(name) ? "checked" : "") + '></label>').join("");
    $("adminView").innerHTML = '<div class="admin-grid"><article class="card"><h2>Estado de la tienda</h2><p class="status ' + (openNow() ? "open" : "closed") + '">' + (openNow() ? "Abierta ahora" : "Cerrada ahora") + '</p><button class="primary send" id="storeSwitch">' + (menu.cerradaManual ? "Abrir tienda" : "Cerrar tienda") + '</button><p>' + esc(menu.closedMessage) + '</p></article><article class="card"><h2>Sabores de hoy · ' + esc(days[day]) + '</h2>' + (flavors || '<p class="notice">No hay sabores publicados hoy.</p>') + '<div class="admin-actions"><button class="secondary" id="saveTodayFlavors">Guardar disponibilidad</button><button class="secondary" id="editTodayFlavors">Cambiar sabores de hoy</button></div><span id="todaySaved" class="saved"></span></article><article class="card"><h2>Pedidos nuevos</h2>' + (todayOrders.filter(order => order.estado === "Nuevo").slice(0, 5).map(order => '<p><b>#' + esc(String(order.id).slice(-6).toUpperCase()) + ' · ' + esc(order.cliente?.nombre || "Cliente") + '</b><br>' + esc(linesText(order)) + '</p>').join("") || '<p class="notice">No hay pedidos nuevos.</p>') + '</article><article class="card"><h2>Ventas del día</h2><div class="metrics"><div class="metric"><b>' + fmt(current.total) + '</b><span>VENTAS</span></div><div class="metric"><b>' + current.n + '</b><span>PEDIDOS</span></div><div class="metric"><b>' + fmt(current.cash) + '</b><span>EFECTIVO ESPERADO</span></div></div><p class="notice">Domicilio se paga aparte.</p></article></div>';
    const statusCopy = $("storeSwitch")?.parentElement.querySelector("p:last-child");
    if (statusCopy) {
      const hours = menu.horario?.[day] || menu.horario || {};
      statusCopy.textContent = openNow() ? "Horario de hoy: " + (hours.abre || hours.open || "11:00") + " a " + (hours.cierra || hours.close || "22:00") : menu.closedMessage;
    }
    $("storeSwitch").onclick = async () => { menu.cerradaManual = !menu.cerradaManual; await saveMenu("todaySaved"); };
    $("editTodayFlavors").onclick = () => { selectedDay = day; adminState.tab = "menu"; adminRender(); };
    $("saveTodayFlavors").onclick = async () => {
      const set = new Set(menu.agotados[day] || []);
      document.querySelectorAll("[data-today-flavor]").forEach(input => input.checked ? set.delete(input.dataset.todayFlavor) : set.add(input.dataset.todayFlavor));
      menu.agotados[day] = [...set]; await saveMenu("todaySaved");
    };
  }

  adminRender = function () {
    if (!admin) return;
    document.querySelectorAll("[data-admin-tab]").forEach(button => button.classList.toggle("active", button.dataset.adminTab === adminState.tab));
    if (adminState.tab === "today") todayView();
    if (adminState.tab === "orders") ordersView();
    if (adminState.tab === "menu") menuView();
    if (adminState.tab === "stats") statsView();
    if (adminState.tab === "settings") settingsView();
  };

  async function exportExcel() {
    const button = $("xlsx");
    if (button) { button.disabled = true; button.textContent = "Preparando Excel…"; }
    try {
      if (!window.ExcelJS) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
          script.onload = resolve; script.onerror = () => reject(new Error("No se pudo cargar ExcelJS."));
          document.head.append(script);
        });
      }
      const selected = orders.filter(order => (!adminState.from || orderDate(order) >= adminState.from) && (!adminState.to || orderDate(order) <= adminState.to));
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Barrio Ice";
      workbook.created = new Date();
      const ordersSheet = workbook.addWorksheet("Pedidos", { views: [{ state: "frozen", ySplit: 1 }] });
      const detailSheet = workbook.addWorksheet("Detalle", { views: [{ state: "frozen", ySplit: 1 }] });
      const summarySheet = workbook.addWorksheet("Resumen", { views: [{ state: "frozen", ySplit: 5 }] });
      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5BC0EB" } };
      const headerFont = { bold: true, color: { argb: "FF07131D" } };
      const headers = ["N.º pedido", "Fecha", "Hora", "Cliente", "Celular", "Entrega", "Dirección", "Referencia", "Método de pago", "Estado", "Granizados pagados", "Granizados de regalo", "Subtotal", "Descuento promo", "Total", "Notas"];
      ordersSheet.addRow(headers);
      const detailHeaders = ["N.º pedido", "Fecha", "Producto", "Sabor(es)", "Tamaño", "Cantidad", "Precio unitario", "Valor", "¿Regalo?"];
      detailSheet.addRow(detailHeaders);
      const dateCell = value => { const text = String(value || ""); return text ? new Date(text + "T12:00:00") : null; };
      const timeCell = order => {
        const date = order.creadoEn?.toDate ? order.creadoEn.toDate() : order.creadoEn ? new Date(order.creadoEn) : null;
        if (!date || Number.isNaN(date.getTime())) return null;
        const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date).split(":").map(Number);
        return new Date(1899, 11, 30, parts[0], parts[1]);
      };
      selected.forEach(order => {
        const lines = order.items || [];
        const granizados = lines.filter(item => item.g || item.tipo === "granizado" || /granizado/i.test(item.n || ""));
        const paid = granizados.filter(item => !item.regalo).reduce((sum, item) => sum + (+item.q || 0), 0);
        const gifts = granizados.filter(item => item.regalo).reduce((sum, item) => sum + (+item.q || 0), 0);
        ordersSheet.addRow([
          safeExcelText(String(order.id || "").slice(-6).toUpperCase()), dateCell(order.fecha), timeCell(order),
          safeExcelText(order.cliente?.nombre), safeExcelText(order.cliente?.celular), order.entrega?.tipo === "domicilio" ? "Domicilio" : "Recoger",
          safeExcelText(order.entrega?.direccion), safeExcelText(order.entrega?.referencia), safeExcelText(order.pago), safeExcelText(order.estado), paid, gifts,
          +order.subtotal || 0, +order.descuento || 0, +order.total || 0, safeExcelText(order.notas)
        ]);
        lines.forEach(item => detailSheet.addRow([
          safeExcelText(String(order.id || "").slice(-6).toUpperCase()), dateCell(order.fecha), safeExcelText(item.n || "Producto"),
          safeExcelText(BarrioIcePricing.flavorNames(item).join(" / ")), safeExcelText(item.s || ""), +item.q || 0,
          +item.p || 0, (+item.p || 0) * (+item.q || 0), item.regalo ? "Sí" : "No"
        ]));
      });
      summarySheet.addRows([["Resumen del periodo"], ["Desde", adminState.from || "Todos"], ["Hasta", adminState.to || "Hoy"], ["Pedidos", "=COUNTA(Pedidos!A2:A" + (selected.length + 1) + ")"], ["Ventas totales", "=SUM(Pedidos!O2:O" + (selected.length + 1) + ")"], ["Descuento por promos", "=SUM(Pedidos!N2:N" + (selected.length + 1) + ")"], [], ["Ventas por día", "Total"], ["Fecha", "Ventas"]]);
      const dates = [...new Set(selected.map(order => orderDate(order)))].sort();
      dates.forEach((date, index) => { const row = 10 + index; summarySheet.addRow([dateCell(date), "=SUMIF(Pedidos!B:B,A" + row + ",Pedidos!O:O)"]); });
      const paymentStart = summarySheet.rowCount + 2;
      summarySheet.addRow(["Ventas por método de pago", "Total"]);
      [...new Set(selected.map(order => order.pago || "Sin método"))].forEach((method, index) => { const row = paymentStart + 1 + index; summarySheet.addRow([safeExcelText(method), "=SUMIF(Pedidos!I:I,A" + row + ",Pedidos!O:O)"]); });
      const flavorStart = summarySheet.rowCount + 2;
      summarySheet.addRow(["Ventas por sabor", "Valor"]);
      const flavorNames = [...new Set(selected.flatMap(order => (order.items || []).flatMap(item => BarrioIcePricing.flavorNames(item))))];
      flavorNames.forEach((name, index) => { const row = flavorStart + 1 + index; summarySheet.addRow([safeExcelText(name), "=SUMIF(Detalle!D:D,A" + row + ",Detalle!H:H)"]); });
      const sizeStart = summarySheet.rowCount + 2;
      summarySheet.addRow(["Ventas por tamaño", "Valor"]);
      sizes.forEach((name, index) => { const row = sizeStart + 1 + index; summarySheet.addRow([name, "=SUMIF(Detalle!E:E,A" + row + ",Detalle!H:H)"]); });
      [ordersSheet, detailSheet, summarySheet].forEach(sheet => {
        sheet.getRow(1).eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; });
        sheet.autoFilter = { from: "A1", to: sheet.getRow(1).getCell(sheet.getRow(1).cellCount).address };
        sheet.columns.forEach(column => { let max = 10; column.eachCell?.({ includeEmpty: false }, cell => { max = Math.max(max, String(cell.value ?? "").length); }); column.width = Math.min(34, Math.max(12, max + 2)); });
      });
      ["M", "N", "O"].forEach(letter => { ordersSheet.getColumn(letter).numFmt = '"$"#,##0'; });
      ["G", "H"].forEach(letter => { detailSheet.getColumn(letter).numFmt = '"$"#,##0'; });
      ordersSheet.getColumn("B").numFmt = "dd/mm/yyyy"; ordersSheet.getColumn("C").numFmt = "h:mm AM/PM"; detailSheet.getColumn("B").numFmt = "dd/mm/yyyy";
      summarySheet.getColumn(1).width = 32; summarySheet.getColumn(2).width = 20;
      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "barrio-ice-pedidos-" + dateKey() + ".xlsx"; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
    } catch (error) {
      console.error(error); alert("No se pudo generar el Excel. Revisa tu conexión e inténtalo de nuevo.");
    } finally { if (button) { button.disabled = false; button.textContent = "Exportar Excel (.xlsx)"; } }
  }

  function adminClick(event) {
    const target = event.target.closest("button, select, input");
    if (!target) return;
    if (target.matches("[data-admin-tab]")) { adminState.tab = target.dataset.adminTab; if (adminState.tab === "orders" && $("newBadge")) $("newBadge").textContent = ""; adminRender(); return; }
    if (target.matches("[data-order-period]")) { setOrdersPeriod(target.dataset.orderPeriod); return; }
    if (target.matches("[data-stats-period]")) { adminState.statsPeriod = target.dataset.statsPeriod; if (adminState.statsPeriod !== "custom") statsView(); return; }
    if (target.matches("[data-print]")) { printOrder(target.dataset.print); return; }
    if (target.matches("[data-gift-same]")) { const item = cart.find(line => line.k === target.dataset.giftSame); if (item) { item.giftFlavor = BarrioIcePricing.flavorNames(item)[0]; draw(); } return; }
    if (target.matches("[data-delete-flavor]")) {
      const index = +target.dataset.deleteFlavor, item = menu.cat[index];
      if (item && confirm('¿Eliminar el sabor "' + item.n + '"? También se quitará de los días publicados.')) {
        menu.cat.splice(index, 1); Object.keys(menu.dias || {}).forEach(day => { menu.dias[day] = (menu.dias[day] || []).filter(name => name !== item.n); }); menuView();
      }
      return;
    }
    if (target.matches("[data-delete-drink]")) { const index = +target.dataset.deleteDrink; if (confirm("¿Eliminar esta bebida del menú?")) { menu.bebidas.splice(index, 1); menuView(); } return; }
    if (target.matches("[data-delete-combo]")) { const index = +target.dataset.deleteCombo; if (confirm("¿Eliminar este combo?")) { menu.combos.splice(index, 1); menuView(); } return; }
    if (target.matches("[data-v4-day]")) { selectedDay = +target.dataset.v4Day; menuView(); return; }
    if (target.matches("[data-v4-flavor]")) {
      const name = target.dataset.v4Flavor, list = menu.dias[selectedDay] || [];
      menu.dias[selectedDay] = list.includes(name) ? list.filter(value => value !== name) : list.concat(name);
      menuView(); return;
    }
    if (target.id === "addFlavorV4") {
      const name = clean($("newFlavorName").value, 30);
      const adult = $("newFlavorAdult").checked;
      if (name && !menu.cat.some(item => item.n.toLowerCase() === name.toLowerCase())) menu.cat.push({ n: name, c: safeColor($("newFlavorColor").value), l: adult, adulto: adult, active: true });
      menuView(); return;
    }
    if (target.id === "copyDay") { const from = +$("copyFromDay").value; menu.dias[selectedDay] = [...(menu.dias[from] || [])]; menuView(); return; }
    if (target.id === "repeatYesterday") { const from = (selectedDay + 6) % 7; menu.dias[selectedDay] = [...(menu.dias[from] || [])]; menuView(); return; }
    if (target.id === "addDrinkV4") {
      const name = clean($("newDrinkName").value, 40), price = Math.max(0, +$("newDrinkPrice").value || 0);
      if (name) menu.bebidas.push({ n: name, p: price, icon: "Vaso", active: true });
      menuView(); return;
    }
    if (target.id === "addComboV4") {
      const name = clean($("newComboName").value, 50), description = clean($("newComboDescription").value, 120), price = Math.max(0, +$("newComboPrice").value || 0);
      if (name) menu.combos.push({ n: name, d: description, p: price, items: [], active: true });
      menuView(); return;
    }
    if (target.matches("[data-half-launch]")) {
      ensureHalfOptions(target.dataset.halfLaunch);
      if ($("halfDialog").showModal) $("halfDialog").showModal();
      else alert("La opción mitad y mitad necesita un navegador actualizado.");
      return;
    }
  }

  document.addEventListener("click", adminClick);
  document.addEventListener("change", event => {
    const target = event.target;
    if (target.matches("[data-gift-flavor]")) { const item = cart.find(line => line.k === target.dataset.giftFlavor); if (item) { item.giftFlavor = target.value; draw(); } }
    if (target.matches("[data-status]")) setOrderStatus(target.dataset.status, target.value);
    if (target.id === "payment" || target.id === "delivery") { updateCashChange(); }
  });
  document.addEventListener("input", event => { if (event.target.id === "cash") updateCashChange(); });
  $("halfCancel").onclick = () => $("halfDialog").close();
  $("halfSize").onchange = () => { $("halfPrice").textContent = "Precio del vaso: " + fmt(dayPlan().prices[+$("halfSize").value]); };
  $("halfForm").onsubmit = event => {
    event.preventDefault();
    const first = $("halfFirst").value, second = $("halfSecond").value, index = +$("halfSize").value;
    if (!first || !second || first === second) { alert("Escoge dos sabores diferentes."); return; }
    const p = dayPlan(), key = [first, second].sort().join("/") + ":" + index;
    const adult = [flavor(first), flavor(second)].some(item => item?.l || item?.adulto);
    add({ k: "h:" + key, n: "Granizado mitad y mitad", s: sizes[index], sabores: [first, second], p: +p.prices[index], q: 1, g: true, tipo: "granizado", adulto: adult, giftFlavor: first }, null);
    $("halfDialog").close();
  };

  const oldTracking = showTracking;
  showTracking = function (id) {
    $("storefront").classList.add("hide"); $("tracking").classList.remove("hide"); $("fab").classList.add("hide"); $("floatWa").classList.add("hide");
    if (!store.ready) { $("trackingCopy").textContent = "No pudimos conectarnos al seguimiento. Conserva tu WhatsApp para novedades."; return; }
    store.watch(id, order => {
      if (!order) { $("trackingCopy").textContent = "No encontramos ese pedido."; return; }
      const state = order.estado || "Nuevo";
      $("trackingCopy").textContent = state === "Cancelado" ? "Este pedido fue cancelado. Escríbenos para ayudarte." : state === "Entregado" ? "¡Pedido entregado! Gracias por ser parte del barrio." : "Pedido #" + id.slice(-6).toUpperCase() + " · " + state;
      $("steps").innerHTML = ["Nuevo", "Preparando", "Listo", "En camino", "Entregado"].map((value, index) => '<div class="step ' + (orderStates.indexOf(state) >= index && state !== "Cancelado" ? "active" : "") + '"><i>' + (orderStates.indexOf(state) >= index && state !== "Cancelado" ? "✓" : index + 1) + '</i><span>' + esc(value) + '</span></div>').join("");
      $("trackingMeta").textContent = order.cliente?.nombre ? "A nombre de " + clean(order.cliente.nombre, 60) + ". Domicilio se paga aparte." : "";
    }, () => { $("trackingCopy").textContent = "No pudimos actualizar el estado. Revisa tu conexión."; });
  };

  function reducedMotion() { return matchMedia("(prefers-reduced-motion: reduce)").matches; }
  if ("IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const target = entry.target;
        if (target.matches(".hero")) {
          target.classList.toggle("motion-paused", !entry.isIntersecting);
          return;
        }
        if (target.matches(".ticker, .skeleton-grid")) {
          target.classList.toggle("is-offscreen", !entry.isIntersecting);
          return;
        }
        if (!entry.isIntersecting) return;
        const key = target.dataset.revealKey;
        target.classList.remove("reveal-pending");
        target.classList.add("reveal-visible");
        if (key) revealedKeys.add(key);
        revealObserver.unobserve(target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  }

  function decorateRevealTargets() {
    const targets = document.querySelectorAll(".flavor, .drink, .combo, .feature, .info article, .faq details");
    targets.forEach((node, index) => {
      let key;
      if (node.matches(".flavor")) key = "flavor:" + (node.querySelector("[data-flavor]")?.dataset.flavor || index);
      else if (node.matches(".drink")) key = "drink:" + (node.querySelector("h3")?.childNodes[0]?.textContent || index).trim();
      else if (node.matches(".combo")) key = "combo:" + (node.querySelector("h3")?.textContent || index).trim();
      else if (node.matches(".feature")) key = "feature:daily";
      else if (node.matches(".faq details")) key = "faq:" + (node.querySelector("summary")?.textContent || index).trim();
      else key = "info:" + (node.querySelector("h3")?.textContent || index).trim();
      node.dataset.revealKey = key;
      if (reducedMotion() || !revealObserver || revealedKeys.has(key)) {
        node.classList.remove("reveal-pending");
        node.classList.add("reveal-visible");
        revealedKeys.add(key);
        return;
      }
      node.classList.remove("reveal-visible");
      node.classList.add("reveal-pending");
      revealObserver.observe(node);
    });
    document.querySelectorAll(".skeleton-grid").forEach(grid => revealObserver?.observe(grid));
  }

  function setupMotion() {
    const hero = document.querySelector(".hero"), ticker = document.querySelector(".ticker");
    if (hero && !reducedMotion()) hero.classList.add("hero-enter");
    hero && revealObserver?.observe(hero);
    ticker && revealObserver?.observe(ticker);
    decorateRevealTargets();

    let tickerResumeTimer = 0;
    ticker?.addEventListener("pointerdown", event => {
      if (event.pointerType !== "touch") return;
      ticker.classList.add("is-paused");
      clearTimeout(tickerResumeTimer);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(type => ticker?.addEventListener(type, () => {
      clearTimeout(tickerResumeTimer);
      tickerResumeTimer = setTimeout(() => ticker.classList.remove("is-paused"), 700);
    }));
    document.addEventListener("visibilitychange", () => document.documentElement.classList.toggle("document-hidden", document.hidden));
    const theme = $("theme");
    if (theme?.onclick) {
      const changeTheme = theme.onclick;
      theme.onclick = function (event) {
        document.documentElement.classList.add("theme-transition");
        changeTheme.call(this, event);
        clearTimeout(theme.transitionTimer);
        theme.transitionTimer = setTimeout(() => document.documentElement.classList.remove("theme-transition"), 280);
      };
    }
    $("sheet").style.setProperty("--safe-t", "env(safe-area-inset-top, 0px)");
  }

  const baseOpenCart = openCart;
  const baseCloseCart = closeCart;
  let cartOpen = false, cartReturnFocus = null, cartScrollY = 0;
  let bodyStyleBeforeCart = null, inertBeforeCart = null;
  function openCartWithFocus() {
    if (!cart.length) return baseOpenCart();
    if (cartOpen) return;
    cartReturnFocus = document.activeElement;
    cartScrollY = window.scrollY;
    bodyStyleBeforeCart = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width
    };
    inertBeforeCart = ["storefront", "tracking", "admin", "fab", "floatWa"].map(id => {
      const node = $(id);
      return node ? [node, node.inert, node.hasAttribute("inert"), node.getAttribute("aria-hidden")] : null;
    }).filter(Boolean);
    baseOpenCart();
    cartOpen = true;
    const sheet = $("sheet");
    sheet.inert = false;
    sheet.removeAttribute("inert");
    sheet.setAttribute("aria-hidden", "false");
    inertBeforeCart.forEach(([node]) => { node.inert = true; node.setAttribute("inert", ""); node.setAttribute("aria-hidden", "true"); });
    document.body.style.position = "fixed";
    document.body.style.top = -cartScrollY + "px";
    document.body.style.width = "100%";
    requestAnimationFrame(() => $("close")?.focus({ preventScroll: true }));
  }
  function closeCartWithFocus() {
    if (!cartOpen) return baseCloseCart();
    baseCloseCart();
    cartOpen = false;
    const sheet = $("sheet");
    sheet.inert = true;
    sheet.setAttribute("inert", "");
    sheet.setAttribute("aria-hidden", "true");
    inertBeforeCart?.forEach(([node, inert, hadInert, ariaHidden]) => {
      node.inert = inert;
      if (!hadInert) node.removeAttribute("inert");
      if (ariaHidden === null) node.removeAttribute("aria-hidden"); else node.setAttribute("aria-hidden", ariaHidden);
    });
    inertBeforeCart = null;
    if (bodyStyleBeforeCart) Object.assign(document.body.style, bodyStyleBeforeCart);
    bodyStyleBeforeCart = null;
    const scrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, cartScrollY);
    document.documentElement.style.scrollBehavior = scrollBehavior;
    if (cartReturnFocus?.isConnected) cartReturnFocus.focus({ preventScroll: true });
    cartReturnFocus = null;
  }
  openCart = openCartWithFocus;
  closeCart = closeCartWithFocus;
  $("cartTop").onclick = openCartWithFocus;
  $("fab").onclick = openCartWithFocus;
  $("close").onclick = closeCartWithFocus;
  $("scrim").onclick = closeCartWithFocus;
  $("sheet").inert = true;
  $("sheet").setAttribute("inert", "");
  $("sheet").setAttribute("aria-hidden", "true");
  document.addEventListener("keydown", event => {
    if (!cartOpen) return;
    if (event.key === "Escape") { event.preventDefault(); closeCartWithFocus(); return; }
    if (event.key !== "Tab") return;
    const focusable = [...$("sheet").querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
      .filter(node => !node.hidden && node.getAttribute("aria-hidden") !== "true" && node.getClientRects().length > 0);
    if (!focusable.length) { event.preventDefault(); $("sheet").focus(); return; }
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }, true);

  fly = function (source) {
    if (!source || reducedMotion()) return;
    const origin = source.closest(".flavor")?.querySelector(".cup") || source;
    const from = origin.getBoundingClientRect();
    const fab = $("fab");
    const target = fab && getComputedStyle(fab).display !== "none" && !fab.classList.contains("hide") ? fab : $("cartTop");
    const to = target.getBoundingClientRect();
    const x = from.left + from.width / 2, y = from.top + from.height / 2;
    const particle = document.createElement("i");
    particle.className = "flying";
    particle.setAttribute("aria-hidden", "true");
    particle.textContent = "🧊";
    particle.style.left = x + "px";
    particle.style.top = y + "px";
    particle.style.setProperty("--fly-x", (to.left + to.width / 2 - x) + "px");
    particle.style.setProperty("--fly-y", (to.top + to.height / 2 - y) + "px");
    document.body.append(particle);
    particle.addEventListener("animationend", () => particle.remove(), { once: true });
    setTimeout(() => particle.remove(), 700);
  };

  const regularAdminRender = adminRender;
  let adminTabIntent = false;
  document.addEventListener("click", event => {
    if (admin && event.target.closest("[data-admin-tab]")) adminTabIntent = true;
  }, true);
  adminRender = function () {
    const animateTab = adminTabIntent && !reducedMotion();
    adminTabIntent = false;
    if (!animateTab) return regularAdminRender();
    const view = $("adminView");
    view.classList.remove("admin-content-enter");
    const result = regularAdminRender();
    void view.offsetWidth;
    view.classList.add("admin-content-enter");
    clearTimeout(view.motionTimer);
    view.motionTimer = setTimeout(() => view.classList.remove("admin-content-enter"), 240);
    return result;
  };

  setupMotion();

  setInterval(showPromoBanner, 60000);
  render();
})();


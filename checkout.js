(() => {
  "use strict";

  async function sendOrder(event) {
    event.preventDefault();
    const result = totals();
    const delivery = $("delivery").value === "domicilio";
    const name = clean($("name").value, 60),
      phone = clean(
        $("phone").value.replace(/[^0-9+()\s-]/g, ""),
        18,
      );
    const address = clean($("address").value, 140),
      reference = clean($("reference").value, 140);
    const notes = clean($("notes").value, 300),
      method = $("payment").value,
      cash = +$("cash").value || 0;
    const errors = [];
    if (!cart.length) errors.push("Agrega al menos un producto.");
    if (!openNow())
      errors.push(menu.closedMessage || "La tienda está cerrada ahora.");
    if (!name) errors.push("Escribe tu nombre.");
    if (phone.replace(/\D/g, "").length < 10)
      errors.push("Escribe un celular válido de 10 dígitos.");
    if (delivery && !address) errors.push("Escribe la dirección y el barrio.");
    if (cart.some((item) => item.adulto) && !$("age").checked)
      errors.push("Confirma que eres mayor de 18 años.");
    if (method === "Efectivo" && cash < result.total)
      errors.push("Escribe con cuánto pagas. Debe ser igual o mayor al total.");
    if (errors.length) {
      $("checkoutError").textContent = errors.join(" ");
      return;
    }
    if (!store.ready) {
      $("checkoutError").textContent =
        "No hay conexión con la tienda. Revisa internet e inténtalo de nuevo.";
      return;
    }
    saveCustomer();
    const popup = window.open("", "_blank");
    $("send").disabled = true;
    $("send").textContent = "Guardando tu pedido…";
    const promo = BarrioIcePricing.planForDay(new Date().getDay(), menu);
    const items = result.lines.map((line) => ({
      n: clean(line.n || "Producto", 80),
      s: clean(line.s || "", 30),
      sabores: BarrioIcePricing.flavorNames(line)
        .map((name) => clean(name, 30))
        .slice(0, 2),
      p: line.regalo ? 0 : +line.p,
      q: +line.q,
      g: !!line.g,
      tipo: line.tipo || (line.g ? "granizado" : "bebida"),
      adulto: !!line.adulto,
      regalo: !!line.regalo,
      promo: clean(line.promo || "", 30),
      ahorroUnitario: +line.ahorroUnitario || 0,
    }));
    const order = {
      items,
      cliente: { nombre: name, celular: phone },
      entrega: {
        tipo: delivery ? "domicilio" : "recoger",
        direccion: delivery ? address : "",
        referencia: delivery ? reference : "",
      },
      pago: method,
      conCuanto: method === "Efectivo" ? cash : 0,
      notas: notes,
      subtotal: result.subtotal,
      descuento: result.discount,
      domicilio: 0,
      total: result.total,
      promo: promo.active ? promo.name : "Sin promo",
      promoBuy: promo.buy,
      promoReceive: promo.receive,
      mayor18: $("age").checked === true,
      tieneLicor: result.lines.some((line) => line.adulto),
      estado: "Nuevo",
      fecha: dateKey(),
      creadoEn: store.time(),
    };
    try {
      order.id = await store.createOrder(order);
      local.set("last", order);
      cart = [];
      document.dispatchEvent(new Event("barrio:draw-request"));
      document.dispatchEvent(new Event("barrio:cart-close-request"));
      confetti();
      const url =
        "https://wa.me/" +
        String(menu.whatsapp).replace(/\D/g, "") +
        "?text=" +
        encodeURIComponent(orderMessage(order));
      if (popup) popup.location = url;
      else window.open(url, "_blank");
      history.pushState({}, "", "?pedido=" + encodeURIComponent(order.id));
      showTracking(order.id);
    } catch (error) {
      console.error(error);
      popup?.close();
      $("checkoutError").textContent =
        error?.code === "permission-denied"
          ? "Firebase rechazó el pedido. Publica primero las reglas de transición de Firestore."
          : error?.code === "unavailable" || error?.code === "network-request-failed"
            ? "No hay conexión con Firebase. Revisa internet e inténtalo de nuevo."
            : "No se pudo guardar el pedido (" +
              String(error?.code || "error de Firebase") +
              "). Revisa la conexión y las reglas de Firestore.";
    } finally {
      $("send").disabled = false;
      $("send").textContent = "Enviar pedido por WhatsApp";
    }
  }
  $("checkout").onsubmit = sendOrder;
})();

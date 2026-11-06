(function () {
  "use strict";

  const revealedKeys = new Set();
  let revealObserver = null;

  menu = BarrioShared.mergeMenu(menu);
  if (!menu.precios.jueves) menu.precios.jueves = [...menu.precios.semana];

  function installPageExtras() {
    if (!document.getElementById("halfDialog")) {
      document.body.insertAdjacentHTML(
        "beforeend",
        `<dialog id="halfDialog">
          <form id="halfForm">
            <h2>Mitad y mitad</h2>
            <p class="notice">Escoge dos sabores de hoy para un mismo vaso.</p>
            <div class="field"><label for="halfSize">Tamaño</label><select id="halfSize"></select></div>
            <div class="field"><label for="halfFirst">Primer sabor</label><select id="halfFirst"></select></div>
            <div class="field"><label for="halfSecond">Segundo sabor</label><select id="halfSecond"></select></div>
            <p id="halfPrice" class="notice"></p>
            <div class="dialog-actions">
              <button class="secondary" type="button" id="halfCancel">Cancelar</button>
              <button class="primary" type="submit">Agregar al pedido</button>
            </div>
          </form>
        </dialog>`,
      );
    }
    if (!document.getElementById("cashChange")) {
      $("cashBox")?.insertAdjacentHTML(
        "beforeend",
        '<small class="change-copy" id="cashChange" aria-live="polite"></small>',
      );
    }
  }

  installPageExtras();

  function installLoadingSkeletons() {
    const card =
      `<article class="skeleton-card" aria-hidden="true">
        <span class="skeleton-line short"></span><span class="skeleton-line"></span>
        <span class="skeleton-line short"></span><span class="skeleton-button"></span>
      </article>`;
    [
      ["flavors", 3, false],
      ["combos", 2, true],
      ["drinks", 2, true],
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
    return Object.assign({}, result, {
      g: result.active ? result.receive : 0,
      p: result.prices,
    });
  }

  function allTodayFlavors() {
    const names = menu.dias?.[now().getDay()] || [];
    return names
      .map((name) => flavor(name))
      .filter((item) => item && item.active !== false && !sold(item.n));
  }
  function flavorText(item, includeProduct = true) {
    const names = BarrioIcePricing.flavorNames(item);
    if (names.length > 1) return names.join(" / ") + " (mitad y mitad)";
    if (names.length === 1)
      return (includeProduct ? "Granizado de " : "") + names[0];
    return item.n || "Producto";
  }
  function decorateCatalog() {
    ["flavors", "combos", "drinks"].forEach((id) => {
      const grid = $(id);
      if (!grid) return;
      revealObserver?.unobserve(grid);
      grid.classList.remove("skeleton-grid");
      delete grid.dataset.loadingKind;
      grid.setAttribute("aria-busy", "false");
    });
    const todayNames = menu.dias?.[now().getDay()] || [];
    document.querySelectorAll(".flavor").forEach((card) => {
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
        if (existingBadge) existingBadge.after(badge);
        else card.prepend(badge);
      } else if ((!item || !(item.l || item.adulto)) && ageBadge)
        ageBadge.remove();
      card.querySelectorAll("[data-flavor]").forEach((sizeButton) => {
        sizeButton.disabled = sizeButton.disabled || inactive;
      });
      card.querySelector(".half-trigger")?.remove();
      if (
        menu.mitadMitad &&
        todayNames.filter(
          (name) => flavor(name)?.active !== false && !sold(name),
        ).length > 1
      ) {
        card.insertAdjacentHTML(
          "beforeend",
          '<button class="half-trigger" type="button" data-half-launch="' +
            esc(button.dataset.flavor) +
            '">Mitad y mitad</button>',
        );
      }
    });
    document.querySelectorAll("[data-drink]").forEach((button) => {
      const item = menu.bebidas[+button.dataset.drink];
      const card = button.closest(".drink");
      if (card) card.hidden = !item || item.active === false;
    });
    document.querySelectorAll("[data-combo]").forEach((button) => {
      const item = menu.combos[+button.dataset.combo],
        card = button.closest(".combo");
      if (card) {
        card.hidden = !item || item.active === false;
        const price = card.querySelector("p");
        if (item && price)
          price.textContent = (item.d || "") + " · " + fmt(item.p);
      }
    });
    decorateRevealTargets();
  }

  function flashAdded(source) {
    if (!source || !source.matches("[data-flavor], [data-drink], [data-combo]"))
      return;
    if (!source.dataset.originalLabel)
      source.dataset.originalLabel = source.innerHTML;
    if (!("originalAriaLabel" in source.dataset))
      source.dataset.originalAriaLabel =
        source.getAttribute("aria-label") || "";
    clearTimeout(source.addedTimer);
    source.textContent = "✓ Agregado";
    source.setAttribute("aria-label", "Agregado al pedido");
    source.classList.add("is-added");
    source.addedTimer = setTimeout(() => {
      if (!source.isConnected) return;
      source.innerHTML = source.dataset.originalLabel;
      if (source.dataset.originalAriaLabel)
        source.setAttribute("aria-label", source.dataset.originalAriaLabel);
      else source.removeAttribute("aria-label");
      source.classList.remove("is-added");
    }, 1200);
  }
  function bumpOrderButton() {
    [$("cartTop"), $("fab")].filter(Boolean).forEach((button) => {
      button.classList.remove("bump");
      void button.offsetWidth;
      button.classList.add("bump");
    });
  }

  function flavorOptions(selected) {
    return allTodayFlavors()
      .map(
        (item) =>
          '<option value="' +
          esc(item.n) +
          '" ' +
          (item.n === selected ? "selected" : "") +
          ">" +
          esc(item.n) +
          "</option>",
      )
      .join("");
  }
  function animateCurrency(node, value, previousValue) {
    if (!node) return;
    const previous = Number.isFinite(previousValue)
      ? previousValue
      : Number(node.dataset.animatedValue);
    node.dataset.animatedValue = String(value);
    if (!Number.isFinite(previous) || reducedMotion()) {
      node.textContent = fmt(value);
      return;
    }
    cancelAnimationFrame(node.valueFrame || 0);
    const started = performance.now(),
      duration = 420;
    const tick = (time) => {
      const progress = Math.min(1, (time - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = fmt(Math.round(previous + (value - previous) * eased));
      if (progress < 1) node.valueFrame = requestAnimationFrame(tick);
    };
    node.valueFrame = requestAnimationFrame(tick);
  }
  function refreshCartPresentation() {
    const result = totals();
    const summaryNode = $("summary");
    const previousSummaryTotal = Number(summaryNode.dataset.animatedValue);
    const qty = cart.reduce((sum, item) => sum + (+item.q || 0), 0);
    $$(".count").forEach((node) => {
      node.textContent = qty;
    });
    $("fabTotal").textContent = fmt(result.total);
    const paid = result.paidLines
      .map((item) => {
        const isGranizado = item.g === true || item.tipo === "granizado";
        const offerSelect =
          isGranizado && dayPlan().active
            ? '<label><small>¿Qué sabor quieres de regalo?</small><select class="gift-select" data-gift-flavor="' +
              esc(item.k) +
              '">' +
              flavorOptions(
                item.giftFlavor || BarrioIcePricing.flavorNames(item)[0],
              ) +
              '</select></label><button type="button" class="secondary gift-same" data-gift-same="' +
              esc(item.k) +
              '">El mismo</button>'
            : "";
        return (
          '<div class="cart-line"><div><b>' +
          esc(flavorText(item)) +
          (item.s ? " · " + esc(item.s) : "") +
          "</b><small>" +
          fmt(item.p) +
          " c/u</small>" +
          offerSelect +
          '</div><div class="qty"><button data-change="' +
          esc(item.k) +
          '" data-d="-1" aria-label="Quitar uno">−</button>' +
          item.q +
          '<button data-change="' +
          esc(item.k) +
          '" data-d="1" aria-label="Agregar uno">+</button></div></div>'
        );
      })
      .join("");
    const gifts = result.giftLines
      .map(
        (item) =>
          '<div class="cart-line gift"><div><b>REGALO ' +
          esc(String(item.promo).replace(/^Promo\s+/i, "")) +
          ": " +
          item.q +
          " x " +
          esc(flavorText(item)) +
          " · " +
          esc(item.s) +
          "</b><small>Valor: " +
          fmt(0) +
          "</small></div><strong>" +
          fmt(0) +
          "</strong></div>",
      )
      .join("");
    $("lines").innerHTML = cart.length
      ? paid + gifts
      : '<p class="notice">Agrega algo frío para empezar.</p>';
    summaryNode.innerHTML = cart.length
      ? "<div><span>Subtotal</span><b>" +
        fmt(result.subtotal) +
        '</b></div><div class="discount"><span>Ahorro por promo</span><b>' +
        (result.discount ? "−" : "") +
        fmt(result.discount) +
        '</b></div><div><span>Domicilio</span><b>Se paga aparte</b></div><div class="total"><span>Total</span><b>' +
        fmt(result.total) +
        "</b></div>"
      : "";
    summaryNode.dataset.animatedValue = String(result.total);
    animateCurrency(
      summaryNode.querySelector(".total b"),
      result.total,
      previousSummaryTotal,
    );
    $("nudge").textContent =
      result.nudge ||
      (dayPlan().g
        ? "La promo se aplica sola según el tamaño y precio."
        : "Hoy no hay promo: precios normales.");
    animateCurrency($("total"), result.total);
    $("ageBox").classList.toggle("hide", !cart.some((item) => item.adulto));
    paymentChanged();
    updateCashChange();
    markPicked();
    document.querySelectorAll(".sizes").forEach((group) => {
      const selected = group.querySelector(".size.on");
      group.dataset.selectedIndex = selected ? selected.dataset.size : "";
    });
  }
  function updateCashChange() {
    const node = $("cashChange");
    if (!node) return;
    const total = totals().total,
      amount = +$("cash")?.value || 0;
    node.textContent =
      $("payment")?.value === "Efectivo" && amount >= total && total > 0
        ? "Cambio para devolver: " + fmt(amount - total)
        : "";
  }
  function ensureHalfOptions(initialFlavor) {
    const options = allTodayFlavors();
    $("halfFirst").innerHTML = options
      .map(
        (item) =>
          '<option value="' +
          esc(item.n) +
          '" ' +
          (item.n === initialFlavor ? "selected" : "") +
          ">" +
          esc(item.n) +
          "</option>",
      )
      .join("");
    $("halfSecond").innerHTML = options
      .map(
        (item, index) =>
          '<option value="' +
          esc(item.n) +
          '" ' +
          (item.n !== initialFlavor &&
          index === options.findIndex((other) => other.n !== initialFlavor)
            ? "selected"
            : "") +
          ">" +
          esc(item.n) +
          "</option>",
      )
      .join("");
    const p = dayPlan();
    $("halfSize").innerHTML = sizes
      .map(
        (size, index) =>
          '<option value="' +
          index +
          '">' +
          size +
          " · " +
          fmt(p.prices[index]) +
          "</option>",
      )
      .join("");
    $("halfPrice").textContent = "Precio del vaso: " + fmt(p.prices[0]);
  }



  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches("[data-gift-flavor]")) {
      const item = cart.find((line) => line.k === target.dataset.giftFlavor);
      if (item) {
        item.giftFlavor = target.value;
        document.dispatchEvent(new Event("barrio:draw-request"));
      }
    }
    if (target.id === "payment" || target.id === "delivery") updateCashChange();
  });
  document.addEventListener("input", (event) => {
    if (event.target.id === "cash") updateCashChange();
  });
  $("halfCancel").onclick = () => $("halfDialog").close();
  $("halfSize").onchange = () => {
    $("halfPrice").textContent =
      "Precio del vaso: " + fmt(dayPlan().prices[+$("halfSize").value]);
  };
  $("halfForm").onsubmit = (event) => {
    event.preventDefault();
    const first = $("halfFirst").value,
      second = $("halfSecond").value,
      index = +$("halfSize").value;
    if (!first || !second || first === second) {
      alert("Escoge dos sabores diferentes.");
      return;
    }
    const p = dayPlan(),
      key = [first, second].sort().join("/") + ":" + index;
    const adult = [flavor(first), flavor(second)].some(
      (item) => item?.l || item?.adulto,
    );
    add(
      {
        k: "h:" + key,
        n: "Granizado mitad y mitad",
        s: sizes[index],
        sabores: [first, second],
        p: +p.prices[index],
        q: 1,
        g: true,
        tipo: "granizado",
        adulto: adult,
        giftFlavor: first,
      },
      null,
    );
    $("halfDialog").close();
  };
  function reducedMotion() {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  if ("IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target;
          if (target.matches(".hero")) {
            target.classList.toggle("motion-paused", !entry.isIntersecting);
            document.documentElement.classList.toggle(
              "hero-in-view",
              entry.isIntersecting,
            );
            return;
          }
          if (target.matches(".skeleton-grid")) {
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
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
  }

  function decorateRevealTargets() {
    const targets = document.querySelectorAll(
      ".section > .head, .flavor, .drink, .combo, .feature, .info article, .faq details",
    );
    targets.forEach((node, index) => {
      let key;
      if (node.matches(".section > .head"))
        key =
          "section:" +
          String(
            node.closest(".section")?.id ||
              node.querySelector("h2")?.textContent ||
              index,
          ).trim();
      else if (node.matches(".flavor"))
        key =
          "flavor:" +
          String(
            node.querySelector("[data-flavor]")?.dataset.flavor || index,
          ).trim();
      else if (node.matches(".drink"))
        key =
          "drink:" +
          String(node.querySelector("h3")?.textContent || index).trim();
      else if (node.matches(".combo"))
        key =
          "combo:" +
          String(node.querySelector("h3")?.textContent || index).trim();
      else if (node.matches(".feature")) key = "feature:daily";
      else if (node.matches(".faq details"))
        key =
          "faq:" +
          String(node.querySelector("summary")?.textContent || index).trim();
      else
        key =
          "info:" +
          String(node.querySelector("h3")?.textContent || index).trim();
      node.dataset.revealKey = key;
      const group =
        node.closest(".grid, .info, .faq, .section") || node.parentElement;
      const siblings = group
        ? [
            ...group.querySelectorAll(
              ":scope > .flavor, :scope > .drink, :scope > .combo, :scope > article, :scope > details, :scope > .head",
            ),
          ]
        : [];
      node.style.setProperty(
        "--reveal-delay",
        Math.min(5, Math.max(0, siblings.indexOf(node))) * 85 + "ms",
      );
      if (reducedMotion() || !revealObserver || revealedKeys.has(key)) {
        node.classList.remove("reveal-pending");
        node.classList.add("reveal-visible");
        revealedKeys.add(key);
        revealObserver?.unobserve(node);
        return;
      }
      node.classList.remove("reveal-visible");
      node.classList.add("reveal-pending");
      revealObserver.observe(node);
    });
    document
      .querySelectorAll(".skeleton-grid")
      .forEach((grid) => revealObserver?.observe(grid));
  }

  function setupMotion() {
    const hero = document.querySelector(".hero");
    if (hero && !reducedMotion()) hero.classList.add("hero-enter");
    hero && revealObserver?.observe(hero);
    decorateRevealTargets();
    document.addEventListener(
      "pointerdown",
      (event) => {
        const card = event.target.closest?.(".flavor");
        if (card) {
          card.classList.remove("is-released");
          card.classList.add("is-pressed");
        }
      },
      true,
    );
    ["pointerup", "pointercancel"].forEach((type) =>
      window.addEventListener(
        type,
        (event) => {
          const card =
            event.target?.closest?.(".flavor") ||
            document.querySelector(".flavor.is-pressed");
          if (!card) return;
          card.classList.remove("is-pressed");
          card.classList.add("is-released");
          card.addEventListener(
            "animationend",
            () => card.classList.remove("is-released"),
            { once: true },
          );
        },
        true,
      ),
    );

    document.addEventListener("visibilitychange", () =>
      document.documentElement.classList.toggle(
        "document-hidden",
        document.hidden,
      ),
    );
    const theme = $("theme");
    if (theme?.onclick) {
      const changeTheme = theme.onclick;
      theme.onclick = function (event) {
        document.documentElement.classList.add("theme-transition");
        changeTheme.call(this, event);
        clearTimeout(theme.transitionTimer);
        theme.transitionTimer = setTimeout(
          () => document.documentElement.classList.remove("theme-transition"),
          280,
        );
      };
    }
    $("sheet").style.setProperty("--safe-t", "env(safe-area-inset-top, 0px)");
  }

  document.addEventListener("barrio:render", decorateCatalog);
  document.addEventListener("barrio:draw", refreshCartPresentation);
  document.addEventListener("barrio:item-added", (event) => {
    flashAdded(event.detail?.source);
    bumpOrderButton();
  });
  setupMotion();
  decorateCatalog();
  refreshCartPresentation();
})();

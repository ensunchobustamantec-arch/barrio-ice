(() => {
  "use strict";

  const baseOpenCart = openCart;
  const baseCloseCart = closeCart;
  let cartOpen = false,
    cartReturnFocus = null,
    cartScrollY = 0;
  let bodyStyleBeforeCart = null,
    inertBeforeCart = null;
  function openCartWithFocus() {
    if (!cart.length) return baseOpenCart();
    if (cartOpen) return;
    cartReturnFocus = document.activeElement;
    cartScrollY = window.scrollY;
    bodyStyleBeforeCart = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    inertBeforeCart = ["storefront", "tracking", "fab", "floatWa"]
      .map((id) => {
        const node = $(id);
        return node
          ? [
              node,
              node.inert,
              node.hasAttribute("inert"),
              node.getAttribute("aria-hidden"),
            ]
          : null;
      })
      .filter(Boolean);
    baseOpenCart();
    cartOpen = true;
    const sheet = $("sheet");
    sheet.classList.remove("cart-enter");
    void sheet.offsetWidth;
    sheet.classList.add("cart-enter");
    clearTimeout(sheet.enterTimer);
    sheet.enterTimer = setTimeout(
      () => sheet.classList.remove("cart-enter"),
      760,
    );
    sheet.inert = false;
    sheet.removeAttribute("inert");
    sheet.setAttribute("aria-hidden", "false");
    inertBeforeCart.forEach(([node]) => {
      node.inert = true;
      node.setAttribute("inert", "");
      node.setAttribute("aria-hidden", "true");
    });
    document.body.style.position = "fixed";
    document.body.style.top = -cartScrollY + "px";
    document.body.style.width = "100%";
    requestAnimationFrame(() => $("close")?.focus({ preventScroll: true }));
  }
  function closeCartWithFocus() {
    if (!cartOpen) return closeCart();
    baseCloseCart();
    cartOpen = false;
    const sheet = $("sheet");
    sheet.inert = true;
    sheet.setAttribute("inert", "");
    sheet.setAttribute("aria-hidden", "true");
    inertBeforeCart?.forEach(([node, inert, hadInert, ariaHidden]) => {
      node.inert = inert;
      if (!hadInert) node.removeAttribute("inert");
      if (ariaHidden === null) node.removeAttribute("aria-hidden");
      else node.setAttribute("aria-hidden", ariaHidden);
    });
    inertBeforeCart = null;
    if (bodyStyleBeforeCart)
      Object.assign(document.body.style, bodyStyleBeforeCart);
    bodyStyleBeforeCart = null;
    const scrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, cartScrollY);
    document.documentElement.style.scrollBehavior = scrollBehavior;
    if (cartReturnFocus?.isConnected)
      cartReturnFocus.focus({ preventScroll: true });
    cartReturnFocus = null;
  }
  $("cartTop").onclick = openCartWithFocus;
  $("fab").onclick = openCartWithFocus;
  $("close").onclick = closeCartWithFocus;
  $("scrim").onclick = closeCartWithFocus;
  document.addEventListener("barrio:cart-open-request", openCartWithFocus);
  document.addEventListener("barrio:cart-close-request", closeCartWithFocus);
  $("sheet").inert = true;
  $("sheet").setAttribute("inert", "");
  $("sheet").setAttribute("aria-hidden", "true");
  document.addEventListener(
    "keydown",
    (event) => {
      if (!cartOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeCartWithFocus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [
        ...$("sheet").querySelectorAll(
          `a[href], button:not(:disabled), input:not(:disabled),
           select:not(:disabled), textarea:not(:disabled),
           [tabindex]:not([tabindex="-1"])`,
        ),
      ].filter(
        (node) =>
          !node.hidden &&
          node.getAttribute("aria-hidden") !== "true" &&
          node.getClientRects().length > 0,
      );
      if (!focusable.length) {
        event.preventDefault();
        $("sheet").focus();
        return;
      }
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    true,
  );



})();

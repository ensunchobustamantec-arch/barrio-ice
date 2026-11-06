const BarrioShared = window.BarrioShared;
      const {
        FIREBASE_CONFIG,
        ADMIN_UID,
        DEFAULTS,
        now,
        dateKey,
        esc,
        clean,
        fmt,
      } = BarrioShared;
      const $ = (x) => document.getElementById(x),
        $$ = (x) => [...document.querySelectorAll(x)],
        days = [
          "domingo",
          "lunes",
          "martes",
          "miércoles",
          "jueves",
          "viernes",
          "sábado",
        ],
        sizes = ["Pequeño", "Mediano", "Grande"],
        states = ["Nuevo", "Preparando", "Listo", "En camino", "Entregado", "Cancelado"];
      const local = {
        get(k, f) {
          try {
            return JSON.parse(localStorage.getItem("barrio-ice-" + k)) ?? f;
          } catch {
            return f;
          }
        },
        set(k, v) {
          try {
            localStorage.setItem("barrio-ice-" + k, JSON.stringify(v));
          } catch {}
        },
      };
      function merge(data) {
        return BarrioShared.mergeMenu(data);
      }
      let menu = merge(), cart = [], store;
      function plan(d = now().getDay()) {
        const result = BarrioIcePricing.planForDay(d, menu);
        return {
          title: result.name,
          g: result.active ? result.receive : 0,
          p: result.prices,
          active: result.active,
        };
      }
      function openNow() {
        const manualState =
          menu.aperturaManual || (menu.cerradaManual ? "cerrada" : "horario");
        if (manualState === "abierta") return true;
        if (manualState === "cerrada") return false;
        const n = now(),
          day = n.getDay(),
          hours = menu.horario?.[day] || menu.horario?.[days[day]] || menu.horario || {};
        if (hours.abierto === false || hours.cerrado === true) return false;
        const toMinutes = (value) => {
          const [hour, minute] = String(value || "11:00").split(":").map(Number);
          return (hour || 0) * 60 + (minute || 0);
        };
        const current = n.getHours() * 60 + n.getMinutes();
        return current >= toMinutes(hours.abre || hours.open) &&
          current < toMinutes(hours.cierra || hours.close || "22:00");
      }
      function flavor(n) {
        return menu.cat.find((x) => x.n === n);
      }
      function sold(n) {
        return (menu.agotados[now().getDay()] || []).includes(n);
      }
      function render() {
        let p = plan(),
          on = openNow(),
          day = now().getDay();
        $("heroStatus").textContent = on ? "Abierto ahora" : "Cerrado ahora";
        $("shopStatus").textContent = on
          ? "Abierto · hasta " + menu.horario.cierra
          : "Cerrado ahora";
        $("shopStatus").className = "status " + (on ? "open" : "closed");
        $("promoText").textContent =
          p.g === 2
            ? "Hoy es 2x1: compra un granizado y te regalamos otro del mismo precio."
            : "Hoy no hay promo: precios normales, sabor sin discusión.";
        $("week").innerHTML = [1, 2, 3, 4, 5, 6, 0]
          .map((d) => {
            let q = plan(d);
            return (
              '<div class="day ' +
              (d === day ? "today" : "") +
              '"><b>' +
              days[d].slice(0, 3) +
              "</b><span>" +
              (q.g ? q.g + "x" + (q.g - 1) : fmt(q.p[0])) +
              "</span></div>"
            );
          })
          .join("");
        let today = menu.dias[day] || [];
        $("flavors").innerHTML = today.length
          ? today
              .map((n) => {
                  let f = flavor(n) || { n: n, c: "#5bc0eb" },
                  off = sold(n),
                  tag = off
                    ? '<span class="tag soldout">AGOTADO</span>'
                    : f.l || f.adulto
                      ? '<span class="tag adult">+18 · LICOR</span>'
                      : '<span class="tag">HOY HAY</span>';
                return (
                  '<article class="flavor ' +
                  (off ? "sold" : "") +
                  '" style="--flavor:' +
                  esc(f.c) +
                  '">' +
                  tag +
                  '<span class="cup"><i class="straw"></i><i class="rim"></i>' +
                  '<i class="glass"><i class="fill"></i></i></span><h3>' +
                  esc(f.n) +
                  "</h3><small>" +
                  (f.l || f.adulto
                    ? "Con licor · solo mayores de edad"
                    : "Granizado bien frío") +
                  '</small><div class="sizes">' +
                  sizes
                    .map(
                      (s, i) =>
                        '<button class="size" data-flavor="' +
                        esc(f.n) +
                        '" data-size="' +
                        i +
                        '" ' +
                        (off ? "disabled" : "") +
                        ">" +
                        s +
                        "<span>" +
                        fmt(p.p[i]) +
                        "</span></button>",
                    )
                    .join("") +
                  "</div></article>"
                );
              })
              .join("")
          : '<p class="notice">Hoy aún no hay sabores publicados. Escríbenos y miramos qué salió del congelador.</p>';
        let first = flavor(today[0]);
        $("daily").textContent = first
          ? "Sabor del día: " + first.n
          : "Sabor del día";
        $("dailyCopy").textContent = first
          ? (first.l ? "Para mayores de 18." : "Para todo el parche.") +
            " Hoy está sonando duro."
          : "Vuelve pronto a mirar qué salió del congelador.";
        $("drinks").innerHTML = menu.bebidas
          .map(
            (b, i) =>
              '<article class="drink"><i class="drink-icon">' +
              esc(b.icon || "🧊") +
              "</i><div><h3>" +
              esc(b.n) +
              (b.adulto ? ' <span class="tag adult">+18</span>' : "") +
              "</h3><p>" +
              fmt(b.p) +
              (b.adulto ? " · Solo mayores de edad" : "") +
              '</p></div><button class="add" data-drink="' +
              i +
              '" aria-label="Agregar ' +
              esc(b.n) +
              '">+</button></article>',
          )
          .join("");
        $("combos").innerHTML = menu.combos
          .map(
            (c, i) =>
              '<article class="combo"><i class="drink-icon">🤝</i><div><h3>' +
              esc(c.n) +
              "</h3><p>" +
              esc(c.d) +
              " · " +
              fmt((c.items || []).reduce((a, x) => a + x.p, 0)) +
              '</p></div><button class="add" data-combo="' +
              i +
              '" aria-label="Agregar ' +
              esc(c.n) +
              '">+</button></article>',
          )
          .join("");
        let wa = String(menu.whatsapp).replace(/\D/g, ""),
          maps = menu.maps || DEFAULTS.maps,
          insta = menu.instagram || DEFAULTS.instagram;
        ["contact", "floatWa"].forEach(
          (x) => ($(x).href = "https://wa.me/" + wa),
        );
        const genericInstagram = (value) => {
            if (!value) return true;
            try {
              const url = new URL(value, location.origin);
              return (
                /^(www\.)?instagram\.com$/i.test(url.hostname) &&
                url.pathname.replace(/\/$/, "") === ""
              );
            } catch {
              return true;
            }
          },
          genericMaps = (value) => {
            if (!value) return true;
            try {
              const url = new URL(value, location.origin),
                destination = (
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
              return /^(monteria(?:,? colombia)?|colombia)$/.test(destination);
            } catch {
              return true;
            }
          },
          hasInstagram = !genericInstagram(insta),
          hasMaps = !genericMaps(maps);
        ["maps", "footMaps"].forEach((id) => {
          const link = $(id);
          if (hasMaps) link.href = maps;
          else link.removeAttribute("href");
          if (id === "maps") link.closest("article").hidden = !hasMaps;
          else link.hidden = !hasMaps;
        });
        ["instagram", "footInsta"].forEach((id) => {
          const link = $(id);
          if (hasInstagram) link.href = insta;
          else link.removeAttribute("href");
          if (id === "instagram") link.closest("article").hidden = !hasInstagram;
          else link.hidden = !hasInstagram;
        });
        $("footMaps").parentElement.hidden = !hasMaps && !hasInstagram;
        draw();
        document.dispatchEvent(new Event("barrio:render"));
      }
      function toast(m) {
        let t = $("toast");
        t.innerHTML =
          '<span></span><button type="button" id="toastGo">Ver pedido</button>';
        t.firstChild.textContent = m;
        t.classList.add("show");
        clearTimeout(toast.t);
        toast.t = setTimeout(() => t.classList.remove("show"), 2600);
        ["fab", "cartTop"].forEach((id) => {
          let e = $(id);
          if (e) {
            e.classList.remove("bump");
            void e.offsetWidth;
            e.classList.add("bump");
          }
        });
      }
      function add(x, source, quiet) {
        let old = cart.find((y) => y.k === x.k);
        old ? old.q++ : cart.push(Object.assign(x, { q: 1 }));
        fly(source);
        draw();
        document.dispatchEvent(new CustomEvent("barrio:item-added", { detail: { source } }));
        if (!quiet) toast("✓ " + x.n + (x.s ? " · " + x.s : "") + " agregado");
      }
      function addFlavor(n, i, s) {
        let f = flavor(n);
        if (f && f.active !== false && !sold(n)) {
          let p = plan();
          add(
            {
              k: "g:" + n + ":" + i,
              n: "Granizado de " + n,
              s: sizes[i],
              p: +p.p[i],
              q: 1,
              g: true,
              tipo: "granizado",
              sabores: [n],
              adulto: !!(f.l || f.adulto),
              giftFlavor: n,
            },
            s,
          );
        }
      }
      function addDrink(i, s) {
        let b = menu.bebidas[i];
        if (b && b.active !== false)
          add(
            {
              k: "b:" + i,
              n: b.n,
              s: "",
              p: +b.p,
              q: 1,
              g: false,
              tipo: "bebida",
              sabores: [],
              adulto: !!b.adulto,
            },
            s,
          );
      }
      function addCombo(i, s) {
        let c = menu.combos[i];
        if (!c || c.active === false) return;
        const price = Math.max(
          0,
          +c.p || (c.items || []).reduce((sum, line) => sum + (+line.p || 0), 0),
        );
        add(
          {
            k: "combo:" + i,
            n: c.n,
            s: c.d || "Combo",
            p: price,
            q: 1,
            g: false,
            tipo: "combo",
            adulto: !!c.adulto,
            sabores: [],
          },
          s,
        );
      }
      function totals() {
        const result = BarrioIcePricing.calculate(cart, now().getDay(), menu);
        return Object.assign({ sub: result.subtotal }, result);
      }
      function nudgeText() {
        return totals().nudge ||
          (plan().g ? "La promo se aplica según los granizados elegidos." :
            "Hoy no hay promoción activa. Igual sabe brutal.");
      }
      function draw() {
        let r = totals(),
          num = cart.reduce((a, x) => a + x.q, 0);
        $$(".count").forEach((x) => (x.textContent = num));
        $("fabTotal").textContent = fmt(r.total);
        $("lines").innerHTML = cart.length
          ? cart
              .map(
                (x) =>
                  '<div class="cart-line"><div><b>' +
                  esc(x.n) +
                  (x.s ? " · " + esc(x.s) : "") +
                  "</b><small>" +
                  fmt(x.p) +
                  ' c/u</small></div><div class="qty"><button data-change="' +
                  esc(x.k) +
                  '" data-d="-1">−</button>' +
                  x.q +
                  '<button data-change="' +
                  esc(x.k) +
                  '" data-d="1">+</button></div></div>',
              )
              .join("")
          : '<p class="notice">El pedido está más vacío que la nevera un domingo.</p>';
        $("summary").innerHTML = cart.length
          ? "<div><span>Subtotal</span><b>" +
            fmt(r.sub) +
            "</b></div>" +
            (r.discount
              ? '<div class="discount"><span>Promo ' +
                plan().title +
                "</span><b>−" +
                fmt(r.discount) +
                "</b></div>"
              : "") +
            ($("delivery")?.value === "domicilio"
              ? "<div><span>Domicilio</span><b>Se paga aparte</b></div>"
              : "")
          : "";
        $("nudge").textContent = nudgeText();
        $("total").textContent = fmt(r.total);
        $("ageBox").classList.toggle("hide", !cart.some((x) => x.adulto));
        paymentChanged();
        markPicked();
        document.dispatchEvent(new Event("barrio:draw"));
      }
      document.addEventListener("barrio:draw-request", draw);
      function markPicked() {
        $$(".size").forEach((b) => {
          let q = cart
            .filter(
              (x) => x.k === "g:" + b.dataset.flavor + ":" + b.dataset.size,
            )
            .reduce((a, x) => a + x.q, 0);
          b.classList.toggle("on", q > 0);
          if (q) b.dataset.q = q;
          else delete b.dataset.q;
        });
        $$(".flavor").forEach((c) => {
          let n = c.querySelector(".size")?.dataset.flavor,
            q = cart
              .filter((x) => String(x.k).indexOf("g:" + n + ":") === 0)
              .reduce((a, x) => a + x.q, 0);
          c.classList.toggle("picked", q > 0);
          if (q) c.dataset.q = q;
          else delete c.dataset.q;
        });
        $$(".add[data-drink]").forEach((b) => {
          let q = cart
            .filter((x) => x.k === "b:" + b.dataset.drink)
            .reduce((a, x) => a + x.q, 0);
          b.classList.toggle("on", q > 0);
          b.textContent = q ? "✓" + q : "+";
        });
      }
      function fly(source) {
        if (!source || matchMedia("(prefers-reduced-motion:reduce)").matches)
          return;
        let a = source.closest(".flavor")?.querySelector(".cup") || source,
          b = a.getBoundingClientRect(),
          t = (
            $("fab").offsetParent !== null ? $("fab") : $("cartTop")
          ).getBoundingClientRect(),
          g = document.createElement("i");
        g.className = "flying";
        g.textContent = "🧊";
        g.style.left = b.left + "px";
        g.style.top = b.top + "px";
        document.body.append(g);
        requestAnimationFrame(() => {
          g.style.left = t.left + t.width / 2 + "px";
          g.style.top = t.top + "px";
          g.style.transform = "scale(.2) rotate(340deg)";
          g.style.opacity = 0;
        });
        setTimeout(() => g.remove(), 700);
      }
      function change(k, d) {
        let x = cart.find((x) => x.k === k);
        if (x) {
          x.q += +d;
          if (x.q < 1) cart = cart.filter((y) => y !== x);
          draw();
        }
      }
      function openCart() {
        if (!cart.length) {
          location.hash = "#sabores";
          return;
        }
        $("scrim").classList.add("show");
        $("sheet").classList.add("open");
        document.body.style.overflow = "hidden";
      }
      function closeCart() {
        $("scrim").classList.remove("show");
        $("sheet").classList.remove("open");
        document.body.style.overflow = "";
      }
      function paymentChanged() {
        let m = $("payment")?.value;
        if (!m) return;
        $("addressBox").classList.toggle(
          "hide",
          $("delivery").value !== "domicilio",
        );
        $("cashBox").classList.toggle("hide", m !== "Efectivo");
        $("digital").classList.toggle("hide", m === "Efectivo");
        if (m !== "Efectivo")
          $("digital").innerHTML =
            "Paga al número de <b>" +
            esc(m) +
            ": " +
            esc(menu.pagos[m] || "por confirmar") +
            "</b> y envía el comprobante por WhatsApp.";
      }
      function restore() {
        let c = local.get("customer", {});
        $("name").value = c.name || "";
        $("phone").value = c.phone || "";
        $("address").value = c.address || "";
        $("reference").value = c.reference || "";
      }
      function saveCustomer() {
        local.set("customer", {
          name: clean($("name").value, 60),
          phone: clean($("phone").value, 18),
          address: clean($("address").value, 140),
          reference: clean($("reference").value, 140),
        });
      }
      function orderMessage(o) {
        return [
          "🧊 *NUEVO PEDIDO – BARRIO ICE*",
          "Pedido #" + o.id.slice(-6).toUpperCase(),
          "👤 " + o.cliente.nombre,
          "📱 " + o.cliente.celular,
          "🍧 " +
            o.items
              .map((x) => x.q + "x " + x.n + (x.s ? " (" + x.s + ")" : ""))
              .join(", "),
          o.entrega.tipo === "domicilio"
            ? "📍 Domicilio: " +
              o.entrega.direccion +
              (o.entrega.referencia ? " – " + o.entrega.referencia : "")
            : "🏪 Recoge en el local",
          "💳 Pago: " +
            o.pago +
            (o.conCuanto ? " (paga con " + fmt(o.conCuanto) + ")" : ""),
          o.descuento ? "🎉 Promo " + o.promo + ": −" + fmt(o.descuento) : "",
          o.entrega.tipo === "domicilio" ? "🚚 Domicilio: se paga aparte" : "",
          o.notas ? "📝 " + o.notas : "",
          "💰 *TOTAL" +
            (o.entrega.tipo === "domicilio" ? " (sin domicilio)" : "") +
            ": " +
            fmt(o.total) +
            "*",
        ]
          .filter(Boolean)
          .join("\n");
      }
      function confetti() {
        if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
        for (let i = 0; i < 24; i++) {
          let c = document.createElement("i");
          c.className = "confetti";
          c.style.left = 42 + Math.random() * 16 + "vw";
          c.style.top = "55vh";
          c.style.setProperty("--x", (Math.random() - 0.5) * 420 + "px");
          c.style.setProperty("--y", (Math.random() - 0.2) * -370 + "px");
          c.style.background = i % 3 ? "var(--ice)" : "var(--yellow)";
          document.body.append(c);
          setTimeout(() => c.remove(), 1000);
        }
      }
      function repeat() {
        let last = local.get("last");
        if (!last?.items?.length) {
          alert(
            "Todavía no tenemos un pedido tuyo guardado en este navegador.",
          );
          return;
        }
        cart = last.items.map((x, i) =>
          Object.assign({}, x, { k: "r:" + i + ":" + x.n + ":" + x.s }),
        );
        $("delivery").value = last.entrega?.tipo || "domicilio";
        $("payment").value = last.pago || "Efectivo";
        $("notes").value = last.notas || "";
        draw();
        openCart();
      }
      function showTracking(id) {
        $("storefront").classList.add("hide");
        $("tracking").classList.remove("hide");
        $("fab").classList.add("hide");
        $("floatWa").classList.add("hide");
        if (!store.ready) {
          $("trackingCopy").textContent =
            "No pudimos conectarnos al seguimiento. Conserva tu WhatsApp para novedades.";
          return;
        }
        store.watchTracking(
          id,
          (o) => {
            if (!o) {
              $("trackingCopy").textContent =
                "No encontramos ese pedido. Si lo hiciste antes de esta actualización, escríbenos por WhatsApp.";
              return;
            }
            const state = o.estado || "Nuevo";
            const delivery = o.tipo === "domicilio";
            const type = delivery ? "Domicilio" : "Recoger";
            $("trackingCopy").textContent =
              "Pedido #" + id.slice(-6).toUpperCase() + " · " + state + " · " + type;
            const flow = states.slice(0, 5);
            const currentStep = flow.indexOf(state);
            $("steps").innerHTML =
              state === "Cancelado"
                ? '<p class="tracking-cancelled">Este pedido fue cancelado. Comunícate con Barrio Ice si necesitas ayuda.</p>'
                : flow
                    .map(
                      (step, index) =>
                        '<div class="step ' +
                        (currentStep >= index ? "active " : "") +
                        (currentStep === index ? "current" : "") +
                        '"><i>' +
                        (currentStep > index ? "✓" : index + 1) +
                        "</i><span>" +
                        step +
                        "</span></div>",
                    )
                    .join("");
            $("trackingMeta").textContent = o.nombreCorto
              ? "A nombre de " +
                o.nombreCorto
              : "";
          },
          () => {
            $("trackingCopy").textContent =
              "No pudimos actualizar el estado. Revisa tu conexión.";
          },
        );
      }
      function route() {
        if (location.hash === "#admin") {
          location.replace("/admin/");
          return;
        }
        if (!new URLSearchParams(location.search).get("pedido")) {
          $("storefront").classList.remove("hide");
          $("fab").classList.remove("hide");
          $("floatWa").classList.remove("hide");
        }
      }
      function events() {
        document.addEventListener("click", (event) => {
          const flavorButton = event.target.closest("[data-flavor]"),
            drinkButton = event.target.closest("[data-drink]"),
            comboButton = event.target.closest("[data-combo]"),
            quantityButton = event.target.closest("[data-change]");
          if (flavorButton)
            addFlavor(flavorButton.dataset.flavor, +flavorButton.dataset.size, flavorButton);
          if (drinkButton) addDrink(+drinkButton.dataset.drink, drinkButton);
          if (comboButton) addCombo(+comboButton.dataset.combo, comboButton);
          if (quantityButton)
            change(quantityButton.dataset.change, quantityButton.dataset.d);
        });
        $("cartTop").onclick = openCart;
        $("fab").onclick = openCart;
        $("close").onclick = closeCart;
        $("scrim").onclick = closeCart;
        $("delivery").onchange = draw;
        $("payment").onchange = paymentChanged;
        $("repeat").onclick = repeat;
        $("theme").onclick = () => {
          const value =
            document.documentElement.dataset.theme === "dark" ? "light" : "dark";
          document.documentElement.dataset.theme = value;
          local.set("theme", value);
        };
        addEventListener("hashchange", route);
      }
      async function boot() {
        document.documentElement.dataset.theme = local.get(
          "theme",
          matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light",
        );
        restore();
        events();
        store = new Store();
        await store.init((data) => {
          menu = merge(data);
          render();
        });
        route();
        let id = new URLSearchParams(location.search).get("pedido");
        if (id) showTracking(id);
        if ("serviceWorker" in navigator) {
          const hadController = !!navigator.serviceWorker.controller;
          let reloaded = false;
          let reloadTimer = null;
          const reloadWhenSafe = () => {
            if (
              reloaded ||
              !hadController ||
              cart.length > 0 ||
              $("sheet").classList.contains("open")
            ) {
              return;
            }
            reloaded = true;
            clearInterval(reloadTimer);
            location.reload();
          };
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (!hadController || reloaded) return;
            reloadWhenSafe();
            reloadTimer = setInterval(reloadWhenSafe, 500);
          });
          navigator.serviceWorker
            .register("/sw.js", { updateViaCache: "none" })
            .then((registration) => {
              registration.update();
              setInterval(() => registration.update(), 60 * 60 * 1000);
            })
            .catch(() => {});
        }
      }
      document.addEventListener("click", (e) => {
        if (e.target.id === "toastGo")
          document.dispatchEvent(new Event("barrio:cart-open-request"));
      });
      if (
        ["localhost", "127.0.0.1"].includes(location.hostname) &&
        new URLSearchParams(location.search).get("e2e") === "1"
      ) {
        window.__barrio = {
          get menu() { return menu; },
          set menu(value) { menu = value; },
          get cart() { return cart; },
          set cart(value) { cart = value; },
          get store() { return store; },
          render,
          draw,
          openCart,
          closeCart,
          add,
        };
      }
      boot();

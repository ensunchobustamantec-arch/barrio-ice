(function (root) {
  "use strict";

  const SITE_URL = "https://barrio-ice.vercel.app";
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAbHiV6QfffMZBzNlhnQvbFjAWVwhytyqQ",
    authDomain: "barrio-ice.firebaseapp.com",
    projectId: "barrio-ice",
    appId: "1:217758174077:web:11461a142a90e070d11a14",
  };
  const ADMIN_UID = "NDdEIdTQiqMS947ENRr7aEq1i6B3";
  const APP_CHECK_SITE_KEY = "";
  const DEFAULTS = {
    whatsapp: "573023489776",
    domicilio: 3000,
    pagos: { Nequi: "302 348 9776", "Llaves Bre-B": "", Bancolombia: "" },
    instagram: "",
    maps: "",
    horario: { abre: "11:00", cierra: "22:00" },
    cerradaManual: false,
    precios: {
      semana: [12000, 15000, 18000],
      jueves: [12000, 15000, 18000],
      finde: [8000, 12000, 15000],
    },
    bebidas: [
      { n: "Gaseosa", p: 3000, icon: "🥤" },
      { n: "Cerveza", p: 5000, icon: "🍺", adulto: true },
    ],
    combos: [
      {
        n: "Combo parche",
        d: "2 granizados pequeños + gaseosa",
        items: [
          { n: "Granizado sorpresa", s: "Pequeño", p: 8000, g: true },
          { n: "Granizado sorpresa", s: "Pequeño", p: 8000, g: true },
          { n: "Gaseosa", p: 3000 },
        ],
      },
    ],
    cat: [
      { n: "Mora", c: "#9b3fd6" },
      { n: "Limón", c: "#b8e61f" },
      { n: "Maracuyá", c: "#ffb300" },
      { n: "Lulo", c: "#6fd13a" },
      { n: "Mango biche", c: "#cde04b" },
      { n: "Coco", c: "#f2e6cc" },
      { n: "Fresa", c: "#ff4f70" },
      { n: "Smirnoff", c: "#eb3b5a", l: true },
    ],
    dias: {
      1: ["Mora", "Limón", "Maracuyá"],
      2: ["Lulo", "Mango biche", "Coco"],
      3: ["Mora", "Fresa", "Limón"],
      4: ["Maracuyá", "Lulo", "Coco"],
      5: ["Mora", "Mango biche", "Limón", "Fresa"],
      6: ["Maracuyá", "Lulo", "Fresa", "Coco"],
      0: ["Mora", "Limón", "Mango biche", "Coco"],
    },
    agotados: {},
    promos: {
      lunes: true,
      martes: true,
      miercoles: true,
      jueves: false,
      viernes: false,
      sabado: false,
      domingo: false,
    },
    funcionesNuevas: {
      avisosPedido: true,
      seguimiento: true,
      edad18: true,
      dropDia: true,
      armador: true,
      saboresDistintos2x1: true,
      sonidosCliente: true,
      navidad: true,
      sonidoAdmin: true,
    },
    theme: "normal",
    mitadMitad: true,
    promoBanner: "",
    closedMessage:
      "En este momento estamos cerrados. Vuelve en nuestro horario de atención.",
  };

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function now() {
    return new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }),
    );
  }

  function dateKey(date = now()) {
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      }[character];
    });
  }

  function clean(value, max = 300) {
    return String(value ?? "")
      .replace(/[<>\u0000-\u001f]/g, " ")
      .trim()
      .slice(0, max);
  }

  function fmt(value) {
    return "$" + Math.round(Number(value) || 0).toLocaleString("es-CO");
  }

  function mergeMenu(data) {
    const source = data && typeof data === "object" ? data : {};
    const pagos = Object.assign({}, DEFAULTS.pagos, source.pagos || {});
    if (Object.prototype.hasOwnProperty.call(source.pagos || {}, "Daviplata")) {
      if (!String(pagos["Llaves Bre-B"] || "").trim()) {
        pagos["Llaves Bre-B"] = source.pagos.Daviplata || "";
      }
      delete pagos.Daviplata;
    }
    const menu = Object.assign(copy(DEFAULTS), source, {
      pagos,
      horario: Object.assign({}, DEFAULTS.horario, source.horario || {}),
      precios: Object.assign({}, DEFAULTS.precios, source.precios || {}),
      dias: Object.assign({}, DEFAULTS.dias, source.dias || {}),
      agotados: source.agotados || {},
      promos: Object.assign({}, DEFAULTS.promos, source.promos || {}),
      funcionesNuevas: Object.assign({}, DEFAULTS.funcionesNuevas, source.funcionesNuevas || {}),
    });

    if (!menu.precios.jueves) menu.precios.jueves = [...menu.precios.semana];
    menu.mitadMitad = menu.mitadMitad !== false;
    menu.theme = menu.theme === "navidad" ? "navidad" : "normal";
    menu.closedMessage = clean(
      menu.closedMessage || DEFAULTS.closedMessage,
      180,
    );
    menu.promoBanner = clean(menu.promoBanner || "", 180);
    menu.cat = (Array.isArray(menu.cat) ? menu.cat : []).map((flavor) => {
      const adult = Boolean(flavor?.l ?? flavor?.adulto ?? false);
      return Object.assign({ active: true }, flavor, {
        l: adult,
        adulto: adult,
      });
    });
    menu.bebidas = (Array.isArray(menu.bebidas) ? menu.bebidas : []).map(
      (drink) => Object.assign({ active: true, icon: "Vaso" }, drink),
    );
    menu.combos = (Array.isArray(menu.combos) ? menu.combos : []).map(
      (combo) =>
        Object.assign(
          {
            active: true,
            p: (combo.items || []).reduce((sum, item) => sum + (+item.p || 0), 0),
          },
          combo,
        ),
    );
    return menu;
  }

  root.BarrioShared = {
    SITE_URL,
    FIREBASE_CONFIG,
    ADMIN_UID,
    APP_CHECK_SITE_KEY,
    DEFAULTS,
    mergeMenu,
    now,
    dateKey,
    esc,
    clean,
    fmt,
  };
})(window);

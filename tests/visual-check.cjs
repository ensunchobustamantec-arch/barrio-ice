const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const output = path.join(__dirname, "screenshots");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".webmanifest": "application/manifest+json", ".rules": "text/plain" };
const sampleMenu = {
  whatsapp: "573023489776",
  horarios: {},
  horario: { abre: "00:00", cierra: "23:59" },
  precios: { semana: [12000, 15000, 18000], jueves: [12000, 15000, 18000], finde: [8000, 12000, 15000] },
  promos: { lunes: true, martes: true, miercoles: true, jueves: true },
  cat: [{ n: "Mora", c: "#9b3fd6" }, { n: "Limón", c: "#b8e61f" }, { n: "Maracuyá", c: "#ffb300" }, { n: "Lulo", c: "#6fd13a" }],
  dias: { 0: ["Mora", "Limón", "Mango biche"], 1: ["Mora", "Limón", "Maracuyá"], 2: ["Mora", "Limón", "Maracuyá"], 3: ["Mora", "Limón", "Maracuyá"], 4: ["Mora", "Limón", "Maracuyá"], 5: ["Mora", "Limón", "Maracuyá"], 6: ["Mora", "Limón", "Maracuyá"] },
  agotados: {},
  bebidas: [{ n: "Gaseosa", p: 3000, icon: "Vaso" }],
  combos: [{ n: "Combo parche", d: "2 granizados + gaseosa", p: 30000, items: [] }]
};
const sampleOrders = [
  { id: "PEDIDO1", cliente: { nombre: "Ana Prueba", celular: "3001112233" }, entrega: { tipo: "domicilio", direccion: "Cra 5 #10-20", referencia: "Casa azul" }, pago: "Efectivo", conCuanto: 50000, subtotal: 36000, descuento: 18000, domicilio: 0, total: 18000, promo: "Promo 2x1", estado: "Nuevo", fecha: "2026-10-07", creadoEn: { toDate: () => new Date("2026-10-07T23:54:00Z") }, items: [{ n: "Granizado", s: "Grande", sabores: ["Mora"], p: 18000, q: 1, g: true, tipo: "granizado", regalo: false, promo: "", adulto: false }, { n: "Granizado", s: "Grande", sabores: ["Limón"], p: 0, q: 1, g: true, tipo: "granizado", regalo: true, promo: "Promo 2x1", adulto: false, ahorroUnitario: 18000 }] },
  { id: "PEDIDO2", cliente: { nombre: "Cliente Cancelado", celular: "3002223344" }, entrega: { tipo: "recoger" }, pago: "Nequi", subtotal: 12000, descuento: 0, total: 12000, estado: "Cancelado", fecha: "2026-10-07", creadoEn: { toDate: () => new Date("2026-10-07T21:00:00Z") }, items: [] }
];

function firebaseStub(file) {
  if (file === "firebase-app.js") return "export function initializeApp(config){return {config};}";
  if (file === "firebase-auth.js") return `const listeners=[];let current=null;export function getAuth(){return {};}export function onAuthStateChanged(auth,cb){listeners.push(cb);setTimeout(()=>cb(current),0);return ()=>{};}export async function signInWithEmailAndPassword(auth,email){current={uid:"NDdEIdTQiqMS947ENRr7aEq1i6B3",email};listeners.forEach(cb=>cb(current));return {user:current};}export async function signOut(){current=null;listeners.forEach(cb=>cb(null));}`;
  if (file === "firebase-firestore.js") return `const menu=JSON.parse(localStorage.getItem("barrio-ice-visual-menu")||JSON.stringify(${JSON.stringify(sampleMenu)}));const orders=${JSON.stringify(sampleOrders)};orders[0].creadoEn={toDate:()=>new Date("2026-10-07T23:54:00Z")};orders[1].creadoEn={toDate:()=>new Date("2026-10-07T21:00:00Z")};export function getFirestore(){return {};}export function doc(db,...parts){return {path:parts.join("/")};}export function collection(db,...parts){return {path:parts.join("/")};}export function query(){return {query:true};}export function orderBy(){return {};}export function onSnapshot(ref,cb){if(ref.query)cb({docs:orders.map(o=>({id:o.id,data:()=>o}))});else if(ref.path==="tienda/menu")cb({exists:()=>true,data:()=>menu});else cb({exists:()=>false});return ()=>{};}export function serverTimestamp(){return new Date();}export async function addDoc(){return {id:"TEST123"};}export async function setDoc(ref,data){localStorage.setItem("barrio-ice-visual-menu",JSON.stringify(data));}export async function updateDoc(){}`;
  return "";
}

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const file = path.resolve(root, pathname === "/" ? "index.html" : "." + pathname);
  if (!file.startsWith(root + path.sep) && file !== path.join(root, "index.html")) { response.writeHead(403); response.end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404); response.end("Not found"); return; }
    response.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    response.end(data);
  });
});

(async () => {
  await fs.promises.mkdir(output, { recursive: true });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const errors = [];
  try {
    const interceptFirebase = page => page.route("https://www.gstatic.com/firebasejs/**", route => {
      const file = new URL(route.request().url()).pathname.split("/").pop();
      return route.fulfill({ status: 200, contentType: "text/javascript", body: firebaseStub(file) });
    });
    const address = "http://127.0.0.1:" + server.address().port;
    const dimensions = process.env.VISUAL_QUICK === "1" ? [[390, 844]] : [[360, 640], [390, 844], [412, 915], [768, 1024], [1280, 900], [1440, 900]];
    for (const theme of (process.env.VISUAL_QUICK === "1" ? ["light"] : ["light", "dark"])) {
      for (const [width, height] of dimensions) {
        console.log("Tienda", theme, width + "x" + height);
        const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, serviceWorkers: "block" });
        await interceptFirebase(page);
        page.on("pageerror", error => errors.push(error.message));
        await page.addInitScript(themeValue => localStorage.setItem("barrio-ice-theme", JSON.stringify(themeValue)), theme);
        await page.goto(address, { waitUntil: "domcontentloaded" });
        await page.waitForSelector("#promoBannerTitle");
        await page.waitForSelector(".flavor");
        await page.waitForFunction(() => { const logo = document.querySelector(".brand img"); return logo?.complete && logo.naturalWidth > 0; });
        const socialImages = await page.locator('meta[property="og:image"], meta[name="twitter:image"]').evaluateAll(tags => tags.map(tag => tag.content));
        assert.deepEqual(socialImages, ["https://barrio-ice.vercel.app/assets/generated/og-barrio-ice-1200x630.png", "https://barrio-ice.vercel.app/assets/generated/og-barrio-ice-1200x630.png"], "las imágenes sociales deben usar una URL absoluta de producción");
        const measurements = await page.evaluate(() => ({
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          logoTop: document.querySelector(".hero-logo")?.getBoundingClientRect().top,
          headerLogo: (() => { const logo = document.querySelector(".brand img"), box = logo.getBoundingClientRect(); return { height: box.height, ratio: box.width / box.height, naturalRatio: logo.naturalWidth / logo.naturalHeight, right: box.right }; })(),
          brandRight: document.querySelector(".brand")?.getBoundingClientRect().right,
          actionsLeft: document.querySelector(".actions")?.getBoundingClientRect().left,
          actionsRight: document.querySelector(".actions")?.getBoundingClientRect().right,
          titleTop: document.querySelector(".hero h1")?.getBoundingClientRect().top,
          promoTop: document.getElementById("promoBanner")?.getBoundingClientRect().top,
          theme: document.documentElement.dataset.theme,
          promo: document.getElementById("promoBannerTitle")?.textContent,
          tickerStyle: [getComputedStyle(document.querySelector(".ticker")).transform, getComputedStyle(document.querySelector(".ticker span")).transform, getComputedStyle(document.querySelector(".ticker")).overflowX],
          shortButtons: [...document.querySelectorAll("button")].filter(button => { const box = button.getBoundingClientRect(); return box.width > 0 && box.height > 0 && box.height < 44; }).map(button => ({ text: button.innerText, height: Math.round(button.getBoundingClientRect().height) })).slice(0, 8),
          overflow: [...document.querySelectorAll("body *")].map(node => ({ tag: node.tagName, id: node.id, cls: typeof node.className === "string" ? node.className : "", right: Math.round(node.getBoundingClientRect().right), left: Math.round(node.getBoundingClientRect().left) })).filter(node => node.right > innerWidth + 1 || node.left < -1).slice(0, 8)
        }));
        assert.ok(measurements.scrollWidth <= measurements.width, `desbordamiento horizontal en ${width}x${height} (${theme}): ${measurements.scrollWidth}px; ${JSON.stringify(measurements)}`);
        assert.equal(Math.round(measurements.headerLogo.height), width < 700 ? 40 : 52, `altura del logo del header incorrecta en ${width}px`);
        assert.ok(Math.abs(measurements.headerLogo.ratio - measurements.headerLogo.naturalRatio) < 0.05, `el logo debe conservar su proporción en ${width}px`);
        assert.ok(measurements.brandRight <= measurements.actionsLeft + 1, `la marca se cruza con los controles en ${width}px`);
        assert.ok(measurements.actionsRight <= width, `los controles del header se desbordan en ${width}px`);
        assert.ok(measurements.logoTop < measurements.titleTop, "el logo debe quedar arriba del titular");
        assert.ok(measurements.promoTop < height, `la promo del día debe verse sin desplazarse en ${width}x${height}: ${JSON.stringify(measurements)}`);
        assert.equal(measurements.theme, theme);
        assert.deepEqual(measurements.shortButtons, [], `todos los botones deben medir al menos 44 px (${width}x${height})`);
        const titleFits = await page.locator(".hero h1").evaluate(node => node.scrollWidth <= node.clientWidth + 1);
        assert.ok(titleFits, `el titular debe caber en ${width}x${height}`);
        if (width === 390 && height === 844) {
          await page.evaluate(() => { if (document.getElementById("sheet").classList.contains("open")) closeCart(); });
          await page.screenshot({ path: path.join(output, "tienda-movil-" + theme + ".jpg"), type: "jpeg", quality: 76 });
          await page.getByRole("button", { name: /Pequeño/ }).first().click();
          console.log("Línea agregada desde la tienda, verificando carrito");
          const cartState = await page.evaluate(() => ({ lines: typeof cart === "undefined" ? "no cart" : cart.length, total: document.getElementById("fabTotal")?.textContent, toast: document.getElementById("toast")?.textContent, ready: typeof store === "undefined" ? "no store" : store.ready }));
          assert.ok(cartState.lines > 0, "agregar desde una tarjeta debe actualizar el carrito: " + JSON.stringify(cartState));
          await page.getByRole("button", { name: /Mi pedido/ }).click();
          await page.getByText("Subtotal", { exact: true }).waitFor({ timeout: 5000 });
          const cartText = await page.locator("#summary").innerText();
          assert.match(cartText, /Ahorro por promo/);
          assert.match(cartText, /Se paga aparte/);
          assert.match(await page.locator("#lines").innerText(), /REGALO 2x1/);
          await page.locator("[data-gift-flavor]").first().selectOption("Limón");
          assert.match(await page.locator("#lines").innerText(), /Granizado de Limón/);
          await page.locator("#cash").fill("10000");
          assert.equal(await page.locator("#cashChange").innerText(), "");
          await page.locator("#cash").fill("15000");
          assert.match(await page.locator("#cashChange").innerText(), /Cambio para devolver/);
        }
        if (width === 1440 && height === 900) {
          await page.evaluate(() => { if (document.getElementById("sheet").classList.contains("open")) closeCart(); });
          await page.screenshot({ path: path.join(output, "tienda-escritorio-" + theme + ".jpg"), type: "jpeg", quality: 76 });
        }
        await page.close();
      }
    }
    for (const theme of (process.env.VISUAL_QUICK === "1" ? ["light"] : ["light", "dark"])) {
      for (const [label, viewport] of (process.env.VISUAL_QUICK === "1" ? [["movil", { width: 390, height: 844 }]] : [["movil", { width: 390, height: 844 }], ["escritorio", { width: 1440, height: 900 }]])) {
        console.log("Panel", theme, label);
        const page = await browser.newPage({ viewport, deviceScaleFactor: 1, serviceWorkers: "block" });
        await interceptFirebase(page);
        page.on("pageerror", error => errors.push(error.message));
        await page.addInitScript(themeValue => localStorage.setItem("barrio-ice-theme", JSON.stringify(themeValue)), theme);
        await page.goto(address + "/#admin", { waitUntil: "domcontentloaded" });
        await page.getByLabel("Correo").fill("dueno@example.com");
        await page.getByLabel("Contraseña").fill("prueba");
        await page.getByRole("button", { name: "Entrar" }).click();
        try { await page.getByRole("heading", { name: "Estado de la tienda" }).waitFor({ timeout: 7000 }); }
        catch { throw new Error("No abrió el panel: " + JSON.stringify({ state: await page.evaluate(() => { try { adminRender(); return { error: document.getElementById("loginError")?.textContent, welcome: document.getElementById("welcome")?.textContent, storeReady: typeof store === "undefined" ? null : store.ready, visible: document.getElementById("login")?.className, panel: document.getElementById("panel")?.className, view: document.getElementById("adminView")?.innerText?.slice(0, 400) }; } catch (error) { return { error: String(error), stack: error.stack }; } }), pageErrors: errors })); }
        await page.screenshot({ path: path.join(output, "panel-" + label + "-" + theme + ".jpg"), type: "jpeg", quality: 76 });
        assert.equal(await page.locator("#login .notice").count(), 0, "el aviso retirado no debe reaparecer en el login");
        assert.equal((await page.locator(".admin-top h1").innerText()).replace(/\s+/g, " ").trim(), "Panel del barrio");
        await page.getByRole("button", { name: "MENÚ" }).click();
        await page.getByRole("heading", { name: "Catálogo de sabores" }).waitFor();
        await page.getByRole("button", { name: "PEDIDOS" }).click();
        await page.getByText("REGALO 2x1", { exact: false }).first().waitFor();
        if (theme === "light" && label === "movil") {
          const flavorName = "Tequila de prueba";
          await page.getByRole("button", { name: "MENÚ" }).click();
          await page.locator("#newFlavorName").fill(flavorName);
          await page.locator("#newFlavorAdult").check();
          await page.locator("#addFlavorV4").click();
          await page.locator("#saveCatalogV4").click();
          await page.getByText("Guardado correctamente.", { exact: true }).last().waitFor();
          const persistedAdult = await page.evaluate(() => JSON.parse(localStorage.getItem("barrio-ice-visual-menu") || "{}").cat?.find(item => item.n === "Tequila de prueba")?.l);
          assert.equal(persistedAdult, true, "+18 debe incluirse en el objeto guardado en Firestore (simulado)");
          await page.reload({ waitUntil: "domcontentloaded" });
          await page.waitForFunction(() => typeof store !== "undefined" && store.ready);
          await page.waitForFunction(() => menu.cat.some(item => item.n === "Tequila de prueba"));
          const loadedAdult = await page.evaluate(() => ({ value: menu.cat.find(item => item.n === "Tequila de prueba")?.l, names: menu.cat.map(item => item.n), saved: localStorage.getItem("barrio-ice-visual-menu")?.slice(0, 180) }));
          assert.equal(loadedAdult.value, true, "+18 debe leerse desde el menú guardado tras recargar: " + JSON.stringify(loadedAdult));
          await page.evaluate(() => startAdmin({ uid: CFG.adminUid, email: "dueno@example.com" }));
          try { await page.getByRole("heading", { name: "Estado de la tienda" }).waitFor({ timeout: 7000 }); }
          catch { throw new Error("El panel no abrió tras recargar: " + JSON.stringify({ error: await page.locator("#loginError").textContent().catch(() => ""), login: await page.locator("#login").getAttribute("class").catch(() => ""), panel: await page.locator("#panel").getAttribute("class").catch(() => ""), view: await page.locator("#adminView").innerText().catch(() => ""), pageErrors: errors })); }
          await page.getByRole("button", { name: "MENÚ" }).click();
          const ageState = () => page.locator("[data-cat-name]").evaluateAll(inputs => {
            const name = inputs.find(input => input.value === "Tequila de prueba");
            return name?.closest(".editable-row")?.querySelector("[data-cat-adult]")?.checked ?? null;
          });
          assert.equal(await ageState(), true, "+18 debe seguir marcado tras guardar y recargar");
          const flavorIndex = await page.locator("[data-cat-name]").evaluateAll(inputs => inputs.findIndex(input => input.value === "Tequila de prueba"));
          await page.locator(`[data-cat-adult="${flavorIndex}"]`).uncheck();
          await page.locator("#saveDayMenu").click();
          await page.getByText("Guardado correctamente.", { exact: true }).last().waitFor();
          assert.equal(await ageState(), false, "Guardar sabores debe persistir el cambio de edad del catálogo");
          await page.locator(`[data-cat-adult="${flavorIndex}"]`).check();
          await page.locator("#saveCatalogV4").click();
          await page.getByText("Guardado correctamente.", { exact: true }).last().waitFor();
          await page.locator(`[data-v4-flavor="${flavorName}"]`).click();
          await page.locator("#saveDayMenu").click();
          await page.getByText("Guardado correctamente.", { exact: true }).last().waitFor();
          await page.goto(address, { waitUntil: "domcontentloaded" });
          const flavorCard = page.locator(".flavor").filter({ hasText: flavorName });
          await flavorCard.waitFor();
          assert.match(await flavorCard.locator(".tag.adult").innerText(), /\+18/);
          await flavorCard.locator(`[data-flavor="${flavorName}"]`).first().click();
          await page.getByRole("button", { name: /Mi pedido/ }).click();
          assert.equal(await page.locator("#ageBox").isVisible(), true, "el pedido +18 debe exigir confirmación de edad");
          await page.locator("#name").fill("Cliente Prueba");
          await page.locator("#phone").fill("3001234567");
          await page.locator("#delivery").selectOption("recoger");
          await page.locator("#cash").fill("15000");
          await page.locator("#send").click();
          assert.match(await page.locator("#checkoutError").innerText(), /Confirma que eres mayor de 18 años/);
        }
        await page.close();
      }
    }
    assert.deepEqual(errors, [], "la página no debe generar errores de JavaScript");
    console.log(`Comprobación visual headless: ${dimensions.length} tamaños × ${(process.env.VISUAL_QUICK === "1" ? 1 : 2)} temas; panel autenticado; capturas guardadas en tests/screenshots.`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});


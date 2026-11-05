# CODEX-TASK · Barrio Ice v5
**Logo nuevo · Panel de administración como app aparte (PWA) · Corrección de los 7 problemas detectados**

> **Cómo usar este archivo.** Cópialo al repositorio como `CODEX-TASK.md` (o pégalo completo en Codex) y dile a Codex:
> *"Lee `CODEX-TASK.md` completo. Ejecuta las fases en orden (0 → 8). Un commit por paso, un PR al final. No te saltes ninguna verificación. Si algo no coincide con lo que dice este documento, detente y repórtalo antes de improvisar."*

---

## 0. Rol, repo y reglas de trabajo

**Rol:** ingeniero senior front-end/Firebase. Trabajas directamente sobre el repositorio `ensunchobustamantec-arch/barrio-ice` (GitHub) desplegado en Vercel (`https://barrio-ice.vercel.app`). Idioma de todo texto visible al usuario: **español de Colombia**. Moneda COP. Zona horaria `America/Bogota`.

**Reglas inviolables**

1. **Nunca trabajes sobre `main`.** Crea la rama `v5-logo-admin-seguridad` desde `main` y abre **un PR** al terminar. No hagas merge.
2. **No cambies la lógica de precios ni de promociones.** `pricing.js` es la fuente de verdad (2x1 lun–mié, 3x2 jueves, fin de semana sin promo; solo granizados del mismo tamaño y precio). Si lo tocas, rompes el negocio.
3. **No inventes datos del negocio** (dirección, Instagram, horarios, teléfono). Si falta un dato, déjalo como configurable o como `TODO(dueño)` y lístalo en el PR.
4. **Sin secretos en el repo.** La configuración web de Firebase y el UID del dueño son públicos por diseño; cualquier otra clave (service accounts, tokens) está prohibida en git.
5. **Sin frameworks y sin build** salvo el script mínimo de la Fase 1. Se mantiene HTML/CSS/JS estático. Compatibilidad: Android Chrome 90+ y Safari 14+ (el código ya usa `?.` y `??`; no uses sintaxis posterior ni `:has()` sin alternativa).
6. **Un commit por paso**, mensaje en formato `fase-N: descripción`. Después de cada fase corre las pruebas (sección 12). Si fallan, arréglalas antes de continuar.
7. **No subas `node_modules`**, capturas temporales ni archivos de `tests/test-results/`.
8. **Cambios en `firestore.rules` se despliegan por pasos** (sección 9). Nunca asumas que las reglas nuevas ya están publicadas.

---

## 1. Contexto verificado del proyecto (commit base `039e9e4`)

Estos hechos fueron verificados leyendo el código. **Si al abrir el repo algo difiere, repórtalo.**

| Hecho | Detalle |
|---|---|
| Stack | HTML + CSS + JS puro, sin build. Firebase 10.12.2 (Auth + Firestore) cargado desde `gstatic.com`. Vercel sirve la raíz. |
| Archivos de código | `index.html` (60 KB, **12 líneas de más de 1.500 caracteres**, JS y CSS en línea), `enhancements.js` (1.071 líneas), `enhancements.css`, `pricing.js` (UMD, usable en Node), `sw.js`, `manifest.webmanifest`, `firestore.rules`. |
| **Capas que se pisan** | `index.html` define la lógica base y `enhancements.js` la **reasigna**: `merge`, `plan`, `openNow`, `totals`, `render`, `addFlavor`, `addCombo`, `addDrink`, `add`, `orderMessage`, `showTracking`, `adminRender` (**definida dos veces**, líneas 680 y 1053; gana la segunda). También captura `baseMerge`, `baseRender`, `baseAdd`. |
| **Envío de pedidos real** | `boot()` se ejecuta al final del script en línea (antes de que cargue `enhancements.js`) y asigna `checkout.onsubmit = send`. Después `enhancements.js` (línea ~417) hace `checkout.onsubmit = sendOrder`. **Gana `sendOrder` (enhancements.js, línea 361)**, no `send` de `index.html`. `sendOrder` guarda las líneas de regalo (`regalo:true`, `p:0`). Editar `send()` de `index.html` **no tiene efecto**. |
| Cálculo | `totals = () => BarrioIcePricing.calculate(cart, day, menu)`. En el pedido: `total` = lo pagado, `subtotal = total + descuento`, `domicilio = 0` siempre. |
| Panel admin hoy | Sección `#admin` dentro de `index.html`, ruta `/#admin`. El HTML del panel es mínimo; el contenido lo pinta JS. `enhancements.js` reconstruye las pestañas (por eso el README dice HOY/PEDIDOS/MENÚ/VENTAS/AJUSTES y el panel en vivo muestra otras). |
| Seguridad actual | `pedidos`: `create` con validación de forma, `get` público, `list/update/delete` solo dueño (UID `NDdEIdTQiqMS947ENRr7aEq1i6B3`). **El `total` solo se valida entre 0 y 2.000.000; no hay App Check ni límite de frecuencia.** |
| Service worker | `CACHE = 'barrio-ice-v5'` sin cambiar en 9 commits. HTML en red-primero; **JS/CSS en caché-primero** (`caches.match(...) \|\| fetch`). Resultado: clientes pueden mezclar `index.html` nuevo con `enhancements.js` viejo. |
| Ausentes | `vercel.json`, `.gitignore`, `robots.txt`, `sitemap.xml`, `og:url`, canonical, datos estructurados. |
| Defaults genéricos | `CFG.defaults.instagram = "https://instagram.com/"` y `maps = "https://maps.google.com/?q=Montería, Colombia"`. Pueden estar así en producción. |
| Título | `<h1><span>BARRIO</span><span>ICE</span></h1>`: visualmente bien (`display:block`) pero el texto plano es "BARRIOICE". |
| Ramas remotas | `ajustes-logo-admin-adultos`, `animaciones-impactantes-barrio-ice`, `diseno-dinamico-barrio-ice`, `hero-grid-motion-barrio-ice`, `mejoras-v2`, `mejoras-v3`, `mejoras-v4`, `respaldo-antes-hero-motion-20261008`. |

**Mapa de lo que se pidió → fase**

| # | Problema | Fase |
|---|---|---|
| 1 | Service worker sirve versiones viejas | **1** |
| 2 | Código en capas que se pisan | **5** (apoyada en la 3) |
| 3 | Pedidos falsos / totales no verificados | **4** (A, B, C) |
| 4 | Seguimiento expone nombre, celular y dirección | **4** (D) |
| 5 | Falta config de Vercel, robots, sitemap, og:url, datos estructurados | **1** y **6** |
| 6 | Falta `.gitignore` | **0** |
| 7 | Detalles menores (título, capturas, barra inferior, PNG pesados, ramas) | **7** |
| — | Logo nuevo con más diseño | **2** |
| — | Panel admin como app aparte (PWA) | **3** |
| — | "Lo que no se pudo ver" (Vercel, Firestore, render en vivo) | **8** |

---

## 2. Insumos que deben existir antes de empezar

La carpeta **`assets/brand/`** ya debe estar en el repo (el dueño la sube desde `barrio-ice-brand-assets.zip`). **Verifica que existan estos archivos; si falta alguno, detente y avisa:**

```
assets/brand/
  logo-light.webp  logo-light.png      ← logo completo (cubo + BARRIO ICE + COLD FLOW), fondo transparente, para tema claro
  logo-dark.webp   logo-dark.png       ← ídem, versión neón para tema oscuro
  logo-mark-light.webp / .png          ← solo el cubo (header, pie, tracker)
  logo-mark-dark.webp  / .png
  icon-192.png  icon-512.png  icon-maskable-512.png  apple-touch-icon.png   ← app de CLIENTES (fondo azul noche)
  icon-admin-192.png  icon-admin-512.png  icon-admin-maskable-512.png  apple-touch-icon-admin.png   ← app del PANEL (fondo amarillo)
  favicon-32.png  favicon-48.png
  og-barrio-ice-1200x630.png  og-barrio-ice-1200x630.jpg
  logo-hotspots.json                   ← coordenadas (%) de ventanas y destello para animar
  source-logo-doble-estilo.png         ← original de referencia (no se sirve al público)
```

Tamaño nativo de los logos: **625 × 970 px**. Si el dueño entrega una versión de mayor resolución en el futuro, basta con reemplazar los archivos manteniendo nombres y proporción.

---

## FASE 0 · Preparación (resuelve el punto 6)

**0.1** `git fetch --all --prune && git checkout main && git pull`. Verifica que `git rev-parse --short HEAD` sea `039e9e4` (o posterior; si es posterior, repórtalo).
**0.2** Crea la etiqueta de respaldo y la rama de trabajo:
```bash
git tag backup-main-039e9e4 && git push origin backup-main-039e9e4
git checkout -b v5-logo-admin-seguridad
```
**0.3** Crea `.gitignore` en la raíz:
```gitignore
node_modules/
tests/node_modules/
tests/test-results/
tests/.tmp/
.vercel/
.env
.env.*
*.log
.DS_Store
Thumbs.db
.firebase/
firebase-debug.log
```
**0.4** Si algún archivo ignorado ya está versionado: `git rm -r --cached <ruta>`.
**0.5** Crea `.vercelignore` (evita publicar pruebas y documentos):
```
tests
docs
README.md
CODEX-TASK.md
firebase.json
.firebaserc
firestore.rules
firestore.rules.transition
```
**0.6 Línea base de pruebas** antes de tocar nada:
```bash
cd tests && npm ci || npm install
npx playwright install chromium
npm test            # guarda el resultado
cd ..
```
Anota en el PR qué pasaba/fallaba **antes** de tus cambios.
**0.7 Formato sin cambios de comportamiento:** formatea `index.html`, `enhancements.js`, `enhancements.css` con Prettier para que no haya líneas de miles de caracteres (`npx prettier --write index.html enhancements.js enhancements.css`). Commit aparte: `fase-0: formato (sin cambios de comportamiento)`. Verifica con `npm test` que nada cambió.

**Verificación fase 0:** `git status` limpio, `.gitignore` efectivo (`git check-ignore tests/node_modules` imprime la ruta), pruebas igual que la línea base.

---

## FASE 1 · Service worker, caché y Vercel (resuelve el punto 1 y parte del 5)

**Objetivo:** que ningún cliente pueda quedarse con JS/CSS viejos, que cada despliegue invalide la caché automáticamente y que Vercel envíe cabeceras de seguridad.

### 1.1 Script que estampa la versión en cada despliegue
Crea `scripts/stamp-version.mjs`:
```js
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const id = (process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now())).slice(0, 10);
for (const file of ['sw.js', 'admin/sw.js']) {
  if (!existsSync(file)) continue;               // admin/sw.js existe a partir de la fase 3
  const src = readFileSync(file, 'utf8');
  if (!src.includes('__BUILD_ID__')) throw new Error(`${file}: falta el marcador __BUILD_ID__`);
  writeFileSync(file, src.replaceAll('__BUILD_ID__', id));
}
console.log('BUILD_ID =', id);
```

### 1.2 `vercel.json`
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "node scripts/stamp-version.mjs",
  "outputDirectory": ".",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains" },
        { "key": "Content-Security-Policy-Report-Only", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaseappcheck.googleapis.com https://www.google.com; frame-src https://www.google.com https://barrio-ice.firebaseapp.com; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" }
      ]
    },
    {
      "source": "/(sw\\.js|admin/sw\\.js)",
      "headers": [ { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" } ]
    },
    {
      "source": "/(.*)\\.(html|js|css|webmanifest|json)",
      "headers": [ { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" } ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [ { "key": "Cache-Control", "value": "public, max-age=86400, stale-while-revalidate=604800" } ]
    },
    {
      "source": "/admin/(.*)",
      "headers": [
        { "key": "X-Robots-Tag", "value": "noindex, nofollow, noarchive" },
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    }
  ]
}
```
**CSP:** va en modo *Report-Only* a propósito. Abre el sitio en Playwright, captura la consola y confirma que **no hay violaciones** (tienda, seguimiento y, desde la fase 3, el panel). Solo entonces renómbrala a `Content-Security-Policy` en un commit separado. Si hay violaciones, ajusta la lista de orígenes, no uses `*`.

### 1.3 Nuevo `sw.js` de la tienda
Reemplaza el archivo por completo. Las rutas de `SHELL` deben ajustarse a los archivos reales tras la fase 5 (agrega una prueba que verifique que **cada URL de `SHELL` responde 200**).
```js
/* Barrio Ice · service worker de la TIENDA (el panel tiene el suyo en /admin/sw.js) */
const BUILD = '__BUILD_ID__';                         // lo reemplaza scripts/stamp-version.mjs
const VERSION = BUILD.startsWith('__') ? 'dev' : BUILD;
const CACHE_SHELL = `bi-shell-${VERSION}`;
const CACHE_IMG = `bi-img-${VERSION}`;
const SHELL = [
  '/', '/index.html', '/manifest.webmanifest',
  '/pricing.js', '/shared/menu-schema.js', '/enhancements.js', '/enhancements.css',
  '/assets/brand/icon-192.png', '/assets/brand/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_SHELL).then(cache =>
    Promise.all(SHELL.map(url => cache.add(new Request(url, { cache: 'reload' }))))));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([CACHE_SHELL, CACHE_IMG]);
    for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });

async function networkFirst(request, cacheName, timeout = 4000) {
  const cache = await caches.open(cacheName);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    const response = await fetch(request, { signal: ctrl.signal, cache: 'no-cache' });
    clearTimeout(timer);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request)) || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(response => { if (response.ok) cache.put(request, response.clone()); return response; })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;       // Firebase, Fonts, gstatic: directo a la red
  if (url.pathname.startsWith('/admin/')) return;        // el panel se gestiona aparte

  if (request.mode === 'navigate') {                     // HTML siempre fresco; sin red → último HTML
    event.respondWith(networkFirst(request, CACHE_SHELL).then(r => (r.type === 'error' ? caches.match('/index.html') : r)));
    return;
  }
  if (['script', 'style', 'manifest'].includes(request.destination) || url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(request, CACHE_SHELL));     // JS/CSS consistentes con el HTML
    return;
  }
  if (['image', 'font'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_IMG));
  }
});
```
**Cambio clave:** JS/CSS pasan de *caché-primero* a *red-primero con respaldo en caché*. Eso elimina la mezcla de versiones.

### 1.4 Registro del service worker en la página (reemplaza el actual en `boot()`)
```js
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;              // no recargar en la primera instalación
    reloaded = true;
    location.reload();                                   // una sola vez, con la versión nueva
  });
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(reg => {
    reg.update();
    setInterval(() => reg.update(), 60 * 60 * 1000);
  }).catch(() => {});
}
```
Cuidado: no recargar si hay un pedido a medias (carrito con ítems o `#sheet` abierto). Si `cart.length > 0`, difiere la recarga hasta que el carrito se vacíe o se cierre la hoja.

### 1.5 `robots.txt` y `sitemap.xml`
`robots.txt` (el panel se oculta con `noindex`, **no** con `Disallow`, para que los buscadores puedan leer el `noindex`):
```
User-agent: *
Allow: /

Sitemap: https://barrio-ice.vercel.app/sitemap.xml
```
`sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://barrio-ice.vercel.app/</loc><lastmod>2026-11-05</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>
```
Define una única constante `SITE_URL` (en `shared/menu-schema.js`, fase 3) para no repetir el dominio; si el dueño compra un dominio propio, solo cambia ahí y en estos dos archivos.

**Verificación fase 1**
- Prueba Playwright: carga la tienda, cambia el contenido servido de `enhancements.js`, recarga y confirma que se obtiene el contenido **nuevo** (no el de caché).
- `curl -sI https://<preview>/sw.js` → `cache-control: no-cache, no-store, must-revalidate`.
- `curl -sI https://<preview>/` → cabeceras de seguridad presentes.
- Tras el despliegue de la vista previa, el `VERSION` dentro del `sw.js` servido **no** es `dev` ni contiene `__BUILD_ID__`.
- Commits: `fase-1: service worker red-primero y versión por despliegue`, `fase-1: vercel.json, robots y sitemap`.

---

## FASE 2 · Logo nuevo y más diseño (hero, header, pie, PWA)

**Objetivo:** reemplazar **todo** logo viejo por la marca nueva y convertir el hero en una escena viva, sin perder rendimiento.

### 2.1 Inventario y reemplazo
Ejecuta `grep -rnE "logo-transparent|logo-dark|logo-mark|icon-(192|512|maskable)|apple-touch-icon|favicon-32|og-barrio|assets/logo.jpg|assets/generated" --include=* . --exclude-dir=node_modules --exclude-dir=.git` y reemplaza según esta tabla:

| Dónde | Antes | Ahora |
|---|---|---|
| Header (`.brand img`) | `logo-mark-transparent.png` | `<img data-brand="logo-mark" width="40" height="35">` |
| Hero (centro) | `logo-transparent.png` en `.art` | **Escena nueva** (2.3) |
| Pie y página de seguimiento | `logo-transparent.png` | `data-brand="logo"` (pie: `logo-mark`) |
| Favicon / apple-touch | `assets/generated/*` | `assets/brand/favicon-32.png`, `favicon-48.png`, `apple-touch-icon.png` |
| `manifest.webmanifest` | iconos viejos | `assets/brand/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` |
| `og:image` / `twitter:image` | `og-barrio-ice-1200x630.png` (generated) | `https://barrio-ice.vercel.app/assets/brand/og-barrio-ice-1200x630.jpg` |
| `sw.js` SHELL | rutas `generated` | rutas `brand` |
| `tests/` | referencias a logos | actualizar |

Al terminar, **elimina** `assets/generated/` y `assets/logo.jpg` **solo si el grep ya no encuentra referencias**.
Elimina también la regla CSS que pone fondo claro al logo en modo oscuro (`:root[data-theme=dark] .art img, ... {background:#edf9ff; padding:10px; border-radius:22px}` y `.footer img{...}`): el logo nuevo es transparente y ya trae su versión oscura.

### 2.2 Cambio de logo por tema sin descargar dos imágenes
El tema se controla con `data-theme` en `<html>` (no solo con `prefers-color-scheme`). Para evitar bajar claro y oscuro a la vez:

**a)** En `<head>`, **antes** de cualquier CSS, fija el tema temprano:
```html
<script>
  (function () {
    try {
      var saved = JSON.parse(localStorage.getItem('barrio-ice-theme'));
      var theme = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.dataset.theme = theme;
    } catch (e) { document.documentElement.dataset.theme = 'light'; }
  })();
</script>
```
**b)** Todas las imágenes de marca llevan `data-brand` y **sin** `src` real (un GIF transparente de 1 px evita el icono roto):
```html
<img data-brand="logo" class="hero-logo" width="625" height="970"
     src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Barrio Ice · Cold Flow">
```
**c)** Script único (en `enhancements.js` o `motion.js`) que asigna el archivo correcto y reacciona al cambio de tema:
```js
(function () {
  function applyBrandTheme() {
    var theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    document.querySelectorAll('img[data-brand]').forEach(function (img) {
      var next = '/assets/brand/' + img.dataset.brand + '-' + theme + '.webp';
      if (img.getAttribute('src') !== next) img.setAttribute('src', next);
    });
  }
  new MutationObserver(applyBrandTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  applyBrandTheme();
})();
```
Usa `.webp` (más liviano). Si necesitas respaldo, usa el `.png` con `onerror`.

### 2.3 Hero rediseñado ("un poquito más de diseño")
**Decisiones de diseño (el dueño puede revertirlas):**
- El logo nuevo **ya incluye** "BARRIO ICE · COLD FLOW" en grande. Para no duplicar el texto, el `<h1>` visible desaparece y pasa a ser **solo para lectores de pantalla y buscadores**: `<h1 class="sr-only">Barrio Ice · Granizados en Montería</h1>`. Esto además **corrige el "BARRIOICE"** (punto 7). Define `.sr-only` (clip 1 px, `position:absolute`).
- Orden en móvil: estado ("Abierto ahora") → **logo** → texto → botones. En escritorio (≥ 900 px): texto a la izquierda, escena a la derecha.
- Elimina el `.art` y el `installHero()` antiguos y reemplázalos por esta escena.

**Estructura (generada por JS, `buildHeroStage()`):**
```js
// Coordenadas en % del logo completo (625×970). Fuente: assets/brand/logo-hotspots.json
const HERO_WINDOWS = [
  {left:37.28,top:43.71,width:1.44,height:1.55},{left:38.24,top:45.77,width:1.44,height:1.55},
  {left:58.24,top:37.63,width:1.92,height:1.86},{left:60.0,top:40.41,width:1.6,height:1.65},
  {left:60.8,top:44.74,width:1.92,height:2.06},{left:71.2,top:41.55,width:0.96,height:1.34},
  {left:73.12,top:41.55,width:1.44,height:1.86}
];
const HERO_SPARK = { left: 78.88, top: 16.19 };

function buildHeroStage() {
  const hero = document.querySelector('.hero');
  if (!hero || hero.querySelector('#heroStage')) return;
  const stage = document.createElement('div');
  stage.id = 'heroStage';
  stage.className = 'hero-stage';
  stage.innerHTML = `
    <div class="hero-aura" aria-hidden="true"></div>
    <span class="hero-ring hero-ring-a" aria-hidden="true"></span>
    <span class="hero-ring hero-ring-b" aria-hidden="true"></span>
    <div class="hero-logo-wrap">
      <img class="hero-logo" data-brand="logo" width="625" height="970" decoding="async" fetchpriority="high"
           src="data:image/gif;base64,R0lGODlhAQABAAAAACw="
           alt="Barrio Ice Cold Flow: cubo de hielo con la silueta del barrio">
      <span class="hero-spark" aria-hidden="true" style="left:${HERO_SPARK.left}%;top:${HERO_SPARK.top}%"></span>
      ${HERO_WINDOWS.map((w, i) => `<i class="hero-win" aria-hidden="true"
        style="left:${w.left}%;top:${w.top}%;width:${w.width}%;height:${w.height}%;--o:${(i * 0.7).toFixed(1)}s;--d:${(4 + (i % 3) * 1.3).toFixed(1)}s"></i>`).join('')}
    </div>
    ${['a','b','c','d','e','f'].map(k => `<span class="hero-shard hero-shard-${k}" aria-hidden="true"></span>`).join('')}`;
  hero.querySelector('.hero-copy')?.after(stage);
  applyBrandTheme();                                   // función de 2.2
  setupHeroMotion(stage);
}
```
**CSS (agrega a `enhancements.css`; ajusta valores viendo capturas, pero respeta la intención):**
```css
.sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

.hero-stage{position:relative;display:grid;place-items:center;width:min(86vw,380px);margin:8px auto 0;isolation:isolate}
.hero-logo-wrap{position:relative;width:100%;aspect-ratio:625/970;
  transform:perspective(900px) rotateY(var(--tx,0deg)) rotateX(var(--ty,0deg));transition:transform .25s ease-out;
  animation:heroBob 7s ease-in-out infinite}
.hero-logo{display:block;width:100%;height:100%;object-fit:contain;
  filter:drop-shadow(0 18px 28px rgb(30 140 255 / .28))}
:root[data-theme=dark] .hero-logo{filter:drop-shadow(0 0 34px rgb(60 160 255 / .5))}

.hero-aura{position:absolute;z-index:-2;inset:-8% -34%;pointer-events:none;
  background:radial-gradient(closest-side,rgb(91 192 235 / .42),rgb(91 192 235 / 0) 72%);
  animation:heroAura 6s ease-in-out infinite}
.hero-ring{position:absolute;z-index:-1;left:50%;top:34%;translate:-50% -50%;border-radius:50%;
  border:1px solid rgb(91 192 235 / .5);pointer-events:none}
.hero-ring-a{width:92%;aspect-ratio:1;animation:heroRing 9s linear infinite}
.hero-ring-b{width:122%;aspect-ratio:1;border-style:dashed;opacity:.5;animation:heroRing 16s linear infinite reverse}

.hero-spark{position:absolute;width:38%;aspect-ratio:1;translate:-50% -50%;pointer-events:none;mix-blend-mode:screen;opacity:0;
  background:
    radial-gradient(circle,#fff 0 5%,rgb(255 255 255 / 0) 22%),
    linear-gradient(90deg,transparent 42%,#fff 50%,transparent 58%),
    linear-gradient(0deg,transparent 42%,#fff 50%,transparent 58%);
  animation:heroSpark 4.6s ease-in-out infinite}

.hero-win{position:absolute;border-radius:1px;background:#ffb53d;mix-blend-mode:screen;opacity:0;
  box-shadow:0 0 .7em .12em rgb(255 170 40 / .9);animation:heroWin var(--d,5s) linear infinite;animation-delay:var(--o,0s)}

.hero-shard{position:absolute;width:var(--s,20px);aspect-ratio:.7;opacity:.85;pointer-events:none;
  background:linear-gradient(135deg,#fff,#9be3ff 42%,#2aa8ff);
  clip-path:polygon(50% 0,100% 36%,80% 100%,20% 100%,0 36%);
  filter:drop-shadow(0 0 8px rgb(91 192 235 / .9));
  animation:heroShard var(--t,7s) ease-in-out infinite alternate;animation-delay:var(--dl,0s)}
.hero-shard-a{left:-4%;top:36%;--s:22px;--t:6s;--r:-18deg}
.hero-shard-b{left:6%;top:60%;--s:14px;--t:8s;--dl:-2s;--r:12deg}
.hero-shard-c{right:-3%;top:30%;--s:18px;--t:7s;--dl:-1s;--r:20deg}
.hero-shard-d{right:2%;top:58%;--s:24px;--t:9s;--dl:-3s;--r:-10deg}
.hero-shard-e{left:22%;top:8%;--s:12px;--t:5.5s;--dl:-1.5s;--r:8deg}
.hero-shard-f{right:20%;top:70%;--s:12px;--t:6.5s;--dl:-4s;--r:-22deg}

@keyframes heroBob{50%{translate:0 -10px}}
@keyframes heroAura{50%{opacity:.65;scale:1.06}}
@keyframes heroRing{to{rotate:360deg}}
@keyframes heroSpark{0%,68%,100%{opacity:0;scale:.35;rotate:0deg}76%{opacity:1;scale:1}86%{opacity:.55;scale:.8;rotate:45deg}}
@keyframes heroWin{0%,100%{opacity:.35}18%{opacity:.95}22%{opacity:.5}26%{opacity:.95}62%{opacity:.8}66%{opacity:.25}70%{opacity:.9}}
@keyframes heroShard{from{transform:translate3d(0,0,0) rotate(var(--r,0deg))}to{transform:translate3d(6px,-16px,0) rotate(calc(var(--r,0deg) + 18deg))}}

.hero-stage.is-offscreen *{animation-play-state:paused!important}
@media (prefers-reduced-motion:reduce){
  .hero-stage *{animation:none!important;transition:none!important}
  .hero-win{opacity:.8}
}
@media (min-width:900px){
  .hero{display:grid;grid-template-columns:1.05fr .95fr;align-items:center;gap:40px}
  .hero-stage{width:min(36vw,420px);margin:0 auto}
}
```
**Movimiento con JS (`setupHeroMotion`):**
```js
function setupHeroMotion(stage) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window) {                      // pausa fuera de pantalla
    new IntersectionObserver(([e]) => stage.classList.toggle('is-offscreen', !e.isIntersecting), { threshold: 0.05 }).observe(stage);
  }
  if (reduced || !matchMedia('(pointer: fine)').matches) return;   // inclinación solo con mouse
  const wrap = stage.querySelector('.hero-logo-wrap');
  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    wrap.style.setProperty('--tx', (x * 10).toFixed(2) + 'deg');
    wrap.style.setProperty('--ty', (-y * 8).toFixed(2) + 'deg');
  });
  stage.addEventListener('pointerleave', () => { wrap.style.setProperty('--tx', '0deg'); wrap.style.setProperty('--ty', '0deg'); });
}
```
**Criterios de aceptación del hero:** las animaciones son sutiles (no distraen del botón "Pedir algo frío"); con `prefers-reduced-motion` todo queda quieto; el logo **no se deforma** (siempre `aspect-ratio:625/970`); no hay desbordamiento horizontal en 360 px; el botón flotante del carrito no tapa el logo (hubo un commit previo sobre esto: `2c09bdc`; no lo reintroduzcas).

### 2.4 Presupuesto de rendimiento
- Hero: solo **una** imagen de logo se descarga (la del tema activo). Máximo ~390 KB. Si Lighthouse móvil (4G simulada) marca LCP > 2,5 s, recomprime los `.webp` a calidad ~80 con `cwebp -q 80`.
- Todas las `<img>` con `width` y `height` (sin saltos de diseño). Imágenes bajo el pliegue con `loading="lazy"`.

**Verificación fase 2:** capturas en 360×640, 390×844, 412×915, 768×1024 y 1440×900, en tema claro y oscuro; `grep` sin referencias a `assets/generated`; el cambio de tema intercambia el logo sin parpadeo ni doble descarga (pestaña Network). Commit: `fase-2: logo nuevo, hero animado y tema claro/oscuro`.

---

## FASE 3 · Panel de administración como app aparte (PWA)

**Objetivo:** el panel vive en **`/admin/`** (otra página, otra PWA instalable, otro icono amarillo) y **desaparece por completo de la tienda de clientes**.

### 3.1 Estructura final
```
/index.html, /enhancements.js, /enhancements.css, /pricing.js, /sw.js, /manifest.webmanifest   ← TIENDA
/shared/menu-schema.js          ← defaults + merge/normalización del menú + helpers (lo usan tienda y panel)
/admin/index.html               ← shell del panel
/admin/admin.css
/admin/admin.js                 ← módulo ES (sin build)
/admin/sw.js
/admin/manifest.webmanifest
```
### 3.2 `shared/menu-schema.js` (un solo origen para el menú)
Script clásico (no módulo), estilo UMD como `pricing.js`, que expone `window.BarrioShared`:
- `SITE_URL = 'https://barrio-ice.vercel.app'`
- `FIREBASE_CONFIG` (el mismo objeto de `CFG.firebase`), `ADMIN_UID` (`NDdEIdTQiqMS947ENRr7aEq1i6B3`), `APP_CHECK_SITE_KEY = ''` (vacío hasta que el dueño la entregue)
- `DEFAULTS` (copia exacta de `CFG.defaults`; **marca `instagram` y `maps` como `''`** para que la tienda oculte esos enlaces cuando no estén configurados, en vez de mostrar enlaces genéricos)
- `mergeMenu(data)` = la fusión de `merge()` de `index.html` **+** `normalMenu()` de `enhancements.js` en una sola función
- `now()` (hora de Bogotá), `dateKey()`, `esc()`, `clean()`, `fmt()` (COP)

La tienda deja de definir `CFG.defaults`, `merge` y `normalMenu` y usa `BarrioShared`. **Comportamiento idéntico** (las pruebas lo confirman).

### 3.3 Inventario de código a MOVER al panel (no reescribir)
Mueve la lógica **que hoy está viva en producción**. Donde `enhancements.js` sobrescribe a `index.html`, **manda la versión de `enhancements.js`**. Líneas de `enhancements.js` verificadas en `039e9e4`; si cambiaron, busca por nombre.

| Origen | Qué | Destino |
|---|---|---|
| `enhancements.js` 5–6, 12 | `orderStates`, `weekdayKeys`, `adminState` | `admin.js` |
| `enhancements.js` 328–340 | `safeExcelText`, `orderLineText`, `orderTime`, `trackUrl` (si el panel los usa) | `admin.js` (si la tienda también los usa, a `shared/`) |
| `enhancements.js` 419–818 | `eligibleOrders`, `orderDate`, `linesText`, `orderWhatsapp`, `orderContactLink`, `setOrderStatus`, `printOrder`, `setOrdersPeriod`, `orderMatches`, `ordersView`, `hourOf`, `aggregate`, `barRows`, `periodDates`, `between`, `statsView`, `saveNotice`, `syncCatalogFromControls`, `saveMenu`, `menuView`, `settingsView`, `todayView`, `adminRender`, `exportExcel`, `adminClick` | `admin.js` |
| `enhancements.js` 819 | `document.addEventListener("click", adminClick)` | `admin.js` |
| `enhancements.js` 820–826 | listener `change` **mezclado**: separar la rama `[data-status]` (→ panel) de `data-gift-flavor`, `payment`, `delivery` (→ tienda) | dividir |
| `enhancements.js` 1048–1071 | animación de pestañas (`regularAdminRender`, `adminTabIntent`, segunda `adminRender`) | `admin.js` (**fusionar con la primera `adminRender` en una sola**) |
| `index.html` | `startAdmin`, `beep`/`audio`, `when`, `csv` (si algo aún lo usa), login/logout, `Store.login/logout/authState/watchOrders/update/save` | `admin.js` |
| `index.html` | sección `<section class="admin hide" id="admin">` y todas las clases CSS usadas **solo** por el panel (`.admin*`, `.tab(s)`, `.login-card`, `.metric(s)`, `.bar`, `.order*`, `.admin-grid`, `.admin-nav`, `.admin-actions`, `.admin-content-enter`, `.table-like`, `.order-line`) | `admin.css` |

**Procedimiento seguro:** (1) lista con `grep` cada función y variable global que el panel usa (`menu`, `orders`, `seen`, `selectedDay`, `admin`, `store`, `fmt`, `flavor`, `sold`, `dateKey`, `now`, `clean`, `esc`, `$`, `$$`…); (2) en el panel conviértelas en variables de módulo o importa de `BarrioShared`; (3) **no copies CSS compartido** (`.field`, `.card`, `.notice`, `.status`, `.row`, `.shell`, variables `:root`) sin comprobar con `grep` si la tienda también lo usa: si sí, déjalo en la tienda **y** duplícalo en `admin.css`.

**Pestañas finales (única fuente de verdad):** **Hoy · Pedidos · Menú · Ventas · Ajustes** (como describe el README). Deben estar escritas directamente en `admin/index.html`; no se reconstruyen por JS.

### 3.4 `admin/index.html`
```html
<!doctype html>
<html lang="es-CO">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="theme-color" content="#07131d">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Panel Barrio">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Barrio Ice · Panel</title>
  <link rel="manifest" href="/admin/manifest.webmanifest">
  <link rel="icon" href="/assets/brand/favicon-32.png" sizes="32x32">
  <link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon-admin.png">
  <script>/* mismo script de tema temprano de la fase 2.2 */</script>
  <link rel="stylesheet" href="/admin/admin.css">
</head>
<body>
  <section id="login" class="login">
    <div class="login-card">
      <img data-brand="logo-mark" width="64" height="57" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
      <h1>Panel del barrio</h1>
      <p>Solo para el negocio.</p>
      <div class="field"><label for="email">Correo</label><input id="email" type="email" autocomplete="username" inputmode="email"></div>
      <div class="field"><label for="password">Contraseña</label><input id="password" type="password" autocomplete="current-password"></div>
      <p id="loginError" class="notice error" role="alert"></p>
      <button id="loginButton" class="primary" type="button">Entrar</button>
      <p class="muted" id="connState">Conectando…</p>
    </div>
  </section>

  <div id="panel" class="panel hide">
    <header class="admin-top">
      <img data-brand="logo-mark" width="36" height="32" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
      <div><h1>Panel del barrio</h1><p id="welcome" class="muted"></p></div>
      <button id="soundToggle" class="icon" aria-pressed="false" aria-label="Sonido de pedidos nuevos">🔔</button>
      <button id="theme" class="icon" aria-label="Cambiar tema">◐</button>
      <button id="logout" class="secondary">Salir</button>
    </header>
    <div id="updateBar" class="notice hide">Hay una versión nueva del panel. <button id="updateNow" class="secondary">Actualizar</button></div>
    <div id="installBar" class="notice hide">Instala el panel en tu celular. <button id="installNow" class="secondary">Instalar</button></div>
    <main id="adminView" tabindex="-1"></main>
    <nav class="admin-nav" role="tablist" aria-label="Secciones del panel">
      <button class="tab active" data-admin-tab="today"    role="tab">Hoy</button>
      <button class="tab"        data-admin-tab="orders"   role="tab">Pedidos<span id="newBadge" class="badge"></span></button>
      <button class="tab"        data-admin-tab="menu"     role="tab">Menú</button>
      <button class="tab"        data-admin-tab="stats"    role="tab">Ventas</button>
      <button class="tab"        data-admin-tab="settings" role="tab">Ajustes</button>
    </nav>
  </div>

  <script src="/pricing.js"></script>
  <script src="/shared/menu-schema.js"></script>
  <script type="module" src="/admin/admin.js"></script>
</body>
</html>
```
> Ajusta los atributos de pestaña (`data-admin-tab` vs `data-tab`) a los que realmente lee `adminClick`; el objetivo es que **no haya reconstrucción de pestañas por JS**.

**CSS obligatorio (arregla el defecto de la barra inferior tapando contenido, punto 7):**
```css
.panel{min-height:100dvh}
#adminView{padding:16px 14px calc(96px + env(safe-area-inset-bottom,0px))}   /* espacio para la barra */
.admin-nav{position:fixed;left:0;right:0;bottom:0;z-index:30;display:grid;grid-template-columns:repeat(5,1fr);
  padding:6px 6px calc(6px + env(safe-area-inset-bottom,0px));background:var(--glass);backdrop-filter:blur(16px);border-top:1px solid var(--line)}
.admin-nav .tab{min-height:48px}                                              /* objetivo táctil ≥ 44 px */
@media (min-width:900px){
  .admin-nav{position:sticky;top:0;bottom:auto;border-top:0;border-bottom:1px solid var(--line);max-width:1050px;margin:0 auto}
  #adminView{padding-bottom:32px;max-width:1050px;margin:0 auto}
}
```

### 3.5 `admin/admin.js` (esqueleto de arranque; la lógica de vistas es la **movida** en 3.3)
```js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
         doc, collection, query, orderBy, limit, onSnapshot, setDoc, writeBatch, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { initializeAppCheck, ReCaptchaV3Provider }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js';

const { FIREBASE_CONFIG, ADMIN_UID, APP_CHECK_SITE_KEY, DEFAULTS, mergeMenu } = window.BarrioShared;

const app = initializeApp(FIREBASE_CONFIG);
if (APP_CHECK_SITE_KEY) {
  if (location.hostname === 'localhost') self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  initializeAppCheck(app, { provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
}
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const auth = getAuth(app);                         // la sesión persiste en el dispositivo (comportamiento por defecto)

// ---- Acceso: la interfaz solo es una ayuda; el control real son las reglas de Firestore ----
onAuthStateChanged(auth, user => {
  const allowed = !!user && user.uid === ADMIN_UID;
  if (user && !allowed) { document.getElementById('loginError').textContent = 'Esta cuenta no tiene permiso de dueño.'; signOut(auth); return; }
  document.getElementById('login').classList.toggle('hide', allowed);
  document.getElementById('panel').classList.toggle('hide', !allowed);
  if (allowed) startPanel(user); else stopPanel();
});

// ---- Pedidos en tiempo real: solo los últimos 300 (control de costos de lectura) ----
let unsubscribeOrders = null;
function startPanel(user) {
  unsubscribeOrders?.();
  unsubscribeOrders = onSnapshot(
    query(collection(db, 'pedidos'), orderBy('creadoEn', 'desc'), limit(300)),
    snap => { /* detectar nuevos → beep() + badge; orders = snap.docs.map(...); adminRender(); */ },
    () => { /* mostrar aviso: "No se pudieron listar pedidos. Revisa reglas y UID" */ });
  /* onSnapshot del menú: doc(db,'tienda','menu') → menu = mergeMenu(data) */
}
function stopPanel() { unsubscribeOrders?.(); unsubscribeOrders = null; }

// ---- Cambiar estado: actualiza el pedido Y el seguimiento público (fase 4-D) ----
export async function setOrderStatus(id, estado) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'pedidos', id), { estado, actualizadoEn: serverTimestamp() });
  batch.set(doc(db, 'seguimiento', id), { estado, actualizadoEn: serverTimestamp() }, { merge: true });
  await batch.commit();
}
// Guardar menú/ajustes: setDoc(doc(db,'tienda','menu'), menu)

// ---- Instalación PWA + actualización ----
let deferredInstall = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; document.getElementById('installBar').classList.remove('hide'); });
document.getElementById('installNow')?.addEventListener('click', async () => { deferredInstall?.prompt(); deferredInstall = null; document.getElementById('installBar').classList.add('hide'); });
// iOS Safari no dispara beforeinstallprompt: si es iOS y no está instalada, mostrar "Compartir → Añadir a pantalla de inicio".

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/', updateViaCache: 'none' }).then(reg => {
    const notify = () => document.getElementById('updateBar').classList.remove('hide');
    if (reg.waiting) notify();
    reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', function () {
      if (this.state === 'installed' && navigator.serviceWorker.controller) notify(); }));
    document.getElementById('updateNow')?.addEventListener('click', () => reg.waiting?.postMessage('SKIP_WAITING'));
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
    setInterval(() => reg.update(), 30 * 60 * 1000);
  });
}
```
**Notas de comportamiento:**
- **Sonido:** los navegadores bloquean el audio hasta que haya un gesto del usuario. El botón 🔔 (`#soundToggle`) crea el `AudioContext` al pulsarlo; guarda la preferencia en `localStorage`. Un pedido nuevo suena y marca el badge de "Pedidos".
- **Notificaciones push reales** (con la app cerrada) requieren un servidor (FCM + función). **No las implementes ahora**; déjalas anotadas en el PR como siguiente paso.
- Conserva **todas** las funciones actuales: catálogo (sabores, color, +18), precios por tamaño y día, sabores del día, agotados, bebidas, combos, mitad y mitad, horarios por día, promos por día, banner, cierre manual, estados de pedido, WhatsApp al cliente, impresión de comprobante, exportación a Excel (CSV con protección de fórmulas `safeExcelText`), estadísticas por periodo.

### 3.6 `admin/sw.js` y `admin/manifest.webmanifest`
`admin/sw.js` (alcance `/admin/`; nunca cachea Firebase):
```js
/* Barrio Ice · service worker del PANEL */
const BUILD = '__BUILD_ID__';
const VERSION = BUILD.startsWith('__') ? 'dev' : BUILD;
const CACHE = `bi-admin-${VERSION}`;
const SHELL = ['/admin/', '/admin/index.html', '/admin/admin.css', '/admin/admin.js',
  '/admin/manifest.webmanifest', '/pricing.js', '/shared/menu-schema.js',
  '/assets/brand/icon-admin-192.png', '/assets/brand/icon-admin-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' }))))));
});                                                   // sin skipWaiting: el dueño elige cuándo actualizar
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const { request } = e; const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin) return;       // Firebase: red directa
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const r = await fetch(request, { cache: 'no-cache' });
      if (r.ok) cache.put(request, r.clone());
      return r;
    } catch {
      return (await cache.match(request)) || (request.mode === 'navigate' ? cache.match('/admin/index.html') : Response.error());
    }
  })());
});
```
`admin/manifest.webmanifest`:
```json
{
  "id": "/admin/",
  "name": "Barrio Ice · Panel",
  "short_name": "Panel Barrio",
  "description": "Panel del dueño de Barrio Ice: pedidos, menú, precios y ventas.",
  "lang": "es-CO",
  "start_url": "/admin/?source=pwa",
  "scope": "/admin/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#06121c",
  "theme_color": "#07131d",
  "icons": [
    { "src": "/assets/brand/icon-admin-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/brand/icon-admin-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/assets/brand/icon-admin-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [ { "name": "Pedidos", "url": "/admin/#orders" } ]
}
```
Actualiza el manifest de la tienda con `"id": "/"`, `"start_url": "/"`, `"scope": "/"` y los iconos de `assets/brand/`.

### 3.7 Quitar el panel de la tienda
1. Borra de `index.html`: `<section class="admin hide" id="admin">`, el enlace **"Panel del negocio"** del pie, el CSS exclusivo del panel y todo el JS de la tabla 3.3.
2. `Store` de la tienda queda **sin** login/logout/watchOrders/update/save. Se retira `firebase-auth.js` de la tienda (se vuelve a necesitar solo si activas la fase 4-F, opcional).
3. En `route()` elimina la rama `#admin` y agrega la redirección de compatibilidad para el dueño que tenía el enlace guardado:
```js
if (location.hash === '#admin') { location.replace('/admin/'); return; }
```
4. En la tienda, `grep -rnE "admin|adminUid|login|password|startAdmin|adminRender" index.html enhancements.js enhancements.css` **no debe devolver nada** relacionado con el panel (salvo la redirección de arriba).
5. `firestore.rules` y la Authentication de Firebase no cambian por esto; pero en **Firebase Console → Authentication → Settings → Authorized domains** debe estar `barrio-ice.vercel.app` (tarea del dueño, sección 11).

### 3.8 Pruebas del panel (actualizar `tests/visual-check.cjs`)
Hoy abre `address + "/#admin"` y llama `startAdmin(...)`. Cámbialo para abrir `address + "/admin/"`, simular sesión con un hook de pruebas expuesto **solo cuando** `location.search` contenga `?e2e=1` **y** `location.hostname` sea `localhost`/`127.0.0.1`; renombra las capturas a `admin-escritorio-*.jpg` y `admin-movil-*.jpg`; **regenera todas las capturas** de `tests/screenshots/` (hoy están desactualizadas, punto 7).

### 3.9 (Recomendado) Control de costos de lectura
El panel original suscribía **toda** la colección `pedidos`. Con `limit(300)` el tiempo real queda acotado. Para reportes de rangos más antiguos usa una consulta puntual (`getDocs` con `where('fecha','>=',desde)` y `where('fecha','<=',hasta)`) y muéstrala como "Cargar periodo". Mantén igual el resultado de las estadísticas del periodo actual.

**Verificación fase 3:** (a) `/admin/` abre sola, instalable (Chrome: "Instalar app"; Lighthouse PWA sin errores) con su icono amarillo; (b) la tienda no contiene rastro del panel; (c) `/#admin` redirige a `/admin/`; (d) con la pestaña Network, `/admin/` no carga nada de la tienda salvo `/pricing.js` y `/shared/*`; (e) tests verdes; (f) el sitio de clientes pesa **menos** que antes. Commits: `fase-3: shared/menu-schema`, `fase-3: panel admin en /admin (PWA)`, `fase-3: retirar panel de la tienda`.

---

## FASE 4 · Seguridad de pedidos (resuelve los puntos 3 y 4)

> **Límite honesto:** sin un servidor, las reglas de Firestore **no pueden recalcular el total desde los precios del menú** (las reglas no recorren listas). Esta fase cierra todo lo que se puede cerrar sin backend: coherencia aritmética, totales mínimos, App Check, separación de datos privados y detección en el panel. El cierre definitivo (recalcular en servidor) queda como siguiente paso recomendado (sección 13).

### 4-A · Reglas estrictas para crear pedidos
Reescribe `firestore.rules` completo (UID del dueño sin cambios):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isOwner() {
      return request.auth != null && request.auth.uid == 'NDdEIdTQiqMS947ENRr7aEq1i6B3';
    }

    match /tienda/menu {
      allow read: if true;
      allow write: if isOwner();
    }

    // PRIVADO: nombre completo, celular y dirección. Solo el dueño lee.
    match /pedidos/{pedidoId} {
      allow create: if validNewOrder(pedidoId);
      allow get, list, update, delete: if isOwner();
    }

    // PÚBLICO: solo lo mínimo para mostrar el estado. Se lee por ID (no se puede listar).
    match /seguimiento/{pedidoId} {
      allow get: if true;
      allow create: if isOwner() || validNewTracking(pedidoId);
      allow update: if isOwner() &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['estado', 'actualizadoEn']);
      allow delete: if isOwner();
    }

    function validNewTracking(id) {
      let d = request.resource.data;
      let p = getAfter(/databases/$(database)/documents/pedidos/$(id)).data;
      return d.keys().hasOnly(['estado', 'tipo', 'fecha', 'creadoEn', 'nombreCorto']) &&
        d.keys().hasAll(['estado', 'tipo', 'fecha', 'creadoEn', 'nombreCorto']) &&
        existsAfter(/databases/$(database)/documents/pedidos/$(id)) &&
        d.estado == 'Nuevo' &&
        d.tipo == p.entrega.tipo &&
        d.fecha == p.fecha &&
        d.creadoEn == request.time &&
        d.nombreCorto is string && d.nombreCorto.size() >= 1 && d.nombreCorto.size() <= 20;
    }

    function validNewOrder(id) {
      let d = request.resource.data;
      return d.keys().hasOnly([
          'items', 'cliente', 'entrega', 'pago', 'conCuanto', 'notas',
          'subtotal', 'descuento', 'domicilio', 'total', 'promo',
          'promoBuy', 'promoReceive', 'mayor18', 'tieneLicor',
          'estado', 'fecha', 'creadoEn'
        ]) &&
        d.keys().hasAll([
          'items', 'cliente', 'entrega', 'pago', 'subtotal', 'descuento',
          'domicilio', 'total', 'promo', 'mayor18', 'tieneLicor',
          'estado', 'fecha', 'creadoEn'
        ]) &&
        id.size() >= 20 &&
        existsAfter(/databases/$(database)/documents/seguimiento/$(id)) &&   // se crea en el mismo lote
        d.items is list && d.items.size() > 0 && d.items.size() <= 60 &&
        d.cliente is map && d.cliente.keys().hasOnly(['nombre', 'celular']) &&
        d.cliente.nombre is string && d.cliente.nombre.size() >= 1 && d.cliente.nombre.size() <= 60 &&
        d.cliente.celular is string && d.cliente.celular.matches('^[0-9+() -]{10,18}$') &&
        d.entrega is map && d.entrega.keys().hasOnly(['tipo', 'direccion', 'referencia']) &&
        d.entrega.tipo in ['domicilio', 'recoger'] &&
        d.entrega.direccion is string && d.entrega.direccion.size() <= 140 &&
        d.entrega.referencia is string && d.entrega.referencia.size() <= 140 &&
        d.pago in ['Efectivo', 'Nequi', 'Daviplata'] &&
        d.conCuanto is number && d.conCuanto >= 0 && d.conCuanto <= 5000000 &&
        d.notas is string && d.notas.size() <= 300 &&
        // coherencia aritmética (el panel además detecta precios fuera del menú)
        d.subtotal is number && d.subtotal >= 0 && d.subtotal <= 2000000 &&
        d.descuento is number && d.descuento >= 0 && d.descuento * 2 <= d.subtotal &&
        d.total is number && d.total >= 1000 && d.total <= 2000000 &&
        d.subtotal == d.total + d.descuento &&
        d.domicilio == 0 &&
        d.promo is string && d.promo.size() <= 80 &&
        (!d.keys().hasAny(['promoBuy']) || (d.promoBuy is int && d.promoBuy >= 0 && d.promoBuy <= 3)) &&
        (!d.keys().hasAny(['promoReceive']) || (d.promoReceive is int && d.promoReceive >= 0 && d.promoReceive <= 3)) &&
        // mayoría de edad: queda constancia auditable y es obligatoria si hay licor
        d.mayor18 is bool && d.tieneLicor is bool && (!d.tieneLicor || d.mayor18 == true) &&
        d.estado == 'Nuevo' &&
        d.fecha is string && d.fecha.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$') &&
        d.creadoEn == request.time;                                           // sello de tiempo del servidor
    }
  }
}
```
**Por qué `descuento * 2 <= subtotal` es correcto:** en 2x1 se regala exactamente la mitad de lo recibido (igualdad), y en 3x2 un tercio; ningún pedido legítimo lo supera.

### 4-B · Cambios en el cliente (`sendOrder` y `Store` de la tienda)
En `enhancements.js` (función `sendOrder`; **no** en `send` de `index.html`):
1. **Teléfono:** antes de validar, `phone = phone.replace(/[^0-9+()\s-]/g, '')` (la regla rechaza letras).
2. Agrega al pedido: `mayor18: $("age").checked === true`, `tieneLicor: result.lines.some(l => l.adulto)`.
3. Crea el pedido **y** su seguimiento en un solo lote atómico. En `Store`:
```js
async createOrder(order) {
  const { doc, collection, writeBatch, serverTimestamp } = this.F;
  const ref = doc(collection(this.db, 'pedidos'));                     // ID automático (20 caracteres, no adivinable)
  const first = (order.cliente.nombre || '').trim().split(/\s+/)[0].slice(0, 20) || 'Cliente';
  const batch = writeBatch(this.db);
  batch.set(ref, order);
  batch.set(doc(this.db, 'seguimiento', ref.id), {
    estado: 'Nuevo', tipo: order.entrega.tipo, fecha: order.fecha,
    creadoEn: order.creadoEn, nombreCorto: first
  });
  await batch.commit();
  return ref.id;
}
watchTracking(id, ok, bad) {
  return this.F.onSnapshot(this.F.doc(this.db, 'seguimiento', id),
    s => ok(s.exists() ? Object.assign({ id: s.id }, s.data()) : null), bad);
}
```
`order.creadoEn` debe ser `serverTimestamp()` (como hoy, `store.time()`).
4. Reemplaza `store.create(order)` por `store.createOrder(order)`.

### 4-C · App Check (frena bots que llaman a Firestore directo)
- Código ya incluido en `admin.js` (3.5). En la tienda, dentro de `Store.init`, tras `initializeApp`:
```js
const AC = await import(b + 'firebase-app-check.js');
if (BarrioShared.APP_CHECK_SITE_KEY) {
  if (location.hostname === 'localhost') self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  AC.initializeAppCheck(app, { provider: new AC.ReCaptchaV3Provider(BarrioShared.APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
}
```
- `APP_CHECK_SITE_KEY` queda vacío: **el código es inocuo sin clave**. El dueño crea la clave (sección 11) y se activa la *aplicación forzada* en Firebase **solo después de una semana** en modo monitor, cuando el 95 %+ de las solicitudes aparezcan como "verificadas".

### 4-D · Seguimiento sin datos personales (punto 4)
1. `showTracking(id)` (en `enhancements.js`) lee de `store.watchTracking(id, …)` y muestra: número `#` + últimos 6 caracteres del ID en mayúsculas, **estado**, tipo (domicilio/recoger) y "A nombre de {nombreCorto}". **Nunca** celular, dirección ni apellido.
2. Si no existe el documento: "No encontramos ese pedido. Si hiciste el pedido antes de esta actualización, escríbenos por WhatsApp."
3. Pedidos viejos: el panel incluye en **Ajustes → Mantenimiento** el botón **"Reparar seguimiento de pedidos recientes"**, que para cada pedido de los últimos 7 días sin documento en `seguimiento/{id}` lo crea (`setDoc` con `estado`, `tipo`, `fecha`, `creadoEn`, `nombreCorto`; permitido por la regla `isOwner()`).
4. `setOrderStatus` ya actualiza ambos documentos (3.5).

### 4-E · Detección y limpieza en el panel (lo que las reglas no pueden verificar)
En la lista de pedidos, calcula por cada pedido y muestra una insignia **"⚠ Revisar"** con el motivo cuando ocurra alguno:
- **Total no cuadra:** vuelve a calcular con `BarrioIcePricing.calculate(lineasPagadas, diaDelPedido, menu)` y compara `total`/`descuento` con lo guardado.
- **Precio fuera del menú:** `p` de un ítem no coincide con ningún precio vigente (`precios.semana`, `jueves`, `finde`, bebidas, combos).
- **Posible duplicado:** mismo celular con 2+ pedidos en menos de 3 minutos.
- **Texto sospechoso:** nombre/dirección con URL, o `notas` > 250 caracteres.
Agrega acciones **Eliminar** (ya permitido por reglas) y **Eliminar seleccionados** con confirmación. Los pedidos marcados no deben sonar como "nuevo válido" si fallan el primer criterio.

### 4-F · (Opcional, solo si aún hay spam tras App Check) Enfriamiento por sesión anónima
Requiere activar **Authentication → Anonymous** y agregar `firebase-auth.js` a la tienda. Regla adicional en `validNewOrder`: exigir `request.auth != null` y un documento `limites/{uid}` con `ultimoPedido` que el lote actualiza, rechazando si `request.time < resource.data.ultimoPedido + duration.value(60, 's')`. **No lo actives por defecto**: si la autenticación anónima falla, la tienda dejaría de recibir pedidos. Si se implementa, que sea detrás de una bandera `CFG.requireAnonAuth=false`.

### 4-G · Pruebas de reglas
Agrega `tests/rules.test.mjs` con `@firebase/rules-unit-testing` y el emulador de Firestore (`firebase emulators:exec --only firestore "node tests/rules.test.mjs"`; requiere Java; si no hay Java, documenta cómo correrlo y no bloquees el PR). Casos mínimos:

| Caso | Resultado esperado |
|---|---|
| Pedido válido + seguimiento en lote | ✅ permitido |
| Mismo pedido sin documento de seguimiento | ❌ |
| `total: 0` o `total: 500` | ❌ |
| `subtotal != total + descuento` | ❌ |
| `descuento` mayor que la mitad del subtotal | ❌ |
| `domicilio: 100` | ❌ |
| `tieneLicor: true` con `mayor18: false` | ❌ |
| Celular con letras | ❌ |
| `creadoEn` con fecha manipulada (no `request.time`) | ❌ |
| Campo extra no permitido | ❌ |
| Anónimo hace `get` de `pedidos/{id}` | ❌ |
| Anónimo hace `get` de `seguimiento/{id}` | ✅ |
| Anónimo hace `list` de `seguimiento` | ❌ |
| Anónimo actualiza `seguimiento/{id}` | ❌ |
| Dueño lee, lista, actualiza estado y elimina pedidos | ✅ |
| No dueño con sesión intenta lo del dueño | ❌ |

### 4-H · `firebase.json` y `.firebaserc` (para publicar reglas por CLI si el dueño tiene Firebase CLI)
```json
// firebase.json
{ "firestore": { "rules": "firestore.rules" } }
// .firebaserc
{ "projects": { "default": "barrio-ice" } }
```

**Verificación fase 4:** suite de reglas en verde; en el navegador, un pedido completo termina con los **dos** documentos y WhatsApp abierto; la página de seguimiento no muestra celular ni dirección (revisa el HTML y la pestaña Network); el panel marca "⚠ Revisar" en un pedido creado a mano con total alterado. Commits: `fase-4: reglas estrictas`, `fase-4: pedido+seguimiento en lote`, `fase-4: app check`, `fase-4: seguimiento sin datos personales`, `fase-4: alertas en el panel`.

---

## FASE 5 · Eliminar las capas que se pisan (resuelve el punto 2)

**Objetivo:** que cada función exista **una sola vez**. Refactor **1:1: cero cambios de comportamiento.** Esta fase va **después** de la 3 y la 4 (el panel ya salió y `sendOrder` ya cambió).

**5.1 Red de seguridad antes de tocar:** corre `npm test` y guarda capturas de referencia. Añade pruebas de caracterización en Node con `node:test` para `pricing.js` (mínimo estos casos; todos verificados con el código actual):

| Caso | Total | Descuento | Regalos |
|---|---|---|---|
| Lun 2x1, 1 granizado $12.000 | 12000 | 12000 | 1 |
| Lun 2x1 con promo `lunes:false` | 12000 | 0 | 0 |
| Jue 3x2, 3 iguales $12.000 | 36000 | 12000 | 1 |
| Jue 3x2, 2 iguales | 24000 | 12000 | 1 |
| Jue 3x2, 2×M $12.000 + 1×G $15.000 | 39000 | 12000 | 1 |
| Vie 3 granizados $12.000 | 36000 | 0 | 0 |
| Dom 2 granizados $8.000 | 16000 | 0 | 0 |
| Cantidad negativa | 0 | 0 | 0 |
| Ítem con `regalo:true` inyectado | 0 | 0 | 0 |

**5.2 Una función = un dueño.** Para cada global reasignada por `enhancements.js` (`merge`, `plan`, `openNow`, `totals`, `render`, `addFlavor`, `addCombo`, `addDrink`, `add`, `orderMessage`, `showTracking`): toma la versión **viva** (la de `enhancements.js`), absórbela en la definición única, elimina la versión muerta y elimina los alias `baseMerge`, `baseRender`, `baseAdd`. Resultado: ningún `x = function` que pise otra definición.
- Quita también los **duplicados con `pricing.js`**: `plan()` y `totals()` de `index.html` ya no deben existir; solo `BarrioIcePricing.planForDay/calculate`.

**5.3 Estructura legible (sin build):**
```
/index.html        ← solo marcado y etiquetas <script>/<link> (sin JS/CSS en línea)
/styles.css        ← <style> en línea de index.html + enhancements.css, ordenado por secciones
/storefront.js     ← estado, render, carrito, pedido (una función por bloque, comentada)
/motion.js         ← hero, revelado al hacer scroll, accesibilidad del carrito, vuelo al carrito
/shared/menu-schema.js, /pricing.js
```
Cada archivo ≤ ~700 líneas, líneas ≤ 120 caracteres. Actualiza `SHELL` del `sw.js` a estos archivos.
**5.4 Orden de scripts:** `pricing.js` → `shared/menu-schema.js` → `storefront.js` → `motion.js` (con `defer`). Sin variables globales nuevas; los pocos globales que usan las pruebas se exponen explícitamente en `window.__barrio` solo cuando `?e2e=1` en localhost.
**5.5 Documenta en el README** qué archivo manda en cada cosa.

**Verificación fase 5:** `grep -nE "^\s*(merge|plan|totals|render|add|orderMessage|showTracking|adminRender)\s*=\s*function" *.js` → **sin resultados**; pruebas de caracterización y Playwright en verde; capturas iguales a las de referencia (diferencia visual nula o explicada). Commits: `fase-5: una definición por función`, `fase-5: estructura de archivos`.

---

## FASE 6 · SEO local y metadatos (resto del punto 5)

**6.1 `<head>` de `index.html`:** unifica título y social. Usa `<html lang="es-CO">`.
```html
<title>Barrio Ice · Granizados en Montería | 2x1 y 3x2</title>
<meta name="description" content="Granizados, gaseosas y cervezas bien frías en Montería. 2x1 de lunes a miércoles y 3x2 los jueves. Pide en línea y recibe por WhatsApp.">
<link rel="canonical" href="https://barrio-ice.vercel.app/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Barrio Ice">
<meta property="og:locale" content="es_CO">
<meta property="og:url" content="https://barrio-ice.vercel.app/">
<meta property="og:title" content="Barrio Ice · Granizados en Montería">
<meta property="og:description" content="Del barrio, bien helado. 2x1 lun–mié · 3x2 jueves.">
<meta property="og:image" content="https://barrio-ice.vercel.app/assets/brand/og-barrio-ice-1200x630.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Logo de Barrio Ice: cubo de hielo con la silueta del barrio">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Barrio Ice · Granizados en Montería">
<meta name="twitter:image" content="https://barrio-ice.vercel.app/assets/brand/og-barrio-ice-1200x630.jpg">
```
**6.2 Datos estructurados** (`<script type="application/ld+json">` en el `<head>`). **Incluye solo lo que se conoce; no inventes dirección, coordenadas ni redes.** Los campos con `TODO(dueño)` se omiten del JSON hasta que el dueño los confirme y se listan en el PR:
```json
{
  "@context": "https://schema.org",
  "@type": "IceCreamShop",
  "name": "Barrio Ice",
  "alternateName": "Barrio Ice Cold Flow",
  "url": "https://barrio-ice.vercel.app/",
  "image": "https://barrio-ice.vercel.app/assets/brand/og-barrio-ice-1200x630.jpg",
  "logo": "https://barrio-ice.vercel.app/assets/brand/icon-512.png",
  "description": "Granizados, gaseosas y cervezas bien frías en Montería, con 2x1 y 3x2.",
  "telephone": "+573023489776",
  "priceRange": "$$",
  "servesCuisine": "Granizados",
  "address": { "@type": "PostalAddress", "addressLocality": "Montería", "addressRegion": "Córdoba", "addressCountry": "CO" },
  "areaServed": "Montería"
}
```
`TODO(dueño)`: `streetAddress`, `geo` (lat/long), `openingHoursSpecification` (los horarios reales viven en Firestore y cambian por día; no los fijes en el HTML), `sameAs` (Instagram real). Agrega también un bloque `FAQPage` con las preguntas que ya existen en la sección "Preguntas sin hielo".
**6.3 Instagram y ubicación:** si `menu.instagram` o `menu.maps` están vacíos (o son los genéricos `https://instagram.com/`, `…?q=Montería, Colombia`), **oculta** esas tarjetas del pie en vez de mostrar enlaces falsos.
**6.4 Semántica y accesibilidad:** un único `<h1>` (el `sr-only` de la fase 2), `alt` descriptivos, `aria-label` en botones de icono, foco visible, contraste AA en ambos temas.

**Verificación fase 6:** Rich Results Test / `schema.org` validator sin errores; `curl -s https://<preview>/ | grep -c "og:url"` = 1; Lighthouse SEO ≥ 95.

---

## FASE 7 · Detalles menores (punto 7)

| # | Detalle | Qué hacer |
|---|---|---|
| 7.1 | Título "BARRIOICE" | Resuelto en la fase 2 (`<h1 class="sr-only">`). Verifica con `curl` que el texto plano diga "Barrio Ice · Granizados en Montería". |
| 7.2 | Capturas desactualizadas | Regenerar **todas** las de `tests/screenshots/` con el sitio nuevo (tienda y `/admin/`, claro/oscuro, escritorio/móvil). Borrar las viejas. |
| 7.3 | Barra inferior tapa contenido en escritorio | Resuelto con el CSS de la fase 3.4. Confirmar con captura de `/admin/` a 1440×900 con scroll hasta el final: el último elemento queda por encima de la barra. |
| 7.4 | PNG pesados | Los logos nuevos ya son WebP. Eliminar PNG viejos (`assets/generated`, `assets/logo.jpg`). Presupuesto: transferencia inicial de la tienda < 1 MB sin fuentes ni Firebase. Medir con Playwright y reportar. |
| 7.5 | 8 ramas remotas | `git branch -r --merged origin/main` → eliminar **solo** las ya fusionadas con `git push origin --delete <rama>`. **Conservar** `respaldo-antes-hero-motion-20261008` hasta que el PR esté en producción 2 semanas; la etiqueta `backup-main-039e9e4` ya protege el estado actual. Si Codex no tiene permiso de borrado, imprimir los comandos para el dueño. |
| 7.6 | README desactualizado | Reescribir: estructura nueva, URL del panel (`/admin/`), cómo instalar cada PWA, flujo de despliegue de reglas (sección 9), cómo subir versión del SW (automático), lista de verificación previa a publicar. |
| 7.7 | Enlace "Panel del negocio" público | Eliminado en la fase 3. |

---

## FASE 8 · Lo que no se pudo ver: verificación y diagnóstico

Codex **no puede** ver el panel de Vercel ni los datos de Firestore sin credenciales. Resuélvelo así:

**8.1 Lo que Codex sí hace**
- Lighthouse móvil sobre la **vista previa** de Vercel: Performance, Accessibility, Best Practices, SEO, PWA. Adjunta los números al PR.
- `curl -sI` a `/`, `/sw.js`, `/admin/`, `/assets/brand/logo-dark.webp`, `/robots.txt`, `/sitemap.xml`: confirmar cabeceras y códigos de estado.
- Si `vercel` CLI está autenticado: `vercel ls`, `vercel inspect <url>` y reportar rama de producción y dominio; si no, omitir sin fallar.
- Playwright en 360×640, 390×844, 412×915, 768×1024, 1440×900 (claro/oscuro): tienda, hoja del pedido, seguimiento, `/admin/` (pestañas Hoy/Pedidos/Menú/Ventas/Ajustes).
- Un pedido de punta a punta en la vista previa (carrito → envío → doble documento → seguimiento → WhatsApp).
**8.2 Diagnóstico dentro del panel (resuelve "no vi los datos de Firestore")**
Agrega en **Ajustes → Diagnóstico** una tarjeta que lea el estado real y muestre ✅/⚠:
- Instagram configurado (≠ vacío y ≠ `https://instagram.com/`)
- Ubicación configurada (≠ vacío y ≠ el genérico de Montería)
- WhatsApp con 12 dígitos que empiece por 57
- Nequi/Daviplata con número
- Horario definido para los 7 días
- Documento `tienda/menu` existente
- App Check activo (hay `APP_CHECK_SITE_KEY`)
- Versión del panel (`VERSION` del SW) y del último despliegue
- Fecha del último pedido y conteo de pedidos "⚠ Revisar"
**8.3** Reporte final en el PR con tabla: qué se verificó, cómo, resultado, y qué queda para el dueño (sección 11).

---

## 9. Orden de despliegue (CRÍTICO: evita que la tienda deje de recibir pedidos)

Las reglas nuevas y el código nuevo **no deben salir al mismo tiempo**: un cliente con la versión vieja en caché fallaría contra reglas estrictas, y un cliente nuevo fallaría contra reglas viejas (no existe `seguimiento`).

1. **Paso 1 — Reglas de transición** (acepta forma vieja y nueva). Genera `firestore.rules.transition` a partir de `firestore.rules` quitando **solo** estas condiciones de `validNewOrder`: `existsAfter(.../seguimiento/$(id))`, `id.size() >= 20`, `mayor18/tieneLicor` en `hasAll` (déjalos en `hasOnly`), `d.creadoEn == request.time` (usar `d.creadoEn is timestamp`), y `d.total >= 1000` (usar `>= 0`). Mantén todo lo demás y la colección `seguimiento`. **El dueño publica este archivo** en Firebase Console → Firestore → Reglas.
2. **Paso 2 — Despliegue del código** (fases 1–7) a producción. El nuevo service worker obliga a todos los clientes a actualizarse.
3. **Paso 3 — Esperar 7 días** (para que ningún cliente conserve la versión vieja) y confirmar en el panel ("Diagnóstico") que los pedidos nuevos traen `mayor18` y su documento `seguimiento`.
4. **Paso 4 — Reglas estrictas:** el dueño publica `firestore.rules` (versión final). Probar un pedido real inmediatamente; si falla, volver a publicar la de transición.
5. **Paso 5 — App Check:** tras 7 días en modo monitor y >95 % verificadas, activar la aplicación forzada para Firestore.

---

## 10. Definición de terminado (checklist del PR)

- [ ] **P1** `sw.js` red-primero, versión por despliegue, `vercel.json` con `no-cache` en SW; prueba de actualización en verde.
- [ ] **P2** Cada función definida una sola vez; `index.html` sin JS/CSS en línea; pruebas de caracterización en verde.
- [ ] **P3** Reglas estrictas + `rules.test.mjs`; pedido y seguimiento en un lote; panel marca "⚠ Revisar".
- [ ] **P4** `seguimiento/{id}` público sin PII; `pedidos` solo lectura del dueño; botón de reparación para pedidos antiguos.
- [ ] **P5** `vercel.json`, `robots.txt`, `sitemap.xml`, canonical, `og:url`, JSON-LD, cabeceras de seguridad, CSP verificada.
- [ ] **P6** `.gitignore` y `.vercelignore`; ningún `node_modules` versionado.
- [ ] **P7** `<h1>` correcto, capturas nuevas, barra inferior sin tapar contenido, sin PNG pesados, ramas fusionadas depuradas, README actualizado.
- [ ] **Logo** nuevo en hero, header, pie, seguimiento, favicon, PWA y OG; hero animado y respetuoso con `prefers-reduced-motion`; cambio de tema sin doble descarga.
- [ ] **Panel** en `/admin/`, instalable, icono amarillo, sin rastro en la tienda, `/#admin` redirige.
- [ ] **Verificación** Lighthouse + capturas + `curl` adjuntos; sección "Pendiente del dueño" completa.
- [ ] Ninguna lógica de precios/promociones modificada (`git diff main -- pricing.js` vacío).

---

## 11. Tareas manuales del dueño (Codex las lista en el PR; no puede hacerlas)

**Firebase Console (proyecto `barrio-ice`)**
1. Authentication → Settings → **Authorized domains**: agregar `barrio-ice.vercel.app` (y el dominio propio si lo compra).
2. Firestore → Reglas: publicar primero `firestore.rules.transition`, luego `firestore.rules` (sección 9).
3. App Check: registrar la app web con **reCAPTCHA v3**, copiar la *site key* y pegarla en `APP_CHECK_SITE_KEY` (`shared/menu-schema.js`). Esperar 7 días y activar aplicación forzada para Firestore.
4. Presupuestos y alertas de uso (Billing/Usage) para detectar lecturas anómalas.

**Vercel**
5. Confirmar que la **rama de producción** sea `main` y que existan vistas previas por PR.
6. Activar Web Analytics y Speed Insights si se desea.

**GitHub**
7. Proteger `main` (requerir PR). Borrar las ramas que Codex liste como fusionadas.

**Datos del negocio (Ajustes del panel)**
8. Configurar Instagram real, enlace de ubicación real, WhatsApp, Nequi/Daviplata y horarios por día. Revisar la tarjeta **Diagnóstico**.
9. Entregar: dirección exacta, coordenadas y Instagram para el JSON-LD (Fase 6).

**Visibilidad local**
10. Verificar el sitio en **Google Search Console** y enviar `sitemap.xml`.
11. Crear/reclamar el perfil de **Google Business Profile** de "Barrio Ice – Montería" (es lo que más pesa para "granizados en Montería").

---

## 12. Cómo verificar (comandos)

```bash
# Pruebas de lógica y visuales
cd tests && npm ci && npx playwright install chromium && npm test

# Reglas de Firestore (necesita Java)
npx firebase-tools emulators:exec --only firestore "node tests/rules.test.mjs"

# Formato
npx prettier --check index.html storefront.js motion.js styles.css admin/*.{html,js,css}

# Rastros del panel en la tienda (debe imprimir 0)
grep -cE "startAdmin|adminRender|adminUid|loginButton" index.html storefront.js motion.js || true

# Funciones pisadas (debe imprimir nada)
grep -nE "^\s*(merge|plan|totals|render|add|orderMessage|showTracking|adminRender)\s*=\s*function" *.js || true

# Cabeceras en la vista previa
curl -sI https://<preview>/sw.js | grep -i cache-control
curl -sI https://<preview>/       | grep -iE "x-content-type|strict-transport|content-security"
```

---

## 13. Fuera de alcance (recomendado como siguiente etapa; no implementar ahora)

- **Recalcular el pedido en servidor** (función serverless en Vercel con `firebase-admin` que lea el menú, valide precios, horario, edad y frecuencia, y escriba el pedido; las reglas pasarían a `allow create: if false`). Es el único cierre definitivo del problema de pedidos falsos.
- **Notificaciones push** al celular del dueño con la app cerrada (FCM + función).
- **Dominio propio** (p. ej. `barrioice.co`) y subdominio `panel.` para la PWA del dueño.
- Versión de mayor resolución del logo (≥ 1500 px de ancho) para pantallas muy densas.

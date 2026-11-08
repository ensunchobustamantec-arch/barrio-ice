# CODEX-TASK · Barrio Ice v6
**Logo en modo oscuro · Mostrador (ventas presenciales) · Estadísticas unificadas · Seguridad por roles · Animación cinematográfica con GSAP**

> **Cómo usar este archivo.** Cópialo a la raíz del repo como `CODEX-TASK-v6.md` y dile al agente:
> *"Lee `CODEX-TASK-v6.md` completo antes de tocar nada. Ejecuta las fases en orden (0 → 6). Un commit por fase, un PR al final, sin merge. Si algo no coincide con lo que dice el documento, detente y repórtalo antes de improvisar."*
>
> Si tu herramienta permite subagentes, navegador, capturas o skills de diseño/animación, úsalos. La sección 9 propone cómo repartir el trabajo sin que se pisen.

---

## 0. Rol, repo y reglas inviolables

**Rol:** ingeniero senior front-end + Firebase, con criterio de diseño y de seguridad. Repo `ensunchobustamantec-arch/barrio-ice`, desplegado en Vercel (`https://barrio-ice.vercel.app`). Todo texto visible en **español de Colombia**. Moneda COP (enteros). Zona horaria `America/Bogota`.

1. **Nunca trabajes sobre `main`.** Rama `v6-mostrador-cinematico` desde `main`, **un PR** al final, sin merge.
2. **No cambies la lógica de `pricing.js`.** Es la única fuente de totales y promos. El mostrador la **usa**, no la copia.
3. **No inventes datos del negocio** (dirección, Instagram, horarios, teléfono). Lo que falte queda como `TODO(dueño)` y se lista en el PR.
4. **Sin secretos en el repo.** La config web de Firebase y `ADMIN_UID` son públicos por diseño; cualquier otra credencial está prohibida.
5. **Sin frameworks ni bundler.** HTML/CSS/JS estático. Compatibilidad objetivo: Android Chrome 90+ y Safari 14+ (el código ya usa `?.` y `??`). Si usas algo más nuevo (por ejemplo `color-mix()`, que ya aparece en `site.css`), declara antes un valor de respaldo.
6. **No aflojes el CSP** para permitir CDNs externos. Las librerías se alojan en el repo.
7. **Un commit por fase** (`fase-N: descripción`). Al cerrar cada fase corre las pruebas de `tests/`; si fallan, arréglalas antes de seguir.
8. **Todo texto que viene de datos y entra en HTML pasa por `esc()`** (`shared/menu-schema.js`). Nada de `innerHTML` con datos sin escapar.
9. **No reviertas** lo ya hecho: arreglos del +18, PWA, panel actual, transición de reglas, tienda y panel funcionando.
10. **No subas** `node_modules`, `tests/test-results/` ni capturas temporales.
11. **Cada cambio de reglas va en `firestore.rules` Y en `firestore.rules.transition`.** Nunca asumas que las reglas nuevas ya están publicadas.

---

## 1. Contexto verificado (leído del código del zip; si algo difiere, repórtalo)

| Tema | Hecho verificado |
|---|---|
| Stack | HTML/CSS/JS sin build. Firebase 10.12.2 (Auth + Firestore) desde `gstatic.com`. Vercel sirve la raíz; `scripts/stamp-version.mjs` estampa el SHA en `sw.js` y `admin/sw.js`. |
| Tienda | `index.html`, CSS en 5 archivos en este orden: `styles.css`, `layout.css`, `catalog.css`, `site.css`, `motion-effects.css`. JS: `theme-init.js`, `pricing.js`, `shared/menu-schema.js`, `store-firebase.js`, `hero-scene.js`, `storefront.js`, `motion.js`, `checkout.js`, `cart-motion.js`. |
| Reglas CSS duplicadas | Hay reglas que se pisan entre archivos (por ejemplo `.brand img` aparece en `styles.css`, `catalog.css` y `motion-effects.css`, esta última con el comentario "Final brand sizing"). **No agregues un sexto override**: consolida. |
| Panel | `admin/index.html`, `admin.js` (~2.300 líneas), `admin.css`, `xlsx-export.js` (generador XLSX propio, sin librerías). Pestañas: Hoy, Pedidos, Menú, Ventas, Ajustes. PWA propia (`admin/sw.js`, `admin/manifest.webmanifest`). |
| Datos | `tienda/menu` (público de lectura), `pedidos` (PII, solo dueño lee), `seguimiento` (público por ID). No existe colección de ventas presenciales. |
| Estadísticas | `aggregate()` y `statsView()` calculan sobre el arreglo `orders`, que llega de `watchOrders` con **`limit(300)`**. Con más de 300 pedidos en el rango, las cifras de periodos largos salen incompletas (el Excel sí usa `getAllOrders`, que pagina). Además `aggregate()` solo lee `pedidos`. |
| Auth | Un único `ADMIN_UID`. `onAuthStateChanged` cierra la sesión de cualquier otro UID. `startPanel()` siempre suscribe `watchOrders` (un empleado recibiría error de permisos). |
| Reglas | `isOwner()` por UID fijo. `validNewOrder` valida claves, tipos y que `subtotal == total + descuento`. Existe patrón de `orderAudit()` en el panel que marca "Total no cuadra". |
| Precios | `BarrioIcePricing.calculate(items, day, menu)` devuelve `lines` (pagadas + regalo), `subtotal`, `discount`, `total`. Hoy el único tipo de promo es 2x1 por día activado en `menu.promos` (el 3x2 de jueves ya no existe en el código). Forma de un ítem: `{ n, s, sabores[], p, q, g, tipo, regalo, adulto, giftFlavor }`. |
| Licor | Los sabores de licor se marcan con `l` / `adulto` en `menu.cat` (no todos los granizados llevan alcohol). Bebidas con licor: `adulto: true`. |
| Vaso de granizado | La tarjeta de sabor **ya trae un vaso en CSS**: `.flavor > .cup > .straw, .rim, .glass > .fill` con la variable `--flavor` (color del sabor). Es pequeño (68×105 px) y el relleno anima con `@keyframes fill`. |
| Animación actual | `hero-scene.js` construye el hero con aura, anillos, astillas de hielo y ventanas que parpadean (CSS), más tilt con puntero vía variables `--tx/--ty`. `motion.js` hace skeletons, reveals con `IntersectionObserver`, contador de moneda y "vuelo" al carrito. Tras cada `render()` de la tienda se dispara el evento `barrio:render`. `.hero-logo-wrap` ya usa `transform` por CSS (tilt + animación `hero-bob`). |
| Logo | Header/footer usan `logo-mark-{dark,light}.webp` (575×504 RGBA). Hero y seguimiento usan `logo-{dark,light}.webp` (625×970 RGBA). `.brand img` final: fondo transparente, sin borde ni filtro. |
| CSP (`vercel.json`) | `script-src 'self' 'unsafe-inline' gstatic recaptcha`. Hay **un solo script en línea** ejecutable (el de tema en `admin/index.html`); la tienda no tiene; no hay manejadores `onclick=` en HTML ni JS. |
| Pruebas | `tests/`: `pricing.test.cjs`, `promotions.browser.cjs`, `visual-check.cjs` (Playwright + servidor local), `rules.test.mjs` (emulador, acepta `FIRESTORE_RULES_FILE`). El panel tiene modo E2E (`?e2e=1` solo en localhost) con `makeLocalTestStore()` y `window.__barrioAdminE2E`. |
| Service workers | `sw.js` (tienda) y `admin/sw.js` listan su `SHELL`. **Todo archivo nuevo debe agregarse ahí** o falla offline. |

### Diagnóstico del logo (ya comprobado)
Renderizado sobre `#07131d`/`#06121c`, el cubo tiene un **contorno negro grueso que forma parte del dibujo** y se funde con el fondo oscuro. Por eso parece "recortado con manchas negras". No es un halo de recorte (hay muy pocos píxeles semitransparentes oscuros). La solución es un **borde claro exterior**, no solo "recortar mejor".

---

## 2. Decisiones por defecto (para no bloquearte; el dueño las confirma en el PR)

- Las promos del día **sí** aplican en el mostrador, con un interruptor visible "Aplicar promo del día" (por defecto según `menu.promos`). `TODO(dueño): confirmar.`
- Métodos de pago del mostrador: Efectivo, Nequi, Daviplata, Otro.
- Un descuento manual solo se permite con motivo obligatorio, tope 50 % del subtotal para empleados.
- El empleado no puede ver pedidos online, estadísticas globales ni el menú completo (solo lo que necesita para vender).
- La venta del mostrador nunca se borra: se **anula** con motivo, y el dueño ve la auditoría.
- El horario de cierre del negocio es 22:00, así que la fecha de una venta se toma de la hora de Bogotá del servidor.

---

## 3. Orden de trabajo y puertas de calidad

| Fase | Contenido | Puerta de salida |
|---|---|---|
| 0 | Línea base | Pruebas actuales en verde, capturas base, inventario de CSS |
| 1 | Logo en modo oscuro | Capturas 360/768/1440 sin manchas ni halos |
| 2 | Datos, roles y reglas | Pruebas de reglas en verde con **ambos** archivos de reglas |
| 3 | Mostrador (UI del empleado) | Flujo completo probado en E2E local |
| 4 | Estadísticas unificadas y Excel | Pruebas de `stats-core` en verde, cifras cuadran con datos de prueba |
| 5 | Animación cinematográfica (tienda) | 60 fps en móvil de gama media, CLS bajo, funciona sin JS de animación |
| 6 | Recomendaciones | Solo propuestas en el PR, sin implementar |

---

## FASE 0 · Línea base (no edites código)

1. Crea la rama. Corre `cd tests && npm ci && npx playwright install chromium && npm test && npm run test:rules` y anota el resultado.
2. Guarda capturas base de tienda y panel en 360×640, 390×844, 768×1024 y 1440×900, tema claro y oscuro (`tests/screenshots/` ya sirve de formato).
3. Haz un inventario breve de CSS duplicado para `.brand img`, `.hero-logo`, `.hero-logo-wrap`, `.cup`, `.flavor`. Dime qué regla gana hoy en cada caso.
4. Mide una línea base de Lighthouse móvil de la tienda (LCP, CLS, TBT, peso de JS) y guárdala para compararla al final.

---

## FASE 1 · Logo en modo oscuro (tienda, seguimiento y panel)

**Objetivo:** que el logo se vea nítido, con presencia y sin "manchas negras" sobre `#06121c`, `#07131d` y `#0b1b27`.

1. **Verifica** el problema renderizando los 4 `.webp` sobre esos fondos y en cada sitio donde aparecen: header, hero, footer, seguimiento, login y cabecera del panel.
2. **Solución de asset (preferida):** crea `scripts/make-dark-logo-rim.py` (herramienta de desarrollo, no entra al build) que, para las variantes `*-dark.webp`: dilata el canal alfa 2-3 px, colorea ese anillo exterior de `#bfefff` con suavizado, y compone el logo original encima. Conserva el alfa y exporta WebP con calidad ≥ 90 sin cambiar dimensiones. Revisa que no queden halos ni bordes dentados. Si necesitas el original en alta resolución (PNG/SVG con fondo transparente) para un resultado perfecto, pídelo en el PR y entre tanto entrega la solución de respaldo.
3. **Solución de respaldo en CSS** (si no hay asset mejor): en `:root[data-theme="dark"]` aplica al logo del header/footer `filter: drop-shadow(0 0 1px rgb(190 240 255 / 95%)) drop-shadow(0 0 6px rgb(91 192 235 / 55%))`, y al del hero un borde claro adicional además del glow que ya tiene. Si aún no basta, usa una chapa redondeada translúcida detrás del logo del header.
4. **Consolida las reglas** `.brand img` en un solo lugar (elimina los overrides redundantes), con altura fija (40 px móvil, 52 px ≥ 700 px), `width:auto`, `object-fit:contain`, sin deformar y sin empujar los botones del header a 360 px.
5. Modo claro **no cambia**. Verifica que el cambio de tema no parpadee (`applyBrandTheme()` ya existe en `hero-scene.js` y en `admin.js`; no dupliques lógica, deja una sola).
6. Actualiza el hero para que el texto jamás quede tapado por el logo en escritorio ni en móvil.

---

## FASE 2 · Datos, roles y reglas de Firebase (hazla antes de la UI)

### 2.1 Colecciones nuevas

| Colección | Quién escribe | Quién lee | Notas |
|---|---|---|---|
| `staff/{uid}` | solo el dueño | el dueño; cada empleado su propio documento | `{ rol: "empleado", activo: true, nombre }` |
| `ventas_local/{id}` | dueño o empleado activo (solo `create`) | dueño todo; empleado solo las suyas | inmutable salvo campos de anulación |
| `cierres/{id}` | dueño o empleado activo (solo `create`) | solo el dueño | conteo de caja |
| `auditoria/{id}` | dueño o empleado activo (solo `create`) | solo el dueño | sin update ni delete |

### 2.2 Modelo de `ventas_local/{id}`
- `items`: lista con la **misma forma que los pedidos online** (`n, s, sabores[], p, q, g, tipo, regalo, adulto`) para reutilizar la agregación.
- `subtotal, descuento, ajuste, total` (enteros COP; `ajuste` es un descuento manual ≥ 0), `promo` (string), `metodoPago`.
- `mayor18` (bool), `tieneLicor` (bool).
- `fecha` (`YYYY-MM-DD`, Bogotá), `creadoEn` (`serverTimestamp()`), `empleadoUid`, `empleadoNombre`, `canal: "mostrador"`.
- `anulada` (bool, `false` al crear), `anuladaMotivo`, `anuladaPor`, `anuladaEn`.
- `ajusteMotivo` (string, obligatorio si `ajuste > 0`).
- **ID idempotente:** el cliente genera el ID (≥ 20 caracteres, por ejemplo con `crypto.randomUUID()` sin guiones) y escribe con `setDoc`. Así un doble toque o un reintento offline no duplica la venta.

### 2.3 Reglas (boceto a verificar en el emulador; ajusta lo que el emulador rechace)

```
function signedIn() { return request.auth != null; }
function isOwner()  { return signedIn() && request.auth.uid == 'NDdEIdTQiqMS947ENRr7aEq1i6B3'; }
function staffPath(uid) { return /databases/$(database)/documents/staff/$(uid); }
function isStaff() {
  return signedIn() && exists(staffPath(request.auth.uid)) &&
    get(staffPath(request.auth.uid)).data.activo == true &&
    get(staffPath(request.auth.uid)).data.rol == 'empleado';
}
function isTeam() { return isOwner() || isStaff(); }

match /staff/{uid} {
  allow get: if signedIn() && (request.auth.uid == uid || isOwner());
  allow list, create, update, delete: if isOwner();
}

match /ventas_local/{id} {
  allow create: if isTeam() && validSale(id);
  allow get, list: if isOwner() || (isStaff() && resource.data.empleadoUid == request.auth.uid);
  allow update: if canVoidSale();
  allow delete: if false;
}
// validSale: hasOnly/hasAll de claves; id.size() >= 20; items es list con 1..60 elementos;
// total >= 1000 y <= 2000000; descuento >= 0; ajuste is int && >= 0 && ajuste*2 <= subtotal;
// total == subtotal - descuento - ajuste; (ajuste == 0 || ajusteMotivo.size() >= 5);
// metodoPago in ['Efectivo','Nequi','Daviplata','Otro']; mayor18 is bool; tieneLicor is bool;
// (!tieneLicor || mayor18 == true); anulada == false;
// empleadoUid == request.auth.uid; canal == 'mostrador';
// creadoEn == request.time; fecha == fecha de Bogotá calculada con request.time - duration.value(5,'h')
//   (year()/month()/day() con relleno de ceros; verifica los bordes de medianoche en el emulador).
// canVoidSale: solo cambian ['anulada','anuladaMotivo','anuladaPor','anuladaEn']; anulada pasa de false a true;
//   anuladaPor == request.auth.uid; anuladaEn == request.time; motivo >= 5 caracteres.
//   Dueño: siempre. Empleado: solo su venta y solo dentro de los 2 min posteriores a creadoEn.
// Nadie puede cambiar montos después de creada la venta.

match /cierres/{id}   { allow create: if isTeam() && validClosing(); allow read: if isOwner(); allow update, delete: if false; }
match /auditoria/{id} { allow create: if isTeam() && validAudit(); allow read: if isOwner(); allow update, delete: if false; }
```

**Límite honesto de las reglas:** no pueden recorrer la lista `items`, así que no validan que la suma de líneas coincida con `subtotal`. Replica el patrón `orderAudit()` del panel para marcar ventas con "Total no cuadra" y auditarlas.

**Lectura del empleado:** limítala a sus propias ventas (`empleadoUid == request.auth.uid`) y filtra "hoy" en la interfaz. Evita reglas de lectura basadas en `request.time` si el emulador rechaza las consultas.

### 2.4 Cambios de cliente
1. `onAuthStateChanged` en `initializeFirebase()`: hoy cierra cualquier UID ≠ `ADMIN_UID`. Cámbialo para resolver el rol: dueño si coincide el UID, empleado si existe `staff/{uid}` activo, y si no, mensaje claro y `signOut`.
2. `startPanel(user)`: si el rol es empleado **no** llames `watchOrders` ni cargues estadísticas; solo el menú y sus propias ventas.
3. `adminRender()` y la navegación: el empleado ve **solo** la pestaña Mostrador; el dueño ve todo. Esto es comodidad: la defensa real son las reglas.
4. `makeLocalTestStore()` y `__barrioAdminE2E.startSession(user)` deben soportar `ventas_local`, `cierres`, `auditoria` y un rol de prueba (solo en `localhost` con `?e2e=1`), para poder probar en Playwright.
5. Sesión del empleado: cierre automático tras 10 min sin interacción, y bloqueo al ocultar la app por más de 2 min (`visibilitychange`). Nunca guardes la contraseña.

### 2.5 Endurecimiento del CSP
Mueve el script de tema en línea de `admin/index.html` a `admin/theme-init.js` (agrégalo a `admin/sw.js`) y **elimina `'unsafe-inline'` de `script-src`** en `vercel.json`. Mantén `style-src 'unsafe-inline'` (la tienda usa estilos en línea con `--flavor`). Verifica que no haya manejadores inline ni errores de CSP en consola (tienda, panel, impresión de comanda).

### 2.6 App Check
`APP_CHECK_SITE_KEY` está vacío. **No actives enforcement.** Deja la integración lista y documenta en el PR los pasos del dueño (clave reCAPTCHA v3, monitoreo 7 días, enforcement cuando > 95 % válidas).

### 2.7 Orden de publicación de reglas
Respeta el README: primero `firestore.rules.transition`, luego código, luego (tras el periodo) `firestore.rules`. Las colecciones nuevas son solo para el equipo: no afectan a clientes antiguos.

### 2.8 Pruebas de reglas (extiende `tests/rules.test.mjs`)
Corre **todo** contra los dos archivos (`FIRESTORE_RULES_FILE=firestore.rules.transition`). Casos mínimos:
- Empleado activo crea venta válida → OK.
- Venta con total manipulado, ajuste sin motivo, `anulada: true` al crear, `empleadoUid` ajeno, método de pago inválido, fecha de otro día, ID corto → fallan.
- Licor sin `mayor18` → falla.
- Empleado lee ventas de otro empleado, lee `pedidos`, `cierres` o `auditoria` → fallan.
- Empleado edita monto, borra, o anula pasados 2 min / venta ajena → fallan.
- Empleado inactivo (`activo: false`), usuario sin documento `staff`, anónimo → fallan.
- Dueño anula con motivo → OK; dueño cambia un monto → falla.
- Empleado no puede escribir en `staff/{uid}` ni en `tienda/menu`.

---

## FASE 3 · Mostrador (venta presencial)

**Archivos nuevos (no sigas inflando `admin.js`):** `admin/pos.js` (lógica + UI), estilos en `admin/admin.css` (sección propia). Agrégalos a `admin/index.html` y al `SHELL` de `admin/sw.js`.

### 3.1 Pantalla del empleado (móvil primero, una mano)
- Rejilla de **sabores de hoy** (`menu.dias[día]`) con el color del sabor, etiqueta `+18` si `adulto`, y deshabilitado si está agotado (`menu.agotados`).
- Toque en un sabor → selector de tamaño (Pequeño/Mediano/Grande) con el precio del día tomado de `BarrioIcePricing.planForDay`. Soporta **Mitad y mitad** (`sabores: [a, b]`) igual que la tienda.
- Bebidas y combos del menú como botones secundarios.
- **Barra inferior fija** (respeta `env(safe-area-inset-bottom)`): total en vivo con transición numérica, método de pago y botón grande **Registrar venta** (≥ 56 px de alto). Zonas táctiles de toda la pantalla ≥ 48 px.
- Resumen editable con +/− por línea y "deshacer última" durante 2 min.
- **Totales:** siempre con `BarrioIcePricing.calculate(items, día, menu)` para obtener `lines` (con regalos), `subtotal`, `discount` y `total`. Guarda exactamente esas líneas.
- Interruptor "Aplicar promo del día" (ver sección 2) y "Descuento manual" con motivo obligatorio.
- Si el carrito tiene licor: diálogo "¿El cliente es mayor de 18 años?" antes de registrar; guarda `mayor18` y `tieneLicor`.
- **Anti doble venta:** deshabilita el botón mientras escribe, ID idempotente (sección 2.2), confirmación visual clara (✓, vibración corta con `navigator.vibrate` si existe, sonido opcional ya existente).
- **Offline:** la caché persistente de Firestore ya está activa. Muestra un indicador "N ventas pendientes de sincronizar" usando `metadata.hasPendingWrites`. Si el empleado intenta deshacer una venta aún sin sincronizar, resuélvelo con criterio (cancelar la escritura pendiente o esperar) y documenta la decisión.
- **Mis ventas de hoy:** lista, total, cantidad de granizados y desglose por método de pago.
- **Cierre de caja del empleado:** efectivo esperado = ventas en efectivo **de mostrador** de ese empleado hoy; campo "efectivo contado"; diferencia; notas. Se guarda en `cierres`. No muestra totales online ni de otros empleados.

### 3.2 Vista del dueño sobre el mostrador
- Lista de ventas con filtros (fecha, empleado, método de pago, anuladas) y detalle.
- **Anular** con motivo (escribe en `auditoria`). Indicador "Total no cuadra" al estilo `orderAudit()`.
- Gestión de empleados: crear el documento `staff/{uid}`, activar/desactivar, cambiar nombre. La cuenta se crea en Firebase Authentication (consola); documenta los pasos en el README.
- Los ajustes de precio y las anulaciones se ven destacados.

---

## FASE 4 · Estadísticas unificadas (online + mostrador)

### 4.1 Problema a corregir
`statsView()` usa el arreglo `orders` (últimos 300). Diseña la carga para que los periodos largos sean exactos.

### 4.2 Módulo puro y probado
Crea `admin/stats-core.js` como UMD (mismo patrón de `pricing.js`, usable en Node) con funciones puras: normalizar pedido/venta a una forma común, `aggregate(list, { canal })`, combinar canales, series por día/hora/día de semana, ranking de sabores, comparación con el periodo anterior. Reutiliza la lógica actual de `aggregate()` (pedidos únicos, excluye cancelados/anulados, fechas de Colombia, regalos aparte). Añade `tests/stats.test.cjs` y súmalo a `npm test`.

### 4.3 Estrategia de carga
- Consultas **por rango de fecha** con paginación (como `getAllOrders`) para `pedidos` y `ventas_local`; suscripción en tiempo real solo para **hoy**.
- Memoriza en la sesión los días ya cerrados; botón "Actualizar". Registra en Ajustes → Diagnóstico cuántas lecturas hizo la vista de estadísticas (cuida la cuota gratuita de Firestore).

### 4.4 Interfaz (pestañas Hoy y Ventas, solo dueño)
- Filtro de canal: **Todos / Online / Mostrador**. Periodos: hoy, ayer, 7 días, mes, rango.
- Métricas: ventas totales, ventas por canal, ticket promedio, granizados pagados vs regalados, ahorro por promos, efectivo esperado total (online en efectivo + mostrador), comparación contra el periodo anterior.
- Gráficos en **SVG propio, sin librerías**: línea de ventas por día, barras por canal, por método de pago y por tamaño, ranking de sabores (con % del total), **mapa de calor hora × día de la semana** (para decidir turnos), ventas por empleado, mejor día/hora.
- Mantén `barRows()` para listados simples y reutiliza el sistema de tarjetas/`metrics` existente. Misma identidad visual en claro y oscuro.
- La pestaña **Hoy** muestra ventas de ambos canales, desglose y efectivo esperado total.

### 4.5 Excel
Extiende `exportExcel()` / `xlsx-export.js`: hoja **Mostrador** (una fila por venta), columna **Canal** en las hojas de resumen, y que los totales sumen ambos canales. Sin librerías nuevas.

---

## FASE 5 · Animación cinematográfica (solo tienda)

### 5.1 Decisión de librería (máx. 10 líneas en el PR)
Compara GSAP + ScrollTrigger, Lenis y alternativas por peso, compatibilidad con el CSP, licencia y rendimiento en móvil. **Mi preferencia: GSAP + ScrollTrigger.** Confirma la licencia vigente en gsap.com antes de incluirlo. **No uses Lenis por defecto**: el 90 % de los clientes entra desde el celular y el scroll suave por JS puede pelear con el scroll nativo de iOS, los enlaces ancla (`#sabores`) y el bloqueo de scroll del carrito. Solo si lo mides y mejora sin lag. Nada de Three.js ni librerías pesadas.

### 5.2 Integración técnica
- Aloja `gsap.min.js` y `ScrollTrigger.min.js` en `/vendor/gsap/` con su archivo de licencia y la versión fijada en el nombre. **No toques el CSP.** Agrégalos al `SHELL` de `sw.js` (solo tienda).
- Cárgalos con `defer` o inyectados tras `load`/`requestIdleCallback`; no pueden bloquear el primer pintado. Si fallan o hay `prefers-reduced-motion`, la tienda se ve y funciona completa (usa una clase `gsap-ready` en `<html>` para activar estilos de animación; sin ella, el CSS actual sigue valiendo).
- `vercel.json`: añade cabecera de caché larga para `/vendor/` (después de la regla general de `.js` para que gane).
- Todo dentro de `gsap.matchMedia()`: versión completa en escritorio, versión reducida en móvil, nada de animación con `prefers-reduced-motion`. Anima solo `transform`, `opacity` y `clip-path`; nunca `width/height/top/left`.
- **Conflicto a evitar:** `.hero-logo-wrap` ya usa `transform` (tilt por variables CSS + `hero-bob`). **No animes ese elemento con GSAP**. Crea un contenedor externo (por ejemplo `.hero-parallax`) para el parallax por scroll.
- **Contenido dinámico:** `storefront.js` reescribe `#flavors.innerHTML` en cada `render()` (tiempo real) y dispara `barrio:render`. En ese evento: destruye los triggers anteriores de las tarjetas, crea los nuevos, llama `ScrollTrigger.refresh()` y **no repitas la animación de entrada** en tarjetas que ya estaban visibles.
- Decide quién manda: `motion.js` ya hace reveals con `IntersectionObserver`. Donde GSAP anime lo mismo, quita el reveal duplicado.

### 5.3 Efectos (adapta, no dupliques)
1. **Hero con parallax por capas:** aura, anillos, astillas de hielo y partículas a distintas velocidades (`data-depth`) con scrub suave, integrado con el tilt de puntero ya existente. El texto jamás queda tapado.
2. **Granizados que "se expanden" al hacer scroll:** potencia el vaso CSS existente (`.cup`): en escritorio crece de ~0.85 a ~1.15 y se endereza (de 7° a 0°) con scrub; el relleno sube de nivel; textura de **frappé de colores** con degradados en capas teñidos con `--flavor`, burbujas y cubitos. En móvil, versión liviana (escala + nivel de relleno).
3. **Showcase de sabores (solo escritorio ≥ 1024 px y sin reduced-motion):** sección con vaso grande fijo que cambia de color al pasar por cada sabor de hoy. En móvil no se hace `pin`: se reemplaza por un fondo/aura que cambia de color con el sabor visible.
4. **Aura de sección por sabor:** el fondo cambia suave al color del sabor en pantalla.
5. **Sabor del día y combos:** entrada con profundidad (stagger + escala), brillo/escarcha en el sabor del día.
6. **Fotos reales:** si el dueño aporta fotos de granizados, deben poder sustituir el vaso CSS sin reescribir el código (campo de imagen opcional por sabor; sin imagen, usa el vaso).
7. **Licor:** los sabores con licor muestran `+18` y las animaciones no cambian la verificación de edad.
8. Reutiliza lo que ya funciona (cinta de promos, contador de moneda, vuelo al carrito).

### 5.4 Presupuesto de rendimiento y robustez
- GSAP + ScrollTrigger + código propio ≤ **80 KB comprimidos**.
- Lighthouse móvil: sin empeorar respecto a la línea base de la Fase 0; **CLS ≤ 0.05**; sin trabajo largo en el hilo principal durante el scroll.
- Imágenes con dimensiones definidas; animaciones que se pausan fuera de pantalla.
- Probar con: 0 sabores, 12+ sabores, nombres largos, sabor agotado, conexión lenta, y con la librería bloqueada.

---

## FASE 6 · Recomendaciones (no implementar sin aprobación)
Propón **como máximo 5** mejoras de alto impacto, con esfuerzo estimado (S/M/L). Candidatas: gastos del día y utilidad, inventario básico (hielo, vasos, licor) con alertas, que el empleado marque sabores agotados con un permiso mínimo, ranking/metas de ventas por empleado, exportación o respaldo automático, resumen diario por WhatsApp al dueño.

---

## 7. Verificación final y criterios de aceptación

- [ ] `npm test` y `npm run test:rules` en verde (reglas probadas contra **ambos** archivos), con pruebas nuevas de mostrador, `stats-core` y roles.
- [ ] Capturas actualizadas en 360×640, 390×844, 412×915, 768×1024 y 1440×900, claro y oscuro, tienda y panel (incluye Mostrador y Ventas).
- [ ] Cero errores en consola y cero violaciones del CSP en tienda, panel e impresión de comanda.
- [ ] El empleado **no** puede ver pedidos, estadísticas globales, cierres ni auditoría; nadie puede borrar una venta ni cambiar montos.
- [ ] Una venta de prueba con licor exige confirmación de mayoría de edad y queda registrada.
- [ ] Doble toque y reconexión offline **no** duplican ventas.
- [ ] Las cifras de Hoy/Ventas/Excel suman online + mostrador y coinciden con los datos de prueba.
- [ ] El logo se ve limpio en oscuro y claro en todas sus apariciones.
- [ ] La tienda se ve y funciona completa si GSAP no carga o hay `prefers-reduced-motion`.
- [ ] Lighthouse móvil no empeora y CLS ≤ 0.05.
- [ ] `sw.js` y `admin/sw.js` incluyen todos los archivos nuevos; la PWA se actualiza sin romperse.

---

## 8. Entrega

PR con un resumen de **máximo 25 líneas**: archivos modificados y por qué, decisiones tomadas (con sus alternativas), lo que **no** hiciste y la razón, resultados de pruebas y de Lighthouse (antes/después), y la lista de **pasos del dueño**:
1. Crear la cuenta del empleado en Firebase Authentication y su documento `staff/{uid}`.
2. Publicar las reglas en el orden indicado y probar una venta real de prueba.
3. Confirmar si las promos aplican en el mostrador.
4. Aportar fotos reales de los granizados y el logo original en alta resolución (PNG/SVG con fondo transparente).
5. Configurar App Check y alertas de facturación de Firebase.

---

## 9. Reparto de trabajo si puedes paralelizar (cada uno es dueño de sus archivos)

| Agente | Archivos | Depende de |
|---|---|---|
| A · Seguridad y datos | `firestore.rules`, `firestore.rules.transition`, `tests/rules.test.mjs`, `vercel.json` (CSP), `admin/theme-init.js` | nada |
| B · Panel | `admin/pos.js`, `admin/stats-core.js`, `admin/admin.js` (solo puntos de integración), `admin/admin.css`, `admin/xlsx-export.js`, `admin/index.html`, `admin/sw.js`, `tests/stats.test.cjs` | A (modelo y reglas) |
| C · Tienda | logo y CSS de marca, `hero-scene.js`, `motion.js`, `motion-effects.css`, `site.css`, `vendor/gsap/`, `sw.js`, `scripts/make-dark-logo-rim.py` | independiente |

Reglas de convivencia: nadie edita archivos de otro; los cambios en `admin.js` son mínimos y puntuales (autenticación, navegación, carga); al final, una sola pasada de integración y de pruebas completas.

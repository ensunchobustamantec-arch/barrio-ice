# Barrio Ice · tienda y panel

Tienda estática de pedidos para Barrio Ice, Montería. Se publica desde Vercel sin bundler; Firebase conserva el menú, los pedidos y el seguimiento.

## Estructura

- `index.html`: tienda, SEO y marcado. `styles.css`, `layout.css`, `catalog.css`, `site.css` y `motion-effects.css`: estilos, cargados en ese orden.
- `theme-init.js`: aplica el tema antes del primer pintado.
- `shared/menu-schema.js`: configuración Firebase, valores por defecto y normalización del menú.
- `pricing.js`: única fuente para promos y totales. No edites su lógica sin caracterizarla y probarla.
- `store-firebase.js`: inicializa Firebase y guarda pedidos; `storefront.js`: catálogo y carrito; `checkout.js`: valida el pedido; `hero-scene.js`, `motion.js` y `cart-motion.js`: animación y accesibilidad.
- `admin/index.html`, `admin/admin.js`, `admin/admin.css`: panel privado; `admin/manifest.webmanifest` y `admin/sw.js`: su PWA independiente.
- `manifest.webmanifest` y `sw.js`: PWA de la tienda. `scripts/stamp-version.mjs` pone automáticamente el SHA de Vercel en ambos service workers durante el build.

## Uso e instalación

- Tienda: [barrio-ice.vercel.app](https://barrio-ice.vercel.app/). El cliente puede pedir en el navegador o instalar la PWA.
- Panel: [barrio-ice.vercel.app/admin/](https://barrio-ice.vercel.app/admin/). Inicia sesión con el correo autorizado de Firebase; no existe una clave de prueba.
- En Android/Chrome o escritorio/Chrome/Edge, abre la URL y elige **Instalar app** o **Añadir a pantalla de inicio** en el menú del navegador. En iPhone/iPad, abre la URL en Safari, toca **Compartir** y **Añadir a pantalla de inicio**. Repite el proceso para `/admin/` si también quieres instalar el panel.

## Firebase y publicación de reglas

La configuración pública del proyecto está en `shared/menu-schema.js`; el acceso de administración se restringe por Firebase Authentication y `firestore.rules`.

1. Publica primero `firestore.rules.transition` desde Firebase Console → Firestore → Reglas.
2. Publica el código actualizado desde el PR a `main` y confirma que la PWA se actualice.
3. Espera siete días y revisa en **Ajustes → Diagnóstico** que los pedidos nuevos incluyan mayoría de edad y documento de seguimiento.
4. Publica después `firestore.rules` estrictas y prueba un pedido real. Si falla, vuelve temporalmente a las reglas de transición.
5. Mantén App Check en modo monitor siete días; aplica protección obligatoria cuando más del 95 % de las solicitudes sean válidas.

### Mostrador y empleados

1. Crea primero la cuenta del cajero en Firebase Authentication (correo y contraseña).
2. Copia su UID y, como dueña, entra a **Mostrador** en el panel. Guarda el UID, nombre y estado activo.
3. Publica primero `firestore.rules.transition`, prueba una venta presencial y solo después del periodo de transición publica `firestore.rules`.
4. La promo 2x1 del día se aplica por defecto en el mostrador; confírmala antes de abrir caja. TODO(dueño): confirmar esta política.
5. App Check queda en modo monitor: configura reCAPTCHA v3, revisa solicitudes válidas durante siete días y activa enforcement únicamente cuando supere 95 %.

No publiques reglas estrictas antes de completar el periodo de transición: puede bloquear clientes con versiones antiguas en caché.

## Pruebas

~~~powershell
cd tests
npm ci
npx playwright install chromium
npm test
npm run test:rules
~~~

La suite comprueba precios, promociones, tienda y panel con Playwright; las reglas usan el emulador Firestore. Las capturas actualizadas se guardan en `tests/screenshots/`.

## Antes de publicar

- [ ] El PR pasa las pruebas y se ve bien en 360×640, 390×844, 412×915, 768×1024 y 1440×900, en ambos temas.
- [ ] Probar menú, promos, +18, carrito, recogida/domicilio, pago, WhatsApp y seguimiento en la vista previa.
- [ ] Confirmar en Vercel que `main` es producción y que cada PR crea una vista previa.
- [ ] Publicar reglas siguiendo el orden de transición anterior; confirmar el dominio autorizado en Firebase Authentication.
- [ ] Revisar **Ajustes → Diagnóstico**, horarios, WhatsApp, pagos, Instagram y ubicación reales.
- [ ] No agregar secretos, direcciones, coordenadas ni enlaces sociales no confirmados.

## Pendiente del dueño

- Agregar `barrio-ice.vercel.app` a los dominios autorizados de Firebase.
- Publicar reglas de transición y, después del periodo indicado, las reglas estrictas.
- Registrar la app en Firebase App Check con una clave de sitio reCAPTCHA v3; activar enforcement después del monitoreo.
- Configurar presupuestos y alertas de facturación de Firebase.
- Confirmar Instagram y enlace de ubicación reales, dirección, coordenadas y horarios por día; no están inventados en los metadatos.
- Proteger `main` para exigir PR y revisar que Vercel genere previews.
- Verificar el sitio en Google Search Console y crear o reclamar el perfil de Google Business Profile.

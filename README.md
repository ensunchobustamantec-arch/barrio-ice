# Barrio Ice · tienda de pedidos

Tienda web móvil para pedir granizados, bebidas y combos de Barrio Ice en Montería. Es una página estática, sin compilación; Vercel puede publicar directamente la rama elegida.

## Promociones y pedidos

- Lunes a miércoles: 2x1 en granizados del mismo tamaño y precio. Jueves: 3x2 con la misma condición. Viernes a domingo: precio normal. Los días de promoción se pueden activar o desactivar desde el panel.
- Cada regalo queda visible como una línea gratuita, con selector de sabor cuando hace falta. Granizados de diferente tamaño o precio no se mezclan; bebidas y combos no participan.
- El resumen muestra valor antes de descuentos, ahorro y total a pagar. El domicilio se coordina aparte y no altera ese total.
- El pedido se envía por WhatsApp y se guarda en Firestore. La tienda incluye seguimiento público por ID; el panel privado reúne pedidos, ventas, catálogo, horarios, promociones y configuración.
- Interfaz adaptable, temas claro y oscuro, banner configurable, modo instalación PWA y navegación móvil optimizada.

## Configuración de Firebase

El proyecto Firebase existente está configurado en `index.html`; no hace falta crear otro.

1. En Firebase Authentication, habilita Correo/contraseña para la cuenta dueña y confirma el UID.
2. El UID dueño ya está configurado en `CFG.adminUid` y en [firestore.rules](firestore.rules).
3. En Firebase Console, abre **Firestore Database → Reglas**, copia el archivo completo `firestore.rules` y pulsa **Publicar**. La versión nueva permite guardar los campos de promoción y hasta 60 líneas de pedido para separar productos pagados y regalos.
4. Despliega el sitio y prueba una orden desde el dominio antes de abrir la tienda al público.

## Guía rápida del dueño

Entra a `TU-DOMINIO/#admin` e inicia sesión con el correo de Firebase autorizado.

- **HOY:** revisa el estado de apertura, sabores disponibles y resumen de ventas del día. Ajusta disponibilidad del día sin borrar el catálogo.
- **PEDIDOS:** busca por cliente o ID, filtra por fechas y estado, abre WhatsApp, cambia el estado o imprime el comprobante. Los estados incluyen recibido, preparando, listo, enviado, entregado y cancelado.
- **MENÚ:** edita sabores, precios por tamaño y día, disponibilidad, bebidas, combos y sabores disponibles por jornada. Guarda los datos de un sabor con **Guardar catálogo**; los cambios de edad mínima se sincronizan también al guardar sabores del día o precios. Configura por separado lunes-miércoles, jueves y fin de semana; puedes pausar cada promo o mitad y mitad.
- **VENTAS:** consulta totales y comparaciones por periodo, descuentos, cantidades y productos. Exporta el rango elegido a Excel desde el botón de exportación.
- **AJUSTES:** configura apertura y cierre para cada día, teléfono y enlaces de pago, texto de cierre y banner de promoción. Guarda y comprueba la vista pública.

La primera cuenta autorizada y sus permisos se controlan con el UID de Firebase; la configuración web pública de Firebase no es una contraseña. Las reglas de Firestore son el control de acceso.

## Pruebas y vista previa

La rama de trabajo es `mejoras-v4`; los cambios se proponen mediante PR y no se mezclan automáticamente en `main`. Vercel puede generar una vista previa para la rama/PR.

Para instalar la dependencia de pruebas y verificar la lógica promocional y la interfaz:

~~~powershell
cd tests
npm install
npx playwright install chromium
npm test
~~~

Las capturas de referencia del chequeo visual quedan en `tests/screenshots/`.

Antes de publicar, revisa la vista previa en 360×640, 390×844, 412×915, 768×1024 y 1440×900; prueba los temas claro y oscuro, un día 2x1, jueves 3x2, precios/tamaños distintos, bebidas y combos, selector del sabor regalado, domicilio aparte, efectivo y cambio, y las cuatro secciones principales del panel.

## PWA y recursos

`manifest.webmanifest` y `sw.js` habilitan la instalación y caché básica. El service worker debe actualizar su caché cuando cambie el nombre de versión. Los logos, iconos e imagen social están en `assets/`.


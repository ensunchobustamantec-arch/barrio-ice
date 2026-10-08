# Barrio Ice · Cold Flow 🧊

Tienda web móvil para pedir granizados, gaseosas y cervezas de Barrio Ice en Montería. Es una página estática, sin compilación: Vercel la publica directamente desde el repositorio.

## Qué incluye

- Diseño urbano responsive, modo claro/oscuro, tarjeta social, favicon y PWA.
- Promos calculadas con la hora de Colombia: 2x1 lunes a miércoles, 3x2 jueves y precios normales de viernes a domingo. Se regala un granizado del mismo precio (2x1 y 3x2).
- Pedido por WhatsApp y respaldo del pedido en Firestore.
- El domicilio no se suma al total: la web muestra "Se paga aparte" y el mensaje de WhatsApp lo indica. Las promos son por mismo precio: 2x1 (compras uno y te regalan otro del mismo precio) y 3x2 (compras dos del mismo precio y te regalan el tercero). Granizados de precios distintos no se combinan, y los combos no entran en la promo.
- Al agregar un producto aparece un aviso arriba con botón "Ver pedido", y las tarjetas quedan marcadas con la cantidad elegida.
- Seguimiento público y en tiempo real por ID de pedido.
- Panel /#admin: catálogo, sabores diarios, agotados, horario, cierre manual, precios, pagos, pedidos, estados, sonido, resumen y CSV.
- Datos de formulario recordados solamente en el navegador del cliente.

## Preparación única en Firebase

La configuración web del proyecto barrio-ice ya está en index.html. No crees otro proyecto.

1. En Firebase Authentication, confirma que el usuario dueño usa el método **Correo/contraseña**.
2. Copia el **UID** de ese usuario.
3. El UID del dueño ya está configurado en CFG.adminUid y en firestore.rules.
4. En Firebase Console abre **Firestore Database → Reglas**, pega todo el contenido de firestore.rules y pulsa **Publicar**.

## Usar el panel

1. Abre TU-DOMINIO/#admin.
2. Inicia sesión con el correo dueño de Firebase.
3. En **Menú**, agrega sabores, marca los que llevan licor y selecciona los de cada día. Usa **Agotados hoy** para quitarlos de venta temporalmente.
4. En **Tienda**, actualiza horario, domicilio, WhatsApp, Nequi, Daviplata, enlaces y precios. Los ajustes se guardan en tienda/menu.
5. En **Pedidos**, activa el sonido después de tocar el botón, cambia cada estado y usa el selector de fecha o el botón CSV.

Los precios de jueves usan inicialmente los de lunes a miércoles. Está indicado en el código y puede modificarse desde el panel cuando se confirme la regla definitiva.

## Probar la rama

~~~powershell
git switch mejoras-v2
git status
~~~

Vercel creará un despliegue de vista previa al subir la rama al remoto. Para una prueba local sencilla:

~~~powershell
npx serve .
~~~

Abre el enlace que indique el comando. Comprueba al menos 360×640, 390×844, 412×915, 768×1024 y 1440×900. En móvil, prueba añadir, modificar y enviar un pedido de prueba; en /#admin, cambia un estado y verifica la pantalla de seguimiento.

## PWA y recursos

manifest.webmanifest y sw.js habilitan la instalación. Los iconos, versiones transparentes del logo y la imagen social se generan en assets/generated/ a partir de assets/logo.jpg; el script que los genera se conserva allí para poder rehacerlos.

## Seguridad

- Los textos aportados por clientes y administrador se limpian antes de renderizarse.
- El cliente puede crear pedidos y leer un pedido con su ID; solo el UID del dueño puede listar, editar o borrar.
- El antiguo PIN de prueba 1234 fue eliminado.
- La configuración pública de Firebase no es una contraseña; las reglas de Firestore son la barrera de acceso.

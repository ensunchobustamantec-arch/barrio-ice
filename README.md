# Barrio Ice 🧊
Página de pedidos + panel del dueño. Los pedidos llegan por WhatsApp.

## Cómo funciona el panel
Entra a `tu-link/#admin`. Allí el dueño:
1. Arma su **catálogo** (agrega o quita granizados; puede marcar los de licor como +18).
2. Elige el **día** y toca los sabores disponibles. Se publican al instante en la tienda.

Sin configurar Firebase, la página funciona en **modo prueba** (clave `1234`, guarda solo en ese navegador).

## Activar el panel de verdad (Firebase, gratis)
1. En https://console.firebase.google.com crea un proyecto.
2. **Firestore Database** → Crear base de datos (modo producción).
3. **Authentication** → Método de acceso → Correo/contraseña → Usuarios → Agregar usuario (el correo del dueño). Copia su **UID**.
4. En Firestore → Reglas, pega `firestore.rules` y cambia `PEGA_AQUI_EL_UID_DEL_DUENO` por ese UID. Publicar.
5. Configuración del proyecto → Tus apps → Web (`</>`) → copia `firebaseConfig`.
6. En `index.html`, dentro de `CFG`, pega esos datos en `firebase:{ ... }`.

## Subir a GitHub y publicar
```bash
git init && git add . && git commit -m "Barrio Ice"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/barrio-ice.git
git push -u origin main
```
(o en github.com → New repository → "uploading an existing file" y arrastra los archivos).
Luego **Settings → Pages → Branch: main / root**. El link será `https://TU_USUARIO.github.io/barrio-ice/`.
También sirve Vercel: Import Project → elige el repo → Deploy.

## Qué se edita en index.html (bloque CONFIGURACIÓN)
Número de WhatsApp, precios por día, domicilio, bebidas y datos de Nequi/Daviplata.

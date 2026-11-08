# Barrio Ice v6 — línea base

## Alcance confirmado

- Rama `v6-mostrador-cinematico`, creada desde `origin/main` (`70ab902`).
- El dueño autorizó incorporar el arreglo pendiente `204977a` antes de continuar.
- Pagos del mostrador: Efectivo, Nequi, Llaves Bre-B, Bancolombia y Otro.
- Prioridad acordada: fases 0–4. Fase 5 aplazada para reducir consumo. Sin merge.
- Petición adicional: presentar claramente siete interruptores de 2x1, de lunes a domingo, independientes de los grupos de precios. El código actual ya genera y guarda las siete claves; falta comprobar persistencia y mejorar la explicación visual en la fase de panel.
- Las fases se cierran únicamente con las pruebas correspondientes aprobadas.

## Inventario de CSS

Orden: `styles.css`, `layout.css`, `catalog.css`, `site.css`, `motion-effects.css`.

| Selector | Regla que prevalece en la línea base |
|---|---|
| `.brand img` | `motion-effects.css`: 40 px; 52 px desde 700 px, ancho automático, fondo transparente. Reemplaza reglas de `styles.css` y `catalog.css`. |
| `.hero-logo` | `.hero-stage .hero-logo` en `layout.css` gana por especificidad para tamaño (100% del contenedor) y filtro; el filtro oscuro tiene selector de tema. `motion-effects.css` activa `logo-breathe` desde 901 px. Reduced motion desactiva la animación. |
| `.hero-logo-wrap` | `layout.css` define perspectiva/tilt y `hero-bob`; `.hero-stage.hero-mark-scene .hero-logo-wrap` en `motion-effects.css` confirma ancho y proporción 625/970. |
| `.cup` | `styles.css`: 68×105 px, posición absoluta y rotación 7°. `.cup .fill` en `site.css` impone `animation: none` y `scaleY(1)`. |
| `.flavor` | Geometría de `styles.css`; radios/sombra/transiciones de `catalog.css`; hover y pulsación de `site.css`. `.flavor.picked` de `layout.css` añade el estado seleccionado. |

Discrepancia con el contexto de v6: la animación `fill` está definida, pero `site.css` la desactiva. No se modifica: pertenece al trabajo visual aplazado.

## Resultados parciales

- `node tests/pricing.test.cjs`: 8 pruebas aprobadas.
- `npm run test:promotions`: 11 comprobaciones aprobadas tras corregir la expectativa antigua de jueves (2 regalos al pagar 2 con 2x1).
- `npm run test:rules`: 27 casos aprobados con `firestore.rules`. Se usó el CLI ya instalado en la caché npm; Java 25.0.2. Archivo de transición aún pendiente.
- La prueba visual todavía falla en 360×640: «el título accesible debe caber». El H1 tiene la clase `sr-only`; antes de cambiar estilos o la aserción hay que determinar si existe recorte visible o si la comprobación mide incorrectamente un título oculto.
- Se actualizaron referencias obsoletas de la prueba visual: banner retirado, título SEO, imagen social v3 y cinta `.promo-ticker`. No se alteró `pricing.js`.
- Capturas completas y Lighthouse: pendientes. La fase 0 aún no está completada; no avanzar ni marcarla completada.
- La primera instalación `npm ci` se interrumpió tras quedar esperando en la auditoría de dependencias; se reintenta con `--no-audit --no-fund`, manteniendo el lockfile.

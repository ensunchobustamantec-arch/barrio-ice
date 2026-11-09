# Regla mínima propuesta para seguimiento público

El seguimiento público necesita permitir lectura del documento `seguimiento/{pedidoId}` sin exponer la colección de pedidos. Mantén la escritura restringida al administrador y conserva las reglas actuales de `pedidos`.

```rules
match /seguimiento/{pedidoId} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.uid == "UID_DEL_ADMIN";
}
```

No publiques esta propuesta automáticamente: revísala junto con las reglas actuales y ajusta el UID antes de desplegarla.

# Roles y aprobaciones de RateBook

El rol actual sigue siendo simple y explícito: `VIEWER` consulta, `OPERATOR`
puede solicitar acciones y `ADMIN` conserva las acciones sensibles.

Un operador puede solicitar `RATEBOOK_PUBLISH` para un borrador o
`RATEWARE_DELIVERY` para un RateBook publicado. Cada solicitud conserva motivo,
solicitante, revisor, decisión y fechas. Solo un administrador puede decidir y
nunca puede decidir su propia solicitud.

Aprobar registra evidencia; no ejecuta la publicación ni la entrega. El
administrador realiza ese último paso desde el RateBook, preservando la
confirmación humana sobre cualquier cambio comercial o entrega externa.

# Quote Desk

`CustomerQuote` representa la propuesta comercial dirigida a un cliente. Es
independiente de `Quote`, que conserva la evidencia del cálculo interno.

Un borrador registra cliente, contacto, vigencia y de 1 a 15 rutas comerciales
con su tarifa. Sprint 11 agrega plantillas HTML por organización, un preset
MARKSMAN/XBF, marcadores dinámicos y una vista previa aislada.

Los campos incluyen `{{FOLIO_COTIZACION}}`, `{{NOMBRE_CLIENTE}}`,
`{{NOMBRE_CONTACTO}}`, `{{VIGENCIA}}`, `{{COTIZADO_POR}}`, rutas indexadas
como `{{ORIGEN_1}}` y la tabla dinámica `{{RUTAS_TABLA}}`. Los valores se
escapan, se elimina markup activo y la vista previa usa iframe sandbox/CSP.

Guardar o previsualizar no envía correo. El envío confirmado, idempotente y
con traza de entrega sigue siendo un incremento posterior de Quote Desk.

# Impacto de activación de una versión

`GET /cost-bases/:costBaseId/versions/:versionId/impact` devuelve una vista de
lectura para revisar una versión candidata frente a la versión activa de la
misma base de costos.

La respuesta incluye:

- parámetros distintos (`fromValue`, `toValue`, `delta`), sin ocultar cambios;
- conteos de rutas de producción y cotizaciones que están gobernadas por la
  versión activa, la candidata u otra versión;
- reglas explícitas de activación: sólo una versión `PUBLISHED` puede
  activarse;
- las banderas `existingProductionRoutesRemainFrozen` y
  `existingQuotesRemainFrozen`.

## Regla deliberada

Activar una versión no modifica rutas de producción existentes, no recalcula
cotizaciones guardadas y no vuelve a abrir decisiones ya confirmadas. Cada
ruta conserva la base y versión que se confirmaron al pasar a producción; cada
cotización conserva su snapshot y eventos de auditoría. Sustituir una ruta o
emitir una cotización con la nueva versión sigue siendo una decisión humana.

Este endpoint no publica un `RateBook`, no sincroniza con Rateware y no produce
efectos secundarios. Una futura integración puede usarlo como evidencia de
revisión antes de construir un artefacto tarifario separado.

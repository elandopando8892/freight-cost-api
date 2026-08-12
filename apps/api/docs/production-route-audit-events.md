# Bitácora de rutas de producción

Cada ruta nueva registra un evento `CREATED`. Las transiciones posteriores
registran eventos en la misma transacción de base de datos:

- `PRODUCED` al habilitar una ruta;
- `ARCHIVED` al archivarla;
- `REPLACEMENT_PROPOSED` en la ruta fuente cuando se crea una revisión de
  reemplazo.

Los eventos almacenan actor, nota, fecha y un payload acotado de evidencia
(revisión o identificadores de sucesión). El catálogo muestra los eventos
reales. Las rutas previas a esta capacidad no reciben eventos sintéticos.

La bitácora es propia del Freight Cost Model. No publica un RateBook ni envía
información a Rateware; una integración posterior sólo podrá consumir esta
evidencia de lectura después de una decisión humana.

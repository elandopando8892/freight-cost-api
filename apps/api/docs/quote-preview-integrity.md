# Sprint de integridad de cotizaciones — contrato y release

Estado: implementado y probado localmente; **no desplegado ni aplicado a una base remota**.

## Flujo y contratos

`POST /engine/quote-by-route` continúa devolviendo el resultado y los tramos resueltos. Ahora añade `previewId` y `lineage`. El servidor conserva durante 20 minutos una captura por organización con entradas efectivas, parámetros, política, FX, tramos, resultado y el `fcm.calculation-snapshot.v1` verificable. La referencia DAT (`marketRpm`) y los campos de retorno permanecen dentro del snapshot. La operación Drayage conserva su entrada por tramo cuando el motor la produce.

`POST /quotes/from-preview` (ADMIN u OPERATOR) exige `Idempotency-Key` UUID y `{ "previewId": "...", "label": "..." }`. Rechaza campos económicos extra. Comprueba organización, expiración, checksum y replay, y si la versión/base cambió. No resuelve de nuevo una ruta ni lee los parámetros vigentes para sustituir el cálculo revisado. Crea un `DRAFT` con la misma evidencia, explicación, política, tramos y economía. Repetir clave+contenido devuelve el mismo objeto (`200`); cambiar contenido con la misma clave devuelve `409`; una copia deliberada exige una clave nueva. La UI conserva esa clave tras un error para evitar duplicados por un reintento incierto.

`POST /quotes` permanece para consumidores anteriores y no cambia de contrato. Su recorrido legado recalcula; los nuevos controles de integridad se aplican al flujo web que usa `/quotes/from-preview`. No se migran ni reescriben cotizaciones históricas; `POST /quotes/:id/replay` sigue devolviendo `409` cuando falta un snapshot.

La respuesta comercial añade `minMarginPct`, `targetMarginPct`, `premiumMarginPct` y `marketReferenceProvenance` (`observed`, `mixed`, `cost_proxy`, `absent`). Son campos aditivos y de presentación. No alteran la fórmula ni la decisión comercial. Registros anteriores pueden carecer de estos campos y la UI los rotula como desconocidos, no como porcentajes/fuentes inferidos.

## Migración y orden de release

La migración aditiva `20260922000100_quote_preview_integrity` añade `QuoteCalculationPreview`, la tabla interna `QuoteSaveIntent` con clave primaria `(orgId, key)` y sólo `previewId` nullable a `Quote`. Las claves de reintento no aparecen en la respuesta ni en el historial de cotizaciones. No se aplicó en producción. Para cualquier release futuro: backup y verificación de la base, aplicar migración en el entorno autorizado, desplegar API y web del mismo commit, ejecutar QA autenticado, y sólo después considerar promoción. No desplegar el frontend nuevo contra una API vieja ni la API nueva antes de su migración: el cálculo por ruta crea una vista previa.

Rollback de código: volver ambos servicios al commit anterior conservando la migración aditiva. Rollback de datos: no eliminar automáticamente las vistas previas ni las columnas; conservar cotizaciones creadas, auditar referencias y definir un rollback de esquema separado sólo si se autoriza. La tabla de previews expira lógicamente; su limpieza física periódica queda pendiente, sin borrar filas de negocio.

## Evidencia y límites

Las pruebas Fastify inyectadas comprueban cálculo/vista previa y guardado sin base real. El snapshot se verifica con el motor puro, y la batería canónica de motor sigue ejecutándose. Aún falta una prueba PostgreSQL local de la migración y de concurrencia real de la clave única, más el recorrido autenticado captura → guardar → detalle → recarga/renovación. Compilación o pruebas con mocks no equivalen a aceptación en preview/producción.

Cobertura del checklist solicitado: T04–T07 prueban el control puro de revisión/solicitud; T08–T10 y T13–T15 prueban creación y guardado inyectados con snapshot real del motor; T11/T12 prueban reintento/copia en la ruta con persistencia simulada; T16–T18 prueban estados puros y formatos; T19 prueba apertura y replay del ID creado vía API; T20 prueba ADMIN/OPERATOR/VIEWER en la nueva ruta. T01–T03 están implementados en un único hook sobre `QuoteModes`, pero necesitan prueba interactiva de componentes para considerarlos demostrados. T05/T06/T07 también requieren un test montado de UI para complementar el control puro. La unicidad concurrente de T11 y la vista real de T16/T19 quedan pendientes de PostgreSQL local y QA autenticado respectivamente.

La inspección de solo lectura del dominio `freight-cost-web.vercel.app` identificó `dpl_DQP7ob4DApBdUnn3PwhDGvAXnqPq` como producción el 22-09-2026; su metadata inspeccionable no incluyó SHA. No se promovió ni desplegó nada en este sprint.

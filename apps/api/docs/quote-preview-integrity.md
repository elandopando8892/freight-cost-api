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

Las pruebas Fastify inyectadas comprueban cálculo/vista previa y guardado sin base real. El snapshot se verifica con el motor puro, y la batería canónica de motor sigue ejecutándose. Además, en un contenedor PostgreSQL 16 efímero ligado sólo a `127.0.0.1:55439`, `migrate deploy` aplicó las 38 migraciones y `migrate status` quedó al día. La prueba opt-in `quote-preview-postgres.test.ts` confirmó dos reintentos concurrentes → una cotización, copia con clave nueva, aislamiento entre organizaciones, detalle y replay con FX 18.75 y `marketRpm` 2.5. El contenedor se detiene después de la prueba; no es un despliegue remoto. Falta el recorrido autenticado captura → guardar → detalle → recarga/renovación y QA visual. Compilación o pruebas locales no equivalen a aceptación en preview/producción.

Cobertura del checklist solicitado: T01–T07 incluyen ahora el hook React montado y botones de modo reales con renderizadores hijos aislados (límites abajo); T04–T07 también prueban el control puro de revisión/solicitud; T08–T10 y T13–T15 prueban creación y guardado inyectados con snapshot real del motor; T11/T12 incluyen PostgreSQL real y concurrencia; T16–T18 prueban estados puros y formatos; T19 prueba apertura y replay del ID creado vía API y PostgreSQL; T20 prueba ADMIN/OPERATOR/VIEWER en la nueva ruta. Sigue pendiente validar inputs y atajos reales, además de la vista de T16/T19 en navegador autenticado.

La inspección de solo lectura del dominio `freight-cost-web.vercel.app` identificó `dpl_DQP7ob4DApBdUnn3PwhDGvAXnqPq` como producción el 22-09-2026; su metadata inspeccionable no incluyó SHA. No se promovió ni desplegó nada en este sprint.

### Incremento de pruebas montadas — 22-09-2026

`npm run test -w freight-cost-web` incorpora siete pruebas Vitest/jsdom con React DOM montado. Verifican el hook real, los botones reales Guiado/Rápido y su propietario `QuoteModes`: preservación de captura completa, resultado e intención de guardado sin solicitudes extra; invalidación sólo por cambios efectivos; éxito/error tardíos después de un resultado nuevo; reinicio durante solicitud; exclusión de invocaciones simultáneas; reintento y copia deliberada con claves correctas. Los renderizadores hijos de formulario están aislados en esa prueba: no demuestra escritura en sus inputs, atajos reales, foco, layout ni navegación autenticada. Complementa T01–T07 y T11/T12; no sustituye QA visual ni T19 de navegador.

Se añade jsdom 26.1.0 como dependencia sólo de desarrollo y se reutiliza Vitest existente. La instalación omitió scripts; npm reportó advertencias EPERM de limpieza en dependencias opcionales de Sharp, sin fallo de instalación. La prueba PostgreSQL ahora rechaza explícitamente hosts que no sean loopback antes de crear Prisma; no se ejecutó otra migración ni se contactó una base en este incremento.

Pendiente: formularios y estados completos en 1440×900, 1280×800 y 390×844, foco/teclado, detalle y dashboard parcial, además del recorrido autenticado y renovación de sesión. No hay nuevas capturas visuales acreditadas. Modelo recomendado para implementación/QA: Astra, esfuerzo alto; esto no representa una llamada de IA desde FCM ni acredita el selector del modelo anfitrión.

Rollback de este incremento: retirar los tests/configuración web y la dependencia jsdom mediante un revert revisado; no necesita cambios de esquema ni afecta resultados económicos. Conservar la protección loopback del test local.

Resultados finales de esta ejecución: web 7/7; API 511 aprobadas y 2 PostgreSQL omitidas sin URL opt-in; ESLint web, TypeScript web y build Next satisfactorios. La primera comprobación encontró enums inválidos y una asignación durante render en el nuevo harness de prueba; corregidos usando valores del contrato y un efecto de layout, sin desactivar reglas ni cambiar expectativas. El primer build falló por esos tipos; el build repetido terminó correctamente. No se desplegó, no se modificó Auth y no se ejecutaron operaciones de negocio.

# Sprint 24 — agregación de investigación para llantas v2

Modelo recomendado: GPT-6 Sol, esfuerzo alto por aislamiento monetario, integridad y compatibilidad con v1. No hubo cambio UI/UX; por ello no se creó wireframe nuevo.

## Entregado

`aggregateTireCohortsV2` recibe únicamente registros v2 y una política estadística explícita, sin valores por defecto. Agrupa por la clave de v2 —incluye segmento, país, moneda nativa, activo, posición, producto y etapa—; resume kilómetros observados y costo nativo por kilómetro. Los registros incompletos se reportan con bloqueos, nunca como cero. La salida marca únicamente si satisface la política de revisión de investigación; no concede aprobación económica ni escritura de parámetros.

`createTireCohortV2ResearchSnapshot` crea un sobre versionado con tenant, autor, request ID, registros, política y huellas del agregado y del contenido completo. `verifyTireCohortV2ResearchSnapshot` exige el tenant esperado y recalcula ambas huellas. Son contratos puros para una futura persistencia aislada: no hay tabla, migración, ruta HTTP ni escritura a BD. Una huella detecta cambios accidentales o no autorizados si el verificador recibe el original esperado; no sustituye control de acceso, firma ni trazabilidad de una BD.

La ruta v1, las tablas `TireCohortSourceSnapshot`/`Head`, las propuestas MXN y el preview existente quedan intactos. No se hicieron conversiones FX, adopciones de parámetros, publicaciones, cotizaciones ni pruebas con registros reales. La política del test es sintética y no es un benchmark ni calibración aprobada.

Validación: 33 pruebas focalizadas, typecheck y build de API pasaron. La suite sin la prueba de integración Postgres pasó con 644 pruebas y 23 omisiones. El comando global sin exclusión terminó fallido por la suite preexistente `tire-calibration-rls-postgres.test.ts`: exige `FCM_TEST_ADMIN_DATABASE_URL` y su par de prueba apuntando a la base desechable de loopback `fcm_tire_s8`. No se modificó ninguna URL ni BD para forzarla. La persistencia durable y RLS de v2 siguen sin prueba porque todavía no existen.

## Persistencia durable pendiente

Antes de activarla: revisar una migración separada para snapshots y heads v2 con `orgId`, RLS, unicidad de request ID por tenant, idempotencia, versión monotónica, integridad transaccional y lectura verificada. No reutilizar tablas v1. Requiere autorización puntual antes de aplicar migración o conectar la ruta operativa; después, validar aislamiento multi-tenant y recuperación/relectura en Postgres real. La UI v2 requerirá wireframe antes de implementarse.

Rollback local: revertir el módulo v2 estadístico, sus pruebas y este documento. No hay esquema ni datos que restaurar.

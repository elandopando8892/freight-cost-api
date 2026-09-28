# Sprint 25 — candidato de persistencia aislada para llantas v2

Modelo recomendado: GPT-6 Sol, esfuerzo alto por migración, RLS e idempotencia. No cambia UI/UX; no corresponde wireframe nuevo en este incremento.

## Entregado en código

- Tablas nuevas `TireCohortV2ResearchSnapshot` (inmutable) y `TireCohortV2ResearchHead` (puntero versionado) en Prisma y migración candidata `20260928000200_tire_cohort_v2_research`. Su FK compuesta obliga al head a apuntar a un snapshot del mismo tenant y clave comparable. RLS forzada, políticas por rol, claves únicas por tenant/request ID, checks y trigger append-only. No modifica ni reutiliza las tablas v1 MXN.
- Captura transaccional con contexto RLS del usuario interno resuelto tras Supabase Auth; serialización por organización, idempotencia, validación de clave/moneda, versión creciente y relectura con huellas de contenido/agregado. La respuesta GET entrega estadísticas, no los registros ni localizadores de evidencia. No hay camino hacia propuestas, parámetros, CFU/CVU o cotizaciones.
- Rutas `POST /cost-bases/tire-cohort-v2-research` y `GET /cost-bases/tire-cohort-v2-research/current?comparisonKey=...` autenticadas y con `Cache-Control: no-store`. Están **ausentes por defecto**: sólo se registran con `FCM_TIRE_V2_RESEARCH_CAPTURE_ENABLED=true`. No habilitar esa bandera antes de migración aprobada y prueba del rol de aplicación.
- El build de Vercel ahora exige `FCM_TIRE_V2_RESEARCH_MIGRATION_CONFIRMATION=APPLY_TIRE_V2_RESEARCH_MIGRATION:<SHA-del-commit>` si detecta esta migración pendiente, tanto para el destino de staging como para producción. El script manual de staging exige además `FCM_MIGRATION_RELEASE_SHA` con ese SHA. Estos guards no cubren invocaciones directas de Prisma y no sustituyen la autorización humana; la ruta continúa apagada por defecto. Pueden bloquear un preview que use migración automática hasta que haya una decisión explícita.

## Evidencia y límite

Prisma validate/generate, typecheck y build pasaron. La suite de API excluyendo la prueba legacy de Postgres que requiere variables locales pasó 648 pruebas y omitió 25; la prueba v2 Postgres se ejecutó por separado. El script aislado `apps/api/scripts/test-tire-preview-isolated.ps1` creó un Postgres temporal en loopback con datos sintéticos, aplicó 46 migraciones dos veces sin pendiente, ejecutó 17 pruebas de persistencia/RLS (incluye 2 v2) y confirmó backup/restore y siete tablas con RLS forzada. El contenedor temporal se eliminó al terminar. No se aplicó migración a Neon, Supabase, producción ni preview; el navegador no es evidencia de esta ruta. No se cargaron benchmarks ni costos reales.

Antes de activación compartida: autorización puntual para aplicar migración al destino identificado, verificación de `migrate status`, grants para el rol runtime, prueba autenticada tenant A/B, captura y relectura con evidencia real revisada, y decisión de UX con wireframe. La bandera debe seguir ausente hasta ese momento. Si algo falla tras una activación autorizada, desactivar bandera para detener nuevas capturas y conservar snapshots para diagnóstico; no borrar tablas con evidencia sin plan de recuperación aprobado.

Rollback de este cambio **antes** de migrar: revertir código, esquema y migración candidata. No hay datos externos que restaurar.

# Sprint 27 — preflight de migraciones pendientes en staging

Modelo recomendado: GPT-6 Sol, esfuerzo medio-alto por riesgo de identidad y secuencia de datos. No hubo cambio UI/UX; no corresponde wireframe nuevo.

## Evidencia read-only (2026-09-28 20:25 UTC)

Destino: Neon de Preview verificado por el proyecto API de Vercel (`freight-cost-api`, proyecto `prj_mw1xLIqutlRSIG2F2BryfPqDvN2L`); no se imprimieron credenciales ni datos de usuarios. El script reproducible `apps/api/scripts/inspect-tire-v2-staging-prerequisites.ts` usa una transacción `READ ONLY` con timeout y reporta sólo agregados y nombres de esquema.

- `User`: 3 filas; 0 `supabaseId` vacíos; 0 UUID mal formados. Los 3 conservan `kindeId` no vacío. La condición de datos que comprueba `finalize_supabase_identity` parece cumplida **en este instante**, pero su `DROP COLUMN kindeId` perdería los tres valores si no existe respaldo.
- Ninguna de las siete tablas de llantas v1/v2 está presente. Ledger: 42 migraciones aplicadas, 46 artefactos, 0 fallidas. Siguen pendientes `20260830000200_finalize_supabase_identity`, `20260927000100_tire_calibration_multitenant`, `20260928000100_tire_economic_review` y `20260928000200_tire_cohort_v2_research`.
- La API Preview READY más reciente inspeccionada para esta rama fue SHA `192f8577a8442d407c61b907e37c4decd40a0a01`, anterior a este sprint. Su middleware usa verificación de token Supabase y no hay referencias `kindeId` en `apps/api/src` de ese commit. Esto es evidencia de código desplegado, **no** de una sesión autenticada real ni de identidad funcional extremo a extremo.
- No se intentó escritura, backup, migración, activación de bandera, deploy ni login. El frontend abierto sigue siendo un preview anterior.

## Dictamen y secuencia segura

**NO-GO para aplicar ahora.** El permiso para v2 no autoriza eliminar `kindeId` ni aplicar las otras dos migraciones previas. Prisma aplica todas las pendientes en orden; v2 además depende de la función inmutable y de la clave compuesta introducidas por `tire_calibration_multitenant`. No saltar migraciones, no usar `migrate resolve` como sustituto y no aplicar SQL v2 fuera del ledger.

Antes de solicitar autorización de ejecución para el lote de cuatro:

1. Confirmar el alcance de la migración de identidad Supabase con el responsable de Auth y una prueba de login/sesión real de un usuario de staging. Revisar los tres mapeos heredados sin publicarlos.
2. Preparar un respaldo recuperable del staging **antes** del `DROP COLUMN`, incluyendo la relación `User.id`/`orgId`/`kindeId`/`supabaseId`, bajo almacenamiento aprobado; verificar restauración en destino aislado. Esta actividad no se realizó.
3. Ensayar las cuatro migraciones en un clon del staging con datos representativos y rol runtime sin BYPASSRLS; comprobar `migrate status`, integridad referencial, RLS tenant A/B y rutas existentes. La prueba previa en Postgres vacío/sintético no sustituye este ensayo.
4. Sólo con autorización puntual para el corte de identidad y el lote completo, aplicar en el Neon verificado; comprobar lectura de usuarios, Auth, snapshots y RLS. Mantener `FCM_TIRE_V2_RESEARCH_CAPTURE_ENABLED` apagada hasta terminar la validación.
5. Después, desplegar API en Preview y activar la ruta únicamente en la rama/revisión prevista. Validar captura y relectura con datos de investigación aprobados, sin promover a producción ni enlazar a CFU/CVU/cotizaciones.

Rollback: antes de writes v2, apagar la bandera y retirar el preview detiene capturas; **no** restaura `kindeId`. Para fallas de datos/esquema tras el corte se requiere el respaldo probado o una corrección hacia delante aprobada. No borrar tablas ni revertir migraciones aplicadas a ciegas. Producción no forma parte de este plan.

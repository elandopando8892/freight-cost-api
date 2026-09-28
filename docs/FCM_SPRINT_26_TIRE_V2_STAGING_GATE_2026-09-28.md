# Sprint 26 — verificación del staging antes de habilitar llantas v2

Modelo recomendado: GPT-6 Sol, esfuerzo medio-alto por delimitación de migraciones y despliegue. No hay cambio de UI/UX ni wireframe nuevo.

## Resultado

Autorización recibida para verificar el staging aislado, aplicar **la migración v2** y habilitar la ruta en preview. La inspección read-only del proyecto Vercel `freight-cost-api` (`prj_mw1xLIqutlRSIG2F2BryfPqDvN2L`, equipo `team_KUG1PtOwoJ16eUqxiOJ330Os`) confirmó el Neon de preview `broad-art-99750179`, host `ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech`, base `neondb`, sin mostrar credenciales. El ledger tiene 42 migraciones aplicadas frente a 46 artefactos; no hay fallidas, desconocidas ni cambios de checksum.

La secuencia pendiente es:

1. `20260830000200_finalize_supabase_identity` — pone `User.supabaseId` como obligatorio y elimina `kindeId`.
2. `20260927000100_tire_calibration_multitenant` — crea tablas/RLS v1 y la función de inmutabilidad requerida por v2.
3. `20260928000100_tire_economic_review` — altera tablas de revisión v1.
4. `20260928000200_tire_cohort_v2_research` — la migración autorizada en esta solicitud.

`prisma migrate deploy` aplica **todas** las pendientes, no sólo la cuarta. La autorización de v2 no cubre el corte de identidad ni las otras dos migraciones. No se ejecutó `deploy`, no se cambió Auth, Neon, Supabase o producción, no se activó `FCM_TIRE_V2_RESEARCH_CAPTURE_ENABLED` y no se creó un preview nuevo. El frontend abierto en el navegador continúa en su despliegue previo; no prueba v2.

## Guard añadido

Los caminos automatizados `vercel-build.ts` y `migrate-staging.ts` ahora rechazan la confirmación de v2 cuando el estado de Prisma incluye cualquier otra migración pendiente. El test cubre exactamente la secuencia de cuatro observada, el caso v2 sola y el caso sin pendientes. La comprobación de destino fue read-only; 18 pruebas focalizadas y typecheck pasaron.

## Próximo desbloqueo

Revisar y autorizar por separado las tres migraciones previas (especialmente la de identidad Supabase, que elimina una columna), con preflight de usuarios vinculados, snapshot/backup y rollback aprobado. Sólo después de que el ledger esté al día se puede aplicar v2 por separado en el Neon verificado y habilitar la bandera **sólo** para el preview de API previsto. Alternativamente haría falta otro destino aislado con esquema compatible; crear o pagar nueva infraestructura requiere otra decisión. No forzar una aplicación manual fuera de orden ni marcar migraciones como aplicadas sin ejecutarlas.

Rollback de este incremento: revertir el guard de alcance si se reemplaza por uno equivalente; no hay cambio externo que restaurar.

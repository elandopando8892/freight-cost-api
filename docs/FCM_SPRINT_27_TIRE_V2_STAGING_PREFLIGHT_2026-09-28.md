# Sprint 27 — preflight de migraciones pendientes en staging

Modelo recomendado: GPT-6 Sol, esfuerzo medio-alto por riesgo de identidad y secuencia de datos. No hubo cambio UI/UX; no corresponde wireframe nuevo.

## Evidencia read-only (2026-09-28 20:25 UTC)

Destino: Neon de Preview verificado por el proyecto API de Vercel (`freight-cost-api`, proyecto `prj_mw1xLIqutlRSIG2F2BryfPqDvN2L`); no se imprimieron credenciales ni datos de usuarios. El script reproducible `apps/api/scripts/inspect-tire-v2-staging-prerequisites.ts` usa una transacción `READ ONLY` con timeout y reporta sólo agregados y nombres de esquema.

- `User`: 3 filas; 0 `supabaseId` vacíos; 0 UUID mal formados. Los 3 conservan `kindeId` no vacío. La condición de datos que comprueba `finalize_supabase_identity` parece cumplida **en este instante**, pero su `DROP COLUMN kindeId` perdería los tres valores si no existe respaldo.
- Ninguna de las siete tablas de llantas v1/v2 está presente. Ledger: 42 migraciones aplicadas, 46 artefactos, 0 fallidas. Siguen pendientes `20260830000200_finalize_supabase_identity`, `20260927000100_tire_calibration_multitenant`, `20260928000100_tire_economic_review` y `20260928000200_tire_cohort_v2_research`.
- La API Preview READY más reciente inspeccionada para esta rama fue SHA `192f8577a8442d407c61b907e37c4decd40a0a01`, anterior a este sprint. Su middleware usa verificación de token Supabase y no hay referencias `kindeId` en `apps/api/src` de ese commit. Esto es evidencia de código desplegado, **no** de una sesión autenticada real ni de identidad funcional extremo a extremo.
- En el preflight inicial no se intentó escritura, backup, migración, activación de bandera, deploy ni login. El frontend abierto seguía siendo un preview anterior.

## Respaldo y restauración autorizados (2026-09-28 20:59–21:01 UTC)

El usuario confirmó que Kinde ya no se usa y que Supabase es el proveedor activo. Eso aclara la intención de Auth, pero no sustituye una prueba de login/sesión. La autorización puntual de este paso cubrió el respaldo y la restauración aislada, no el lote de migraciones.

`apps/api/scripts/backup-tire-staging-isolated.ts` volvió a verificar el proyecto API y el destino Neon Preview; usó `pg_dump -Fc` **sin escrituras en staging**, cifró el flujo directamente con AES-256-GCM en D: y protegió la clave con DPAPI `CurrentUser`. Las credenciales no se imprimieron ni se guardaron en el repositorio: el cliente PostgreSQL temporal recibió un `.pgpass` en `tmpfs`. El archivo cifrado, la clave protegida y el manifiesto quedaron fuera del worktree:

- Manifiesto: `D:\andre\backups\freight-cost-model\staging-neon-20260928205937-eaa94615.manifest.json`.
- SHA-256 del archivo cifrado: `b1f7b83632417ce25ba5587852939d1d3ec80ca760036ba57a6f2efd44bb72da`; 492,695 bytes cifrados.
- Restauración completa con `pg_restore --exit-on-error` en PostgreSQL 17 desechable con `--network none`, datos en `tmpfs` y ningún puerto publicado: **PASS**. Fuente y restauración coincidieron en 3 usuarios, 42 registros del ledger, 51 tablas públicas y 3 IDs Kinde históricos. La clave DPAPI se desprotegió antes del ensayo, verificando que es recuperable en este perfil de Windows.
- Se detuvieron y eliminaron los contenedores. El modo `--verify-manifest` repitió la restauración desde los archivos guardados y volvió a dar **PASS** sin consultar ni escribir staging. Revisión read-only posterior: 42/46 migraciones, las mismas cuatro pendientes y ninguna fallida.

Comando de repetición local desde `apps/api`: `node ../../node_modules/tsx/dist/cli.mjs scripts/backup-tire-staging-isolated.ts --verify-manifest 'D:\andre\backups\freight-cost-model\staging-neon-20260928205937-eaa94615.manifest.json'`. No requiere sesión de Vercel porque usa el respaldo ya guardado. **Limitación:** DPAPI `CurrentUser` ata la recuperación al usuario/perfil de Windows actual; no es una copia portátil ni una estrategia de recuperación ante pérdida de ese perfil o equipo. No restaurar sobre Neon sin autorización y un procedimiento de corte específico.

## Ensayo de las cuatro migraciones en clon (2026-09-28)

El modo `--rehearse-manifest` del mismo script restauró el archivo cifrado en un **nuevo** PostgreSQL desechable, con datos sólo en `tmpfs` y un puerto efímero ligado exclusivamente a `127.0.0.1`. No consultó ni escribió Neon. Antes de migrar verificó que el clon coincidía con el respaldo: 3 usuarios, 42 entradas del ledger, 51 tablas y 3 IDs Kinde históricos.

`prisma migrate deploy` y `prisma migrate status` pasaron sobre el clon. Después: 46 migraciones aplicadas; 58 tablas; 3 usuarios conservados; 0 usuarios sin `supabaseId`; `supabaseId` obligatorio; 0 columnas `kindeId`; 7 tablas nuevas con RLS habilitado y forzado; 0 restricciones no validadas. Se creó un rol local de aplicación sin `SUPERUSER` ni `BYPASSRLS`; las pruebas PostgreSQL de calibración, contrato multitenant e investigación v2 dieron **17/17 PASS**. El contenedor y el puerto efímero se retiraron. Ninguna prueba autenticó un usuario Supabase en el frontend o API Preview.

En el código de trabajo, 16/16 tests de verificación/resolución Supabase y rutas de calibración/v2 también pasaron. Usan mocks y no sustituyen OAuth real. El preflight read-only repetido a las 22:38 UTC confirmó que Neon seguía en 42/46, con las mismas cuatro pendientes y sin migraciones fallidas.

Repetir desde `apps/api`: `node ../../node_modules/tsx/dist/cli.mjs scripts/backup-tire-staging-isolated.ts --rehearse-manifest 'D:\andre\backups\freight-cost-model\staging-neon-20260928205937-eaa94615.manifest.json'`. Sólo se autoriza este clon local; el comando no debe adaptarse a la URL de Neon. Modelo adecuado: GPT-6 Sol, esfuerzo medio-alto por identidad/datos. No se modificó UI; no se requiere wireframe en este incremento.

## Dictamen y secuencia segura

**NO-GO para aplicar ahora.** La autorización de respaldo/restauración no autoriza eliminar `kindeId` ni aplicar las otras dos migraciones previas. Prisma aplica todas las pendientes en orden; v2 además depende de la función inmutable y de la clave compuesta introducidas por `tire_calibration_multitenant`. No saltar migraciones, no usar `migrate resolve` como sustituto y no aplicar SQL v2 fuera del ledger.

Antes de solicitar autorización de ejecución para el lote de cuatro:

1. Probar login/sesión Supabase real de un usuario de staging antes de cortar identidad; la declaración de que Kinde ya no se usa y el código de Preview no equivalen a esa validación. Revisar los tres mapeos heredados sin publicarlos.
2. Respaldo completo y restauración aislada: **realizados y repetidos**, con la limitación DPAPI indicada arriba. Si el corte requiere recuperación fuera de este equipo/perfil, preparar una copia portátil cifrada bajo custodia aprobada antes de migrar.
3. Ensayar las cuatro migraciones en un clon del staging con datos representativos y rol runtime sin BYPASSRLS: **hecho** para `migrate status`, restricciones y RLS tenant A/B (17 pruebas). Las rutas y Supabase pasaron 16 pruebas locales con mocks. Aún falta validar rutas API y login reales contra un Preview conectado al esquema migrado; los tests locales no son aceptación autenticada.
4. Sólo con autorización puntual para el corte de identidad y el lote completo, aplicar en el Neon verificado; comprobar lectura de usuarios, Auth, snapshots y RLS. Mantener `FCM_TIRE_V2_RESEARCH_CAPTURE_ENABLED` apagada hasta terminar la validación.
5. Después, desplegar API en Preview y activar la ruta únicamente en la rama/revisión prevista. Validar captura y relectura con datos de investigación aprobados, sin promover a producción ni enlazar a CFU/CVU/cotizaciones.

Rollback: antes de writes v2, apagar la bandera y retirar el preview detiene capturas; **no** restaura `kindeId`. Para fallas de datos/esquema tras el corte se requiere el respaldo probado o una corrección hacia delante aprobada. No borrar tablas ni revertir migraciones aplicadas a ciegas. Producción no forma parte de este plan.

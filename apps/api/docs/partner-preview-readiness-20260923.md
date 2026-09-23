# Economía/persistencia: inventario real de preview

> Actualización posterior: [ventana aditiva autorizada y ejecutada](partner-additive-window-20260923.md). Preview tiene40 migraciones aplicadas; sólo queda pendiente la de identidad, excluida deliberadamente. Este documento conserva el diagnóstico previo. Sigue bloqueado migrate deploy general; no hubo despliegue de API/web.

Fecha: 2026-09-23. Base local `10739caa77d14329a3c151a500cc87ea046bb587`, rama `codex/quote-integrity-sprint`, worktree `D:/andre/worktrees/freight-cost-model/supabase-auth-migration-20260830`. Candidato con cambios locales, sin commit/despliegue nuevo. Se conservaron los cambios de entregas anteriores.

## Resultado: NO-GO para migración general

Consulta realizada a las `2026-09-23T16:17:48.102Z`: **36 registros aplicados, 41 archivos locales, 5 pendientes**. Sin migraciones fallidas, desconocidas, duplicadas ni checksums alterados (se aceptan variantes LF/CRLF como Prisma). El comando terminó con código1, bloqueo esperado; no es un error de conectividad.

| Pendiente | Alcance | Decisión |
| --- | --- | --- |
| `20260830000200_finalize_supabase_identity` | Exige sujetos Supabase completos, vuelve supabaseId obligatorio y elimina User.kindeId | Fuera de alcance: NO aplicar |
| `20260922000100_quote_preview_integrity` | Tablas QuoteCalculationPreview/QuoteSaveIntent y columna nullable Quote.previewId | Aditiva; requiere autorización preview |
| `20260922000200_cost_base_operational_segment` | Columna nullable CostBase.operationalSegment e índice | Aditiva; requiere autorización preview |
| `20260922000300_cost_base_calibration` | Columna JSONB nullable AssumptionSet.calibrationEvidence y valor enum CALIBRATION_REVIEWED | Aditiva; requiere autorización preview |
| `20260923000100_partner_cost_estimates` | Tabla, índices, FK y trigger del historial de costos de terceros | Aditiva; requiere autorización preview |

**No ejecutar `prisma migrate deploy`, `migrate-staging.ts` ni habilitar migraciones en el build**: aplicarían también el corte histórico de Auth. No marcar esa migración como aplicada sin ejecutar su SQL. No eliminarla ni reescribirla para evadir el bloqueo.

## Identidad comprobada y límites

- Vercel team `team_KUG1PtOwoJ16eUqxiOJ330Os`, slug `elandopando8892s-projects`.
- API `freight-cost-api`, proyecto `prj_mw1xLIqutlRSIG2F2BryfPqDvN2L`, root `apps/api`, Node24.x (project inspect en vivo).
- Web `freight-cost-web`, proyecto `prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV` (listado del proveedor). Root .vercel está vinculado al WEB, no a la API; no inferir proyecto desde cwd.
- Últimos previews del proveedor: API `dpl_Gg6pb4Ky8uJbdDpDVGM9gKc66Fnn`, web `dpl_E4nU9vqQnp1a58nBGrvHjVvQT9Yu`, ambos READY/target null. No contienen el candidato local.
- GET de salud API a las16:13:52UTC confirmó `6b804d7b976e35e68feaa1e544c15bb474c636b5`. Esto prueba reachability/identidad de release, no aceptación autenticada.
- STAGING_DATABASE_URL, STAGING_DATABASE_URL_UNPOOLED y STAGING_NEON_PROJECT_ID: cada una tiene registro único, scope exclusivamente Preview y sin override de rama observado.
- Identidad Neon **configurada en Vercel**: `broad-art-99750179`. Host real conectado `ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech`, DB `neondb`; runtime pooled y direct corresponden al mismo host/base. No se consultó la API de administración de Neon para certificar titularidad del proyecto.
- DATABASE_URL legado permanece compartido Production/Preview: no se leyó su valor ni se usó para conectar. Las tres variables STAGING se leyeron en memoria, sin exportar archivos ni imprimir valores secretos.
- Consulta limitada al ledger `_prisma_migrations`, dentro de transacción PostgreSQL READ ONLY, con timeout. No se leyeron usuarios, tarifas ni datos de negocio.

## Comprobación reutilizable

Desde `apps/api`, Node>=22 y CLI Vercel instalado/autenticado:

```powershell
$env:VERCEL_CLI_PATH = 'C:\Users\andre\AppData\Roaming\npm\node_modules\vercel\dist\index.js'
node ../../node_modules/tsx/dist/cli.mjs scripts/inspect-partner-preview.ts
```

El script fija proyecto API/equipo/host/base esperados, rechaza ambigüedad o cambios de destino y sólo consulta GET de configuración + SELECT del ledger. No contiene migrate/seed/deploy. Salidas:0 esquema actual;1 esquema pendiente/inconsistente;2 inventario no disponible. Nunca autoriza ejecución: `migrationAuthorized:false` incluso si no hay pendientes. Inventario del esquema no equivale a detección completa de drift de tablas.

Validación nueva:9/9 pruebas del gate aprobadas y typecheck API aprobado. `git diff --check` sin errores de whitespace (advertencias habituales LF/CRLF). No se repitieron en esta entrega las pruebas de9 casos PostgreSQL ni556 regresiones ya documentadas: siguen siendo evidencia local anterior, no preview autenticado.

Sondeos fallidos conservados: conector get_project presentó incompatibilidad de argumentos; se verificó proyecto con CLI. CLI instalado no acepta env ls --json; se consultó metadata con env ls y Vercel api GET explícito. Invocaciones iniciales a dependencias apps/api/node_modules fallaron porque están hoisted en node_modules raíz; corregidas antes de ejecutar tests/inventario. Ningún fallo derivó en cambios de configuración.

## Siguiente autorización y ejecución propuesta

Solicitar autorización limitada a esta base de **preview**, para respaldo previo y aplicación controlada de las cuatro migraciones aditivas de septiembre de la tabla; excluir explícitamente finalize_supabase_identity, producción, usuarios, Auth y Site URL.

Antes de escribir: verificar nuevamente destino/ledger, respaldo privado recuperable y checksum de cada SQL; preparar un ejecutor selectivo y probarlo primero en PostgreSQL local desde baseline36. Debe registrar únicamente el SQL efectivamente aplicado, reanudar de forma segura y conservar finalize_supabase_identity pendiente. Un fallo parcial bloquea el siguiente paso hasta reconciliar SQL/ledger; nunca inventar un migrate resolve exitoso. No se ha implementado ni ejecutado ese aplicador remoto.

Después: API+web desde un mismo commit limpio, migración automática deshabilitada; comprobar health SHA, esquema y luego login real → calcular → guardar → historial/detalle → recarga → sesión renovada; verificar roles/tenant/reintento. El flujo autenticado y la conciliación de tarifas reales siguen PENDIENTES. No hacer cotizaciones comerciales ni consumir IA para la prueba.

Rollback previsto: volver ambos previews al par anterior si falla el recorrido; conservar las tablas/columnas aditivas y snapshots. No DROP, no borrar registros ni modificar Auth como rollback. No tocar producción. La guía engineering:deploy-checklist orientó separación entre gates, despliegue, aceptación y rollback; no autoriza pasos por sí misma.

Modelo/esfuerzo recomendado: Astra/alto para reconciliación de esquema, aplicación selectiva y validación de integridad; Sol/medio para documentación mecánica. Configuración de esta sesión conservada; sin delegación ni cambio de modelo afirmado.

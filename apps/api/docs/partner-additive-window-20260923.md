# Ventana autorizada: economía/persistencia de preview

## Resultado

El usuario autorizó expresamente respaldo y aplicación de **cuatro migraciones aditivas**, previo ensayo local, excluyendo Auth y producción. Aplicación y verificación final satisfactorias a las **2026-09-23T16:42:00.691Z** (10:42 America/Mexico_City).

La base de preview pasó de **36 a40 migraciones aplicadas**. Sigue pendiente deliberadamente `20260830000200_finalize_supabase_identity`: no se ejecutó ni se marcó como aplicada. **Continúa prohibido `prisma migrate deploy` general** en esta ventana.

No se desplegó código: web/API siguen en su versión anterior. Esto habilita el esquema para el próximo candidato; no equivale a guardado autenticado aceptado en el navegador.

## Identidad y alcance

- Worktree: `D:/andre/worktrees/freight-cost-model/supabase-auth-migration-20260830`.
- Rama: `codex/quote-integrity-sprint`; HEAD base `10739caa77d14329a3c151a500cc87ea046bb587`, cambios locales preservados; sin commit nuevo en esta ventana.
- Vercel API: `prj_mw1xLIqutlRSIG2F2BryfPqDvN2L`; team `team_KUG1PtOwoJ16eUqxiOJ330Os`. Nunca se infirió API desde la vinculación local al proyecto web.
- Neon configurado: `broad-art-99750179`; endpoint efectivamente conectado `ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech`, DB `neondb`.
- Se volvieron a leer únicamente las tres variables STAGING necesarias: scope Preview exclusivo, sin overrides/duplicados, mismo endpoint pooled/direct. No se leyó ni utilizó DATABASE_URL de producción. Identidad de proyecto proviene de Vercel; no se consultó administración Neon.

| SQL efectivamente aplicado | SHA-256 LF aplicado y registrado |
| --- | --- |
| `20260922000100_quote_preview_integrity` | `1096a5ec3e5416e4ccb218815d5de09f75fe325b3d85319de1a5ef11557892d0` |
| `20260922000200_cost_base_operational_segment` | `af091b7d8411ae19bb79a5b65d7c6ce18f94a6b4c248527cbc97c23e5569b3d7` |
| `20260922000300_cost_base_calibration` | `f0cfe466c35b4d3f7bd9c01a2635f073dfea2a40d34ad5a7c30b41acbc566693` |
| `20260923000100_partner_cost_estimates` | `a922ad7dafb25e6c721be8dce310327fde9a2ab4f28f51389fc3adf3f44d939b` |

## Respaldo y recuperación comprobada

- Archivo privado: `D:/andre/backups/freight-cost-model/partner-additive-1790181678607/preview-before.dump`.
- Formato PostgreSQL custom, completo, **459269 bytes**.
- SHA-256 comprobado nuevamente desde PowerShell: `94cde085d31b609bbcb1534002657534378dcae2ae1a6647d15fecc347c70ea4`.
- ACL sin herencia: acceso a `AWAKENDRAGON/andre` y `SYSTEM`; fuera de Git. No se imprimieron credenciales ni filas de negocio.
- `pg_dump17.11`, `pg_restore --list` y **restauración completa** con `--exit-on-error --no-owner --no-privileges` aprobados. Restauración en contenedor propio PostgreSQL17, sin red ni puertos publicados; ledger36 y estructura de identidad comprobados allí.
- El contenedor de recuperación y las copias efímeras se retiraron al terminar; el dump privado se conserva. No se borraron datos remotos ni volúmenes ajenos.
- Límite: la restauración validó datos/esquema, no propietarios/ACL de roles del proveedor. No se restauró encima de preview ni se modificó infraestructura Neon.

## Ejecución y evidencia

Se añadió `scripts/partner-selective-migration.ts`, con allowlist y hashes fijos. Antes de cada ejecución remota vuelve a ensayar en PostgreSQL17 local: reconstruye36 migraciones históricas, añade usuario sintético con Kinde y Supabase NULL, aplica sólo las4 autorizadas y verifica40. Fuerza un fallo antes del commit para probar rollback de DDL/ledger; luego comprueba que un segundo intento sobre40 es rechazado, sin duplicar nada.

Sobre ese esquema40 se ejecutó satisfactoriamente `tests/partner-cost-postgres.test.ts` (9 casos reales de persistencia, identidad simulada). Incluye guardar/reabrir/versionar, aislamiento, concurrencia, idempotencia, integridad y paginación. No se ejecutó el corte de Auth ni siquiera para hacer pasar ese ensayo. Tests del gate9/9 y typecheck explícito de ambos scripts aprobados.

Una ejecución inicial se detuvo durante el ensayo antes de emitir PASS; su causa exacta no quedó capturada por el logger original. No se interpretó como éxito ni se reintentó a ciegas: a las16:39:48UTC el inventario independiente confirmó36 migraciones intactas. Se añadió diagnóstico por fase y readinessTCP (el servidor temporal de inicialización de la imagen sólo atiende socket Unix); repetición y ensayo previo al intento definitivo pasaron. No afirmar que se reprodujo la causa exacta del primer fallo.

La aplicación remota usó una única transacción: lock de migración y ledger, comprobación de36 registros/checksums, DDL aprobado y registros reales Prisma, comprobación de40 y commit. Timeouts de lock5s y sentencia30s. El ledger no fue falsificado con `migrate resolve`: cada registro quedó en la misma transacción que su SQL efectivamente ejecutado.

Se comprobó que `User.kindeId` permanece y `User.supabaseId` sigue nullable. Una huella de todas las filas User antes/después dentro de la transacción fue idéntica; no se imprimió información de esas filas. No hubo creación/enlace/cambio de rol de usuarios, ni cambios al proveedor Supabase, OAuth o Site URL.

GET /health posterior a las16:42:42UTC: `status:ok`, release `6b804d7b976e35e68feaa1e544c15bb474c636b5`. Sólo prueba disponibilidad de la API anterior. No hubo cotizaciones enviadas, operaciones comerciales, llamadas de IA del producto ni cambios en producción.

Inventario independiente final a las16:42:38.385UTC:40 registros/41 archivos, únicamente finalize_supabase_identity pendiente; `failed`, `unknown`, `changed` y `duplicate` vacíos; `ledgerConsistent:true`. No quedaron contenedores con etiqueta `fcm.disposable=selective-migration` al comprobar la limpieza.

## Operación posterior y rollback

`inspect-partner-preview.ts` sigue siendo de sólo lectura. Después de esta ventana debe mostrar40 registros sin drift/fallos y únicamente finalize_supabase_identity pendiente. Su código1 es intencional porque el esquema completo no está migrado; **no intentar dejarlo verde aplicando Auth**.

La ejecución selectiva no es un migrador general ni un job recurrente: sobre40 rechaza la precondición36. Ante respuesta perdida, consultar ledger/checksums antes de cualquier reintento. No borrar registros para forzar reaplicación.

Rollback funcional: conservar todas las adiciones y continuar con el par anterior de API/web (todavía activo). No DROP de tablas/columnas/snapshots. Restaurar el dump sobre una base con actividad podría perder cambios posteriores y requiere una ventana separada autorizada; primero restaurar a una base aislada y conciliar. El enum aditivo tampoco necesita reversión destructiva.

Siguiente salida: cerrar un commit reproducible de API+web, revisar gates y desplegar ambos sólo en preview con migraciones de build deshabilitadas; luego sesión real → cálculo → guardado → historial → recarga → renovación y roles/tenant. Sigue pendiente aceptación de tarifas con documentación real. No se hizo ese despliegue dentro de esta autorización de base de datos.

La skill `engineering:deploy-checklist` motivó la separación entre ensayo, respaldo restaurable, autorización, aplicación y aceptación. Modelo/esfuerzo recomendado: Astra/alto para esta ventana y el gate de integridad; no se cambió la configuración de modelo de la sesión ni se delegaron agentes.

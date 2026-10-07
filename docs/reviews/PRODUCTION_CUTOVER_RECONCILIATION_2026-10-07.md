# Corte productivo: conciliación bloqueada, sin cambios de base

Estado a 2026-10-07T20:54:33Z: **sprint no cerrado**. Autoridad y límites en `PRODUCTION_SPRINT_AUTHORITY_2026-10-07.md`. Checkout D:, rama `codex/cost-tires-release-s14`; código de inventario fragmentado `26d81d30fd5ee333e95578ec98e5996a929a2910`.

## Evidencia real

- Inspección inicial `dpl_BQ3CYksZ1niVaYp6pcQgDg4fLZnT`: lectura correcta, evidencia JSON recortada por Vercel. No se aceptó como inventario completo.
- Inspección corregida `dpl_4VAg6UPYEwUDrx516pwvegSvBkZ1`: 18 fragmentos ordenados, reconstrucción y SHA256 comprobados; cierre deliberado `CUTOVER_INVENTORY_ONLY_NO_PUBLICATION`. `--prod --skip-domain`, sin asignar dominios. ERROR esperado por el cierre preventivo, no login fallido.
- Inventario completo: 33 migraciones históricas terminadas, cero intentos activos sin terminar, 46 artefactos fuente, cuatro usuarios ADMIN históricos, todos con identidad Kinde y ninguno con supabaseId.
- Rol de conexión: no superuser, bypassrls=true, permiso CREATE=true. Esto no acredita aislamiento RLS del runtime; permanece pendiente comprobarlo antes de publicación.
- Consulta de sólo lectura en Auth `rateware-prod` / `alqjqzqagdmcywpjtnnr`, limitada a cuatro hashes de correo. Dos coincidencias permanentes con correo verificado y sin eliminación, anonimato o bloqueo vigente: sales@heymarksman.com y andresmclovin@gmail.com. Dos usuarios históricos sin correspondencia: `cmpr2v57k0000gknj1m51lwtg` y `cmq2kjpkn0000oy3u6lvcj4q5`.
- Planificador puro: únicamente dos `IDENTITY_MATCH_MISSING`; sin divergencias de ledger/checksum. Plan no ejecutable; no ofrece una conciliación parcial. Fingerprint `ad1b7730f5a8bf5042e8a441d0b0b826df2726fa45e0a8ce25ff9b1c3f4e8b5b`.
- Evidencia privada local en `D:/andre/validation/fcm-production-cutover-20261007/{production-inventory,auth-matches,reconciliation}.json`: metadatos/hashes, sin tokens ni contraseña. No se entrega a Claude.
- Producción canónica API `/health`: HTTP200, release `3414f95f5ec377d077b5f0b876a993b63c581cb0`. Web `/login`: HTTP200 y marcado Kinde. No afirmar que producción ya usa Supabase.

## Desarrollo y pruebas

Corregido el transporte de evidencia: cada línea <2000bytes, contenido Base64 y hash integral. Pruebas locales finales: **64/64** (plan35, SQL16, revisión de esquema10, builder2, evidencia1). Son pruebas unitarias/sintéticas; no equivalen a ensayo SQL real, respaldo recuperado, OAuth autenticado ni aceptación productiva. No se afirma CI completo aprobado.

El export Git de esta inspección presenta diferencias de fin de línea frente a blobs. La comprobación completa por archivo se detuvo; no se declara export byte-exacto ni scanner final aprobado. No se usará para un despliegue con escrituras o publicación sin volver a producir y verificar un export exacto y escaneado. Esta inspección sólo leyó metadatos y terminó sin publicación.

## Límites, pendientes y rollback

No se aplicaron migraciones ni se creó el esquema de respaldo. Sin modificaciones de usuarios, organizaciones, roles, importes, Auth, Site URL ni alias productivos en este corte. No hubo inferencia Claude: la revisión Opus5.5/high de una llamada sigue no ejecutada; no se gasta para sortear una identidad inexistente. Sol6.1/high es la selección solicitada; esfuerzo efectivo del host desconocido.

La diferencia de inventario es 13 migraciones (12 previas al retiro final y una finalización), pero no hay permiso técnico para ejecutarlas parcialmente mientras falten identidades. Requiere decisión humana para resolver las dos cuentas históricas faltantes **sin inventar sujetos ni borrar usuarios**. No reasignar sus organizaciones a sales ni modificar el guard de finalización para saltarlas.

Después: ensayo SQL/restore en Postgres desechable, revisión Opus acotada, respaldo durable verificado, migraciones aditivas y reconciliación completa, candidato Web/API del mismo commit conservando kindeId, OAuth real/sesión/recarga/renovación y roles, promoción, retiro tardío de kindeId y verificación final. La implementación de supervisor y gate de coexistencia todavía está pendiente; no afirmar que está lista para ejecutar.

Rollback de este corte: no hay SQL o alias que revertir, producción permanece en su pareja anterior. Conservar las inspecciones y las evidencias, sin borrar historial. Tras un futuro retiro de kindeId, un redeploy antiguo por sí solo no basta: exigir restauración verificada de la columna y de identidades desde el respaldo antes de activar el par antiguo.

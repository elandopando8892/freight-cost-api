# Bases de socios: release limitado a preview

Autorizacion del usuario: dos migraciones aditivas, respaldo previo y frontend/API del mismo commit solo en preview. Sin Auth, produccion, usuarios ni operaciones comerciales.

## Esquema aplicado

Verificado 2026-09-24T03:15:53.436Z. Proyecto API `prj_mw1xLIqutlRSIG2F2BryfPqDvN2L`, equipo `team_KUG1PtOwoJ16eUqxiOJ330Os`; proyecto Neon aislado `broad-art-99750179`, host `ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech`, database `neondb`.

- `20260923000200_partner_tariff_bases`: SHA256 LF `392da134091cbc9570ff88e6f1a7f4ec479b018f7c5198c6329c1f39c28aad27`.
- `20260923000300_partner_tariff_lifecycle`: SHA256 LF `57644104eab7a3ee37b00ef56bed10d50f2da050a41c41aa09a85552af884a06`.

Ledger 40 -> 42, transaccion unica con hashes verificados. `20260830000200_finalize_supabase_identity` excluida; conservados kindeId, supabaseId nullable y huella de filas User. No migrate deploy general remoto.

Ejecutor independiente `apps/api/scripts/partner-bases-selective-migration.ts`: ensayo obligatorio, rollback por fallo inyectado aprobado, repeticion bloqueada, suites de persistencia aprobadas sobre esquema42 con identidad heredada. El ejecutor historico de cuatro migraciones no fue modificado.

Respaldo privado: `D:/andre/backups/freight-cost-model/partner-bases-1790219662668/preview-before.dump`, 471143 bytes, SHA256 `79840c2c0ce65b03da5dedc8e95239a76e47f42769c71eb264edf73f2182fa39`. ACL usuario local y SYSTEM; listado y restauracion completa local PostgreSQL17 sin puertos aprobados. No restaurado sobre preview.

## Verificacion y limites

TypeScript API aprobado; 16/16 pruebas de contrato aprobadas. Las dos suites PostgreSQL pasaron durante el ensayo selectivo. Escaneo de secretos:543 archivos, sin hallazgos. Las verificaciones UI/build de la entrega anterior estan en PARTNER_BASES_LIFECYCLE_2026-09-23.md; no se confunden con login real de este release.

Proyectos Vercel comprobados en vivo: API root apps/api; web `prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV`, root apps/web; ambos Node24 y mismo equipo. Deployment y recorrido autenticado pendientes al registrar este corte; se documentaran por separado con SHA y URLs observadas.

## Rollback

Conservar esquema aditivo y volver a la pareja419b10c: web `https://freight-cost-87rse8dmr-elandopando8892s-projects.vercel.app`, API `https://freight-cost-p3xutzrt4-elandopando8892s-projects.vercel.app`. No DROP ni restauracion remota automatica: cualquier rollback destructivo requiere reconciliar escrituras posteriores y autorizacion especifica. Sin cambios de aliases productivos.

Skill engineering:deploy-checklist aplicada a respaldo restaurable, separacion de evidencia y rollback. Modelo recomendado Astra; esfuerzo alto para migracion/release, medio para documentacion. No se afirma cambio del modelo de la sesion.

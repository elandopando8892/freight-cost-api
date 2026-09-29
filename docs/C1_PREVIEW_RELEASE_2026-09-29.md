# C1 — corte Preview Web/API

Estado verificado 2026-09-29 04:57 UTC: **PREVIEW PUBLICADO; aceptación autenticada PENDIENTE**. Alcance autorizado: rol nuevo y limitado en Neon staging, inyección sólo al API Preview y Web/API del mismo commit. No se cambió Auth, Site URL, entorno compartido, producción, migraciones, usuarios ni datos de negocio.

| Componente | Proyecto/deployment | URL inmutable |
| --- | --- | --- |
| Web | `prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV` / `dpl_6bvDDdU3GAxhHBEhfZz7H1Q9Qw2g` | https://freight-cost-1lqzynk34-elandopando8892s-projects.vercel.app |
| API | `prj_mw1xLIqutlRSIG2F2BryfPqDvN2L` / `dpl_Ac2WjNK3uxc5URtMhgTp2py3riVN` | https://freight-cost-aujrrwwwe-elandopando8892s-projects.vercel.app |

Ambos proyectos pertenecen al equipo Vercel `team_KUG1PtOwoJ16eUqxiOJ330Os`, ref `codex/cost-tires-release-s14`, SHA desplegado `b83f2e24e16e5d0b13d75643c8179498a738bbdf`. La API usa una URL de conexión **por deployment** con el rol `fcm_c1_preview_20260929` en `broad-art-99750179/neondb`; no se guardó la credencial en archivos ni en el entorno compartido. El rol tiene LOGIN, SELECT de tablas de aplicación (no del ledger `_prisma_migrations`) y UPDATE de `Organization`; no tiene superusuario, CREATEDB, CREATEROLE, BYPASSRLS ni INSERT de investigación de llantas. La captura v2 quedó OFF. El rol anterior `fcm_tire_v2_preview_20260929` no se rotó.

## Evidencia y límites

- Preflight: 46 artefactos y 46 migraciones aplicadas, checksums coincidentes, sin pending/failed/unknown/changed/duplicate; 3 usuarios; RLS forzada en ambas tablas v2. Ninguna migración ejecutada.
- `npm run typecheck -w freight-cost-api`: PASS después del ejecutor. El preflight previo del código funcional registró 672/672 tests en 85 suites sin PostgreSQL desechable; no se presentan las cinco suites PostgreSQL como ejecutadas en este corte.
- Gate del **nuevo** par `fcm.preview-pair-gate.v1`: **8/8 PASS**, Web/API READY, mismo SHA/ref, Web `API_URL` enlazado a la API indicada, `/health` 200 y `/ready` 200 con base conectada.
- Cobertura OAuth `fcm.oauth-preview-coverage.v1`: **PASS** en Supabase `rateware-prod` para `https://freight-cost-1lqzynk34-elandopando8892s-projects.vercel.app/auth/callback`, cubierta por el patrón acotado `https://freight-cost-*-elandopando8892s-projects.vercel.app/auth/callback`. Lectura de configuración; ninguna mutación Auth ni Site URL.
- Smoke `fcm.staging-auth-bff-smoke.v2`: `ready=true` para login público, CSP Report-Only, BFF sin sesión 401/no-store y API health/ready. CORS directo **NOT_APPLICABLE** en BFF; no es prueba de sesión ni de upstream autenticado.
- El par anterior Web `bjsq11eye` / API `abjaf48sh`, SHA `464ed48b4a4bef6f938f68d85e68a51a17297d8a`, siguió **8/8 PASS** tras el corte. No se movieron alias de producción.
- Build Web READY. `npm install` avisó 14 vulnerabilidades de dependencias (2 low, 5 moderate, 6 high, 1 critical); no se aplicó `audit fix` ni se amplió el alcance de este corte.

La configuración OAuth autorizada y el smoke sin sesión **no** demuestran Google Sign-In completo, intercambio PKCE, recarga/renovación, roles OPERATOR/VIEWER ni aislamiento entre tenants. Esas pruebas autenticadas remotas y la aceptación C1 A1/A2 siguen pendientes. A3 continúa bloqueada por el perfil de aplicabilidad faltante en la base histórica XBF-XB-PILOT v1; no se inventaron parámetros ni se generaron cotizaciones de negocio.

## Incidente de despliegue y rollback

El primer comando API fue rechazado porque `--skip-domain` sólo es válido para producción. El CLI no creó deployment en esos intentos. Se corrigió el comando Preview y se reanudó con verificación de que ningún deployment API utilizaba el SHA antes de cambiar **sólo la contraseña del rol nuevo**; nunca se rotó el rol anterior. El deployment final pasó sus smokes y el par antiguo permaneció disponible.

Rollback inmediato: dejar de usar las dos URLs nuevas y volver al par inmutable `bjsq11eye` / `abjaf48sh`; no requiere cambio de Site URL, alias, esquema ni credenciales del par anterior. Antes de revocar el rol C1, consultar deployments que lo utilicen; no se revoca mientras la API Preview nueva siga disponible. No ejecutar `vercel --prod` ni promover alias como parte de este rollback.

## Próximo gate y esfuerzo

Realizar en el Preview nuevo un recorrido autenticado real de Google/Supabase (callback, intercambio del código, sesión, recarga y renovación), luego comprobar OPERATOR, VIEWER y tenant ajeno sin crear operaciones de negocio. Registrar resultados por identidad y deployment; sólo entonces decidir A1/A2. Modelo recomendado para esa validación de identidad/aislamiento: **GPT-6 Astra, esfuerzo alto**. Para documentar evidencias y cerrar el corte sin cambiar lógica: **GPT-6 Sol, esfuerzo medio**. La publicación segura de este corte correspondió a **GPT-6 Astra, esfuerzo alto** por el rol, RLS y rollback.

Este documento se agregó después del despliegue; por eso el commit documental posterior no forma parte del SHA Web/API publicado.

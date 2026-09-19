# Preview: explicación persistente del bloqueo de perfil

19 septiembre 2026, 15:06 UTC. Modelo recomendado: Sol alto. Checklist de despliegue aplicada sólo al preview autorizado; producción fuera de alcance.

## Fuente y destino

Checkout D:/andre/worktrees/freight-cost-model/supabase-auth-migration-20260830, rama codex/supabase-auth-slice, limpio al exportar `6b804d7b976e35e68feaa1e544c15bb474c636b5` mediante git archive. Ambos builds recibieron 452 archivos de esa exportación.

- API: https://freight-cost-6b5xtep9g-elandopando8892s-projects.vercel.app — dpl_Gg6pb4Ky8uJbdDpDVGM9gKc66Fnn.
- Web: https://freight-cost-qu5sz8lxu-elandopando8892s-projects.vercel.app — dpl_E4nU9vqQnp1a58nBGrvHjVvQT9Yu.
- Proyectos existentes confirmados por CLI: freight-cost-api (prj_mw1xLIqutlRSIG2F2BryfPqDvN2L, apps/api) y freight-cost-web (prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV, apps/web), equipo elandopando8892s-projects.
- Ambos READY, target null, deploy solicitado con --target preview. API_URL del web explícito hacia la API anterior en build y runtime. RELEASE_SHA y gitCommitSha explícitos e iguales en ambos.

## Validación

Build API generó Prisma Client y confirmó `Production migrations skipped outside Vercel Production.` La confirmación de migraciones staging se fijó a DISABLED para este build. Build web completó Next 16.3.3 y TypeScript. Pruebas focalizadas previas del mensaje: 2/2 PASS y typecheck local PASS.

GET /health: status ok, release 6b804d7b976e35e68feaa1e544c15bb474c636b5. GET /ready: ready, database connected, mismo release. La conexión no acredita aislamiento de datos.

staging-auth-bff-smoke.ts: WEB_LOGIN, WEB_CSP_REPORT_ONLY, BFF_UNAUTHENTICATED, API_HEALTH y API_READY PASS. API_CORS BLOCK; salida 1, ready false. Se conserva sin reinterpretar el resultado del verificador. El análisis previo del recorrido BFF está en C1_CALCULATION_BLOCKER_2026-09-19.md; falta adaptar explícitamente los modos del verificador, no abrir CORS globalmente.

Login autenticado, renovación, aislamiento, recorrido completo y comprobación visual del nuevo panel en este preview: pendientes. El bloqueo operativo del perfil permanece. No se declara C1 ni A3 cerrado.

## Hallazgos de dependencias

Audit completo del lockfile volvió a reportar 13 hallazgos: 2 low, 4 moderate, 6 high, 1 critical. El crítico está en Vitest y describe lectura/ejecución de archivos cuando su UI server escucha. La propuesta automática cambia Vitest a 5.0.1 (major); no aplicada. Vite/vite-node/esbuild también dependen de esa actualización propuesta. Otros paquetes: @hono/node-server, body-parser, brace-expansion, browserslist, fast-uri, hono, js-yaml, postcss-selector-parser y qs. Falta verificar rutas de dependencia/exposición y resolver o justificar los hallazgos; no afirmar ausencia total de vulnerabilidades a partir del audit omit=dev anterior.

## Recuperación y límites

Ante regresión de login, permisos, BFF o UI, dejar de usar esta pareja y volver al preview alineado eee0fa8: web 8rsm0poap y API cauiyuc1e (URLs completas en PREVIEW_SECURITY_RELEASE_2026-09-19.md). Este procedimiento revierte selección del preview, no datos. No reemplazó alias productivos ni requiere promover despliegues a producción.

No hubo cambios de Auth, bases, usuarios, migraciones, env compartidas ni operaciones comerciales. No se activó ningún perfil. La definición operativa y límites de recuperación de versiones se encuentran en C1_PROFILE_DECISION_2026-09-19.md.

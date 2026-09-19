# Candidato con dependencias corregidas

19 septiembre 2026, 14:49 UTC. Fuente eee0fa884085512a5edb35579614e7847c4f8669 exportada con git archive desde checkout limpio; 446 archivos enviados a ambos proyectos existentes.

- API: https://freight-cost-cauiyuc1e-elandopando8892s-projects.vercel.app — dpl_9z3hRukccqU22T3hUqJASTpA4XAs.
- Web: https://freight-cost-8rsm0poap-elandopando8892s-projects.vercel.app — dpl_Ai7ZJRBHBr4xBGtRAAGNJQijggZ4.
- Ambos READY, target null (preview). API_URL web explícito a esta API en build/runtime; RELEASE_SHA API igual a fuente. Build web confirmó Next 16.3.3 y completó TypeScript.
- API generó Prisma Client y registró que omitió migraciones fuera de Production. No se ejecutaron migraciones ni cambios de Auth compartido.

Smoke existente staging-auth-bff-smoke: 5 PASS (login 200, CSP report-only, BFF 401 no-store, health, ready), 1 BLOCK (API_CORS). La API no devolvió el nuevo origen web como Access-Control-Allow-Origin. Se conserva el resultado; no se presenta el release como aprobado. Pendiente determinar si esa exigencia corresponde al diseño BFF vigente antes de cambiar configuración. No ampliar CORS para convertir el verificador en PASS.

La prueba OPERATOR/VIEWER documentada corresponde al preview 04c7ed7 anterior, no a este candidato. Login real, renovación, autorización API y recorrido completo siguen pendientes aquí.

Build web aún reporta 13 vulnerabilidades incluyendo herramientas de desarrollo. Auditoría local del lockfile omit=dev dio cero (DEPENDENCY_CLOSURE_2026-09-19.md); se requiere clasificar los hallazgos de desarrollo para release.

Rollback: conservar pareja 04c7ed7 (web jql3ypt8t, API 6j7xrgj50); dejar de usar el candidato nuevo si falla. El anterior conserva dependencias vulnerables y no debe promoverse a producción. No se alteraron alias productivos ni datos.

Modelos recomendados: Sol alto para despliegue; Astra alto para revisión Auth/permisos. Objetivo activo, no terminado.

# Preview C1 publicado

Observación: 2026-09-19 14:37 UTC. Fuente exportada con git archive desde checkout limpio: 04c7ed7baae6da53ed998439a0326147e28e655b. Se usó la misma exportación de 442 archivos para ambos proyectos existentes del equipo elandopando8892s-projects.

| Componente | Proyecto / deployment | URL |
|---|---|---|
| API | prj_mw1xLIqutlRSIG2F2BryfPqDvN2L / dpl_8DNKZGeh1czxSfGjDNf25NMRAJYY | https://freight-cost-6j7xrgj50-elandopando8892s-projects.vercel.app |
| Web | prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV / dpl_2NNtkvC5VD54qDkgRqrussZzcpJ1 | https://freight-cost-jql3ypt8t-elandopando8892s-projects.vercel.app |

CLI reportó ambos READY, target null (preview). API_URL del deployment web se fijó explícitamente al API de esta tabla, en build/runtime. RELEASE_SHA del API coincide con la fuente. Metadatos gitCommitSha y gitDirty describen la exportación, no un push remoto.

Build API: Prisma Client generado; mensaje literal "Production migrations skipped outside Vercel Production." Rama de build codex/supabase-auth-slice y confirmación de migración staging DISABLED. No se ejecutaron migraciones, semillas ni cambios de configuración compartida.

Smoke observado: API /health y /ready 200, release exacto y database connected; API /auth/me sin sesión 401; web /login 200; BFF /api/v1/auth/me sin sesión 401; callback sin código 307 a error de login en el mismo origen. Esto no prueba login Google, intercambio PKCE, rol, renovación ni recorrido autenticado. A1/A2 siguen pendientes.

El build web reportó 16 vulnerabilidades de dependencias (2 bajas, 5 moderadas, 7 altas, 2 críticas). Pendiente identificar paquetes, alcance runtime y corrección antes de aprobar producción. No se aplicó npm audit fix automático.

Rollback: conservar pareja previa f2870fe: web https://freight-cost-m49tmfg65-elandopando8892s-projects.vercel.app y API https://freight-cost-j8v6aqzk7-elandopando8892s-projects.vercel.app. Para retirar esta revisión, dejar de usar las nuevas URLs; no se promovió alias productivo. El anterior conserva el fallo de enlace inicial. No hubo cambios de datos que revertir.

Siguiente: acceso autenticado en nuevo origen, confirmar OPERATOR/organización, comprobar VIEWER y renovación; clasificar advisories de dependencias. Modelos recomendados: Sol alto para despliegue/evidencia, Astra alto para Auth y evaluación crítica.

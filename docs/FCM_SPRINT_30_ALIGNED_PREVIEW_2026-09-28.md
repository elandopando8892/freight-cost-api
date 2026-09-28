# Sprint 30 — Web/API alineados en Preview, sin migraciones

Modelo: GPT-6 Sol; esfuerzo medio. Esta actividad fue de release y comprobación, sin cambio de interfaz ni wireframe nuevo.

## Entrega y evidencia

Se exportó el árbol limpio de `90c132927cb96af4e3e230f102ae0c3f8171e737` desde el worktree en D: y se desplegó **sólo en Preview** a los dos proyectos Vercel verificados del equipo `team_KUG1PtOwoJ16eUqxiOJ330Os`:

| Componente | Proyecto | Deployment | URL |
| --- | --- | --- | --- |
| API | `prj_mw1xLIqutlRSIG2F2BryfPqDvN2L` | `dpl_4nH9d6U1tabDetFgKGnzRg1911gU` | `https://freight-cost-dgvul5a5n-elandopando8892s-projects.vercel.app` |
| Web | `prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV` | `dpl_2L1QhwiyLmLv3P5YcoTAGqMtgi6v` | `https://freight-cost-q91ugwywg-elandopando8892s-projects.vercel.app` |

Los dos deployments respondieron `READY` y reportaron ese mismo SHA en metadatos. En el Web se configuró `API_URL` de build y runtime con la URL exacta de la API anterior. La API respondió `200` en `/health` y `/ready`, `release=90c1329…` y `database=connected`. Su log de build contiene `Production migrations skipped outside Vercel Production.`

La comprobación read-only de Supabase `rateware-prod` devolvió `PASS` para el callback exacto `https://freight-cost-q91ugwywg-elandopando8892s-projects.vercel.app/auth/callback`, cubierto por `https://freight-cost-*-elandopando8892s-projects.vercel.app/auth/callback`. No cambió el Site URL ni se autorizó `*.vercel.app`.

El smoke Web/API sin sesión devolvió `ready=true`: `/login` 200, CSP Report-Only, BFF `/api/v1/org` 401 JSON y `no-store`, API `/health` y `/ready` 200; CORS directo no aplica a esta ruta BFF. Este resultado **no equivale a login autenticado** ni demuestra que una llamada BFF con sesión alcance la API nueva.

La inspección read-only de Neon staging posterior al deployment siguió en 42 migraciones aplicadas de 46 artefactos, con las mismas cuatro pendientes (`finalize_supabase_identity` y tres de llantas), cero fallidas y tres usuarios con `supabaseId` válido. No se aplicó ninguna migración, no se capturó investigación Tire V2 y no se modificaron usuarios, Auth compartido, alias productivos o producción.

## Límite de aceptación y rollback

En el Preview anterior, una sesión Supabase iniciada manualmente sobrevivió una recarga y la página protegida `/settings` mostró la organización HeyMarksman y los tres miembros/roles a través de lecturas de la app. Esa prueba corresponde a otro par de deployments, **no** al nuevo par de este sprint. En el nuevo origen faltan login Google/PKCE manual, intercambio de código, sesión, recarga, renovación y lectura BFF autenticada, además de comprobar roles y aislamiento. No se extraerán tokens ni cookies para simularla.

Rollback: dejar de usar estas dos URLs inmutables y volver al Preview anterior; no se movió ningún alias ni se cambió esquema/dato remoto. Si el nuevo Web se prueba con sesión, usarlo con su API emparejada por `API_URL`, nunca interpretar el Preview anterior como evidencia del nuevo. Antes de cualquier corte de Neon se requiere autorización puntual para las cuatro migraciones, revisión del backup/ensayo de clon documentado en `FCM_SPRINT_27_TIRE_V2_STAGING_PREFLIGHT_2026-09-28.md` y una prueba autenticada en este par.

Control de release: ejecutar el verificador de cobertura OAuth para la **URL Web exacta** y `staging-auth-bff-smoke.ts` con las dos URLs exactas antes de cada Preview; exigir además mismo SHA en los dos deployments y comprobación read-only del inventario de migraciones después de publicar. `PASS` de configuración y smoke no sustituye aceptación autenticada.

# Sprint 29 — control de Auth en Preview (sin corte de staging)

Modelo recomendado: GPT-6 Sol, esfuerzo medio para verificación y guardas; Astra alto sólo para un corte de identidad/migraciones autorizado. No hay cambio UI/UX ni wireframe nuevo.

## Resultado verificable

El frontend exacto `https://freight-cost-dlo7yveni-elandopando8892s-projects.vercel.app` es un deployment `READY` del proyecto Vercel `freight-cost-web` (`prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV`, equipo `team_KUG1PtOwoJ16eUqxiOJ330Os`), ID `dpl_EoaXcSQnJXpBwrTxTCuiU9BF9xTz`, SHA desplegado `5b9bc2fd94d59b426ea535a2977154d4a5696e00`. La API Preview consultada fue `https://freight-cost-p6i5zd05x-elandopando8892s-projects.vercel.app`, proyecto API verificado, deployment `dpl_Be3NqRMP53nR8DNG31J84hdytBPR`, SHA `192f8577a8442d407c61b907e37c4decd40a0a01`. Ambos son anteriores al HEAD de este worktree; no se afirma que sean un par del mismo commit ni que `API_URL` del Web apunte necesariamente a esa API.

El verificador OAuth ahora reconoce el vínculo `.vercel` del proyecto API o Web, pero exige que **la URL exacta** resuelva en Vercel a un deployment Web `READY` del proyecto correcto y no productivo. Leyó `rateware-prod` en Supabase sin cambiarlo: el callback `https://freight-cost-dlo7yveni-elandopando8892s-projects.vercel.app/auth/callback` está cubierto por `https://freight-cost-*-elandopando8892s-projects.vercel.app/auth/callback`. No se amplió a `*.vercel.app`, ni se cambió `Site URL`.

El smoke sin autenticación del Web y la API devolvió cinco comprobaciones `PASS` (login, CSP Report-Only, BFF JSON 401/no-store, API health y ready) y `API_CORS=NOT_APPLICABLE` por el BFF revisado en el SHA Web. Su `ready=true` corresponde **sólo** al contrato read-only sin sesión. El navegador Chrome abrió el Web exacto y fue dirigido a `/login?next=%2F`; no había sesión reutilizable. No se automatizó Google ni el formulario de credenciales, y no se obtuvo prueba de intercambio de código, sesión, recarga, renovación o llamada BFF autenticada.

## Control de release y límite

Ejecutar antes de cada nuevo Preview, con `VERCEL_CLI_PATH` y `SUPABASE_ACCESS_TOKEN` sólo en el proceso local, sin imprimirlos ni guardarlos en Vercel:

`node ../../node_modules/tsx/dist/cli.mjs scripts/verify-oauth-preview-coverage.ts --preview-url=https://<deployment-web-verificado> --json`

El resultado debe ser `PASS` y nombrar el deployment/SHA exactos. Después ejecutar `staging-auth-bff-smoke.ts` con URLs Web/API exactas y evidencia de enrutamiento BFF. Ninguno de los dos controles autoriza una migración ni sustituye una prueba autenticada manual en ese mismo Preview. Para cerrar Auth faltan Google/PKCE, sesión, recarga, renovación, llamada BFF con identidad y correspondencia `User`/organización/rol. Se requiere que un usuario autorizado inicie sesión en el Preview; el agente no debe extraer tokens/cookies ni automatizar el diálogo de autenticación.

Neon staging, Auth remoto, usuarios, aliases de producción y despliegues permanecieron sin cambios. Las cuatro migraciones siguen pendientes en staging. El ensayo de clon y rollback están en `FCM_SPRINT_27_TIRE_V2_STAGING_PREFLIGHT_2026-09-28.md`.

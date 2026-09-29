# Sprint 34 — runtime limitado y par Preview para investigación de llantas v2

Estado: **corte técnico de Preview terminado; captura v2 y aceptación autenticada pendientes**. Modelo recomendado: GPT-6 Sol, esfuerzo alto (grants, RLS y release); no se modificó la UI, así que no corresponde un wireframe nuevo.

## Alcance y evidencia

Se preparó en Neon staging `broad-art-99750179` / `neondb` el rol fijo `fcm_tire_v2_preview_20260929`, sin superusuario ni `BYPASSRLS`. La preparación exigió las 46 migraciones esperadas, tres usuarios de staging y RLS **forzada** en ambas tablas `TireCohortV2Research*`. La comprobación directa con ese rol confirmó lectura de usuarios, SELECT/INSERT en la tabla v2 y ausencia de SELECT sobre `_prisma_migrations`. El rol tiene lectura de las tablas públicas para las rutas existentes, UPDATE sobre `Organization` y DML sobre las dos tablas v2; **no es una cuenta de sólo lectura ni una prueba de aislamiento de todos los recursos**. La separación por organización de la captura depende además de la RLS forzada y de la autorización de la API.

El script reproducible es `apps/api/scripts/provision-tire-v2-preview-runtime.ts`. Sólo acepta el proyecto verificado, un árbol Git limpio, inventario exacto y una confirmación de alcance. Transmite la nueva contraseña directamente al deployment API sin imprimirla. No escribió registros de investigación ni parámetros económicos. Se rotó una vez la contraseña para corregir metadatos de release del primer intento; el primer par de deployments quedó reemplazado y no debe usarse.

Par vigente, ambos desde el commit limpio `f90c629c4f08df3887f42b9610a058b8c343fee9` en `codex/cost-tires-release-s14`:

| Pieza | Deployment inmutable | URL |
| --- | --- | --- |
| API Preview | `dpl_8wTai9ioU2oZrNJ7JDWX2aWVay6J` | `https://freight-cost-h63kwa221-elandopando8892s-projects.vercel.app` |
| Web Preview | `dpl_AXhWreUN4jB8AujSzwN5xEcK2Ldu` | `https://freight-cost-bb8qaubt7-elandopando8892s-projects.vercel.app` |

`verify-preview-pair.ts` pasó las ocho comprobaciones: deployments Preview, mismo SHA/ref, origen limpio, URL API del Web y release de `/health` y `/ready`. `staging-auth-bff-smoke.ts` pasó en modo BFF: `/login` 200, CSP Report-Only, BFF sin sesión 401 JSON/no-store, API `/health` y `/ready` 200 con el mismo release y base conectada. La ruta v2 respondió 404 con `FCM_TIRE_V2_RESEARCH_CAPTURE_ENABLED=false`. El smoke es **público, no autenticado**; ni estas respuestas ni la preparación directa del rol prueban login, sesión, tenant cruzado o POST real en el deployment.

## Límites y siguiente puerta

No se tocaron producción, alias, Supabase Auth, Site URL, usuarios, migraciones, otras aplicaciones ni bases operativas. Los overrides `STAGING_DATABASE_URL`, bandera v2 y `RELEASE_SHA` son del deployment API Preview, no del entorno compartido. Las referencias públicas de llantas no acreditan instalación, costo observado y retiro de una carcasa concreta; por ello no se generó un ciclo de flota ni se propagó un valor a CFU, CVU o cotizaciones.

Para activar captura en otro Preview se necesita comprobar primero el rol **efectivo** de ese runtime y la RLS forzada, contar con un ciclo real documentado y autorización específica para registrarlo. Luego hacer prueba autenticada de POST, idempotencia, relectura, sesión/recarga y denegación entre organizaciones. Hasta entonces `researchOnly=true`, `parameterWriteAllowed=false` y `quoteEligible=false` son condiciones de diseño, no aceptación operativa de un registro remoto.

## Recuperación

Si el par presenta fallos, dejar de utilizar las dos URLs inmutables y desplegar un nuevo par Preview desde un commit limpio; no promoverlas ni cambiar el alias. La bandera de captura ya está apagada, por lo que no hay snapshots v2 creados por este corte. La rotación invalidó la conexión del primer API Preview: no usarlo como fallback. Para retirar el rol, primero identificar y dejar de usar **todos** los deployments que recibieron su contraseña, luego revocar sus grants y eliminar sólo `fcm_tire_v2_preview_20260929` en el staging verificado. No hacerlo mientras el Preview vigente dependa de él. Conservar el deployment y las trazas de la compuerta como evidencia.

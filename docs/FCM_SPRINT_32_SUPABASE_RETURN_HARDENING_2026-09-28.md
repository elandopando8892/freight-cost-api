# Sprint 32 — retorno OAuth del mismo origen

Modelo: GPT-6 Sol; esfuerzo medio. Se corrige código local de navegación Auth, sin cambiar proveedor, configuración Supabase, usuarios, Neon ni UI visual. No aplica wireframe nuevo.

## Motivo y cambio

El callback Supabase aceptaba un `next` que comenzaba con `/` pero también podía comenzar con `/\`. La construcción estándar de URL interpreta ese segundo caso como otro host. Aunque el login ordinario no genera ese destino, un enlace de retorno manipulado podía redirigir fuera del Preview tras un intercambio de código correcto.

`safeAuthNext` exige una ruta interna, rechaza `//`, barras invertidas, controles y separadores codificados; además compara el origen resultante con el origen de la solicitud. El callback y el retorno de `/login` usan la misma regla. El retorno legítimo conserva ruta, consulta y fragmento; el retorno a `/login` desde una sesión ya autenticada se normaliza a `/` para evitar un bucle. No se tocan `redirectTo`, PKCE, cookies, Site URL ni la allow-list de Supabase.

Pruebas locales: 64/64 tests Web y build de Next.js pasaron. Los nuevos tests cubren la URL maliciosa, retorno legítimo a `/cost-bases/tires`, intercambio de código exitoso/fallido, BFF sin sesión, `API_URL` configurada y token verificado sintético. Son pruebas de código con mocks, **no** prueban un login Google real, renovación de sesión ni el valor efectivo de `API_URL` en Vercel.

## Release y aceptación

Publicar sólo un nuevo par Web/API del mismo SHA en Preview con migraciones explícitamente deshabilitadas; verificar cobertura OAuth, guarda de par, smoke sin sesión y ledger Neon read-only. El usuario debe completar Google Sign-In manualmente en el nuevo origen. Después comprobar `/api/v1/health` por BFF (mismo SHA), `/settings`, recarga, renovación y roles. La sesión de un Preview anterior no acepta el nuevo. Rollback: volver a las URLs inmutables del sprint 30, sin mover aliases ni revertir datos.

## Publicación y comprobación (2026-09-29 00:07–00:08 UTC)

Se exportó el árbol limpio del commit `577225f4717e6952ee51bfcfccaa60a06cc2e775` desde D: y se publicó **sólo en Preview**:

| Componente | Deployment | URL |
| --- | --- | --- |
| API | `dpl_72m5FYGKUCbLSp9qtE9th7XHAtGi` | `https://freight-cost-1j1u2np1p-elandopando8892s-projects.vercel.app` |
| Web | `dpl_6mbvtZHB4JLkh8z46HwV7LdXkzmd` | `https://freight-cost-mlfj4xmbx-elandopando8892s-projects.vercel.app` |

Ambos deployments quedaron `READY` con el mismo SHA y rama. El Web recibió `API_URL` de build/runtime con la URL exacta de esa API. El log de API confirmó `Production migrations skipped outside Vercel Production.`; `/health` y `/ready` respondieron 200 con el SHA esperado y base conectada. La cobertura OAuth del callback exacto obtuvo `PASS` por el patrón limitado a FCM/equipo; la guarda de par obtuvo ocho checks `PASS`; el smoke sin sesión obtuvo cinco `PASS`, con CORS directo no aplicable al BFF. El preflight Neon read-only posterior mantuvo 42/46 migraciones, las mismas cuatro pendientes y cero fallidas. Site URL, Auth compartido, usuarios, aliases y producción permanecieron sin cambios.

El navegador abrió inicialmente este Web y mostró `/login` (sin sesión). En ese momento aún faltaban el login manual, la lectura autenticada del BFF, recarga y revisión de roles; los `PASS` anteriores eran sólo de configuración, despliegue y contrato sin sesión. La validación posterior se registra a continuación.

## Validación autenticada posterior (mismo Preview)

Tras el inicio de sesión manual informado por el usuario, el navegador del Preview Web exacto mostró el panel autenticado con organización `HeyMarksman` y cuenta `sales@heymarksman.com` como `ADMIN`. Una recarga de `/fuel` conservó la sesión y volvió a mostrar los datos. En esa pantalla se seleccionó `East Coast`, acción de **lectura** que hizo GET a `/api/v1/market/fuel/history` por el BFF del mismo origen: respuesta HTTP `200` con encabezado `x-release-id: 577225f4717e6952ee51bfcfccaa60a06cc2e775`, idéntico al SHA de la API Preview emparejada. No se ejecutó `Refresh from EIA`, mutación ni cálculo de negocio.

`/settings` cargó organización y tres miembros desde las lecturas API de la aplicación: `sales@heymarksman.com` administrador, `andresmclovin@gmail.com` operador y `jgonzalez@xbfreight.com` consulta; las tres identidades aparecen vinculadas a Supabase. No se modificaron roles ni invitaciones. La navegación directa del navegador a `/api/v1/health` fue bloqueada por el cliente antes de una respuesta; no se interpretó como fallo del servidor ni se intentó eludir el bloqueo. La lectura BFF de Fuel es la prueba autenticada de upstream para este par.

**Alcance:** se confirmó sesión utilizable, persistencia tras una recarga, organización/rol visibles y BFF autenticado hacia la API del mismo release. No se observó de forma independiente la transacción del código OAuth/PKCE ni un ciclo de renovación por vencimiento real; tampoco se hizo una prueba de aislamiento entre dos organizaciones. Esos puntos siguen abiertos para aceptación completa. No se leyeron ni copiaron códigos, tokens, cookies o contraseñas.

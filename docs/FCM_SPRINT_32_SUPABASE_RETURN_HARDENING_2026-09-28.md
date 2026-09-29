# Sprint 32 — retorno OAuth del mismo origen

Modelo: GPT-6 Sol; esfuerzo medio. Se corrige código local de navegación Auth, sin cambiar proveedor, configuración Supabase, usuarios, Neon ni UI visual. No aplica wireframe nuevo.

## Motivo y cambio

El callback Supabase aceptaba un `next` que comenzaba con `/` pero también podía comenzar con `/\`. La construcción estándar de URL interpreta ese segundo caso como otro host. Aunque el login ordinario no genera ese destino, un enlace de retorno manipulado podía redirigir fuera del Preview tras un intercambio de código correcto.

`safeAuthNext` exige una ruta interna, rechaza `//`, barras invertidas, controles y separadores codificados; además compara el origen resultante con el origen de la solicitud. El callback y el retorno de `/login` usan la misma regla. El retorno legítimo conserva ruta, consulta y fragmento; el retorno a `/login` desde una sesión ya autenticada se normaliza a `/` para evitar un bucle. No se tocan `redirectTo`, PKCE, cookies, Site URL ni la allow-list de Supabase.

Pruebas locales: 64/64 tests Web y build de Next.js pasaron. Los nuevos tests cubren la URL maliciosa, retorno legítimo a `/cost-bases/tires`, intercambio de código exitoso/fallido, BFF sin sesión, `API_URL` configurada y token verificado sintético. Son pruebas de código con mocks, **no** prueban un login Google real, renovación de sesión ni el valor efectivo de `API_URL` en Vercel.

## Release y aceptación

Publicar sólo un nuevo par Web/API del mismo SHA en Preview con migraciones explícitamente deshabilitadas; verificar cobertura OAuth, guarda de par, smoke sin sesión y ledger Neon read-only. El usuario debe completar Google Sign-In manualmente en el nuevo origen. Después comprobar `/api/v1/health` por BFF (mismo SHA), `/settings`, recarga, renovación y roles. La sesión de un Preview anterior no acepta el nuevo. Rollback: volver a las URLs inmutables del sprint 30, sin mover aliases ni revertir datos.

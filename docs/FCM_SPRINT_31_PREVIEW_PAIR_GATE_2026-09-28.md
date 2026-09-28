# Sprint 31 — guarda del par Web/API en Preview

Modelo: GPT-6 Sol. Esfuerzo: medio. No hubo cambio de UI/UX; no aplica wireframe nuevo.

## Resultado

`apps/api/scripts/verify-preview-pair.ts` comprueba por lectura los dos deployments exactos del equipo Vercel de FCM. Exige Web y API `READY`, proyectos correctos, destino no productivo, origen limpio, misma rama y SHA completo, presencia de `API_URL` en el entorno Web, y `/health` y `/ready` de la API con ese mismo release y base conectada. Falla cerrado ante diferencias o fallos de lectura; no modifica Vercel, Supabase ni Neon.

Ejecución desde `apps/api`, con `VERCEL_CLI_PATH` temporal en el proceso:

`npm run verify:preview-pair -- --web-url=https://<web-preview-exacto> --api-url=https://<api-preview-exacta>`

En el par del sprint 30 (`dpl_2L1QhwiyLmLv3P5YcoTAGqMtgi6v` / `dpl_4nH9d6U1tabDetFgKGnzRg1911gU`, SHA `90c132927cb96af4e3e230f102ae0c3f8171e737`) obtuvo ocho checks `PASS`. Una primera lectura de salud falló transitoriamente en Node; `/health` y `/ready` respondieron 200 con el SHA esperado en una comprobación independiente y la repetición de la guarda pasó. La guarda conserva el fallo cerrado en vez de atribuir un éxito a una respuesta ausente. Las suites de OAuth, smoke y par de release pasaron, junto con el typecheck de API.

## Límite y checklist de liberación

Vercel expone los nombres de variables del deployment, pero no confirma aquí el **valor** efectivo de `API_URL`. Por eso el resultado declara `authenticatedUpstreamVerified=false`: mismo SHA, API sana y variable presente no prueban que el BFF Web use esa API. El paso siguiente requiere iniciar sesión manualmente en el nuevo Web y consultar `/api/v1/health` en ese mismo origen; el `release` del BFF debe coincidir con el SHA/API esperados. Después validar `/settings`, recarga, renovación de sesión, roles y aislamiento. No extraer ni copiar tokens/cookies.

Antes de cada Preview: (1) verificar cobertura OAuth de la URL Web exacta con `verify-oauth-preview-coverage.ts`; (2) ejecutar esta guarda; (3) ejecutar `staging-auth-bff-smoke.ts`; (4) completar las pruebas autenticadas del mismo par. Bloquear promoción si falla un paso. La cobertura de configuración y el smoke sin sesión no son aceptación de Auth. Rollback: dejar de usar los URLs inmutables y volver al par Preview anterior; no se movieron aliases ni hubo migraciones. Las cuatro migraciones de Neon siguen requiriendo autorización puntual y preflight propio.

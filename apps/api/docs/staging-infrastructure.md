# Infraestructura aislada de staging

## Estado observado — 12 de agosto de 2026

Auditoría remota de solo lectura:

- API Production responde `/health`, pero el artefacto desplegado todavía no
  publica `release` ni `x-release-id`.
- API Production responde `404` en `/ready`; por tanto sigue en el commit previo
  a los gates de release actuales.
- Web Production responde `200` en `/login`.
- Vercel no reportó errores agrupados para API o web en las últimas 24 horas.
- El registro legado `DATABASE_URL` sigue compartido con Preview, por lo que no
  se modifica ni se usa en staging.
- Neon `freight-cost-model-staging` (Free, `iad1`) está provisionado y conectado
  sólo a Preview como `STAGING_DATABASE_URL`.
- Web Preview no tiene variables configuradas.

La base Neon aislada tiene 29/29 migraciones y los catálogos V3.0 cargados. La
CI local del candidato pasa 214/214 pruebas y 0 vulnerabilidades productivas.

Resultado actual: **BLOCK** para despliegue. La rama remota `staging` todavía no
existe, por lo que Vercel rechaza variables limitadas a esa rama. No se desplegó
ni promovió ningún artefacto y Production permanece intacto.

## Contrato requerido

La rama estable de staging será `staging`. Antes de crear un Preview deben
existir en el target Preview. Mientras Vercel Marketplace no permita limitar
la conexión Neon a una rama, sólo la rama estable `staging` podrá desplegarse
con este proyecto y compartir esa base:

API:

- `STAGING_DATABASE_URL` de la base Neon aislada. Cuando `VERCEL_ENV=preview`,
  el runtime la exige y nunca cae a `DATABASE_URL`;
- `NODE_ENV=production`;
- `KINDE_ISSUER_URL` y `KINDE_AUDIENCE` de staging;
- `CORS_ORIGINS` con el alias estable del web de staging;
- `OPENAI_API_KEY`, `OPENAI_KEY_ROTATED_AT` y `OPENAI_MODEL` de staging.

Web:

- `API_URL` con el alias estable del API de staging;
- `KINDE_CLIENT_ID`, `KINDE_CLIENT_SECRET`, `KINDE_ISSUER_URL`,
  `KINDE_AUDIENCE`;
- `KINDE_SITE_URL`, `KINDE_POST_LOGIN_REDIRECT_URL` y
  `KINDE_POST_LOGOUT_REDIRECT_URL` usando el alias estable de la rama.

`STAGING_DATABASE_URL`, `API_URL` y `KINDE_CLIENT_SECRET` deben ser registros
Preview separados; nunca registros que también tengan target Production.

## Preflight automático

```powershell
$env:STAGING_VERCEL_GIT_BRANCH = "staging"
npm run preflight:staging:infra
```

El comando usa Vercel CLI fijado en `58.9.5`, consulta solamente nombres, tipos
y scopes, y emite JSON sin valores. No hace writes. Cualquier ausencia o mezcla
Production/Preview devuelve exit code 1.

## Secuencia posterior al PASS

1. Construir un commit limpio con el release candidato completo.
2. Crear Preview del API y verificar `/health` y `/ready` con el SHA esperado.
3. Ejecutar `prisma migrate deploy` únicamente contra la base aislada.
4. Crear Preview del web apuntando al API de staging.
5. Completar login Kinde, registrar las cuatro identidades ADMIN y ejecutar el
   preflight de Sprint 71.
6. Sólo con evidencia humana autorizada, ejecutar el GO dual. Ningún GO promueve
   automáticamente a Production.

## Migración protegida de Neon staging

El comando `npm run db:migrate:staging` exige `STAGING_ENV_FILE` y
`EXPECTED_STAGING_NEON_PROJECT_ID`, valida que la URL unpooled sea un endpoint
Neon cuya identidad coincida con el recurso provisionado y ejecuta
`prisma migrate status`, `deploy` y `status`. Nunca acepta una URL arbitraria ni
usa el `DATABASE_URL` compartido como destino.

`npm run db:seed:staging` reutiliza la misma validación antes de cargar los
catálogos idempotentes y la organización técnica `__SYSTEM__`; no crea usuarios
ni importa datos de clientes.

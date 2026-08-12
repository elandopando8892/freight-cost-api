# Runbook de corte a producción

Este runbook prepara un piloto controlado. No sustituye una decisión humana de
GO ni autoriza el envío de datos a Rateware o Gmail.

## 1. Congelar el artefacto

1. Revisa los cambios, conserva los que pertenezcan al release y crea un commit
   de release en una rama explícita. No mezcles cambios de otros frentes.
2. Ejecuta desde la raíz del monorepo:

   ```powershell
   npm run verify:release
   ```

   Para un piloto que incluya Rateware, sustituye el comando por
   `npm run verify:release:rateware`; esta variante convierte en bloqueo la
   ausencia del endpoint HTTPS de Rateware.

3. `verify:ci` contiene lint, pruebas, tipado, validación estática Prisma,
   build, auditoría y verificación de whitespace. `verify:release` añade el
   preflight local. El resultado local
   confirma solamente el artefacto; no confirma el estado de Vercel, Neon,
   Kinde, Rateware ni Gmail.
   El release requiere Node.js 20.19.0 o superior; configura el runtime de
   Vercel de forma consistente con esa precondición.

4. Para adjuntar evidencia legible por sistemas de QA, sin variables ni
   secretos, ejecuta `npm run preflight:release -w freight-cost-api -- --json`
   y conserva solamente su salida JSON. Ese comprobante declara explícitamente
   que no comprobó sistemas remotos.

La validación Prisma sólo revisa la sintaxis y relaciones del esquema local; no
consulta Neon ni sustituye `prisma migrate deploy` en la ventana autorizada.
La compuerta además revisa que cada migración local tenga un nombre Prisma
ordenable, SQL no vacío y lock PostgreSQL; tampoco aplica ni compara migraciones
contra Neon.

El workflow `.github/workflows/ci.yml` ejecuta `verify:ci` con Node.js 20.19.0
en cada push y pull request. No recibe secretos, no aplica migraciones ni
despliega; una ejecución verde de CI no reemplaza el preflight ni QA remota.

`verify:ci` incluye un escaneo de secretos en archivos versionados y nuevos no
ignorados. El escaneo sólo reporta archivo y tipo de coincidencia; jamás imprime
el valor detectado. Los secretos siguen perteneciendo exclusivamente al gestor
de secretos del entorno remoto.

## 2. Preparar entornos remotos

Configura los secretos únicamente en el gestor de secretos de los proyectos
remotos. Nunca copies secretos a archivos versionados ni a la evidencia de QA.

| Servicio          | Variables requeridas                                                                                                                                                | Verificación humana                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| API               | `DATABASE_URL`, `KINDE_ISSUER_URL`, `KINDE_AUDIENCE`, `CORS_ORIGINS`, `OPENAI_API_KEY`, `OPENAI_KEY_ROTATED_AT`, `OPENAI_MODEL`, `LOG_LEVEL`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW` | La clave AI expuesta está revocada, el modelo es explícito, CORS contiene el origen HTTPS del Web y la fecha es ISO-8601. |
| Web               | `API_URL`, `KINDE_CLIENT_ID`, `KINDE_CLIENT_SECRET`, `KINDE_ISSUER_URL`, `KINDE_AUDIENCE`, URLs de callback y logout                                                | Kinde permite el dominio productivo y emite access tokens para el audience de la API.             |
| Rateware opcional | `RATEWARE_API_URL` en API; `RATEWARE_GMAIL_API_URL` en Web si se usa el broker Gmail                                                                                | El endpoint receptor, contrato y cuenta de prueba fueron aprobados.                               |

`API_URL` del Web debe apuntar al dominio HTTPS de la API productiva. El BFF
rechaza una URL HTTP en producción y segmentos de ruta ambiguos; además reenvía
`X-Request-ID` desde la API para la trazabilidad de soporte.

Configura `RELEASE_SHA` con el commit que se va a desplegar (Vercel puede
derivarlo de `VERCEL_GIT_COMMIT_SHA`). QA debe comparar ese valor en
`X-Release-ID`, `/health` y `/ready` contra el commit aprobado antes de aceptar
la evidencia de la prueba.
El preflight también exige que `RELEASE_SHA` sea el mismo HEAD local (puede ser
el SHA completo o un prefijo de 7 a 40 caracteres), evitando liberar un commit
distinto del que se validó.

El preflight también revisa el archivo local del Web sin imprimir secretos:
`API_URL` HTTPS, configuración Kinde, constancia `KINDE_SECRET_ROTATED_AT` y
que el origen de sus callbacks coincida con `CORS_ORIGINS` del API. Esta revisión
no confirma que los valores remotos estén cargados; esa comprobación corresponde
a QA autorizada.

El Web aplica `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`, `X-Frame-Options` y una CSP en modo `Report-Only` en
todas sus respuestas. Durante QA, revisa las violaciones de CSP en el navegador
para el flujo Kinde y el iframe sandbox del Quote Desk; registra sólo el
directivo afectado y el resultado en la evidencia de staging. La CSP no se
aplica de forma bloqueante hasta que esos recorridos estén verificados sin
violaciones relevantes y exista aprobación explícita para endurecerla.

El API limita tráfico por instancia en producción; los probes `/health` y
`/ready` no consumen la cuota. Configura el WAF de Vercel para el límite
distribuido y no expongas el origen del API fuera del edge autorizado.

Los endpoints de Rateware y del broker Gmail reciben el bearer del administrador
sólo mediante HTTPS en producción, sin credenciales embebidas y con un timeout
de 15 segundos. HTTP queda limitado a un receptor loopback de desarrollo; una
configuración inválida bloquea la entrega antes de que salga una solicitud.

## 3. Migrar Neon con respaldo

1. Crea y verifica un respaldo recuperable de la base objetivo.
2. Con la `DATABASE_URL` del entorno objetivo cargada sólo en una sesión
   autorizada, comprueba primero la conectividad y el historial sin escribir:

   ```powershell
   npm run db:status -w freight-cost-api
   ```

   Si el estado no puede leerse o hay una recuperación de base en curso,
   detén el corte. No asumas disponibilidad por un panel de proveedor.
3. Sólo con respaldo confirmado, estado limpio y aprobación explícita para el
   entorno objetivo, ejecuta:

   ```powershell
   npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
   ```

4. Consulta `_prisma_migrations` y confirma que todas las migraciones se
   terminaron sin rollback, incluidas `20260811002100` a `20260812000200`.
5. Si una migración falla, detén el corte: no ejecutes `db push`, no edites el
   historial de migraciones y restaura únicamente siguiendo el plan aprobado.

## 4. Desplegar y probar en QA controlado

1. Despliega API y Web desde el mismo commit de release.
2. Comprueba `/health` y `/ready` del API, login/callback/logout Kinde y la
   carga inicial del panel con una cuenta de prueba. `/health` confirma que el
   proceso respondió; `/ready` confirma la consulta mínima a PostgreSQL y debe
   devolver `503` sin detalles si la base no está disponible. Conserva el
   header `X-Request-ID` de cada prueba fallida como referencia de soporte; no
   adjuntes tokens, headers `Authorization` ni cuerpos de cotización.
   Los logs estructurados de producción redactan `Authorization`, cookies y
   `Set-Cookie`; deja `LOG_LEVEL=info` durante el piloto salvo diagnóstico
   acotado.
3. Dos administradores distintos realizan: creación/revisión de escenario,
   aprobación, publicación de una versión, ruta productiva, cotización
   confirmada y verificación de su snapshot.
4. Abre `/pilot-readiness`, descarga `/pilot/evidence.csv` y adjunta el
   resultado a la evidencia de QA.

## 5. Alcance de integraciones

- Sin Rateware/Gmail: el piloto puede seguir si la compuerta no tiene bloqueos;
  la ausencia de Rateware es una advertencia deliberada.
- Con Rateware: enviar únicamente un RateBook con aprobación, conservar el
  recibo de proveedor y validar la trazabilidad.
- Con Quote Desk/Gmail: `PREPARED` y el paquete JSON no son un envío. La entrega
  requiere un receptor Rateware aprobado, idempotencia, recibo externo y una
  actualización de estado diseñada antes de habilitarla.

## 6. GO / NO-GO

> Regla vigente desde Sprint 70: `NO_GO` es inmediato y cierra rondas
> pendientes. `GO` requiere dos administradores distintos sobre la misma huella
> de readiness; ninguno puede ser autor de las verificaciones seleccionadas. La
> primera aprobación queda pendiente y la segunda crea la decisión. Si cambia
> la evidencia, la ronda anterior no cuenta. Este control no despliega ni llama
> servicios externos.

Un administrador registra `NO_GO`; dos administradores independientes registran `GO`.
El sistema impide un `GO` si hay bloqueos, incluido smoke y recorrido humano
PASS para el mismo `RELEASE_SHA`, pero el registro no publica, despliega ni
llama servicios externos. Si hay fallo funcional, registra
`NO_GO`, conserva la evidencia y vuelve al commit/despliegue anterior mediante
el procedimiento del proveedor.

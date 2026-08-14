# E2E controlado de staging: Kinde, BFF y GO multiusuario

Este protocolo se ejecuta únicamente sobre un tenant desechable o autorizado de
staging, después de desplegar un `RELEASE_SHA` identificable. No utiliza cuentas
personales y no crea cotizaciones, RateBooks, entregas Rateware ni correos Gmail.

## 1. Smoke anónimo

El probe inicial no usa credenciales ni realiza escrituras:

```powershell
$env:STAGING_WEB_URL = "https://web.staging.example"
$env:STAGING_API_URL = "https://api.staging.example"
npm run smoke:staging:auth
```

Comprueba `/login`, CSP Report-Only, BFF sin sesión, `/health`, `/ready` y CORS.
La salida omite bodies HTML, tokens, cookies y URLs de destino. Un resultado
local o este smoke anónimo no sustituye el login humano.

## 2. Recorrido humano y evidencia

Dos usuarios ADMIN previamente aprovisionados en el mismo tenant realizan por
separado:

1. Smoke de staging y registro de sus controles.
2. Login/callback Kinde, identidad en Settings, BFF autenticado, BFF sin sesión,
   logout y registro del recorrido humano.

Sólo cuenta el registro más reciente de cada tipo para el release actual. PASS
vence a las 24 horas y un FAIL posterior lo invalida. No guardar tokens, cookies,
Authorization, datos de clientes ni respuestas completas.

## 3. Preflight multiusuario de solo lectura

Se necesita la cuenta ADMIN existente del tenant. En el despliegue actual esa
identidad crea ambas evidencias y confirma el SHA al registrar GO. Si el roster
incorpora más administradores, el backend activa la doble aprobación.

Los endpoints `/pilot/staging-context` y `/pilot/staging-readiness` verifican
tokens Kinde mediante lookup de usuarios existentes. No autoaprovisionan usuario,
organización ni supuestos; una identidad desconocida recibe `403`.

Usar tokens efímeros únicamente en las variables del proceso. No agregarlos a
`.env`, `.env.local`, scripts, historial, tickets o capturas.

```powershell
$env:STAGING_API_URL = "https://api.staging.example"
$env:STAGING_EXPECTED_RELEASE_SHA = "abcdef1"
$env:STAGING_EXPECTED_ORG_ID = "org-autorizada"
$env:STAGING_ADMIN_TOKEN = "<token efímero>"
npm run e2e:staging:pilot
```

El modo predeterminado sólo hace GET. Bloquea si:

- health, ready o headers no corresponden al release esperado;
- PostgreSQL no está listo;
- la identidad no es ADMIN del tenant y release esperados;
- los PASS vigentes no pertenecen al ADMIN declarado;
- readiness contiene cualquier bloqueo.

La salida JSON sólo conserva estados y `x-request-id`; nunca imprime tokens,
correos, URLs o IDs de usuario.

## 4. Ejecución explícita de la aprobación del ADMIN

Este modo escribe evidencia de aprobación y puede crear una decisión GO en
staging. Requiere autorización humana y confirmación exacta del release y tenant:

```powershell
$env:STAGING_PILOT_EXECUTION_CONFIRM = "EXECUTE_STAGING_GO:abcdef1:org-autorizada"
npm run e2e:staging:pilot -- --execute
```

La secuencia esperada para el tenant con un solo ADMIN es:

1. El ADMIN confirma el `RELEASE_SHA` y recibe `201 GO_RECORDED`.
2. GET del ledger confirma la decisión y su aprobación enlazada.

No existen reintentos automáticos. Si la escritura no cierra GO exactamente
sobre el release esperado, el script se detiene y deja una razón segura en la
salida. La decisión GO no despliega, publica ni llama integraciones externas.

Al terminar, eliminar las variables efímeras de la sesión:

```powershell
Remove-Item Env:\STAGING_ADMIN_TOKEN
Remove-Item Env:\STAGING_PILOT_EXECUTION_CONFIRM
```

El Sprint 71 sólo puede marcarse E2E verificado después de una ejecución real
autorizada y revisión de sus request IDs en logs. Las pruebas locales validan el
protocolo, no el estado remoto.

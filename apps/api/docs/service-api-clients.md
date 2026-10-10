# Credenciales de servicio (`SERVICE_API_CLIENTS`)

Implementa la credencial máquina a máquina del contrato `fcm.quote-by-route.v1`
(marketplace → Freight Cost Model). Permite que otro servicio cotice con la
base de costos de **una** organización sin un usuario Kinde.

## Alcance

La credencial de servicio sólo se acepta en:

- `POST /engine/quote-by-route`
- `GET /catalog/*` (`/catalog/equipment`, `/catalog/parameters`,
  `/catalog/parameters/summary`, `/catalog/coverage`)

Cualquier otra ruta sigue exigiendo un access token de Kinde: un token de
servicio presentado allí se evalúa como token Kinde y responde `401`.

## Variable

```
SERVICE_API_CLIENTS="<client_id>:<sha256_hex>:<organization_id>:<role>[,<...>]"
```

| Campo             | Regla                                                         |
| ----------------- | ------------------------------------------------------------- |
| `client_id`       | 1–64 caracteres `[A-Za-z0-9._-]`, único                       |
| `sha256_hex`      | SHA-256 del secreto en hexadecimal (64 caracteres), único     |
| `organization_id` | `Organization.id` existente (cuid, p. ej. `clx…`, 25 chars)   |
| `role`            | `VIEWER` u `OPERATOR` (nunca `ADMIN`)                         |

- Vacío (por defecto) = autenticación de servicio deshabilitada.
- Un valor mal formado (hash que no es hex de 64, campos de más o de menos,
  org que no es cuid, rol inválido, `client_id` o hash duplicados) **detiene el
  arranque** del API (`env.ts`, validado con zod).
- En el API sólo se guarda el hash; el secreto en claro vive únicamente en el
  servicio cliente.

## Alta de un cliente

```bash
# 1. Generar el secreto (entregarlo sólo al servicio cliente)
S="$(openssl rand -base64 32)"

# 2. Calcular el hash que se configura en FCM
printf %s "$S" | sha256sum | cut -d' ' -f1

# 3. Configurar en FCM (Vercel env del API), p. ej.:
# SERVICE_API_CLIENTS="steel-marketplace:<hash>:<organization_id>:VIEWER"
```

Usa `printf %s` (no `echo`) para no incluir el salto de línea en el hash.

El marketplace (The Steel Marketplace) guarda el secreto en claro como
`FREIGHT_API_TOKEN` y lo envía como `Authorization: Bearer <FREIGHT_API_TOKEN>`.

## Comportamiento

1. Se calcula `sha256(token)` y se compara en tiempo constante
   (`crypto.timingSafeEqual`) contra **todos** los clientes configurados.
2. Si coincide y la organización existe:
   `request.user = { sub: "svc:<client_id>", orgId, role, kindeId: null, service: true }`.
   No se crea ni modifica ningún usuario, organización ni conjunto de supuestos.
3. Si coincide pero la organización no existe: `401` (fail-closed).
4. Si no coincide: flujo Kinde sin cambios (`authenticate`).

Los logs de la petición llevan `serviceClient: <client_id>`; el header
`Authorization` está redactado (`[REDACTED]`) por la configuración del logger.

## Rotación

1. Generar un secreto nuevo y agregarlo como **otro** `client_id`
   (p. ej. `steel-marketplace-2026q4`) junto al actual.
2. Actualizar `FREIGHT_API_TOKEN` en el marketplace y desplegar.
3. Quitar la entrada anterior de `SERVICE_API_CLIENTS` y redesplegar FCM.

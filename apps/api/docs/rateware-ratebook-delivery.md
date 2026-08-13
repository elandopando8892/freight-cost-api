# Entrega de RateBook a Rateware

`POST /integration/rateware/ratebooks/:id/deliver` es una acción explícita de
un administrador. Solo acepta RateBooks publicados y reenvía el bearer Kinde
del usuario autenticado; no usa una credencial de Rateware en el navegador.

La entrega calcula una llave SHA-256 estable a partir de la organización, el
RateBook y su versión local. El paquete usa `updatedAt` de esa misma versión
como `exportedAt`; por ello un reintento conserva exactamente la misma llave,
carga JSON y checksum aunque la respuesta anterior se haya perdido. FCM
conserva `RatewareDelivery` con actor, checksum, resultado HTTP, error acotado
y recibo remoto. Reintentar una entrega ya confirmada devuelve el registro
local sin volver a transmitirlo.

## Configuración controlada

Configurar únicamente en el entorno servidor de Freight Cost Model:

```text
RATEWARE_API_URL=https://<supabase-project>.supabase.co/functions/v1/rateware-api
```

Rateware debe verificar el mismo issuer y audiencia Kinde que Freight Cost
Model para que el usuario sea resuelto en ambos workspaces. Aplicar antes la
migración local `20260811001700_rateware_delivery_trace` y después, en
Rateware, `20260811140000_fcm_ratebook_receipts`.

El receptor Rateware persiste el paquete completo en `fcm_ratebook_imports`,
una bandeja privada de `received` con idempotencia por usuario. No toca
`rate_staging`, `rfx_ratebooks` ni tarifas productivas. Promover una recepción
a cualquier flujo comercial requerirá una pantalla y aprobación humana
separadas.

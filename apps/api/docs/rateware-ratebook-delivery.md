# Entrega de RateBook a Rateware

`POST /integration/rateware/ratebooks/:id/deliver` es una acción explícita de
un administrador. Solo acepta RateBooks publicados y reenvía el bearer Kinde
del usuario autenticado; no usa una credencial de Rateware en el navegador.

La entrega calcula primero el paquete completo y su checksum SHA-256. La llave
de idempotencia enlaza la organización, el identificador del RateBook y ese
checksum; por ello un reintento exacto conserva llave y carga, mientras un
cambio de tarifa, base, versión o metadato genera otra huella. La aprobación
`RATEWARE_DELIVERY` también conserva el checksum revisado y la entrega se
bloquea si el paquete cambió después de aprobarse.

FCM conserva `RatewareDelivery` con actor, aprobación, checksum local, checksum
devuelto por Rateware, revisión del receptor, resultado HTTP, error acotado y
recibo remoto. Un acuse cuyo checksum no coincide o que no identifica la
revisión del receptor queda `FAILED`. Reintentar una entrega ya confirmada
devuelve el registro local sin volver a transmitirlo.

## Configuración controlada

Configurar únicamente en el entorno servidor de Freight Cost Model:

```text
RATEWARE_API_URL=https://<supabase-project>.supabase.co/functions/v1/fcm-ratebook-receiver
```

Rateware debe verificar el mismo issuer y audiencia Kinde que Freight Cost
Model para que el usuario administrador sea resuelto en ambos workspaces.
Antes de habilitar el endpoint deben aplicarse las migraciones FCM
`20260820000100_rateware_approval_checksum` y
`20260820000200_rateware_receiver_evidence`, y en Rateware
`20260820000100_fcm_ratebook_receipts`.

El receptor Rateware persiste el paquete completo en `fcm_ratebook_receipts`,
una bandeja privada de `received` con idempotencia por tenant y paquete. No toca
`rate_staging`, `rfx_ratebooks` ni tarifas productivas. Promover una recepción
a cualquier flujo comercial requerirá una pantalla y aprobación humana
separadas.

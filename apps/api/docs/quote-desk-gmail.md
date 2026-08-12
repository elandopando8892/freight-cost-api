# Quote Desk y Gmail

El inicio de sesion con Kinde y la autorizacion de Gmail son flujos distintos.
La conexion Gmail se gestiona en Settings mediante el broker OAuth cifrado de
Rateware; Freight Cost Model no almacena refresh tokens ni credenciales Gmail.

El Quote Desk prepara un snapshot inmutable de destinatario, asunto, HTML,
texto y checksum. El estado `PREPARED` no significa que el correo se envio.
Rateware actualmente no expone un contrato para enviar correos arbitrarios de
Quote Desk, asi que una entrega real requerira un contrato explicito del broker,
su recibo de proveedor y una actualizacion de estado separada.

## Paquete de borrador para Rateware

`GET /integration/rateware/customer-quote-email-drafts/:id` expone un contrato
versionado `fcm.rateware-gmail-draft.v1`. Es estrictamente de lectura:
incluye el contenido congelado, destinatario, plantilla, checksum y actor que
preparó el borrador; declara `READ_ONLY`, `PREPARED` y `NOT_SENT`.

El endpoint no entrega tokens OAuth, no invoca Gmail y no implica que Rateware
acepte o envíe el paquete. Rateware deberá implementar y aprobar por separado
su extremo receptor y su contrato de entrega.

## Bitácora local

`GET /customer-quotes/:id/email-drafts` devuelve los snapshots preparados de
una cotización dentro de la misma organización. La pantalla Quote Desk permite
revisarlos y volver a descargar su paquete Rateware. Esta bitácora no altera el
borrador, no re-renderiza la plantilla ni ejecuta una entrega externa.

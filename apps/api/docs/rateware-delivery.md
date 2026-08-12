# Entrega de RateBook a Rateware

El paquete se obtiene primero mediante `GET /integration/rateware/ratebooks/:id`.
Esa llamada es de solo lectura y permite revisar el contrato antes de cualquier
entrega.

`POST /integration/rateware/ratebooks/:id/deliver` requiere que el RateBook
este publicado y que exista una solicitud `RATEWARE_DELIVERY` aprobada. La
revision de esa solicitud impide que quien la solicita la apruebe; la entrega
guarda la referencia de aprobacion, checksum, idempotency key y recibo externo.

Un recibo `DELIVERED` prueba unicamente que Rateware acepto el paquete bajo el
contrato actual. No prueba que Rateware haya publicado, activado o aplicado las
tarifas: esas acciones siguen bajo su propio flujo y deben verificarse alli.

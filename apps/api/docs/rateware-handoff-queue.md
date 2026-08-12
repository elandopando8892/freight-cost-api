# Cola local de handoff a Rateware

`GET /integration/rateware/quotes` lista únicamente cotizaciones confirmadas
de la organización. Para cada una expone si conserva evidencia elegible para el
contrato `fcm.rateware-handoff.v1`, su checksum y bloqueadores cuando existen.

La pantalla `/integrations/rateware` es una superficie de revisión. El paquete
JSON sigue descargándose individualmente desde la cotización confirmada.

No hay escritura, webhook, sincronización ni creación de RateBook. La cola no
otorga autorización a Rateware para modificar datos del Freight Cost Model.

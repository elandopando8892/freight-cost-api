# Contrato RateBook para Rateware

`GET /integration/rateware/ratebooks/:id` expone exclusivamente un RateBook
publicado perteneciente a la organización autenticada. Devuelve el contrato
versionado `fcm.rateware-ratebook.v1` en modo `READ_ONLY`.

El paquete conserva la vigencia comercial, base tarifaria, versión de
supuestos, nota de publicación y cada tarifa publicada con su origen de
cotización, ruta fuente y FX usado. Las entradas se ordenan de forma
determinista por operación, origen, destino e identificador.

Este endpoint no llama a Rateware, no genera una tarifa en Rateware ni acepta
actualizaciones desde Rateware. La transmisión real, la autenticación entre
sistemas, idempotencia y confirmación de recepción pertenecen al Sprint 17 de
integración y deberán pasar una revisión humana antes de cualquier envío.

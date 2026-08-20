# Contrato RateBook para Rateware

`GET /integration/rateware/ratebooks/:id` expone exclusivamente un RateBook
publicado perteneciente a la organización autenticada. Devuelve el contrato
versionado `fcm.rateware-ratebook.v1` en modo `READ_ONLY`.

El paquete conserva la vigencia comercial, base tarifaria, versión de
supuestos, nota de publicación y cada tarifa publicada con su origen de
cotización, ruta fuente y FX usado. Las entradas se ordenan de forma
determinista por operación, origen, destino e identificador.

Este endpoint no llama a Rateware, no genera una tarifa en Rateware ni acepta
actualizaciones desde Rateware. La transmisión real usa el receptor aislado
`fcm-ratebook-receiver`, requiere aprobación humana vinculada al checksum y
conserva un recibo remoto. La recepción sigue siendo una bandeja privada: no
publica ni activa tarifas dentro de Rateware.

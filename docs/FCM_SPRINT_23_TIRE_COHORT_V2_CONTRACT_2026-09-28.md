# Sprint 23 — contrato aditivo de ciclo de llantas v2

Modelo recomendado: GPT-6 Sol; esfuerzo alto por moneda, tramo, titularidad y compatibilidad. Astra sólo sería necesaria para revisar un rediseño integral del motor multi-moneda.

## Resultado de código

`TireCohortRecordV2Schema` acepta los nueve identificadores canónicos sin reemplazar los dos IDs históricos de v1. Cada observación separa país del tramo, titularidad del costo, tipo de costo directo y moneda nativa (`MXN` o `USD`). El país queda restringido para segmentos unilaterales y D2D con socio; una tarifa de socio no puede presentarse como costo directo de llanta. Tractor, remolque, chasis y camión rígido son activos distintos.

La revisión v2 calcula sólo el costo instalado de una etapa sobre kilómetros observados en su moneda nativa. Su clave de comparación separa segmento, país, moneda, activo, posición, producto y etapa. Una cohorte USD nunca se mezcla con MXN ni se convierte por un FX implícito. Importes incompletos y ciclos abiertos quedan pendientes, no en cero. La elegibilidad de comparación exige evidencia de titularidad, identidad y ajuste exacto de flota, lecturas operativas de instalación/retiro y costo objetivo mediante factura o documento de flota; una referencia pública sola no vuelve completa una cohorte.

## Límite explícito

Es un contrato de investigación sin ruta HTTP, escritura de snapshot, migración, propuesta, publicación ni impacto en CVU/CFU/cotizaciones. V1 y sus registros persistidos siguen intactos. Todos los componentes de un costo instalado v2 deben expresarse en una sola moneda nativa; comprobantes mixtos quedan fuera hasta disponer de un contrato FX verificable. Para usar v2 en la UI operativa harán falta persistencia aislada, agregado estadístico por moneda, revisión económica y un contrato FX con fecha/fuente si se compara con una base en otra moneda. No se capturaron datos reales ni se inventaron costos.

## Validación y rollback

Pruebas sintéticas cubren nueve segmentos, rechazo de IDs históricos en v2, rechazo de costos de socio y tramo equivocado, aislamiento de moneda/etapa, evidencia y ciclos incompletos. Rollback: revertir el archivo v2, sus pruebas y este documento; no hay datos ni esquema de BD que restaurar.

# Sprint 22 — contrato de cohortes COST_TIRES por segmento

Modelo recomendado: GPT-6 Sol; esfuerzo medio por auditoría cruzada de esquemas, moneda y límites de terceros. Astra no es necesario.

## Resultado

El catálogo de bases usa nueve segmentos canónicos. `TireCohortRecordSchema` v1 acepta exactamente cuatro de esos identificadores, dos IDs históricos adicionales y sólo importes `MXN`. Por tanto, el benchmark público TTI en USD/milla no puede incorporarse como una cohorte Intra-US o US Drayage por cambiar una etiqueta. El [registro de contrato](FCM_TIRE_COHORT_SEGMENT_CONTRACT_2026-09-28.json) conserva los nueve estados y la acción específica pendiente; el [wireframe](design/tire-cohort-segment-contract-wireframe.md) los expone sin sugerir calibración.

La prueba de API compara el registro con los esquemas ejecutables de bases y cohortes, incluidos los IDs históricos y la restricción de moneda. La prueba de web comprueba que la advertencia y los nueve detalles sean visibles. No se modificaron esquemas de captura, snapshots, cálculos, Auth, bases, producción ni cotizaciones.

## Límite y siguiente implementación

`ID coincide` sólo significa que el nombre pasa el validador actual: sigue faltando evidencia de costo instalado, ciclo observado, configuración, posición y titularidad. Para abrir ciclos de EE. UU. se requiere un contrato versionado con importes USD y linaje FX cuando corresponda; para terceros, separar tarifa contractual de costo de llantas propio. Los dos IDs históricos requieren re-clasificación revisada, nunca un reemplazo textual silencioso.

## Rollback

Revertir este registro, su panel y pruebas retira sólo la advertencia/documentación; no existe migración ni datos que restaurar. La publicación de parámetros sigue separada y bloqueada.

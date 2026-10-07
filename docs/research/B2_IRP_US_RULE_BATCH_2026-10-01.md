# B2 · lote de reglas IRP US, 1 octubre 2026

## Entrega de negocio

Antes: componentes Texas, Arkansas y Oklahoma y matriz de 59 comparadores. Ahora: **13 reglas adicionales integradas**, 16 jurisdicciones con componentes subyacentes sustentados, 43 sin integrar. Son componentes analíticos fechados, no 16 tarifas completas/vigentes. Continúan cero adopciones, diez partidas de presupuesto incompletas y CFU/CVU/precios null. No se elige registrante real ni se pide contabilidad privada.

El lote cubre AL, AZ, CT, DE, GA, IL, IN, IA, KS, LA, MO, OH y TN. Georgia conserva diferencia hire/private y AAVT; Indiana separa CVET, Kansas CMV y Missouri Schedule II. Arizona conserva condición diésel/modelo desde 1979. Ceros de componentes adicionales significan que no se adopta otro componente, no que otros cargos sean cero. Todos mantienen `completeJurisdictionFee:false`, `currentFeeConfirmed:false`, `selected:false` y `appliedToPilot:false`.

Kentucky queda excluido: regla de ejemplo con valor incluye USD 30.01 frente a USD 24.41 reportados por Texas (placa solamente). Se conserva además un rótulo de factor de año contradictorio. No se traslada el valor/fecha de compra del ejemplo al Ryder. Florida contiene un ejemplo genérico sin etiqueta Test 2; no se supone su equivalencia de operación. California mantiene su dependencia de valor pendiente.

## Reutilización, alcance y aceptación

Se revisaron historial Git y componentes existentes; no se añadieron infraestructura, dependencias, parser permanente ni motor alterno. El archivo oficial conservado y comprobado por SHA-256 sigue siendo fuente de verdad documental. La proyección vive en el consolidado existente; no se modifica el presupuesto ni se adopta una cuota del ejercicio como tarifa del piloto.

Comparación previa reutilizada del [expediente consolidado](B2_IRP_CONSOLIDATED_RULES_2026-10-01.md): preferir reglas subyacentes frente a 56 búsquedas individuales; rechazar reconstrucción por factura redondeada ×59. Las cuotas comunes se reutilizan; la integración diferencial sigue siendo reparto coherente de dos tractores y una caja. Sólo backend documental local, sin cambio de flujo/pantalla: no requiere un wireframe nuevo. La UI futura conserva manual MARKSMAN y wireframes.

Fuente: [reglas oficiales IRP 2026](https://www.irponline.org/resource/collection/A35CA2A0-300D-4785-B21C-329509828DD9/2026_Fee_Test_Guidelines__06_08_26.xlsx), publicación 8 junio, referencia enero. Archivo original `sources/IRP_FEE_TEST_GUIDELINES_2026_REVIEW_20261001.xlsx`, SHA-256 `5db191bc435844030366c5edd0b44401b7f832f73edc67ef587b30475b3f9df1`. Localizadores y celdas en `B2_IRP_US_RULE_BATCH_2026-10-01.json` (pin 20, SHA-256 `3dd09afe78ca8e5eff021d43d7902b193289e3cfdf483c2b896175c4c09b0dfe`). No se alteró el JSON anterior. Consulta web de vigencia del índice no produjo evidencia utilizable; no se insistió ni se certificó vigencia actual. Kansas cita cambio 2021 y Ohio tabla 2018: publicar el ejercicio en 2026 no cambia esas fechas.

Criterios de cierre de este corte: cotejar reglas y relaciones de hojas originales, conservar componentes/condiciones, integrarlas sin adoptar costo y pasar pruebas afectadas. No incluye calibrar las 59 jurisdicciones ni cerrar B2/MVP. Próximo dentro del mismo entregable: resolver por grupos componentes USD restantes, dependencias de valor y moneda canadiense; después vigencia/perfil/cargos y resto del presupuesto fijo/exposición/ciclo/variables. No abrir 43 sprints ni más validadores genéricos.

## Registro visible de ejecución y consumo

Responsable único de escritura/integración/verificación: Codex. Inicio del corte: 2026-10-01 17:24:11, America/Mexico_City. Presupuesto anunciado: doce minutos, una consulta web de vigencia y una reparación de pruebas como máximo; parada tras cotejo, integración y notas. No se llamó a Claude ni se creó un plan auxiliar que simulara ejecución.

| Actividad | Proveedor/modelo recomendado | Esfuerzo | Ejecución y criterio |
|---|---|---|---|
| Selección y lectura de reglas | OpenAI GPT-6.1 Sol | high | Codex actual; 13 reglas, componente/condición/celda explícitos |
| Integración y prueba | OpenAI GPT-6.1 Sol | medium | Codex actual; consolidado existente y pruebas deterministas |
| Revisión Claude | No asignada | No aplicable | Sin pregunta independiente que justificara repetir el cotejo; cuota actual desconocida |

Sol 6.1/esfuerzos son recomendación basada en catálogo desktop, no evidencia de cambio o ejecución de ese ID concreto. El principal no se cambió; esta superficie no expone aquí un control del selector ni tokens de la actividad. El registro CLI/auth del expediente anterior no se presenta como acceso vigente a ningún modelo. No hubo una exigencia nueva que justificara invocar Fable; no se presume inclusión, cuota o condiciones actuales. La skill `claude-review` y guía del kit se inspeccionaron, sin instalar, modificar o ejecutar puente/auxiliar.

Cuota Codex: lectura automática soportada `get_usage_limits`, tomada entre 17:24:11 y 17:28:31 de hoy: ventana semanal 10,080 minutos, **95% utilizado**, reposición indicada 2026-10-06 13:08:00 -06:00; ventana secundaria no disponible. No se reproduce identidad ni balance de créditos, ni se equipara su unidad a dólares. La lectura corresponde a la cuenta compartida, no a este sprint; uso concurrente puede cambiarla. No se extrapolan tokens ni consumo futuro. Reserva: no cuantificable por actividad; limitar este corte, sin consultas auxiliares/duplicadas, conserva margen sin prometer porcentaje. Claude Max x5 es declaración del usuario; cuota cinco horas/semanal/Fable, reposiciones y uso extra **desconocidos**, sin observación manual reciente ni lector automático soportado utilizado. No se consulta credencial, sesión privada ni facturación.

Beneficio esperado frente a doble revisión: menos contexto repetido y latencia, no ahorro numérico acreditado. Consumo observado de esta actividad, tokens/list-price/cargos reales y cuota consumida: no disponibles. La consulta web fallida queda registrada con uso desconocido, no cero. No llamadas facturables de aplicación, Claude/API, nuevos proveedores o activación de cargos. Al cierre no hubo señales de razonamiento insuficiente ni reparación; continuar con capacidad suficiente para cotejos acotados y reevaluar sólo ante nuevas dependencias o evidencia.

## Pruebas, límites y recuperación

- **129/129**: consolidado 78, registro 21 y presupuesto 30. Trece casos por jurisdicción, componentes diferenciados, perfil/fechas, conflictos/exclusiones y hash del nuevo pin. Se mantienen pruebas de manipulación de los originales XLSX.
- Typecheck estricto PASS; cero reparaciones. Sin build general repetido.
- Lectura independiente ZIP/XML: trece relaciones nombre→hoja y diecisiete celdas de base/componentes coincidentes, cero diferencias; sin ejecutar fórmulas/macros.
- CLI salida 2 esperada por economía incompleta: veinte pins, dieciséis componentes conocidos, cuarenta y tres pendientes, cero partidas completas/cero adopciones y seis salidas null.
- Evidencia documental pública y aritmética local; sin sesión/persistencia autenticada, despliegue, operación o aceptación productiva.

Workspace físico D:, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, verificados antes de editar. Cambios ajenos preservados. Rollback por hunks: quitar pin/referencias `irpUsBatch`, unión de reglas/proyección y pruebas del lote; reponer conjunto AR/OK y expectativa de 56 pendientes. Conservar primero dossier/JSON como evidencia. No revertir archivos completos: consolidado/tests/notas incluyen entregas anteriores. No hay rollback externo ni archivos eliminados; fuentes originales intactas.

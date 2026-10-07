# B1 · conciliación de rubros públicos contra CFU/CVU

Fecha: 29 sep 2026 · Piloto: caja seca D2D MX→EE. UU., intercambio entre líneas · Rama `codex/cost-tires-release-s14` · HEAD revisado `4f5fc2de0c3d178dace917231e1092040dec21fd`.

## Resultado

Se descargó y extrajo íntegramente la versión pública de la publicación oficial IMT PT881 (2025), desde el enlace oficial sin anexo GeoPDF interactivo. Copia temporal inspeccionada: 2,122,338 bytes; SHA-256 `816728964103158F0A99F44C41BBE5D2BB7240C33E35651FCBD90C0B391412F4`. Su vehículo articulado T3-S2 está descrito como tractocamión INTERNATIONAL 9200i de tres ejes con caja de aluminio de 40 pies; T3-S3 también está disponible. La publicación detalla insumos/consumos y un costo económico de vehículo-km para planeación vial, incluyendo combustible, lubricantes, llantas, operador, mano de obra de mantenimiento, refacciones, depreciación, interés real e indirectos.

El resultado **no es el costo de un transportista tercero ni una tarifa de compra**. El modelo usa unidades representativas, valores e insumos nacionales de 2025, define el costo base en carretera recta/plana con IRI 2 e IS 4.3, y aplica factores por geometría y rugosidad. Excluye impuestos/derechos por ser transferencias desde su perspectiva económica nacional. No modela la contabilidad, utilización observada ni contrato de la línea que cubriría el tramo.

Decisión: PT881 se incorpora como **contraste estructural y de magnitud por vehículo/ruta en México**; no sustituye entradas, no llena parámetros, y ningún importe se ha copiado al motor o a una base. ATRI queda como control agregado independiente para EE. UU.; su cifra sin combustible no es CFU y no se suma a CVU.

## Puente rubro → fórmula

El adaptador vigente `apps/api/src/modules/engine/benchmark-leg.ts` calcula CFU doméstico como el máximo entre asignación por distancia y por tiempo, y CVU como combustible + mantenimiento + llantas + operador + peajes. Usa además dos rendimientos distintos (cargado/vacío), un fijo mensual de flota y exposición productiva mensual. El fijo mensual trae capital/depreciación y financiamiento, seguro, nómina administrativa con carga social, gastos corporativos y capital de trabajo. El importe fijo asignado no se suma por distancia y por tiempo: se usa el mayor.

| Rubro observado en PT881 | Puente con FCM | Estado de comparabilidad | Conclusión de uso |
| --- | --- | --- | --- |
| Combustible: litros por 1,000 veh-km y costo unitario por litro | CVU · combustible; el motor calcula por km cargado/vacío y precio de diésel | **Parcial**: misma familia/unidades convertibles; T3-S2 es representativo, su consumo no separa loaded/empty ni equivale a la cohorte de una línea | Contraste y posible chequeo físico sólo después de alinear equipo, carga, ruta, fecha y tratamiento de precio/impuestos. No reemplaza rendimientos del carrier. |
| Lubricantes: litros por 1,000 veh-km y precio unitario | No hay término separado en el CVU actual; podría estar cubierto por mantenimiento | **No verificable**: el contrato FCM no define si mantenimiento incluye lubricantes y el costo PT los identifica por separado | No adicionar PT881 a mantenimiento ni crear un costo aparte antes de fijar frontera del rubro y evitar doble conteo. |
| Llantas: equivalentes nuevos consumidos, llanta nueva y renovado | CVU · `tiresUsdPerKm` | **Parcial**: PT881 modela equivalentes nuevos y costo unitario; no representa necesariamente cohorte, posición, ciclo/carcasa o política de renovado de la flota | Contraste técnico; no calibración por precio/ciclo observado de un tercero. |
| Tiempo de operador (horas/1,000 veh-km) y valor horario | CVU · `driverUsdPerKm` | **Parcial**: existe puente dimensional si se dispone de costo horario y método de pago/beneficios comparable; la publicación no separa el costo laboral del transportista XBF | Validar horas de conducción/servicio, salarios, cargas y millas vacías por cohorte antes de derivar una tasa. |
| Mano de obra de mantenimiento (horas/1,000 veh-km) y tarifa horaria | CVU · mantenimiento/km | **Parcial**: insumo del modelo técnico, distinto de factura/historial del carrier | Contrastar sólo con una definición FCM de si el rate incluye labor. |
| Refacciones (coeficientes del modelo y costo resultante) | CVU · mantenimiento/km | **Parcial**: componente mecánico compatible en categoría, no equivale a gasto comprobado de una línea | No sumarlo a mantenimiento si la tasa FCM ya incorpora partes; requiere misma flota, edad, ciclo y alcance. |
| Precio del vehículo nuevo, depreciación por veh-km e interés | CFU · capital/depreciación y FINANCE/COST_CAPITAL | **Parcial**: PT881 calcula depreciación/interés dentro de costo por vehículo-km; FCM arma costo fijo mensual y luego lo asigna por km o días productivos | No duplicar costo de activo al comparar costo total. La tasa IMT se define real (interés bancario menos inflación), no es directamente la tasa nominal ni el financiamiento del carrier. |
| Costos indirectos por veh-km, sin apertura equivalente a gasto corporativo | CFU · COST_COMPANY/GENERAL_BASE y overhead | **No verificable**: rótulo agregado no prueba si incluye nómina administrativa, patio, seguros, sistemas, cargas, ni qué parte queda dentro | Únicamente contraste total. No convertir a cuentas mensuales ni sumar con el fijo detallado. |
| Seguro de unidad/mercancía | CFU · COST_INSURANCE | **No cubierto de forma identificable** en la ficha de costo base consultada | Se mantiene faltante; obtener evidencia pública específica de primas/cobertura o marcar falta de cobertura. |
| Peajes por ruta | CVU · tolls por tramo | **No cubierto** por el costo base de vehículo-km de PT881 | FCM lo recibe aparte del viaje; usar cálculo/observación de ruta, no inferirlo del IMT. |
| Exposición productiva (km y días por mes), tamaño real y ciclo vacío | Denominadores CFU y rendimientos loaded/empty | **No cubierto** como dato de la flota/carrier objetivo | La sensibilidad vial y TDPA del ejemplo IMT no son utilización mensual de una línea. Mantener faltante. |
| Cruce, intercambio, espera de patio, riesgo contractual, margen carrier/XBF y perfil hazmat/reefer/flatbed | Compositor D2D o alcance especial | **Fuera del alcance del resultado base PT881** | No inferirlos ni anexar el promedio por km a la compra D2D. |

### Implicación para el método

PT881 comparte varias familias con CVU/CFU, pero agrega combustibles, consumos, desgaste y depreciación en un **costo económico por vehículo-km**. El FCM actual requiere tasas del carrier desagregadas y denominadores de flota; para usar el total PT881 se tendría que crear una salida distinta, nombrada “referencia pública de costo técnico de vehículo/ruta”, no una entrada sumable al costeo del tercero. El desglose de PT881 es útil como verificación externa de que el inventario del motor debe contemplar combustible, lubricantes, consumo de llanta, tiempo de operador, mano de obra, partes, depreciación, interés e indirectos; no prueba que todos esos componentes estén bien calculados para el segmento objetivo.

Para EE. UU., el comunicado ATRI 2026 ofrece total por milla y total excluyendo combustible, y publica variaciones de tolls, reparación/mantenimiento, beneficios del conductor y llantas. El formulario público detalla fronteras valiosas para R&M (incluye mano de obra, excluye llantas/tows), llantas, fuel, truck insurance, truck/trailer lease/purchase, peajes, permisos y driver pay/benefits; también captura cost-bearing mileage, MPG, deadhead %, equipo, tamaño/peso de flota, dwell, breakdowns y geografía/segmentos. Pero ATRI declara que las respuestas se mantienen confidenciales y publica sólo resultados agregados no identificables; la tabla abierta consultada no da una apertura completa de valores por segmento que se concilie con el corredor. El total sin combustible solapa varias partidas fijas y variables de FCM: no es CFU y no se debe restar o sumar por piezas de fuentes/cohortes distintas.

FMCSA describe que su programa F&OS recopila anualmente estados financieros y datos de toneladas/millas/empleados/equipo de carriers sujetos a reporte; los informes de transportistas de propiedad son normalmente públicos, pero aplica a Class I/II (umbral de ingresos operativos ajustados de USD 3 millones) y se puede solicitar confidencialidad. Form M tiene líneas anuales separadas para combustible+lubes, mantenimiento externo, piezas, llantas, seguro, salarios/beneficios, depreciación, impuestos/licencias/peajes, equipment rentals y purchased transportation/interlining. En contra: los importes del carrier pueden consolidar afiliadas, no están desglosados por tractor/tramo/milla, varias líneas mezclan productos (seguro incluye claims, tolls junto con taxes/licenses, depreciación de edificios/otros bienes) y 1099 se reporta dentro de equipment rentals. La página revisada provee formularios y normas, pero no una descarga pública estructurada de registros actuales: F&OS queda como vía investigable por carrier si se hallan declaraciones públicas, no como benchmark representativo o tasa por milla demostrada.

Detalle de ambos esquemas, clasificación y límites de disponibilidad en [B1 · factibilidad de evidencia pública estadounidense](C1_B1_US_PUBLIC_DATA_FEASIBILITY_2026-09-29.md).

## Siguiente paso de B1

1. Definir la matriz de evidencia D2D por corredor, enlazando ruta/peajes y precios públicos fechados con cada frontera de costo del carrier.
2. Dejar vacíos los costos que necesiten tasa observada del operador y no estén sustentados; no derivarlos desde buckets consolidados SEC/FMCSA/ATRI.
3. Emitir decisión B1/E1 de suficiencia sólo cuando la misma frontera de costo, unidad, fecha, equipo y exposición pueda conciliarse para ambos tramos. IMT PT881, ATRI, FMCSA Form M y SEC 10-K permanecen como controles de distinto alcance, no como inputs sumables. La muestra SEC y sus límites están en [factibilidad de filings SEC](C1_B1_SEC_CARRIER_FILING_FEASIBILITY_2026-09-29.md).

Sin cambios de código, parámetros, bases, DB, Auth, infraestructura, usuarios o despliegue. No se consultaron datos internos ni se ejecutaron servicios de IA dentro del producto. El PDF oficial se descargó a `%TEMP%`; el artefacto permanente es este cruce metodológico.

## Fuentes primarias

- [IMT PT881 (PDF oficial íntegro)](https://imt.mx/archivos/Publicaciones/PublicacionTecnica/pt881.pdf)
- [Resumen oficial PT881](https://www.imt.mx/resumen-publicaciones.html?IdPublicacion=1334&IdTipo=Publicaci%C3%B3n+t%C3%A9cnica+No.881&LbPalabra=0)
- [Síntesis IMT en Notas 220](https://imt.mx/resumen-boletines.html?IdArticulo=657&IdBoletin=221)
- [ATRI 2026: resultados de costos 2025](https://truckingresearch.org/2026/07/new-atri-report-details-accelerating-costs-and-low-profitability-despite-cuts/)
- [Formulario público de recolección ATRI 2026](https://truckingresearch.org/wp-content/uploads/2026/02/2026-Ops-Cost-Motor-Carrier-Form.pdf)
- [FMCSA · Financial and Operating Statistics](https://www.fmcsa.dot.gov/mission/file-carrier-financial-and-operating-statistics)

## Rollback documental

Retirar este documento y su referencia en `docs/SPRINT_STATUS.md`; no hay cambio ejecutable ni dato persistido que revertir.

Modelo sugerido: GPT-6 Luna · esfuerzo alto para extracción tabular; GPT-6 Astra · esfuerzo alto para dictaminar inclusiones, fronteras y no doble conteo.

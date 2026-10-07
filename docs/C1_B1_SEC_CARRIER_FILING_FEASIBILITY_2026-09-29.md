# B1 · factibilidad de filings SEC para el tramo US

Fecha: 29 sep 2026 · Muestra exploratoria: Forms 10-K FY2025 de Werner Enterprises y J.B. Hunt · Rama `codex/cost-tires-release-s14` · HEAD revisado `4f5fc2de0c3d178dace917231e1092040dec21fd`.

## Pregunta

¿Los reportes abiertos de carriers públicos ofrecen lo suficiente para una referencia de costos de tractor-remolque por milla que se pueda reconciliar con el FCM y el piloto MX→US?

## Resultado

**Hay comparadores parciales, no una calibración de carrier ni de compra por corredor.** En la muestra, los 10-K separan varias cuentas financieras y exponen estadísticas de flota/millaje útiles para entender utilización. Pero esos dos grupos de datos no se conectan con consistencia a la misma frontera de costo y segmento. Tampoco representan de modo probado el carrier/contrato que se contrataría en el piloto.

Werner 2025 es metodológicamente informativo: publica para su operación One-Way Truckload indicadores como porcentaje de millas vacías, tractoras promedio, longitud cargada de viaje y cambios de millas/costo; sin embargo, los gastos por cuenta se publican a nivel de segmentos/consolidado y no se abren por costo por milla. Además, el mix de contractors desplaza driver, combustible, depreciación, mantenimiento y taxes hacia “rent and purchased transportation”; ese bucket no es equivalente a costo intrínseco del vehículo ni al buy rate de un subcontractor. J.B. Hunt también ofrece cuentas agregadas, pero sus segmentos mezclan truckload, intermodal y logística, y su filing advierte que una parte del combustible está dentro de pagos a terceros clasificados como purchased transportation.

Decisión: marcar SEC 10-K como **CONTRASTE de taxonomía, mix, utilización y dinámica de carrier**, no como input de CFU/CVU ni tarifa de tercero. Mantener cero adopciones y no derivar costos unitarios con denominadores no vinculados.

## Lectura por fuente

| Fuente / capa | Evidencia pública localizada | Relación con FCM | Brecha que impide calibrar |
| --- | --- | --- | --- |
| Werner Enterprises, Form 10-K FY2025, segment TTS / One-Way Truckload | Promedia tractores en servicio, porcentaje de millas vacías, viaje cargado medio, millas/tractor/semana (cambio) e ingreso por milla (cambio). Expone gastos por categoría y porcentajes de ingresos en estados consolidados/por segmento. | `emptyKm/loadedKm`, `productiveKmPerMonth` y contexto para fuel surcharge/revenue; cuentas de salarios, combustible, suministros/mantenimiento, seguros/claims, depreciación, taxes/licencias, rent/purchased transportation. | No asigna las cuentas de gasto a millas por separado, activos y cohortes concretos, ni al tramo TX de un corredor; parte de TTS es Dedicated y otra One-Way. Los datos operativos no proporcionan un costo por concepto para el mismo subsegmento. |
| Werner: propiedad vs independent contractor | El 10-K informa que los contractors aportan tractor/driver y absorben sus gastos; aumento de contractor-miles cambia costos de wages, fuel, depreciation, supplies/maintenance y taxes hacia rent/purchased transportation. | Prueba que el límite de propiedad afecta dónde viven las partidas en CFU/CVU y que debe modelarse con alcance de costo consistente. | El total de “rent/purchased transportation” también incluye third-party capacity del negocio logístico y otras partidas; no es rate de compra/milla de un contractor en un corredor dado. |
| J.B. Hunt Transport Services, Form 10-K FY2025 | Estado consolidado enumera rents/purchased transportation, salarios/beneficios, depreciación, combustible+fuel taxes, operating supplies, insurance/claims, G&A, taxes/licenses y utilities; describe cinco segmentos (incluyendo JBI intermodal, DCS dedicated contract services, JBT truckload y ICS brokerage). | Buen control de qué categorías maneja un operador multimodal y de solapes (fuel surcharge, third-party carriers, rail/dray). | No se encontró en las tablas revisadas millaje total que permita convertir las partidas en costo/milla por clase de activo; categorías y segmentos mezclan propietarios, terceros y modos. En el filing el fuel de railroad/dray/third parties puede aparecer como purchased transportation, no fuel. |

### Advertencia de comparabilidad (Werner)

El filing reporta para One-Way Truckload **15.83% de millas vacías** promedio en 2025 y longitud cargada de viaje promedio de 572 millas, además de 2,573 tractores promedio en servicio. Son métricas de una gran flota estadounidense y su red/mezcla, no medidas de la línea que serviría Laredo o de un carrier de intercambio MX→US. Sirven para demostrar que el driver de vacío debe declararse y que el viaje cargado no equivale a millas productivas totales; **no se copia ese porcentaje al supuesto FCM ni se aplica a la tarifa**.

Werner también cuenta que, para 2025, tenía una mezcla con contractors y que las millas independientes representaban 6.2% de sus millas TTS. Esto evidencia un problema estructural: comparar las cuentas de una flota propia con el costo de un carrier tercero puede omitir o duplicar componentes. No se normalizó ni calculó una tasa a partir del 10-K.

## Decisión de método

Los filings públicos no rescatan el requisito de costo USD/milla por carrier/corredor con los documentos seleccionados. Sí pueden respaldar el inventario de supuestos de operación:

- rendimiento/diesel y fuel-surcharge recovery deben separar gasto y recuperación, considerar vacíos/out-of-route e idle;
- el denominador de millaje ha de estar vinculado al mismo alcance/propiedad que cada costo;
- driver, truck, trailer y costo de contractor pueden venir en paquetes económicos diferentes;
- purchased transportation es un bucket de compra multimodal/segmentada, no la compra contractual de la línea por ruta;
- costo/claims de seguro puede incluir auto-retención, litigio y siniestros que no representan prima recurrente.

Esto complementa el [inventario y cruce US de ATRI/Form M](C1_B1_US_PUBLIC_DATA_FEASIBILITY_2026-09-29.md); no cambia el dictamen `NO APTO CON LO REVISADO` para adoptar costos productivos del transportista. El detalle de la decisión México↔EE. UU. y del motor está en [comparación de método](C1_B1_FIXED_COST_METHOD_COMPARISON_2026-09-29.md) y [crosswalk PT881→CFU/CVU](C1_B1_PUBLIC_METHOD_CROSSWALK_2026-09-29.md).

## Alcance y rollback

Muestra exploratoria de dos filings SEC 10-K FY2025 públicamente accesibles (no encuesta de todos los carriers ni búsqueda exhaustiva de cada operador del corredor). No hubo solicitud, login, captura de datos de contacto, descarga masiva, cambio de código/bases/DB/Auth/usuarios/infraestructura, ni despliegue. No se copiaron importes ni porcentajes a parámetros. Rollback: retirar este documento y sus referencias; no tiene dependencias ejecutables.

## Fuentes primarias

- [Werner Enterprises · Form 10-K FY2025](https://www.sec.gov/Archives/edgar/data/793074/000079307426000071/wern-20251231.htm)
- [J.B. Hunt Transport Services · Form 10-K FY2025](https://www.sec.gov/Archives/edgar/data/728535/000143774926005294/jbht20251231_10k.htm)
- [Schneider National · Form 10-K FY2025](https://www.sec.gov/Archives/edgar/data/1692063/000169206326000013/sndr-20251231.htm) (revisado como comparador secundario de fuel/surcharge y alcance multimodal; no es carrier match del piloto).

Siguiente actividad: el [puente de evidencia D2D por tramo](C1_B1_D2D_ROUTE_EVIDENCE_BRIDGE_2026-09-29.md) ya documenta el contrato de datos para ruta/peajes, combustible, intercambio y separación costo técnico/compra/venta. Para convertirlo en ficha cuantificada faltan endpoints y clase de unidad autorizados, verificación vigente de plazas en la ruta, snapshots actuales de CNE/EIA y datos comparables de consumo/costo de cada operador. Mantener buy rate y costo productivo como faltantes si no aparecen registros públicos comparables; no publicar total D2D todavía.

Modelo recomendado: GPT-6 Luna · esfuerzo medio para extracción de disclosures comparables; GPT-6 Astra · esfuerzo alto al fijar el puente de supuestos y decisión de suficiencia transfronteriza.

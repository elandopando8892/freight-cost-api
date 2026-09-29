# Parámetros canónicos → tasas → costo por tramo

Corte local iniciado desde `c16b35af877c9557e0d516333517aa54f86d1e68`, rama `codex/cost-tires-release-s14`, worktree en D: limpio. Modelo recomendado: Astra, esfuerzo alto. Sin cambio visual ni despliegue.

Se implementaron `benchmarkRateRequirements`, `deriveBenchmarkRates` y `calculateBenchmarkFromParameters` en `benchmark-rates.ts`. El conversor recibe parámetros con key canónica, valor, unidad original del catálogo, derivación y referencias. Enumera las dependencias efectivamente leídas por cada fórmula y devuelve las claves faltantes. No lee `defaultValue` del catálogo ni permite al motor recuperar un valor ausente mediante fallback.

## Transformaciones implementadas

| Tasa | Dependencias y tratamiento |
| --- | --- |
| Costo fijo mensual de flota, USD | Fórmula existente `deriveMonthlyFixedCost`: capital/depreciación/financiamiento, seguros, nómina administrativa con carga social, empresa y capital de trabajo del país. Incluye tracto/remolque; excluye dolly y costo fijo transfronterizo |
| km productivos por mes de flota | Operadores × km promedio por operador |
| días-vehículo productivos por mes | Tamaño de flota × índice de operatividad × periodo de operación |
| Mantenimiento USD/km | Aritmética existente de intervalos y reservas, aislando las llantas mediante exclusión interna explícita; no se introducen cifras económicas para completar datos |
| Llantas USD/km | Suma por posición de cantidad × PU de esa misma posición / vida km; no utiliza la permutación histórica de precios del workbook |
| Operador USD/km | Tarifa Operador MX o US (USD/milla) / 1.60934 |
| Diésel USD/litro | MX: Diesel MX (MXN/L) / Tipo de Cambio (MXN/USD). US: Diesel US Border (USD/L), cuya comparabilidad geográfica debe revisar el benchmark |
| Rendimientos | Rendimiento cargado/vacío, en km/litro explícitos |

El alcance del transportista modelado debe ser consistente: numeradores, flota y denominadores corresponden a la misma cohorte. Cantidades de llantas nuevas/recapadas deben representar asignaciones físicas sin superposición; este conversor aún no acredita esa asignación ni la elegibilidad de una cohorte. Tampoco añade factores de operador, riesgos, cruce o margen. Las condiciones de cobro/pago en FINANCE son del transportista modelado, no automáticamente de XBF.

## Trazabilidad y bloqueos

Las fuentes conservan país, equipo, fecha, vigencia, localización y limitaciones. La salida contiene por tasa las keys consumidas (`requirements`), referencias y el input original. El compositor conserva todo el resultado de conversión como `parameterLineage` junto al viaje y costo del tramo: no se pierde la conexión parámetros → tasas → CFU/CVU.

Se rechazan claves desconocidas/duplicadas, unidades no coincidentes, fuentes faltantes, país o vigencia incompatibles, denominadores cero, operatividad/LTV fuera de fracción y rescate superior al valor de activos. Un input faltante produce `INCOMPLETE`, sin tasas; un dato faltante del viaje produce un tramo incompleto, sin costo.

Las conversiones monetarias implementadas son las que se indican arriba. Capital/nómina/empresa/llantas deben suministrarse en las unidades canónicas, con su normalización documentada; no hay conversión automática genérica desde otra moneda. Usar unidades del catálogo no verifica por sí solo la transformación de la fuente.

## Resultado de validación y límites

26/26 pruebas focalizadas (12 del conversor y 14 del tramo) y typecheck API PASS. Cubren integración MX/US, FX y milla→km comprobados numéricamente, dependencia correcta de PU de llanta, independencia de mantenimiento, ausencia de defaults, fuentes inválidas y conservación del linaje en el resultado compuesto. Los valores de catálogo sólo aparecen en fixtures de prueba, identificados como sintéticos; no son evidencia de calibración.

La salida conserva `DOCUMENTED_UNVERIFIED` y `calibrated=false`. No se adoptaron valores de benchmark, investigaron nuevas fuentes ni activaron bases. Este código no tiene endpoint ni persistencia y no se desplegó; el Preview existente permanece en su SHA anterior. Rollback: revertir el commit de estos dos archivos de código/pruebas y la documentación, sin cambios de datos.

Siguiente incremento: composición de tramos MX/US con cruce/intercambio explícitos y control de doble conteo. Luego integrar la carga de evidencias revisadas y su revisión de coherencia por cohorte antes de habilitar una base gobernada. Este conversor no cierra por sí solo la calibración de las 13 secciones ni el D2D completo.

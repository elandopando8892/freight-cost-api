# B1 · factibilidad de evidencia pública estadounidense (ATRI y FMCSA)

Fecha: 29 sep 2026 · Piloto: caja seca D2D MX→EE. UU., intercambio entre líneas · Rama `codex/cost-tires-release-s14` · HEAD revisado `4f5fc2de0c3d178dace917231e1092040dec21fd`.

## Pregunta y decisión

¿Qué fuente pública permite respaldar para el tramo estadounidense las categorías del costo tercero con el denominador, cohorte y desagregación que pide FCM?

**Resultado:** ATRI 2026 tiene la mejor definición pública revisada de qué medir para una combinación tractor-remolque y separa varias partidas compatibles con FCM. Pero el formulario es una **encuesta de recolección**, no evidencia de valores poblacionales abiertos; ATRI indica que las respuestas son confidenciales y que el informe publica resultados agregados no identificables. El informe completo vigente se ofrece mediante una página que solicita datos de contacto. No se envió formulario ni se capturaron datos de contacto.

FMCSA Form M ofrece una segunda ruta potencial: sus instrucciones definen importes anuales reportados por carrier y algunas categorías coinciden con FCM; además la propia FMCSA describe como generalmente públicos los reportes F&OS, salvo confidencialidad/exenciones. Sin embargo, la página pública revisada muestra el formulario/reglas y no expone una tabla o descarga de observaciones por empresa; Form M carece de millas/costo por equipo o viaje para normalizar las partidas. Así, ni ATRI ni FMCSA respaldan hoy una tarifa USD/milla del carrier del piloto. B1 continúa **abierto**, cero adopciones.

## ATRI 2026: esquema de observación, no dataset abierto

El formulario oficial Motor Carrier solicita datos de 2025 a carriers for-hire, sólo tractor-trailer (no straight trucks). Define las partidas principales como costo por milla usando el total de **millas que soportan costo**; aparte pregunta el millaje total por separado entre drivers de empresa y owner-operators/independent contractors. El formulario también pregunta tipo de operación/commodities, regiones de millaje, perfil de tractor/remolque, años/millas de ciclo de reemplazo, MPG, porcentaje de deadhead, dwell time por parada, averías por milla, utilización HOS y reparación interna vs. externa.

| Captura/pregunta ATRI | Relación con FCM | Qué aporta / qué no prueba |
| --- | --- | --- |
| Repair & Maintenance por milla; incluye labor y roadside repairs; excluye llantas y tows | CVU · COST_MAINT | Frontera útil para separar llantas; no revela en el formulario el costo/milla medido por los encuestados ni la mezcla/modelo que recibió. |
| Tires por milla; compra, mantenimiento, renovado y reemplazo | CVU · COST_TIRES | Frontera clara, pero no ciclo/posición ni vida por segmento en el campo agregado. |
| Fuel por milla y fuel economy en MPG; combustible no incluye ingresos de fuel surcharge | CVU · combustible/rendimiento | Contrasta combustible y MPG a nivel encuesta; no revela compras por jurisdicción/gateway, condición loaded/empty ni la regla de abastecimiento del carrier. |
| Truck insurance premiums por milla; liability/cargo/excess, excluye workers compensation, physical damage, verdicts/settlements | CFU · COST_INSURANCE; LABOR/beneficios aparte | Cobertura definida, no sustituye prima/póliza ni distingue automáticamente lo que el contrato de la línea cubre. |
| Truck lease/purchase y trailer lease/purchase por milla; incluyen pagos, interés y fees; trailer excluye depreciación | CFU · capital/FINANCE | Útil para evitar doble contabilización si se comparan cifras; no es idéntico a depreciación + deuda de la estructura detallada FCM. |
| Tolls por milla (gasto anual / millaje anual) | CVU · peajes por viaje | Denominador de flota, no ruta específica; no sustituye ruta/gateway y plazas recorridas. |
| Permits por milla, incluyendo oversize/overweight y HazMat; excluye registro/CDL | RISK/compliance/operación | No hay término explícito equivalente en el CVU D2D vigente; no incorporarlo silenciosamente como toll/overhead. |
| Driver pay y benefits separados; base pay sin impuestos payroll, beneficios incluyen aportes médicos/per diem/beneficios; bonuses/incentives separados | CVU · driver; CFU · COST_PAYROLL/LABOR | Esquema preciso de fronteras salariales; pide valor promedio por milla u hora, no prueba un driver rate aplicable al corredor MX→US. |
| Cost-bearing mileage, company vs owner-operator miles, deadhead %, MPG, equipo y longitud/región de viajes | Exposición, utilización, empty/loaded, segmento | Datos metodológicos de contexto valiosos, pero el informe público no entrega registros identificados de la línea del piloto ni cruce transfronterizo. |
| In-cab technology, crash out-of-pocket, litigation, breakdowns, dwell | COST_COMPANY, RISK, productividad/servicio | Información adicional de eficiencia/riesgo; FCM debe definir si forma parte de costo productivo y evitar añadirla sin frontera/tasa explícita. |

La solicitud electrónica del informe ATRI 2026 pide nombre, apellido, cargo, empresa, correo, teléfono y tipo de participante para activar la descarga. **No se ingresaron datos ni se envió la solicitud**; por tanto, el análisis queda restringido a la nota de prensa y al formulario oficial público.

## FMCSA Form M: buena apertura anual, mal denominador para tasa por viaje

La página F&OS FMCSA consultada (actualizada 17-sep-2026) explica que el programa recoge anualmente balance general, estado de resultados y datos relacionados de millaje, empleados/equipo, y que los reportes normalmente se hacen públicos, con procedimientos de confidencialidad y exención. El umbral publicado para propiedad es carrier for-hire Class I/II de ingresos ajustados ≥ USD 3 millones; existen excepciones para empresas bajo umbral, carriers privados/fuera de jurisdicción, authority cedida, bankruptcy y otras. El registro no representaría a toda la población de líneas.

La copia enlazada Form M tiene revisión 25-nov-2025; el PDF muestra una expiración OMB 28-feb-2026 y aclara que esa fecha corresponde al proceso de renovación. La página del programa es posterior y aún lista ese PDF. Se registra la discrepancia de versionado; antes de cualquier uso de formulario como captura vigente hay que confirmar la versión aplicable. No es obstáculo para usarlo como evidencia del esquema publicado en la revisión actual.

| Schedule / renglones Form M | Encaje FCM | Limitación que impide calibrar hoy |
| --- | --- | --- |
| 206–210: driver/helper wages W-2; administrative/clerical; other wages; fringe benefits/payroll taxes/workers comp/insurance | CVU driver; COST_PAYROLL; LABOR | Es total anual de carrier/afiliadas, no tarifa por tractor/milla. 1099 se reclasifica a rentals. |
| 213: combustible, aceite, lubricantes de vehículos de revenue, terminal y mantenimiento; fuel tax va separado | Fuel + posible lubricante/mantenimiento | Mezcla uso productivo con vehículos terminal/shop; no separa litros/precio ni loaded/empty. |
| 214 outside maintenance; 215 parts excluye tires; 216 tires/tubes incluye retread y taxes | COST_MAINT/COST_TIRES | Frontera de categoría buena, pero valores anuales agregados sin millas/cantidad/cohorte para cada línea. |
| 219 cargo loss/damage incluye claims pagados; 220 liability/property damage incluye claims; 221 otros seguros incluye inmuebles/oficina | COST_INSURANCE/RISK | No es prima pura: mezcla siniestros en 219/220 y otros activos en 221; distinta definición ATRI. |
| 223 fuel tax; 224 operating taxes/licenses incluye peajes, licencias, taxes de uso vehicular y property tax | FINANCE/compliance/peajes | Tax/toll se agregan con conceptos varios; FCM los necesita por viaje/ruta o como tasa claramente asignada. |
| 225 depreciation y amortization de revenue equipment, edificios y otra propiedad | CFU · capital/depreciación | Incluye activos no vehiculares junto con equipo; anual consolidado. |
| 226–227 equipment rentals with/without drivers; 229 purchased transportation | External capacity / purchased carrier cost | 229 incluye interline shipment/partial load si el carrier conserva el control del vehículo/driver; es lo más cercano a compra externa, pero mezcla ferrocarril, agua, aéreo, carretera, loaded/empty y carriers sin precio/ruta/modo desglosado. No es una tarifa de línea por corredor. |
| 230 communications/utilities; 231 other operating expenses; 237 interest expenses | COST_COMPANY/GENERAL_BASE; FINANCE | Resumen anual amplio; no asigna partes, unidad, base operativa o costo de capital a un tractor o viaje. |
| Sección de commodity principal: General Freight con LTL/Truckload/Parcel/Container; Specialty Freight hasta tres clases | Segmentación básica | Clasifica operación predominante, no equipo exacto del piloto, dirección del tramo o modalidad MX→US. |

Los campos son agregados de la empresa (puede reportar afiliadas consolidadas), declarados en whole USD bajo GAAP; el formulario admite adjuntar estados financieros, pero eso no produce necesariamente un dataset estructurado accesible. No se encontró en la página oficial un endpoint/archivo de respuestas actuales descargable. La afirmación precisa es “no verificado como descarga pública estructurada”, no que el dato legalmente no exista.

## Dictamen por uso

| Uso previsto | Estado | Acción |
| --- | --- | --- |
| Diseñar el inventario de partidas y reglas de no doble conteo | **APTO** | Mantener como taxonomía/esquema de contraste; documentar definiciones y denominadores. |
| Contrastar categorías y tendencias agregadas de trucking US | **CONDICIONAL** | La nota de prensa basta para total y variaciones, no para valores/rubros completos del informe 2026; no extrapolar al segmento/corredor. |
| Comparar una sola compañía US por Form M | **PENDIENTE DE RECUPERABILIDAD** | Requiere identificar reportes reales, año, confidencialidad, pertenencia de afiliadas y cohorte antes de extraer. No hay carrier objetivo acordado ni se emitió solicitud. |
| Calibrar USD/milla / CFU/CVU de la línea US | **NO APTO CON LO REVISADO** | Faltan importes observados accesibles más millas, equipo/cohorte, segmentación, frontera de compra, fuel surcharge, loaded/empty y vigencia comparables. Mantener `INCOMPLETE` y cero adopciones. |

## Siguiente acción investigable

1. Mantener el inventario canónico de 135 keys; agregar etiquetas explícitas de inclusión/exclusión del Form M/ATRI sólo donde hay definiciones, sin rellenar valores.
2. La muestra pública de filings SEC quedó evaluada en [B1 · factibilidad de filings SEC](C1_B1_SEC_CARRIER_FILING_FEASIBILITY_2026-09-29.md): los denominadores de flota permiten contexto de utilización, pero no empatan con cuentas de gasto por corredor/vehículo.
3. Confirmar si el producto permite como alternativa un contraste agregado ATRI claramente separado o exige costo estimado por tercero. Para el segundo caso se requiere un registro público homogéneo por carrier y denominador/cohorte, no un porcentaje de industria.
4. Siguiente trabajo de benchmark: definir la matriz D2D por ruta con distancias/peajes y precios públicos fechados, vinculando fronteras económicas por tramo; dejar en faltante la tasa de compra del carrier cuando la fuente pública no la abra.
5. Mantener el MVP cerrado a bases/quotes mientras falten costos o regla metodológica del carrier de cada tramo. No pedir al usuario/tercero credenciales ni enviar formularios.

Sin cambios de código, parámetros, bases, DB, Auth, infraestructura, usuarios, formularios enviados o despliegues. El PDF ATRI de recolección se descargó a `%TEMP%`; SHA-256 `A9BE75541E94C031F71F4A7081CD06EAB39BCEA165202EDDAD199998ED8AD5D9`. Rollback: eliminar este documento y sus referencias en Sprint Status; sin cambios de runtime ni datos persistidos.

## Fuentes primarias

- [ATRI 2026 · formulario Motor Carrier (costos observados de 2025)](https://truckingresearch.org/wp-content/uploads/2026/02/2026-Ops-Cost-Motor-Carrier-Form.pdf)
- [ATRI 2026 · nota pública de resultados 2025](https://truckingresearch.org/2026/07/new-atri-report-details-accelerating-costs-and-low-profitability-despite-cuts/)
- [ATRI 2026 · descarga del informe completo con formulario de contacto](https://truckingresearch.org/2026/07/analysis-of-the-operational-costs-of-trucking-2026-update/)
- [FMCSA · alcance, publicidad, cobertura y exenciones del programa F&OS](https://www.fmcsa.dot.gov/mission/file-carrier-financial-and-operating-statistics)
- [FMCSA · Form M (PDF)](https://www.fmcsa.dot.gov/sites/fmcsa.dot.gov/files/2026-01/M%20Form.pdf)
- [FMCSA · Reglamento 49 CFR Part 369](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-369)

Modelo recomendado: GPT-6 Luna · esfuerzo alto para extracción estructurada de fuentes; GPT-6 Astra · esfuerzo alto para dictaminar fronteras de costos y comparabilidad. No hubo uso de IA dentro del producto.

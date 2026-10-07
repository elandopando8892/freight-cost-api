# B1 · puente de evidencia D2D por tramo

Fecha de corte: 29 sep 2026  
Proyecto: Freight Cost Model · rama `codex/cost-tires-release-s14` · HEAD verificado antes de editar `4f5fc2de0c3d178dace917231e1092040dec21fd`  
Alcance: investigación pública, sólo documental. No se selecciona una ruta comercial ni se ingresan datos a bases gobernadas.

## Decisión de este corte

Hay rutas de evidencia pública que pueden formar parte del viaje, pero no constituyen por sí mismas el costo de compra de una línea. El precio de combustible y los peajes son **costos variables/por viaje** con fecha, lugar, equipo y sentido; no parámetros generales intercambiables entre operadores. El costo productivo del carrier (CFU/CVU) sigue requiriendo evidencia propia comparable. La tarifa de compra de un tercero continúa como una observación comercial separada.

Resultado B1: el puente de fuentes queda definido a nivel de contrato y brechas; aún no es un corredor cerrado ni produce un total D2D. No fijamos Monterrey–Dallas ni ningún otro endpoint como ruta del piloto, porque los documentos vigentes requieren seleccionar el corredor luego de revisar la matriz y no contienen origen/destino operativo confirmado.

## Cadena de evidencia, no fórmula de tarifa

```text
Origen/destino y puntos intermedios confirmados
  ├─ MX leg: ruta candidata + peajes por clase + precio de combustible observado
  ├─ Intercambio fronterizo: puente/punto, responsable y cargo observado (si existe)
  └─ US leg: ruta candidata + peajes por clase + precio regional/contrato de combustible
          ↓ conservar fecha, moneda, unidad, geometría, sentido y fuente para cada registro
Inputs del viaje × rendimientos/costos unitarios del operador, sólo si hay evidencia comparable
          ↓
CFU / CVU por operador y tramo + cargos de cruce explícitos, sin solapes
          ↓
Costo técnico de referencia ≠ tarifa de compra del carrier ≠ precio de venta XBF
```

Esta cadena sólo sirve para un ensayo de costo. Las tasas no soportadas permanecen `MISSING/INCOMPLETE`; el motor no recibe ceros ni suplentes sectoriales para aparentar integridad.

## Matriz de fuente y uso admisible

| Dato requerido por viaje o base | Fuente / granularidad disponible | Uso admisible en el FCM | Estado y condiciones pendientes |
| --- | --- | --- | --- |
| Ruta MX: origen, destino, puntos intermedios, km, duración y plazas de cobro | SICT describe MAPPIR/“Traza tu Ruta” como herramienta que calcula ruta sugerida/alterna, distancia, tiempo aproximado, casetas y combustible configurable por vehículo. La documentación gubernamental disponible es antigua; no se verificó API pública actual, formato exportable estable, ni cálculo para la ruta piloto. | Captura de alternativa elegida y snapshot del itinerario con fecha y perfil de vehículo; sólo km/tiempo como inputs del viaje después de comparación con trazado aceptado por XBF. | `CANDIDATO, endpoint no validado`. La ruta exacta y su fecha de consulta faltan. No automatizar raspado ni comprometer SLA de integración con base sólo en la página explicativa. |
| Peajes MX por plaza y categoría | CAPUFE publica tablas 2026 FONADIN/red concesionada, en MXN con IVA y clases de camión C2–C9; la tabla declara tarifa efectiva desde 13 abr 2026 para red FONADIN. La página enumera aparte puentes internacionales con fechas de vigencia distintas. | Contrastar/importar sólo las plazas efectivamente cruzadas por el itinerario, asignando categoría por número de ejes y sentido/tramo; conservar IVA y fecha. | `FUENTE OFICIAL, cobertura parcial`. CAPUFE no equivale a toda concesionaria; confirmar plaza, operador, actualización y categoría en cada ruta. No sumar la totalidad de un tramo si MAPPIR ya entrega casetas agregadas. Evitar doble conteo. |
| Precio MX de diésel | Dataset CNE en datos.gob.mx: precio reportado por permisionarios por litro, subproducto y fecha; el registro visible corresponde a actualización de datos a febrero de 2026, aunque metadatos fueron publicados en abril 2026. | Benchmark/contraste por estación/municipio y ventana de fecha, separado del recibo real y de la condición comercial del carrier. Si el costo es modelado, indicar ubicación/fecha y regla de selección (no escoger el menor precio). | `FUENTE OFICIAL CANDIDATA, freshness insuficiente para hoy`: no asumir actualización diaria por el nombre “diario”; verificar fecha máxima del CSV antes de cualquier uso. El precio de público no prueba descuento, volumen, mezcla fiscal ni compra del operador. |
| Precio US de diésel | EIA publica semanalmente precio minorista on-highway por PADD. En la tabla histórica primaria, la observación más reciente es semana `2026-09-28`: USD 5.955/gal, Release Date 29 sep 2026; la semana anterior (`2026-09-21`) aparece en USD 6.177/gal. | Referencia regional temporal para análisis de sensibilidad del tramo US; convertir galón a litro de forma documentada si se usa unidad común; la región se asigna por ruta/tramo, no por domicilio del carrier. | `CONTRASTE REGIONAL, no costo del transportista`. El precio minorista incluye impuestos y no refleja contrato, descuentos, fuel card, surcharge ni dónde se surtió realmente. EIA/PADD no es un dato específico de corredor ni de estación. |
| Rendimiento, vacío, ralentí y combustible realmente consumido por operador | SEC 10-K/ATRI/Form M y datos públicos previos no conectan de modo reconciliable el costo de combustible con la misma flota, periodo y millas cargadas/vacías del carrier del tramo. | Sólo usar medición de una cohorte/activo compatible y misma frontera económica; combustible del viaje puede calcularse cuando existan consumo/rendimiento y precio con soporte. | `MISSING para ambos carriers`. No adoptar el rendimiento de un filing/encuesta agregada. No confundir la estadística EIA de precio con evidencia de consumo. |
| Peaje US | TxDOT publica mapa de carreteras/puentes con peaje y autoridad operadora; NTTA publica tarifas por segmento, clase de ejes y método de pago para sus instalaciones. No se consultó una ruta exacta del piloto ni su secuencia de pórticos. | Snapshot por carretera/gantry, clase/ejes y tag/efectivo sólo si la ruta elegida utiliza la instalación. Mantener fuera cuando la alternativa seleccionada no transite un tramo de cuota. | `POR VALIDAR POR ROUTE`; las tablas halladas no bastan para el total: validar vigencia de tabla y autoridad de cada activo. Un endpoint Laredo–Dallas, por ejemplo, no queda aprobado por aparecer como hipótesis en investigación. |
| Cruce fronterizo/intercambio de remolque | La evidencia explorada no contiene tarifa vigente comparable para el puente elegido, maniobra, patio, inspección, espera ni intercambio entre dos líneas. | Cargo independiente por evento y responsable/pagador, con fuente comercial fechada; no incluir dentro de peaje ni de CFU/CVU doméstico salvo contrato que lo demuestre. | `MISSING`. La tarifa de puente vehicular no es automáticamente el costo de intercambio D2D. Se necesita elegir puente y definir quién paga cada cargo. |
| Compra de capacidad de un carrier | SEC filings, ATRI y estadísticas públicas son agregados/contrastes y no publican de manera uniforme una cotización contemporánea, clase de equipo, servicio, sentido y alcance de compra para este lane. | Guardar cotización real como benchmark de compra independiente (carrier, vigencia, moneda, accesoriales, combustible, equipo, sentido, exclusiones); anonimizar para investigación donde corresponda. | `MISSING para el piloto`. No derivar buy rate desde CFU/CVU + margen hipotético ni desde promedios de bolsa/marketplace sin definiciones alineadas. |

## Reglas de integridad económica

1. **Identidad del activo y frontera:** el tramo MX y US identifican carrier, tractor, trailer/tenencia, conductor, moneda y periodo. Intercambiar el remolque no significa intercambiar el tractor, ni que ambos tramos posean el mismo trailer.
2. **Un solo registro de distancia elegida:** mantener alternativas de ruta aparte de la ruta seleccionada. Map provider y ruta SICT pueden diferir por restricciones de unidad; nunca sumar sus distancias o peajes.
3. **Loaded/empty:** las millas del viaje son entradas; el factor de vacío de una base de carrier debe venir de su propia cohorte. Declarar qué distancia divide cada cuenta CFU/CVU. No multiplicar vacíos a la vez en el denominador de costos y en la tarifa.
4. **Combustible:** capturar país, fecha o semana, ubicación/región, producto, impuestos incluidos, moneda, unidad, fuente y si precio es minorista, mayorista, factura o contrato. La conversión de unidad/FX queda versionada y separada del consumo.
5. **Peajes:** capturar instalación/plaza, operador, vehículo/ejes, tramo/sentido, fecha de vigencia, IVA/tasa y medio de pago. El itinerario identifica la plaza; la tabla oficial aporta tarifa. Un total del route planner se usa como conciliación, no se agrega otra vez a sus plazas.
6. **Cruce y frontera:** puente, sentido, clase de unidad, eventos, pagador, esperas/maniobras y regla de intercambio deben explicitarse. No esconder cargos de cruce en peajes generales o gastos corporativos.
7. **Tres resultados independientes:** costo técnico (`CFU/CVU + cruce aplicable`), precio ofrecido para comprar capacidad (`carrier quote`) y precio ofrecido al cliente (`XBF margin/policy`). Sólo se compara cada par después de alinear fecha, moneda, equipo, carga, ruta, combustible, seguro, accesorios e impuestos.

## Próximo corte: completar una ruta piloto documentada

Para transformar esta matriz en evidencia de un lane, el trabajo siguiente es una **ficha de ruta con puntos exactos y una clase de vehículo acordada**, no una nueva plantilla genérica. El corte tendrá que:

- seleccionar, desde una fuente autorizada del proyecto, el endpoint y punto de intercambio de prueba; no se presume que Monterrey–Dallas sea decisión de XBF;
- consultar una ruta aceptada por clase de ejes, registrar las opciones, plazas y distancias de cada país y verificar cobertura del peaje mexicano fuera de CAPUFE;
- extraer y conservar el CSV CNE con fecha máxima visible, y la semana EIA que cubra la misma fecha de análisis; fijar la política de escalamiento si CNE no está vigente;
- producir un libro mayor de costo **por dato/tramo** con tres estados `OBSERVED`, `PUBLIC_CONTRAST` o `MISSING`; la tarifa real del carrier no se rellena con el contraste público;
- ejecutar una conciliación aritmética sólo cuando estén disponibles los datos de consumo, costo del carrier y elección de ruta para ambos lados. Si no están, reportar `NOT CALCULABLE`, no un número puntual.

Gate de salida de ese corte: distancia/peajes replicables por ruta/equipo y alineados temporalmente; precio regional de combustible sólo como sensibilidad; costo técnico sólo si hay denominadores e inputs productivos comparables; compra/venta siguen separadas. Aun con este puente, B1 no cierra automáticamente.

## Trazabilidad, cambios y rollback

El análisis parte del objetivo D2D de dos líneas terceras y límites vigentes descritos en `C1_MVP_BUSINESS_SPRINTS_2026-09-29.md`, `C1_B1_SEC_CARRIER_FILING_FEASIBILITY_2026-09-29.md` y `C1_B1_PUBLIC_EVIDENCE_REVIEW_2026-09-29.md`. Se revisó HEAD/branch/worktree antes de escribir y se conservaron cambios preexistentes. Sin edición de código, motor, base, usuarios, Auth, infraestructura, datos privados ni despliegue. No se realizaron cálculos económicos ni operaciones de negocio, y no se invocó una API de IA del producto.

Rollback documental: retirar este archivo y quitar las referencias añadidas al resumen de B1; no tiene dependencias ejecutables ni afecta bases de costos.

## Fuentes públicas revisadas

- SICT, [Traza tu Ruta / MAPPIR, descripción del cálculo y perfil del vehículo](https://www.gob.mx/sict/prensa/traza-tu-ruta-con-mappir-hace-mas-facil-su-viaje-por-carretera) y [ficha SICT de puntos intermedios y datos del vehículo](https://www.gob.mx/sict/prensa/dispone-sct-de-la-aplicacion-web-traza-tu-ruta-para-planificar-los-viajes-en-carretera). Son páginas institucionales descriptivas; no demuestran disponibilidad de API vigente.
- CAPUFE/IAVE, [tarifas vigentes 2026 (PDF)](https://iave.capufe.gob.mx/assets/Doc/Tarifas-vigentes-2026.pdf), incluye red FONADIN y concesionada, MXN con IVA, categorías de camiones y vigencias que varían por plaza.
- CNE/datos.gob.mx, [dataset Petrolíferos](https://www.datos.gob.mx/dataset/petroliferos) y [vista del recurso de precios diarios (actualizado a febrero 2026)](https://www.datos.gob.mx/dataset/petroliferos/resource/aaefe434-8464-4be6-ba6a-7f1f3a436cd3/view/7b435e5b-cd17-431e-a1be-41f6e8c96396). No se descargó ni procesó el CSV en este corte.
- EIA, [tabla histórica primaria de precios semanales de diésel Gulf Coast (PADD 3)](https://www.eia.gov/dnav/pet/PET_PRI_GND_DCUS_R30_W.htm): semana 28 sep = USD 5.955/gal, con release 29 sep; semana 21 sep = USD 6.177/gal. Fuente para contexto regional, no adopción.
- TxDOT, [mapa de roads managed lanes / toll roads y operadores](https://ftp.txdot.gov/pub/txdot-info/tpp/maps/toll-hov-map.pdf); NTTA, [tabla tarifaria 2023–2025](https://www.ntta.org/sites/default/files/2023-06/NTTAS_2023-2025_Toll%20Rate%20Tables_032423%20single%20tab%20%28landscape%29.pdf), observada pero fuera de vigencia a la fecha: evidencia de que la tarifa necesita consulta vigente por pórtico/clase, no fuente de tasa actual.

Modelo/esfuerzo: GPT-6 Luna · alto para extracción y armado de la matriz; GPT-6 Astra · medio/alto para revisión de frontera económica, doble conteo y decisión de suficiencia. Este corte ejecutó el análisis de alcance y trazabilidad en modo documental; no se usó un modelo de investigación externo para poblar costos.

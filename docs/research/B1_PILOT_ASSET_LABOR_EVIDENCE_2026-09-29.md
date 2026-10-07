# B1 — Equipos y remuneración: evidencia pública del piloto

Corte: **29 septiembre 2026**. Piloto: terceros D2D, caja seca T3-S2, MX→US con intercambio, sin transbordo. Checkout D: `cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`.

## Entregable de negocio

Se localizaron cuatro ofertas identificables de tracto/remolque y cinco referencias de remuneración truckload por tamaño de flota. Se entrega el [registro estructurado](B1_PILOT_ASSET_LABOR_EVIDENCE_2026-09-29.json), con fuente, unidad, configuración, fecha, localizador y límites. **Son contrastes, no una base calibrada:** todavía no permiten calcular CFU/CVU completos del piloto.

El inventario canónico pasa de 3 candidatos / 45 contrastes / 87 faltantes a **3 / 47 / 85** al relacionar `PU Tracto` y `PU Remolque` con ofertas públicas. El cambio mide localización documental, no suficiencia ni aceptación económica. Siguen **135/135 claves documentadas, cero valores adoptados, E1 abierto y 0/4 gates completos**. Los impuestos, entrega, condición y vidas restantes faltantes no se sustituyen por cero.

## 1. Capital: observaciones de oferta, no transacciones

| ID / mercado | Activo y configuración publicada | Precio anunciado en moneda original | Fecha y límites de comparación |
|---|---|---|---|
| MX-T — [RODAL, Cascadia 2021](https://rodaltruckfinancials.com/catalogo/freightliner-cascadia-2021--vhc-f8668c8f02) | Usado, Nuevo León; 694,920 km, DD15 450 HP, manual 18 velocidades; diferenciales 46,000 lb; descripción “100% Mexicano” | MXN **1,198,275.86 + IVA**; encabezado redondea a 1,198,276 | Observado al corte, publicación sin fecha verificada. No confirma configuración T3, cabina, preparación, entrega, estado mecánico ni precio de cierre. |
| MX-R — [PriceSales, stock 11713](https://www.pricesales.com/productos/caja-seca-utility-2015-53-pies-puertas-de-libro-suspension-de-aire-7/) | Utility 2015, caja seca 53 pies, 4000D-X, puertas de libro, techo aluminio, suspensión de aire | MXN **280,000 + IVA**, LAB Nuevo Laredo, Tamaulipas | Lectura directa al corte. Título/catálogo y descripción discrepan sobre Hendrickson/Meritor: suspensión específica sin resolver. Faltan inspección, número de ejes confirmado y preparación. |
| US-T — [SelecTrucks Houston, stock 501320](https://www.selectruckhouston.com/pdf/specials-february-2026-revised.pdf) | Usado 2021 Cascadia 126, DD15 400 HP, DT12, sleeper 72 pulgadas, batalla 227 pulgadas, 509,000 millas | **$59,995**; USD inferido del concesionario US, no código monetario impreso | Oferta histórica: febrero 2026 inferido del nombre del archivo, sin fecha impresa. No prueba disponibilidad actual, impuestos, entrega ni precio pagado. Garantías anunciadas disponibles, no confirmadas incluidas. |
| US-R — [Great Dane / Total Trailers, VIN …VJ901576](https://buygreatdane.com/trailer/great-dane-dry-van-53-composite-plate-dry-van-2027-vj901576/) | Nuevo, modelo 2027; 53 pies, composite plate, tándem, air ride, puertas de libro, 102 pulgadas de ancho | **$42,900**; USD inferido del vendedor en Missouri, pendiente confirmación expresa | Observado al corte; año-modelo no es fecha de compra. No confirma inclusión/exclusión de FET, otros impuestos, preparación, entrega o registro. La cantidad anunciada no es tamaño de flota del carrier. |

Son **cuatro observaciones de oferta**, no distribuciones de mercado. No se promedian usados y nuevos, monedas o antigüedades, ni se atribuyen estos activos al transportista modelado. Los kilómetros y millas del odómetro describen condición, no producción anual ni vida restante.

### Calidad y exclusiones

- Para MX-R, el resultado de búsqueda decía 295,000 + IVA; la página individual y el catálogo leídos directamente muestran 280,000 + IVA. Se conserva el precio directo. La diferencia de 15,000 **no prueba un cambio histórico de precio** ni descuento ejecutable.
- La oferta Maxim en Winnipeg, aun rotulada en USD, no pertenece al mercado de adquisición US sin resolver importación y costos adicionales. Se excluyó.
- El catálogo dinámico Penske entregó registros en el lector web que no pudieron localizarse de nuevo en el HTML directo. No se incorpora como oferta confirmada ni se usa su hash para respaldar esos precios.
- Los vendedores son fuentes primarias de **sus ofertas**, no autoridades estadísticas ni prueba de stock, inspección, solvencia o transacción. No se contactó a vendedores ni se solicitaron cotizaciones comerciales.

### Puente hacia las fórmulas

`PU Tracto` y `PU Remolque` reciben un enlace documental, **ningún importe**. Antes de alimentar capital, confirmar país, moneda, activo/ejes/cabina, tenencia y costo capitalizable: oferta + costos comprobados, con tratamiento de impuestos documentado. No convertir MXN a USD sin fecha/serie FX aplicable; no incorporar automáticamente IVA recuperable ni excluir automáticamente FET.

Para depreciación, la transformación sigue siendo `(costo capitalizable − residual económico) / meses restantes de uso`, sólo en propiedad y con evidencia separada de cada término. La política contable de un equipo nuevo citada en el [corte anterior](B1_MX_US_PAYROLL_ASSET_COMPARATORS_2026-09-29.md) **no establece** la vida restante de estos tractos usados ni de la Utility 2015. No se extrapola el odómetro a vida o residual; tampoco se deriva residual futuro del precio actual de otro equipo. Renta y financiamiento conservan las exclusiones de [ADR-008](../architecture/ADR-008-payroll-capital-economic-contract.md).

El mismo remolque de intercambio requiere responsabilidad/asignación explícita entre tramos. Ofertar uno MX y otro US no demuestra que el piloto necesite comprar dos ni autoriza cobrarlos íntegros dos veces.

## 2. LABOR US: contraste por cohorte, no nómina completa

Fuente: [ATRI, actualización 2025](https://truckingresearch.org/wp-content/uploads/2025/07/ATRI-Operational-Costs-of-Trucking-07-2025.pdf), operaciones **2024**. Figura 7, p.24 impresa / p.27 PDF: sueldo + prestaciones reportadas de conductores truckload. Los grupos sector/tamaño no están ponderados (metodología pp.7–8); no identifican al carrier ni corredor del piloto.

| Tamaño de flota publicado | USD/milla reportado | USD/km, transformación documental |
|---|---:|---:|
| Menos de 26 camiones | 0.817 | 0.507662 |
| 26–100 | 0.872 | 0.541837 |
| 101–250 | 0.790 | 0.490884 |
| 251–1,000 | 0.843 | 0.523817 |
| Más de 1,000 | 1.058 | 0.657412 |

La tabla nacional multisector (tabla 8, p.15 / PDF18) suma 0.798 de sueldo y 0.197 de prestaciones: **0.995 USD/milla**; no se combina con los grupos anteriores. Cuestionario p.58 / PDF61: sueldo base y prestaciones estándar; bonos/incentivos se preguntan aparte. La conversión de pagos horarios también usa supuestos del reporte (p.20 / PDF23). No certifica todas las cargas legales, dry van exclusivamente ni productividad MX.

Transformación local: `USD/km = USD/milla / 1.60934`, factor del motor actual; se guarda resultado sin redondear y se muestra seis decimales. Es normalización de unidad, **no actualización a 2026**. Los extremos entre medias de grupos no son intervalo de confianza ni tarifa elegida. Sin cohorte y régimen salarial confirmados, no se suman prestaciones otra vez, ni se activan como `EMPLOYER_TOTAL`. No convertirlos a CFU mensual con kilómetros nacionales de otra población.

Existe un [anuncio ATRI 2026](https://truckingresearch.org/2026/07/new-atri-report-details-accelerating-costs-and-low-profitability-despite-cuts/). El reporte completo obtenido en este corte es 2025: no se recuperó el de 2026 en los accesos revisados. No se proyectan cifras por aumentos porcentuales de un comunicado, ni se llama vigente al benchmark 2024.

## 3. Qué se puede cerrar y qué falta

| Familia | Avance verificable | Bloqueo que permanece |
|---|---|---|
| Precio de equipo MX/US | Ofertas identificadas con moneda original, condición y localizador | Costo de adquisición instalado/capitalizable y aplicabilidad al equipo/country del piloto |
| Vida/residual | Regla de transformación y nuevo/usado separados | Vida restante, residual y tenencia comparables de cada activo; financiamiento si aplica |
| LABOR US | Cinco medias truckload y conversión reproducible a km | Cohorte/tamaño, vigencia, exclusiones, bonos y cargas patronales aplicables; no adopción |
| LABOR MX | Se conserva el contraste ocupacional anterior | Remuneración formal total y denominador de operador T3-S2; no equivalencia con ENOE amplia |
| Administración / exposición | Contrato por FTE y denominadores documentado | Cantidades, costo atribuible, km/días productivos comparables; no prorrateo inventado |

**Siguiente corte con salida económica:** expediente público de remuneración/cargas legales MX para operador T3-S2 y escenarios explícitos de vida restante/residual de usados. Si una fuente sólo aporta una hipótesis, identificarla como tal; si no alcanza, entregar faltante individualizado. No abrir más pantallas ni publicar una base con importes sin soporte. B2 puede seguir estructuralmente, pero adopción y resultado numérico del piloto dependen de suficiencia B1.

## 4. Evidencia, validación y rollback

Las cuatro ofertas se leyeron directamente; PDF SelecTrucks y tablas ATRI también se revisaron visualmente. El JSON conserva SHA-256 de respuestas HTML/PDF capturadas. Un hash identifica la respuesta obtenida, **no** certifica la afirmación del vendedor ni permite reconstruirla sin el archivo. El dossier conserva observaciones/localizadores, no un archivo íntegro de las páginas dinámicas; futuras comprobaciones requieren nueva lectura. PDFs/renders temporales son intermediarios, no evidencia operativa autenticada.

Comprobaciones locales aprobadas: conteos/IDs, enlaces MD↔JSON, normalización por milla/km, suma nacional y consistencia de monedas/fechas; **38/38 pruebas** (18 inventario + 20 contrato nómina/capital), con acceso a DB bloqueado; `git diff --check` sin errores (avisos de normalización CRLF). Auditor: 135/135, 3 candidatos, 47 contrastes, 85 faltantes, cero discrepancias y `economicStatus=INCOMPLETE`. SHA-256 del registro auditado: `2fedaad42246a16a4f457b4400fc0ce802d4f40125d922a55c7ef978a5a720ce`; dependencias del motor: `9c8510de32dbdd8a9a86f99f571f1e41171f683ce005106eeb26fbae1e46001d`. Se verificaron también los hashes de ambos PDF descargados. Cinco intermediarios temporales (dos PDF y tres renders) permanecen en `tmp/pdfs/b1-pilot-economic-20260929/`: la política de ejecución rechazó su limpieza antes de ejecutar; no se retiró ningún archivo ni se intentó eludirla. No constituyen un archivo documental permanente. El registro no incluye parámetros adoptados. No se modificaron fórmulas activas, plantilla económica con nulls, DB, Auth, usuarios, infraestructura, UI o despliegues. No hubo operaciones de negocio ni llamadas IA de la aplicación.

Recomendación por actividad: **GPT-6.1 Sol · alto** para comparar fuentes y relacionar capital/LABOR con CFU/CVU; el mismo para validación documental de este corte. Astra no requerido. Es recomendación, no afirmación de cambio del modelo/selector.

Rollback local: retirar únicamente este informe/JSON, su nota nueva del plan/estado y los enlaces nuevos del registro; restituir las dos filas de capital a `FALTANTE`, conteos 3/45/87 y la expectativa anterior del test de inventario. No revertir íntegros los documentos compartidos ni cambios previos del worktree. Ningún rollback de datos o despliegue es necesario.

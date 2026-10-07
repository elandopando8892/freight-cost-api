# B1 · seguros: evidencia, alcance y puente al CFU

Corte 29 sep 2026 · D: · rama `codex/cost-tires-release-s14` · HEAD `4f5fc2d`. Piloto: estimación de transportistas terceros, D2D caja seca T3-S2 MX→US con intercambio, sin transbordo. [Registro reproducible](B1_INSURANCE_COVERAGE_COST_BRIDGE_2026-09-29.json).

## Entregable y decisión

Se relacionaron las tres claves de `COST_INSURANCE` con su semántica real, cinco fuentes primarias y seis familias de cobertura/costo. **No hay prima vigente completa y comparable para ambos carriers del piloto.** La investigación aporta comparadores y detecta errores de transferencia; no se inventa una póliza ni se introduce un importe para desbloquear el cálculo. B1/E1 abiertos, 135/135 claves documentadas, 3 candidatos / 47 contrastes / 85 faltantes, cero adopciones y 0/4 gates.

La validación de datos obligó a conciliar numerador, exposición y coberturas antes de comparar; la revisión visual de PDF impidió atribuir una celda de turismo a carga general. No se necesita una pantalla nueva ni wireframe: este corte sólo entrega economía/documentación y pruebas locales; cualquier cambio posterior de UI mantendrá wireframes MARKSMAN.

## Evidencia pública: qué sí tenemos

| Fuente / población | Observación | Uso y límite |
| --- | --- | --- |
| [Progressive, nuevas pólizas 2025](https://www.progressivecommercial.com/commercial-auto-insurance/truck-insurance/commercial-truck-insurance-cost/), transporte por cuenta ajena nacional US, nota al pie | USD 926 por unidad motriz/mes; equivalente aritmético USD 11,112/año. Incluye RC y daños propios, conductores sin infracciones. | No confirma vigencia de 12 meses, dry van transfronterizo, cargo/intercambio, límites ni deducibles. No es oferta 2026 del piloto. USD se interpreta del contexto estadounidense. |
| [ATRI Operations 2025](https://truckingresearch.org/wp-content/uploads/2025/07/ATRI-Operational-Costs-of-Trucking-07-2025.pdf), operaciones 2024 | Tabla 8: USD 0.102/milla nacional; tabla 13: 0.104 South Central. Cuestionario p.57/PDF60: RC, cargo y exceso; excluye daños propios, workers compensation, sentencias y acuerdos extrajudiciales. | No son la misma canasta que Progressive. Costos de siniestros de bolsillo están separados. No sumar ambos ni recuperar prima anual con km de otra población. |
| [IMT PT630, 2021](https://www.imt.mx/archivos/Publicaciones/PublicacionTecnica/pt630.pdf), p.14/PDF30, ejemplo T3-S2 | Rango histórico MXN 120,000–150,000/año. Caso: 135,000/año, 144 viajes y 110,000 km; mes 11,250; viaje 937.50. | Ilustración histórica, coberturas no desagregadas. Imprime **1.4423 MXN/km**, pero sus inputs dan **1.2272727**. Se conservan original y reconstrucción; ninguno es benchmark actual. |

No se promedian estas poblaciones ni se mezclan precios nominales 2021, pólizas nuevas 2025 y operaciones 2024. No hay conversión MXN→USD sin FX/fecha y tratamiento fiscal pertinentes. Lecturas públicas HTML revisadas, no archivadas; PDFs con SHA-256 en JSON, copias locales de investigación conservadas en scratch, sin credenciales. Las tres páginas PDF pertinentes se revisaron visualmente.

## Requisito regulatorio no es prima

[FMCSA, tabla actualizada 26 marzo 2026](https://www.fmcsa.dot.gov/registration/insurance-filing-requirements): la fila de transporte por cuenta ajena de bienes no peligrosos con GVWR ≥10,001 lb establece BIPD USD 750,000 y cargo filing USD 0. Ese cero **no significa prima cargo cero, ausencia de riesgo, ni cumplimiento de condiciones comerciales**. No se copia la garantía del broker a los costos de una línea transportista. La autoridad, operación, equipo y mercancía efectivos deben verificarse antes de aplicar un requisito al piloto.

[DOF, 2 julio 2025](https://diariooficial.segob.gob.mx/abrirPDF.php?anio=2025&archivo=02072025-MAT.pdf&repo=), artículo tercero, p.35: la fila **SICT-03-008-A, carga general**, pide póliza de RC o fondo de garantía vigente, sin cantidad numérica en esa celda. Las **19,000 UMA de la misma página pertenecen a SICT-03-007, turismo internacional**, cuya fila comienza en p.34. El IMT 2021 y una ficha antigua indexada sí mencionan 19,000 UMA para carga; esto no autoriza trasladar la celda vecina ni declarar que otro mínimo legal fue derogado. El monto legal aplicable a la operación actual queda **pendiente de conciliación normativa**, separado del precio de seguro. No se monetiza un límite como prima.

## Puente económico: prima → fijo → CFU, sin duplicación

La fórmula activa en `engine.outputs.ts` es cantidad de pólizas por vehículo × importe × tractores / meses. Aunque el primer campo se llama **“Prima Anual por Vehículo”**, su unidad es `policy/vehicle`: es cantidad, no dinero. **“Póliza x Vehículo”** tiene unidad `USD/year/tractor`; **“Periodo de Póliza”**, meses. Estas tres claves alimentan `monthlyFixedUsd` en ambos países, no mantenimiento/llantas ni operador/km.

Hay una ambigüedad de unidades: si un importe ya anualizado se divide entre seis meses se duplica el gasto mensual. Propuesta **no implementada**: conservar prima del plazo y plazo reales en el expediente, normalizar `primaAnualEquivalente = primaDelPlazo × 12 / mesesDelPlazo` y asignar a la representación anual un divisor de 12; no sobrescribir la vigencia real del contrato. Cualquier adaptador necesitará contrato y pruebas antes de activar importes. No se cambian claves, unidades, defaults, fórmula ni pólizas en este corte. No es un fallo autenticado reproducido.

| Familia / input | Tratamiento propuesto | Prevención de doble conteo |
| --- | --- | --- |
| RC, daños propios, cargo y exceso con prima periódica | Partida fija sólo por cobertura/activo/territorio documentados; una prima combinada se carga una vez | Reconciliar paquete, carátula e inclusiones de renta/capital; no sumar ATRI a una póliza ya incluida |
| Remolque ajeno/intercambio | Identificar propietario, custodio, transferencia, territorio y responsabilidad acordada | No presumir póliza común MX/US ni cobrar completo el mismo remolque a ambas líneas |
| Seguro cargo por embarque | Cargo separado sólo si la base contractual lo factura por viaje y no está incluido | RC por daños causados por carga no equivale a asegurar mercancía; identificar quién paga |
| Deducible y pérdida retenida | Riesgo separado con frecuencia/severidad y exposición sustentadas | Deducible no es prima; no dividirlo entre 12 ni sumar el límite asegurado como gasto |
| Financiación de prima | Identificar recargo y cobertura del precio publicado | No confundir mensualidad de caja con devengo ni repetir interés ya incluido |

La prima de flota normalizada pertenece al fijo; su contribución CFU requiere exposición de **esa misma cohorte** (días-vehículo/km y regla de asignación del tramo). Un costo fijo expresado por km no se vuelve CVU marginal por esa división. El comentario del motor reserva coberturas avanzadas para otra capa; **no demuestra integración completa de cargo, exceso o remolque** en el benchmark D2D. No se declara esa cobertura implementada.

## Ficha mínima por país y siguiente paso

Las dos fichas JSON conservan `null`: cohorte modelada, territorio, activos/custodia, cantidad, prima del plazo, plazo, límite/deducible, coberturas incluidas/excluidas, exposición, costo fijo y asignación al viaje. Son referencias públicas modeladas, **no pólizas XBF**, y no requieren inventar documentos privados. Sin soporte público comparable permanece `INCOMPLETE`.

Siguiente corte: overhead y exposición productiva; conciliar rubros ya publicados y eliminar solapes con nómina, activos y seguros. Después evaluar suficiencia del dossier por bloque antes de B2. No repetir indefinidamente búsquedas de una póliza ni declarar E1 completo por haber creado esta ficha.

Modelo recomendado único: **GPT-6.1 Sol · alto** para conciliación y pruebas; Astra no requerido. Recomendación de selector, no afirmación de cambio del modelo activo.

## Validación y rollback

Validación aprobada: **151/151 pruebas** —79 expediente/contratos/capital/inventario (16 nuevas de seguros) y 72 tasas/D2D—, typecheck API y `git diff --check`. Se reproducen normalizaciones, inconsistencia IMT, límites vs primas, separación de coberturas y dependencias reales de MX/US; fixtures sintéticos identificados, no cotización autenticada ni acceso a datos del negocio. Auditor canónico sin diferencias: 135/135, 3/47/85, cero adopciones. SHA de registro `595b2b388339bbe0d04d86df650d5f149ebbcbab6d8c7f9fd5e6adb710538f99`; requisitos `9c8510de32dbdd8a9a86f99f571f1e41171f683ce005106eeb26fbae1e46001d`. Plantilla B2 conserva SHA `cabfda00873356406d838306bfa87b912eccd9a6026449c0ebb26046acd8bd85`. Estas comprobaciones verifican documentación y aritmética, no calibración.

Rollback: retirar sólo este MD/JSON y su prueba nueva; restituir únicamente los textos añadidos de seguros en registro/plan/status. No borrar ni revertir archivos completos ya modificados por otros cortes. No migración ni acción compensatoria: DB/Neon, usuarios, Auth compartido, infraestructura, producción, despliegues, operaciones de negocio y consumo de IA de la aplicación intactos. Evidencia descargada permanece en scratch local; ningún PDF público alimenta automáticamente el motor.

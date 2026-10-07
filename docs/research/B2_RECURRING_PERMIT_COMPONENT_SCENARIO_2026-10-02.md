# B2 · componentes recurrentes de permisos, no presupuesto completo

Fecha: 2 octubre 2026. Trabajo local en D:, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`; cambios ajenos preservados. El cambio metodológico autorizado permite modelos prospectivos explícitos, no convertir costos desconocidos en cero.

## Resultado verificable

Se reutilizaron las fuentes y normalizadores existentes para incorporar cuatro componentes separados: IRP como ejercicio oficial de referencia 2,021.47 USD/año; UCR 2026 46 USD/año para una entidad modelada de 0–2 unidades; HVUT categoría V 550 USD/año; registro/inspección Texas de una caja compartida 101.75 USD/año. Total de estos componentes: 2,719.22 USD/año, 226.6016666667 USD/mes (226.60 sólo para mostrar). Tractor US: 218.1225; caja: 8.4791666667 USD/mes. UCR no se cobra por tramo ni por caja. No reconstruir el importe anual a partir del mensual redondeado.

Dos composiciones de contado unen cinco partidas previamente modeladas con estos cuatro componentes, sin rellenar ninguna familia canónica de permisos: 3,506.57 y 3,675.52 USD/mes mostrados, respectivamente bajo las dos hipótesis fiscales de la caja. Son sumas de componentes de modelos públicos heterogéneos, no costos observados, límites inferiores, presupuestos completos ni precios D2D. No seleccionar, promediar ni sumar ambas alternativas. Cada composición conserva tres recursos y una sola caja. No se agregó el pool administrativo.

Presupuesto original: cero filas completas; presupuesto base revisado: dos; escenarios cash con seguro MX: cinco. Los cuatro componentes nuevos NO son cuatro familias completas adicionales. `completeFixedBudgetUsd`, `completeD2DCostUsd`, CFU, CVU y precios permanecen null; calibraciones y adopciones: cero. B2 sigue abierto hasta la estimación integral del piloto DF–Fort Smith vía Puente III, relevo propio MX/US y misma caja, contado/financiado.

## Benchmark y decisión

1. Cálculo IRP por jurisdicción y perfil: preferible para una tarifa compatible, pero aún incompleto; no sustituir APVD o distancias de una flota por porcentajes de un único viaje. No afirmar que Texas 840 USD es el total.
2. Ejercicio oficial IRP 2026: reutilizar como componente prospectivo explícito y reproducible. Se eligió esta referencia parcial, sin nueva infraestructura ni llamadas pagadas. Fee Test 2 representa un Kenworth 2022 distinto del Cascadia 2021, compra 136,000 USD/factory 141,000 USD y 1,000 unidades de distancia en cada una de 59 jurisdicciones. La suma usa los valores USD del reporte Texas, sin otra conversión CAD. Las instrucciones excluyen cargos administrativos y misceláneos de la jurisdicción base: siguen desconocidos.
3. ATRI costo por milla: descartado como sustituto del registro. El formulario público 2026, página física 2, pregunta 3, excluye truck registration y CDL de Permit Costs. Es un instrumento de recopilación en blanco, no una prima/tarifa observada; no trasladar esa definición automáticamente a todos los informes históricos.

Las instrucciones IRP (páginas 1–2) y el formulario ATRI (página 2) se leyeron y comprobaron visualmente. Investigación pública de inspección MX no produjo una tarifa primaria fechada y compatible con semirremolque seco 53′: tarifas de tanques LPG, fabricación de placas, directorios y rangos secundarios no se adoptaron. El overhead público existente tampoco constituye un pool completo: roles, escala y reparto deben ser explícitos; nómina mezclada o costos indirectos de alcance ambiguo no sustituyen administración.

Fuentes reutilizadas:

- [Instrucciones oficiales IRP 2026](https://cdn.ymaws.com/www.irponline.org/resource/resmgr/fee_test/2026_fee_test_instructions.pdf): archivo `sources/IRP_FEE_TEST_INSTRUCTIONS_2026_REVIEW_20261001.pdf`, SHA256 `baebfaf03c2236421161cc328bcc808a082961f5eb85339e1dbbd48020513701`.
- [Formulario motor carrier ATRI 2026](https://truckingresearch.org/wp-content/uploads/2026/02/2026-Ops-Cost-Motor-Carrier-Form.pdf): archivo `sources/ATRI_MC_FORM2026.pdf`, SHA256 `a9be75541e94c031f71f4a7081cd06eab39bcea165202eddad199998ed8ad5d9`.
- Política nueva: `B2_RECURRING_PERMIT_COMPONENT_SCENARIO_2026-10-02.json`, SHA256 `f3c94f8a627a3a9a267c8bac8a20f0f8753fe103d799976d0e5b36a6e224fae5`. La consolidación contiene 52 documentos fijados. Las fuentes originales y valores IRP/UCR/HVUT/caja conservan sus verificaciones anteriores.

## Verificación y límites

492 pruebas PASS en 16 archivos después de la última corrección; typecheck estricto de consolidación y nuevo test PASS; readback de subtotales, recursos, baseline y salidas null PASS. Pruebas cubren cardinalidad, periodo, UCR, categoría HVUT, duplicados IRP, suma, exclusiones, conservación por recurso, caja única y rechazo de archivos alterados. El primer pase falló en una expectativa existente por dos identificadores del mismo PDF IRP; se preservó el identificador canónico y se repitió la regresión completa. No era pérdida de comprobación de hash. Typecheck de API fue comprobado en el corte anterior; no hubo cambios de `src` en éste. No pruebas autenticadas, producción, base de datos ni aceptación operativa.

Responsable y escritura: Codex únicamente. Recomendación: OpenAI GPT-6.1 Sol, esfuerzo high; modelo/esfuerzo principal efectivo no observables por herramienta, selector no cambiado. Claude/Fable considerados sin ventaja suficiente para esta integración determinista con contexto existente y faltantes de datos; no invocados. Sus ventanas Max x5, semanal, Fable, ruta incluida/extra y reposición son desconocidas actualmente; no inferirlas del catálogo o acceso histórico.

Lectura soportada de cuota Codex al inicio, aproximadamente 08:42:22 UTC (02:42:22 México): semanal 100% utilizada, próxima reposición visible 6 octubre 13:08 México; ventana cinco horas no disponible. Continuación con créditos ya autorizada previamente; no compras, reset ni activación de facturación. Tokens/cargos reales y equivalente de cuota por actividad no observables; no prometer costo cero. Sin reserva porcentual inventada. Límite previsto 25 minutos, una reparación por fallo diagnosticado; el límite de 09:07:19 UTC se rebasó durante recuperación de contexto y cierre de regresión/documentación. No se inició otro desarrollo después: cierre y entrega únicamente. Debe reevaluarse presupuesto antes del siguiente corte.

Fallos auxiliares: lectura de nombre supuesto inexistente corregida usando el documento disponible; diagnóstico de búsquedas literales en Windows; error de codificación al leer PDF corregido con UTF-8; alias de herramienta de dependencias no disponible, alternativa soportada; apertura web de PDF fallida, reutilizado original local verificado sin cadena de reintentos. Consumo de intentos auxiliares desconocido, no se cuenta como cero. No cambios de proveedor ni credenciales.

Siguiente: determinar escala pública de administración (consulta opcional enviada: una pareja vs diez parejas de tractores compartiendo administración), cerrar alcance de permisos y seguros territoriales, financiamiento de caja y capacidad/ciclo/costos variables; llegar al costo D2D completo. B3 selección–cálculo–guardar–reabrir con wireframes MARKSMAN después. Sin cambios UI en este corte.

## Rollback

Retirar sólo el helper `apps/api/scripts/lib/reference-recurring-permit-components.ts`, su test nuevo, política y esta ficha; eliminar de la consolidación su import, pin, comprobación de archivos, cálculo y dos campos nuevos (`recurringPermitComponents`, `partialFixedReferenceScenarios`), además de los párrafos de estado de este corte. Las dos imágenes de inspección local pueden conservarse como evidencia o retirarse individualmente. No restaurar archivos completos ni tocar cambios previos/ajenos. Sin migraciones, Auth, usuarios, Neon, datos externos, infraestructura, despliegues, operaciones de negocio o consumo de IA en la aplicación.

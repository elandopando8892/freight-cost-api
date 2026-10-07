# B2 — matriz por input y conexión con las fórmulas

## Resultado de negocio y límite

El objetivo sigue siendo estimar el costo completo de terceros D2D México DF–Fort Smith, Puente III, caja seca 53′, relevo propio MX/US y una misma caja. Este corte valida el vínculo **input/supuesto → benchmark → unidad → fórmula → destino económico**. No se investiga cada caseta ni se redefine B2 como documentación terminada.

Antes había una conciliación por 13 secciones, con listas de claves y componentes agregados. Ahora el mismo [conciliador](../../apps/api/scripts/reconcile-economic-model-inventory.ts) emite `canonicalInputMatrix`: una fila para cada una de las 135 claves consumidas, campo canónico, unidad, país y fórmulas consumidoras reales, estado histórico, alternativas públicas compatibles, normalización, fuentes fijadas, límite y brecha. No hay un segundo motor, API ni esquema de almacenamiento.

La cobertura se compara con `benchmarkRateRequirements('MX'/'US')`, no sólo con las etiquetas del documento. Omitir una clave requerida, cambiar país, unidad o tasa, o inventar una clave hace fallar el reporte. Los 79 expedientes de fuentes y el registro histórico se conservan; sus hashes son comprobados por la ruta CLI consolidada. La función que acepta un objeto suministrado no autentica ese objeto por sí sola.

## Revisión previa y decisión

Se reutilizan, después de inspección del checkout, ADR-009, el registro del 1 de octubre, el catálogo, el enumerador de dependencias, el conciliador y la integración pública del piloto del 3 de octubre. No se refrescan precios ni fuentes web en este corte.

- **Adoptar** las dependencias calculadas y el parser existentes: evitan mantener otro inventario manual divergente.
- **Adaptar** el conciliador existente con valores transferibles y fronteras explícitas: elegido; sin dependencia, proveedor o infraestructura nueva.
- **Rechazar** repartir tasas agregadas entre microinputs o rehacer cada tarifa carretera: da falsa precisión y no valida la composición económica.

La matriz y las conversiones son capacidades estándar; la composición binacional por recursos, responsabilidad y exposición conserva el proceso FCM. No se declara innovación para justificar otro motor.

Flujo: fuentes locales fijadas → inventario y dependencias → matriz por input → verificación aritmética → cierre de las fronteras económicas existentes → cálculo completo del piloto. No hay interfaz modificada; no corresponde crear un wireframe para esta salida analítica. B3 mantiene wireframes MARKSMAN para seleccionar/calcular/guardar/reabrir.

## Valores transferibles, no adopción ni calibración

Siete claves contienen nueve alternativas por país; esto **no** significa que sólo siete gastos tengan soporte ni que haya que investigar las otras 128 claves de nuevo. Familias de capital, seguro, administración, mantenimiento y llantas tienen componentes documentados, pero sus agregados no acreditan todas las microcantidades/precios del método detallado. `canonicalValue` permanece null: no se cargan bases ni defaults.

| Clave/country | Valor en unidad canónica | Transformación y frontera |
| --- | ---: | --- |
| Diesel MX / MX | 27 MXN/L | Precio nacional reportado del 25-sep-2026; no recibo de ruta |
| Diesel US Border / US | 1.573144571793 USD/L | 5.955 USD/galón US ÷ 3.785411784; PADD3 del 28-sep-2026, no precio fronterizo certificado |
| Tipo de Cambio / MX | 18.3688 MXN/USD | FIX observado 1-oct-2026, valoración de investigación, no liquidación |
| Tarifa Operador MX / MX | 0.183987108575 USD/milla | 2.1 MXN/km × 1.609344 ÷ FIX; remuneración vial anunciada, no costo patronal completo |
| Tarifa Operador US / US | 0.817 USD/milla | Agregado histórico 2024 de salarios/prestaciones de la cohorte seleccionada; no todos los incentivos/obligaciones |
| Rendimiento Cargado y Vacío / MX | 2.066457265664 km/L cada uno | 1000 ÷ 483.92; transferencia del modelo IMT 2025, misma tasa declarada, no dos mediciones |
| Rendimiento Cargado y Vacío / US | 3.358635288699 km/L cada uno | 7.9 × 1.609344 ÷ 3.785411784; referencia 2006–2008, transferencia declarada, no consumo actual del equipo |

Estos valores no son una canasta conjunta observada ni un benchmark actualizado a la fecha del viaje. El modelo público usa la milla internacional 1.609344; el adaptador canónico histórico conserva 1.60934. No se cambia silenciosamente esa precisión ni se afirma identidad de ambos adaptadores. La tarifa MX vial es sustituida por el paquete patronal del compositor público; no se suma encima de él.

Comprobación independiente a partir de unidades canónicas:

```text
Combustible MX USD/km = (27 / 18.3688) / (1000 / 483.92)
                     = 0.7113061277818911
Combustible US USD/km = (5.955 / 3.785411784)
                       / (7.9 × 1.609344 / 3.785411784)
                     = 0.46838803161687637
```

Ambos coinciden con las tasas del dossier del piloto. Alterar la tasa declarada rompe esta comprobación. La igualdad cargado/vacío queda marcada como hipótesis transferida; la matemática correcta no certifica su representatividad.

## Fronteras para no duplicar

- Mantenimiento y llantas: conservar tasas públicas como alternativa agregada; no inferir precios de filtros, posiciones, vidas o recapes. Componentes de familia se referencian por nombre, nunca como valor de una microclave.
- **DEF**: el método canónico incluye `reserve-def-urea` en mantenimiento; el compositor público ya calcula volumen y precio en fluidos operativos. La matriz marca expresamente el traslado a `CVU_OPERATING_FLUIDS`. No rellenar la reserva histórica y sumar DEF otra vez. No se cambia la fórmula histórica en este corte.
- Nómina/administración: un pool administrativo, operadores fuera de él; cuotas fijas patronales y remuneración variable disjuntas.
- Caja: mismo recurso físico y ciclo serial, una asignación fija; desgaste adherido compuesto sin segunda suma de caja.
- Riesgo, margen y financiación del pagador: conservar sus políticas y responsables separados. Falta de dato no significa cero.
- Peajes/cruce: inputs agregados del servicio, distintos de la base operativa. Su importe sustentado sí es necesario para un total completo; auditar cada plaza no es condición para validar el modelo.

## Qué falta para cerrar B2

No abrir 128 investigaciones ni nuevos sprints por clave. El costo integrado existente todavía conserva seis remanentes fijos, seis variables parciales y tres variables sin importe. Son fronteras de estos mismos paquetes:

1. Completar la canasta seleccionada de permisos, cobertura binacional/custodia y obligaciones fiscales/de instalación de servicios; no duplicar componentes ya incluidos.
2. Cerrar alcance patronal/viáticos y lubricación US, con inclusión, exclusión justificada o hipótesis pública explícita; no confundir un agregado con desglose observado.
3. Incorporar los inputs agregados del servicio: peaje, cruce/relevo y responsabilidad sobre mercancía.
4. Recalcular CFU/CVU/total y sensibilidad en vacío esperado de red y retorno vacío dedicado, conservando caja/administración únicas. Sólo un total que respete el alcance original cierra B2.

Referencia del cálculo actual: [integración económica del piloto](B2_PUBLIC_PILOT_COST_INTEGRATION_2026-10-03.md). Sus importes son componentes conocidos, no costo completo ni límite inferior certificado. Este corte no cambia sus cifras. `cfuUsd`, `cvuUsd` y `productiveCostUsd` completos siguen null; `quoteReady=false`, `calibrated=false`, cero adopciones.

## Verificación real y reparación mínima

La primera ejecución falló al recolectar tres suites: el enumerador importaba `engine.outputs`, que importaba el servicio de assumptions y exigía `DATABASE_URL`. Cero pruebas recolectadas; no se usó una base de datos para resolverlo.

Reparación necesaria y acotada en `engine.outputs.ts`: import de `ParamMap` sólo de tipo y consulta numérica local `map[key] ?? fallback`, exactamente la semántica previa de `getParam`. No cambia fórmulas, defaults ni el tratamiento de cero. El test prohíbe incluso inicializar Prisma, no sólo llamar a una tabla. Es separación de cálculo/persistencia, no tecnología nueva.

Después de la última modificación de código: **131 pruebas PASS, siete archivos**, 27.29s reportados: matriz18, presupuesto mensual12, piloto14, tasas17, inventario20, seguros16, corporativos34. Incluyen siete pruebas nuevas, metadatos/país/unidad/consumidores, conversión de galones/millas/FX, adulteración de tasa, cero/defaults, no fabricación de microvalores y no duplicación de DEF. Las pruebas de fórmulas con defaults son sintéticas, no datos económicos adoptados.

Typecheck estricto dirigido al script/test PASS, salida0. `git diff --check` del archivo versionado modificado PASS; aviso LF/CRLF, no error. Los archivos no versionados se comprueban aparte, no se finge que diff-check los incluye.

Readback de CLI real con `DATABASE_URL` y `STAGING_DATABASE_URL` ausentes: salida2 deliberada por incompletitud, 135 claves, 13 secciones, 79 pins, siete claves con alternativas explícitas, ningún default adoptado, outputs completos null. No requiere credenciales ni conexión. No se prueba UI, sesión, persistencia, preview, producción ni aceptación comercial en este corte.

Uso desde raíz del checkout: Node instalado `--import tsx apps/api/scripts/reconcile-economic-model-inventory.ts`. La salida JSON contiene matriz y verificaciones; no escribe bases. Salida1 significa uso/entrada/linaje/arithmetic inválidos; salida2 es reporte entregado con economía incompleta.

## Ejecución, consumo y rollback

Codex único escritor/integrador/verificador, elección humana conservada `gpt-6.1-sol/high`, 2-oct-2026 16:46:22UTC. Modelo/esfuerzo servido desconocido, sin cambio de picker afirmado. Claude puede ejecutar esta conciliación pero no está elegido; Fable no resuelve por capacidad una falta de datos y no se invoca. No probes, subagentes ni llamadas auxiliares.

Lectura automática Codex 3-oct-2026 04:07:37UTC: uso ordinario permitido, Pro, semanal16% utilizado/10080min, reposición Unix1791580450. Ventana5h, Claude/Fable y consumo/cargos atribuibles desconocidos. No inferir dinero/cuota desde créditos ni inventar reserva porcentual. Se reserva trabajo de corrección limitando alcance y reintentos: global240h autorizado, contrato80pasos/contexto6500bytes, cero reintentos de proveedor, hasta dos reparaciones locales diagnosticadas antes de reevaluar; una usada. No deadline nuevo ni activación de pagos.

Registro de alcance: `canonical-input-formula-matrix.json`, detenido tras el fallo de import; siguiente contrato `canonical-input-formula-matrix-pure.json`, mismo sprint `b2-closure-240h-20261002`, lease `e31d20cab4b545d3a908a514d0a44c8a`. Ambos conservan la elección; el registro no demuestra un modelo servido distinto ni un bloqueo del objetivo. El cierre registra pruebas y libera el escritor.

Raíz física D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama `codex/cost-tires-release-s14`; HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, revalidados. Sin rama/worktree/commit/PR/deploy, fuentes históricas modificadas, SQL, Auth, usuarios, infraestructura o negocio.

Rollback selectivo: retirar sólo nuevos hunks de matriz/test y este documento si no contienen cambios posteriores; restaurar únicamente el import/wrapper anterior de `engine.outputs.ts`, no el archivo entero. Hashes previos al corte: conciliador `5e70355b72d808f3ef4f9f29697fb00118b39808474444bfaf9b938eb9558e90`, test `4db0e5c6886f56fa5483e15b57e2005ed6ca7fe001e8bde01f14be2d796baa87`, outputs `08942ae45d68d1fb8d44ddd11f19a391550e774a929c888b015de4704609f97d`. Preservar trabajo ajeno; ninguna reversión externa ni reset global requerido.

Ahora se puede localizar qué input consume qué fórmula y dónde termina su evidencia, sin confundir inventario documentado con base calibrada. **B2 sigue activo e incompleto** hasta la estimación completa del piloto.

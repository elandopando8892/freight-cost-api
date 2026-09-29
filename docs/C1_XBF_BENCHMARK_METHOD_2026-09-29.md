# XBF — método de benchmark y conexión al motor

Objetivo confirmado por el usuario: estimar el costo de transportistas terceros según segmento operativo, usando supuestos e inputs económicos sustentados con fuentes públicas; los datos de cada viaje se capturan después. No se requiere convertir a XBF en propietario de los activos ni disponer de una cotización privada para investigar una estimación.

## Cambio implementado

El auditor C1 exige ahora un propósito explícito. `audit:c1:quote-readiness` conserva la inspección de flota; `audit:c1:xbf-readiness` usa `THIRD_PARTY_BENCHMARK`. El resultado v3 rechaza la aptitud para XBF incluso cuando una base de flota tiene perfil válido y 210 parámetros. Distingue `modelMatchesPurpose`, aptitud estructural y `economicCalibrationVerified=false`. La alternativa de compra se identifica como `FCM_THIRD_PARTY_FLAT_V1` con aptitud no evaluada, sin convertirla en benchmark.

Esto es una corrección del diagnóstico y del criterio de aceptación, no la implementación completa del adaptador económico ni una calibración. No modifica el motor productivo, parámetros, bases, versiones ni precios.

## Reutilización decidida a partir del código actual

| Pieza existente | Decisión | Aplicación |
| --- | --- | --- |
| `engine.outputs.ts` | Adaptar | Reutilizar derivación de costos mensuales y mantenimiento/llantas por distancia con parámetros del transportista modelado, país, activos y fuente explícitos |
| `engine.mex.ts`, `engine.usa.ts`, `engine.drayage.ts` | Adaptar según alcance soportado | Calcular CFU/CVU por tramo y ciclo, sin duplicar activos o cruce entre proveedores; no asumir que Drayage USA soporta MX |
| `engine.commercial.ts` | Mantener separación | Costo productivo, riesgo y margen del transportista no equivalen automáticamente a compra de XBF ni a margen de venta de XBF |
| `third-party-cost.ts` y `PartnerTariffBase` | Reutilizar para compra observada | Sumar tarifas capturadas e inclusiones; su `USER_SUPPLIED_UNVERIFIED` no acredita una fuente pública ni una tarifa comercial verificada |
| Perfil de flota histórica XBF-XB-PILOT | Conservar | No rellenarlo con un perfil de flota propia para pasar el guard; no cambiar la interpretación de sus cotizaciones históricas |

La revisión de `engine.outputs.ts` también confirma defaults y una correspondencia histórica de PUs de llantas para paridad workbook. Un adaptador de benchmark debe exigir inputs completos y política explícita; no debe presentar esos defaults o la paridad histórica como evidencia calibrada.

## Contrato que falta para el siguiente incremento

1. Identificar segmento y responsables por tramo: D2D con intercambio MX/US (y sentido inverso), empresa binacional, transbordo, MX Drayage, Intra-Mex o Local MX. Cada variante define quién posee/utiliza tracto, remolque, patio y cruce. La familia inicial de implementación será D2D con intercambio; las demás conservarán estado de cobertura explícito.
2. Asociar a cada tramo un perfil económico del transportista de referencia. Para cada parámetro: key canónica, unidad/moneda, valor o rango, país/equipo/cohorte, fuente pública y localización exacta, fecha de observación, periodo de aplicabilidad, transformación, limitaciones y estado de revisión. Ningún valor faltante se reemplaza por cero o por un default silencioso.
3. Mantener en la base los costos de capital, empresa, seguros, mantenimiento, nómina y llantas; los supuestos GENERAL_BASE, LABOR y UTILIZATION fijan su asignación. FUEL conserva fuente, fecha, unidad y rendimiento compatible. FINANCE, RISK y TECHNICAL_MARGIN mantienen tratamiento y responsable explícitos. Los cargos de cruce, transferencia, transbordo y peajes se cuentan una sola vez según inclusión.
4. Mantener en el viaje origen/destino, distancia cargada/vacía, duración, esperas, equipo, fecha y FX aplicable. Conservar la procedencia de distancia y peajes junto a la versión económica usada.
5. Emitir CFU y CVU por tramo, conceptos adicionales, costo productivo estimado, riesgo y rango de tarifa del transportista cuando exista sustento. Identificar el resultado como benchmark estimado, con linaje y faltantes. Una tarifa de compra observada y un precio de venta XBF son resultados distintos y no se sobreescriben con esta estimación.

La investigación pública puede sustentar costos y rangos comparables; no prueba por sí misma el precio pactado con una línea. Tampoco un precio spot completo demuestra el desglose interno CFU/CVU. Estas diferencias deben sobrevivir al cálculo y al almacenamiento, no quedar sólo en una nota.

## Validación y alcance del corte

20/20 pruebas focalizadas (`c1-operating-model` y `c1-quote-readiness`) y typecheck API aprobados. Incluyen rechazo de propósito desconocido, base ambigua, perfil de flota completo usado para terceros y ausencia de afirmación de calibración. Los fixtures son sintéticos y no constituyen parámetros del benchmark.

Auditor ejecutado contra Neon staging verificado `broad-art-99750179/neondb` a las 05:14:34 UTC del 29 de septiembre: una base XBF-XB-PILOT, v1 PUBLISHED/activa, 210 parámetros, perfil ausente. Resultado v3: `targetCandidateForNewCalculation=false`; bloqueadores `APPLICABILITY_PROFILE_MISSING`, `OPERATING_MODEL_MISMATCH`, `THIRD_PARTY_BENCHMARK_ADAPTER_NOT_IMPLEMENTED`. Salida 1 esperada por inelegibilidad; consulta READ ONLY, `writesAttempted=false`. La completitud estructural y la adaptación metodológica son pendientes distintos.

Sin cambio de UI en este corte. El futuro formulario de benchmark deberá acompañarse de wireframe conforme al requisito del usuario. No se desplegó ni se activó una base. Rollback local: revertir el commit de este auditor/documentación; no hay mutación de datos que revertir.

Modelo/esfuerzo recomendado: Astra alto para el contrato económico y su adaptación al motor; Luna alto para recopilar y normalizar fuentes públicas bajo ese contrato, con revisión de comparabilidad antes de adoptar valores. No se ejecutó investigación nueva ni se declara inventario calibrado en este corte.

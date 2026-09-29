# Escenarios locales de depreciación de capital

Inicio `ef486881478c481d2be78ed23d73e8c3fb7b7d76`, rama `codex/cost-tires-release-s14`, worktree limpio en D:. Modelo recomendado: Astra alto para reglas y revisión. No hubo cambio de selector ni delegación.

## Entregable

`calculateCapitalScenarios` recibe un activo, país, condición NEW/USED, costo de adquisición USD y hasta veinte escenarios independientes de horizonte en meses y residual USD. Cada input económico conserva fuente y derivación. Reutiliza el contrato de evidencia del benchmark; no incorpora defaults ni porcentajes de empresas como constantes del motor.

Calcula (costo − residual) / horizonte para cada escenario. NEW exige FROM_NEW; USED exige REMAINING_FROM_ACQUISITION. No deduce vida restante por año modelo. Esta declaración obliga a explicitar el alcance, pero no demuestra que la duración declarada sea correcta: la revisión económica sigue pendiente.

Comprueba referencias, país y vigencia de fuentes utilizadas, duplicados, horizonte entero positivo, residual no superior al costo y rango numérico seguro. Si cualquier escenario falla, la salida del conjunto queda INCOMPLETE, sin resultados parciales que puedan parecer aprobados. Un contrato mal formado provoca error de validación estructural.

Salida válida: SCENARIO_ONLY, DOCUMENTED_UNVERIFIED, calibrated=false. monthlyFixedUsd y cfuUsd permanecen null. No promedia escenarios ni elige uno automáticamente. Redondea depreciación mensual a centavos; no es calendario de amortización ni reconciliación del último periodo.

## Validación

95/95 pruebas focalizadas, incluidas 11 nuevas de escenarios. Typecheck API PASS. Cobertura nueva: separación de escenarios, usados con horizonte restante, plazos inválidos, residual excesivo, referencias/país/vigencia, IDs duplicados, overflow, unidades y totales inyectados. Los importes de las pruebas son sintéticos, no ofertas adoptadas. git diff --check.

## Alcance y continuidad

Función pura local, sin endpoint, UI o persistencia. No cambió Preview, Auth, infraestructura, bases, cotizaciones ni producción. No hay wireframe nuevo porque no se cambió UI. No se revalidaron fuentes externas en este corte; las referencias documentales siguen en C1_TRAILER_LIFE_RESIDUAL_2026-09-29.md.

Pendiente para CFU: costo puesto en servicio y aplicabilidad de horizonte/residual, financiamiento sin duplicar principal/depreciación, gastos asignables y utilización por remolque. Siguiente incremento útil: conectar una revisión de escenarios con esos faltantes explícitos; cualquier UI debe incluir wireframe. No se declara calibración terminada ni inventario general completo.

Rollback: revertir únicamente el commit local de esta función, sus pruebas y este documento; no hay datos remotos por restaurar.

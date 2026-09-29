# Composición local del fijo de remolque propio

Inicio `b944d156cfae846e34c416d1a35418d56aead0ed`, rama `codex/cost-tires-release-s14`, worktree limpio en D:. Modelo recomendado Astra alto; no se confirmó ni cambió el selector activo.

`calculateOwnedFixedScenarios` recalcula escenarios de capital mediante la función existente y suma, por escenario, interés mensual promedio explícito y tres conceptos obligatorios: seguros, permisos y gastos generales. Cada importe y la asignación exclusiva al remolque requieren referencias al dossier, derivación y validación de país/fecha. Los tres conceptos requieren cero documentado cuando no aplican; no se rellenan faltantes.

Cada escenario debe tener exactamente un input de financiamiento. La etiqueta INTEREST_ONLY_MONTHLY_AVERAGE identifica interés, no pago total ni amortización de principal. No se deriva un préstamo, tasa o calendario; la derivación del input debe justificar el promedio para el horizonte del escenario. El código comprueba forma/referencias, no autenticidad o corrección económica de esa afirmación. No se puede impedir que un usuario declare incorrectamente un pago como interés únicamente con validación estructural.

No acepta campos de principal, renta, totales externos o conceptos variables en esta composición. La depreciación se cuenta una vez. Costos expresados en USD/trailer-month y suma en centavos. El principal es flujo de caja, no un segundo gasto agregado sobre depreciación en este contrato. Arrendamiento sigue por ruta separada.

La salida permanece SCENARIO_ONLY, DOCUMENTED_UNVERIFIED y calibrated=false. cfuUsd=null: falta asignar utilización y viaje. No incluye costo de oportunidad del capital propio ni otros conceptos no representados; impuestos solo en la medida en que se documenten dentro de inputs. No es fijo universal completo ni una base aprobada. Un escenario inválido bloquea todo el conjunto.

## Validación y límites

107/107 pruebas focalizadas; 12 nuevas cubren suma, cero documentado, escenarios separados, faltantes/duplicados, referencias, vigencia, capital inválido, overflow y rechazo de principal/renta/totales inyectados. Typecheck API PASS. Fixtures sintéticos, no benchmark adoptado. git diff --check.

Función pura local, sin endpoint ni UI; no hay wireframe nuevo. No se cambió Preview, Auth, bases, infraestructura ni producción. No se revalidaron fuentes externas ni se inventaron tasas en este corte.

Siguiente paso: utilización explícita por remolque y conexión de estos escenarios al cálculo de asignación, con trazabilidad y faltantes visibles. Para evidencia económica siguen pendientes interés y gastos comparables; no sustituirlos por ceros de pruebas.

Rollback: revertir únicamente el commit de este corte. No existen escrituras remotas por revertir.

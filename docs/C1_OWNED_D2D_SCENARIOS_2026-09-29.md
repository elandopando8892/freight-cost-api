# Integración local de escenarios de remolque propio con D2D

Inicio `4780fad9ddb5e3fd9c83d58513d5a70f04cfd27f`, rama `codex/cost-tires-release-s14`, worktree limpio en D:. Recomendación Astra alto, sin cambio de selector ni delegación.

## Entregable

`calculateOwnedD2DScenarios` recibe inputs originales del fijo, contexto D2D y utilización/CVU del remolque. Recalcula el fijo con calculateOwnedFixedScenarios y llama al ensamblador D2D existente por escenario. No admite monthlyFixedUsd, contrato de arrendamiento ni totales externos en el bloque de remolque. El acuerdo OWNED se construye desde la declaración de asignación respaldada del fijo.

El remolque debe coincidir en identidad con capital y la fecha económica con D2D. Conserva el límite de 31 días por remolque-mes y país económico para fuentes de utilización. El ensamblador existente valida distancias/tiempos mínimos, tramos tractor-only, referencias, cargos fronterizos y suma CFU/CVU una sola vez. Cada escenario mantiene su resultado y linaje; no se promedian ni se seleccionan automáticamente.

Las fuentes reciben prefijos trip:, fixed: y capital: al componerlas; los IDs locales iguales no se sobrescriben. Las referencias del fijo calculado incluyen las fuentes de adquisición, horizonte, residual, interés y gastos. La asignación conserva referencias propias. La evidencia original permanece en lineage y fixed. El namespace no constituye verificación de autenticidad ni de suficiencia del documento.

## Validación y límites

129/129 pruebas focalizadas, incluidas nueve nuevas de composición: suma exacta de centavos, costo del remolque contado una sola vez, procedencia del fijo, aislamiento de IDs, identidad/fecha, faltantes, distancia, frontera, utilización y rechazo de inputs calculados. Typecheck API PASS. Fixtures exclusivamente sintéticos; git diff --check.

Un error bloquea la salida completa de escenarios. Estado SCENARIO_ONLY, calibrated=false, DOCUMENTED_UNVERIFIED; compra/venta null. Se trata de remolque propio compartido con dos tractores nacionales, no todas las modalidades. Hereda las exclusiones del costo fijo y del ensamblador D2D. No certifica cotización comercial ni benchmark calibrado.

Sin endpoint, UI, persistencia, Preview, Auth, infraestructura o producción modificados. No hay wireframe nuevo porque no cambia UI. No se investigaron ni adoptaron importes reales en este corte.

## Siguiente paso y rollback

La cadena matemática local ya conecta capital → fijo → asignación CFU y CVU → D2D. El siguiente paso útil es exponer una revisión de escenarios con wireframe y faltantes económicos visibles, y validar con evidencia pública suficiente antes de adoptar valores. No hace falta otro cálculo paralelo del mismo total.

Rollback: revertir únicamente este commit local; no hay escrituras remotas que restaurar.

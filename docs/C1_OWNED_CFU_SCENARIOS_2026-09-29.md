# CFU local por escenario de remolque propio

Inicio `64b91331bce501979cdb3a001658acc579a6ab7a`, rama `codex/cost-tires-release-s14`, worktree limpio en D:. Recomendación Astra alto; sin cambio de selector ni delegación.

## Entregable

`calculateOwnedCfuScenarios` recompone los costos fijos desde inputs originales usando `calculateOwnedFixedScenarios`. Añade cuatro inputs explícitos con unidades y evidencia: km productivos por remolque-mes, días productivos por remolque-mes, km totales y días del ciclo. La misma exposición se aplica a todos los escenarios, de modo que la comparación aísla diferencias de costo fijo.

CFU distancia = fijo mensual × km viaje / km productivos mensuales.

CFU tiempo = fijo mensual × días ciclo / días productivos mensuales.

CFU = máximo de ambos, mediante el helper existente. Muestra DISTANCE, TIME o TIE usando valores sin redondear para decidir y redondea resultados a centavos. No suma dos asignaciones del mismo activo. No acepta fijo ni CFU externo.

La exposición debe identificar el mismo activo y fecha del escenario. Verifica fuentes utilizadas, vigencia y referencias; utilización debe corresponder al país económico, mientras fuentes del viaje pueden ser MX o US por su carácter transfronterizo. Días productivos mayores a 31 bloquean para un solo remolque; no se interpreta como días de una flota. No valida geográficamente ruta, distancias, calendario mensual específico ni consistencia operacional de los denominadores. Las derivaciones deben justificar utilización/ciclo sin duplicar intervalos.

Faltantes, referencias inválidas, fijo incompleto o desbordamiento bloquean todos los resultados. Contratos mal formados y denominadores no positivos provocan error de esquema. La identidad declarada y las fuentes no prueban autenticidad ni suficiencia económica.

## Validación

120/120 pruebas focalizadas; 13 nuevas verifican tiempo/distancia/empate, activo/fecha, evidencia, datos faltantes, país de utilización, límite de días, errores del fijo, rango numérico y rechazo de totales inyectados. Typecheck API PASS. Datos sintéticos exclusivamente. git diff --check.

## Límites y continuidad

Salida SCENARIO_ONLY, DOCUMENTED_UNVERIFIED, calibrated=false. CVU, costo productivo total, compra y venta quedan null. Es CFU del remolque propio, no cotización D2D completa. Conserva el desglose y linaje del fijo. Sin endpoint, UI, persistencia, cambios de Preview, Auth, infraestructura o bases publicadas; no hay wireframe nuevo.

Siguiente integración: componer este resultado con mantenimiento/llantas y tramos D2D sin volver a capturar el fijo, acompañando cualquier pantalla nueva con wireframe. La investigación de utilización, interés y gastos comparables sigue pendiente; no utilizar fixtures como benchmark.

Rollback: revertir únicamente el commit local de este corte; sin datos remotos por restaurar.

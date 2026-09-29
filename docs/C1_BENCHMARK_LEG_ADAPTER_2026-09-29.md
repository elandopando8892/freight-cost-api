# Benchmark por tramo — primer adaptador económico

Fuente inicial: `b00a498c3bb4b0f05fd5e50e790fab48014c638e`, rama `codex/cost-tires-release-s14`, worktree limpio en D:. Modelo recomendado: Astra, esfuerzo alto. AGENTS de codex-home vacío; no se editaron archivos de UI.

Se implementó `calculateBenchmarkLeg` (`FCM_CARRIER_BENCHMARK_LEG_V1`) como función pura local sin endpoint ni persistencia. Calcula el costo productivo estimado de un transportista de referencia, en un tramo doméstico MX o US, tractor/caja seca sencilla, viaje sencillo. Requiere inputs derivados explícitos en USD y km; no carga defaults ni adopta los 210 parámetros históricos. No habilita D2D completo, transbordo, reefer, hazmat, flatbed ni otras modalidades.

## Conexión matemática implementada

| Output | Fórmula implementada |
| --- | --- |
| Distancia operacional | km cargados + km vacíos explícitos |
| Combustible | (km cargados / km por litro cargado + km vacíos / km por litro vacío) × USD por litro |
| Mantenimiento / llantas / operador | Distancia operacional × tasa documentada USD/km de cada concepto |
| CVU | Combustible + mantenimiento + llantas + operador + peajes explícitos |
| CFU por distancia | Distancia operacional × costo fijo mensual de flota / km productivos mensuales de la misma flota |
| CFU por tiempo | Días del ciclo × costo fijo mensual de flota / días-vehículo productivos mensuales de la misma flota |
| CFU | max(CFU por distancia, CFU por tiempo), reutilizando `allocateFixedCost` del motor MX/US |
| Costo productivo | CVU + CFU |

La extracción de `allocateFixedCost` conserva la operación `Math.max` del motor MX/US y la excepción Backhaul USA. No sustituye los denominadores históricos del motor existente. El adaptador nuevo exige denominadores con unidades explícitas, positivos y correspondientes al alcance de la flota modelada.

Los componentes monetarios se redondean a centavos antes de sumarse, de forma que el desglose publicado reconcilia con CVU y costo productivo. El costo fijo mensual, productividad y tasas son **inputs derivados**: aún falta un conversor desde parámetros canónicos revisados de capital, seguros, nómina, empresa, mantenimiento y llantas. Esta entrega no afirma que ese conversor o la calibración de esas secciones estén terminados.

## Evidencia y límites del resultado

Cada input tiene unidad, derivación y referencias; cada evidencia contiene URL HTTPS, ubicación exacta, fecha de observación, vigencia, país, equipo y limitaciones. La función comprueba fechas, país/equipo, referencias existentes y unicidad de IDs. Input `null` produce `INCOMPLETE` con el campo faltante y sin costo; un cero requiere evidencia igual que cualquier otro valor. Esquema inválido (unidad, fecha, denominador o equipo) se rechaza; overflow produce resultado incompleto.

No se consulta la URL ni se acredita autenticidad/comparabilidad sólo por recibirla. El resultado conserva `DOCUMENTED_UNVERIFIED`, `calibrated=false`, linaje completo y `purchaseCostUsd=null` / `sellPriceUsd=null`. Excluye cruce, intercambio, transbordo, impuestos, riesgo y márgenes. Tampoco contiene conversión FX automática: todo input USD debe documentar su normalización antes de entrar.

El auditor XBF reconoce ahora `LEG_ONLY_NOT_INTEGRATED` y mantiene el bloqueo `THIRD_PARTY_BENCHMARK_ASSEMBLY_NOT_IMPLEMENTED`. Completar un tramo no vuelve elegible la base histórica ni una cotización comercial.

## Verificación y siguiente entrega

90/90 pruebas focalizadas: adaptador (14), motor (45), aplicabilidad (11) y auditores C1 (20); typecheck API aprobado. Incluyen reconciliación manual 107 CVU + 100 CFU = 207 USD con fixtures sintéticos, selección tiempo/distancia, evidencia ausente/vencida/futura/de otro país, cero documentado, separación MX/US, unidades, fechas y overflow. Los importes y example.org son fixtures de aritmética, nunca benchmark investigado.

Siguiente entrega: convertir el inventario canónico revisado a tasas por país y alcance; después componer tramos con asignación explícita de activos, cruce e intercambio. La UI deberá tener wireframe antes de implementarse. No se cambió producción, Auth, bases o parámetros; no se desplegó. Rollback: revertir únicamente el commit de este adaptador y su extracción equivalente, sin cambios de datos.

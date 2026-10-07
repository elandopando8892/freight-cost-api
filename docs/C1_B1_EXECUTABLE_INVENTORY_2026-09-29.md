# B1 · inventario ejecutable y salida económica pendiente

Fecha: 29 sep 2026. Checkout: `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`. Rama: `codex/cost-tires-release-s14`. HEAD previo al corte: `4f5fc2de0c3d178dace917231e1092040dec21fd`. Se conservaron los tres documentos modificados y ocho documentos nuevos presentes al inicio; no se hizo reset, commit, push o despliegue.

## Entregable de este corte

La relación **key → país → sección/unidad → tasa CFU/CVU → referencia documental → faltante para adoptar** deja de depender de un conteo manual. El auditor lee el registro B1 y enumera nuevamente las dependencias del motor. El reporte completo identifica qué entradas bloquearían cada tasa; el modo `--check` resume las trece secciones por país y devuelve error ante deriva de la documentación.

No se investigaron nuevas fuentes en este incremento ni se incorporaron importes. El alcance del enumerador es `TRACTOR_AND_TRAILER`, como el inventario previo, **no** una confirmación de tenencia del remolque en el piloto. Cambiar ese alcance exige conciliar de nuevo las dependencias.

## Resultado reproducido

| Inventario | Claves exigidas/documentadas | Candidatos condicionales | Contrastes | Sin evidencia suficiente | Adoptados |
| --- | ---: | ---: | ---: | ---: | ---: |
| MX | 132 / 132 | 2 | 44 | 86 | 0 |
| US | 131 / 131 | 1 | 44 | 86 | 0 |
| Unión de keys | 135 / 135 | 3 | 45 | 87 | 0 |

Las filas compartidas no se suman dos veces en la unión. La evidencia MX no satisface una obligación US. Cero filas sin documentar significa que todas tienen una clasificación/localizador/faltante, **no** que tengan respaldo adoptable.

El reporte por tasa identifica **80 entradas del fijo mensual sin evidencia suficiente en cada país**. También faltan las dos entradas de km productivos, las tres de días-vehículo y los dos rendimientos cargado/vacío por país; existen solapes entre tasas. Mantenimiento (31), llantas (12) y operador (1) sólo tienen contrastes: el conteo cero en `missingEvidence` de esas tasas no significa cero bloqueos de adopción. Ninguna de las nueve tasas está calibrada por este auditor.

| Sección | Inputs MX / US consumidos | Estado económico y siguiente decisión |
| --- | ---: | --- |
| COST_CAPITAL | 11 / 11 | Sin respaldo comparable en el registro; fijar activo, tenencia, moneda/fecha, residual y financiación. |
| COST_COMPANY | 46 / 46 | Sin respaldo comparable; decidir apertura pública justificable o método agregado separado, nunca descomponer un total arbitrariamente. |
| COST_INSURANCE | 3 / 3 | Sin respaldo comparable; cobertura, unidad de póliza y asignación de prima. |
| COST_MAINT | 31 / 31 | Sólo contraste; no copiar un agregado a los 31 inputs ni confundir lubricantes/mano de obra con rubros adicionales. |
| COST_PAYROLL | 14 / 14 | Sin respaldo comparable; cohorte y dotación administrativa/cargas. |
| COST_TIRES | 12 / 12 | Sólo contraste; configuración, costo instalado y ciclo/recape, excluidos de mantenimiento. |
| FINANCE | 5 / 4 | MX: un candidato FX; el resto faltante. Identificar quién financia el capital de trabajo antes de asignarlo al carrier. |
| FUEL | 3 / 3 | Un candidato de precio por país; dos rendimientos faltantes. La vigencia y comparabilidad del precio no están aprobadas. |
| GENERAL_BASE | 5 / 5 | Sin respaldo comparable; cohorte y denominadores de exposición/productividad. |
| LABOR | 2 / 2 | Un contraste de operador y una carga social faltante por país; salario no equivale a costo por milla. |
| RISK | 0 / 0 | No consumida por estas fórmulas; no calibrada ni certificada. |
| TECHNICAL_MARGIN | 0 / 0 | No consumida por el costo productivo; margen, compra y venta permanecen independientes. |
| UTILIZATION | 0 / 0 | No consumida con ese nombre; la productividad sí se exige mediante GENERAL_BASE. No omitir el denominador. |

Viaje, ruta, peajes y eventos fronterizos requieren su evidencia aparte: esta auditoría no los declara cubiertos. Las referencias abreviadas de la matriz son localizadores documentales; el auditor no descarga ni autentica esas fuentes.

## Prioridad para avanzar B1, no abrir más micro-sprints

1. Resolver **fijo y productividad**: qué modelo de flota/activo describe la base pública de referencia, qué costos incluye y qué exposición divide cada costo. Mantener separados el método detallado y los controles IMT/ATRI hasta que exista una apertura reconciliable. Es la decisión que desbloquea B2; un join nacional de estaciones por sí solo no la resuelve.
2. Con ese alcance, sustentar CVU (labor, mantenimiento, llantas y consumo cargado/vacío) con benchmark público y transformaciones explícitas. Una hipótesis de referencia no puede etiquetarse como observación real del carrier.
3. Documentar el corredor/equipo/intercambio y cargos del caso demostrable, sin convertir una ruta sugerida en una decisión operativa. E1 sólo cierra con suficiencia económica para ambos tramos; no con más filas clasificadas.

Esto prioriza la revisión pendiente y no autoriza sustituir fórmulas, activar una base o usar importes agregados como microinputs. Si las fuentes no sostienen el método actual, el siguiente entregable debe ser una propuesta económica concreta y sus límites, no valores ficticios para satisfacerlo.

## Ejecución y significado de resultados

Desde la raíz del checkout:

```powershell
npm run audit:b1:inventory -w freight-cost-api -- --check
npm run audit:b1:inventory -w freight-cost-api
npm run test -w freight-cost-api -- tests/benchmark-evidence-inventory.test.ts tests/benchmark-rates.test.ts tests/benchmark-d2d.test.ts tests/benchmark-leg.test.ts
npm run typecheck -w freight-cost-api
git diff --check
```

El primer comando valida únicamente deriva documental (exit 0 si no hay diferencias). El segundo emite el reporte completo a stdout, sin escribir datos. Incluye hashes SHA-256 de registro y dependencias para identificar la entrada exacta revisada. `DOCUMENTATION_RECONCILED` siempre convive con `economicStatus=INCOMPLETE`, `calibrated=false`, `quoteReady=false` y cero valores adoptados. No es un gate de release económico.

Hashes obtenidos tras conciliar la fila documental CNE: registro `4897fdc1165382d5915446855663cb4a9f8e5efc8b870810515d8bd914911f86`; dependencias `9c8510de32dbdd8a9a86f99f571f1e41171f683ce005106eeb26fbae1e46001d`. Son identidad del artefacto/local contract, no autenticidad de la fuente pública. El reporte completo se parseó correctamente y un argumento no admitido devolvió exit 1.

Validación local: **104/104 pruebas**, incluidas 18 nuevas de conciliación, aprobaron; typecheck API y `git diff --check` aprobaron. El auditor devolvió cero incidencias documentales. Las pruebas nuevas bloquean cualquier acceso a Prisma; el CLI fuerza los selectores de DB del proceso a un destino localhost no conectable antes de enumerar, sin consultas, servidores o escrituras. No contiene llamadas de red.

Los contraejemplos cubren ausencia/duplicados de keys, país equivocado, unidad/sección/tasa divergentes, dependencia añadida/retirada y estados de adopción inválidos. Aun haciendo todos los renglones candidatos, el reporte no declara aptitud económica. La guía de estrategia de pruebas se aplicó a integridad y deriva del inventario, no a una prueba autenticada ni a verificación independiente de fuentes.

## Cambios, límites y rollback

Código nuevo: `benchmark-evidence-inventory.ts`, su prueba y `reconcile-benchmark-evidence.ts`; comando nuevo `audit:b1:inventory` en `apps/api/package.json`. Se actualizó exclusivamente la fila documental CNE que aún decía enero, conforme al corte existente que había verificado febrero, y su siguiente paso ya realizado. Plan/estado enlazan este entregable.

Sin UI nueva (no corresponde wireframe), endpoints, fórmulas, DB/Neon, usuarios, Auth, infraestructura, IA del producto ni despliegues. No hay aceptación operacional remota ni valor económico nuevo: **B1/E1 permanecen abiertos**.

Rollback: retirar únicamente los tres archivos de código/prueba/script de este incremento, el comando npm y este documento/enlaces. Revertir sólo las líneas añadidas/modificadas del registro y plan/estado, conservando sus cambios previos. No aplicar un reset del worktree; no existe dato externo que restaurar.

Modelo recomendado para este incremento: **GPT-6.1 Sol · esfuerzo alto** (conciliación, implementación y revisión local). Próxima revisión de fijo/productividad: GPT-6.1 Sol · alto; solicitar Astra · alto sólo si la decisión económica no puede resolverse con una apertura defendible. Luna · alto para extracción pública puntual. Son recomendaciones de selección, no una afirmación de haber cambiado el modelo de este chat.

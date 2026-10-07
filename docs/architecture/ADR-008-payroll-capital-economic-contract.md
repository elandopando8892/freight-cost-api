# ADR-008 — Contrato económico por país, nómina y activo

**Estado:** Proposed para integración económica; contrato local implementado para validación de estructura.

**Fecha:** 2026-09-29.

**Decisores:** responsable de producto XBF para suficiencia y adopción económica; ejecución local autorizada por la continuidad del usuario. No se exige segundo revisor.

## Resultado y alcance

Se concreta el pendiente metodológico de [comparadores de nómina/activos](../research/B1_MX_US_PAYROLL_ASSET_COMPARATORS_2026-09-29.md) mediante `FCM_PAYROLL_CAPITAL_CONTRACT_V1`. Cada tramo declara país, cohorte, período, responsabilidades y exposición. La representación de un activo conserva su propio precio, residual, condición, vida y tenencia. La nómina administrativa y del conductor expresa si incorpora prestaciones/costo patronal.

Hay un [validador local](../../apps/api/src/modules/engine/benchmark-payroll-capital-contract.ts), contraejemplos ejecutables y una [plantilla MX/US](../research/B2_PAYROLL_CAPITAL_CONTRACT_TEMPLATE_2026-09-29.json) con todos los valores económicos en `null`. El resultado compatible significa exclusivamente que la representación pasó reglas locales. Siempre devuelve `calibrated=false`, `quoteReady=false`, cero adopciones y CFU/CVU/precios en `null`.

Esta pieza abarca capital, administración, conductor y denominadores. Seguros, corporativo detallado, mantenimiento, llantas, combustible, peajes, frontera y financiación operativa necesitan sus propios bloques antes de completar la vía de [ADR-007](ADR-007-public-reference-fixed-productivity.md). El contrato nuevo no cambia el conteo de 135 claves del método canónico ni se conecta a rutas API, pantallas o bases persistidas.

## Precisiones de la revisión anterior

1. `Rescue` **ya representa residual en la aritmética heredada**: `Qty Rescue × PU Rescue`. El nombre no prueba que sea un activo de rescate operativo ni un error de cálculo. Su equivalencia documental con residual por activo debe sustentarse en el set/version concreto.
2. `LABOR__Carga Social` es una clave común de catálogo, **no una única cifra global para MX y US**. Dos bases nacionales pueden tener valores distintos. El riesgo es copiar el mismo supuesto sin país/base de aplicación o añadir prestaciones a una remuneración que ya las incluye.
3. El período único heredado puede ser válido si la evidencia sustenta el mismo horizonte para todos los activos incluidos. No preserva dos horizontes diferentes. El contrato nuevo conserva la desagregación y no escribe esas vidas de regreso a una sola clave.
4. `assetValue × LTV × annualRate / 12` representa una aproximación del interés sobre capital financiado inicial. No es la cuota total del préstamo ni prueba el interés efectivo de un período. Se conserva en su método y se etiqueta como hipótesis cuando corresponda.

## Decisión de diseño

Adaptar los objetos con evidencia y unidades ya usados por `benchmark-leg` y el horizonte/residual explícitos de `benchmark-capital-scenarios`. Conservar `WORKBOOK_V3` y `FCM_BENCHMARK_RATES_V1` para sus entradas y versiones. Rechazar mezclar automáticamente una nueva vida por activo con el período único, o un overhead agregado con cantidades/precios administrativos individuales.

| Dimensión | Contrato mínimo | Control ejecutable |
| --- | --- | --- |
| Identidad | `country`, `cohortId`, `referencePeriod`, `baseRevision`, equipo y fecha del servicio | País/cohorte de las referencias, vigencia/fecha, revisión explícita sin defaults |
| Exposición | Cantidad de tractores, km totales de flota/mes y días-vehículo productivos/mes | Valores presentes/positivos, mismo período/cohorte, días no mayores a 31 por tractor y mes |
| Activo | Clase, ID del activo/cohorte, nuevo/usado, tenencia, responsable y cantidad de flota | Cantidad entera, tractores conciliados con flota, clases según alcance |
| Propiedad | Adquisición/residual por activo en USD, horizonte en meses y fundamento económico/contable | Residual ≤ costo, horizonte entero; vida restante para usado; calendario fiscal no sustituye vida económica |
| Financiamiento | Costo de interés mensual por activo con derivación | Interés identificado; cuota con principal rechazada; activo pagado no recibe financiación implícita |
| Renta | Costo mensual por activo y familias incluidas | Excluye adquisición/depreciación/interés adicional del mismo activo; detecta familias modeladas por separado |
| Administración detallada | Siete funciones canónicas, FTE, USD/FTE-mes, base salarial y beneficios | Cada función exactamente una vez; cero sólo con evidencia/supuesto explícito; FTE fraccional permitido |
| Administración conjunta | USD/flota-mes para nómina administrativa + corporativo | Excluye conductor, capital, primas, mantto., llantas, combustible, peajes y capital de trabajo; beneficios incluidos |
| Conductor | USD/km con base `WAGES_ONLY` o `EMPLOYER_TOTAL` | Sueldo requiere beneficios en la misma unidad; costo total no admite sumar beneficios nuevamente |
| D2D | Un contrato MX y uno US, misma fecha, asignación de activos explícita | Un ID compartido entre tramos exige asignación única externa; no cobrar completo dos veces |

Un ID de cohorte agregado de activos no demuestra identidad física. Antes de integrar D2D hay que documentar si el remolque es realmente el mismo, quién lo provee, quién lo paga y cuánto tiempo/distancia consume. Los IDs placeholder de la plantilla permanecen `UNRESOLVED`; no confirman dos remolques ni dos carriers observados. El control de IDs repetidos es necesario pero no basta para probar unicidad operacional.

La exposición usa **km totales**, cargados y vacíos, del mismo universo que los gastos. La variable heredada llamada `productiveKmPerMonth` deriva operadores × km promedio: requiere declarar si contiene vacíos antes del puente. Días de operación legales, porcentaje de vehículos vacíos en carretera y número nacional de tractores no sustituyen estos denominadores.

## Fórmulas de integración propuestas

Son reglas de diseño, aún sin ejecución de importes de benchmark en este módulo. Cada cantidad/rate requiere expediente y revisión de comparabilidad.

```text
Dep_i_veh_mes = (Adquisición_i − Residual_i) / Meses_i
Capital_i_flota_mes = Cantidad_i × (Dep_i_veh_mes + Interés_i_veh_mes)
Renta_i_flota_mes = Cantidad_i × Renta_i_veh_mes
```

Propiedad y renta son alternativas por activo. La adquisición representa costo puesto en servicio con tratamiento documentado de impuestos recuperables, transporte y acondicionamiento. IAS 16 identifica compra, impuestos no reembolsables y costos directamente atribuibles en el costo del activo; aquí se usa como referencia de frontera, sin afirmar un marco contable obligatorio para todos los carriers. [IFRS, IAS 16](https://www.ifrs.org/issued-standards/list-of-standards/ias-16-property-plant-and-equipment/).

```text
Admin_flota_mes = Σ FTE_rol × (Sueldo_rol_mes + Beneficios_rol_mes)
               o Σ FTE_rol × CostoPatronalTotal_rol_mes
Overhead_flota_mes = bloque conjunto revisado (alternativa a Admin + Company)
Driver_USD_km = Sueldo_USD_km + Beneficios_USD_km
             o CostoPatronalTotal_USD_km
```

Un salario anual o mensual sólo puede convertirse a costo/km con remuneración/cargas y exposición del mismo universo, más FX fechado cuando aplique. Dividir salario anual entre 12 no prueba USD/km. V1 acepta cantidades normalizadas con derivación explícita; no convierte automáticamente salarios públicos amplios. Tampoco impone una carga social universal.

Cuando estén cubiertas todas las familias y la asignación por activo:

```text
F_flota_mes = Capital_o_Renta + Primas + Admin_y_Company + OtrosFijosCarrier
CFU_distancia = Km_totales_tramo × F_flota_mes / Km_totales_flota_mes
CFU_tiempo = Días_ciclo_tramo × F_flota_mes / Días_vehículo_productivos_flota_mes
CFU_tramo = max(CFU_distancia, CFU_tiempo)
CVU_tramo = Combustible + Mantto + Llantas + Conductor + Peajes
```

La política `max` coincide con `fixed-cost-allocation.ts`; distancia y tiempo son dos asignaciones del mismo fijo, no sumandos. Es una política del modelo que aún necesita validación económica del piloto. Activos con exposición distinta, incluido remolque compartido, requieren asignación propia antes de sumar al tramo. Los componentes incluidos en una renta deben retirarse de las sumas separadas. Financiación de XBF, compra observada, venta y margen conservan objetos y responsabilidades distintos.

## Puente con los contratos existentes

| Representación anterior | Puente permitido al nuevo contrato | Información que falta para convertir |
| --- | --- | --- |
| Qty/PU Tracto o Remolque | Precio por activo y cantidad **de flota**, con units trazadas | Catálogo heredado usa cantidades por unidad económica que luego multiplica por flota; no trasladarlas directamente como conteo de flota |
| Qty/PU Rescue | Residual económico por activo/cohorte, si se confirma semántica | Evidencia de residual, equipo, condición y fecha; relación de cantidades con activos incluidos |
| Período Depreciación | Horizonte de cada activo si aplica a todos con sustento | Si son distintos, conservarlos en el nuevo método, no promediarlos |
| LTV × tasa × valor | Modelo de interés mensual con derivación y evidencia | Saldo/base financiada y razón de usar estimación inicial, promedio o saldo actual |
| `capital-scenarios` | Elegir un escenario identificado por activo; costo, residual y vida se conservan | Cantidad/responsable, tenencia, interés/renta y exposición; sensibilidad no es selección/adopción |
| Qty/PU de siete roles + Carga Social | FTE y costo por función, por país y cohorte | Definir base de prestaciones; conservar salario y costo patronal separados |
| Agregado EAT/ATRI | Contexto o bloque revisado en su método | Cohorte, familias y denominadores compatibles; no fabricar siete puestos desde agregado |

La versión canónica no se actualiza automáticamente ni acepta nuevos valores por pasar el auditor. Un adaptador futuro deberá conservar referencias, decisión de escenario, método y transformaciones; fallará si pierde país, familia, unidad, horizonte o responsabilidad.

## Opciones consideradas

| Opción | Complejidad / costo adicional | Evaluación |
| --- | --- | --- |
| Mantener sólo las claves heredadas | Baja; sin proveedor nuevo | Conserva compatibilidad, pero no expresa horizontes diferentes ni los alcances laborales/renta |
| Sustituir fórmulas y poblar parámetros desde salarios/políticas públicas | Alta; aumenta riesgo de versión y comparabilidad | Rechazada: el dossier todavía no sostiene los importes y se perderían límites de cohorte |
| Contrato versionado aislado + auditor + plantilla sin valores | Acotada; sin servicio, licencia ni infraestructura nueva | Adoptada para trabajo local: vuelve verificables las reglas antes de integrar/adoptar economía |

## Validación, pendientes y rollback

Pruebas sintéticas ejercitan país/cohorte/período, fuentes de contraste/fiscales, vida de usados, residual, financiación, renta, beneficios duplicados, overhead, conteos, exposición, unidades y activos compartidos. La plantilla de investigación debe seguir `INCOMPLETE`; un fixture compatible nunca certifica calibración.

El auditor lee un archivo local, escribe sólo su reporte a stdout y devuelve exit 2 para dossier incompleto; exit 1 para entrada/uso inválido; exit 0 sólo para compatibilidad estructural sin adopción. Ejecución desde `apps/api`:

```powershell
npx --no-install tsx scripts/audit-payroll-capital-contract.ts ../../docs/research/B2_PAYROLL_CAPITAL_CONTRACT_TEMPLATE_2026-09-29.json
npm run test -- tests/benchmark-payroll-capital-contract.test.ts tests/benchmark-capital-scenarios.test.ts tests/benchmark-rates.test.ts tests/benchmark-d2d.test.ts
npm run typecheck
npm run audit:b1:inventory -- --check
```

Evidencia local obtenida: **20/20 pruebas nuevas** del contrato y **82/82 pruebas existentes** de capital, tasas y D2D aprobadas; typecheck API y `git diff --check` aprobados. La plantilla produjo exit 2, `INCOMPLETE`, 13 incidencias estructurales por país y cero adopciones. Su SHA-256 es `cabfda00873356406d838306bfa87b912eccd9a6026449c0ebb26046acd8bd85`. Estas 13 incidencias no son el conteo completo de parámetros económicos faltantes: los campos dependientes de método/tenencia se revisarán al elegir esos métodos. Un argumento desconocido produjo la instrucción Usage y exit 1. El auditor canónico conservó 135/135 documentadas, 3 candidatas, 45 contrastes, 87 faltantes, cero adoptadas, sin incidencias documentales y hash de dependencias `9c8510de32dbdd8a9a86f99f571f1e41171f683ce005106eeb26fbae1e46001d`. No hay validación autenticada nueva ni calibración económica.

Próximo entregable dentro de B1: ficha de parámetros por activo/país/condición y remuneración total del conductor/administración, con un escenario público modelado explícito sólo cuando la fuente y el denominador lo sostengan. Priorizar precio/configuración, vida/residual y exposición por unidad; revisarlos contra la plantilla. Los importes siguen faltantes. B1/E1 continúan abiertos; B2 tiene esta pieza local, no dos bases económicas completas.

Checkout `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. AGENTS en la ruta C: mencionada por el usuario ya no existe; el archivo central `D:\andre\apps\codex-home\AGENTS.md` está vacío y no hay AGENTS aplicable en API/docs. Se conservan cambios ajenos.

Rollback: retirar sólo módulo, prueba, CLI, este ADR y plantilla creados en este corte; quitar sus referencias añadidas a plan/estado. No hay cambios externos que restaurar. No se modificaron los módulos activos de fórmula, Auth, DB, usuarios o despliegues. Al no cambiar UI, no corresponde nuevo wireframe; B3 conserva su entregable obligatorio de wireframes.

La guía de arquitectura organizó opciones, decisión, consecuencias y rollback. Modelo recomendado para diseño/implementación/revisión: GPT-6.1 Sol · alto. El runtime comunicado es GPT-6; no se afirma cambio automático de variante o esfuerzo. Astra no requerido para este contrato acotado.

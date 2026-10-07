# B2 · presupuesto y exposición consolidados, 1 octubre 2026

## Resultado y alcance

Antes había expedientes separados de capital, seguros, permisos y exposición. Ahora una proyección local reproducible reúne las **10 partidas del presupuesto**, sus referencias, faltantes y cálculos mensuales. Ofrece una suma condicional US y escenarios coherentes, conservando el presupuesto completo y CFU/CVU nulos. No es una base calibrada ni una cotización operativa. Este corte cierra la consolidación solicitada, **no cierra B2 ni el MVP**.

Caso conservado: México, DF → Fort Smith AR 72916 vía Puente III / World Trade Bridge; caja seca 53′, relevo propio entre tractores MX/US y la misma caja. No se infiere fecha de servicio, ciclo, carrier, deuda, propietario legal o reparto. El objetivo sigue siendo una **estimación de terceros sustentada en fuentes públicas**, no obtener contabilidad privada XBF ni reproducir costos reales de un transportista identificado.

Trabajo físico: `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`; rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Se preservan cambios previos. No se crea rama, commit, preview, PR o despliegue.

## Revisión previa y decisión

| Enfoque | Ajuste, costo y riesgo | Decisión |
|---|---|---|
| Sumar todas las observaciones como presupuesto | Rápido, pero duplica familias y mezcla moneda, cohortes, coberturas y periodicidad; alto retrabajo | Rechazado |
| Reutilizar expedientes, lector y conciliador con suma condicional separada | Sin servicio contratado, librería ni infraestructura nueva; conserva trazabilidad y permite explicar economía ahora | Adoptado para este corte local |
| Crear otro motor o una pantalla nueva | No resuelve los importes desconocidos; añade mantenimiento y retrasa la primera estimación | Diferido; el recorrido SaaS conservará wireframe MARKSMAN |

Referencias reutilizadas: [capital/seguros](B2_CAPITAL_INSURANCE_COMPONENTS_2026-10-01.md), [registro/permisos](B2_FIXED_REGISTRATION_COMPONENTS_2026-10-01.md), [exposición](B2_REFERENCE_PROFILE_EXPOSURE_2026-09-29.json) y [overhead](B1_OVERHEAD_EXPOSURE_BRIDGE_2026-09-29.json). Sus siete JSON de entrada están fijados por SHA-256 en el nuevo lector; no se reabre búsqueda genérica. Las capturas originales, fechas y restricciones permanecen en cada expediente. **No hubo actualización externa en este corte**; una reproducción posterior es una instantánea fechada, no verificación de vigencia.

El diferencial es la conciliación de recursos, supuestos y costos del relevo binacional. Hashes, normalización anual/mensual y asignación fija reutilizan mecanismos existentes; no requieren tecnología propia nueva ni sustitución de proveedores.

## Las diez partidas, en una sola vista

| Recurso / partida | Lo que sí está sustentado | Lo que impide completar la partida |
|---|---|---|
| Tractor MX · capital | Oferta Cascadia 2021: MXN 1,198,275.86 + IVA | Adquisición capitalizable, residual usado, horizonte restante e intereses |
| Tractor MX · seguro | Tres alternativas de ejemplo con prima anual, fecha y cobertura | Perfil/valor asegurado compatibles, territorio, tratamiento económico del IVA y vigencia |
| Tractor MX · permisos | Dos trámites y sus canales, tratados como expedición | Vigencia, aplicabilidad y presupuesto completo; no convertir expedición en renovación anual |
| Tractor US · capital | Oferta sleeper USD 40,495; pérdida bruta condicional calculable | Correcciones de adquisición/disposición, horizonte/residual validados e intereses |
| Tractor US · seguro | USD 926/mes: promedio nacional publicado para 2025, RC + daños | Modelo público compatible de equipo/territorio, coberturas y vigencia; no póliza real requerida |
| Tractor US · permisos | UCR por entidad/año, método IRP y apertura de autoridad separados | Año/bracket/registrantes, IRP y cumplimiento completos, reparto sin duplicación |
| Misma caja · capital | Oferta Utility 2021 53′: MXN 630,000 + IVA | Propiedad económica de referencia, residual usado, horizonte e intereses |
| Misma caja · seguro | Distinción cobertura propia vs custodia/interchange no propio | Prima, propietario/asegurado de referencia, continuidad territorial y ausencia de solapes |
| Misma caja · permisos | Token trailer Texas: USD 15/año de base si es elegible | Jurisdicción/eligibilidad, cargos completos y vigencia; no cobrar dos veces |
| Grupo · administración/empresa | Categorías públicas y exclusiones, un único fondo | Modelo monetario de igual alcance y reparto documentado; no repartir tercios por defecto |

El presupuesto conserva **0 de 10 importes completos**. Eso no significa ausencia de evidencia: significa que una pieza publicada no sustituye la familia económica completa. Las **15 condiciones** del conciliador son 10 importes, 3 perfiles, periodo y reparto; no son 15 claves ni sprints nuevos.

## Números visibles sin suma falsa

### US · referencia condicional, no observación de un presupuesto

Se suma únicamente para analizar un escenario: pérdida bruta del precio anunciado US + promedio nacional publicado de seguro. Une modelo ANL de 2019, exposición ATRI de 2024, seguro de 2025 y oferta observada en 2026. **No es una cohorte/periodo conjunto, un mínimo de costo ni importe elegible para adopción.**

| Uso analítico | Pérdida bruta USD/mes | Seguro supuesto constante USD/mes | Suma condicional USD/mes | km de referencia/mes | Asignación fija USD/km | Asignación fija USD/día |
|---|---:|---:|---:|---:|---:|---:|
| 0.8 × millaje histórico | 436.45 | 926.00 | 1,362.45 | 8,870.38 | 0.153596 | 61.005322 |
| 1.0 × millaje histórico | 469.78 | 926.00 | **1,395.78** | 11,087.98 | 0.125883 | 62.497819 |
| 1.2 × millaje histórico | 501.50 | 926.00 | 1,427.50 | 13,305.57 | 0.107286 | 63.918050 |

Los cálculos conservan precisión completa; la tabla redondea sólo la visualización. Cada millaje de sensibilidad alimenta **tanto** la retención adicional del activo como su denominador mensual. Los días permanecen 268/12 = 22.333333: no se afirma que cambien con el millaje. Seguro constante es un supuesto contrafactual, no una relación medida. El rango ±20% no es intervalo estadístico.

En el escenario central, los términos pendientes no son cero:

```text
C_US = 1395.7846208090596
       + (A_capitalizable_USD - 40495 + K_disposición_USD) / 36
       + I_mes_USD
       + Δ_seguro_compatible_USD
       + permisos_completos_USD
       + administración_empresa_asignada_USD
```

36 meses es sólo una ventana analítica no validada para la vida remanente. La prima compatible puede ser mayor o menor que 926; los ajustes de adquisición también pueden ser negativos. Por eso **1395.78 no es un piso de costos**. Principal de deuda no se agrega a depreciación + intereses. No añadir otra prima completa de daños/RC ni el agregado ATRI encima del paquete incluido.

### MX · alternativas de seguro, no suma con US

| Paquete del ejemplo Cascadia 2022 / valor asegurado MXN 2,018,000 | Prima bruta anual MXN | Equivalente promedio mensual MXN |
|---|---:|---:|
| RC | 22,771.95 | 1,897.66 |
| Limitada | 70,218.91 | 5,851.58 |
| Amplia | 130,784.01 | 10,898.67 |

Son alternativas publicadas por agente, no pólizas verificadas, ni primas de la oferta 2021. Incluyen IVA, derecho y descuento ya aplicado; no sumar paquetes ni añadir cargos nuevamente. Promedio mensual no es calendario de pagos. El otro ejemplo de valor MXN 1,835,000 queda en su expediente y no se mezcla. No se realiza FX ni se infiere cobertura en EE. UU./carga/caja.

### Registro · conservar su unidad

UCR mantiene **12 alternativas** por entidad/año (2026/2027), no por tractor o tramo; ninguna está seleccionada/asignada. USD 1.25/mes de token trailer es sólo la base normalizada de una caja elegible, no su partida completa. USD 300 de autoridad es un evento de apertura, **no USD 25/mes recurrente**. Ninguno entra en la suma US anterior.

## Puente hacia CFU y CVU

Se conserva `allocateFixedCost = max(distancia, tiempo)`. Para cada recurso con presupuesto y exposición compatibles:

```text
CFU_recurso = C_recurso * max(km_ciclo_recurso / km_mes_recurso,
                              días_ciclo_recurso / días_productivos_mes_recurso)
CFU_D2D     = CFU_tractor_MX + CFU_tractor_US + CFU_misma_caja
```

La caja usa **su ciclo completo y su propia exposición una vez**, no denominadores de tractor ni suma de máximos por tramo. Un fondo compartido se reparte antes de asignar CFU, conservando el total.

Para la **pieza condicional central US**, sólo si se acepta explícitamente el mapeo analítico de días operativos a productivos:

```text
Asignación_pieza_US = max(0.1258827031370747 * km_ciclo_US,
                         62.4978188421967 * días_ciclo_US)
```

No se introduce una distancia o ciclo de DF–Fort Smith para producir un importe aparente. Estos coeficientes **no son CVU marginal, costo productivo completo, tarifa de compra ni precio de venta**. El contraste IMT 2004 de MX sigue en 10,000 km/mes y 25 días operativos: no se presenta como utilización vigente de caja seca. Exposición de caja permanece desconocida.

CVU conserva sus fórmulas existentes de combustible, labor y mantenimiento/llantas variables; peajes y servicios incrementales se suman sólo según alcance documentado. No se mueve depreciación al CVU, ni riesgo/margen/financiamiento de capital de trabajo al costo productivo sin su política correspondiente. **CFU/CVU/D2D/compra/venta completos siguen nulos.**

## Cierre verificable y siguiente salida

La entrega cumple: una vista de diez partidas, referencias separadas por moneda/alcance, sumas condicionales y sensibilidad reproducibles, exposición específica por recurso, faltantes explícitos y rechazo de fuentes alteradas. Reutiliza lector de `docs` con comprobación de ruta física y conciliador actual. No cambia motor HTTP, parámetros canónicos, base de datos ni UI.

Validación: **74/74 pruebas** (21 nuevas, 30 del presupuesto y 23 de capital/seguros), typecheck estricto ESNext/Bundler y CLI real de consolidación PASS. CLI devuelve **exit 2 intencional** por economía incompleta, con 10 filas/15 condiciones, suma central 1395.7846208090596 y salidas completas nulas. Casos de asignación de pruebas son **sintéticos**, no viajes reales. No hay prueba UI/autenticada/persistida ni nuevo despliegue.

La cola queda agrupada por entregables, no por otra serie de búsquedas genéricas:

1. **Completar un modelo público explícito del presupuesto fijo:** residual/horizonte de tractor MX y caja; correcciones de capital US; compatibilidad de seguros; permisos y fondo de administración/empresa con unidad, inclusiones y reparto. Aceptar un supuesto documentado para un escenario no equivale a probar el costo real de un carrier. Todo valor sin evidencia permanece pendiente; no pedir historiales privados XBF.
2. **Cerrar exposición/ciclo y variables del caso:** denominadores propios y días productivos compatibles, retornos/relevo de caja, combustible/labor/mantenimiento/llantas y peajes/cruce con vigencia. Una distancia DRIVE no acredita ciclo de camión. La fecha de servicio sigue pendiente y será necesaria para evaluar vigencias.
3. **Una estimación extremo a extremo en SaaS:** CFU/CVU y costo productivo trazables; wireframe MARKSMAN antes de UI y prueba local de permisos, guardado y recarga. Publicación/producción exige autorización específica; no queda autorizada por este corte.

No se abre otro frente FX/Auth/ofertas. No hay decisión necesaria del usuario para revisar esta consolidación; el siguiente paso autorizado de desarrollo puede completar los términos públicos pendientes dentro del mismo B2. Si la evidencia no sostiene un término, se explicará el límite y una alternativa de modelo/rango, sin inventar precisión para aprobar el gate.

Modelo recomendado: **GPT-6.1 Sol, alto** para economía/compatibilidad; **GPT-6.1 Sol, medio** para empaquetado/QA dirigido. No se ha cambiado el selector ni medido tokens/precios; no se emplearon agentes ni IA de la aplicación.

## Reproducción y rollback

Desde la raíz física del worktree, usando el Node disponible en el equipo:

```powershell
& 'C:\Users\andre\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules/tsx/dist/cli.mjs apps/api/scripts/consolidate-binational-reference-budget.ts
```

El comando imprime un reporte JSON y no escribe archivos ni acepta precios/ciclos externos. Exit 2 = referencia incompleta esperada; exit 1 = error/integridad o uso inválido. La prueba de hashes impide recombinar silenciosamente fuentes modificadas; para una actualización se requiere otro corte documentado.

Rollback aislado: retirar únicamente `apps/api/scripts/consolidate-binational-reference-budget.ts`, su test `apps/api/tests/benchmark-binational-reference-budget.test.ts`, este documento y los dos párrafos superiores que remiten a él en estado/plan. Los siete documentos de entrada, el presupuesto, el motor y los cambios ajenos permanecen intactos; no ejecutar reset/limpieza global. No hay rollback externo porque no hubo DB/Auth/usuarios/infra/despliegue/negocio ni llamadas facturables.

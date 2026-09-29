# FCM · cierre del MVP por resultado de negocio

Fecha: 2026-09-29. Alcance: Freight Cost Model para estimar costos de transportistas **terceros** por modalidad operativa, con supuestos trazables y separando costo productivo estimado, compra observada y precio de venta XBF. Este corte sustituye la secuencia abierta de mejoras del calculador como prioridad del MVP; no cancela el trabajo técnico ya hecho ni declara terminados los gates C1/C2 de autenticación y release.

## Decisión de producto y demostración objetivo

La primera demostración de valor será **D2D caja seca MX → EE. UU. con intercambio entre una línea mexicana y una estadounidense, sin transbordo**. Debe permitir elegir una base versionada de referencia para cada tramo, capturar un viaje, ver CFU/CVU y cargos fronterizos una sola vez, entender fuente/vigencia/faltantes, guardar y reabrir una estimación identificada como benchmark. El resultado no se mostrará como tarifa de compra pactada ni como precio de venta. El sentido EE. UU. → MX debe recorrer el mismo contrato sin intercambiar indebidamente las bases nacionales.

La pantalla de remolque **propio** compartido hoy construida es una variante de investigación; no es requisito del primer piloto de XBF ni puede sustituir las bases de terceros. El piloto usa el contrato `FCM_CARRIER_BENCHMARK_D2D_V1` de dos tramos; primero debe confirmarse la tenencia/uso real del remolque en esa modalidad. Si no existe evidencia suficiente para remolque compartido, se ensaya el contrato separado sólo cuando corresponde físicamente, sin relabelar una operación para pasar una validación.

La decisión de negocio no requiere una tarifa privada para **investigar** el costo. Una tarifa de compra observada sí exige su propia procedencia y nunca se deduce automáticamente de costo productivo + margen hipotético.

## Corte de evidencia: qué existe y qué no

| Capacidad observable | Estado al 29 sep | Consecuencia |
| --- | --- | --- |
| Motor local MX/US, conversión de parámetros, CFU/CVU, frontera e intercambio | Implementado con pruebas sintéticas; `DOCUMENTED_UNVERIFIED` | Prueba aritmética/contrato, no calibración económica. |
| Formulario guiado y cálculo autenticado | Implementados **para escenarios de remolque propio**; sólo QA local en este HEAD | No es todavía el flujo piloto de dos transportistas terceros ni aceptación Preview. |
| Fuentes públicas para los inputs del piloto | Expedientes parciales; referencias agregadas no equivalen a valores específicos del tramo/activo | No hay permiso para poblar 210 parámetros ni publicar una base calibrada. |
| Base `XBF-XB-PILOT` en staging | v1 publicada sin perfil de aplicabilidad; auditor sólo lectura la rechaza | No usarla para una cotización nueva ni reinterpretar su historia. |
| Base de socios versionada | Cero bases observadas en Preview; hay captura manual de compra y QA histórica sintética | No hay tarifa reutilizable vigente ni evidencia de costo de terceros. |
| Auth y release | Login/recarga parcial en Preview anterior; renovación, denegación remota y candidato final pendientes | No hay aceptación operativa del MVP ni decisión de producción. |

Esto no es un porcentaje subjetivo de pantallas. La aptitud se reportará por los gates de abajo; **ningún gate de valor económico está en PASS**.

## Inventario de las 13 secciones para el piloto

Cada sección conserva sus claves canónicas; la tabla indica su papel, no da por revisados sus 210 valores. `SIN CALIBRAR` significa que en este corte no se verificó un conjunto completo, comparable y vigente de fuentes para **ambos** transportistas de referencia. Una fuente de contexto o un fixture no cambia ese estado.

| Sección | Decisión/input de base a sustentar | Destino en el resultado | Estado de salida |
| --- | --- | --- | --- |
| GENERAL_BASE | País, cohorte, tamaño de flota, activos y unidad económica del transportista de referencia | Denominadores y alcance de CFU | SIN CALIBRAR |
| COST_CAPITAL | Valor, tenencia, plazo, residual, financiamiento e inclusiones por tracto/remolque | CFU; impedir doble conteo de activo compartido | SIN CALIBRAR |
| COST_INSURANCE | Cobertura, prima y asignación de flota/activo | CFU | SIN CALIBRAR |
| COST_PAYROLL | Nómina administrativa y cargas atribuibles a la cohorte | CFU | SIN CALIBRAR |
| COST_COMPANY | Gastos corporativos atribuibles y prorrateo | CFU | SIN CALIBRAR |
| UTILIZATION | Km, días productivos, disponibilidad, relación tractor/remolque y vacíos de referencia | Asignación de CFU; no sustituye km/días del viaje | SIN CALIBRAR |
| LABOR | Remuneración y productividad del operador por país/cohorte | CVU o regla explícita de asignación | SIN CALIBRAR |
| FUEL | Precio oficial con fecha/región/moneda, rendimiento cargado/vacío y tratamiento fiscal | CVU por tramo | SIN CALIBRAR |
| COST_MAINT | Intervalos, costo exclusivo de tracto/remolque e inclusiones contractuales | CVU | SIN CALIBRAR |
| COST_TIRES | Configuración, precio instalado, vida, casco/recape e inclusiones por posición | CVU sin duplicar mantenimiento | SIN CALIBRAR |
| FINANCE | Costo de capital de trabajo y plazos del transportista modelado | CFU/ajuste explícito; no es automáticamente financiación XBF | SIN CALIBRAR |
| RISK | Riesgo incluido/excluido y responsable | Línea separada, nunca suma tácita al costo productivo | SIN CALIBRAR |
| TECHNICAL_MARGIN | Margen técnico del transportista y política de XBF, por separado | Rango de tarifa sólo si hay soporte; compra/venta siguen independientes | SIN CALIBRAR |

Además de las 13 secciones, **cruce, intercambio, peajes y datos del viaje** necesitan evidencia de ruta, proveedor, inclusiones, fecha y vigencia. `BORDER`/`COST_CROSSBORDER` y `CONFIG` aparecen en el checklist técnico; no desaparecen porque la pregunta de negocio enumere 13 secciones. Origen/destino, distancia cargada/vacía, tiempo, equipo y FX aplicable pertenecen al viaje o a su fecha, no se inventan como promedio fijo de la base.

### B1 iniciado: dependencias realmente consumidas

Se ejecutó el enumerador del propio motor `benchmarkRateRequirements` para `TRACTOR_AND_TRAILER`, sin consultar bases ni usar sus valores recomendados. Tras corregir una lectura innecesaria de gastos transfronterizos que estaban **excluidos** de ambos tramos domésticos, el piloto exige **132 claves canónicas MX y 131 US**. Son obligaciones de evidencia por país/cohorte, no 263 cifras adoptadas. Cada tramo deriva nueve tasas: fijo mensual (80 claves), mantenimiento/km (31), llantas/km (12), km productivos (2), días-vehículo (3), operador/km (1), diésel/litro (MX 2, US 1), rendimiento cargado (1) y vacío (1). Hay claves compartidas entre tasas; por eso la suma de conteos por tasa no es el total único.

Distribución de claves únicas: GENERAL_BASE 5, LABOR 2, COST_INSURANCE 3, COST_PAYROLL 14, COST_COMPANY 46, COST_CAPITAL 11, FINANCE 5 MX/4 US, COST_MAINT 31, COST_TIRES 12 y FUEL 3. `UTILIZATION`, `RISK` y `TECHNICAL_MARGIN` no son consumidas por este **costo productivo**; eso no las certifica ni significa que el producto final pueda omitir decisiones sobre productividad, riesgo o margen. `COST_CROSSBORDER` aporta cero claves a los costos domésticos; el cruce/intercambio se documenta como cargos fronterizos independientes. Antes de la corrección se exigían indebidamente 15 claves transfronterizas por tramo pese a multiplicarlas por cero.

Hallazgo de negocio: 46 conceptos de gasto corporativo y 31 de mantenimiento por país no se vuelven comparables por encontrar un índice sectorial agregado. B1 debe decidir y justificar si hay evidencia desagregada compatible o si hace falta una **metodología de agregados** distinta, conservando el linaje hacia CFU/CVU. No se rellenará el catálogo con promedios ficticios para pasar el contrato actual. Este hallazgo puede cambiar el diseño de B2; requiere revisión económica antes de usarlo para cotizar.

Validación del corte de dependencias: 72/72 pruebas focalizadas de tasas y D2D, typecheck API y `git diff --check` aprobados con una URL PostgreSQL deliberadamente no conectable; no se consultó Neon ni se ejecutó cálculo con una base real. El cambio conserva la aritmética cuando los costos transfronterizos están incluidos y omite sólo lecturas cuyo resultado ya era cero en los tramos domésticos. El enumerador se vuelve a ejecutar después de cada cambio de fórmulas para mantener esta matriz vigente.

## Sprints de cierre: terminar verticalmente, no por pantalla

Capacidad de planificación: un ejecutor técnico, con 25% de reserva para hallazgos; las duraciones son **estimaciones de trabajo**, no fechas ni trabajo automático en ausencia del usuario. Al final de cada sprint se entrega una demostración o un NO-GO con faltantes individualizados. Cambios de datos gobernados, Auth y producción requieren autorización puntual del objeto y entorno concretos.

| Sprint | Entregable de negocio y criterio de salida | Dependencia | Modelo recomendado / esfuerzo |
| --- | --- | --- | --- |
| B0 · Definir el piloto (este corte) | Escenario D2D terceros, separación de tres precios, 13 secciones y gates definidos; no confundir variante de remolque propio con MVP | Código/documentos actuales | GPT-6 Sol · medio |
| B1 · Expediente económico MX/US | Matriz **por parámetro usado** con valor/rango, unidad, país/cohorte, localizador de fuente pública, fecha/vigencia, transformación, limitación e inclusión; revisión de comparabilidad. Los faltantes quedan bloqueados explícitamente, no en cero. | B0; disponibilidad de fuentes comparables | GPT-6 Luna · alto para extracción; GPT-6 Astra · alto para revisión económica |
| B2 · Una base de referencia por tramo | Contrato y adaptación del motor para dos transportistas; CFU/CVU/cargos conciliados en un caso completo, con linaje y sin defaults. Pruebas con dossier revisado y contraejemplos de doble conteo. Activación/persistencia sólo tras aprobación específica. | B1 suficiente para piloto | GPT-6 Astra · alto para economía; GPT-6 Sol · alto para integración |
| B3 · Recorrido SaaS del piloto | Wireframe desktop/móvil y flujo comprensible: escoger bases, viaje, calcular, revisar faltantes, guardar y reabrir **benchmark**, sin presentarlo como compra/venta. Tres roles y tenant probados en candidato Web/API alineado. | B2; entorno de prueba autorizado | GPT-6 Sol · alto UI/integración; GPT-6 Astra · alto Auth/tenant |
| B4 · Decisión de salida | Demo de la modalidad piloto, expediente, comparación de magnitud, límites, QA autenticada, monitoreo y rollback; A1–A7 en PASS o excepción explícita. Producción sólo con autorización puntual del candidato. | B3 | GPT-6 Sol · medio paquete; GPT-6 Astra · alto revisión final |

Fuera del camino crítico del primer piloto: empresa binacional con el mismo activo, transbordo, MX Drayage, Intra-Mex, locales MX, hazmat, reefer y flatbed. Permanecen en el mapa de cobertura como **no aptos** hasta que su economía/operación propia esté implementada y calibrada; no se declara que el MVP ya las cotiza. El siguiente piloto se elige tras B4, no se abre por inercia otro sprint de editor.

## Gates que hacen verificable el avance

1. **E1 — Evidencia económica:** cada input que consume el cálculo piloto tiene fuente comparable, transformación reproducible y revisión; faltantes producen `INCOMPLETE`. Estado: BLOQUEADO.
2. **E2 — Resultado de costo:** dos tramos y frontera dan CFU/CVU auditables, sin doble conteo ni compra/venta inferida. Estado: PARCIAL local sintético; falta dossier revisado y persistencia gobernada.
3. **E3 — Uso de operador:** una sesión real calcula, guarda y reabre el mismo benchmark con versión/linaje, sin publicación/envío. Estado: PENDIENTE.
4. **E4 — Seguridad y release:** roles/tenant/renovación, mismo commit Web/API, móvil/escritorio y rollback comprobados. Estado: PARCIAL en Preview anterior; pendiente candidato final.

La regla de terminado es **E1–E4 PASS** para la modalidad piloto y evidencia enlazada a un único candidato. No se comunica porcentaje global hasta que el denominador represente entregables de negocio; al cierre de este corte: **0/4 gates completos**, con prototipos parciales en E2/E4. Este conteo no invalida el trabajo acumulado.

## Próxima ejecución concreta

Continuar B1 con la [revisión de fuentes públicas](C1_B1_PUBLIC_EVIDENCE_REVIEW_2026-09-29.md) y el registro canónico por cada key efectivamente leída por `benchmark-rates.ts` para MX/US. La revisión inicial encontró fuentes fechables candidatas para combustible, FX y algunos peajes; salarios, costos de operación y llantas sirven por ahora de contraste; el fijo mensual y gastos desagregados quedan insuficientes. El registro debe decidir por parámetro qué es comparable/adoptable y qué falta. Después comparar el método fijo detallado con alternativas de costo por milla antes de B2; no fijar ahorro, costo, precio ni activar una base antes de cerrar ese análisis.

Rollback de este corte: revertir este documento y el enlace en `SPRINT_STATUS.md`. No se cambiaron motor, datos, usuarios, Auth, infraestructura ni despliegues.

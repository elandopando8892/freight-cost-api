# B2 · conductor por distancia: referencia pública, no nómina completa

Corte local del 1 de octubre de 2026, cerrado documentalmente a las 22:53 MX. Objetivo B2 conservado: estimar el costo completo D2D de terceros México, DF → Fort Smith AR 72916 vía Nuevo Laredo/Laredo, caja seca 53′, relevo propio MX/US con la misma caja; CFU/CVU por recurso y fase, caja y administración una sola vez. Este corte no cierra ese objetivo ni publica una base cotizable.

## Antes, ahora y límite

Antes existían el puente de compensación y cinco referencias US históricas, pero no una proyección del componente salarial MX sobre la distancia candidata del caso. Ahora `supportingDriverEconomics` en el mismo consolidado B2 relaciona la oferta pública con los 67 segmentos MX conservados: **1124.5764209526735 km × 2.10 MXN/km = 2361.6104840006146 MXN**. Se muestra como **2361.61 MXN de pago anunciado condicional**, no costo total del conductor.

La hipótesis explícita es pagar una vez los kilómetros físicos de la fase de ida. No hay evidencia de nómina pagada, kilometraje remunerado real, retorno vacío, espera, salario bruto/neto ni cargas patronales completas. Esos conceptos siguen desconocidos, no cero. No se suma el salario semanal al pago por kilómetro ni se traslada la carga administrativa del monitorista al operador.

El subtotal variable IMT anterior, 19760.36 MXN, permanece independiente: modelo 2025, caja fuente de 40 pies y carretera plana sin impuestos. **No se suma con esta oferta como si describieran una misma flota compatible con el piloto 53′.** Las salidas económicas finales permanecen null.

## Benchmark y decisión previa

| Enfoque | Ajuste y costo de mantenimiento | Decisión |
|---|---|---|
| Salarios semanales/medianas generales más una carga global | No comparte denominador productivo ni frontera de compensación; duplicaría pago por km y beneficios | Rechazar para completar este costo |
| Reutilizar puente laboral, verificar oferta primaria y PDF original; proyectar hipótesis explícita | Misma integración existente, sin motor paralelo; aritmética y límites verificables localmente | Adaptar, adoptado sólo como componente de investigación |
| Usar cifras de plantilla Sample Carrier o construir otro sistema de nómina | Plantilla no es observación de carrier; un sistema nuevo no resuelve falta de evidencia | Rechazar cifras de muestra y nueva implementación |

La capacidad diferencial es la trazabilidad y asignación económica por recursos/fases del caso; conversión de unidades, lectura y validación de archivos reutilizan librerías existentes. No se introducen infraestructura, servicios, dependencias ni obligaciones comerciales. Un documento público consultable no implica permiso para redistribuirlo como producto comercial.

## Fuentes y vigencia

1. [Trayecto: Operador Sencillo Caja Seca](https://careers.trayecto.com/operador-sencillo-caja-seca-xI1ywOf9L4-o/): lector web primario accesible en este corte. La descripción anuncia 2.10 por km cargado/vacío; la moneda se infiere de MXN explícito en el salario de la misma página. Base Querétaro, rutas Irapuato–Chihuahua/Hermosillo, no el corredor piloto. No acredita largo 53′. Etiqueta relativa «hace 29 días», sin fecha absoluta ni disponibilidad confirmadas. Encabezado semanal 5500–8000 y descripción aproximada 6000–8000: no se agregan al pago por km. Beneficios y bono de ingreso no tienen una amortización comprobada. Descarga HTML directa devuelve HTTP403; `archive:null`, no archivo original ficticio ni evasión de acceso.
2. [ATRI Operational Costs of Trucking, julio de 2025](https://truckingresearch.org/wp-content/uploads/2025/07/ATRI-Operational-Costs-of-Trucking-07-2025.pdf): operaciones 2024. Original público recuperado en `sources/ATRI_OPSCOST_2025_REVIEW_20261001.pdf`, SHA256 `581b91b68a76f232102a63f543eff92bb59c9478556b164d84d2be85118902f8`, igual al original registrado históricamente. Metodología páginas impresas 7–8/PDF10–11; Figure7 impresa24/PDF27; encuesta Q5/Q6 impresa58/PDF61. Páginas completas renderizadas e inspeccionadas visualmente. For-hire Class8 tractor-trailer; segmentos/tamaños de flota no equivalen a ponderación de promedios nacionales ni a una pareja tractor/caja53′/payload identificada. Salario base más beneficios estándar; incentivos/bonos excluidos y preguntados por separado. No demuestra identificación completa de cada carga estatutaria. No se afirma que sea el informe completo más reciente de 2026.
3. [ATRI sample customized year-over-year report](https://truckingresearch.org/wp-content/uploads/2026/02/sample_customized_yoy_report.pdf): PDF público de diez páginas, archivo `sources/ATRI_SAMPLE_YOY_REVIEW_20261001.pdf`, SHA256 `ba67a3b989111c50ef5894afca0922a2c8493ed0a666ccf834669d596e1466d6`. Páginas6/9 inspeccionadas. Es una plantilla Sample Carrier, no un expediente privado real; **ninguna cifra de muestra fue usada como benchmark**.

Fuentes revisadas pero no adoptadas para completar perfil53′: [NACFE AFFS](https://nacfe.org/research/affs/) publica agregados de flotas seleccionadas y exige acceso para mayor detalle; [EPA SmartWay carrier resources](https://www.epa.gov/smartway/smartway-truck-carrier-partner-resources) orienta emisiones/eficiencia, no acredita costo de esta ruta. No registro, login ni recuperación de información restringida. Falta de aplicabilidad no se resuelve escalando modelo.

## Alternativas US conservadas, no sumadas

| Tamaño de flota truckload | Salario más beneficios reportados USD/milla |
|---|---:|
| Menos de26 | 0.817 |
| 26–100 | 0.872 |
| 101–250 | 0.790 |
| 251–1000 | 0.843 |
| Más de1000 | 1.058 |

Son cinco alternativas de operaciones2024, no intervalo estadístico ni cinco cargos del viaje. No se seleccionó grupo. Cada una conserva el USD/km histórico usando1.60934 y añade conversión de investigación exacta usando1.609344; **no modifica el factor del motor activo**. Distancia y pago de la faseUS permanecen null. No agrega ECEC, impuestos federales, incentivos/bonos, FX ni una selección de tamaño de flota no autorizada.

## Integración y criterios comprobados

- Nuevo JSON `B2_DRIVER_DISTANCE_COMPONENTS_2026-10-01.json`, SHA256 `52f32aeb6c2e7025298ecb7627949d681b4b1ad2c4b1aca49217d773e909b38c`.
- Reutiliza puente laboral SHA256 `321c07a2b208b41b8f6be256cafed9ff521ef083ad3751ba56402b081f4f00aa` y expediente piloto laboral SHA256 `ba33bcbdf4fcfabef81c926c76e7ed3dd58f8792bffe44177817aea4d1cc716f`. Histórico intacto.
- Extiende `reference-variable-components.ts`, no crea servicio paralelo. El consolidado añade tres pins, llega a40 y verifica bytes/SHA del originalATRI antes de calcular. Join de fuente, año, moneda, tasa, grupos y conversión rechazado ante discrepancia.
- **238/238 pruebas focalizadas, cuatro archivos, PASS**: consolidado179, puente laboral22, variables20, conductor17. Casos incluyen distancias inválidas, duplicados, hash alterado, periodo/moneda/tasa incompatible, grupos alternativos y exclusión de partidas no acreditadas. Ejecutadas después de la última modificación de código, sin fallos de assertions.
- Typecheck estricto de script/helper/tests afectados PASS. CLI exit2 esperado por presupuesto incompleto:40pins, cero partidas fijas completas, cero adopciones y seis salidas finales null. Exit2 no prueba una cotización completa. Sin build general repetido, navegador, Auth o validación operativa real del carrier.

## Auditoría de cierre B2 y siguiente resultado

Este corte es desarrollado y probado localmente; no desplegado, no aceptado en operación y no cierre B2. Faltan:

1. Referencia operativa compatible con caja53′: combustible/variables, costo completo del conductor y frontera de responsabilidades MX/US; no amalgamar cohortes sin evidencia.
2. Presupuestos fijos completos con exposición productiva del mismo periodo/flota, incluyendo capital/seguro/administración, para poder repartir costos sin denominadores inventados.
3. FasesUS, cruce, espera, vacíos y ciclo del caso; fecha del servicio y cargos aplicables. El reciboGoogle existente no conserva distancia/duración y no se reconstruye ni se reemplaza sin autorización puntual.
4. Conciliación final por recurso/tramo, una sola caja y un único pool administrativo, unidades/FX/vigencia compatibles; estimación reproducible total de costo, distinta de tarifa pactada y precio de venta.

Siguiente trabajo de negocio: resolver compatibilidad del escenario53′ y exposición productiva, integrar paquetes completos en este mismo presupuesto y comprobar el resultado D2D. No otra ronda genérica de inventario fiscal. B3 después llevará seleccionar→calcular→guardar→reabrir al SaaS, acompañado de wireframes MARKSMAN. No se piden registros privadosXBF para este benchmark público.

## Responsable, modelo, capacidad y límites

Codex único escritor/integrador/verificador. Recomendación para esta conciliación: **OpenAI GPT-6.1Sol, esfuerzo alto**; catálogo de la superficie declara esa combinación, no confirma acceso efectivo por sí solo. Selector principal no cambiado; ID/esfuerzo de ejecución no independientemente expuestos. Reutilizar helper y pruebas deterministas permite resolver aquí, sin invocar Claude ni asignar análisis idéntico a otro agente; no hay fallo de razonamiento que justifique Astra/Fable. No se creó agente ni bridge.

Lectura automática de cuotas al inicio: **1oct2026 22:32:58MX /2oct04:32:58UTC**, `get_usage_limits`: `ordinaryUsageAllowed:false`, ventana primaria100% utilizada/10080min, reposición observable6oct13:08MX; secundaria no disponible, créditos disponibles. No se expone saldo ni se infiere cargo real de disponibilidad. La autorización previa permite continuar, pero no activar facturación ni garantizar costo cero. Lectura del inicio, no declaración de saldo actual al cierre tras uso concurrente.

ClaudeMaxx5: declaración histórica del usuario; ventanas5h/semanal/Fable, reposición, ruta de suscripción y uso extra **desconocidos actuales**, no invocado. Sin lector/instalación/credenciales ni cambio de proveedor. Reserva cuantificable no disponible: límite operativo25min y un reintento por fallo; parar nuevas consultas al agotar ese presupuesto. Dos accesos webATRI403 y descargaHTMLTrayecto403 conservados como intentos sin consumo atribuible observable, no consumo cero. El originalATRI se obtuvo por descarga pública estándar, sin sesión/challenge/bypass; no se repitió extracción larga ya en ejecución.

Consumo monetario, tokens por actividad y cuota atribuible a cada consulta no observables. Impacto esperado: menos retrabajo/contexto al reutilizar integración existente, sin porcentaje de ahorro inventado. Cierre mantiene Codex; faltantes son datos/aplicabilidad, no necesidad probada de modelo mayor.

Skills: `engineering:testing-strategy` orientó pruebas focalizadas de aritmética, fronteras y duplicación; `pdf` exigió revisar páginas completas y no inferir alcance sólo del texto extraído. No UI ni nuevo diseño en este corte, por tanto no wireframe pendiente de esta modificación.

## Estado local, efectos y rollback

Antes de editar se verificaron instrucciones centrales, checkout físico en **D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927**, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd` y worktrees. Amplio trabajo previo ajeno preservado; sin staging/commit/branch/PR/preview. Sin modificaciones de DB/Neon/Auth/usuarios/infraestructura/producción, operaciones de negocio, IA de la aplicación ni llamadasGoogle facturables. Motor activo de precios intacto por este corte.

Rollback selectivo: retirar sólo nuevo JSON/esteMD/test de conductor y los dos archivosPDF nuevos de revisión; quitar función/esquemas/import añadido de conductor del helper, **no el helper variable anterior**; quitar tres pins/import/bloque/propiedad de conductor del consolidado y sus dos nuevos tests específicos; quitar únicamente notas de este corte de status/plan. No restaurar archivos completos ni snapshots históricos, porque contienen trabajo anterior que se debe conservar.

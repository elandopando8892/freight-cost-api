# B2 · Presupuesto binacional por recurso, sin duplicar el grupo

Corte local 1 oct 2026. Worktree físico D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, historial/worktrees/estado revisados antes de editar. Cambios anteriores conservados.

## Resultado y alcance

Antes se había elegido relevo propio MX/US con la misma caja, pero no existía una conciliación común del presupuesto mensual de los tres recursos. Ahora una hoja ejecutable registra cada identidad económica de gasto una vez, exige reparto explícito y conserva el total del fondo, incluso al redondear centavos. Produce presupuestos mensuales por recurso sólo con declaraciones completas y compatibles. No crea otro motor de precios ni incorpora importes sintéticos a las bases.

**Herramienta desarrollada y probada localmente; calibración pendiente.** La [hoja del caso](B2_BINATIONAL_FIXED_BUDGET_WORKSHEET_2026-10-01.json) contiene 10 importes nulos y ninguna cifra de referencia inventada. Está ligada por hash al caso y a la elección del usuario; sigue sin carrier identificado ni fecha del servicio. Su periodo de presupuesto tampoco se infiere de la fecha de investigación.

## Benchmark previo y decisión

| Alternativa | Ajuste, costo total y límite | Decisión |
| --- | --- | --- |
| Importar un costo público agregado por km | Rápido, pero no separa caja, principal, inclusiones y administración del grupo | Rechazar como presupuesto fijo de este caso |
| Dos presupuestos nacionales independientes | Reutiliza contratos existentes, pero una empresa binacional puede aparecer con el mismo gasto compartido en ambos | Conservar componentes nacionales; conciliar gastos comunes antes de incorporarlos |
| Hoja única de gastos con tres centros | Misma tecnología y dependencias; suma conservada y trazabilidad por gasto/perfil/periodo | Adoptar como preparación local, sin publicar ni adoptar parámetros |

Referencia pública revisada: [ATRI, cuestionario de motor carriers 2026, pregunta 3 / página 2](https://truckingresearch.org/wp-content/uploads/2026/02/2026-Ops-Cost-Motor-Carrier-Form.pdf). Pide kilometraje que soporta los costos y separa pagos de tractores y remolques; permite combinarlos si el participante no los separa. Sus pagos incluyen cargos e intereses y no equivalen automáticamente a nuestra depreciación económica más intereses. El formulario es metodología, no respuestas ni presupuesto del piloto. Tabla completa inspeccionada visualmente en el PDF local `sources/ATRI_MC_FORM2026.pdf`, hash `a9be75541e94c031f71f4a7081cd06eab39bcea165202eddad199998ed8ad5d9`, coincidente con el expediente previo. La lectura web de la tabla fue accesible; las tentativas de refrescar los informes completos ATRI/IMT no lo fueron, sin evadir acceso ni sustituirlos por resúmenes secundarios.

Se reutilizan [overhead/exposición](B1_OVERHEAD_EXPOSURE_BRIDGE_2026-09-29.md), [fichas económicas](B2_ECONOMIC_REFERENCE_CARDS_2026-09-30.md), [ciclo por recurso](B2_BINATIONAL_CYCLE_ALLOCATION_2026-09-30.md), contratos de nómina/capital y compositores existentes. Los expedientes históricos no se convierten en calibración actual. Conciliar centros es capacidad estándar; la metodología CFU/CVU existente se conserva, sin declarar innovación para justificar otro sistema. No nuevas licencias, dependencias, cargos ni infraestructura.

## Hoja y puente al motor

| Gasto fijo | Tractor MX | Tractor US | Caja única |
| --- | --- | --- | --- |
| Capital económico + intereses, sin principal | Directo, pendiente | Directo, pendiente | Directo, pendiente |
| Seguro del periodo, normalizado una vez | Directo, pendiente | Directo, pendiente | Directo, pendiente |
| Permisos fijos, sin peajes/cargos del viaje | Directo, pendiente | Directo, pendiente | Directo, pendiente |
| Administración + corporativo | Participación documentada del mismo fondo común | Participación documentada del mismo fondo común | Participación documentada del mismo fondo común |

Esta propuesta de hoja no establece cuánto cuesta un permiso, una póliza ni qué entidad posee legalmente la caja. No impone terceras partes, 50/50 o caja gratuita. Si el alcance económico justifica participación cero, debe quedar explícito; un importe cero exige fundamento documental. Puede usarse detalle administrativo o bloque combinado, no los dos para el mismo centro.

`presupuesto_recurso = gastos_directos_recurso + sum(fondo_compartido × participación_recurso)`.

Cada gasto necesita identidad económica, alcance, fundamento de costo, monto USD/mes, periodo, fuente pública observada o modelo público documentado y referencias al perfil de cada recurso asignado. El reparto suma uno por gasto. No hay reparto por defecto; si falta algo, todos los totales de la hoja permanecen null. Distintas identidades podrían encubrir el mismo gasto: el control detecta IDs repetidos y solapes declarados, no demuestra autenticidad o independencia contable.

Los subtotales por recurso son presupuesto, **no CFU**. Después deberán vincularse a km/días productivos del mismo alcance y periodo y a los tiempos de ciclo de cada recurso. Se conserva el asignador `MAX(distancia, tiempo)` y un solo ciclo de caja; no se vuelve a ejecutar MAX por participación ni se añaden gastos variables a este fijo. No se inyecta un presupuesto unitario en tasas de flota sin la normalización correspondiente. Conductor, combustible, mantenimiento, llantas, peajes del viaje, frontera incremental, capital de trabajo, riesgo y margen permanecen separados.

## Validación y criterio de cierre

72/72 pruebas en tres archivos, 30 nuevas de presupuesto, tras la última edición; typecheck estricto de scripts/test PASS. Pruebas sintéticas cubren conservación, centavos, orden de filas, duplicados, cero documentado frente a ausencia, perfiles/periodos/grupo incompatibles, fuentes sólo contextuales, principal, faltantes, doble administración, límites numéricos, pin alterado y rechazo de flags de adopción. Las cantidades de fixtures no son datos públicos ni alimentan el caso.

CLI real del expediente local con quinto anexo: exit 2 esperado; hoja INCOMPLETE con **15 condiciones pendientes** (10 importes, 3 perfiles, periodo y reparto). Dos pins nuevos verificados; caso conserva las 41 incidencias económicas previas, costos null, compositor false, selección física resuelta, cero adopciones y 0/4 gates. Esos 15 no son nuevas claves canónicas ni otros sprints; localizan condiciones del mismo presupuesto incompleto.

No recorrido UI, sesión real, persistencia de negocio, prueba de carrier o cotización operativa en este corte. No cambios HTTP/formulario: no wireframe nuevo; cualquier futura UI exige wireframe MARKSMAN. Sin DB, Auth, usuarios, despliegue, Google/SAKBÉ, operaciones o IA de aplicación.

Reproducción: ejecutar `apps/api/scripts/run-d2d-readiness-case.ts` con los argumentos anteriores de caso, ruta, peajes y selección; agregar como quinto `docs/research/B2_BINATIONAL_FIXED_BUDGET_WORKSHEET_2026-10-01.json`. Sin quinto argumento se conserva el comportamiento anterior. Hash de hoja: `63629b174897277ce5501f833e9c24a40fdd24e4c2e323e8663366e2a1a24b80`; originales del caso/selección/cruce conservados.

## Siguiente, modelo y rollback

Siguiente resultado de negocio: sustentar las partidas de capital, seguro, permisos y fondo administrativo con fuentes públicas y supuestos explícitos de perfil/periodo; completar exposición y ciclos compatibles para una primera estimación de CFU/CVU. No pedir historia privada XBF ni volver a elegir puente o relevo; no confundir un reparto correcto con benchmark numérico completo. Fecha de servicio sigue pendiente para vigencias del viaje, no se inventa.

GPT-6.1 Sol alto recomendado para compatibilidad económica/implementación; medio para extracción documental y QA de empaquetado. No cambio comprobable del selector, delegación ni tokens/precios medidos. La guía de pruebas determinó controles de integridad/conservación; la guía PDF, la comprobación visual de la tabla de referencia.

Rollback no ejecutado: omitir el quinto anexo devuelve el reporte anterior; retirar sólo módulo/test/hoja de este corte y adiciones de presupuesto al preparador/CLI y notas superiores. No restaurar archivos completos, borrar investigación anterior ni resetear Git. No efectos remotos que revertir.

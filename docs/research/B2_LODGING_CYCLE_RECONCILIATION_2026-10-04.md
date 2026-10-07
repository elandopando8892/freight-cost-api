# B2 · Conciliación del descanso y los inputs de alojamiento

## Objetivo, benchmark y decisión antes de implementar

Conectar el benchmark de pernocta al reporte económico vigente de septiembre. No inventar noches, porcentajes de hotel ni pagos. El cierre anterior añadió candidatos al closeout histórico, pero la revisión de septiembre —que ya reúne fijos/variables/LABOR— no los recibía.

Se revisaron estado Git, historial/HEAD, los dos compositores existentes, reloj MX de jornada ordinaria, movimiento US, cálculo US de nómina/M&IE, snapshots/contratos y pruebas de septiembre. Se reutiliza el benchmark de alojamiento del mismo día, verificado por SHA256. Lectura pública repetida del [operador KM40.5](https://pensiondetrailers40-5.com/) confirma el precio publicado por conjunto/24h; no precio histórico ni habitación. La [FAQ FMCSA](https://www.fmcsa.dot.gov/regulations/under-sleeper-berth-provisions-driver-takes-7-hours-sleeper-berth-later-takes-duty) distingue descanso y ubicación, no asigna noches/compras ni mezcla universal. No se cambia ni certifica el reloj regulatorio existente.

| Alternativa | Capacidad concreta / costo / límites | Decisión |
| --- | --- | --- |
| Proporción estándar o ceil(días de viaje) como noches | Corta, pero crea cantidades sin alojamiento/sitio/fecha acreditados y puede cobrar dos veces descansos contiguos | Rechazar |
| Otro simulador de rutas/calendario/hotel | Duplica relojes ya probados y exige más datos/APIs sin justificar tarifa o ubicación | Rechazar |
| Conciliar los relojes existentes y adjuntar evidencia al reporte Sept | TypeScript/Zod/Vitest ya instalados, sin proveedor, dependencia, licencia o costo recurrente nuevo | Elegida |

La integración económica binacional y el vínculo con CFU/CVU son específicos del producto; validación/agrupación/reportes son capacidades estándar reutilizadas. No nueva arquitectura, maestros, backend o infraestructura.

## Flujo y criterios de cierre

Relojes fijados → partición de horas MX/US → unión de intervalos MX liberados contiguos → bloques US de descanso nominal/recovery → candidatos y faltantes de alojamiento → reporte económico existente. El calendario es relativo: no itinerario real de septiembre, ELD, ubicación de descanso o factura. No cambios UI/UX; conservar los wireframes de evidencia/traza y no crear otra pantalla.

Cerrar este corte significa verificar la partición, evitar conteo doble de intervalos contiguos, exponer cantidades derivadas claramente distintas de cantidades facturables, integrar el benchmark al CLI Sept y conservar exactamente casos monetarios, referencias fijas, snapshot y motor. No significa cerrar alojamiento ni B2. Sin inferir 50/50, litera MX, hotel gratis, localización o tarifa comercial histórica.

Los días de alimentos y bloques M&IE siguen en sus partidas actuales. Pausas pagadas y espera US remunerada no se convierten en descanso ni hotel. Pensión de una plaza no se cobra dos veces por tractor/caja; los intervalos no prueban si el tractor MX está acompañado por la caja. La hipótesis de patio fijo no justifica eliminar automáticamente una pensión de viaje.

## Ejecución y límites

Responsable/ejecutor/verificador único: Codex/OpenAI. Se conserva elección/recomendación `gpt-6.1-sol`, esfuerzo solicitado alto; modelo nativo exacto/versión y esfuerzo efectivo desconocidos, selector intacto. Claude es candidato equivalente para una revisión, pero el cambio es determinista con contexto ya local y pruebas verificables; no se demuestra ahorro al transferir contexto y no hay elección explícita para invocarlo. Sin política global, Fable, Astra, Luna, subagentes o inferencia auxiliar.

Hasta45min para este corte, máximo dos correcciones diagnosticadas por causa; tokens/cuota/reposición/cargos reales desconocidos. Cero invocaciones auxiliares o nuevos servicios facturables. Continuidad humana: «adelante continua», 04/10/2026, alcance local de conciliación; no autorización de adopción/deploy/contratación/DB/Auth. Referencia documental y hashes no autentican consentimiento ni factura.

Skill `data:validate-data` guía denominadores/periodos y evita confundir una brecha de horario con una compra. Skill `engineering:testing-strategy` guía partición, errores, regresión y CLI real; no añade infraestructura de test.

## Evidencia final y rollback

La implementación concilia y adjunta dos ciclos una sola vez al reporte Sept; no repite sus cantidades como24 viajes por las comparaciones de FX/financiación. Pasa de86 a87 pins con el register de alojamiento. Los12 casos monetarios y seis referencias fijas no cambian.

| Ciclo de referencia | MX: fragmentos → intervalos continuos | MX: horas liberadas | US: bloques nominales / horas de descanso |
| --- | --- | ---: | --- |
| Red, vacío esperado | 4 → 3 | 51.3019501251 | 2 / 27.5 |
| Retorno vacío dedicado | 6 → 5 | 155.3019501251 | 3 / 41 |

Las horas liberadas contiguas 14+5.3019501251/red y63.3666666667+3.9352834585/dedicado pertenecen a un mismo intervalo continuo de cada reloj MX. No se fusionan descansos separados por tarea/pausa pagada. Las40h liberadas del dedicado no se reinterpretan como una sola noche o dos compras: siguen siendo una hipótesis de liberación/calendario, no habitación comprada.

MX: `tareas + pausas contadas + horas liberadas = reloj total`. US: `horas pagadas + descanso de movimiento + recovery = reloj asignado`; espera de sincronización dedicada3.9352834585h permanece dentro del pago, no dentro de alojamiento. Bloques US no prueban sitio/cronología completos y liberación MX no acredita disponibilidad/off-duty real. `roomNights`, `parkingBillingUnits`, mezcla y costo completo de alojamiento continúan null: no cero, 50/50 ni ceil(días). El período físico original2026-10 se muestra como hipótesis relativa retenida, no un itinerario observado de septiembre.

Evaluación de datos: **compartir con salvedades**. Alta confianza en partición/agrupación bajo los inputs fijados; no evidencia suficiente para cantidades facturables o calibración comercial. No se seleccionan estos bloques como nights/unidades de los siete candidatos. Cantidad, precio y ámbito por país/equipo siguen separados.

### Reparación necesaria de continuidad

La suite ampliada detectó dos fallos anteriores a esta función: el productor histórico había cambiado de SHA256 `d24b0727...` a `cc69e15f...` por la integración de alojamiento del corte previo; sus fuentes pasaban de83 a84 mientras el snapshot seguía con83. No se regeneró/reaprobó el snapshot ni se suprimieron sus pruebas. Se retiraron exclusivamente los cuatro hunks del corte previo en `prepare-b2-closeout.ts`, restaurando su hash exacto `d24b0727d67465ac6ee73f2b3c6f11b43463431b73ddc7e82aa039561ccfe1b9`. Benchmark y nuevas cantidades ahora sólo pertenecen al CLI Sept. Las pruebas anteriores de alojamiento se ajustan para exigir esa separación; contador del perfil vuelve84→83. El entregable anterior conserva su evidencia y recibe nota de supersesión.

`node --import tsx apps/api/scripts/project-b2-evidence.ts --check`: salida0, cuatro contextos/83pins, misma huella de payload `99594a2ee1e31c67351a77d1124e75ec53d8d5ccbee593c7a5fce2baa264059f`. Snapshot JSON físico sin editar, SHA256 `5a94f5ad1ba353edc2b7a84cfc56a70d6947f14b27927f2efab3da56f580afea`; `engine.outputs.ts` conserva `3640a05d4cc10820f84de5f295f8d7e0413ad48a87a3921be8981336b6ef5d8b`. JSON del benchmark sin editar: `f75042c9dfa1c8d77651946f5efdf8b6c90dd00fc3a427d880998813b0428706`.

Guardia de importes: `SHA256(JSON.stringify({cases,fixedReferences})) = 29619c11dc85e4b626bcd617ab1b60f750a10a819e1fb1e3833d67b19f014e57`, igual antes/después. No metadatos nuevos dentro de casos monetarios. No inferencia de que el snapshot histórico contenga el nuevo reporte.

Verificación final **142/142PASS en ocho archivos**, después de la última edición de código/pruebas;20 nuevas de cantidades,15 de benchmark alojamiento,10LABOR Sept,18variables Sept,20fijos Sept,24DEF/carretera Sept,12perfil y23expediente. Incluye procesos CLI reales de septiembre/histórico, salida2 deliberada por incompletitud y stderr vacío; no aceptación económica simulada. Primeros119tests focales pasaron; ampliación142 tuvo140PASS/2FAIL de snapshot, reparados arriba. La ronda final volvió a ejecutar los ocho archivos sin ocultar los fallos anteriores.

TSC estricto ESNext/Bundler/ES2022 de helper, CLI Sept, closeout restaurado y las dos pruebas de alojamiento: salida0. `npm run typecheck --workspace apps/api`: salida0 para el source API configurado. TSC había diagnosticado un fixture que acortaba una tupla readonly y después una comprobación de ID inexistente contra una unión cerrada tras restaurar el histórico; corregidas sólo las construcciones/aserciones de pruebas, no los contratos económicos. Causas distintas; no fallback de modelo ni ampliación de presupuesto. `git diff --check` y revisión explícita de whitespace/marcadores de los archivos no rastreados: sin hallazgos; avisos LF/CRLF y deprecación Vite CJS conservados, no tooling nuevo.

Pruebas locales de cálculo/contratos e integración CLI sobre fuentes públicas fijadas; la suite HTTP del expediente usa Auth/DB sintéticos. No sesión Supabase, persistencia SaaS, operación comercial, compra hotel/pensión, validación regulatoria real, aceptación humana o release de producción. Reporte desarrollado/probado localmente; UI/snapshot publicado no recibe estos nuevos candidatos/cantidades. **B2 y alojamiento siguen abiertos.**

### Recuperación

Checkout D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`; sin rama/worktree/commit/PR/publicación nuevos. Checkpoint previo en `tmp/b2-lodging-quantities-checkpoint-20261004/`: helper hash `67aafcfc9d70fe8f60bd047698cc1c375396a397bd018b2ccaf6dbf837c0f159`, CLI Sept `21617cba134c55b977eb79dfd9ec6a2c12f21e5f3587b7f4aad12fd14b3feba7`.

Archivos: helper `apps/api/scripts/lib/b2-mixed-lodging-benchmark.ts` y CLI `apps/api/scripts/review-b2-september-labor.ts` reciben la conciliación; nueva prueba `apps/api/tests/benchmark-b2-lodging-quantities.test.ts` y este entregable. Reparación previa: `apps/api/scripts/prepare-b2-closeout.ts`, `apps/api/tests/benchmark-b2-operating-profile.test.ts` y `apps/api/tests/benchmark-b2-mixed-lodging.test.ts`. Nota de continuidad en `docs/research/B2_MIXED_LODGING_BENCHMARK_2026-10-04.md` y entrada de progreso en `docs/SPRINT_STATUS.md`. `project-b2-evidence.ts`, snapshot, motor, política JSON, dependencias y paquetes no editados en este corte.

Rollback de cantidades: retirar sólo los imports de reloj/tipo, función de conciliación/schema auxiliares del helper y los imports/reporte/pin del CLI Sept; volver87→86 en ese reporte. Retirar únicamente la nueva prueba de cantidades, este entregable y su entrada de estado si no tienen modificaciones posteriores. **Conservar la reparación del cierre histórico** y las guardas83pins/snapshot: restaurar la integración anterior volvería a introducir la regresión. No restaurar archivos completos ni borrar helpers/CLI/pruebas preexistentes por ser untracked. Sin rollback externo: no DB/Auth/producción/despliegue/operación de negocio.

Siguiente trabajo económico: resolver prestaciones adicionales/riesgo y cantidades facturables/aplicabilidad de alojamiento dentro de los remanentes existentes. No nuevos sprints por bloque de descanso, otra ronda genérica de FX/casetas, ni supuesta aceptación humana. No nueva decisión requerida del usuario para este corte local; «el estándar» no se convierte en cantidades inventadas.

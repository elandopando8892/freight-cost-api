# B2: jornada ordinaria conectada al costo del piloto

Checkpoint local 2026-10-02 20:05:55 UTC. B2 continúa activo; no costo íntegro ni cotización. Caso autorizado: México DF → Fort Smith AR72916, Puente III/World Trade Bridge, caja seca53′, relevo propio MX/US y misma caja. Dos ciclos: vacío de red y regreso dedicado. Contado y financiado continúan como alternativas, no sumadas.

## Antes y ahora

Antes, el reloj MX de movimiento usaba bloques de10h de conducción sin probar jornada ordinaria incluyendo carga/cruce/relevo. Ahora existe un contraste financiero con turnos diurnos8h, pausa30min contada, seis días y un día de descanso. Conserva tiempos/tareas conocidos, publica timeline del operador y timeline serial de la caja y recalcula capacidad, CFU y proyección de nómina antes de financiar. No reemplaza los escenarios históricos ni adopta este supuesto como calendario real.

El tractor US permanece con la caja mientras espera a MX para regresar. Su exposición adicional de4.50195h se cuenta una sola vez, además de cualquier prolongación del relevo. No es remuneración US observada. Liberación del operador MX durante espera es una hipótesis declarada; pago real de espera permanece null, no cero.

## Benchmark y decisión

Reutilización verificada: relojes de movimiento/retorno, separación físico/caja, MAX distancia/tiempo, proyección anual pública MX, unión de CFU/CVU y sustitución de tres capitales. No nueva librería, proveedor, stack o servicio. La capacidad estándar de calendario se implementa como pequeño contrato determinista, no otro motor de optimización o infraestructura.

Alternativas: conservar10h de conducción (insuficiente para jornada); añadir horas extra (requiere jornada/precio/calendario sustentados); contraste ordinario8h (elegido por verificabilidad y reutilización). No afirmar que es la alternativa operativa más barata o un roster legal aprobado.

Fuente primaria vigente: [LFT, Cámara de Diputados](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf), reforma14May2026. Art58 disponibilidad;61 jornada diurna8h;63 pausa;64 pausa dentro de jornada cuando no puede salir;69 descanso; transitorios2026:48h ordinarias/9extra. Lectura completa texto de páginas físicas21–23,71,454; visual21–23/454. Archivo `sources/LFT_COVERAGE_REVIEW_20261001.pdf`, SHA256 `12f09393a1951a91c3f57f579bf611b034edf1a5f78cdbfb828e23ff3a9acbf7`, conservado. El suplemento especial de autotransporte no se interpreta como exención automática de jornada o salario mínimo.

La fecha de servicio no está seleccionada. Día0 lunes06:00 es fase prospectiva, no fecha inventada del viaje. Festivos, ventanas reales, relevo continuo, relación laboral, mínimos diarios y disponibilidad no se certifican. Tareas/crossings son divisibles para el contraste, no instrucciones para parar un vehículo dentro de un puente.

Google: se verificó recibo previamente autorizado30Sep; no conserva distancia/duración de ruta ni endpoints confirmados. No puede sustituir el proxy US actual sin otra evidencia. Cero llamadas nuevas a Google/SAKBE u otro servicio facturable.

## Resultado reproducible parcial

| Escenario | MX días antes → contraste | Caja días antes → contraste | Ciclos/mes antes → contraste |
| --- | --- | --- | --- |
| Vacío de red |1.98775 →3.06144|3.06451 →3.85618|7.83160 →6.22378|
| Regreso dedicado |5.38456 →8.17631|5.38456 →8.17631|4.44612 →2.93531|

US exposición:1.84445d red y3.13203d dedicado (incluye espera añadida). La capacidad de distancia de la caja se recompone con el nuevo mínimo compatible; no se hereda su divisor anterior. Tareas MX conocidas19.70591h/red y37.46277h/dedicado; pausas contadas2h/3h respectivamente. Horas/tarifas pendientes no se certifican completas por esos totales.

Ejemplo ilustrativo, no alternativa seleccionada: caja precio neto+IVA, tarifa km que excluye descanso; MX financiación nominal11.5% hipótesis, US9% nominal hipótesis (no APR convertido), caja80%/15%/24meses y comisión neta con IVA acreditable supuesto.

| Escenario | CFU conocido contado | CVU conocido | Suma parcial contado | CFU conocido financiado | Suma parcial financiado |
| --- | ---: | ---: | ---: | ---: | ---: |
| Red |802.44|3208.41|4010.85|912.19|4120.60|
| Dedicado |1822.10|6040.12|7862.22|2078.04|8118.16|

Importes USD, sumas parciales, no cotizaciones ni límites inferiores. El costo de capital cambia sin volver a sumar principal o mensualidad completa. La proyección de nómina se recalcula en la nueva capacidad y sustituye el pago km una sola vez. Caja, administración y relevo no se duplican. Los seis outputs finales del consolidado siguen null.

## Pruebas y alcance real

-315 pruebas PASS/6archivos: ordinaria14, consolidado224, financiación21, nómina28, físico9, exposición19. Última ejecución después de corregir la espera US y el pin.
-TSC estricto PASS después de la última modificación de código. `git diff --check` PASS (advertencias CRLF preexistentes).
-Readback local seleccionado confirmó cifras,65pins y seis outputs null. Conservación de tareas/pausas/timeline, reposo semanal, conducción continua≤5h, sincronización misma caja, nuevo divisor, MAX y sumas, conservación inputs y rechazo de política/horas/identidades inválidas.
-Primer intento falló al cargar suites por un nombre local mal escrito y TSC detectó acceso a un campo de test inexistente. Corregidos ambos; no prueba exitosa atribuida a ese intento, consumo desconocido. No fallo de proveedor ni cambio de modelo.
-No build/UI, navegador autenticado, persistencia, deployment o operación real probados en este corte. No UI modificada; no wireframe ficticio. B3 exige wireframes MARKSMAN cuando comience.

## Modelo, presupuesto y control

Responsable único Codex: implementación/integración/verificación. Elección humana existente `gpt-6.1-sol/high`,16:46:22UTC; no selector cambiado ni metadata automática del modelo afirmada. Claude candidato equivalente sin nueva asignación/invocación; ningún agente. Fable no justificado por falta de datos o fallo de nombre local. Skillclaude-review usada para contrato mínimo y exclusión de escritor, no para ejecutar Claude.

240h máximo autorizado, no obligación de consumirlas, plazo por actividad ni gasto adicional. Estimación45–60min; actividad19:47–20:06 aprox, sin autoretries/fallback. Cuota atribuible, tokens/cache/razonamiento/cargos desconocidos. Observación Codex18:20 histórica no presentada como actual;5h no reportado, semana100% entonces/reset6Oct. Claude5h/semana/Fable/usoextra desconocidos y no usados. No reinicios, créditos o API contratada.

Kit fijado `releases/chat-20261002T194538Z/app`; job `pilot-ordinary-duty`, lease `803280978aaa42cea163c97c60a116fe`. Preparado19:55:01UTC. El campo nominal `context_review.reviewed_at`20:00del spec se escribió adelantado por error; la evidencia de ejecución son los eventos del kit/clock, no ese campo, y el cierre registra corrección19:55:01. No se altera silenciosamente el contrato ya sellado.

## Límites y siguiente trabajo

B2 no cierra aquí. Resolver con fuentes públicas el paquete de espera/viáticos y cobertura territorial de caja/cruce; completar aproximaciones bobtail/casetas y demás componentes monetarios. No exigir facturas privadas para una estimación prospectiva ni sustituir faltantes con ceros. Consolidar un caso completo contado/financiado antes de B3 seleccionar/calcular/guardar/reabrir. No nueva decisión requerida en este incremento autorizado.

## Estado Git y rollback

Raíz físicaD:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama `codex/cost-tires-release-s14`; HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, revalidado antes/después. Worktree extenso sucio conservado, sin commit/branch/push/PR/deploy/DB/Auth/Neon/usuarios/infraestructura.

Rollback selectivo: retirar sólo import/pin/call de cuatro líneas y campo `supportingPilotOrdinaryDuty` agregados al consolidado;65→64 en test; retirar sólo los dos párrafos de estado de este corte. Conservar artefactos nuevos como evidencia, desconectados (no eliminación material requerida). Nunca checkout/reset de archivos completos sucios.

Reconstrucción read-only en memoria PASS: consolidado vuelve exactamente al SHA previo `eaaa093e57d0cbaa9dad873dd5dcb8dadff443a1be21a5ee5d3b626c8419b972`; test al `167af0c236e4c70053909bd44c6679d97d2c73dfac462d36aff95bdc1250a2ab`. No archivos escritos por comprobación. Política nueva SHA `25dec0b7045723b853f8c8441f859033ce7325fe9914b3812e36db4af179ef00`; snapshot de cierre conserva hashes finales de ocho archivos declarados.

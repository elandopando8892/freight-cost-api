# B2 · Caso D2D de aptitud conectado al compositor

## Resultado visible del corte

Corredor confirmado directamente por el usuario en este corte: **Mexico, DF → Fort Smith, AR 72916, vía Nuevo Laredo / Laredo**. Se conserva literalmente en el manifiesto `B2_D2D_READINESS_CASE_2026-09-30.json`; el código postal es parte del destino indicado, no un domicilio de entrega ni una coordenada validada. La fecha de servicio, el puente comercial exacto, el itinerario, kilómetros/tiempos, peajes y cargos del intercambio siguen pendientes. La fecha del expediente no se copia como fecha del viaje.

**Integración local terminada; caso económico INCOMPLETE.** El nuevo preflight une las fichas MX/US y las obligaciones de captura al compositor `calculateBenchmarkD2D` ya existente. No hay un nuevo modelo de precios, catálogo, ruta HTTP ni pantalla publicada. El caso público no se calcula: bases, datos del viaje y remolque están incompletos. CFU/CVU, costo productivo, compra y venta no reciben importes inventados. B1/E1 abiertos, B2 parcial, cero adopciones y 0/4 gates de negocio completos.

La elección de un corredor sí cierra la decisión de sus cuatro puntos nominales; **no acredita una ruta transitable para el equipo ni un peaje vigente**. Nuevo Laredo/Laredo identifica ciudades de cruce, no automáticamente un puente, patio o régimen de intercambio elegido.

## Qué se conecta ahora

1. El constructor local comprueba el hash del manifiesto de consolidación anterior y sus 17 documentos referenciados; no reescribe expedientes históricos.
2. Cada perfil propuesto MX/US se vincula con sus filas de fijo/financiamiento, exposición, operador, FUEL y mantenimiento/llantas. Los IDs del borrador **no se convierten en revisiones de bases activas** ni en fuentes numéricas del motor.
3. `benchmarkRateRequirements(country, true)` enumera las nueve tasas del modo `TRACTOR_ONLY`. El caso usa un remolque compartido aparte; no transforma implícitamente referencias compuestas tracto+remolque en tasas exclusivas de tracto.
4. `reviewBenchmarkD2DReadiness` acepta campos pendientes explícitos y agrupa faltantes por etapa, sin completar ceros, fechas, evidencias o endpoints suplentes.
5. Sólo con envolvente estructural completa pasa a `calculateBenchmarkD2D`, que vuelve a validar evidencia, parámetros, fechas, unidad, cargos fronterizos y remolque. Ese cálculo puede seguir devolviendo `INCOMPLETE`; una estimación aritmética documentada conserva `calibrated=false`, `quoteReady=false`, `productionReady=false` y compra/venta independientes.

El estado local actual devuelve **41 observaciones de captura**, distintas de las 48 incidencias del auditor económico anterior y de las 135 claves del registro canónico. Ninguno de esos conteos representa porcentaje de avance ni 41 tareas nuevas.

| Etapa | Observaciones actuales | Qué significa |
| --- | ---: | --- |
| Caso | 2 | Fecha de servicio y justificación/asignación del activo no capturadas |
| Puntos nominales de corredor | 0 | Los cuatro nombres están confirmados; itinerario/puente/geometría todavía no validados |
| MX | 13 | Nueve tasas sin base canónica compatible y cuatro inputs del viaje sin capturar |
| US | 13 | Sus propias nueve tasas y cuatro inputs del viaje pendientes |
| Remolque compartido | 11 | Identidad/asignación/acuerdo, siete entradas numéricas y evidencia no documentados en el contrato del caso |
| Frontera | 2 | Cruce e intercambio sin cargos/cobertura documentados, no tarifas cero |

El modo exclusivo de tracto enumera **125 claves MX y 124 US**. El registro anterior permanece en **135/135 claves únicas documentadas** para su alcance `TRACTOR_AND_TRAILER`; son denominadores de contratos distintos, no eliminación de necesidades económicas. Tener requerimientos enumerados no calibra las nueve tasas ni resuelve el límite de mantenimiento compuesto.

La responsabilidad/presupuesto/exposición/reparto del remolque sigue en el expediente económico, sin selección `MX_PROVIDES`, `US_PROVIDES` o `AGREED_POOL`. El preflight no resuelve esas condiciones porque un contrato sintético permita ejecutar la aritmética. Sigue prohibido sumar dos tasas compuestas o cargar el remolque dos veces.

## Validación proporcional al riesgo

La guía de pruebas orientó el corte hacia integración y límites críticos, no una nueva ronda de pruebas triviales. Plan y cobertura:

| Área | Tipo | Criterio / ejemplo probado |
| --- | --- | --- |
| Expediente → caso | Integración documental | Hash/HEAD/fecha, campos pendientes y corredor confirmado; no parámetros canónicos creados |
| Orden y alcance | Contrato/unidad | Sentido inverso conserva países; `TRACTOR_AND_TRAILER` en un tramo se bloquea |
| Faltantes | Contrato/unidad | Total nulo; fecha no inferida; ruta sin placeholders; cero documentado diferente de ausencia |
| Delegación al compositor | Integración sintética | Una llamada al compositor original y mismos costos que su ejecución directa; ningún cálculo duplicado |
| Evidencia/cargos/remolque | Integración sintética | Unidad errónea, evidencia vencida, doble cobertura fronteriza, remolque insuficiente mantienen `INCOMPLETE` |
| CLI aislado | Proceso local | Selectores de DB heredados inválidos no se usan; salida 2 esperada sin total ni exposición de configuración |

Resultado: **400/400 pruebas focalizadas en 16 archivos**, incluidas 26 nuevas. Typecheck API y ambos scripts, auditor canónico y `git diff --check` PASS. El inventario reejecutado permanece 135/135, 3 candidatas, 47 contrastes, 85 faltantes de evidencia, cero adoptadas y sin deriva documental. Suite general no certificada; snapshot antiguo de metadatos fronterizos sigue fuera de este corte.

Las pruebas completas usan valores **sintéticos** exclusivamente dentro del test. No son cálculos del corredor Mexico, DF–Fort Smith ni importes extraídos del benchmark público. La salida del caso público conserva `compositorInvoked=false`, `costs=null`. No se probó sesión autenticada, guardado/reapertura real, itinerario externo, vigencia de precios o producción.

## CLI reproducible y dependencia heredada

Desde el worktree de D:, ejecutar con Node configurado y `node_modules/tsx/dist/cli.mjs`:

```text
apps/api/scripts/run-d2d-readiness-case.ts docs/research/B2_D2D_READINESS_CASE_2026-09-30.json
```

La salida completa incluye enlaces de requerimientos, faltantes por etapa, linaje del borrador y referencias nacionales. **Exit 2 esperado** para caso incompleto; exit 1 para error de integridad/esquema. El módulo `prepare-d2d-readiness-case.ts` es el constructor importable, no el punto de entrada del CLI.

El primer intento detectó que importar las fórmulas heredadas inicializa Prisma y exige configuración DB, aunque aquí no consulta datos. Se reutiliza el patrón del auditor del inventario: el launcher fija ambas variables de datasource a un destino local deliberadamente inaccesible **antes del import dinámico**. Esa configuración pertenece sólo al proceso CLI, no al API en ejecución ni a un archivo `.env`. Se inicializa el cliente heredado, pero no se invocan servicios de consulta, conexión o escritura; no se usan URLs reales de Neon. El test de proceso cubre ambos selectores heredados.

## Siguiente actividad, sin abrir otro catálogo

**Expediente de itinerario para el corredor confirmado**: identificar alternativas y puente comercial apropiados al equipo; documentar distancias por tramo, retorno/vacío, tiempos de conducción/ciclo/permanencia, plazas de peaje por ejes y cargos de frontera con fecha, inclusiones y fuentes públicas. Si un servicio API implica cobro o una acción externa no autorizada, detener esa acción y pedir permiso específico; no contratar ni activar proveedores por este corte.

El itinerario y sus importes sólo entran al contrato después de documentar selección/fecha/moneda/FX aplicables. Las bases necesitan completar sus tasas compatibles y el remolque su responsable/presupuesto antes de producir un total. No se promete que resolver distancias cierre CFU/CVU. Conservar compra de capacidad y venta XBF independientes.

La siguiente integración de producto será el recorrido SaaS de este mismo caso, con wireframes MARKSMAN para captura → faltantes → cálculo sustentado → guardado/reapertura de benchmark. No se declara disponible en la app por tener este módulo local; persistencia gobernada, Auth y release requieren su entorno/alcance/autorización. E1–E4 siguen siendo los gates de cierre, no otro programa de sprints técnicos indefinidos.

Modelo recomendado único para este corte de contrato/integración y el expediente acotado de ruta: **GPT-6.1 Sol · alto**. No se cambió el selector ni se delegó a agentes.

## Entorno y rollback

Worktree `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, verificados antes de editar. Cambios tracked/untracked anteriores conservados. Los calculadores originales no fueron editados; sólo se añadió el preflight y su constructor/launcher/test/expediente. Sin cambios de DB, usuarios, Auth, infraestructura, despliegue, motor de cotización activo, UI, operaciones de negocio o IA de aplicación. No commit/push.

Rollback acotado, **no ejecutado**: retirar únicamente `benchmark-d2d-readiness.ts`, `prepare-d2d-readiness-case.ts`, `run-d2d-readiness-case.ts`, `benchmark-d2d-readiness.test.ts`, el JSON y este documento; quitar sólo los párrafos de este corte añadidos a plan/estado. Conservar el expediente de consolidación y todo cambio anterior; no restaurar archivos completos ni borrar la carpeta research. No hay datos externos que revertir.

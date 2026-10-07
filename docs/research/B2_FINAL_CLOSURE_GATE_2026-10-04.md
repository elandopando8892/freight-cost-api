# B2 · Gate final y decisión pendiente

> Estado histórico anterior a la respuesta humana del04/10/2026. El usuario autorizó «Autorizar escenario de planeación explícito». El alcance de planeación se implementó y verificó en la [entrega de cierre B2](B2_PLANNING_CLOSEOUT_DELIVERY_2026-10-04.md); calibración operativa/adopción no están cerradas. Las cifras/pruebas y el criterio original de este reporte se conservan como evidencia anterior, no como estado vigente.

04/10/2026. Encargo: «continua con B2 hasta cerrarlo». Resultado actual: **B2 no cumple todavía su cierre económico**. Esta revisión consolida los pendientes; no añade otro motor, investigación por caseta ni pantalla. No declara terminado el sprint por aprobar pruebas.

## Criterio vigente y alcance

[Plan B2](../C1_MVP_BUSINESS_SPRINTS_2026-09-29.md): caso completo con CFU/CVU/cargos conciliados, linaje y sin defaults; pruebas con expediente revisado y contraejemplos de doble conteo. Activación/persistencia requieren autorización específica. E1 exige evidencia comparable de los inputs consumidos. B3/persistencia SaaS y B4/release no se añaden a este encargo.

Perfil conservado: empresa binacional existente con permisos declarados vigentes, relevo propio MX/US y misma caja seca 53′; México DF–Fort Smith vía World Trade Bridge; referencia última semana de septiembre de 2026, partes automotrices USD 75,000; mercancía MX cubierta por cliente y obligaciones US dentro del seguro global del carrier. Hotel/pensión en ambos países y prestaciones de mercado. «El estándar» no acredita una mezcla universal ni cantidades compradas. Contado y financiado permanecen alternativas, no selección implícita.

Se leyeron AGENTS, rama/HEAD/worktrees y expedientes existentes antes de actuar. El reporte Sept reconstruye importes nativos con tres FX de septiembre, pero no convierte las observaciones comerciales de octubre en precios históricos de septiembre. La fecha exacta de salida sólo sería indispensable para una validación operativa fechada; no para demostrar la matemática del modelo.

## Evidencia actual, no porcentaje de avance

- Inventario: 210 claves/16 secciones; 135 dependencias benchmark, 58 lecturas literales fuera del benchmark y 17 sin lectura literal. Tener inventario no significa 210 parámetros calibrados.
- Reporte Sept ejecutado: 87 pins, 12 comparaciones económicas y seis referencias fijas. Dos ciclos físicos, no 12 viajes reales. 26 filas fijas conocidas por referencia y 18/20 variables no laborales por ciclo.
- Resultado público: `completeCfuUsd`, `completeCvuUsd`, `completeTripCostUsd` null; `b2Complete=false`, `quoteReady=false`, adopciones y escrituras externas 0. CLI salida 2 deliberada, no error ni aceptación.
- 82 sondas independientes de contratos fijo/mantenimiento coinciden. No certifican todas las fórmulas del catálogo: el diagnóstico previo conserva tres asociaciones PU distintas en el kernel heredado y puente de recape incompleto. El adaptador bloquea recape ambiguo; el piloto público agregado de llantas no constituye calibración de ese método detallado. No modificar historia/kernel para ocultar esa frontera.
- El snapshot histórico continúa con cuatro contextos/83 pins y su payload SHA256 `99594a2ee1e31c67351a77d1124e75ec53d8d5ccbee593c7a5fce2baa264059f`. No contiene automáticamente los nuevos datos de septiembre.

## Cola finita: tres bloques, no nuevos sprints por input

Los IDs siguientes se extraen del reporte Sept ejecutado. Son seis remanentes fijos y seis familias variables; no sumar este conteo al del closeout histórico de otro periodo/perfil.

| Bloque | Identidades abiertas | Qué permite cerrarlo |
| --- | --- | --- |
| 1. Labor MX y pernocta MX/US | `EXTRA_BENEFITS_AND_EMPLOYER_RISK`, `MIXED_LODGING_MX_US` | Canasta recurrente por empleado y derecho/dotación de relevo; riesgo y tratamiento tributario explícitos; cantidades y unidades comerciales de alojamiento, precios/ámbito/periodo. No repetir prestaciones ya incluidas US, comida, patio fijo ni espera pagada. |
| 2. Base fija y cobertura | `MX_TRACTOR_PERMITS`, `US_TRACTOR_PERMITS`, `SHARED_TRAILER_PERMITS`, `MX_TRACTOR_FOREIGN_LIABILITY_REMAINDER`, `BOX_BINATIONAL_COVERAGE_REMAINDER`, `GROUP_SERVICE_TAX_INSTALLATION_REMAINDER` | Canasta recurrente aplicable a empresa existente, pólizas con territorio/custodia y gastos de servicios restantes. Componentes conocidos no se cobran de nuevo. Una exclusión necesita evidencia de ámbito/inclusión; falta de precio no equivale a cero. |
| 3. Aplicación agregada y conciliación final | `MX_ROAD_TOLL_REMAINDER`, `US_ROAD_TOLLS`, `BRIDGE_DIRECTION_AND_APPLICATION`, `HANDOFF_INCREMENTAL_SERVICES` | Importes agregados y dirección/alcance del caso, sin investigación plaza por plaza; composición completa CFU+CVU+cargos, una caja/admin/cuota patronal fija, contado/financiado y evidencia revisada. |

La calibración de poblaciones/periodos es transversal, no otra tarifa. Permisos vigentes declarados no prueban primas ni la ausencia de obligaciones recurrentes. No se exige historial privado XBF para continuar: se mantiene investigación pública y, donde corresponda, modelos de planeación expresamente identificados.

## Benchmark revalidado y elección que requiere al usuario

Consulta pública dirigida 04/10/2026:

- [BLS ECEC junio 2026, publicado 9 de septiembre](https://www.bls.gov/news.release/archives/ecec_09092026.htm), tabla 4: ocupaciones transporte/movimiento tienen USD 36.38 total, 24.97 salario y 11.41 prestaciones por hora. Bonos, retiro y seguros ya están dentro del agregado; no añadir un porcentaje extra. No es una muestra exclusivamente de operadores binacionales. El dato ECEC de septiembre se anuncia para diciembre, no estaba disponible para esta revisión.
- [Quálitas Premier Crossborder](https://www.qualitaspremier.com/Home/Products?lang=en): describe responsabilidad para vehículos domiciliados en México que cruzan a US, pero la página consultada no publica prima. Producto y límites no proporcionan automáticamente costo. No presentar un rango doméstico como prima extranjera homologada.
- [Real Inn Nuevo Laredo](https://www.grupocaminoreal.com/real-inn-nuevo-laredo) muestra tarifa «desde» USD 94: no acredita tarifa final de septiembre, todos los impuestos ni unidades compradas para el caso.
- [Truck Parking Club Fort Smith](https://truckparkingclub.com/us/arkansas/fort-smith) conserva precios publicados por día de USD 10/12/12.50 para los tres sitios ya registrados. Un precio por día no acredita descansos comprados, habitación incluida ni fechas del viaje. No se hizo reserva ni consulta pagada.

Se reutilizan expedientes fijados de permisos, prestaciones y pernocta; no se instala librería/proveedor ni se duplica investigación. Las skills de validación de datos y estrategia de pruebas separan denominador, periodo, costo conocido y evidencia de ejecución.

| Alternativa | Resultado / costo / límite | Recomendación |
| --- | --- | --- |
| Conservar cierre económico íntegro sustentado | Mantiene el contrato B2 actual. Faltan evidencias/hipótesis revisadas; no hay fecha honesta de cierre garantizada. Investigación pública acotada, sin nuevas herramientas. | Viable si se desea esa exigencia. |
| Autorizar un escenario público de planeación explícito, separado de calibración/adopción | Reutiliza el mismo motor; admite proxies e hipótesis como tales, no costos observados ni benchmark calibrado. Requiere expediente de supuestos y conciliación completa antes de cerrar ese alcance. No autoriza ceros por omisión, cargos, producción o publicación. | Recomendada para validar el modelo sin seguir exigiendo demostración de una operación histórica no observada. **Pendiente de decisión humana; no aplicada.** |
| Sustituir todo por una tarifa TCO pública agregada | Puede dar total, pero pierde atribución por recurso/CFU/CVU y puede repetir seguro/caja/viáticos. No demuestra las ecuaciones ni satisface el alcance actual. | No recomendada. |

Pregunta remitida al usuario: autorizar la segunda alternativa o conservar el cierre vigente. El encargo «hasta cerrarlo» no se usa como consentimiento para rebajar el criterio. No cerrar B2 metodológico y continuar llamando completa la calibración: ambas evidencias deben permanecer separadas. No pedir otra vez fecha/mercancía/pagador ya contestados ni inventar otro paquete «estándar».

## Verificación ejecutada en este encargo

**259/259 pruebas PASS, 13 archivos, 37.85s**: resolución de remanentes 24, fórmulas 4, inventario 24, compositor público 63, perfil 12, fijos Sept 20, fluidos/carretera Sept 24, cantidades alojamiento 20, variables Sept 18, benchmark alojamiento 15, LABOR Sept 10, prestaciones 13 y canastas MX 12. Incluyen recorrido compositor→linaje→CFU/CVU, sentinelas sintéticos separados, doble conteo, fuente/periodo/identidad inválidos, importes vacíos y overrides de aceptación rechazados. No facturas, telemetría o calificación comercial real.

TSC estricto de CLI Sept, closeout, helpers alojamiento/fórmulas/resolución y pruebas cantidades/resolución: salida 0. `npm run typecheck --workspace apps/api`: salida 0. CLI Sept real: salida 2 con JSON completo; `project-b2-evidence.ts --check`: salida 0, snapshot idéntico. No UI/roles/Auth/persistencia real ni producción validados por estas pruebas. Advertencia preexistente Vite CJS, sin instalación. Las búsquedas Windows con glob literal/nombre supuesto fallaron y se corrigieron con selección `rg -g`/ruta comprobada; no se presenta el intento como lectura exitosa.

No se modificó código ni importes en este encargo. Archivos modificados: este documento nuevo y entrada de estado en `../SPRINT_STATUS.md`. Desarrollado/probado anteriormente y revalidado localmente, no desplegado ni utilizado para una cotización de negocio.

## Ejecución, límites y recuperación

Responsable/ejecutor/verificador único Codex/OpenAI. Recomendación/elección histórica conservada `gpt-6.1-sol`, esfuerzo solicitado alto para análisis económico y conciliación; versión nativa exacta/modelo/esfuerzo observado desconocidos, sin selector cambiado. Claude candidato válido para revisión, no invocado: no elección explícita ni política activada y no se justifica duplicar contexto para esta comprobación determinista. Sin Astra/Luna/Fable/subagentes ni inferencia auxiliar.

Presupuesto de este gate: hasta 60min, cero llamadas auxiliares, máximo dos correcciones diagnosticadas por causa; sin necesidad de agotarlo. Consumo de tokens/cargos/cuota vigente atribuibles desconocidos. No nuevos servicios o gasto activado. La consulta pública de fuentes y las pruebas locales no autorizan contratación ni API de pago. Continuidad solicitada el 04/10/2026; referencias documentales/hashes no autentican consentimiento ni lo amplían.

Checkout físico `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, worktree existente y árbol sucio preservados. `prepare-b2-closeout.ts` SHA256 `d24b0727d67465ac6ee73f2b3c6f11b43463431b73ddc7e82aa039561ccfe1b9` y kernel `3640a05d4cc10820f84de5f295f8d7e0413ad48a87a3921be8981336b6ef5d8b` intactos. Sin cambios DB/Neon/Auth/usuarios/infraestructura/negocio/producción/despliegue/ramas/commits/PR.

Rollback documental: retirar únicamente este archivo y su entrada de estado si no recibieron cambios posteriores; no restaurar archivos completos del árbol sucio ni revertir entregas anteriores. No estado externo que revertir. **B2 queda abierto por suficiencia económica y la decisión de alcance solicitada, no por un fallo de tests.** No seguir acumulando cortes técnicos en sustitución de resolver esa decisión.

# B2 cerrado: validación del escenario público de planeación

04/10/2026. **Cerrado únicamente el alcance autorizado de planeación. Calibración operativa y adopción productiva permanecen abiertas.** Desarrollado y probado localmente; no desplegado, persistido en la aplicación ni utilizado para cotizar una operación.

## Antes y ahora

Antes, el expediente de septiembre conservaba seis remanentes fijos y seis familias variables sin resolver; CFU/CVU/costo completos eran null. Se mantenía abierto B2 por exigir evidencia compatible de todos los importes, no por fallar la matemática.

El usuario respondió **«Autorizar escenario de planeación explícito»** a la pregunta `call_vH5D4gZiXUgH7xad8FFvSK1q:0`. Esta decisión permite construir hipótesis/proxies identificados y validar un presupuesto completo dentro de ese escenario. No demuestra primas reales, prestaciones de mercado MX, facturas, cantidades compradas o calibración de los 210 parámetros. La referencia y los hashes permiten auditar continuidad, no autenticar infaliblemente al autor ni ampliar el consentimiento. No se ha activado una política de selección de modelos.

Ahora, un compositor local separado produce **24 comparaciones completas**, con 88 documentos fijados por hash: dos ciclos × tres FIX × dos interpretaciones de descanso × contado/financiado. No son 24 viajes observados. Conserva el kernel existente, una caja, un pool administrativo y una cuota fija patronal. Ningún faltante se transforma silenciosamente en cero.

Perfil conservado: empresa binacional ya operando con permisos declarados vigentes, relevo propio MX/US, misma caja seca 53′; México DF → Fort Smith AR 72916 vía World Trade Bridge, referencia última semana de septiembre de 2026. Partes automotrices USD 75,000; mercancía MX a cargo del cliente y US dentro de la póliza global del carrier. No se selecciona transportista, fecha exacta ni itinerario certificado para camión.

## Resultado numérico, no tarifa comercial

Comparación ilustrativa: FIX 30/09/2026 **18.0692 MXN/USD**, interpretación explícita que añade descanso al pago por km. Es un corte de comparación, no una fecha de servicio ni contrato laboral seleccionado. Importes USD por **ciclo modelado**, incluyendo el tratamiento de vacíos correspondiente; no sólo la ida cargada.

| Ciclo | Capital | CFU | CVU | Costo productivo |
| --- | --- | ---: | ---: | ---: |
| Red con vacíos esperados como proxy | Contado | 1,115.61 | 4,326.71 | 5,442.31 |
| Red con vacíos esperados como proxy | Financiado | 1,227.86 | 4,326.71 | 5,554.56 |
| Retorno dedicado vacío, misma caja | Contado | 2,578.05 | 8,180.88 | 10,758.93 |
| Retorno dedicado vacío, misma caja | Financiado | 2,839.66 | 8,180.88 | 11,020.53 |

Se calcula con precisión completa y se redondea sólo para mostrar: la suma de dos celdas redondeadas puede diferir un centavo del total. No son mínimo/máximo del mercado. `purchaseUsd` y `sellUsd` siguen null; no hay margen comercial, recomendación de precio o cotización lista.

Ecuaciones reutilizadas:

```text
pool mensual por recurso = reparto conservado en centavos de las 32 partidas
CFU = Σ MAX(pool_recurso × km_ciclo/km_productivos_mes,
            pool_recurso × días_ciclo/días_productivos_mes)
      + cuota patronal fija MX / ciclos compatibles
CVU = Σ 18 componentes variables identificados
costo productivo = CFU + CVU
```

Contado/financiado sustituye únicamente las tres partidas de capital; CVU es idéntico en cada pareja comparable. La misma caja tiene una sola exposición de ciclo; el método agregado existente incluye desgaste/equipo adherido en las partidas de tractor. El CVU cero del centro «caja» no afirma ausencia de desgaste o costo real de esa caja.

## Decisiones de planeación transparentes

La [política fijada](B2_AUTHORIZED_PLANNING_POLICY_2026-10-04.json) contiene los valores y límites; son elecciones de modelado bajo el alcance autorizado, **no importes individuales aprobados como precios reales**. Fuentes originales, fecha, población y unidad conservadas. La nueva declaración de periodo septiembre es una transferencia retrospectiva explícita, no una observación comercial de septiembre.

| Remanente / familia | Tratamiento y efecto | Frontera de evidencia |
| --- | --- | --- |
| `MX_TRACTOR_PERMITS` | CFU: (800×1 mecánica +403.12×2 emisiones +800 reserva administrativa anual)/12/FX. Sept30: 11.10 USD/mes. | Precios brutos publicados sin vigencia actual acreditada; segundo800 es reserva elegida, no otro derecho publicado. No IVA añadido de nuevo. |
| `US_TRACTOR_PERMITS` | CFU: una unidad presupuestaria de46 USD/año /12 =3.83/mes para remanentes administrativos. | No segundo UCR ni demostración de todos los derechos IRP; obligaciones conocidas permanecen. |
| `SHARED_TRAILER_PERMITS` | CFU: inspección700 MXN/año /12/FX =3.23/mes. | Publicación dice remolque; ajuste al semirremolque53′ no certificado. Una caja; registro TX previo no se cobra otra vez. |
| `MX_TRACTOR_FOREIGN_LIABILITY_REMAINDER` | CFU: reserva9000 USD/año /12 =750/mes. | Extremo de guía doméstica US transferido, no prima extranjera homologada ni COI o historia de siniestralidad del carrier. No segundo proxy extranjero. |
| `BOX_BINATIONAL_COVERAGE_REMAINDER` | CFU: objetivo guía150/mes menos25 ya presentes =125 adicionales. | Reserva total de una caja, no endoso territorial/custodia cotizado. |
| `GROUP_SERVICE_TAX_INSTALLATION_REMAINDER` | CFU: pool seleccionado de serviciosUS ×8.25% +dos conexiones35/24meses =66.61/mes. | Factor presupuestario, no impuesto aplicable/factura; conexiones reservadas para recambio, no activación cada mes. |
| `EXTRA_BENEFITS_AND_EMPLOYER_RISK` | CVU: vales3430 MXN/mes prorrateados por principal365 y relevo14 días/año; razones de bonos1.31/24.97, seguro3.51/24.97 y retiro1.47/24.97 sobre salarios viales MX. Devengo adicional de bono, integración SBC y reservas PTU/riesgo/ISN separados. | Transferencia de categorías US, **no estándar de mercado MX**. PTU un mes salarial presupuestado, no reparto legal observado; riesgo7.58875% sensibilidad, no prima de empresa existente. Fiscalidad elegida no certificada. Prestaciones US ya incluidas en ECEC; no bono de bienvenida recurrente, segunda cuota fija o pago vial del relevo duplicado. |
| `MIXED_LODGING_MX_US` | CVU: una noche presupuestada por país/ciclo; estacionamiento ceil(horas/24) por intervalo continuo, MX3/8 y US2/3 bloques red/dedicado. MX94USD/noche proxy+260MXN/bloque; US110USD habitación presupuesto+12.50/bloque; reserva8.25%. | Regla elegida, no mezcla universal, noches observadas o tarifa vigente. Una plaza por movimiento de equipo, no tractor+caja. Se presupone habitación sin estacionamiento y estancia fuera de bays reservados; no se verifica ubicación/custodia. Espera US pagada no se vuelve noche. |
| `MX_ROAD_TOLL_REMAINDER` | CVU: una media del agregado conocido4751/13 por punto no valorizado y movimiento adherido; multiplicidad1/2. | Reserva agregada, no tarifa Carbonera, segundo LosChorros ni bobtail certificado libre. No investigación caseta por caseta. |
| `US_ROAD_TOLLS` | CVU: una unidad presupuestaria histórica5ejes PLT32USD por movimiento adherido, multiplicidad1/2. | Guía H.E.Bailey, no ruta seleccionada ni precio2026 aplicable al viaje. |
| `BRIDGE_DIRECTION_AND_APPLICATION` | CVU: conserva una vez las dos/cuatro partidas conocidas según ciclo. | Direcciones como transferencia modelada explícita; operación/registro real de puente no acreditados. |
| `HANDOFF_INCREMENTAL_SERVICES` | Exclusión documentada: relevo propio dentro de salarios/admin/patio, sin compra de transbordo de tercero. Despacho/derechos de mercancía a cargo del cliente fuera del presupuesto carrier. | No servicios gratis ni ausencia observada de costos; movimientos adicionales no medidos fuera del ciclo de referencia quedan abiertos a calibración. |

Ejemplo Sept30 contado: extras MX135.68/red y264.15/dedicado por ciclo; hotel/pensión MX148.48/226.36 y US146.14/159.67. No facturas o nómina real. La cuota fija EM se mantiene en CFU; los incrementos dependientes del ingreso/riesgo se calculan por persona antes de normalizar a mes/ciclo, con techo SBC preservado.

La exclusión de suplemento por valor de mercancía responde al perfil confirmado, no retira las primas fijas de flotilla. Reservas de seguro, prestaciones y peajes son precisamente los puntos que necesitan revisión de aplicabilidad antes de adoptar el escenario.

## Benchmark y elección de tecnología

Reutiliza el [gate anterior](B2_FINAL_CLOSURE_GATE_2026-10-04.md), el [benchmark del ecosistema](ECOSYSTEM_REUSE_BASELINE_2026-10-03.md), componentes instalados y fuentes primarias revisadas 04/10. El alcance es validar atribución CFU/CVU por recurso, no reconstruir contabilidad, identidad, rutas o un ERP.

| Enfoque | Ajuste / costo total / seguridad y mantenimiento | Decisión |
| --- | --- | --- |
| Compositor actual + política local validada + kernel existente | Conserva fuente de verdad, reparto, sensibilidad y trazabilidad. Usa TS/Zod/Vitest/Node ya instalados, sin dependencia/servicio/licencia nueva. Read-only, determinista; incertidumbre económica etiquetada. | Adoptado para B2 planeación. |
| Total TCO agregado de IMT/ATRI sin atribución propia | Referencias públicas útiles para desgaste/costos, pero un total agregado no valida la unión de dos tractores/una caja/admin ni evita doble nómina/seguro. Menos código inicial, mayor reconciliación/retrabajo en nuestro caso. | Como comparador, no sustitución del kernel. |
| Otra plataforma/motor/ERP | El benchmark tecnológico documentado identifica reutilización posible para funciones estándar. Integrar infraestructura para resolver estas ecuaciones aumenta alcance, licencias/operación/integración y no elimina brechas de evidencia. | No para este corte; decisión separada cuando una capacidad lo exija. |

La capacidad concreta de reparto por ciclo/recursos es adaptación del modelo actual, no una declaración de innovación global. Componentes estándar no se rehacen. B2 no modifica contratos con core/grafos/MCP ni duplica datos maestros.

Fuentes y uso delimitado:

- [Unidad de verificación federal](https://www.unidaddeverificacionfederal.com.mx/inspeccion-fisico-mecanica-y-verificacion-de-emisiones-contaminantes-para-autotransporte-federal.html): importes publicados con IVA y calendario2020, no cotización2026.
- [BLS ECEC junio2026](https://www.bls.gov/news.release/archives/ecec_09092026.htm): categorías de compensación de ocupaciones amplias; transferencia de razones a MX declarada, no cohorte MX. [Trayecto, oferta cerrada](https://careers.trayecto.com/operador-ala-u1hSQWtXJaoU/): comparador de vales, no paquete completo adoptado.
- [Guía de responsabilidad primaria](https://myfullcoverage.com/blog/primary-liability-insurance-for-truckers): rango de asegurador para operación doméstica experimentada, no prima transfronteriza. [Guía de caja](https://www.logrock.com/commercial-truck-insurance/truck-trailer-insurance-2/): rango ya fijado en expediente previo, no póliza.
- [Texas Comptroller](https://comptroller.texas.gov/taxes/sales/faq/local.php): máximo6.25% estatal+2%local como factor de reserva únicamente; no se presume hotel occupancy tax ni que cada servicio sea gravable.
- [Oklahoma OTA, tabla suplementaria2025](https://oklahoma.gov/content/dam/ok/en/ota/documents/annual-report/2025%20ACFR_Supplemental%20Toll%20Schedules%20ONLY.pdf): página física6, H.E.Bailey5ejes, PLT32, vigencia histórica2024-2022. Tabla textual revisada; no afirmar una captura visual verificada en este corte.

Pernocta, UCR, conexiones, seguros y demás referencias se reutilizan de los expedientes locales fijados. GSA110 es asignación hotelera, no precio de hotel. El factor de peajes MX es una regla del modelo, no una publicación externa. Las skills `data:validate-data` y `engineering:testing-strategy` guiaron separación de unidades/cohortes, comprobación independiente y contraejemplos; no se invocó otro proveedor de IA.

## Verificación ejecutada y límites

- **303/303 PASS en15 archivos, 41.84s**: nuevas21 pruebas de planeación; las259 del gate anterior y23 de proyección histórica. Las nuevas verifican CLI→política→fuentes→kernel→CFU/CVU, identidad24, suma independiente, financiación, una caja/admin/cuota, unidades y fechas, daños a fuentes, faltantes/duplicados/exclusiones y repetición determinista.
- TSC estricto de nuevo CLI/helper/tests, ESNext/Bundler: salida0. `npm run typecheck --workspace apps/api`: salida0.
- CLI de planeación: salida0,24casos/88pins/flags separados. `--accept=true` rechazado con salida1, sin stdout. Prueba de proceso con entorno mínimo, sin secretos/credenciales/URLs de DB.
- CLI Sept original: salida2 deliberada,12casos/87pins, `b2Complete=false`, resultados completosnull. Su contrato original no se ha rebajado o sobrescrito.
- `project-b2-evidence.ts --check`: salida0,4contextos/83pins, payload `99594a2ee1e31c67351a77d1124e75ec53d8d5ccbee593c7a5fce2baa264059f` intacto. No regeneración.
- Huella del nuevo payload de casos: `a8598d73a31f62246d540c293aee548f971a35096b0f1f0742341e42c2473655`. Huella de la economía Sept original: `29619c11dc85e4b626bcd617ab1b60f750a10a819e1fb1e3833d67b19f014e57`. Política LF: `0292435008061196cbfafdbef8bcf8f0815435b8f6bcfb65bac84ed754fe6bf3`.

Ejecución inicial de21 pruebas:20PASS/1FAIL por comparar el subconjunto de evidencia fija con el conjunto mayor del compositor (incluye evidencia variable). Se corrigió el test para cotejar cada identidad fija y conservar todos los registros; luego las303 pasaron. TSC inicial usó NodeNext/CJS incompatible con los `import.meta` existentes: se cambió únicamente el comando a ESNext/Bundler; un error de tipo en el contraejemplo de noches fue corregido como input intencionalmente inválido. No modificación del kernel para pasar pruebas, ni reintento ciego.

No UI/roles/Auth/persistencia, sesión autenticada, API desplegada, operación de negocio ni mercado calibrado probados. Tampoco todas las fórmulas heredadas: siguen visibles las tres asociaciones de precios de llantas diferentes y límites de recape del diagnóstico anterior. No se modifica esa historia para declarar calibración. Skills aplicadas dentro del alcance; ninguna pausa atribuible a ellas.

## Estado y siguiente entrega finita

`b2PlanningComplete=true` y `b2Complete=true` existen **sólo en el nuevo contrato acotado de planeación**. `humanAcceptedResults=false`, `allCanonicalInputsCalibrated=false`, `operationalCalibrationComplete=false`, `quoteReady=false`, `adoptedValues=0`, `externalWrites=false`. Es cierre técnico del escenario autorizado, no aceptación humana de riesgo/aplicabilidad.

**Siguiente recomendado: B3, un único recorrido SaaS de revisión del escenario**: seleccionar ciclo/capital/FIX/descanso → ver CFU/CVU y fuentes/hipótesis → identificar pendientes → recuperar contexto al recargar. Reutilizar proyección y permisos existentes; mostrar «Planeación, no calibrado» y bloquear adopción productiva/precio comercial. No otro sprint de FX/casetas ni otra investigación genérica. Los [wireframes existentes A/B](../design/B2_EVIDENCE_REUSE_WIREFRAMES_2026-10-03.md) son punto de partida; antes de cualquier cambio de UI hay que ajustarlos al escenario completo y confirmar dirección. Este corte no cambia UI ni afirma validación visual.

Calibración operativa/adopción queda como gate separado: compatibilidad de primas/coberturas/beneficios/riesgo/fiscalidad, cantidades de hospedaje y movimientos reales. No exige historial privado para continuar investigando fuentes públicas; no garantiza resolverlo con esos proxies. Persistir o adoptar parámetros productivos, habilitar cotizaciones o desplegar requiere el alcance/autoridad específica correspondiente. B3/B4 no se implementan automáticamente bajo el permiso de cerrar B2.

## Responsable, modelos, esfuerzo y consumo

Codex es escritor/integrador/verificador único en D:. No ramas, worktrees nuevos, commits, PR, despliegues, Claude o subagentes. Últimas instrucciones AGENTS proporcionadas por el usuario aplicadas durante el cierre; no se reescribe AGENTS ni se adoptan procesos ajenos.

| Actividad | Resultado y criterio | Proveedor / modelo recomendado o solicitado | Esfuerzo / presupuesto |
| --- | --- | --- | --- |
| Revisión y política | Fuentes/hypótesis con país, unidad, periodo y exclusiones | OpenAI/Codex, `gpt-6.1-sol`, elección histórica conservada | Alto; hasta25min, cero llamadas auxiliares |
| Composición y conciliación |24casos íntegros, kernel reutilizado, cantidades/costos sin duplicación | OpenAI/Codex, `gpt-6.1-sol` | Alto; hasta35min, máximo2 reparaciones diagnosticadas por causa |
| Verificación y cierre | Pruebas afectadas, CLI/TSC, hashes, documentación y recuperación | OpenAI/Codex, `gpt-6.1-sol` | Alto conservado en este encargo; hasta30min, sin cambio silencioso de modelo |

Elección heredada explícita del ejecutor Codex, no política global ni selección por routing. Versión nativa exacta/modelo observado y esfuerzo efectivo **desconocidos**; no se equiparan con la recomendación ni se cambia selector. Incertidumbre económica alta, matemática verificable; Claude considerado candidato igualmente válido, pero duplicar contexto no aporta evidencia de pólizas o facturas y no fue elegido/invocado. Ninguna disponibilidad actual de Claude/Fable se presume por catálogo o acceso anterior.

Presupuesto local del corte90min dentro del techo histórico del encargo, sin nuevos cargos/servicios activados, cero inferencias auxiliares. Consumo/tokens/cuota/cargos atribuibles no observables; no se reutiliza una cuota histórica como disponibilidad actual ni se afirma costo monetario cero. Consultas públicas y pruebas locales no autorizan pago ni contratación.

## Archivos y rollback selectivo

Nuevos: `apps/api/scripts/compose-b2-planning-scenario.ts`, `apps/api/scripts/lib/b2-planning-scenario.ts`, `apps/api/tests/benchmark-b2-planning-scenario.test.ts`, política JSON y esta entrega. Cambios documentales: nota de supersesión en el gate anterior y nueva entrada en `docs/SPRINT_STATUS.md`. Sin otro archivo modificado por este corte.

Checkout `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`; árbol ajeno sucio preservado. Hashes físicos comprobados: closeout `d24b0727d67465ac6ee73f2b3c6f11b43463431b73ddc7e82aa039561ccfe1b9`, kernel `3640a05d4cc10820f84de5f295f8d7e0413ad48a87a3921be8981336b6ef5d8b`, snapshot `5a94f5ad1ba353edc2b7a84cfc56a70d6947f14b27927f2efab3da56f580afea`: intactos.

Rollback: retirar únicamente esos cinco archivos nuevos **tras verificar que no recibieron trabajo posterior**, y quitar únicamente las dos notas nuevas, no restaurar archivos completos del árbol sucio. No ejecutado; sin estado externo que revertir. No cambio DB/Neon/Auth/usuarios/infraestructura ni adopción a deshacer. El CLI histórico continúa reproducible aun sin los archivos de planeación.

Reproducción desde la raíz física:

```powershell
node --import tsx apps/api/scripts/compose-b2-planning-scenario.ts
node --import tsx apps/api/scripts/project-b2-evidence.ts --check
node node_modules/vitest/vitest.mjs run apps/api/tests/benchmark-b2-planning-scenario.test.ts
node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --module ESNext --moduleResolution Bundler --target ES2022 apps/api/scripts/compose-b2-planning-scenario.ts apps/api/tests/benchmark-b2-planning-scenario.test.ts
npm run typecheck --workspace apps/api
```

# B2 · DEF y carretera/cruce agregados en la misma cadena económica

## Resultado y alcance

Antes, el CLI de septiembre reconstruía 13 filas variables no laborales y LABOR, con 26 partidas fijas conocidas y seis remanentes fijos desconocidos. DEF y carretera/cruce estaban documentados en el expediente de octubre, pero no formaban parte de esa unión de septiembre.

Ahora incorpora sólo los componentes conocidos desde sus cantidades e importes nativos: dos filas DEF, un agregado de carretera MX y dos/cuatro movimientos de puente según ciclo. Hay **18 filas no laborales en red y 20 en retorno vacío dedicado**, 12 casos laborales y 24 comparaciones contado/financiado bajo los tres FIX fechados. Se conservan las seis referencias fijas. Las 48 combinaciones adicionales de sensibilidad DEF son alternativas de reemplazo, no cargos acumulados ni otros viajes.

No se investigaron casetas individualmente, cambió la ruta ni seleccionaron fechas exactas, financiación, impuestos o una tasa FX. El caso conserva México DF → Fort Smith AR 72916, Puente III, caja seca 53′, empresa binacional existente con relevo propio MX/US y misma caja. El CLI es una referencia local: **no cambia la calculadora SaaS, su snapshot publicado, bases persistidas o cotizaciones**.

## Benchmark y decisión mínima

Revisión previa proporcional: bibliotecas de fluidos, carretera/cruce y cobertura MX, sus políticas/archivos fijados, composición pública del piloto, adaptadores de septiembre, pruebas y estado Git. Las fuentes de verdad continúan siendo documentos locales verificados por hash y cálculos existentes; no se renovaron precios por internet en este corte.

| Alternativa | Ajuste y costo | Decisión |
|---|---|---|
| Nueva investigación/ruteo detallado | Amplía alcance y mantenimiento sin resolver el objetivo actual de conciliar fórmulas/inputs; podría implicar APIs/cuotas | No necesaria para este corte |
| Sumar los subtotales USD de octubre | Duplica ralentí incluido en fluidos, traslada FX viejo y puede ocultar monedas de cruce | Rechazada |
| Reconstruir cantidades × precios nativos y usar septiembre sólo para valorar | Reutiliza fórmulas y contratos existentes, separa faltantes y verifica conservación del histórico | Elegida |

La parte específica es la integración económica del relevo MX/US con una caja, LABOR y comparación por ciclo/FX. No se reconstruye una plataforma, otro motor o servicio común. Sigue TypeScript/Zod/Vitest existente, sin dependencias, tecnología, infraestructura o licencias nuevas.

Flujo: expediente fijado → diésel de carretera y ralentí ya reconstruidos → DEF consumido → agregado MX y movimientos de puente → conversión por moneda → mismo subtotal variable → mismo fijo/cuota laboral → suma conocida y faltantes visibles. No hay cambio UI/UX, por lo que no se requiere otro wireframe en este corte.

## Reglas y evidencia económica

- **DEF una vez:** volumen DEF = (diésel de carretera + reserva de ralentí) × fracción. El subtotal antiguo de fluidos incluía ralentí; no se añade ese subtotal ni se repite el combustible. No es un aditivo del diésel ni un gasto de la caja.
- MX: `(472.20 + 314.65) × 1.16 / 20 = 45.6373 MXN/litro`, precio de paquete más envío publicado, IVA explícito. Se asigna el volumen consumido, no otra compra de contenedor completo ni envío gratuito por umbral sin calendario de compras.
- US: `9.88 × 1.0825 / 2.5 = 4.27804 USD/galón US`, SKU específico y supuesto de impuesto Laredo existente. No confirma disponibilidad, compra en Laredo, distribución a granel, exención fiscal o envío real.
- 4 % sigue siendo el preset público de comparación, no calibración DD15 ni elección del usuario. 3 %/5 % sustituyen sólo esas dos filas; no se suman los tres escenarios ni se presentan como límites de costo íntegro. La configuración SCR se declara para el modelo, no se acredita un VIN/fleet real.
- **Carretera MX agregada:** 4,751 MXN por conjunto de movimientos C5; multiplicidad uno en red/dos en retorno dedicado. El dato del proveedor 4,770 MXN se conserva como antecedente, no se suma. No se agrega otro Jorobas de 278 MXN, otra caja o cobro proporcional por kilómetros bobtail.
- **Puente por movimiento:** red conserva MX cargado norte 144 MXN y bobtail sur 3 × 4.75 = 14.25 USD; dedicado añade bobtail norte 65 MXN y caja vacía sur 5 × 4.75 = 23.75 USD. Cada movimiento se cobra una vez y mantiene su moneda. El tractor MX puede tener un cargo en USD; moneda no se infiere exclusivamente del país del recurso.
- Puente norte conserva su advertencia de dirección/aplicación no verificada. La tarifa US mantiene el contexto 2026 y ajuste siguiente 01/01/2027. El retorno carretera sigue siendo una hipótesis de movimientos inversos, no observación del trayecto.
- Los 13 movimientos seleccionados conservan cobertura disjunta; cinco tienen vigencia inicial desconocida. Se rechaza un `effectiveFrom` posterior al FIX de septiembre, pero no se convierte una fecha faltante en prueba de vigencia.
- Carbonera C5 actual, carretera bobtail MX, peajes interiores US y servicios incrementales del relevo permanecen sin importe completo. La celda vacía actual no se interpreta como cero por el cero histórico. Los kilómetros, combustible y tiempo de enlace ya incorporados no se añaden de nuevo como gasto desconocido de carretera.
- Todos los precios/periodos fuente se mantienen. Los precios DEF fueron capturados el 02/10, no observados en septiembre. `historicalSeptemberPricesVerified=false`; comparación retrospectiva declarada, sin inflación/reindexación o calibración inferidas.

Referencias reutilizadas: `operatingFluids` (`B2_OPERATING_FLUIDS_2026-10-02.json`, SHA-256 `2b3f3d2655a1bb42fcdf5ff5123fc83d1615b5215bac82a416fb02b328f83763`), `pilotRoadBorder` (`B2_PILOT_ROAD_BORDER_SCENARIOS_2026-10-02.json`, `69047bd29c1c08938f784a7811b8244bb05255bb09637bda23fa9566b774d2e5`), `mxTollFollowup` (`B2_MX_TOLL_FOLLOWUP_2026-09-30.json`, `52cecc69261cfb3b7410389acf978a2c8b544a0b26038daf538e18c26edadee6`) y `mxTollCoverage` (`B2_MX_TOLL_COVERAGE_2026-10-02.json`, `54c02d00a8aacdae7c7c432d1ba0a16e7b93224613d18620123174e7cf56880f`). No se modificaron sus bytes ni se crearon precios/pins sustitutos.

Los precios AMSA/Walmart y metodología DOE tienen archivos originales verificados en el consolidado. El enlace del fabricante para el rango DEF conserva **`PRIMARY_WEB_READER_HTTP_403_NOT_ARCHIVED`**: no se presenta como una nueva captura HTML original o certificación DD15. La trazabilidad de impuestos US incluye el source ID reutilizado `TEXAS_LAREDO_DEVICE_TAX`. Tarifas/condiciones no se declaran verificadas en vivo hoy.

## Lectura del caso, no cotización

Ejemplo 28/09, interpretación `RATE_EXCLUDES_WEEKLY_REST`; no selecciona ese FIX:

| Ciclo | DEF conocido USD | Carretera/puente conocidos USD | Variable conocido USD | Fijo + variable contado USD | Fijo + variable financiado USD |
|---|---:|---:|---:|---:|---:|
| Red con vacíos esperados | 85.93 | 288.61 | 3,870.82 | 4,864.16 | 4,977.53 |
| Retorno vacío dedicado | 163.63 | 582.30 | 7,477.86 | 9,743.43 | 10,007.79 |

Las diferencias conocidas respecto al corte anterior son 374.54005405 USD/red y 745.93326692 USD/dedicado, exclusivamente DEF y agregado carretera/puente. No sustituyen la tabla anterior como prueba de costo completo. Sensibilidades de DEF al 3 %/5 % modifican la suma conocida en ±21.48165971 USD/red y ±40.90859123 USD/dedicado en este FIX; todo lo demás se mantiene. Las cifras no son precios de venta, costos reales del carrier, CFU/CVU íntegros ni mínimos demostrados.

## Cierre y pendientes

Este corte de conexión/revaloración conocida se cierra localmente cuando pasan aritmética, linaje, monedas, no duplicación, sensibilidad y regresión del histórico. **B2/E1 no se cierran:** salidas completas CFU/CVU/costo de viaje siguen `null`, `quoteReady=false`, adopción 0.

Siguiente prioridad de negocio: completar el paquete de prestaciones adicionales/pernocta mixta MX/US y delimitar riesgo patronal/aplicabilidad, después resolver remanentes fijos y de carretera/cruce sin volver a cobrar componentes existentes. Los seis remanentes fijos conservan sus importes `null`. Validación metodológica pública no requiere convertir la referencia en una operación real ni pedir facturas privadas; un viaje operativo real requeriría fecha/condiciones suficientemente definidas.

No hay una decisión nueva que el usuario deba tomar para aceptar este corte local. Los presets son comparaciones, no adopción de parámetros. No se ejecutaron operaciones comerciales, pagos, persistencia SaaS, Auth, Google/APIs facturables, SQL o despliegues.

## Verificación

Primera ronda: **112/112 pruebas PASS en siete archivos**, incluidas 24 nuevas de DEF/carretera, 18 variables de septiembre, 20 fijos de septiembre, 10 LABOR, 11 fluidos históricos, 17 carretera/cruce y 12 cobertura MX. Primer TSC estricto encontró una asignación literal en la prueba que corrompe deliberadamente Jorobas (`278` frente al contrato literal `0`); se corrigió la construcción del dato inválido, no el contrato económico. Una ronda de reparación diagnosticada.

Inspección del CLI por proceso hijo: salida **2 deliberada** por referencia incompleta; 86 pins, 12 casos, seis referencias fijas, 24 comparaciones de base y 48 sensibilidades de reemplazo. `--def-price=1` sale 1, rechazado. Se leyeron las cifras del ejemplo directamente del CLI; la salida 0 del comando inspector no sustituye la salida 2 del cálculo parcial.

Verificación ampliada después de la última modificación de código: **250/250 pruebas PASS en 12 archivos**, salida 0. Los siete anteriores más hoja mensual pública 22, piloto público 63, expediente B2 23, variables históricas 18 y bobtail 12. TSC estricto del CLI y pruebas nuevas/variables/fijos de septiembre, ESNext/Bundler: salida 0. Snapshot previo intacto, SHA-256 del payload `99594a2ee1e31c67351a77d1124e75ec53d8d5ccbee593c7a5fce2baa264059f`, 83 pins históricos sin cambiar; CLI de septiembre conserva sus 86 pins. `git diff --check` de estado: salida 0 con advertencia LF/CRLF; búsqueda de espacios finales en los cinco archivos de código/prueba/entregable: sin coincidencias. El diff de Git no cubre archivos no rastreados, por eso se inspeccionaron explícitamente. Vitest conserva una advertencia de deprecación de Vite CJS; no es un fallo ni se actualizó tooling fuera del alcance.

Las pruebas son locales de contratos y cálculo sobre evidencia pública fijada; no demuestran login Supabase, persistencia multiusuario, aceptación humana, precios observados septiembre o utilización productiva. No se atribuye aprobación a toda la suite del repositorio.

## Archivos, recuperación y elección de ejecución

Checkout físico `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Estado inicial 186 entradas sucias, inspeccionado junto a worktrees; no se creó otra rama, worktree, commit, PR o preview. Trabajo anterior/ajeno conservado.

Modificados: `apps/api/scripts/lib/reference-september-operating-components.ts`, `apps/api/scripts/review-b2-september-labor.ts`, `apps/api/tests/benchmark-b2-september-economics.test.ts` y entrada en `docs/SPRINT_STATUS.md`. Nuevos únicamente en este corte: `apps/api/tests/benchmark-b2-september-fluids-road.test.ts` y este entregable. Los scripts/prueba de septiembre anteriores no estaban rastreados: no borrarlos completos por tratarse de archivos untracked.

Rollback selectivo: retirar `defSchema`, bloques nuevos DEF/carretera/sensibilidad y sus metadatos del adaptador; devolver `add` a su moneda derivada original para las 13 filas antiguas; restaurar la lista anterior de cuatro conceptos pendientes y quitar `historicalSeptemberPricesVerified` introducido en este adaptador. Retirar `defSensitivityComparisons` del CLI y devolver su pendiente global a `VARIABLE_DEF_ROAD_BORDER_REVALUATION`. Restaurar las tres aserciones de 13 filas/no DEF y pendiente `MX_DEF` en la prueba previa. Retirar sólo los dos archivos nuevos de este corte y su entrada de estado; repetir las pruebas previas variables/fijos/LABOR y snapshot. **No reset/clean, borrado de investigación anterior ni restauración completa desde HEAD.** No hay rollback externo: no hubo cambios externos.

Ejecutor/integrador/verificador único Codex, proveedor OpenAI. Elección explícita conservada **`gpt-6.1-sol`, esfuerzo solicitado alto**; versión/modelo nativos y esfuerzo efectivo no observables, selector sin cambio. Misma elección para revisión de evidencia, implementación y pruebas. Claude se consideró como alternativa de revisión, pero no aporta una consulta necesaria para esta conexión determinista verificable y no existe elección explícita para invocarlo. No otros modelos, subagentes, router o política activados.

Presupuesto comunicado: hasta 60 minutos y dos rondas de corrección; una usada en la prueba negativa de tipos. Tokens, cuotas/reposición del plan y cargos reales no observables; no se afirman consumo cero de la sesión ni disponibilidad ilimitada. Cero invocaciones auxiliares y ningún nuevo servicio/gasto activado. Skill `engineering:testing-strategy` guió pruebas de integridad y escenarios de error, no una nueva infraestructura de test.

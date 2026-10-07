# Sprint 2 · cierre aritmético y suficiencia económica por familias

## Resultado

**Conciliación aritmética cerrada para los 24 escenarios públicos B2; calibración y adopción operativas no cerradas.** El [resultado estructurado](S2_FAMILY_ECONOMIC_RECONCILIATION_2026-10-06.json) conserva precisión completa. Antes había un puente calculable y propuestas compartidas probadas localmente; ahora existe una comprobación independiente de partidas → asignación mensual → exposición por recurso → CFU/CVU y una matriz de suficiencia económica para las 13 familias. No se cambiaron precios, fórmulas ni políticas.

Esto no convierte los 210 campos del catálogo en parámetros calibrados. El inventario conciliado sigue siendo 7 campos con alternativas públicas, 186 con evidencia a nivel de familia y 17 sin lector literal identificado. Esas categorías no miden calidad ni porcentaje de avance operativo. Tampoco se confunde el cierre B2 de planeación pública con Sprint 2 completo o B4 de salida.

## Alcance, benchmark y elección

Continuación humana «adelante continua», 6oct2026. Checkout físico D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama codex/cost-tires-release-s14, HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd, cambios previos conservados. AGENTS leído; ninguna rama/worktree/PR creada ni sesión ajena adoptada.

Revisión previa proporcional: [conciliación existente](S2_OPERATING_BASE_ADOPTION_REVIEW_2026-10-05.md), catálogo/contratos y compositor B2, política pública autorizada, snapshot y pack ya usados por el panel. Contraste externo puntual EIA/BLS/Texas, no investigación reiniciada ni actualización completa de 88 fuentes. La capacidad requerida es conciliación económica trazable, no otro dashboard ni motor.

| Enfoque | Ajuste, costo y riesgo | Decisión |
|---|---|---|
| Reutilizar B2 y comprobar familias independientemente | Sin dependencia, infraestructura o gasto recurrente nuevos; preserva método y evidencia. Requiere declarar las transferencias y reservas. | **Elegido para este corte.** |
| Rellenar los 210 defaults o repartir agregados entre Qty/PU/FTE | Rápido visualmente, pero simula precisión y puede duplicar costos; no hay evidencia para esa desagregación. | Rechazado. |
| Reconstruir cada microvalor antes de mostrar una referencia | Mayor tiempo y mantenimiento; ni más detalle ni otra librería certifican representatividad de mercado. | Fuera del MVP de planeación; sólo ante un requisito concreto posterior. |

No arquitectura nueva: backend existente como productor; evidencia congelada y política versionada como fuentes de la propuesta; catálogo V3 permanece separado. Diferencial: explicar la economía por recurso y responsabilidad en relevo binacional. Conciliación, permisos, persistencia e idempotencia son capacidades comunes ya reutilizadas, no innovación declarada para justificar más código.

Ejecutor único Codex/OpenAI. Modelo recomendado/solicitado GPT-6.1 Sol, esfuerzo alto; modelo nativo y esfuerzo efectivo observados desconocidos. Claude considerado: la revisión Fable anterior está cerrada y su cupo 1/1 consumido; no hace falta otra inferencia para estas sumas deterministas. Sin llamadas Claude, subagentes ni modelos auxiliares. Ventana local del corte: 45min desde aproximadamente08:40 Ciudad de México; como máximo dos correcciones por causa, sin gasto/acceso externo nuevo. Tokens, cuota y cargos no observables; no se afirma consumo cero del modelo principal.

Skills: `data:validate-data` para separar suma, unidad/periodo, hipótesis y suficiencia; `systematic-debugging` para aislar una invocación sin salida; `verification-before-completion` para no convertir exit0 sin resultado en prueba. Sin UI modificada: se conservan [wireframes y validación del panel](../design/S2_SHARED_FAMILY_PROPOSAL_2026-10-06.md), no se afirma una nueva aceptación visual o autenticada.

## Comprobación independiente, no sólo bandera del compositor

Se ejecutó una auditoría read-only con Node nativo y el CLI tsx existente, importando `composeB2PlanningScenario` y `projectOwnRelayReview`. El segundo verificó SHA de los 88 pins locales; prueba integridad respecto al congelado, no vigencia ni representatividad de todas las fuentes online.

Por cada una de las 24 claves únicas ciclo/financiación/FIX/descanso:

1. Cruzar las 32 filas únicas del ledger con las 32 partidas del presupuesto por ID e importe.
2. Convertir cada partida mensual a centavos; distribuir por participaciones con mayores restos, desempate en orden canónico MX_TRACTOR/US_TRACTOR/SHARED_TRAILER. Comprobar conservación de cada pool y sumas por recurso contra el productor.
3. Recalcular CFU por recurso como `mensual × MAX(km_ciclo/km_productivos_mes, días_ciclo/días_productivos_mes)`. Añadir una sola cuota fija patronal MX, `cuota_mensual/ciclos_compatibles_mes`.
4. Sumar para CVU sólo los conceptos `DOCUMENTED_COMPONENT`. Conservar las dos exclusiones como null y explicación, no como observaciones de costo cero. Comparar CFU, CVU y total contra los outputs con tolerancia absoluta 1e-7 USD.
5. Identificar por separado el efecto de seis reservas fijas, reservas viales, política de hospedaje y prestaciones adicionales MX. No estimar con este subconjunto toda la incertidumbre restante.

Resultado: 24/24 conciliados, 32 partidas/20 conceptos por caso, una caja, cuota fija una vez. Ejecución completa exit0, 7.819s. Primer intento por tsx.cmd con argumento multilínea devolvió exit0 **sin resultados**, por lo que no se contó como verificación. Se aisló con un probe y se repitió mediante Node nativo, con marcador de inicio y JSON de resultados. Sin escritura ni repetición de operación de negocio.

Para reproducir el chequeo de fuentes/snapshot con el productor ya existente desde la raíz física:

```powershell
node node_modules/tsx/dist/cli.mjs apps/api/scripts/project-b2-own-relay-review.ts --check
```

Ese comando comprueba el snapshot, no sustituye la recomputación independiente de los pasos anteriores. Identificadores y hashes completos están en el JSON adjunto. No se volvió a ejecutar toda la suite de aplicación para este cambio exclusivamente documental; las pruebas de colaboración/SQL/browser anteriores quedan en su informe fechado, no se presentan como realizadas otra vez.

## Comparación útil para la decisión

USD por ciclo. FIX30sep2026=18.0692; interpretación explícita `RATE_EXCLUDES_WEEKLY_REST`. Son escenarios de comparación, no fecha real acreditada ni precio de venta.

| Ciclo de referencia | Capital | CFU | CVU | Costo productivo |
|---|---|---:|---:|---:|
| Red con vacío esperado como proxy | Contado | 1,115.61 | 4,326.71 | 5,442.31 |
| Red con vacío esperado como proxy | Financiado | 1,227.86 | 4,326.71 | 5,554.56 |
| Dedicado, misma caja con retorno vacío | Contado | 2,578.05 | 8,180.88 | 10,758.93 |
| Dedicado, misma caja con retorno vacío | Financiado | 2,839.66 | 8,180.88 | 11,020.53 |

La financiación sustituye la alternativa de capital; no se añade otra cuota completa del préstamo. El cambio de retorno altera exposición y componentes variables, no sólo un recargo porcentual. Las 24 alternativas abarcan 5,396.42–11,090.81 USD: **envolvente de escenarios, no rango del mercado**, sin probabilidades asignadas ni selección automática del menor resultado.

En los casos centrales de contado, el subconjunto de políticas identificado es 608.79 USD/red (11.19%) y 1,077.47 USD/dedicado (10.01%). En las 24 alternativas representa 9.63–11.19%. Incluye clases completas de hipótesis de hospedaje/prestaciones, no sólo importes sin fuente. **No significa que el resto esté certificado, ni que el error probable sea ese porcentaje.** Capital, rendimientos, nómina y utilización mantienen sus propios límites de transferencia.

## Matriz de suficiencia: las 13 familias, sin falsa calibración

“Conciliado” significa que el cálculo y su ubicación cuadran; “condicionado” que la evidencia pública no certifica el target operativo. Ninguna fila autoriza publicar ni rellenar sus campos canónicos.

| Familia | Relación con el motor comprobada | Suficiencia económica y decisión pendiente |
|---|---|---|
| GENERAL_BASE | MX/US, responsables, relevo propio y una caja explícitos. | Alcance público confirmado para este piloto; no transferible a todos los segmentos. OWN_RELAY no equivale a THROUGH_TRACTOR V3. |
| COST_CAPITAL | Pérdida de valor/residual/horizonte e interés; alternativas contado/financiado separadas en CFU. | Condicionado por cohortes/fechas y vida/residual; oferta pública no prueba precio adquirido. No usar principal como gasto económico. |
| COST_INSURANCE | Primas mensuales por territorio/recurso, caja una vez; exclusión de suplemento por envío conserva prima global. | Reservas de responsabilidad extranjera/caja no certifican endosos, custodia ni un COI real. No pedir pólizas privadas para seguir modelando referencia pública. |
| COST_PAYROLL | Un pool administrativo asignado por participaciones, no plantilla completa repetida por tractor. | Pool público condicionado por tamaño y estructura de empresa; no FTE observados ni 14 microvalores calibrados. Operadores fuera de este pool. |
| COST_COMPANY | Servicios directos/compartidos y permisos reconciliados en CFU. | Seis remanentes fijos identificados; reserva fiscal/instalación no es factura. No convertir agregado en46Qty/PU inventados. |
| COST_MAINT | CVU por km, attached/bobtail separados; desgaste de caja incluido en compuestos. | Cohortes IMT/ATRI/TTI transferidas; no historial de mantenimiento de esta empresa. No sumar otra caja encima del agregado. |
| COST_TIRES | CVU agregado por km de vehículo y uso; bobtail separado. | Alternativo al método detallado por posición/vida/recape. No acredita12inputs ni sumarlos a la tasa agregada. |
| FINANCE | FIX fechado y alternativas de financiación alimentan componentes nativos. | Periodo conciliado en B2; no adoptar el FIX de octubre del paquete canónico sobre septiembre. Capital de trabajo/carrier/XBF no se infiere como igual. |
| FUEL | Precio×consumo vial/vacío; ralentí/DEF explícitos sin doble cargo. | Precio US fechado corroborado; rendimientos históricos y traslados MX40′→53′/cargado→vacío siguen como proxies, no desempeño observado. |
| LABOR | Remuneración vial, prestaciones adicionales, patronal, cuota fija y viáticos reconciliados. | Transferencia de ratiosUS aMX, riesgo/PTU/impuestos son hipótesis. Hospedaje ambos países como política elegida, no “estándar” universal acreditado. |
| UTILIZATION | MAX distancia/tiempo por recurso y ciclo compatible; caja una vez. | Capacidades/días/productividad son hipótesis explícitas, no programación legal ni utilización observada. Km de caja no tienen que igualar suma de tractores con bobtail. |
| RISK | Separado del costo productivo; no ausencia=null→0. | Política comercial pendiente: el benchmark no autoriza un porcentaje automático ni convierte reserva patronal en recargo de riesgo comercial. |
| TECHNICAL_MARGIN | Compra/venta permanecen null; margen fuera de CFU/CVU. | Decisión comercial pendiente; costo público no es oferta, compra ni margen mínimo aceptado. |

Los 16 apartados del catálogo incluyen además BORDER, CONFIG y COST_CROSSBORDER: su cobertura está en el paquete210, no desaparece por agrupar economía en13familias. Las9plantillas de segmento no son9bases cloud verificadas; no se consultó su inventario persistido.

## Vigencia de fuentes y periodo

- [EIA, actualización diésel](https://www.eia.gov/petroleum/gasdiesel/), revisada6oct2026: Gulf Coast/PADD3 muestra5.955USD/gal para28sep y5.819 para5oct. Confirma el precio de origen fechado usado en septiembre; no sustituirlo silenciosamente por el último valor ni inferir compras de todo el corredor.
- [BLS, ECEC junio2026 publicado9sep2026](https://www.bls.gov/news.release/archives/ecec_09092026.htm): categoría privada transportation/material moving conserva24.97 de salario y1.31/3.51/1.47USD/h de componentes usados. **Inferencia:** trasladar sus ratios a beneficiosMX sigue sin probar un estándar mexicano.
- [Texas Comptroller](https://comptroller.texas.gov/taxes/sales/faq/local.php):8.25% es máximo combinado; no acredita la gravabilidad o tasa de cada servicio. En B2 sigue como factor reservado, no impuesto real certificado.

Las siete alternativas del paquete anterior mezclan referencias/normalización de octubre, incluido FIX1oct18.3688, con fuentes de septiembre. B2 conserva reconstrucción nativa/FIX de septiembre y declara los traslados de cohortes. El nombre de un evidenceId de octubre no prueba que se usó ese FIX como divisor: revisar la fórmula nativa y c.fx. No se modificó ese artefacto histórico ni sus observaciones.

## Gate siguiente: una base pública utilizable, no más micro-sprints

El flujo objetivo sigue siendo elegir base/versión → elegir escenario → ver CFU/CVU y sus salvedades → guardar propuesta → recuperar sin duplicar. La propuesta actual es de planeación, no una base productiva lista para cotizar. El permiso previo ya aprobó las hipótesis B2 **sólo para planeación**: no hay que pedir otra vez permiso para calcularlas, ni convertirlo en consentimiento de adopción.

Para cerrar Sprint2 quedan dos paquetes delimitados:

1. **Aceptación de propuesta de referencia:** asociar explícitamente método OWN_RELAY, periodo, responsable y salvedades en la versión elegida; confirmar cuáles políticas se aceptan como referencia pública, manteniendo “no calibrada”. No cambiar THROUGH_TRACTOR ni210defaults. Requiere decisión humana sólo si implica adoptar valores/políticas o ampliar semántica operativa. Este informe no ejecuta esa adopción.
2. **Recorrido autenticado del panel:** guardar/recuperar la propuesta compartida con identidad real ADMIN/OPERATOR, recarga, UUID por actor y rechazo de otra organización/VIEWER. La prueba SQL local previa usó identidades sintéticas; el browser previo usó transporte fixture. No extrapolarlos a Supabase/Neon. Cualquier nueva ventana/acceso/escritura QA necesita autorización puntual vigente; no reutilizar gates cerrados o vencidos.

Después sigue B4: resolver comprobaciones globales pendientes y salida autorizada. No abrir otro sprint de casetas ni rellenar parámetros por apariencia. No hace falta que el usuario aporte tarifas privadas: las limitaciones públicas se conservan como limitaciones o se resuelven con una investigación enfocada al bloqueo de adopción concreto.

Veredicto `data:validate-data`: **compartir con salvedades** para referencia pública conciliada; **necesita revisión/aceptación** para calibración o adopción productiva. Cero adopciones; quoteReady:false; compra/venta:null. No release completo verde declarado.

## Evidencia, cierre y rollback

Cambios de este corte exclusivamente documentales: este informe, JSON adjunto y una entrada nueva en SPRINT_STATUS. Sin fuentes/snapshot/pack/política/importe/fórmula/código/Auth/DB/usuarios/producción modificados, sin despliegue ni procesos persistentes nuevos. Hashes de insumos y branch/HEAD se verifican al cierre. El JSON es evidencia descriptiva; no nuevo contrato runtime ni autorización infalsificable.

Verificación posterior a la escritura del entregable: nueva recomputación independiente24/24, cuatro comparaciones centrales y envolvente/subconjunto contra el JSON,88pins y SHA de pack/paquete/política intactos; exit0 en6.420s. Checkpoint6oct2026 08:58 Ciudad de México: rama/HEAD idénticos, `git diff --check -- docs/SPRINT_STATUS.md` sin errores (aviso LF→CRLF, no fallo). El diff acumulado del estado incluye trabajo anterior; no se atribuye todo a este corte. Sólo dos archivos de conciliación nuevos y entrada de estado añadida aquí; sin build/suite/browser/SQL nuevos ni actualización online completa.

Rollback: retirar únicamente estos dos archivos nuevos y la entrada de estado de este corte, conservando cambios ajenos, evidencia anterior y ledger Claude cerrado. No reset Git, borrado recursivo, SQL ni retirada de artefactos históricos. No se materializa una base ni se vende/cotiza un viaje por haber terminado esta conciliación.

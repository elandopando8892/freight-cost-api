# B2 — decisiones del negocio aplicadas al modelo de referencia

3 octubre 2026. **Perfil incorporado y probado localmente; B2 todavía no cerrado.** Las respuestas humanas definen la empresa, remuneración, pernocta, período, mercancía y responsabilidad de seguros. No autorizan convertir cualquier precio encontrado en un dato calibrado, verificar permisos privados ni publicar cambios.

## Resultado y objetivo

Antes, el cierre local no conocía fecha/mercancía/valor/pagador y el escenario ordinario US asumía cabina, sin hotel habitual. Ahora el cierre puede cargar el perfil fijado `B2_USER_SCOPE_20261003`. Conserva el compositor CFU/CVU, sus 210 parámetros y los dos ciclos; excluye exclusivamente el seguro suplementario por embarque a cargo del carrier. Mantiene los costos fijos de flotilla y abre el remanente de pernocta US sin borrar salarios/prestaciones/M&IE ya conocidos.

No se completaron todos los trabajos económicos. El total solicitado de septiembre sigue pendiente; las sumas históricas de octubre permanecen en `historicalReferenceComparison`, no en los outputs del caso del usuario. Esto es una integración de investigación local, no una modificación de la pantalla/producto desplegado.

## Decisiones recibidas

| Tema | Alcance confirmado | Lo que no se infiere |
| --- | --- | --- |
| Empresa | Binacional ya operando, permisos vigentes | Alta nueva, historia limpia de dos años, prima real de riesgo IMSS o permisos verificados |
| Remuneración | Bonos y prestaciones adicionales habituales del mercado | Otro porcentaje genérico encima de prestaciones ya incluidas o bonos de contratación mensuales |
| Pernocta | Mezcla hotel de paso/pensión en **ambos países**; aclaración posterior recibida en este corte | Todo el descanso en cabina, hotel gratuito, noches contadas del tiempo del activo, mezcla50/50 o patio de base como pernocta de viaje |
| Fecha | Última semana de septiembre2026 | Salida exacta o documentos de octubre aplicables retrospectivamente |
| Mercancía | Partes automotrices, **75000USD** | Ese valor como prima de seguro, valor ilustrativo de otro expediente o clasificaciónhazmat |
| Seguro | MX por cuenta del cliente; responsabilidades US dentro de póliza global de flotilla | Cargo suplementario por embarque, exclusión de toda la prima fija o suficiencia contractual acreditada por un COI |

Interpretación explícita de la ventana:28–30 septiembre, porción en septiembre de la última semana calendario que inicia en lunes. No inventa fecha de partida ni valida el calendario real del ciclo. Relevo propio MX/US, misma caja seca53′, WTB, MéxicoDF–FortSmithAR72916 y ambos ciclos se conservan. Contado/financiado son comparaciones públicas, no elecciones de financiamiento o contratación hechas por el usuario.

## Benchmark previo y recomendación

Se revalidaron rama/HEAD/worktree, contratos locales, bibliotecaZod, compositor de presupuesto, resolución de remanentes, jornada/nómina y expedientes fijados de seguro/FX/viáticos. No se modifica arquitectura, infraestructura, motor canónico, tecnología, licencia o integración. Reutilización de82pins históricos más el recibo nuevo fijado; los expedientes históricos no se sobrescriben.

Alternativas: (1) relabelar octubre como septiembre y asumir cobertura completa: descartada por fechas y alcance incompatibles; (2) otro motor/TCO o reconstruir cada caseta: descartada por duplicación y desviación del objetivo; (3) aplicar el perfil en el cierre existente, conservar comparación histórica y bloquear aceptación fuera del período: **implementada**. Es la ampliación mínima local de los contratos existentes; no se declara innovadora para justificar desarrollo propio. Los importes adicionales requieren benchmark, no otro stack.

Fuentes públicas primarias releídas3oct2026 mediante texto web; el JSON contiene un extracto manual tipado, **no un archivo original del proveedor ni certificación histórica**:

- [Banxico tablaFIX](https://www.banxico.org.mx/tipcamb/tipCamMIAction.do?idioma=sp): determinación28Sep17.8413,29Sep18.0710,30Sep18.0692MXN/USD. Diferenciar columnasFIX/DOF/para pagos. El perfil conserva tres sensibilidades de valor de mercancía:1338097.50,1355325.00,1355190.00MXN. Ninguna selecciona FX del motor o cargo por seguro. El FIX1Oct18.3688 del comparativo antiguo no valida septiembre.
- [IRS Notice2025-54](https://www.irs.gov/pub/irs-drop/n-25-54.pdf): sección3 página impresa2, transporteCONUS80USD/día; sección6 página impresa7, efectividad1Oct2025. La referencia aplicable a septiembre es anterior al Notice2026-60, efectivo1Oct2026. Igual valor nominal no basta para trasladar vigencia. Es referencia de sustentación fiscal trasladable sólo bajo hipótesis de asignación; no salario, reembolso obligatorio ni precio de hotel. No se cambió la política histórica de octubre ni se calculan deducciones.
- [BLS ECEC9Sep2026](https://www.bls.gov/news.release/archives/ecec_09092026.htm): datosjunio2026 ya publicados antes de la ventana. Se conserva el límite del grupo transporte/movimiento de materiales, no sólo operadores. Prestaciones/pago suplementario ya están en la envolvente de la alternativaUS; no sumar otra carga legal/bono automáticamente.
- [Trayecto Querétaro caja seca](https://careers.trayecto.com/operador-sencillo-caja-seca-xI1ywOf9L4-o/):2.10MXN/km, prestaciones superiores, contratación diferida15000 y vales3430sin frecuencia; no mensualizar esa oferta por inferencia. Fondo/caja de ahorro, uniformes/seguro de vida publicados sin importe completo. Tampoco establece paquete binacional o promedio nacional.
- [Trayecto ALA caja secaCDMX](https://careers.trayecto.com/operador-ala-u1hSQWtXJaoU/): vales3430MXN **mensuales**, bienvenida10000, ahorro/pensiones; exige conocimiento México/Bajío/Laredo. Comparador más próximo a MX, no muestra independiente del mismo grupo. Reclutamiento cerrado, etiqueta relativa un año, fecha exacta desconocida. No cambiar la frecuencia del anuncio de Querétaro ni promediar/sumar ambos bonos. Identifica un componente público con unidad; faltan reparto empleado-mes, tratamiento patronal y resto del paquete.
- [PensiónKm40.5](https://pensiondetrailers40-5.com/):260MXN/cada24h para tracto+un remolque o remolque mayor9m, CuautitlánIzcalli. No210paraunidadmenor9m, no520full, no260porcadaactivo. No habitación incluida, vigenciaSept/IVA/bundle verificados; comparador actual no reservado ni extrapolado a todos los sitiosUS/MX.
- [HotelSanPedroExpress](https://hotelsanpedroexpress.com/hotel/): alojamiento en ruta57, km108Matehuala–Saltillo, estacionamiento privado. No tarifa publicada en la página ni inclusión del estacionamiento de tractocamión en precio de habitación. No se hizo reserva, contacto o envío de solicitud.
- [FMCSA seguro de operacionesMX enUS](https://www.fmcsa.dot.gov/international-programs/what-insurance-and-proof-financial-responsibility-do-i-need-operate-us): contexto de responsabilidad y prueba financiera; **no documenta** este cliente, payer, contrato o precio. El único uso de la URL en la evidencia de exclusión acompaña una declaración metodológica humana explícita, no una observación de cobertura deFMCSA.

## Comportamiento implementado y límites

`lib/b2-operating-profile.ts` valida un recibo estrecho/hash, no importes libres. Reutiliza `resolvePilotCostRemainders` para excluir sólo `SUPPLEMENTAL_CARGO_VALUE_INSURANCE`. No reduce a cero la prima de flotilla, la responsabilidad extranjera ni custodia territorial; mantiene filas y montos fijos exactamente. `US_DRIVER_TOTAL` ya agrupaba salario/prestaciones/viáticos; conserva su importe conocido y pasa a parcial para incorporar el gasto de hotel/pensiónUS aún sin precio. MX ya era parcial. Se conserva una caja y una administración; no se agregan pólizas por relevo/país.

El reporte muestra cinco comprobaciones de aplicabilidad: mes de presupuestoOct distinto deSept, FIXposterior, avisoM&IE posterior, prima inicial claseVIMSS no equivalente a empresa existente, y pernocta mixta todavía sin canasta completa. Tener autoridad vigente no identifica una cohorte estadounidense de nueva autoridadIndiana ni dos años limpios. Si se elige cualquiera de esas sensibilidades extranjeras se expone también `B2_FOREIGN_PREMIUM_COHORT_UNMATCHED`, sin eliminar sus montos históricos ni afirmar que el costo real sea cero.

Selección de perfil explícita porid; llamadas históricas sinid mantienen su modo de comparación previo, que tampoco afirma cierreB2. Resoluciones hechas con SHAantiguo son rechazadas tras el cambio de alcance. Nuevas resoluciones no pueden volver a monetizar la exclusión resuelta. Completar aritmética con centinelas sintéticos no certifica beneficios, fechas o cobertura; los outputs de septiembre siguen null.

Resultado actual por ciclo: **13 remanentes monetarios:6fijos/7variables**. Es igual número que antes, pero distinto alcance: salió el suplemento por mercancía y entró la pernoctaUS. No declarar una reducción ficticia del trabajo. Las comprobaciones de aplicabilidad son adicionales y distintas de esos remanentes.

## Verificación reproducida

- Después de la última modificación de código/JSON/pin: **212pruebasPASS/9archivos,49.50s**, incluyendo12del nuevo perfil. Contratos de piloto63, presupuesto22, resolución24, proyección21, inventario24, nóminaMX28, jornada14, fórmulas4. Primera pasada142PASS/5archivos antes del nuevo comparador y comprobación de riesgo; no reutilizada como prueba final.
- TSCestricto de los dos scripts y dos archivos de pruebas afectados:exit0. `git diff --check`exit0; avisosCRLFpreexistentes no equivalen a fallos. Comprobación de whitespace de los cuatro archivos nuevos:PASS, pinJSON y SHAde`engine.outputs.ts`revalidados después de las ediciones documentales.
- Dos invocaciones **reales de CLI** como procesos hijos, contado/financiado, con `DATABASE_URL`/`STAGING_DATABASE_URL` retiradas del entorno hijo. Ambasexit2esperado por `CONFIRMED_PROFILE_REVALUATION_PENDING`;83pins, matriz210, dos ciclos,13remanentes/ciclo,5comprobaciones de aplicabilidad, outputs completosnull. Perfil no admitido:exit1.
- Comparaciones parciales deoctubre sin cambio: contado4816.210709853235/red y9645.151413785585/dedicado; primera alternativa financiada4927.032687347224/red y9903.236902554787/dedicado. **No costos completos ni límites inferiores**; no resultados del períodoSept solicitado.
- Pruebas de no mutación/determinismo, rechazo de reintroducción/staleSHA, perfil adulterado/precio de hotel inventado/bono genérico/cobertura acreditada, retención de seguros/nómina, pernoctaUSparcial y bloqueo de equivalencia de vigencia. Test de aritmética sintética completa sigue sin desbloquear aceptaciónSept/B2.
- No UI nueva, wireframe no pertinente a este cambio de CLI/contrato. Tampoco login, persistencia, escenario económico real ejecutado, despliegue, DB, Auth, usuarios o infraestructura. No fuentes privadasXBF, llamadas facturablesGoogle/SAKBE, operaciones de negocio ni IAauxiliar. Pruebas locales y revisión de fuentes públicas no son aceptación de negocio.

Reproducción: desde la raízD, usar la solicitudJSON`options`de [la entrega anterior](B2_CLOSEOUT_DELIVERY_2026-10-03.md) y añadir en la raíz `"operatingProfileId":"B2_USER_SCOPE_20261003"`; ejecutar `node --import tsx apps/api/scripts/prepare-b2-closeout.ts JSON_REQUEST` con Node24.19ya disponible. El CLI imprime sóloJSON y sale2 mientras falta aceptación. El test nuevo reproduce selección contado/financiado, bajo las mismas alternativas de comparación y sin DB. Cierre de evidencia3oct2026 aproximadamente21:12UTC; actividades locales y búsquedas públicas, sin cambio de modelo o facturación.

## Trabajo concreto que queda y dependencia del usuario

**No falta otra respuesta humana en este momento.** El alcance ya está definido; investigar/normalizar es responsabilidad del agente.

1. Valorar canasta de bonos/prestaciones adicionalesMX con frecuencia/empleado/relief, sin repetir lo ya incluido. Los3430mensuales permiten un comparador, no cerrar todo el paquete. Separar recurrencia/rotación de bienvenida, apoyo de gasto y costo patronal; respetar exclusiones/sensibilidades públicas.
2. Valorar hotel+pensión en ambos países con noches/mix operativo explícitos, precios publicados y límites de impuesto/estacionamiento, sin otra comidaUS ni patio de base. No preguntar al usuario por tarifas privadas.
3. Reconstruir la base temporalSept con FIXde esa ventana, avisoIRSaplicable y componentes laborales/fiscales correspondientes. Reutilizar fuentes anteriores mediante transferencia declarada cuando aplique; no relabelar montos/fechasOct ni inflar todo a la vez. Mantener las tres sensibilidades hasta fijar razonablemente política de valuación de referencia, no fecha de pago inventada.
4. Consolidar permisos recurrentes/seguros globales/servicios como canasta de empresa existente. Altas no se vuelven costo mensual recurrente; primas iniciales permanecen comparadores, no prima real existente. Resolver las8brechas de base y4inputs agregados de viaje del cierre previo según nuevo alcance; no investigar cada caseta como objetivo del sprint.
5. Reejecutar cálculo completo/contrastes de ambos ciclos y contado/financiado, con evidencia pública suficiente y límites explícitos. CerrarB2 sólo con criterios cumplidos; pruebas verdes solas no lo cierran y B3no se inicia por declaración.

## Responsable, modelo, costo y recuperación

Codex único investigador/escritor/verificador, enD:. Elección humana registrada `gpt-6.1-sol/high` conservada para investigación/integración/pruebas/documentación; modelo/esfuerzo exactos del runtime actual no son observables por estas herramientas y no se acreditan ficticiamente. Codex/Claude fueron candidatos del sprint vigente; continuidad local con contratos existentes reduce transferencia/retrabajo. No nuevo modelo, Claude/Fable, subagentes o enrutamiento; no nueva elección requerida por pasos menores.

Presupuesto de corte90min como límite de trabajo, dos reparaciones locales diagnosticadas admitidas, cero inferencias auxiliares o APIsfacturables. No fallaron las suites oTSC; hubo búsquedas iniciales por nombres no existentes corregidas contra las rutas observadas, no denegación de acceso ni fallo de proveedor. Cuota snapshotCodexPro de3oct20:04:07UTC semanal31%usado, duración10080min, resetUnix1791580450;5hdesconocida. Es observación previa válida, no estado en tiempo real; Claude/Fabledesconocido. Tokens/reasoning/caché/cargos/cuota atribuible al corte desconocidos, no cero. No créditos/usoextra activados ni inferencia de facturación a partir de cuota.

Raíz física `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, rama`codex/cost-tires-release-s14`, HEAD`4f5fc2de0c3d178dace917231e1092040dec21fd`, worktree sucio revalidado/preservado. SHAde`engine.outputs.ts`antes/después`3640a05d4cc10820f84de5f295f8d7e0413ad48a87a3921be8981336b6ef5d8b`; no se modificó por este corte. PerfilJSONpin`161d071f3038f5fe8fc0a8fac09b78bb00e4c480f2e79744164e9e00f9cb9d39`.

Rollback selectivo: retirar únicamente import/nuevo campo`operatingProfileId`, aplicación/perfil/comparación/guardas añadidos en`prepare-b2-closeout.ts`; restablecer su recorrido previo sobre`c.projection`y82pins. Apartar módulo/perfil/test nuevos si se solicita reversión, conservando esta evidencia. Retirar sólo entradas de este corte en estado/entrega. No restaurar archivos completos, borrar carpetas o tocar cambios ajenos. No commits/ramas/worktrees/PR/push/publicación en este corte.

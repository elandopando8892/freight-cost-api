# B2 · del presupuesto mensual al compromiso de los tres recursos

## Qué cambió

Antes había costos mensuales parciales, una etapa MX y retornos/capacidad sin composición cuantificada. Ahora dos modelos prospectivos conectan esos componentes con distancia, tiempo, vacíos y un ciclo serial de la misma caja. Reutilizan `allocateFixedCost` y `reviewTrailerAttachment`; no sustituyen el motor ni completan importes ausentes. B2 permanece abierto hasta costo D2D completo contado/financiado; B3 SaaS no iniciado por este corte.

Objetivo preservado: México DF → Fort Smith AR72916 vía Nuevo Laredo/Laredo/PuenteIII,53′,relevo propio MX/US. Modelos no seleccionados, no transportista identificado, cotización pactada, gasto observado o itinerario aprobado. Servicio/terminal real sigue pendiente; Octubre2026 es periodo prospectivo, no fecha de viaje elegida.

## Revisión previa y alternativas

1. Reutilizar promedios históricos como si fueran días de calendario observados: rechazado. Los días operativos IMT/ATRI no se rebautizan ciclo elapsed. Los24días disponibles por recurso de este modelo son una hipótesis calendarizada explícita, no300/12o268/12, ni prueba de disponibilidad real.
2. Usar un optimizador o nueva API: rechazado para el alcance; necesitamos el mapa económico y no optimización. Google conservó recibo de validación en memoria, sin números/geometría persistidos: no se reconstruye esa respuesta ni se hace una llamada facturable.
3. Adaptar clocks existentes, capacidades públicas como proxies declarados y dos políticas de recuperación: recomendado/implementado. El estándarMAX y el validador de caja se reutilizan. La traducción de evidencia a recurso/tramo sigue el proceso FCM; no tecnología/infraestructura nueva.

Fuentes revisadas antes de implementación:

- [Travelmath distancia](https://www.travelmath.com/drive-distance/from/Laredo,+TX/to/Fort+Smith,+AR): publica708millas entre ciudades; conversión exacta1139.415552km, no usar1139redondeado para más precisión aparente. [Tiempo](https://www.travelmath.com/driving-time/from/Laredo,+TX/to/Fort+Smith,+AR): resultado del lector de búsqueda del editor primario11h20; apertura directa no disponible. Son proxies de carretera para turismo, no endpoints WorldTrade/ZIP72916, restricciones de camión, geometría o peajes. No se presentan como Google ni ruta certificada.
- SAKBÉ previamente archivado:1124.5764209526735km y709.8829924923754min ideales hasta puertoIII; pin intacto731cb21c1f7bfe2196ab90b12d56a91d4ebd4b1ef5b698ce73209341958b2970. No convertir minutos ideales directamente en ciclo.
- [FMCSA property HOS](https://www.fmcsa.dot.gov/regulations/hours-service/summary-hours-service-regulations): estructura de conducción/pausa/descanso. El modeloUS aplica10h/24con media hora después8de conducción, no máximo11continuamente ni reglas de pasajeros. Reutiliza MX10h/24/pausa5h del expediente NOM087. Ambos relojes asumen conductor disponible; no verifican ELD, horario semanal, labor, ventanas o historial.
- [FMCSA detention](https://www.fmcsa.dot.gov/research-and-analysis/impact-driver-detention-time-safety-and-operations): contexto histórico de estándar2h de terminal; no duración actual de todas las paradas. Dos horas de carga/descarga y dos de handoff son hipótesis, este último no medición de frontera. Reset14h es política prospectiva, no promedio publicado.
- [TTI presentación2023](https://static.tti.tamu.edu/tti.tamu.edu/documents/TTI-2023-5-presentation.pdf): páginas7/8 renderizadas y revisadas enteras. WorldTrade media87min Standard/86FAST; mediana70ambos. La extracción plana podía atribuirle89deBOTA: descartado antes de codificar. [Estudio](https://static.tti.tamu.edu/tti.tamu.edu/documents/TTI-2023-5.pdf), sección3/PDF14, identifica2019.87es cruce completo histórico norte, no espera actual; no sumarlo a70como segunda fase. Su aplicación sur simétrica y solapamiento carretera/cruce0 son hipótesis explícitas sin verificación, no hechos. El handoff separado requiere validar esa frontera física.
- [PAMT comunicado H12026](https://www.sec.gov/Archives/edgar/data/798287/000143774926025703/ex_998666.htm):84270milmillas,1545company+454owner promedio y7.61%vacíos publicados. Se revalidó la tabla y nota que excluye terceros power-only.11307.27187593797km/promedio-tractor-mes es proxy combinado, no propiedad exclusivaUS, cohorte utilizada observada o capacidad garantizada. IMT120000km/año se conserva como proxy históricoMX=10000mes, no extrapolación de edad ni plazo de deuda.

La presentaciónTTI descargada y renderizada localmente tiene SHA256c078f640f6550363aeb8e6eed269931d5f0e7e4d439769070627a8f502a15085. Política nueva pin55:327674619252a10df0a01ed692f40829829c67141d330bc46e568debde4b9ea4. Travelmath/FMC son extracciones estructuradas del lector, no originalHTTP. Las otras fuentes/documentos anteriores no se modifican ni se refrescan silenciosamente.

## Dos ciclos, no dos presupuestos inventados

**Red con recuperación esperada:** trasladar7.61%de PAMT a vacíos físicos/MX es hipótesis incierta; `km_total=km_cargados/(1-e)`, no `km_cargados*(1+e)`. No supone retorno FortSmith→Laredo completo. El tractorMX se libera tras handoff y su recuperación no la hereda la caja. EnUS, caja y tractor permanecen juntos hasta su pickup modelado: comparten la recuperación físicaUS, no un segundo movimiento de caja ni un factor sobre todo el kilometrajeMX+US.

**Retorno vacío dedicado:** la misma caja vuelve porUS y luegoMX, con dos cruces y dos handoffs. El tractorMX espera la vuelta deUS antes de regresar con la caja; queda comprometido durante70.6667horas de esa operaciónUS. No puede hacer su retorno inmediato y simultáneamente recuperar la misma caja. La simetría de distancias/tiempos y cruce sur es hipótesis, no una fuente direccional. El ciclo de caja tiene5fases ordenadas:MX→handoff→USida/giro/vuelta→handoff→MXretorno. El contrato antiguo de attachment resume las dos fasesMX; el timeline ordenado conserva su posición real, sin cambiar ni habilitar ese contratoHTTP.

| Modelo | CicloMXdías | CicloUSdías | Caja única días | Ciclos equivalentes/mes |
|---|---:|---:|---:|---:|
| Red/proxyvacíos |1.92733|1.84445|3.06451|7.83160|
| Retorno vacío dedicado |5.38456|2.94444|5.38456|4.44612|

No son rangos estadísticos ni promesas de servicio. El límite mensual usa mínimo de km de ambos tractores y días disponibles de los tres recursos. Capacidad de caja=distancia de su ciclo×ciclos equivalentes factibles; no stockratioPAMT, ni capacidad histórica del tractor copiada. Disponibilidad24días es hipótesis común. Ciclos equivalentes decimales son normalización prospectiva; también se expone floor7/4como contraste físico, no calendario de reservas.

Para cada recurso y escenario monetario anterior: `componente_fijo_asignado = MAX(componente_mes × km_ciclo / capacidad_km_mes, componente_mes × días_ciclo / capacidad_días_mes)`.

| Modelo | Componentes conocidos del grupo, valor caja A | Componentes conocidos del grupo, valor caja B |
|---|---:|---:|
| Red/proxyvacíos |3712.89USD|3734.47USD|
| Retorno vacío dedicado |6858.34USD|6896.34USD|

Son **sumas parciales de componentes fijos asignados del grupo por servicio/ciclo**, no costos completos, mínimos, dos cargos sólo de caja o importes negociados. A/B conservan las dos hipótesis de valor fiscal de caja anteriores; capitales de contado, seguros/permisos parciales y administración/compañía una sola vez. La caja tiene un únicoMAX sobre su ciclo completo; no sumaMAXpor país. Diez parejas no se unen a esta cohorte de una pareja. Las mensualidades anteriores32174.88/32343.83, original0/base2 y todos los outputs completos permanecen intactos.

## Verificación, límites y ejecución

Regresión593PASS/21archivos,19nuevos de ciclo; incluye25relojesMX. Tras última corrección de anotación,19pruebas afectadas reejecutadasPASS y typecheckestricto consolidación/helper/testPASS. Readback55pins, tres recursos, ciclos/capacidades, cuatro sumas parciales, outputs completosnull y todos externalChangesfalsePASS. Diff-check sin errores, avisosLF/CRLFprevios. Simulación determinista con referencias públicas y supuestos declarados, no conducción, autenticación, publicación o usoSaaS.

Pruebas enfocadas por engineering:testing-strategy: límites/pausas/reset sin pausa ficticia terminal, total=L/(1-e), caja no hereda vacíoMX, MX espera para recuperación dedicada, serialidad/conservación, capacidades factibles, unMAX, sourcehash/identidad/cohorte, rechazo89envez87, rechazo268/12como calendario, no unión diezparejas, idempotencia y outputsnull. SkillPDF motivó revisión visual antes de usar la gráfica; no se creó/editó unPDF ni se instalaron dependencias.

Correcciones: al revisar antes de pruebas se detectó que asignar a caja7.61%sobreMX+US exigía más recuperación que la del tractorUS; se alineó el movimiento físicoUS compartido y se dejóMXaparte. No se relaja `attachment exceeds tractor cycle`. TSC encontró un callbackJSONcon anyimplícito; primer intento anotó otro callback y no solucionó el diagnóstico. Se releyó línea82, anotó el callback correcto y reejecutó. Dos intentos de corrección, por encima del límite anunciado de una reparación; no cambio monetario o de algoritmo para acomodar pruebas. El acceso directo a tiempoTravelmath siguió fallando: sólo se conservó evidencia del lector de búsqueda, no númerosGoogle ni éxitoHTTPinventado. Error de ruta de archivo supuesto/globsPowerShell se resolvió leyendo nombres existentes, sin más infraestructura.

ResponsableCodex único escritor/integrador/verificador. RecomendaciónOpenAI GPT6.1Sol/high, esfuerzo admitido en catálogo; principal efectivo/esfuerzo no observables por herramienta, selector intacto. Codexactual suficiente con contratos verificables/contexto existente. ClaudeSonnet/Fable no resuelven falta de datos ni justifican repetir contexto; no invocados. Maxx5/5h/semanal/Fable/inclusión/ruta/usoextra/reposición desconocidos. No agentes, CLIinferencia, bridge, nuevas credenciales ni automatizaciones.

Cuota soportada al inicio09:57UTC/03:57México y refresco15:14UTC/09:14México2oct: semanal100%usada,5hno disponible, créditos existentes autorizados; reposición6oct13:08México. No compra/reset/activación. Tokens/cargos reales/caché y equivalencia a cuota desconocidos, fallos no consumo0. Ruta única evita potencial repetición de contexto; beneficio esperado no ahorro medido.

**Presupuesto incumplido:** límite25min desde09:57:25UTC hasta10:22:25; lecturas del reloj pasan de10:09:17a15:13:18. El corte ya excedió el límite al comprobarlo; no se presume causa ni ejecución continua durante ese intervalo. Se detuvieron nuevas investigaciones/desarrollo y sólo se cerró diagnóstico/verificación/documentación. No afirmar cierre dentro del tiempo ni ocultar el intento fallido; próxima actividad requiere reevaluar presupuesto, no encadenar modelos. Sin permiso adicional ni ampliación de producción.

## Pendiente hacia el objetivo íntegro y rollback

El siguiente resultado debe completar paquetes monetarios compatibles y variablesMXUS/53′, combustible cargado/vacío, conductor, mantenimiento/llantas, peajes y frontera, además de caja financiada. Después unirlos a esta exposición para CFU/CVU y costoD2D íntegro, no dar por terminado B2 con esta suma. Los límites de ruta/handoff/capacidad/vacíos requieren una hipótesis sustentada y explícita o evidencia mejor, sin exigir archivos privadosXBF como sustituto de fuentes públicas. Ninguna cifra parcial representa precio de compra/venta.

Rollback sólo de este corte: retirar política/ficha/helper/test nuevos; retirar import/pin pilotCycle, verificación de suPDF/cálculo y campo supportingPilotCycleExposure en consolidación; retirar párrafos nuevos de estado. ElPDF/PNGresearch creados pueden conservarse como evidencia o retirarse únicamente por nombres exactos, sin borrar otras fuentes. No restaurar archivos completos, eliminar trabajo previo, cambiarAGENTS ni tocarDB/Neon/Auth/usuarios/migraciones/infraestructura/producción/despliegues/negocio/IAdeaplicación.

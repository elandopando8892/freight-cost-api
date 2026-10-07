# B2 — tractorMX prospectivo y composición de los tres capitales

## Qué cambió

Antes: el par automático2021/2018 de RemolquesyThermos no permitía una comparación válida para el tractor manualRODAL. Se mantiene rechazado y su archivo original no se modificó.

Ahora: un anuncio de2019 con características principales compatibles se conectó al mismo conciliador, con tres alternativas de capitalMX y dos presupuestos de contado que contienen **tractorMX + tractorUS + una caja compartida**, sin dobles cargos ni adopción canónica.

| AlternativaMX | Pérdida de valor MXN/mes | Interés medio24meses MXN/mes | Capital USD/mes |
|---|---:|---:|---:|
| Contado | 18678.16083333334 | 0 por escenario sin deuda | 1016.84 |
| Financiado nominal11.5% hipotético | mismo | 7778.812767626046 | 1440.32 |
| Financiado nominal15.7% hipotético | mismo | 10780.121300207365 | 1603.71 |

Fórmula: `Dmercado=(1198275.86−750000)/24`. Capitalfinanciado=`Dmercado+interés medio24meses de deuda remanente de referencia`. ConversiónMXN/USD con FIX18.3688 determinado1oct2026; precisión completa y centavosUSD sólo al final. No añadir mensualidad, devolución de principal, segundo tractorUS, caja ni administración dentro del costo del tractorMX.

## Benchmark y decisiones antes del código

[RODAL2021](https://rodaltruckfinancials.com/catalogo/freightliner-cascadia-2021--vhc-f8668c8f02): DD15450HP/manual18/diferenciales46000lb; precio exacto1198275.86MXN+IVA, no headline redondeado1198276; odómetro694920km.

[TodoCamión2019](https://www.todocamion.mx/listings/freightliner-cascadia-2019/): Cascadia/DD15450HP/manual18/diferenciales46000lb y precio$750000; seller note dice precio másIVA. UbicaciónMX/NuevoLeón. **El anuncio no imprime códigoISO de moneda**: se declara explícitamente la interpretaciónMXN del anuncio mexicano local, no una moneda confirmada automáticamente. Los términos de precios de servicios de la plataforma no se utilizan para demostrar moneda/IVA de una unidad anunciada por un vendedor.

El originalTodoCamión incluye publicación/modificación12ago2025. La página fue leída/descargada nuevamente2oct2026 con precio y etiquetaDisponible; eso no acredita fecha de actualización del precio ni disponibilidad real. No existe kilometraje de la unidad en la ficha: el input vacío de un formulario de trade-in no es un odómetro. No se solicitaron informes, cotización, financiamiento ni contactos.

Coinciden país/clase y características mecánicas principales; no se controlan vendedor, VIN, generación de cabina, litera, ruedas, inspección, mantenimiento, condición ni kilometraje del2019. La analogía de24meses supone que el mercado/condición futuros se parecen al equipo antiguo; **no es una curva de depreciación identificada ni residual previsto con confianza estadística**. Tampoco demuestra vida remanente. Es una hipótesis monetaria pública condicionada, no una tasa universal por año. No se multiplican precios por coeficientesUS ni vida contable de equipos nuevos.

Alternativas revisadas: (1) mantener el par automático anterior: rechazado por diferencias conocidas; (2) usar una curvaUS/nueva como sustitutoMX: rechazado por falta de correspondencia; (3) comparable mexicano manual compatible en aspectos principales con incertidumbres declaradas: conectado sólo como escenario condicional, no seleccionado en la base. MarketBook/Penske mostró anuncios manuales adicionales, pero no completó una comparabilidad/IVA mejor en esta búsqueda; no se usaron sus valores ni conversiones automáticasUSD.

La aritmética financiera estándar se reutiliza del cronograma de deuda existente y el mismo schema/conciliador de presupuesto; no se añade stack, servicio de crédito, motor paralelo ni integración externa. El aspectoFCM es el reparto económico por recurso y conservación de una caja/admin única.

## Financiación: hipótesis, no oferta de producto

Contexto históricoDTFS: seminuevosFreightliner, tasas11.5/15.7% con base no especificada,20%enganche,12–60meses, venció31ago2026. No traducirCAT14.62% a tasa nominal ni afirmar oferta vigente/eligibilidad. Los endpoints se reutilizan **como hipótesis nominales independientes explícitas**, no confirmación del prestamista.

Deuda de referencia existente: saldo80%del valor actual neto=958620.688MXN;60meses restantes de pagos mensuales nivelados; comparación económica24meses. Se declara un escenario sin gracia/balloon en la deuda restante: no se traslada automáticamente la gracia del producto histórico de originación. Pagos ilustrativos21082.5684/23159.2647MXN no se cargan como gasto económico. No refinanciación/originación/apertura ni venta al final. El helper recibe0en su input auxiliar de apertura por **inexistencia del evento dentro de la medición**, nunca como evidencia de préstamo real sin comisión; las comisiones transaccionales reales continúan desconocidas/no modeladas. Rendimiento exigido al capital propio permanece separado y no se presume cero.

No se traslada esta oferta de tractor a caja. Búsqueda acotada de financiación de semirremolque encontró [TIPMéxico](https://www.tipmexico.com/arrendamiento-de-trailers/): modalidades de renta/arrendamiento/caja53′ y plazos, pero sin tasa numérica pública suficiente. Mensualidad de arrendamiento no puede sumarse a depreciación e interés sin separar su contenido. Resultados de cajas populares/automóviles/RV/otros países no prueban financiación de un semirremolqueUtilityusadoMX. No llenar interés de caja con0 ni convocar productos/contactos. Esta ausencia no detiene otras familias del presupuestoB2.

## Integración y aceptación de este corte

`reviewedMxCapitalSensitivity`: tres copias locales con capitalMX, capitalUS del modo correspondiente (472.99contado/691.43financiado) y primaUS1055.42. Cada copia3partidas modeladas; no elegir un contrato real. `reviewedBinationalCapitalCashScenarios`: compone MXcontado con cada hipótesisIVA de caja,4/10partidas y una asignación de caja conshare1. Todas las tres familiasCAPITAL tienen importe condicionado en estas copias; **la base anterior sigue2/10, plantilla original0/10**.

Las6familias pendientes de esas copias son: seguroMX, permisosMX, permisosUS, segurocaja, permisoscaja y administraciónúnica. Costo fijo completo del grupo, CFU, CVU, precio de compra/venta y costoD2D siguennull; falta exposición/ciclo/variables y otros términos.4/10partidas no es40%delMVP. No hay una póliza real, deuda real, valoración longitudinal ni casoSaaS operativo. Conservadas piezas previas sin sobrescribir importes/evidencia. Reconciliar repetidamente produce el mismo resultado sin acumular refs.

50JSON fijados porhash y verificación de originales. Nuevos documentoMX SHA256`c58a40cdbc57cbe73aff36cbec0e341fc5afc907cc8d84c5c1e2264e9066eee7`; originalTodoCamión`38b61ddcb6272059ca7561b8b399919c690f129770a57afe15d0d972e09077d3`. Preservados worksheet`63629b174897277ce5501f833e9c24a40fdd24e4c2e323e8663366e2a1a24b80` y revisiónMX previa`96eed7e67cf7fdef8b63ec46efaea2e0b0162bbce96144d05f2672bec908ca9b`. Las referencias de la filaMX ya apuntan al nuevo expediente y no vuelven a pedir investigar un par rechazado como si siguiera sin escenarios.

## Validación y ledger

Pruebas **462PASS en14archivos**: raíz201, exposición35, presupuesto30, contado/deuda25, tarjetas17, USprospectivo10, seguro/patronal33, comparadorUS16, primaUS15, caja/compliance18, caja prospectiva9, impuestos/overhead25, revisiónmercadoMX17 y nuevoMX11. TypecheckAPI PASS y typecheckestricto del helper/script/tests PASS (el APItsconfig sólo incluye src, no se confunde su alcance con scripts). Readback importes1016.84/1440.32/1603.71; tres capitales de contado una vez,4filas/6importes desconocidos, base2/original0, salidas completasnull. Skill `engineering:testing-strategy`: integridad financiera, rechazo de moneda “confirmada” indebidamente, horizonte/perfil/ámbito, originalalterado, permiso metodológico, duplicación/overwrite, nominal/CAT y principal. No nuevaUI ni wireframe; no prueba autenticada, persistencia ni despliegue.

Un fallo conservado: la prueba histórica de revisiónMX esperaba0filas/15condiciones de antes del seguro/capitalUS. Corregida para distinguir original0 de base2/11condiciones, mantener rechazo automático y comprobar las nuevas copias4filas. Se repitió el archivo17PASS; ninguna fórmula nueva falló. CapturaMarketBook no disponible en lector: no se reinterpretó como evidencia ni se encadenaron intentos para obtener valores. Consumo de intentos desconocido, no cero.

Responsable únicoCodex, proveedorOpenAI; recomendado **GPT6.1Sol/high** para revisión y adaptación de contratos financieros acotados. Principal/versión/esfuerzo real no observable, selector no cambiado. Catálogo de la superficie admitehigh como recomendación, no prueba de acceso a un modelo específico. Modelo actual suficiente con contexto/repositorio y verificación determinista; no aportaría resolver el dato documental una llamadaClaude duplicada. Fable no justificado para este corte; sin invocaciones, bridge ni agentes.

Inicio2oct2026 **01:56:49MX/07:56:49UTC**, límite25min y una reparación por fallo diagnosticado. Resultado esperado: referenciaMX conectada, no todaB2; criterio de cierre de actividad: copia trazable, fórmulas/modos verificados, desconocidos conservados y composicióncajaúnica. Dependencias: metodologíaautorizada, perfilRODAL, comparablepublicado, FIXfechado y cronogramareutilizado. Presupuesto acotado: benchmark8min, integración10min, validación/documentación7min, sin prometer cuota/tokens exactos.

Lectura automática de límites07:56:49UTC aproximadamente: semanal100%usada, reposición6oct13:08MX; ventana5h no observable, créditos disponibles bajo continuación ya autorizada. Sin activar pagos/créditos nuevos/reset. ClaudeMaxx5 declarado históricamente; ventanas5h/semanal/Fable, reposición, inclusión actual, ruta de suscripción y usoextra desconocidos; no se ejecuta llamada auxiliar con esa falta de evidencia. Reserva cuantificada/cargos/tokens por actividad no observables: límite temporal, sin reconstruir contexto en otrafamilia ni duplicar implementación. Ningún porcentaje de ahorro, cuota o costo0 declarado.

## Siguiente y rollback

B2 sigue activo con el objetivo completo: cerrar paquetes económicos pendientes/caja financiada; unir capacidad, tiempos, vacíos, cruce y variables; obtener estimaciónD2D reproducible en ambos modos, luegoB3seleccionar/calcular/guardar/reabrir conwireframes. No exigir contabilidad privada ni cotización real para un escenario público; tampoco sustituir el entregable por estas tablas de capital.

LocalD:, rama`codex/cost-tires-release-s14`, HEAD`4f5fc2de0c3d178dace917231e1092040dec21fd`; cambios ajenos preservados, sin ramas nuevas/commit/PR/preview/despliegue. Sin DB/Auth/Neon/usuarios/migraciones/infraestructura, contratación, formularios/comunicación, operaciones de negocio, GoogleAPI ni IA de aplicación.

Rollbackselectivo: retirar import/pin/verificaciónoriginalesMX/mapas3modos/composicióncash y publicaciones/refsnuevasMX en conciliador; retirar nuevohelper/tests/JSON/nota/originalTodoCamión sólo si no incorporaron cambiosajenos. Quitar las entradas de este corte en estados y la extensiónADR, no restaurar archivos completos ni borrar US/caja previos. Mantener correcciones de expectativas históricas que reflejan el estadoUS anterior; retirar sólo las nuevas comprobacionesMX si se revierte la conexión. No reset/checkout destructivo; las fuentes originales y plantilla previas no cambiaron.

# B2 · corregir la ruta de cierre, no certificar un carrier real

Revisión1oct2026,23:16MX. **B2 no está logrado:** reproducción actual muestra41pins,0/10partidas fijas completas, distancia/cicloUS desconocidos y seis outputs finalesnull. Se necesita costoD2D completo por recursos/tramos, no otra colección de sensibilidades. Caso confirmado: México, DF → Fort Smith AR72916, PuenteIII Nuevo Laredo/Laredo, cinco ejes/caja seca53′, relevo propioMXUS y misma caja. Contado y financiado permanecen escenarios pedidos; no deuda real identificada.

## Hallazgo que cambia el siguiente trabajo

El mandato del usuario permite **estimación sustentada en benchmark público y supuestos**. Algunas notas de faltantes exigían hechos operativos identificados —registrante real, flota efectiva, contrato financiero o certificación de vida restante del VIN—. No son requisitos necesarios para un modelo de referencia. Sí lo son importe/hipótesis sustentados, perfil, responsabilidad económica, unidades, periodo, fronteras y denominadores explícitos.

Se corrigieron esas notas en `consolidate-binational-reference-budget.ts` y se añadió `estimationMandate` al mismo resumen. No cambian el conciliador, esquema de importes, pins, activos, datos numéricos, reglas de evidencia, fórmulas ni gates operativos. `DOCUMENTED_PUBLIC_MODEL` ya existe en el contrato: no se introduce un modo permisivo nuevo ni se atribuye al usuario aceptación de un parámetro concreto. Las hipótesis **deben revisarse económicamente**, no basta renombrar un contraste ni autoasignarle una etiqueta.

Por ello, no necesito pedir registros privadosXBF ni una póliza/contrato real para cada supuesto de referencia. Tampoco puedo usar cualquier porcentaje o residual/carga social inventados ni homologar monedas/cohortes sin justificación. Modelo completo revisado, valor calibrado, base adoptada, cotización operativa y precio comercial son estados distintos.

## Opciones y recomendación

| Opción | Ajuste al resultado pedido / costo total / riesgo | Decisión |
|---|---|---|
| Exigir identificación/contabilidad/pólizas reales del carrier | Confunde estimación con aceptación, depende de información privada excluida y perpetúa camposnull | Rechazar como requisito del benchmark público |
| Fichas públicas modeladas, bloques/rangos y supuestos sustentados/revisados | Conserva métodoCFU/CVU, trazabilidad y proceso binacional; reutiliza contratos/cálculos existentes, sin proveedor nuevo | Recomendada y mandato explicitado; importes aún pendientes |
| Sustituir costoD2D por total nacionalATRI/IMT o sumar sensibilidades | Salida rápida pero mezcla familias, población y métodos; no cumple objetivo | Rechazar |

Esta corrección de alcance no autoriza gastos/producción ni reduce el entregable. Diferencial: estimación y conciliación de recursos del relevo, no construir de nuevo catálogo de tarifas, broker, nómina o motor. No arquitectura, UI o dependencia nueva.

## Investigación pública focalizada de seguro de caja

[Logrock, guía de seguro de remolques](https://www.logrock.com/commercial-truck-insurance/truck-trailer-insurance-2/), publicación19feb2026, lectura1oct23:11MX: broker publica orientación de daño físico del remolque de25–150USD/mes o1–3%anual del valor declarado. Tabla de valores es ilustrativa. No identifica tamaño de muestra, distribución de pólizas, comparabilidadMX, condiciones binacionales ni prima para la caja escogida. **Es regla de planificación del proveedor, no observación estadística ni póliza.** Puede evaluarse como hipótesisUS explícita; no trasferir automáticamente aMX, convertir todo el valor de tracto en valor de caja o convertir extremos en intervalo de confianza. Ningún importe se adoptó de esta guía.

[Timi](https://timi.mx/seguro-tractocamion) sigue separando remolque propio y mercancía de cobertura del tracto. No publicó en lo consultado la prima comparable de esta caja; esto no demuestra inexistencia global de otras fuentes. [Progressive](https://www.progressivecommercial.com/coverages/trailer-interchange/) explica custodia no propia bajo acuerdo escrito, no prueba que toda caja del mismo grupo necesite esa cobertura.

[DocumentaciónQuálitas listaTarifas](https://qbcenter.qualitas.com.mx/wsTarifa/wsTarifa.asmx?op=listaTarifas) expone un esquemaSOAP con `cUsuario` y códigos de tarifa/vehículo; respuesta genéricaXML. Documentación visible no equivale a acceso anónimo ni garantiza que el servicio entregue primas calculadas. Se leyó únicamente documentaciónGET: **no SOAP, cotización, credencial, prueba de identidad, formulario ni acceso evasivo**. No se construye conector ni se promete tarifa pública de esa API.

La búsqueda adicional localizó reglas de cargo/coberturas y modelos históricos, pero no cerró prima binacional de caja. Ningún valor de seguro de mercancía se trasladó a daño físico del equipo; deducible/límite de responsabilidad no son prima. No se declara agotado todo el universo de fuentes ni bloqueo definitivo.

## Auditoría del entregable real

| RequisitoB2 | Evidencia autoritativa actual | Dictamen |
|---|---|---|
| Fijos+variables+supuestos públicos | Consolidado41pins; presupuesto0/10importes completos; componentesIMT/conductorMX y cinco gruposUS separados | Incompleto: no total económico por país |
| Capacidad/distancia/tiempo/vacíos/cruce compatibles |67segmentosMX; dos movimientos nominales; capacidad histórica/proxies; reciboGoogle sin contenido de ruta retenido | Incompleto: fasesUS, espera/cruce/vacíos y capacidad del modelo |
| Recursos/tramos, caja y administración una vez | Conciliador de pools/exposición; asignadorMAX y composición serial de caja probados | Algoritmo local probado con casos sintéticos/parciales; no cálculo completo del piloto |
| Resultado reproducible con fuentes/vigencia/límites | CLI reproducibleexit2, fuentes fijadas y salidasnull | Reproducción de investigación parcial, **no estimación completa** |
| Caso solicitado / modalidades | Selección fijada:53′/cinco ejes/PuenteIII/relevo; fuente de solicitud de contado y financiado | Perfil físico confirmado; restantes hipótesis económicas y modalidad no inferidas como carrier real |

Los green tests no modifican estos dictámenes. No usar41documentos/pins ni número de pruebas como porcentaje de cierre. No afirmar que el objetivo quedó terminado por corregir su mandato.

## Ruta concreta para el siguiente trabajo, sin sprints nuevos

1. Completar **las fichas económicas de referencia** MX,US y una caja: capital/financiamiento, prima/territorio, permisos y un pool administrativo. Para cada importe/rango: fuente o modelo publicado, hipótesis propuesta, inclusiones y exposición. Donde falte sustento, mantener faltante concreto; no exigir evidencia privada de un carrier ni fabricar un valor para cerrar la fila.
2. Resolver faseUS y ciclo serial/vacíos/cruce con evidencia permitida y hipótesis operativas revisadas; la consultaGoogle fresca requiere autorización puntual y condiciones de consumo, no se reconstruye desde recibo vacío. Fecha de evaluación puede ser hipótesis modelada explícita, no fecha de un servicio real atribuida al usuario.
3. Producir y revisar el **costoD2D completo**, ambas modalidades de pago, con sensibilidad e incertidumbres. Sólo después cerrarB2. B3 después ofrece seleccionar→calcular→guardar→reabrir con wireframesMARKSMAN, sin fingir compra/venta.

No se solicitó aquí nueva decisión trivial que el objetivo ya permite: hipótesis públicas sustentadas forman parte del mandato. Si una propuesta material cambiara método, alcance, costos, proveedores o autorización externa, sí se presentará para decisión puntual.

## Verificación y estado local

Worktree físicoD:\andre\worktrees\freight-cost-model\cost-tires-release-20260927; rama`codex/cost-tires-release-s14`, HEAD`4f5fc2de0c3d178dace917231e1092040dec21fd`, confirmados al inicio. Instrucciones del usuario vigentes; archivo centralAGENTS observado SHA256`72836e1bb0ddf61b2a1296115abab9034afba0344a948cf642b5f606e41b8a05`. No usar la nota histórica29sep«AGENTS vacío» como estado actual.

**247/247pruebas focalizadasPASS**, tres archivos: consolidado182, presupuesto30, exposición35. Prueba nueva verifica mandato público, persistencia de fronteras y ausencia de promoción automática a costo completo. Typecheck estrictoPASS después de la última modificación de código; ningún fallo/reintento en este corte. Las pruebas no prueban validez económica de inputs faltantes, cuotas de seguros, persistenciaSaaS ni operación real. No se repitió build de aplicación ni se cambió UI.

LecturaCLI antes del cambio fue auditoría actualexit2; tras cambio se verifica readback de mandato y mismos41pins/0partidas completas/seis outputsnull. Sin staging/commit/ramas/worktree nuevo/PR/deploy; trabajo previo conservado. Sin DB/Neon/Auth/usuarios/infraestructura/producción, operaciones de negocio, IA de la aplicación o llamadasGoogle facturables.

## Modelo, consumo y rollback

Codex único responsable de escritura/integración/verificación. Recomendación **OpenAI GPT-6.1Sol, esfuerzo alto**; combinación declarada por catálogo de la superficie, no prueba independiente del ID/esfuerzo principal ni de acceso efectivo. Selector no cambiado. Trabajo acotado determinista y evidencia primaria bastan enCodex; Fable/Astra no solucionan falta de importes/aplicabilidad. Claude no invocado; sin agentes, lector de cuotas nuevo ni bridge.

Lectura automática1oct23:09:04MX/2oct05:09:04UTC: usoordinario no disponible, ventana10080min100%usada, reposición6oct13:08MX; secundaria desconocida, créditos disponibles. Lectura inicial, no saldo posterior; sin saldo/accountID publicados. Autorización de continuidad previa, no nueva activación de facturación. Tokens/cargos por actividad no observables; no garantía de costo cero ni ahorro cuantitativo. ClaudeMaxx5 histórico por declaración:5h/semanal/Fable/reposición/usoextra/ruta suscripción desconocidos actuales; sin llamadas. No reserva cuantificable: máximo15min, un reintento por fallo, revisión única y suites focalizadas. Beneficio esperado es dejar de pedir hechos privados fuera del mandato y concentrar gasto en las fichas económicas; no atribuir contribución real aClaude.

Skills `engineering:documentation` y `engineering:testing-strategy`: primera separa evidencia/decisión/acción y enlaza historial sin copiarlo; segunda comprueba que una corrección de mandato no rebaja evidencia ni completa importes por etiqueta. Ambas influyen en este corte, sin nuevo wireframe porque no hay UI.

Rollback: quitar sólo `estimationMandate`, restaurar exclusivamente textos de faltantes cambiados, quitar el test añadido, esteMD y notas de este corte enstatus/plan. No restaurar archivos completos ni tocar otros cortes, pins o fuentes. Objetivo permanece activo y no logrado; turno previo y éste tienen progreso verificable, no una espera inventada ni condición para marcarblocked.

# B2 · una caja 53′: capital de referencia conectado a exposición

1oct2026 · Corte local. Rama verificada `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, checkout físico `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`. Trabajo previo sucio preservado; sin staging, commit, rama, PR o despliegue.

## Resultado y objetivo conservado

Antes, la comparación publicada de dos cajas Utility53′ tenía escenarios fiscales mensuales, pero no estaba relacionada con la exposición de la caja del caso. Ahora el mismo consolidado B2 contiene `supportingSharedBoxCapitalExposure`: cuatro escenarios fiscales por dos sensibilidades de movimientoMX, **una caja física y una operación MAX después de componer fases seriales**. No es otro motor ni una base adoptada.

B2 sigue siendo obtener **costo completo reproducible D2D de terceros**, México, DF → Fort Smith AR72916 vía Nuevo Laredo/Laredo, caja seca53′, relevo propioMXUS y misma caja; CFU/CVU por recurso/tramo, caja y administración una sola vez. Este componente no sustituye ese objetivo por un inventario o por un subtotal. No equivale a compra pactada ni venta.

## Benchmark y elección antes del código

| Alternativa | Capacidad concreta / costo y riesgo | Decisión |
|---|---|---|
| Dos cargos completos de caja, uno por país, o suma de MAX por fase | Fácil, pero sobrecarga el mismo recurso cuando dominan dimensiones distintas | Rechazar |
| Componer fases de una caja y reutilizar MAX y contraste fiscal existente | Implementación acotada, sin servicio/dependencia nuevo; conserva faltantes y dimensiones | Adaptar, para sensibilidad explícita |
| Promedio de póliza por tractor o regla genérica de porcentaje sobre caja | No identifica seguro de caja/territorio y puede duplicar cobertura; no cierra prima actual | Rechazar como input de seguro |

La asignación serial y trazabilidad son parte del proceso FCM; la aritmética estándar reutiliza `allocateFixedCost` y `compareReferenceAssetTaxBases`. No se construye arquitectura, proveedor o producto paralelo. La falta de una prima publicada no se resuelve inventando un importe.

## Evidencia pública revisada y reutilizada

- [Caja Utility2021](https://www.remolquesythermos.mx/product-page/2021-utility-4000-d-x-68-000-lbs-53-x102-caja-seca): lector primario confirma precio ofrecido630000MXN +IVA, 53′×102″, capacidad68000lb y configuración. [Utility2019](https://www.remolquesythermos.mx/product-page/2019-utility-4000-d-x-68-000-lbs-53-x102-caja-seca): precio540000MXN y mismos campos publicados, tratamiento fiscal no confirmado. Relectura1oct23:04MX; capturas del lector pueden ser previas, no certificación de inventario disponible. Ambos importes coinciden con archivos fechados ya conservados. No se confirmó condición/VIN, transacción, precio futuro ni disponibilidad con vendedor.
- `B2_MX_USED_MARKET_COMPARABILITY_2026-10-01.json` y `B2_TRAILER_OVERHEAD_COMPONENTS_2026-10-01.json`: cuatro alternativas de IVA y analogía24meses. Es diferencia transversal de precios de grupos distintos, **no depreciación observada, residual neto ni vida restante**. Marco fiscal previo reutilizado; no nueva determinación fiscal ni cambio de hechos del contribuyente.
- `B2_REFERENCE_PROFILE_EXPOSURE_2026-09-29.json`: caso históricoIMTPT260,120000km y300días operativos/año. Dividir entre12 da10000km/25días de mes promedio **del tractor histórico**. Para esta sensibilidad se declara explícitamente transferir esas dos magnitudes a una caja equivalente. No es observación de una caja53′, productividad actual ni cohorte de los precios del vendedor. No se convierte automáticamente día operativo en capacidad compatible del ciclo.
- `B2_SAKBE_MX_LIVE_DETAIL_2026-09-30.json`:67segmentos suman1124.5764209526735km; se conservan como ruta candidata, no validación de camión. `B2_MX_DRIVING_STAGE_REFERENCE_2026-10-01.json`: movimiento nominal con pausas/descanso25.83138320820626h o12.831383208206257h. No incluye manejo de carga, cruce, espera, retorno ni otras tareas y no es ciclo productivo completo.
- [Progressive costo comercial](https://www.progressivecommercial.com/commercial-auto-insurance/truck-insurance/commercial-truck-insurance-cost/): confirma promedio nacional2025 transport926USD/power-unit-month, no prima de esta caja. [Cobertura interchange](https://www.progressivecommercial.com/coverages/trailer-interchange/): protege remolque no propio bajo acuerdo escrito; pertenecer al mismo grupo no demuestra mismo propietario/asegurado jurídico. [Timi tractocamión](https://timi.mx/seguro-tractocamion): el remolque como bien propio requiere póliza propia; no se obtuvo prima pública comparable de la caja del caso. La misma caja puede necesitar coberturas territoriales distintas, pero sus riesgos/primas deben conciliarse en **un único presupuesto del recurso**, no duplicar una póliza completa por país sin evidencia.

No se consultó cotizador, envió formulario, contactó vendedor/asegurador, registró cuenta ni activó servicios. Precios/tarifas privadosXBF no solicitados. Las páginas no se redistribuyen como librería comercial ni se presume licencia de explotación de sus contenidos.

## Cálculo reproducible y límites

Para cada alternativa fiscal se conserva `C_ref`, diferencia de precios/24meses; se proyecta únicamente ese componente:

`R_ref = max(C_ref × km_movimiento / 10000, C_ref × días_movimiento / 25)`

| Precio2019 interpretado | IVA compra no recuperable supuesto | C_ref MXN/mes promedio | Proyección prefijoMX MXN |
|---|---:|---:|---:|
| Antes deIVA | 0% | 3750.00 | 421.72 |
| Antes deIVA | 100% | 7950.00 | 894.04 |
| IncluyeIVA | 0% | 6853.45 | 770.72 |
| IncluyeIVA | 100% | 11053.45 | 1243.04 |

Son alternativas, **no sumar ni presentar como intervalo estadístico**. En ambas políticas de movimientoMX domina la distancia; diferencia de horas no cambia estos importes. Para primer escenario, componente temporal161.45MXN frente a421.72por distancia. No se eligió tratamiento tributario ni escenario productivo real.

Faltan fasesUS y cruce: total serial permanece null, nunca cero. Cuando estén justificadas, sumar distancias de la misma caja y horasMX+cruce separado+US, luego aplicar **un MAX**. No heredar los retornos de ambos tractores ni agregar dos MAX nacionales. Contraejemplo exclusivamente sintético: con C3750,10000km/25días, fases900km/1día y100km/10días, MAX compuesto1650 frente a suma errónea1837.50MXN. No es ruta/tiempo del piloto.

Adquisición real y correcciones tributarias, condición/residual futuro, disposición, deuda/interés/equity siguen desconocidos; **no se pusieron a cero para llamar completo al capital**. Este prefijo tampoco es piso de CFU: correcciones y capacidad pueden cambiarlo. Seguro, permisos, administración, costos de tractores y CVU no se incluyen en esta sensibilidad.

## Implementación y comprobación

- Nuevo JSON de política `B2_SHARED_BOX_CAPITAL_EXPOSURE_2026-10-01.json`, SHA256 `4582155bd880562736219b62be63b312e291096db68ad8e1ecdb47174b6fb719`.
- Extensión del helper de exposición existente; esquema estricto por recurso, moneda, una caja, alcance y transferencia histórica explícita. Cuatro contrastes fiscales existentes reutilizados, no nuevos importes autorreferenciados.
- Nuevo pin en consolidado, **41pins**. Join de fuente/unidades/valores históricos y política de faltantes; escenarios unidos a IDs de las dos políticasMX y al detalle de ruta conservado. Histórico y salidas gobernadas intactos.
- **261/261 pruebas focalizadas PASS, cuatro archivos**: consolidado181, exposición35, impuestos/overhead25, nueva caja20. Incluyen composición antes deMAX, tiempo de caja desligada, fases faltantes, caja duplicada, ámbito/moneda/denominadores inválidos y gap negativo. Fixtures sintéticos sólo prueban algoritmo, no benchmark.
- Typecheck estricto tuvo un fallo `movement.id` (el contrato ofrece `scenarioId`). **Una corrección/reintento**; nueva prueba valida IDs y se repitieron las cuatro suites después de corregir. Typecheck finalPASS. Consumo del intento fallido no se presume cero ni se atribuye cantidad no observada.
- CLI real finalexit2 esperado:8sensibilidades,41pins,0partidas fijas completas,0adopciones, seis outputs económicos finalesnull. No prueba autenticación, persistencia comercial, navegador ni operación del carrier. Sin build general innecesario.

## Qué falta para cerrar el objetivo

1. Terminar capital/seguro/permisos de una caja compatible y su capacidad productiva, con referencia pública o hipótesis sustentadas/revisadas, no un porcentaje universal.
2. Completar paquetes de ambos tractores y pool administrativo único; numeradores y denominadores del mismo modelo/periodo.
3. Completar fasesUS/cruce/espera/vacíos y ciclo por recurso, fecha/condiciones aplicables; nuevo datoGoogle no se infiere del recibo sin contenido conservado ni se llama sin autorización puntual.
4. Conciliar CFU/CVU y entregar **total de costoD2D reproducible**. Sólo entonces B2 se cierra y B3 lleva seleccionar→calcular→guardar→reabrir al SaaS con wireframesMARKSMAN.

No se abre un sprint genérico de más inventario, fiscalidad, FX o Auth; tampoco se redefine cierre como8sensibilidades. El objetivo continúa activo, no logrado y sin impasse declarado: hay paquetes de investigación/integración por completar.

## Registro de ejecución, consumo y rollback

Responsable único Codex; recomendación **OpenAI GPT-6.1Sol, esfuerzo alto**, combinación declarada por catálogo de la superficie, no verificación independiente de ejecución/modelo principal. Selector no cambiado; principal/esfuerzo no expuestos de modo independiente. Codex basta para reutilización y pruebas deterministas; Astra/Fable no resuelven falta de primas/aplicabilidad. Claude no invocado y ningún agente creado; no escritores concurrentes.

Cuota automática leída al inicio **1oct22:54:07MX/2oct04:54:07UTC**: ordinaria no disponible, primaria100%usada/10080min, reposición6oct13:08MX; secundaria desconocida, créditos disponibles. Lectura al inicio, no saldo actual después del uso; sin saldo/accountID publicados. Autorización previa de continuidad, no activación de billing ni garantía de costo cero. ClaudeMaxx5: declaración histórica;5h/semanal/Fable/reposición/ruta de suscripción/uso extra desconocidos actuales y sin llamadas. Reserva cuantificable no observable: límite25min, un reintento por fallo. No instalar lectores ni acceder a credenciales.

Tokens/cargos reales/cuota atribuible por actividad no observables; ahorro esperado cualitativo por reutilizar integración y limitar suites, sin porcentaje inventado. Búsquedas públicas no proporcionaron prima comparable: ese resultado se conserva como límite, no nueva evidencia de prima cero. Un typecheck fallido y reparación registrados. Distribución permanece Codex y próximo alcance se concentra en paquetes económicos, no escalar por datos ausentes.

`engineering:testing-strategy` orientó pruebas de integridad/unidades/composición/doble cargo; no hubo UI ni wireframe nuevo en este corte. Sin DB/Neon/Auth/usuarios/infraestructura/producción/deploy, negocio, IA de la aplicación, Google u otros proveedores activados. Motor activo no modificado por este corte.

Rollback selectivo: retirar nuevo JSON/esteMD/test de caja, nueva función/import/schema del helper **sin retirar el helper previo**, y nuevo pin/bloque/import/propiedad y test del consolidado; retirar sólo notas de este corte del status/plan. No restaurar archivos completos ni borrar fuentes históricas; contienen otros cambios conservados.

# B2 — inventario, benchmark, base y fórmulas: conciliación actual

## Resultado y objetivo preservado

Corrección expresa del usuario: validar el modelo de costos con su inventario, no convertir cada tarifa carretera en un desarrollo. Se detiene la investigación individual de casetas. El objetivo completo B2 permanece: una estimación D2D de terceros reproducible, con CFU/CVU públicos sustentados, por recurso y tramo, una sola caja y un solo pool administrativo. No se declara cerrado mediante esta matriz ni mediante fixtures sintéticos.

Antes: registro canónico de 135 claves, fichas de septiembre y proyecciones posteriores por familias, separados. El registro declara 3 candidatos, 47 contrastes y 85 faltantes; eso corresponde a su método granular, **no prueba que falten 85 nuevas investigaciones ni que los componentes posteriores no existan**. Las fichas originales conservan sus snapshots, no se actualizan silenciosamente ni se rompen sus hashes.

Ahora: [conciliador ejecutable](../../apps/api/scripts/reconcile-economic-model-inventory.ts) relaciona las 13 secciones con la investigación de 79 expedientes fijados, valores/unidades/períodos, destino económico, fórmula y brecha de cierre. Reutiliza el parser del registro y el consolidado actual; no crea otro motor, endpoint ni esquema de datos. El consolidado valida sus pins y archivos de evidencia antes de alimentar la CLI. Invocar la función con un objeto suministrado no certifica por sí solo la autenticidad de ese objeto.

El punto diferencial continúa siendo la composición económica binacional por recursos y responsabilidades. Inventariar, convertir unidades y reportar linaje son capacidades estándar reutilizadas. No se desagregan importes públicos arbitrariamente para aparentar calibración de microinputs.

## Benchmark previo: adoptar, adaptar, rechazar

Se releen ADR-007/009, registro corriente del1oct, fichas del30sep, consolidado vigente y componentes de administración, variables, financiación y jornada ordinaria. Se reutiliza la investigación fechada; no hay refresh externo de precios en este corte.

- Adoptar el parser, catálogo, fuentes fijadas, presupuesto por recursos, conversión internacional de millas y controles existentes de MAX/solapes.
- Adaptar una vista de conciliación actual por las 13 secciones, conservando el inventario canónico y el método público por familias como granularidades diferentes.
- Rechazar rellenar 46 pares Qty/PU corporativos o vidas/precios de llantas desde una tasa agregada. También rechazar continuar casetas como condición para aprobar la matemática del modelo.

Alcance: reporte local y pruebas, sin arquitectura/dependencia/proveedor nuevo. Flujo: registro → componentes públicos fijados → matriz de secciones → comprobación de normalización/asignación. Criterio de este entregable: toda clave aparece en su sección y toda familia tiene destino, soporte, límite y siguiente condición económica; no equivale a calibración completa. No cambia UI, por lo que no corresponde un wireframe nuevo; B3 conserva su obligación de wireframes MARKSMAN.

## Matriz económica de las 13 secciones

Los IDs de soporte se resuelven a archivo y SHA en `sourcePins` del reporte. Las cifras son componentes/hipótesis de investigación, **no valores adoptados, precios actuales certificados ni costos observados XBF/carrier**.

| Sección | Input/supuesto y soporte existente | Destino/fórmula | Brecha relevante, no nueva investigación genérica |
| --- | --- | --- | --- |
| GENERAL_BASE | País, caja seca53′, relevo propio MX/US, tres recursos y una caja; `selection`, `economicProfiles` | Define perfil/responsable y fronteras antes de sumar | Este caso no calibra drayage, intra-MX, local, reefer, hazmat o flatbed |
| COST_CAPITAL | Adquisición, impuesto capitalizable, residual neto, horizonte, interés/cargos; `mxProspective`, `usProspectiveCapital`, `boxProspective` | CFU: `(A-R)/meses + interés + cargos sustentados`; renta alternativa | Elegir/conciliar escenarios respaldados, sin sumar alternativas ni principal/cuota total |
| COST_INSURANCE | Primas/plazo/coberturas por tractor y caja; modelos MX/US, `boxInsuranceCfu`, RC extranjera | CFU mensual por cobertura/recurso; caja una vez | Delimitar canasta binacional y transferencia de referencias; prima no equivale a riesgo ni seguro de carga |
| COST_PAYROLL | Pool patronal administrativo público escalado: 3,020.22 USD/grupo-mes; `adminPool`, `adminScale` | CFU, pool único repartido entre tractores | Sensibilidad a carga de trabajo/geografía/cobertura; no siete personas completas por tramo |
| COST_COMPANY | Dos cuentas TMS:138 USD/mes; canasta oficina/móvil/patios US:633.98 USD/mes; permisos conocidos:226.601667 USD/mes | CFU, Qty×PU al alcance correcto, servicios compartidos una vez | Cerrar canasta acotada, compliance y tratamiento fiscal. Los permisos necesitan mapeo explícito; estos subtotales no completan 46 microconceptos |
| COST_MAINT | MX partes+mano de obra5.61754 y lubes0.27967 MXN/km (IMT2025); US0.212 USD/milla (TTI2024) | CVU por distancia aplicable; mantenimiento/llantas disjuntos | Transferencia al perfil53′ y bobtail separados; desgaste de caja ya incluido en compuestos adheridos |
| COST_TIRES | MX0.96996 MXN/km; US0.048 USD/milla; `maintenanceReference`, `variableComponents` | CVU por km, o ciclo detallado como alternativa | No inferir posición/vida/recape ni volver a sumar llantas de caja |
| FINANCE | FIX fechado18.3688 MXN/USD; alternativas de capital financiado | Reemplazar capital contado, separar capital de trabajo por responsable | No sumar cuota completa, ni financiación XBF al costo tercero, ni ausencia como cero |
| FUEL | MX27 MXN/L,483.92 L/1000km; US5.955 USD/galón y7.9 millas/galón; ralentí/DEF separados | CVU: precio×consumo cargado/vacío/ralentí según frontera | Precio fechable, sensibilidad cargado/vacío, equipo/SCR y rendimiento histórico; no consumo observado |
| LABOR | MX2.1 MXN/km de remuneración vial y US0.817 USD/milla reportados; beneficios/jornada/viáticos en componentes posteriores | CVU y componente patronal fijo separado | Tasas viales no son costo patronal completo; no duplicar descanso, beneficios, per diem ni salario semanal |
| UTILIZATION | Días productivos24/mes, capacidad km/mes, ciclo cargado/vacío y reloj ordinario por recurso | CFU=`fijo×MAX(km_ciclo/km_mes,días_ciclo/días_productivos_mes)` | Hipótesis de productividad y tiempos deben mantenerse consistentes; caja usa un ciclo serial, no dos MAX nacionales |
| RISK | Política y pagador explícitos; deducibles/RC no constituyen reserva | Línea separada, fuera de costo productivo ordinario | No porcentaje tácito ni cero por falta de política |
| TECHNICAL_MARGIN | Separación costo/compra/venta | Fuera de CFU/CVU productivos | Benchmark no fija tarifa pactada ni precio de venta; política comercial fuera de este cierre de costo |

`RISK`, `TECHNICAL_MARGIN` y `UTILIZATION` no tienen claves consumidas por el enumerador canónico actual. Eso **no** implica aprobación, irrelevancia o calibración; el reporte conserva sus papeles económicos. No se cambia el motor canónico en este corte.

## Validación numérica con evidencia existente, no importes sintéticos

Se comprueba independientemente:

```text
MX combustible USD/km = 27 × 483.92 / 1000 / 18.3688
US combustible USD/km = 5.955 / 7.9 / 1.609344
MX mantenimiento USD/km = (2010.02 + 3607.52) / 1000 / 18.3688
MX llantas USD/km = 969.96 / 1000 / 18.3688
US mantenimiento USD/km = 0.212 / 1.609344
US llantas USD/km = 0.048 / 1.609344
Servicios parciales USD/mes = 2×100 + 100 + 2×4.49 + 150 + 175 = 633.98
Compliance parcial USD/mes = (2021.47 + 46 + 550 + 101.75)/12
```

Vigencia conservada, no refrescada: combustible MX25sep2026, US28sep2026; rendimiento US2006–2008; mantenimiento MXmodelo2025 y USestimación2024; FXobservación1oct2026. Unidades coherentes no vuelven actuales ni representativas esas observaciones. La igualdad cargado/vacío es transferencia explícita, no dos mediciones independientes.

También se recalcula MAX desde presupuesto, km, días y capacidad actuales, y se contrasta con la proyección de jornada ordinaria. **Se usa la capacidad serial actual de caja, no la de un ciclo nominal anterior ni el pool administrativo antiguo.** Estos cuatro resultados son asignación de componentes fijos conocidos, no CFU completo ni costo total:

| Escenario del piloto | Alternativa fiscal de caja | Subtotal de fijo asignado, USD |
| --- | --- | ---: |
| Red/vacío esperado | NET_PLUS_VAT | 809.3440117231 |
| Red/vacío esperado | GROSS_INCLUDES_VAT | 836.5798352469 |
| Retorno dedicado vacío, misma caja | NET_PLUS_VAT | 1,832.8108531791 |
| Retorno dedicado vacío, misma caja | GROSS_INCLUDES_VAT | 1,890.3686521254 |

Por ejemplo, primera fila: tractorMX398.8187283319 + tractorUS376.2480980739 + caja34.2771853173. No se suman las cuatro alternativas ni se incorporan como total al piloto. Cambiar un importe asignado upstream hace fallar la auditoría; no se acepta un subtotal autorreportado. La financiación tiene pruebas de reemplazo de capital existentes; estas cuatro comprobaciones adicionales son de contado.

## Separación del viaje y orden de cierre

Distancias, tiempos, peajes y servicios incrementales son inputs del viaje. Se necesitan importes sustentados para una **estimación completa del piloto**, pero comprobar cada caseta no es requisito para validar inventario, tasas, CFU y CVU. No se convierte un peaje desconocido en cero ni se declara terminado el objetivo B2 por diferirlo.

Trabajo siguiente, agrupado por resultado económico, sin abrir sprints por cada clave:

1. Conciliar un presupuesto público completo por los tres recursos y la canasta administrativa compartida, con alternativas fiscales/financieras y límites explícitos. Usar componentes ya investigados; no exigir una póliza/contabilidad privada para un modelo público.
2. Conciliar las tasas y fronteras variables con compensación patronal, cargado/vacío, bobtail y consumos auxiliares; medir sensibilidad de las transferencias de perfil, no sólo presencia de fuentes.
3. Aplicar esas bases al caso D2D y contrastar CFU/CVU/total por recurso y escenario. Los inputs de viaje son una capa separada; cualquier importe realmente pendiente se conserva visible hasta cerrar el resultado.
4. Sólo después, B3: seleccionar/calcular/guardar/reabrir con wireframes y permisos; sin despliegue ni escrituras externas por este contrato.

## Pruebas, ejecución y límites

Último código: **91 pruebas PASS / seis archivos**,11 nuevas de conciliación,18variables,12admin,15company,21financiación y14jornada. Duración reportada4.44s, salida0. Aritmética independiente con datos del expediente, integridad/missing/duplicados, conservación del pool, MAX por recurso, caja única, períodos, cero adopciones y no mutación. Esto no prueba representatividad de todas las fuentes ni una base calibrada.

Typecheck estricto ES2022/ESNext/Bundler dirigido a script/test PASS, salida0. Primer typecheck detectó tipos de tuple readonly y metadata FX `unknown`; una reparación local con tipo de pins de lectura y validación de frontera FX, sin alterar los componentes previos. Fallo conservado, no contado como consumo cero. Pruebas afectadas repetidas tras la última modificación.

Readback de la CLI real:13secciones,79pins,135claves; salida2 deliberada por economía incompleta. Outputs completos mensual/CFU/CVU/productivo/compra/venta permanecen null; cero valores adoptados. Sin llamadas de red/SQL, Auth, usuarios, infraestructura, despliegue, negocio o IA de aplicación. No build/UI, sesión autenticada ni persistencia probados, porque no cambiaron. El reporte no es certificado de fuentes vigentes ni aceptación operativa.

Uso desde raíz del checkout con Node instalado y `--import tsx`: `apps/api/scripts/reconcile-economic-model-inventory.ts`, sin argumentos; JSON a stdout, sin escritura de bases. Código2 significa entregable parcial explícito, no fallo del script.

## Responsable, consumo y rollback

Codex único escritor/integrador. Elección humana conservada de2oct2026 16:46:22UTC: **gpt-6.1-sol / high**; runtime principal no observable y selector no modificado. Claude puede hacer esta conciliación, pero no está elegido; Fable no resuelve la brecha de datos mejor demostrada y no se invoca. Skills claude-review y testing-strategy aportan lease/checkpoint y verificación económica focalizada, sin llamadas auxiliares.

Máximo global240h autorizado; no deadline nuevo por corte ni obligación de consumirlo. Contrato80pasos, contexto mínimo de registro6500bytes, cero reintentos de proveedor, máximo dos reparaciones locales antes de reevaluar; una realizada. Cuota5h/semanal actual, Claude/Fable, consumo atribuible y cargos desconocidos; no se presenta una lectura histórica como actual, ni se activa pago/uso extra.

Raíz física D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd revalidados. Se conservan cambios ajenos y snapshots históricos. Tres archivos nuevos; sin commit, rama, worktree, PR ni deploy nuevos.

Rollback: retirar sólo este documento, el conciliador y su test si no tienen modificaciones posteriores. Ninguna fuente histórica, importe operativo o fórmula activa cambió; no requiere restauración externa ni reset global. **B2 sigue activo e incompleto**, no bloqueado por casetas ni cerrado por esta matriz.

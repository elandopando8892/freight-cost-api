# B2 — conexión del inventario económico al costo del piloto

Observación del corte: 2026-10-03T03:45:10Z. Local, no adoptado ni desplegado.

## Objetivo y decisión previa

El cierre de B2 requiere una estimación **completa** del D2D México DF–Fort Smith 72916, Puente III, caja seca 53′ y relevo propio MX/US conservando una caja. No se redefine el objetivo como un inventario o subtotal. El turno previo produjo progreso verificable: presupuesto mensual ensamblado y probado; éste conecta sus componentes con la cobertura variable y el compositor del costo del piloto.

Alternativas revisadas antes de implementar:

- Adoptar los totales parciales antiguos: rechazado; contienen fronteras pendientes y exposiciones anteriores, y sumarlos al presupuesto actualizado duplicaría gastos.
- Adaptar el compositor existente: elegido; conserva el presupuesto, el asignador MAX y las 20 identidades variables. Distingue un componente parcial de un concepto completo y conecta dossiers públicos ya calculados.
- Reconstruir precios de cada caseta/factura o crear otro motor: rechazado para esta actividad; no resuelve la calibración del inventario y duplica investigación/cálculo.

Las 79 identidades de fuentes del consolidado se conservan. Los dossiers adicionales leídos para el ensamblaje se validan contra sus hashes fijados. Se reutiliza evidencia fechada; no se afirma una actualización web de precios ni una calibración de las 135 claves canónicas. Periodos y límites originales siguen vigentes **como límites del escenario**, no como certificación de vigencia comercial actual.

No hay interfaz nueva: no cambia el branding ni los wireframes. Flujo local: declarar hipótesis → ensamblar fijos/variables por recurso y ciclo → auditar identidades y fronteras → consultar componentes y pendientes. Sin escritura a bases.

## Cambios funcionales

`compose-public-pilot-cost.ts` conecta combustible carretera, ralentí, DEF, desgaste ligado a distancias disjuntas, remuneración y viáticos. Usa exactamente las 20 identidades del compositor existente. Para cada ciclo hay 11 conceptos con componente documentado, 6 con importe parcial y remanente explícito, y 3 sin importe. La disposición `DOCUMENTED_PARTIAL` exige explicar el remanente y **no habilita el CVU completo**. Evidencia incompatible, duplicada o incompleta suprime incluso el diagnóstico monetario afectado.

Se encontró una omisión de integración: la cuota patronal fija del operador MX ya existía en el forecast, pero no estaba en el presupuesto fijo administrativo. No pertenece al pool administrativo. Ahora `fixedOperatingComponent` conserva su mensualidad y capacidad de ciclos compatibles y el compositor recalcula su asignación a CFU como mensualidad / ciclos del par. La remuneración ligada al ingreso se queda en CVU. Se sustituye el sueldo MX original una sola vez; no se agrega nuevamente la nómina semanal. La cuota fija no se suma si ya está representada en el presupuesto.

La financiación sigue sustituyendo únicamente el capital de los activos. No cambia combustible, remuneración ni cuota patronal. La caja mantiene una asignación fija única; el desgaste variable compuesto tractor/caja no genera una segunda fila de caja.

## Lectura reproducible del ejemplo

Hipótesis explícitas, no elecciones operativas de un transportista: contado `NET_PLUS_VAT`, daño físico de caja `PUBLIC_GUIDE_LOW`, patio MX `NET_PLUS_VAT_RESERVE`, remuneración `RATE_EXCLUDES_WEEKLY_REST`, DEF 4%, aproximación fronteriza `PUBLIC_LINK_FORECAST` y sensibilidad de desgaste `IMT_C3_NON_ARTICULATED_PROXY`. Sin opciones por defecto. Esta última referencia no coincide con un Cascadia: conserva sus efectos de carrocería rígida y limitaciones; no se presenta como calibración del tractor objetivo.

| Ciclo | Fijo conocido asignado, incluida cuota patronal | Variable conocido | Suma de componentes conocidos |
| --- | ---: | ---: | ---: |
| Vacío esperado de red | 984.4714555231577 USD | 3,589.00831433379 USD | 4,573.479769856948 USD |
| Retorno vacío dedicado | 2,242.4437705723003 USD | 6,808.526579236404 USD | 9,050.970349808704 USD |

**Ninguna columna es costo completo, CFU/CVU completo, límite inferior certificado, tarifa pactada ni precio de venta.** La hipótesis fronteriza modifica cantidades/exposiciones frente al corte mensual anterior; no se comparan esos números como si fueran el mismo escenario. La suma diagnóstica cero de filas variables conocidas de caja no significa costo variable nulo de la caja: su desgaste está dentro de los compuestos y otras obligaciones siguen pendientes.

La salida real conserva `INCOMPLETE`, `cfuUsd=null`, `cvuUsd=null`, `productiveCostUsd=null`, `quoteReady=false`, `calibrated=false`, `adoptedValues=0`. Cargos desconocidos no se convierten en cero. No se selecciona automáticamente valor de mercancía, póliza o fecha real de servicio.

## Qué impide todavía cerrar el costo completo

Las incidencias son fronteras del mismo trabajo, no sprints nuevos:

1. **Fijos:** seis remanentes identificados en el presupuesto mensual: permisos MX/US/caja, cobertura territorial MX, cobertura/custodia adicional de caja y obligaciones pendientes de los servicios seleccionados. No duplicar componentes ya incorporados.
2. **Economía del operador y desgaste:** remuneraciones/beneficios pendientes MX/US, aplicabilidad del roster y cobertura de lubricantes US. Las normas y agregados públicos soportan componentes, no prueban todas las obligaciones del escenario.
3. **Entradas del servicio:** alcance de viáticos, peaje agregado del viaje, cargos de cruce/relevo y responsabilidad de seguro suplementario de mercancía. La cobertura monetaria es necesaria para una estimación completa; la validación del inventario **no exige demostrar cada caseta individual**.

El siguiente cierre debe documentar inclusión, exclusión o hipótesis/sensibilidad para esas fronteras con las mejores fuentes públicas compatibles. No pedir datos privados de XBF como condición automática ni inventar importes. Si una exclusión sólo reduce el alcance, no llamar al resultado costo completo del objetivo original.

## Verificación y límites

Resultado final: **285 pruebas en cuatro archivos**: 14 de esta integración, 21 del compositor, 12 del presupuesto mensual y 238 del consolidado de fuentes. Incluyen ambos ciclos, conservación, remuneración MX por sustitución, cuota fija separada, financiación, DEF 3/4/5%, reposo semanal, desgaste disjunto, ausencia de cargo de caja duplicado, fuentes/hash incompatibles, parcial sin explicación y cuota ya representada en el presupuesto.

TypeScript estricto dirigido al compositor, script y prueba: salida 0. Primer intento falló por aceptar arreglos mutables en el selector de pins readonly; una reparación diagnosticada, después comprobada. Una lectura exploratoria previa falló por un nombre de propiedad inexistente y se corrigió tras inspeccionar las claves reales; no fue fallo de proveedor ni consumo cero declarado.

CLI real con JSON explícito: salida 2 esperada por incompletitud, 20 conceptos por ciclo y lectura de vuelta de cifras anteriores. No hay DB/red/IA dentro del compositor. Una prueba **sintética** rellena faltantes con un dólar para comprobar la aritmética completa; sólo prueba el mecanismo y nunca se usa como evidencia monetaria del piloto. Pruebas locales no acreditan sesión autenticada, persistencia, preview, producción, utilización o aceptación comercial.

## Ejecutor, presupuesto y recuperación

Un escritor Codex; elección humana registrada `gpt-6.1-sol/high`, 2026-10-02T16:46:22Z, para B2. Modelo/esfuerzo efectivamente servido no observable; no se afirma cambio del picker. Claude sigue como alternativa posible pero no elegida; Fable no aporta una necesidad demostrada para esta composición verificable. No hubo invocación de otro modelo/proveedor/subagente.

Cuota Codex leída automáticamente 2026-10-03T03:30:32Z: semanal 14% utilizado, reposición Unix 1791580450, uso ordinario permitido, Pro; ventana de cinco horas desconocida. Claude/Fable desconocidos. Tokens, cargos reales e impacto relativo de cuota del corte no observados; no inferirlos de créditos disponibles ni precios CLI. Sin activación de pagos o uso extra. Reserva porcentual no cuantificada; se limita el alcance de llamadas y reintentos.

Presupuesto global autorizado 240 h; contrato del corte máximo 80 pasos, contexto auxiliar 6,500 bytes, cero reintentos de proveedor y dos reparaciones locales diagnosticadas antes de reevaluar. Una reparación de tipado utilizada. Sin nuevo deadline obligatorio. Parada ante ampliación, datos incompatibles o escritor concurrente. Registro `public-variable-cost-integration.json`, sprint `b2-closure-240h-20261002`, lease `7960963ec22744a2a2238fe427b3cbfd`. La limitación de recepción del modelo es del registro, no un bloqueo del objetivo.

Checkout físico en D:, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, revalidados. Sin commit, despliegue, migración ni cambios de Auth, usuarios o infraestructura. Cambios ajenos preservados.

Rollback selectivo: retirar sólo los tres archivos nuevos de este corte si no contienen trabajo posterior; en `benchmark-binational-cost-projection.ts`, revertir únicamente los hunks añadidos de disposición parcial, diagnóstico conocido y cuota fija. **No borrar/restaurar el archivo entero**, que ya contenía trabajo anterior no versionado. Hash antes del corte: `9265a2d6150af91ec3a1770bfe16a0a19f8f89d7bc60cbee717f6f14b95e9e3f`. Repetir las pruebas afectadas tras recuperación.

Antes había componentes dispersos sin conexión única a las fronteras del costo; ahora ambos ciclos se ensamblan mediante el compositor existente y exhiben el tratamiento fijo/variable del operador. Falta el cierre económico expuesto arriba. B2 permanece activo e incompleto: no se sustituye su entregable por este documento o por los subtotales.

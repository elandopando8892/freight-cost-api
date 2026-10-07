# B2 · contado y financiado para el relevo propio binacional

Decisión del usuario: **ambos escenarios**. Entrega local de referencia, no crédito solicitado, costo adoptado ni cotización operativa. Worktree físico `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`; cambios ajenos conservados.

## Resultado y alcance

Antes, el reporte pedía seleccionar modalidad y dejaba intereses sin contraste. Ahora tiene contado/financiado por tractor MX, tractor US y **una sola caja**, fuentes archivadas y sensibilidad financiera MX reproducible. No se altera la depreciación entre modos para favorecer alguno, ni se infiere cómo se financia un transportista real.

Contado define interés de deuda cero por selección explícita, **no costo del activo cero**. La compra es desembolso de inversión; su consumo económico sigue necesitando adquisición capitalizable, residual neto y horizonte. Costo de oportunidad del capital propio permanece como política separada no resuelta, no cero adoptado.

Financiado añade intereses devengados al mismo consumo del activo y, cuando esté sustentada, una asignación de comisiones. **No añade la mensualidad completa**: ésta contiene devolución del principal. El financiamiento del capital de trabajo del viaje es otra familia; no se duplica aquí.

## Benchmark previo y decisión de implementación

| Enfoque | Ajuste y costo de mantenimiento | Decisión |
| --- | --- | --- |
| Interés sobre saldo inicial × tasa / 12 | Regla aproximada ya documentada en ADR-008; no representa el promedio de un préstamo amortizado | Conservar legado, no presentarlo como interés promedio |
| Cuadro mensual transparente, interés separado de principal | Capacidad estándar; fórmula de anualidad y saldo, con gracia/comisión explícitas. Usa TypeScript/Zod existentes sin dependencia/licencia/proveedor nuevos | Adoptar sólo como aritmética local de investigación |
| Mensualidad completa más depreciación | Suma financiación de la adquisición y consumo del mismo activo; riesgo de doble conteo | Rechazar como costo productivo |

No había cuadro de deuda reutilizable en scripts/motor. Se conserva `benchmark-capital-scenarios.ts` y la regla de interés promedio de `benchmark-owned-fixed.ts`, que es **sólo de remolque USD**: no se le pasan tractores o MXN. No se cambia arquitectura, motor activo, API, UI ni infraestructura. La diferencial propia sigue siendo la asignación binacional por recurso/ciclo y gobierno de evidencia; la anualidad no es innovación.

## Fuentes públicas y límites

- [DTFS México, legales](https://www.daimlertruck-financialservices.mx/legales/terminosycondiciones), contenido público `legal.id=35` descubierto en el cliente oficial. Plan de usados Freightliner: tasas 11.50–15.70%, enganche 20%, comisión 1.50% sobre financiamiento, 12–60 meses y un mes de gracia total. **Venció 31 agosto 2026**. La base anual/nominal y detalle de gracia no quedan confirmados en ese texto; CAT separado, desde 14.62%, tampoco es interés nominal. Límite de antigüedad incluyendo crédito y aprobación no certifican al tractor RODAL. No aplica a la caja Utility.
- [USMFCU, tasas](https://www.usmfcu.org/auto-loans): usado semi-truck, APR desde 9%, enganche 10%, hasta 72 meses. [Página comercial](https://www.usmfcu.org/commercial-vehicle-loans): máximo USD 49,999 y vehículos comerciales. La captura directa etiqueta 1 octubre 2026; el lector web cacheado decía 24 septiembre. No prueba elegibilidad de una empresa binacional, condiciones de mañana o tasa nominal. Descuento publicado no se reaplica. Oferta para autos de pasajeros excluida.
- [CFPB, APR frente a interés](https://www.consumerfinance.gov/ask-cfpb/what-is-the-difference-between-a-loan-interest-rate-and-the-apr-en-733/): APR incorpora cargos además del interés. Lectura web disponible; captura HTTP denegada, sin archivo/hash ficticio ni inferir régimen legal aplicable a crédito comercial.

Tres originales nuevos y sus hashes están en `B2_CASH_FINANCED_CAPITAL_2026-10-01.json`; el CLI verifica éstos y los nueve expedientes fijados. La consulta pública no solicitó cotizaciones, contratos ni contacto con proveedores.

## Comparación reproducible: referencia, no presupuesto

Los importes de compra son **precios publicados**, no adquisición capitalizable total. IVA/cargos/condición/entrega, residual/horizonte y compatibilidad siguen pendientes.

| Activo | Moneda | Precio publicado usado | Contado: interés deuda | Financiado |
| --- | --- | ---: | ---: | --- |
| Tractor MX RODAL 2021 | MXN | 1,198,275.86 + IVA | 0 por escenario | Sensibilidad histórica explícita, no contrato vigente |
| Tractor US Ryder 2021 sleeper | USD | 40,495 antes de impuestos/cargos | 0 por escenario | Enganche aritmético 4,049.50; principal proxy 36,445.50. Interés/mensualidad null: APR no nominal |
| Caja Utility 2021 53′ | MXN | 630,000 + IVA | 0 por escenario | Sin condiciones compatibles de financiación; no transferir tasa del tractor |

**Sensibilidad MX declarada**: usa sólo precio pre-IVA como base proxy; enganche 239,655.17 y principal 958,620.69. Se interpretan ambos extremos históricos como tasas nominales anuales **por supuesto analítico, no confirmación del proveedor**. Se eligen 60 meses totales, primer mes sin pago con interés capitalizado, 59 pagos nivelados posteriores, comisión pagada al inicio fuera del principal, sin balloon ni prepago. Calendario mensual idealizado sin redondeo contable por cuota, no estado de cuenta del prestamista. Impuestos/cargos adicionales no incluidos y no declarados cero.

| Tasa anual proxy histórica | Pago regular tras gracia MXN | Interés promedio primeros 36 meses MXN/mes | Interés promedio crédito 60 meses MXN/mes |
| --- | ---: | ---: | ---: |
| 11.50% | 21,552.06 | 7,106.08 | 5,215.84 |
| 15.70% | 23,725.03 | 9,936.84 | 7,352.61 |

Comisión proxy única: 14,379.31 MXN antes de tratamiento fiscal desconocido. **Su asignación económica mensual permanece null**, no se añade silenciosamente a adquisición/intereses ni se amortiza por default. Ventana de comparación 36 meses es analítica, no vida remanente y no plazo del préstamo. Los extremos no son intervalo estadístico, tasa ofertada ni tasa asignada a 60 meses por el proveedor. No hay transferencia MX→US/caja ni FX nuevo.

La diferencia contado/financiado en esta sensibilidad es el interés de deuda y eventual comisión compatible, conservando la misma depreciación simbólica. No se suman estos intereses a una depreciación MX inventada. La caja retiene el contraste transversal 2021/2019 y sus términos desconocidos anteriores; el modelo residual US histórico no se vuelve calibrado por elegir contado.

## Cierre, pruebas y recuperación

**65/65 pruebas focalizadas**: 25 nuevas de deuda/evidencia, 23 consolidación y 17 comparabilidad MX. Comprueban identidad caja/principal/intereses con y sin gracia, tasa cero explícita, ventana distinta al plazo y después del vencimiento, rechazo de APR/CAT/valores ausentes/balloon, hashes, producto/moneda/fecha, aislamiento del remolque y cero adopciones. Estrategia de pruebas concentra esfuerzo en esos riesgos económicos, sin repetir builds UI ajenos al cambio.

Typecheck estricto de helper, reporte y tres suites PASS. Readback real del CLI local: nueve pins, tres activos/ambos modos, **exit 2 deliberado** por economía incompleta, 10 importes completos todavía null/15 condiciones del presupuesto, CFU/CVU/precio null. CLI y cálculos analíticos comprobados; no prueba de préstamo real, integración SaaS, producción ni aceptación de cotización. Ninguna DB/Auth/usuario/infraestructura/deploy/operación o IA de aplicación modificados.

Rollback: retirar exclusivamente la importación/bloque `capitalPaymentModeComparison`, pin `cashFinanced` y referencias añadidas en el reporte; restaurar sólo sus textos anteriores si se desea; retirar archivos nuevos de este corte después de conservar evidencia. No `git reset/checkout`, no borrar `docs/research` ni cambios ajenos. Fuentes y hojas anteriores quedan fijadas sin reescritura; no es necesario revertir producción.

**Siguiente salida del B2 existente, no nuevo sprint**: completar presupuesto público fijo compatible (capital/residual/comisiones, caja, cobertura y overhead), después exposición/ciclo/variables y un piloto SaaS con wireframe MARKSMAN. No reabrir búsqueda genérica de tasas ni pedir datos privados. Fecha de servicio sigue pendiente para vigencias; no se requiere otra decisión sobre contado/financiado o relevo.

Modelo recomendado: GPT-6.1 Sol alto para conciliación económica; medio para captura/documentación/QA dirigida. Selector, tokens y precios no verificables/controlados en este corte; no se afirma cambio efectivo de modelo ni consumo medido.

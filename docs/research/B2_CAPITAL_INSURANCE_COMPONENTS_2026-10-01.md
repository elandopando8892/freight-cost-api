# B2 · capital y seguros por recurso, 1 octubre 2026

## Resultado

Antes: precio US no disponible/moneda no confirmada, sin oferta vinculada de la misma caja y comparadores de seguro insuficientemente desagregados. Ahora: tres ofertas con moneda explícita, tres escenarios numéricos **condicionados** de pérdida de valor US y paquetes mexicanos publicados con fecha, coberturas e inclusiones. **No son adquisición realizada, prima del piloto, depreciación neta ni presupuesto completo.**

Caso conservado: DF → Fort Smith AR72916, Puente III; relevo de tractores propios MX/US, misma caja seca 53′. No se selecciona un transportista, deuda/caja, horizonte económico ni servicio fechado. JSON nuevo y test reutilizan el conciliador y expedientes anteriores fijados por hash; no existe nuevo motor, dependencia o infraestructura.

## Benchmark previo y decisión

| Alternativa | Ajuste y costo total | Decisión |
|---|---|---|
| Prima nacional promedio + vida contable nueva | Bajo esfuerzo inicial; mezcla canastas y usado/nuevo, alto riesgo de transferencia y retrabajo | No llenar el presupuesto así |
| Oferta identificada + escenarios y paquetes públicos explícitos | Sin proveedor contratado; reproducible, conserva periodo, activos y faltantes | Recomendada para referencia parcial |
| Renta/paquete financiero anunciado como sustituto de propiedad | Desvía el relevo propio y puede sumar reserva, principal o seguro dos veces | No cambiar tenencia para completar números |

Consultar precios y anualizar primas son capacidades estándar. Nuestro vínculo a tres recursos, custodia y un ciclo de caja es el componente específico: reutilizamos sus contratos. Criterios de cierre del corte: números de origen identificable, derivaciones reproducibles, exclusiones y no adopción verificadas. **No incluye UI**; la salida es el expediente local. SaaS posterior mantiene wireframe MARKSMAN.

## Adquisición de referencia

| Recurso | Precio pedido | Alcance y faltante |
|---|---:|---|
| Tractor MX, RODAL Cascadia 2021 DD15 | MXN 1,198,275.86 + IVA | 694,920 km, manual 18; no costo capitalizable, interés o vida restante |
| Tractor US, Ryder 526505 Cascadia 2021 sleeper 72″ | USD 40,495, sin impuestos/cargos | DD15 455 HP; no precio ejecutado, traslado ni inspección |
| Caja compartida, Utility 4000 D-X 2021, 53′ | MXN 630,000 + IVA | Oferta de producto, dos unidades anunciadas, no VIN/equipo seleccionado |

[RODAL](https://rodaltruckfinancials.com/catalogo/freightliner-cascadia-2021--vhc-f8668c8f02) conserva el anuncio de contado. [Ryder 526505](https://www.ryder.com/en-us/used-trucks/inventory/oklahoma/oklahoma-city/tractor/tandem-axle-sleeper-tractor/2021/freightliner-mercedes/new-cascadia-px12664/526505) declara USD, vehículo y exclusión de impuestos/cargos. Su odómetro anunciado 859,469 millas queda por debajo de las 868,507 de una entrada de mantenimiento del 30 marzo 2026: diferencia 9,038; **odómetro actual no certificado**. La inspección futura y disponibilidad no están confirmadas. “NEW CASCADIA” es nombre de modelo, no condición nueva. No se consultaron historiales privados ni enviaron formularios.

[Utility](https://www.remolquesythermos.mx/product-page/2021-utility-4000-d-x-68-000-lbs-53-x102-caja-seca) separa precio de lista 680,000 y oferta 630,000 MXN; tabla confirma +IVA, 53′, suspensión neumática. No selecciona propietario legal, país de registro ni costo compartido. Una misma caja se cuenta una vez.

La ficha Schneider 20753 permanece histórica según el corte anterior: **Ryder no es cambio de precio del mismo activo**. Se excluye el primer contraste Ryder daycab de la sensibilidad sleeper. No se calcula promedio/mediana nacional con estas ofertas.

## Capital: primera cifra US condicionada, no presupuesto

Reutilizamos la metodología documentada de ANL 2021 (anuncios sleeper US 2019) y exposición ATRI 2024; originales y alcance del [expediente anterior](B2_USED_RESIDUAL_SHARED_CYCLE_2026-09-29.md) permanecen intactos. No se repite investigación de vidas contables o PDF. Su ventana de 36 meses es **hipótesis de planificación condicionada a supervivencia/operabilidad**, no vida restante validada. El estrés ±20% no es intervalo estadístico publicado.

`q = 0.9071³ × 0.999^(millas adicionales/1000)`; `pérdida de valor pedido/mes = 40,495 × (1 − q) / 36`.

| Uso anual condicionado | Retención bruta | Valor bruto de referencia USD | Pérdida del ancla/mes USD |
|---|---:|---:|---:|
| 66,141.6 millas (0.8×) | 61.20% | 24,782.72 | 436.45 |
| 82,677 millas (ancla histórica) | 58.24% | 23,582.75 | 469.78 |
| 99,212.4 millas (1.2×) | 55.42% | 22,440.89 | 501.50 |

Fuente metodológica histórica: [Argonne ANL/ESD-21/4, §3.2.5.2](https://publications.anl.gov/anlpubs/2021/05/167399.pdf). No es predicción validada del VIN ni transacciones de 2026. Las millas son **adicionales**; no se vuelve a descontar el odómetro inicial. Coeficientes no se transfieren a MX ni remolque.

El puente conserva lo desconocido, no lo sustituye por cero:

`Capital US/mes = pérdida del ancla/mes + (A − 40,495 + K)/36 + I`, con A adquisición capitalizable, K disposición e I interés mensual. Ninguno se conoce completo. La fórmula general de cada activo sigue `(A − R_neto)/N_restante + I`; no sumamos amortización de principal. Capital mensual completo de los tres activos y CFU continúan null. No se cargan estos escenarios al motor ni se selecciona uno por defecto.

## Seguros: paquetes distintos, no prima binacional

La descarga HTML actual de [Timi](https://timi.mx/seguro-tractocamion) contiene tablas del 26 septiembre 2026 que el lector web aún no mostraba. **Publicación del agente, no póliza confirmada con Quálitas.** Ejemplo de cobertura Cascadia 2022, valor MXN 2,018,000:

| Paquete alternativo | Anual con IVA MXN | Equivalente bruto mensual MXN |
|---|---:|---:|
| RC | 22,771.95 | 1,897.66 |
| Limitada | 70,218.91 | 5,851.58 |
| Amplia | 130,784.01 | 10,898.67 |

Anual/12, no plan de pagos. Descuento y derecho de póliza ya incluidos: no aplicar ni sumar de nuevo. RC limita terceros a 3,000,000 MXN; límites/deducibles no son primas. La otra tabla usa valor 1,835,000 y Amplia 121,693.05 (10,141.09/mes): **no mezclarla con el ejemplo 2,018,000**. IVA recuperable y traslado al Cascadia 2021 quedan pendientes; no escalamiento lineal por precio. Cargo, caja y territorio US no están acreditados por esos paquetes.

[Progressive](https://www.progressivecommercial.com/commercial-auto-insurance/truck-insurance/commercial-truck-insurance-cost/): permanece USD 926 por unidad motriz/mes para nuevas pólizas de transporte 2025; 11,112/año es equivalencia aritmética, no póliza anual del piloto. Nota al pie incluye RC/daños propios, conductores sin infracciones. No sumar otra RC/daños propios, ATRI, cargo o remolque sin prima/inclusión sustentada.

[Interchange Progressive](https://www.progressivecommercial.com/coverages/trailer-interchange/): descripción para remolque no propio bajo acuerdo escrito, no precio. El relevo dentro del grupo no determina dueño legal ni asegurado; definir daños propios de caja versus custodia/intercambio según titular, contrato y territorio. **No añadir interchange por defecto ni cobrar completa la misma prima dos veces**. Prima de caja compatible aún desconocida. No se compró ni cotizó una póliza ni se verificó cumplimiento normativo del caso.

## Verificación, pendientes y siguiente resultado

Guía engineering:testing-strategy aplicada a integridad y fronteras económicas: hashes de cuatro antecedentes/siete capturas, precios/currency/VAT, odómetro contradictorio, retención histórica frente a millas adicionales, paquetes alternativos, scopes de valoración y presupuesto incompleto. **73/73 pruebas PASS**: 23 nuevas, 30 del presupuesto y 20 de metodología residual/ciclo reutilizada. Typecheck estricto del test/dependencias ES2022/ESNext/Bundler PASS; no cambios al runtime ni build general. Lectura del CLI con cinco manifiestos: exit **2 esperado INCOMPLETE**, 41 incidencias del caso/15 condiciones de hoja, costs null/compositor false/cero adopciones/cero gates. Diff check PASS, avisos LF/CRLF en documentación previa no son errores. Capturas son fuentes públicas reales; curvas son escenarios condicionados, no fixtures operativos ni calibración. Sin pruebas UI/authenticadas, base de datos o cotización real.

**B2 parcial, cero adopciones y 0/4 gates.** Los diez importes del presupuesto anterior no se rellenan con componentes parciales; sus 15 condiciones y 41 incidencias del caso no desaparecen por nuevas fuentes. Faltan adquisición neta/horizonte/disposición/financiación; seguros completos por territorio/activo; overhead y exposición/ciclo compatibles. No exigir certeza imposible de una unidad usada para todas las demás familias.

**Siguiente salida única:** consolidar presupuesto/exposición de referencia con componentes conocidos, términos desconocidos explícitos y escenarios de planificación trazables; mostrar subtotal parcial y sensibilidad sin llamarlos costo D2D completo. No otra ronda genérica de anuncios, Auth o FX. La publicación/adopción y selección de supuestos materiales siguen separadas; recorrido SaaS con wireframe después de suficiencia económica.

Modelo recomendado: GPT‑6.1 Sol · alto para conciliación económica, medio para captura/pruebas. No selector cambiado ni consumo/tokens/precios inferidos. Rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, worktree físico D: verificados antes de editar.

Rollback selectivo: retirar sólo este MD/JSON/test, siete capturas HTML de este corte y las dos notas de estado identificadas. No restaurar documentos completos, borrar antecedentes ni ejecutar reset/limpieza recursiva. Sin commit/stage/branch nuevo, DB/Neon/Auth/usuarios/infra/deploy/negocio o IA de aplicación. Cambios ajenos preservados.

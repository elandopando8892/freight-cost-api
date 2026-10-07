# B2 · oficina, patio y dotación administrativa

Entrega local 2026-10-01. **Componentes calculables de un escenario público, no overhead completo ni base calibrada.**

## Qué cambió y por qué

Antes había unidades de telefonía/TMS, pero faltaban componentes de instalaciones y personal. Ahora la consolidación existente muestra dos alternativas de capacidad de patio y tres contrastes de salarios por FTE explícito. Se conservan los siete roles administrativos y los 23 conceptos de compañía; no desaparecen los faltantes ni se transforman en ceros.

Benchmark previo, proporcional al corte:

| Opción | Decisión |
| --- | --- |
| Oficina con servicios incluidos + espacios mensuales de patio + detalle de roles | Adaptar los componentes públicos y calcular cantidades declaradas. Es verificable sin construir otro sistema de nómina/arrendamiento. |
| Patio completo y oficina tradicional | Mantener como alternativa no normalizada: el anuncio mexicano no establece periodicidad, servicios o capacidad útil; una hectárea no equivale a un número demostrado de espacios. |
| Overhead sectorial por camión o salario con un porcentaje universal de prestaciones | Rechazar: poblaciones y denominadores incompatibles. No cerrar costo patronal con un ratio de otra cohorte. |

Objetivo del corte: precio × unidad explícita, procedencia y ámbito, evitando doble cargo. Flujo: ejecutar la consolidación local → revisar contrastes y condiciones → completar presupuesto compatible. Cierre de este entregable: aritmética reproducible, fuentes fijadas, errores de entrada/duplicación rechazados, sin adopción automática. No cambia arquitectura, integración, Auth, persistencia ni motor de cotización.

## Contrastes de instalaciones

[Blank Space Santa Fe](https://blankspace.com.mx/) publica oficina colaborativa de 2–3 personas por **MXN 12,599 por oficina/mes antes de IVA**. No multiplicar ese precio por cada asiento. Internet, telefonía, mobiliario y limpieza se tratan como servicios incluidos del mismo ámbito; no agregar Telmex completo otra vez. El sitio no acredita vigencia contractual, disponibilidad, depósito o elegibilidad fiscal. La oficina no es patio ni sustituye al personal de una transportista.

[Outpost Metropolitan, Laredo](https://outpost.us/locations/laredo-metropolitan/) distingue tractor, caja y conjunto. La fuente advierte promociones temporales por ocupación; no se proyectan como tarifa anual garantizada. Pago con tarjeta puede agregar 3%, pero no se seleccionó medio de pago ni se inventó costo cero. Tener una amenidad de oficina no acredita oficina gratuita; tampoco se incluyen servicios fronterizos o custodia por inferencia.

| Escenario aritmético, no elegido para el piloto | Cantidad declarada | Componentes publicados, separados |
| --- | --- | --- |
| Oficina + conjunto estacionado | 1 oficina + 1 espacio combinado | MXN 12,599 antes de IVA; USD 200 con impuestos/comisiones no establecidos |
| Oficina + tractor/caja separados | 1 oficina + 1 espacio de tractor + 1 de caja | MXN 12,599 antes de IVA; USD 325 con impuestos/comisiones no establecidos |

No se suman las dos alternativas, ni sus monedas/bases fiscales. Un espacio combinado no demuestra capacidad simultánea para dos tractores del relevo. Dimensiones y suficiencia del patio siguen siendo condiciones; son escenarios de capacidad, no selección de proveedor. La caja sigue siendo un único activo: reservar espacios físicos en ambos países no autoriza duplicar su capital.

[Inmobiliaria Laredo](https://inmobiliarialaredo.com/) anuncia un patio de una hectárea por USD 4,000 **sin periodicidad explícita**. Otra propiedad para transportistas cercana al Puente III no publica importe: no se mezclan ubicación y precio de anuncios distintos. El costo mensual mexicano y la normalización por espacio permanecen nulos. Un resultado de TruxSpot mostraba falta de espacio para su fecha y el archivo HTTP devolvió 404; no se usa un total de checkout cero como tarifa gratuita.

Un compromiso mensual de patio puede integrar overhead fijo. Un servicio incremental del viaje es otra partida: no cargar ambos por el mismo espacio/servicio ya cubierto.

## Dotación: cantidades declaradas, no plantilla observada

Se reutilizó y contrastó la tabla de [BLS, salarios ocupacionales nacionales de mayo de 2025](https://www.bls.gov/news.release/ocwage.t01.htm) con el expediente previo, sin cambiarlo. Los siete roles permanecen: despacho, tráfico, operaciones, comercial, safety, tracking/CS y facturación. El proxy safety es especialista, no gerente; CS no equivale a monitoreo satelital. Son salarios del trabajador, no costo patronal ni precios de Laredo. Anual/12 sólo normaliza una referencia.

[Trayecto, monitorista satelital](https://careers.trayecto.com/monitorista-satelital-CBlgyOklPF8f/) publica MXN 15,000–16,000 mensuales para General Escobedo con turnos rotativos de ocho horas. Base bruto/neto y costo de prestaciones no cuantificados. No se convierte en sueldo de CDMX/Nuevo Laredo ni en capacidad 24/7; el mapeo cubre monitoreo, no toda la función tracking/CS.

| Contraste de personal | FTE explícitos para la aritmética | Componente conocido | Aún sin cantidad/costo completo |
| --- | --- | ---: | --- |
| MX, extremo salarial bajo | 1 monitor | MXN 15,000/mes | 6 roles, prestaciones y capacidad |
| MX, extremo salarial alto | El mismo 1 monitor, alternativa | MXN 16,000/mes | 6 roles, prestaciones y capacidad |
| US, dos proxies salariales | 1 despacho + 1 facturación | USD 8,817.50/mes | 5 roles, prestaciones y capacidad |

US: `(54,740 + 51,070) / 12`; nunca salario por camión o por viaje. No se suman los extremos MX. Un salario indexado de facturación mexicana no se incorporó: falló la lectura directa y no basta el resumen del buscador. Los contrastes salariales e inmobiliarios de ámbitos distintos no se combinan como presupuesto real.

## Evidencia, pruebas y alcance

Dossier: `B2_OFFICE_YARD_ADMIN_SCENARIOS_2026-10-01.json`, SHA-256 `7c1cbc154a5bae865a8e6f516d67754e2fac0d452dbe8ab1c62c5405f49a032a`.

Tres HTML originales nuevos: Blank Space, Outpost y anuncios de Nuevo Laredo. Un JSON adicional es **extracción estructurada del lector web**, no respuesta HTTP original de BLS/Trayecto. Solicitudes ordinarias de archivo devolvieron 403; no se evadió la restricción. La fuente salarial y el método de captura están diferenciados dentro del readout. Hashes y ubicaciones figuran en el dossier; los expedientes anteriores se mantienen intactos. Doce JSON fijados en la consolidación; CLI sin red.

Pruebas focalizadas según la estrategia de testing: 30 nuevas para unidad, ámbito, duplicación de servicios, tarifas por equipo, moneda/base fiscal, FTE/procedencia, roles faltantes y archivos alterados. **117/117 pruebas en cuatro suites**, typecheck estricto y lectura CLI. Esta lectura produce código **2 esperado por presupuesto incompleto**: 12 pins, 10 partidas completas aún nulas, 15 condiciones, cero adopciones. Todas las salidas productivas siguen nulas. No interfaz nueva: no se altera el wireframe; cualquier siguiente UI conserva wireframes y branding MARKSMAN.

Esto es desarrollado/probado localmente con datos documentales públicos y escenarios aritméticos explícitos. No prueba autenticada del SaaS, persistencia, despliegue, compra, contrato, disponibilidad real o aceptación operativa. B2 y MVP **no cerrados**.

## Cola finita y recuperación

No abrir nuevos sprints genéricos de tasas/FX/Auth. El siguiente resultado será **definir la capacidad y ámbito del modelo de grupo y reconciliar presupuesto/exposición por recurso**, incorporando sólo lo respaldado. Condiciones concretas de overhead: periodicidad/capacidad MX, términos de instalaciones, siete funciones/FTE compatibles y prestaciones patronales, cobertura temporal y reparto del pool. Después: ciclo/variables del caso DF–Fort Smith y piloto completo. No solicitar históricos privados ni afirmar suficiente una plantilla por su número de puestos. Fecha del servicio aún pendiente para vigencias.

Rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, worktree físico `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`. Trabajo previo/ajeno conservado; no staging, commit, rama, publicación ni efectos externos.

Rollback selectivo del corte: retirar sólo nuevo dossier/MD, tres HTML y readout, helper y suite; quitar las dos nuevas referencias fijadas y bloques de instalación/personal de la consolidación, junto con sus entradas de cronología. Preservar el resto del archivo y expedientes anteriores. No reset/checkout completo/borrado amplio. Rollback no ejecutado.

Modelo recomendado: GPT-6.1 Sol alto para comparabilidad/ámbito y medio para QA/documentación. Selector no confirmado ni cambiado, tokens/costo no medidos. No activación de proveedor ni consumo de API de negocio o IA de la aplicación.

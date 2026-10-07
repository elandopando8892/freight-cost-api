# B2 · DEF y reserva pública de ralentí incorporados al CVU

2oct2026, localD:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd revalidado. Trabajo previo preservado, único escritor; sin adquisiciones, operaciones, publicación, DB/Auth/infra o adopción canónica.

## Qué cambió

Antes la proyección incluía diésel de circulación, pero no una reserva de ralentí ni DEF separado. Ahora cuatro partidas variables por ciclo se agregan una vez: diésel de ralentí MX/US y DEF MX/US. CFU, salarios, comidas, peajes, seguros y administración existentes no cambian. Una caja, sin consumo de refrigeración ni otro cargo por remolque. Las272comparaciones previas y sus alternativas conservan identidad.

| Ciclo | DEF MX L / US gal | Reserva ralentí MX h / US h | CVU adicional USD | Subtotales parciales contado USD |
|---|---:|---:|---:|---:|
| Red, vacío esperado |25.917599 /4.255123|19.452892 /11.719953|225.020248|4406.381272 /4426.465522|
| Retorno vacío dedicado |49.829709 /7.806465|51.953621 /19.901413|483.269406|8717.765980 /8760.350916|

Capital NET_PLUS_VAT y pago RATE_EXCLUDES_WEEKLY_REST, mismos que el corte previo; dos primas de caja públicas, no rango estadístico. Primera comparación financiada4516.128711 /4536.212961USD. No son costos íntegros, precios de compra pactados ni venta. Seis outputs finales siguen null, quoteReady=false, adoptedValues=0; B2 activo/B3 no iniciado.

## Benchmark previo: adoptar / adaptar / rechazar

**Adaptar métodos publicados y motor existente**, sin otro servicio, infraestructura o calculadora. [DOE AFDC, tabla5](https://afdc.energy.gov/prep/prep_methodology.html) da0.8USgal/h para diésel pesado y1830h anuales como valor de planificación. Transferir a ambos tractores prospectivos, no medición DD15 ni promedio mexicano. Distribución explícita por capacidad: `1830/12 × días de ciclo del tractor/24`; no MAX de capital/distancia, días redondeados, calendario de caja ni87min íntegros de cada cruce. La fuente no determina cómo distribuir al piloto: esa normalización usa los24días productivos ya declarados. El horario ordinario y la liberación del operador permanecen hipótesis, no prueba de que el motor siga encendido durante descanso/espera.

**Comparar DEF de carretera, no industrial/marino:** [Cummins X15,18may2026](https://www.cummins.com/en-eu/news/2026/05/18/broader-view-efficiency-drives-cummins-x15) informa3–5% del volumen de diésel. Selección4% como punto medio explícito para referencia DD15 con SCR declarado; no fabricante/generación/VIN emparejados ni configuración de anuncio certificada. Mostrar extremos3%/5% como sensibilidades: CVU adicional204.371277 /245.669219USD en red y443.969824 /522.568988 en dedicado, manteniendo mismo ralentí. No replicar el resto de alternativas como nuevos sprints. Dosificación en baja temperatura no observada. DEF no se mezcla con diésel y la fuente no valida estos equipos/proveedores específicos.

**Usar importes específicos y términos, no precio de categoría:** [AMSA Fleetr ite20L, SKUFLRTUREAG](https://amsatiendaenlinea.com.mx/collections/mas-vendidos/products/456825) publica472.20MXN neto, envío314.65neto y16%IVA. Referencia de un paquete por envío: `(472.20+314.65)×1.16/20 = 45.6373MXN/L`. Inventario/consumo prorrateados: no añadir compra entera o sobrante por viaje ni asumir umbral de envío gratis4999sin plan de reposición. Destino/checkout/certificación del producto no comprobados. Fleetguard595.24agotado no es sustituto idéntico; GreenWorld1000/20L con impuestos no definidos no se seleccionó.

[Walmart producto2.5USgal](https://business.walmart.com/ip/Super-Tech-DEF-2-5-Gallon-for-Diesel-Fuel-Vehicles-with-SCR-Selective-Catalytic-Reduction/2461745202?athbdg=L1200&classType=VARIANT) publica9.88USD y vendedorWalmart; su categoría8.88no coincide. Se conserva9.88, cotejado en oferta estructurada HTML original. Contexto webSacramento95829, transferido como referencia a pickup Laredo sin afirmar disponibilidad allí; hipótesis de impuesto8.25% de ciudad reutiliza tabla oficialTexas ya archivada, sin convertirlo en tasa del diésel. `9.88×1.0825/2.5 = 4.27804USD/USgal`. Ninguna orden/suscripción/activación.

No desarrollar un rastreador ni usar API paga. Originales AMSA/Walmart/DOE archivados+SHA256. Cummins se leyó completo con lector web, descarga original403/no archivo. PDF Argonne2015 quedó403 en descarga y fallo de lector directo: no usar su aproximación1800h/año en lugar de1830DOE. Lecturas/fallos y discrepancias conservados, no repetición para evadir acceso. No adoptar reseñas de consumidores, tarifas marinas, otra generación de motor ni combustible6mpg/precios antiguos DOE al presupuesto existente.

## Fórmulas y alcance de la estimación

Por tractor: `diésel total de referencia = diésel vial previo + horas de reserva ×0.8USgal/h`, convertido por3.785411784L/USgal en MX. `DEF = diésel total ×4%`. Nuevos importes: ralentí×precio diésel previo27MXN/L o5.955USD/USgal; DEF×precio por unidad anterior, MX valorado al FIX18.3688. Los rendimientos previos son transferencias viales: ORNL2006–2008,65mph/pendienteplana, no ciclo mixto; MXIMT modelo vial. No volver a cobrar su combustible.

Esta reserva anual distribuida por demanda de recurso **no es un itinerario observado de ralentí**. Puede sobredimensionar la espera MX con motor apagado y no demostrar el gasto de una semana/clima concretos. Si un rendimiento posterior incluye ralentí, reemplazar el límite vial y recalcular, nunca sumar de nuevo. APU/electricidad no agregados ni dados por gratuitos; no instrucción de conducir/idlear ni certificación de restricciones legales. Desgaste por horas adicionales no cuantificado. Cantidad de DEF requiere SCR como supuesto de este modelo, no probarlo en una flota real para escribir una estimación prospectiva.

## Validación y siguiente cierre

274pruebas/4archivos: fluidos11, suplementos14, variables18, consolidación231. TSCestricto sin emisión y readback72pins/cifras/nulls PASS tras última edición de código/pruebas. Comprueba inmutabilidad, litros/USgal/impuestos/inventario, exposición temporal diferenciada, fuentes originales, sensibilidades,272comparaciones, CFU intacto, igualdad contado/financiado de variables, joins/sumas, doble aplicación, bases que ya incluyen ralentí/DEF, FX e inputs desbordados. Primera tanda273PASS; añadida regresión monetaria, repetida274. Cero reparaciones de implementación. No operación, telemetría, nómina, consumo real, prueba autenticada ni producción.

Los precios y proyección cierran estas partidas de referencia, no la calibración del viaje. Siguientes importes con efecto material: patio MX y aproximación/cruce/bobtail; itinerario/peajes no conciliados; RC comercial y decisión de mercancía pendiente; paquete GPS/ELD/accesorios y cumplimiento/empresa restantes. Presupuesto completo B2 no acreditado. Patio4000USD sin periodo y sale-leaseback no disponible siguen rechazados; no son renta por bay ni importes0. No abrir otra investigación general de FX/Auth ni B3 para evadir estos faltantes.

## Ejecutor, presupuesto y rollback

Codex investiga/implementa/integra/verifica; humano eligió gpt-6.1-sol/high16:46:22UTC, misma elección, versión/esfuerzo efectivo exactos no observables ni selector cambiado. Skill claude-review mantiene registro/lease, no Claude/Fable/agentes. Continuar con contrato/contexto comprobables evita traspaso sin ventaja demostrada; Fable no reemplaza fuente pública faltante. Cuotas5h/semanal/Fable y uso atribuible desconocidos, no0, sin nueva consulta a proveedor/garantía de costo. Estimación45–60min dentro de máximo240h, sin nuevo deadline, gasto o scheduler; presupuesto20llamadas de investigación (consultas agrupadas no equivalen a20URLs). Observadas10llamadas web y5descargas originales, incluidas2fallidas; sin retry/fallback de proveedor ni escalada.

Retirada selectiva: quitar sólo import/pin/cálculo/hash/output operatingFluids, ajustar prueba72→71pins y retirar nuevos lib/test/política/checkpoint/tresHTML sólo si no tienen consumidores posteriores. Retirar sólo estas entradas de estado, no restaurar archivos completos sucios ni reset/checkout. Conservar suplementos/caja/conectividad y anteriores; repetir pruebas afectadas. Nada en producción/DB/Auth/adquisiciones que revertir.

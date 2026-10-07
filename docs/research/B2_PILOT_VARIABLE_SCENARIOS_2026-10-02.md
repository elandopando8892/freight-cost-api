# B2 · Variables públicas conectadas al ciclo binacional

## Resultado y alcance autorizado

Antes había componentes aislados MX y alternativas US sin una suma por ciclo. Ahora el consolidado local produce nueve líneas variables para cada escenario del caso México DF → Fort Smith AR72916, vía Nuevo Laredo/Laredo/Puente III: caja seca53′, relevo propio MX/US y una sola caja. Se unieron a las asignaciones fijas parciales previas, sin modificar sus importes, presupuestos completos, adopciones ni motor de cotizaciones publicado.

El cambio metodológico autorizado permite **hipótesis prospectivas explícitas con evidencia pública**. No convierte una oferta en nómina total, un dato histórico en costo actual calibrado o un gasto desconocido en cero. B2 sigue abierto hasta costo íntegro contado/financiado. No hace falta otra autorización para los siguientes desarrollos locales dentro de ese objetivo; producción y efectos externos permanecen fuera de alcance.

## Benchmark, comparación y decisión previa al código

Se reutilizó investigación vigente para su alcance histórico, archivos originales ya verificados por SHA y módulos existentes, sin repetir extracción de PDF ni inventar nuevas fuentes. La revisión de fuentes primarias del corte revalidó [EIA PADD3](https://www.eia.gov/dnav/pet/PET_PRI_GND_DCUS_R30_W.htm) y la [oferta Trayecto](https://careers.trayecto.com/operador-sencillo-caja-seca-xI1ywOf9L4-o/). EIA conservaba5.955USD/gal del28sept, publicación29sept/próxima6oct; no se afirma un precio del2oct ni un combustible contratado. La etiqueta relativa de empleo no certifica fecha absoluta o disponibilidad.

| Enfoque | Ajuste y costo total | Decisión |
|---|---|---|
| Importar costo compuesto completo de un transportista | No hay paquete público53′/binacional/actual compatible; repetiría capital/administración ya asignados. Solicitar datos privados no cumple la dirección de fuentes públicas. | Rechazar como sustituto del caso. |
| Reconstruir cada posición, repuesto y separación tractor/caja | Mayor investigación/mantenimiento y falta de precios/límites compatibles; un reparto50/50 sería inventado. | Diferir calibración detallada, no inventar reparto. |
| Reutilizar componentes públicos y declarar transferencia prospectiva sobre kilómetros físicos | Usa Zod, revisores, hashes y ciclos existentes; sin licencia/proveedor/infra nueva. Conserva límites históricos, impositivos y poblacionales; permite una suma parcial reproducible. | Adoptar para investigación local, no para publicar tarifas. |

La capacidad común (validación, conversión, lectura/pins y asignación fija) se reutiliza. Lo específico desarrollado es el contrato de composición por país y tramo adherido de una misma caja. No se declara innovación para justificar otra plataforma.

## Inputs, supuestos, fórmulas y exclusiones

Política: `B2_PILOT_VARIABLE_SCENARIOS_2026-10-02.json`, SHA256 `15dced8b67235a42b04213420f2770438b15b5cd9d2002576a5dac40f94a773a`. Consolidación56pins; fuentes anteriores intactas.

| Componente | Fórmula del escenario | Evidencia y alcance |
|---|---|---|
| MX combustible | km físicos ×483.92/1000L/km ×27MXN/L | Consumo de [IMT PT881](https://imt.mx/archivos/Publicaciones/PublicacionTecnica/pt881.pdf), modelo2025/40′/carretera base, transferido a53′ y al retorno sin caja como hipótesis constante. Precio nacional Profeco25sept, evidencia de extracto primario indexado; no corredor, recibo ni grado certificado. |
| MX mantenimiento/lubricantes/llantas | km adheridos ×5.61754/0.27967/0.96996MXN/km, respectivamente | Costos impresos IMT2025, netos de impuestos/derechos; tractocamión/remolque conjuntos sin separación. No actualizar estos importes con inflación no documentada. |
| MX conductor | km físicos ×2.10MXN/km | Oferta Trayecto cargado/vacío. Paid/physical=1 supuesto. No salario semanal adicional, prestaciones, SBC o pago de espera inventados. No costo patronal completo. |
| US combustible | km físicos /1.609344 /7.9mpg ×5.955USD/gal | EIA28sept con impuestos y ORNL2006–2008, bin70–80klb/65mph/pendiente±1%. Misma tasa cargado/vacío explícita; no asumir el bin liviano como vacío certificado, payload del piloto o conservación garantizada. |
| US mantenimiento/llantas | km adheridos /1.609344 ×0.212/0.048USD/milla | [TTI2025 apéndiceC](https://static.tti.tamu.edu/tti.tamu.edu/documents/mobility-report-2025-appx-c.pdf), estimación2024 desde ATRI hasta2023; no dato observado2025/2026 ni lubricantes/DEF establecidos. |
| US conductor | km físicos /1.609344 ×0.817USD/milla | [ATRI2025](https://truckingresearch.org/wp-content/uploads/2025/07/ATRI-Operational-Costs-of-Trucking-07-2025.pdf), operaciones2024/truckload menos26camiones: hipótesis de una entidad con un tractor, no transportista real seleccionado. Sueldos+prestaciones reportados, incentivos/bonos excluidos y alcance patronal completo no identificado. No sumar cinco grupos, ECEC o impuestos federales de nuevo. |

MXN → USD mediante FIX de determinación1oct18.3688 fechado/pinned, no columnaDOF, pago ni pronóstico. Se **reemplaza** en este escenario el componente combustible impreso2025 por consumo×retail fechado; no se suman ambos. La proyección mezcla mantenimiento histórico neto con combustible retail/impuestos no recuperados de forma demostrada: `homogeneousTaxBasis=false`, no un costo económico neto homogéneo o cohorte estadística conjunta.

Red: MX retorno92.62936km sin caja. Combustible y pago por distancia cubren ese movimiento; mantenimiento/lubricantes/llantas MX sólo1124.57642km adheridos. La parte tractor-solo sin precio sigue null. US caja adherida sobre1233.26718km, no cobrar otra vez caja en fila independiente.

Dedicado: MX2249.15284km y US2278.83110km, retorno con la misma caja; costos conjuntos nacionales recorren segmentos disjuntos. Caja variable separada null significa **incluida sin separación en los compuestos**, no costo0. Capital fijo de caja sigue una sola asignaciónMAX después de su ciclo completo. Nómina variable no vuelve a cobrar el pool administrativo.

## Readback del cálculo

| Escenario no seleccionado | Combustible MX /US carretera | Componentes variables USD | Fijos parciales +variables A/B USD |
|---|---|---:|---:|
| Red con proxy vacíos |589.03022L /97.00211gal |2828.35532722 |6541.25009215 /6562.82296070 |
| Retorno dedicado misma caja |1088.41004L /179.24051gal |5290.22328346 |12148.56569716 /12186.56513443 |

Son **sumas parciales de componentes bajo hipótesis**, no cotización, rango estadístico, mínimo o CFU/CVU completo. Las variantesA/B son hipótesis fiscales de valor de caja previas, no suma entre alternativas. El pool administrativo previo3.7FTE repartido a una pareja tiene fuerte impacto: no llamarlo costo observado o escala eficiente del transportista. La rutaUS sigue proxy de ciudad, no terminal72916/camión aprobado. No publicar estas cifras como precio de compra/venta.

## Verificación y ejecución real

700pruebasPASS/26archivos de regresión, incluyendo13 nuevas, combustible, mantenimiento, conductor, ciclos, capital/seguros/administración y consolidación. Primera tanda274PASS/5archivos; no sumar esas repeticiones como pruebas distintas. TSC final estrictoPASS. Tras última modificación de test, las13 afectadas repetidasPASS. Readback final15:33:41UTC confirma56pins,9líneas por ciclo, fuentes/FX fechados, sumas arriba, seis outputs finalesnull,0adopciones y todos externalChangesfalse. Pruebas deterministas públicas/prospectivas; no viaje, cálculo comercial aceptado, UI autenticada, persistencia SaaS ni despliegue.

La skill **engineering:testing-strategy** hizo priorizar integridad económica: conservación de distancia, caja una vez, bobtail no tasado como remolque, cambio de unidades/periodos rechazado, selecciones alternativas no sumadas, hashes, idempotencia, negativos/NaN/infinito y separación subtotal/fulloutput. No UI modificada: wireframes MARKSMAN siguen requisito de B3, no sustituidos por esta ficha técnica.

Un diagnóstico TSC en el test negativo: el tipo de `completeCfuUsd` es null y no permite asignar100 directamente. Única reparación dentro del límite: construir el fixture inválido mediante `Object.assign`; no relajar esquema/contrato económico ni corregir resultados para pasar pruebas. Reejecución final exitosa. Aviso existente de ViteCJS/LF→CRLF no es fallo económico; sin instalación/rebuildfrontend.

Responsable único: Codex escritor/integrador/verificador; proveedor OpenAI en superficieCodex. Modelo recomendadoGPT6.1Sol/high, versión/esfuerzo efectivos del principal no expuestos por herramienta; selector intacto. Codex actual es suficiente para contratos deterministas y contexto existente. ClaudeSonnet/Fable se consideraron pero revisión duplicada no aporta ventaja demostrada en este corte; no invocados. Disponibilidad real de ClaudeMaxx5, ventanas5h/semanal, Fable/inclusión/ruta/usoextra/reposiciones desconocida: no ejecutar esa parte con inferencia de facturación. No auxiliares/agentes/bridge.

Lectura automática soportada de cuota2oct15:20:33UTC/09:20:33México: semanal100%usada/ventana10080min, próxima reposición6oct13:08México; ventana5h no disponible. Créditos existentes registrados como disponibles en continuidad previamente autorizada; no compras, resets ni activación de uso extra. Tokens/cargos/caché y equivalencia a cuota no observables: ni porcentajes de ahorro inventados ni fallos contados como consumo0. Una ruta evita repetir contexto esperado, beneficio no medido.

Límite20min desde15:20:33UTC hasta15:40:33UTC, una reparación; verificación de código/readback terminada15:33:43UTC. Reserva restante para documentación/correcciones, no cuota inventada. Parar al agotarse el tiempo, ante segundo fallo o falta de fuente/permisos; reevaluar antes de escalar. Sin extensión de alcance.

## Siguiente resultado hacia B2 íntegro

Prioridad inmediata: **peajes y servicios de cruce sobre este mismo ciclo**, reutilizando SAKBE/SCT/Puente III y sus clases/fechas, sin volver a FX/Auth ni pagar nuevas APIs. En paralelo lógico de la composición, cerrar combustible en espera/DEF/inclusiones, alcance patronal MXUS, tractor-solo de red, seguros/permisos faltantes y caja financiada. No basta con nueve líneas para cerrarB2. Reutilizar fuentes públicas compatibles; documentar hipótesis prospectivas sólo cuando sustentadas y no imponer archivos privadosXBF.

## Rollback acotado

Retirar sólo política/ficha/helper/test nuevos de este corte; del consolidado retirar import/cálculo/campo `supportingPilotVariableEconomics` y pin `pilotVariables`; de estado/plan retirar los nuevos párrafos. No revertir archivos completos (contienen trabajo previo), cambios ajenos o pins históricos. SóloD:, misma rama/HEAD. No DB, Neon, Auth, usuarios, migraciones, infraestructura, publicación, operación comercial o IA de aplicación modificados.

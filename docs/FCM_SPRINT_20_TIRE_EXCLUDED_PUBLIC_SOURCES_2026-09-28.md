# Sprint 20 — cobertura pública de los segmentos fuera de IMT

Modelo recomendado: GPT-6 Sol; esfuerzo medio-alto por verificación de método, unidad y comparabilidad.

## Resultado

El panel de COST_TIRES ahora distingue cuatro fuentes primarias útiles de una cifra adoptable para los cinco segmentos excluidos del contraste interurbano mexicano. El [registro versionado](FCM_TIRE_EXCLUDED_SEGMENT_SOURCES_2026-09-28.json) tiene fuente, hallazgo, límite y brecha por segmento; el [wireframe](design/tire-excluded-source-coverage-wireframe.md) mantiene la lectura compacta.

| Fuente primaria | Señal defendible | Lo que no prueba |
| --- | --- | --- |
| [ATRI, formulario 2026](https://truckingresearch.org/wp-content/uploads/2026/02/2026-Ops-Cost-Motor-Carrier-Form.pdf) | Define costo de llantas de tractocamión en USD/milla, con compra, mantenimiento, renovado y reemplazo sobre millas que soportan costo. | No es una observación de costo ni desglosa drayage, llanta por posición o XBF. El ejemplo de captura del formulario tampoco es un benchmark. |
| [ATRI, comunicado 2026](https://truckingresearch.org/2026/07/new-atri-report-details-accelerating-costs-and-low-profitability-despite-cuts/) | Reporta aumento de 6.4% del rubro llantas en 2025. | Sin nivel absoluto verificado de partida, no se obtiene USD/milla 2025; no se aplica ese porcentaje a un supuesto inventado. |
| [EPA SmartWay, drayage](https://www.epa.gov/smartway/smartway-high-performers-dray-truck-carriers-particulate-matter-and-nitrogen-oxides) | Identifica drayage como operación corta en puertos/terminales. | Trata emisiones, no gasto de llantas. No valida un costo de drayage estadounidense. |
| [IMT, Publicación Técnica 536 (2018)](https://www.imt.mx/archivos/Publicaciones/PublicacionTecnica/pt536.pdf) | Ilustra el mecanismo precio/rendimiento de llanta y su sensibilidad por km. | Los ejemplos históricos no son precios vigentes ni vida observada de MX Drayage o MX Local. |

Los vacíos quedan vinculados a `INTRA_US`, `US_DRAYAGE`, `MX_DRAYAGE`, `MX_LOCAL` y `D2D_US_MX_PARTNER`. En este último, ni siquiera un costo público de llantas sustituye la tarifa negociada del socio mexicano. Ninguna cifra se trasladó a CFU, CVU, bases o cotizaciones; cero parámetros adoptados.

## Próxima evidencia necesaria

Para convertir investigación en contraste económico hacen falta una cifra absoluta reciente por tipo de operación comparable, su denominador y rubros incluidos, o la construcción verificable desde precios instalados, ciclo y vida por posición del vehículo real. Las fuentes públicas localizadas hasta aquí no satisfacen todo eso para drayage/local. El resultado correcto es conservar el estado pendiente, no multiplicar la variación ATRI ni usar los ejemplos IMT como importes actuales.

## Verificación y rollback

La nueva prueba comprueba que los cinco segmentos excluidos tienen una brecha, que todas las fuentes referenciadas existen y que el bloque sigue sin parámetros adoptados ni elegibilidad de cotización. El registro y panel son de sólo lectura; se pueden revertir sin migrar datos. Resultados de build, pruebas y preview se añaden al ejecutarlos.

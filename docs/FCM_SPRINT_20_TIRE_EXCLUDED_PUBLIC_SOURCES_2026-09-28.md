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

La nueva prueba comprueba que los cinco segmentos excluidos tienen una brecha, que todas las fuentes referenciadas existen y que el bloque sigue sin parámetros adoptados ni elegibilidad de cotización. Los cuatro enlaces oficiales respondieron HTTP 200 a `HEAD` el 28 de septiembre de 2026. Pasaron 10 pruebas focalizadas y `npm run build -w freight-cost-web`; el build remoto también terminó. El registro y panel son de sólo lectura; se pueden revertir sin migrar datos.

## Preview y límites de aceptación

- Frontend: https://freight-cost-gm6h3a1hd-elandopando8892s-projects.vercel.app/cost-bases/tires, deployment `dpl_BRpL88UUU1AWZS3cqwuFC2QgtZQm`, `READY`, SHA funcional `b3df5e60d505db7f008a784e5619ec2ac1833f6f`, sólo preview.
- API exclusiva existente y sin cambios: `/health` HTTP 200 y release `192f8577a8442d407c61b907e37c4decd40a0a01`. El par web/API no tiene el mismo SHA porque no hubo cambio de API ni redepliegue de sus credenciales. No se modificaron Auth, datos, motor, bases ni producción.
- Con OPERATOR existente, Google OAuth regresó al preview; se observaron las cuatro fuentes y cinco brechas, cero parámetros adoptados y cero expedientes. Las tarjetas se revisaron en escritorio y a 390 px; el viewport volvió a su tamaño normal. La recarga conservó la sesión. Esto no prueba renovación del token a largo plazo, integración de cálculo ni aceptación productiva.
- Capturas: `D:\andre\apps\codex-home\visualizations\2026\08\26\01a03cbb-7378-7dc0-9dd0-24077f169b51\tire-excluded-sources-preview.png` y `tire-excluded-sources-mobile.png` en la misma carpeta.
- El build de Vercel reportó 13 avisos npm (2 low, 4 moderate, 6 high, 1 critical) en el árbol completo. No se actualizaron dependencias ni lockfile; necesitan triage separado.

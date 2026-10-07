# B1 — Productividad histórica y vacíos observados en fuentes IMT

**Corte:** 2026-09-29  
**Población objetivo:** piloto D2D de carga general, tractocamión T3-S2, tercero  
**Estado:** evidencia histórica contextual; no calibrada, no adoptada y no apta para cotizar  
**Decisión:** conservar días, kilómetros, utilización y vacío como obligaciones separadas; no transformar los hallazgos en defaults del motor.

## Hallazgo ejecutivo

Se localizaron dos ejemplos técnico-económicos del IMT y dos cortes de aforo carretero del EECAN. El caso modelado PT260 usa 120,000 km/año, 300 días de operación y 55% de uso de capacidad por viaje redondo para un T3-S2; PT630 incluye un ejemplo de seguro con 144 viajes y 110,000 km/año. No son mediciones recientes de una cohorte representativa de terceros D2D.

El EECAN cuenta vehículos vacíos observados en estaciones: reporta 20.9% para T3-S2 en 2014 y 60% en 2017. El cambio no estima la proporción anual de kilómetros vacíos: son cortes de años, sitios y redes de estaciones diferentes. IMT indica que 2017 es el último año con trabajo de campo disponible. Por tanto, tampoco se puede promediar 20.9% y 60% ni usarlos como `emptyKmShare`.

**Resultado para el motor:** `annualKmPerTractor`, `productiveDaysPerYear` y `emptyKmShare` del piloto permanecen `MISSING`. `roundTripCapacityUtilization` tampoco se adopta. Esto documenta qué variables hacen falta y cómo no confundir sus denominadores; no completa ni calibra el benchmark B1/E1.

## Registro de evidencia

| Fuente / observación | Dato publicado | Qué mide realmente | Aplicabilidad y decisión |
|---|---|---|---|
| IMT PT260 (2004), T3-S2, caso base de renovación | 120,000 km/año; 300 días de operación; 4,224 t/año; 55% de uso de capacidad por viaje redondo | Entradas de un caso económico proyectado, junto con supuestos de vehículo, financiamiento, vida útil y costos históricos | Útil para enumerar parámetros y estudiar la estructura del método. Antiguo, modelado y sin cohorte observada; no adoptado. El 55% no es porcentaje de km cargados. |
| IMT PT630 (2021), ejemplo de seguro T3-S2 | 144 viajes/año y 110,000 km/año | Denominador ilustrativo para asignar un gasto de seguro a viaje y km | Ejemplo de cálculo; no es encuesta de productividad. No informa días operativos ni distancia cargada/vacía; no adoptado. |
| EECAN 2014, T3-S2 | 20.9% de unidades observadas vacías | Conteo de estado vacío por estaciones instaladas en 2014; IMT informa 10 estaciones | Observación de carretera histórica. No equivale a participación de kilómetros vacíos ni a un transportista tercero D2D; no adoptada. |
| EECAN 2017, T3-S2 | 60% de unidades observadas vacías; 57% agregado de vehículos vacíos en la muestra de ese año; entre estaciones, 32.4%–80% agregado | Aforos de seis estaciones en 2017; mezcla de configuraciones y servicios que transitan por esos puntos | No es proporción nacional de millas/kilómetros ni medición de una empresa/segmento. IMT identifica 2017 como último trabajo de campo disponible; no adoptada. |

Los 20.9% y 60% de T3-S2 se conservan como dos observaciones históricas incompatibles para estimar una tasa única. Sus diferencias pueden reflejar sitio, año, composición y operación; las fuentes citadas no justifican atribuir la diferencia a una sola causa. Que un camión haya sido observado vacío en una estación no significa que haya recorrido vacío la misma proporción de su distancia anual.

## Mapa a los supuestos e inputs del piloto

| Variable de método / input de negocio | Fuente localizada | Resultado B1 |
|---|---|---|
| Kilómetros anuales por tractor (denominador del CFU/km) | PT260: 120,000 en un caso; PT630: 110,000 en ejemplo de seguro | Existen ejemplos antiguos de 110–120 mil, pero no una banda estadística comparable. Mantener `MISSING`. |
| Días productivos/operativos por año | PT260: 300 días en su caso | Es un supuesto de caso base, no observación de la flota objetivo. Mantener `MISSING`. |
| Viajes/año y distancia por viaje | PT630: 144 viajes/año; 110,000 km/año | Denominador ilustrativo, sin ruta/cohorte comprobada. No inferir longitud promedio ni viajes del piloto. |
| Kilómetros vacíos / porcentaje cargado-vacío | EECAN 2014/2017: porcentaje de vehículos observados vacíos por configuración | La unidad estadística no es km. Mantener `emptyKmShare` como `MISSING`; no usar ninguno de los porcentajes como proxy. |
| Utilización de capacidad o carga | PT260: 55% de capacidad por viaje redondo; EECAN registra estado y peso en estaciones | Conceptos distintos. El 55% no mide loaded-km; los aforos no revelan la carga anual de un transportista. Mantener sin calibrar. |

## Límites, riesgo y siguiente decisión

1. El siguiente benchmark defendible requiere datos públicos con denominador **vehículo-año o km por vehículo**, configuración/equipo, país, servicio (for-hire), carga general/seco, periodo y metodología; además, exposición loaded/empty ponderada por distancia para estimar vacío por km.
2. No se identificó en esta revisión una fuente pública mexicana más reciente que entregue, para la cohorte T3-S2 de terceros D2D, esos denominadores juntos. Esto describe las fuentes consultadas, no demuestra que tal información no exista en otras bases.
3. Si las fuentes públicas no alcanzan ese nivel, la alternativa es conservar parámetros faltantes y documentar calibración futura con registros operativos del transportista; no rellenar con referencias de caso.
4. Mantener este expediente separado de SICT parque/vehículo-km, EAT gastos nacionales e IMT costos de operación vial. No dividir gastos agregados entre parque o tráfico y no combinar unidades observadas vacías con km anuales.

## Fuentes primarias

- IMT, [PT260 — Métodos para la renovación de vehículos de autotransporte de servicio pesado](https://imt.mx/archivos/publicaciones/publicaciontecnica/pt260.pdf), caso base T3-S2, capítulo 4.
- IMT, [PT630 — Análisis del costo fijo del autotransporte de carga](https://www.imt.mx/archivos/Publicaciones/PublicacionTecnica/pt630.pdf), ejemplo de seguro por viaje y km.
- IMT, [Documento Técnico 64 / EECAN 2014](https://imt.mx/resumen-boletines.html?IdArticulo=433&IdBoletin=161), estaciones instaladas en 2014 y porcentaje T3-S2 observado vacío.
- IMT, [Documento Técnico 75 / EECAN 2017](https://www.imt.mx/archivos/Publicaciones/DocumentoTecnico/dt75.pdf), apartados 2.4 y estaciones exploradas.
- IMT, [productos digitales y cobertura temporal del EECAN](https://www.imt.mx/transparencia/apertura-gubernamental/productos-digitales.html), identifica datos 2000–diciembre 2017 y que 2017 fue el último trabajo de campo disponible.

## Modelo, esfuerzo y verificación

- Extracción puntual del expediente público: **GPT-6 Luna · alto**, esfuerzo **bajo**; localizar métricas, fechas, unidades y límites.
- Conciliación de comparabilidad y decisión económica: **GPT-6.1 Sol · alto**, esfuerzo **medio**. Astra no es requisito en este corte porque no se está aprobando una política ni adoptando una base.
- Verificación: contraste del texto indexado de los PDF oficiales con las páginas oficiales del IMT; la herramienta de lectura web rechazó algunos PDF con 403, por lo que el informe registra los localizadores y enlaces, sin afirmar lectura visual de página. JSON estructurado creado en paralelo; su validez sintáctica e igualdad de estados se valida localmente.

**Sin cambios** de motor, fórmulas, parámetros de cotización, base de datos, usuarios, autenticación, infraestructura, despliegues o gasto de IA. Rollback: revertir únicamente este informe/JSON y las dos notas de índice añadidas a plan/estado.

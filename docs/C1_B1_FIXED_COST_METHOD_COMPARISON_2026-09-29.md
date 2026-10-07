# B1 · comparación de metodologías de costo fijo y referencias por milla

Fecha: 29 sep 2026 · Piloto: caja seca D2D MX → EE. UU., intercambio entre líneas · Rama `codex/cost-tires-release-s14` · HEAD revisado `4f5fc2d`.

## Decisión ejecutiva

Actualización del mismo día: [ADR-007](architecture/ADR-007-public-reference-fixed-productivity.md) propone un contrato separado por bloques de referencia, sin convertir agregados en microdrivers ni activar una base. En este corte se recuperó el informe completo **ATRI 2025** desde su PDF oficial (observaciones 2024); no se obtuvo el completo 2026. Las afirmaciones de disponibilidad limitada de la comparación inferior describen lo revisado antes, en especial el informe 2026, no una prohibición de investigar el desglose histórico de 2025. Importes/fechas/localizadores en [JSON de investigación](research/B1_FIXED_PRODUCTIVITY_OBSERVATIONS_2026-09-29.json); ningún valor adoptado al motor.

**No sustituir el método detallado por un único costo promedio por milla, y no combinar ambos en una misma suma.** La salida más defendible para el MVP es mantener dos carriles separados:

1. **Estimación económica del carrier** mediante partidas/tasas trazables y denominadores compatibles. Si faltan entradas, el resultado sigue `INCOMPLETE`; la evidencia pública actual no completa el piloto.
2. **Control de magnitud público** con referencias externas etiquetadas por metodología y población: IMT para vehículos representativos mexicanos bajo condiciones de camino; ATRI como promedio agregado estadounidense. Mostrarlo como comparación, no como tarifa, buy price ni sustituto automático de CFU/CVU.

Esta decisión metodológica no habilita una base ni cierra B1/E1. En la unión del registro canónico hay 135 keys: 3 candidatas condicionadas, 45 referencias de contraste y 87 faltantes; ninguna cifra se adopta con este análisis.

## Qué calcula hoy el motor

La fórmula real está en `benchmark-rates.ts`, `engine.outputs.ts`, `benchmark-leg.ts` y `fixed-cost-allocation.ts`.

- **Fijo mensual de flota** = capital/depreciación y financiamiento del activo + seguro + nómina administrativa con carga social + gasto corporativo + un componente de capital de trabajo. En el piloto actual se excluye el costo fijo transfronterizo.
- **Asignación CFU por viaje** = máximo entre (distancia cargada+vacía × fijo mensual / km productivos mensuales) y (días de ciclo × fijo mensual / días-vehículo productivos mensuales). El código usa `max`, no suma ambas asignaciones.
- **CVU doméstico** = combustible a partir de distancia cargada/vacía y rendimientos diferenciados + mantenimiento/km + llantas/km + operador/km + peajes del tramo.
- **Total del tramo** = CFU + CVU. Cruce e intercambio se agregan por separado en el compositor D2D; el total no es compra pactada ni precio de venta XBF.
- Las entradas de MXN deben quedar normalizadas a USD con evidencia/FX; el contrato no convierte automáticamente todos los conceptos de costo.

Una observación adicional: el fijo mensual consume `Customer Collection Days`, `Carrier Payment Days`, `Monthly COGS Proxy` y `Cost of Capital`. Antes de llamarlo costo productivo **del carrier**, debe verificarse si esos días/saldo describen el ciclo de caja del transportista o las condiciones financieras de XBF con el carrier. No cambiaría esos campos ni su fórmula sin resolver quién incurre en esa cuenta por cobrar/pagar y quién financia el COGS.

## Comparación de evidencia pública revisada

| Criterio | A · desglose FCM actual | B1 · IMT México PT881 (2025) | B2 · ATRI EE. UU. (edición 2026, costos 2025) |
| --- | --- | --- | --- |
| Qué representa | Costos propios atribuidos a una flota/country/cohort a través de insumos canónicos | Modelo de costos de operación base de vehículos representativos para transporte interurbano; publicado por el IMT | Promedio por milla derivado de una investigación de costos reportados por transportistas de EE. UU. |
| Universo | Requiere identificar dos carriers/cohortes, una por tramo | Siete vehículos/configuraciones representativos; los articulados incluyen T3-S2, T3-S3 y T3-S2-R4, cargados a capacidad límite | Promedio industria nacional; el comunicado público no aporta la apertura completa por segmento/corredor |
| Dimensión de camino/uso | Recibe km del viaje, km/mes de la flota y días de ciclo | Sensibiliza costo/velocidad ante geometría, tipo de terreno y estado superficial de carretera mediante modelos VOC/HDM | Referencia costo promedio por milla; no identifica el perfil del tramo del piloto |
| Nivel público disponible | Fórmulas y catálogo visibles; datos comparables para 132 MX/131 US aún no disponibles | PT881 y resumen técnico públicos; el resumen señala un vehículo-cost model orientado a planeación/evaluación vial, no una cotización carrier | Comunicado informa **USD 2.336/milla** promedio total de 2025 y **USD 1.854/milla excluyendo combustible**; el informe completo se obtiene en una página con formulario de contacto |
| Comparabilidad con D2D cross-border | Conceptualmente apto si fuente, alcance de activos, moneda, fecha y cohorte están validados | Es la referencia más cercana al costo técnico de carretera mexicano; no modela por sí sola los dos operadores, distancias vacías, el handoff o el acuerdo contractual | Solo contraste para parte estadounidense. No se traslada a México ni identifica el costo por línea del Laredo/otro gateway |
| Riesgo principal | Defaults históricos y datos públicos agregados no respaldan microdrivers; posible ambigüedad de working capital | Costo de vehículo/ruta no es igual a contabilidad de un carrier, tarifa ni costo door-to-door completo | Usar USD/mile como fixed rate deja combustible y otras categorías de su total mezcladas con el CVU actual |

Fuentes primarias: [IMT PT881/resumen de la publicación](https://www.imt.mx/resumen-publicaciones.html?IdPublicacion=1334&IdTipo=Publicaci%C3%B3n+t%C3%A9cnica+No.881&LbPalabra=0), [síntesis del IMT en Notas 220 (mar-abr 2026)](https://imt.mx/resumen-boletines.html?IdArticulo=657&IdBoletin=221), [anuncio oficial del promedio ATRI 2025](https://truckingresearch.org/2026/07/new-atri-report-details-accelerating-costs-and-low-profitability-despite-cuts/), [formulario de recolección ATRI 2026](https://truckingresearch.org/wp-content/uploads/2026/02/2026-Ops-Cost-Motor-Carrier-Form.pdf), [página de solicitud del informe ATRI 2026](https://truckingresearch.org/2026/07/analysis-of-the-operational-costs-of-trucking-2026-update/).

### Límites concretos de los datos

El IMT dice que su PT881 estima costos básicos de operación para siete configuraciones y evalúa el efecto de la geometría y el estado superficial vial. La ficha completa ya fue recuperada y conciliada; confirma insumos/costos para T3-S2/S3, pero **no es** un expediente de gastos reales de una empresa ni evidencia de productividad/operación vacía para el carrier modelado. El cruce a las fronteras FCM está en [B1 · conciliación de rubros públicos contra CFU/CVU](C1_B1_PUBLIC_METHOD_CROSSWALK_2026-09-29.md). [PDF oficial PT881](https://imt.mx/archivos/Publicaciones/PublicacionTecnica/pt881.pdf) · [resumen y propósito](https://www.imt.mx/resumen-publicaciones.html?IdPublicacion=1334&IdTipo=Publicaci%C3%B3n+t%C3%A9cnica+No.881&LbPalabra=0) · [síntesis técnica PT881](https://imt.mx/resumen-boletines.html?IdArticulo=657&IdBoletin=221).

ATRI comunica el promedio de USD 2.336/milla en 2025 y el dato de USD 1.854/milla al excluir combustible; destaca variaciones en peajes, R&M, beneficios del operador y llantas. Esto da una referencia agregada, pero no las filas necesarias para asignar valores independientes a las 135 keys MX/US. La descarga del informe completo solicita identificación y contacto: **no se envió el formulario ni se proporcionó información**. El instrumento de recolección distingue R&M de neumáticos, pero el material verificado aquí no publica su descomposición completa por segmento aplicable. [ATRI: resultados publicados](https://truckingresearch.org/2026/07/new-atri-report-details-accelerating-costs-and-low-profitability-despite-cuts/) · [forma/metodología de recolección](https://truckingresearch.org/wp-content/uploads/2026/02/2026-Ops-Cost-Motor-Carrier-Form.pdf) · [página de descarga por contacto](https://truckingresearch.org/2026/07/analysis-of-the-operational-costs-of-trucking-2026-update/).

## Reconciliación que evita doble conteo

Sea `D` la distancia total del carrier en el tramo y `T` sus días de ciclo. La salida actual es, esquemáticamente:

```
CFU_tramo = max(D × fijo_mensual / km_productivos_mes,
                T × fijo_mensual / días_vehículo_mes)

CVU_tramo = combustible(Dcargada, Dvacía, rendimientos, diesel)
            + D × (mantenimiento/km + llantas/km + operador/km)
            + peajes_del_tramo

Costo productivo = CFU_tramo + CVU_tramo + cruce/intercambio separados
```

No usar estas operaciones sin datos compatibles:

- **ATRI USD 1.854/milla sin combustible** no es `fijo_mensual/km_productivos_mes`: ya es un costo de operación por distancia que incluye más de una familia del CVU y del CFU. No sumarlo al CFU y mantener aparte R&M, llantas, conductor y peajes sin una apertura compatible.
- **IMT costo operativo base por vehículo-km** no se debe multiplicar por distancia y luego agregar otra vez combustible, operador, mantenimiento, llantas, depreciación/intereses o indirectos que el modelo ya haya incluido. PT881 ya está extraído: antes de cualquier uso posterior se requiere elegir una política exclusiva y cerrar las fronteras todavía no verificables.
- No derivar “fixed = ex-fuel total − los componentes que conocemos” con componentes que vengan de otro país, otra flota, otro periodo, otro denominador o distinto tratamiento de peajes/beneficios.
- Si no hay apertura reconciliable, conservar la cifra solo en un panel/campo de **referencia independiente**, sin sumar al total FCM.

## Decisión recomendada para el MVP público

Adoptar **Método A para la estructura de cálculo** únicamente cuando cada entrada económica tenga fuente comparable y aplicación aprobada. Usar **Método B como espejo de razonabilidad** (IMT en MX y ATRI en US, cada uno identificado, no presentado como par comparable). Resultado esperado mientras haya faltantes: el MVP puede mostrar explicación y estado de evidencia; **no puede afirmar que el costo del carrier D2D está calibrado**.

Con la restricción actual de “fuentes públicas”, existe evidencia pública útil para investigación y contrastes, pero no una base homogénea y desagregada que permita producir los dos carrier costs exactos con estas fórmulas. Hay que resolver una elección de producto si eso no cambia: o bien usar estimaciones incompletas/fail-closed hasta disponer de fuentes públicas más desagregadas, o bien presentar un nuevo producto claramente nombrado como **referencia pública de costo de vehículo/ruta**, sin llamarlo costo individual de tercero ni costo de compra. Esto no cambia el objetivo original automáticamente; delimita lo que se puede probar.

## Siguiente actividad de investigación

1. Determinar si F&OS de FMCSA es recuperable públicamente por transportista y sirve a una cohorte comparable; confirmar límites de clasificación y cobertura antes de extraerlo.
2. Terminar el cruce de las categorías ATRI frente a las fronteras FCM con sólo la tabla/comunicado/formulario públicamente accesible; no enviar solicitud ni agregar datos de contacto.
3. Emitir decisión B1/E1 de suficiencia sólo cuando la misma frontera de costo, unidad, fecha, equipo y exposición pueda conciliarse para ambos tramos. IMT PT881 permanece como control mexicano, no como un input.

Sin cambios de código, parámetros, bases, DB, Auth, infraestructura, usuarios o despliegue. Sin cálculo ilustrativo con defaults ni operación comercial. No requiere wireframe porque este entregable no modifica UI. Modelo sugerido: GPT-6 Luna · alto para extracción/revisión de la ficha; GPT-6 Astra · alto para dictamen de comparabilidad y puente CFU/CVU.

Rollback: retirar este documento y actualizar únicamente las referencias documentales; ninguna configuración del motor o dato persistido depende de él.

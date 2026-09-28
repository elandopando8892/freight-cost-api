# Sprint 19 — comparabilidad IMT por segmento operativo

Modelo recomendado: GPT-6 Sol; esfuerzo medio-alto por límites de método y conciliación de taxonomías.

## Resultado

Se añadió un mapa de investigación en COST_TIRES que clasifica los nueve segmentos vigentes de bases de costo: cuatro admiten sólo un contraste condicionado de un tramo mexicano interurbano separado y cinco no tienen comparación directa. Cada clasificación expresa el tramo y su límite; seis verificaciones explican qué falta antes de comparar cualquier CVU. [Wireframe](design/tire-imt-segment-map-wireframe.md) y [mapa versionado](FCM_TIRE_IMT_SEGMENT_MAPPING_2026-09-28.json).

La fuente numérica permanece [IMT Publicación Técnica 881](https://imt.mx/archivos/Publicaciones/PublicacionTecnica/pt881.pdf), un modelo de vehículos representativos del transporte interurbano nacional, no una medición de flota XBF ni una tarifa de terceros. La [síntesis oficial del IMT](https://imt.mx/resumen-boletines.html?IdArticulo=657&IdBoletin=221) confirma el fin de estimación de costos de operación para planeación y prefactibilidad, y enumera T3-S3, T3-S2 y T3-S2-R4 cargados a capacidad límite. El mapa no infiere que una flota de XBF tenga esas configuraciones o llantas.

## Reglas de interpretación

- `INTRA_MEX`: sólo viaje propio mexicano interurbano comparable.
- `D2D_BINATIONAL_OWN`: sólo tramo MX propio; no cruce ni EE. UU.
- `D2D_MX_US_PARTNER`: sólo tramo MX si de verdad es costo del vehículo propio; nunca sustituye tarifa del socio estadounidense.
- `D2D_TRANSSHIPMENT`: sólo arrastre MX separado con operador conocido; no patio, transbordo ni espera.
- `D2D_US_MX_PARTNER`, `MX_DRAYAGE`, `MX_LOCAL`, `INTRA_US` y `US_DRAYAGE`: sin comparación directa con el costo IMT de vehículo interurbano mexicano. La tarifa de un socio mexicano exige su propia evidencia comercial.

La clasificación `CONDITIONAL_MX_INTERURBAN` es una invitación a comprobar, no autorización de usar el costo como parámetro. Se requieren país/tramo, operador económico, configuración y llantas, condiciones de operación, año/unidad y evidencia de costos/ciclos si se pretende calibrar. Cero parámetros adoptados; ninguna escritura a CFU, CVU, bases o cotizaciones.

## Diferencia de taxonomía que sigue abierta

`TireCohortRecordSchema` aún usa `D2D_MX_US_HANDOFF` y `D2D_BINATIONAL_SAME_COMPANY`, mientras `OPERATIONAL_SEGMENTS` usa `D2D_MX_US_PARTNER` y `D2D_BINATIONAL_OWN`. Este sprint no presupone equivalencia histórica ni migra cohortes. Una futura conciliación debe revisar semántica, autoría y datos antes de crear una conversión.

## Validación y rollback

La prueba del panel verifica que el mapa cubre exactamente los nueve IDs del catálogo actual, sin duplicados, que la UI los muestra y que la referencia no es elegible para cotización. La compilación y evidencia de preview se añaden al ejecutarlas. El cambio sólo agrega un JSON de investigación y presentación del servidor; retirar esa sección y el archivo restituye el panel anterior sin transformar datos persistidos.

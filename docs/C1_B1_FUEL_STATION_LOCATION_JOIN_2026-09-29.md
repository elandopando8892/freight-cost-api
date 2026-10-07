# B1 · prueba de enlace precio → permiso → estación → geografía

Fecha de corte: 29 sep 2026 · rama `codex/cost-tires-release-s14` · HEAD antes del corte `4f5fc2de0c3d178dace917231e1092040dec21fd`.

## Decisión

**Hay una ruta pública viable para construir la llave geográfica, pero la cobertura total aún no está medida.** La serie CNE de precios identifica `numero_permiso`; el listado histórico de permisos de estación publicado por CNE incluye además número de estación (`E#####`) y domicilio; la capa puntual de SEMARNAT incluye `ID` de estación y geometría. Tres empates dirigidos confirman compatibilidad exacta de las llaves. No son muestra aleatoria, no demuestran la tasa de emparejamiento nacional y no habilitan todavía asignar precios a una ruta ni calibrar FUEL.

## Fuentes, grano y observaciones

| Fuente | Grano/campos observados | Cobertura disponible y limitación |
| --- | --- | --- |
| CNE · [precios reportados por permisionario](https://www.datos.gob.mx/dataset/petroliferos/resource/aaefe434-8464-4be6-ba6a-7f1f3a436cd3/view/7b435e5b-cd17-431e-a1be-41f6e8c96396) | `numero_permiso × fecha × subproducto`, con precio. | Recurso consultable en DataStore; 920,989 filas totales. El diésel automotriz llega al 28 feb 2026 (213 días al corte anterior); no trae estación E ni geometría. |
| CNE · [permisos y autorizaciones vigentes (actualización a febrero 2026)](https://www.datos.gob.mx/dataset/petroliferos/resource/3ab7ac49-f29d-4f98-815a-fe16d7a86269/view/933fb753-e147-49bc-adfb-45f5f80ae221) | Una fila por permiso, `num_per`, tipo, estatus, entidad, fecha de otorgamiento y zona. | 17,840 permisos en el recurso; 14,300 con tipo `Expendio en estación de servicio`. No incluye código E, domicilio de la estación, municipio ni coordenadas. La actualización de datos está cortada a febrero; no se interpreta como estatus verificado al 29 sep. |
| CNE · [histórico de permisos otorgados para expendio en estaciones](https://www.cne.gob.mx/DOCUMENTOS%20CNE/DOCUMENTOS%20DE%20PETROLIFEROS/Hist%C3%B3rico%20de%20permisos%20otorgados%20en%20materia%20de%20petrol%C3%ADferos/Expendioenestacionesdeservicio.pdf) | Tabla con turno, número de permiso, razón social, código de estación, fechas, domicilio, colonia, CP, municipio y entidad. | El documento indica “información actualizada a julio de 2026”. Permite probar `permiso → código E` y aporta domicilio administrativo; no publica coordenadas ni es un feed diario. Los encabezados observados no prueban fecha de expiración contractual/regulatoria. |
| SEMARNAT · [capa ArcGIS de estaciones con diésel](https://geomatica.semarnat.gob.mx/arcgis/rest/services/APLICACIONES/EstacionesServicio/MapServer/2) | Un punto por estación geográfica, campos `ID`, `DIESEL`, `DUBA` y geometría. | Query de conteo devolvió 8,392 puntos. La capa es consultable en JSON y expone IDs `E#####`; los metadatos leídos no mostraron fecha de actualización ni linaje por permiso. No reemplaza la fuente CNE de permisos/estatus/precio. |

## Prueba de enlace ejecutada

Se tomaron los primeros tres ObjectIDs de la consulta de la capa puntual de diésel, todos en CDMX. Fue una prueba dirigida de interoperabilidad, **no una muestra representativa**. Por cada ID se confirmó: (1) fila y dirección en el PDF CNE; (2) `num_per` con estatus `Vigente` en el catálogo CNE fechado a febrero; (3) precio de diésel automotriz por el mismo permiso; y (4) un único punto con el mismo ID de estación en SEMARNAT.

| Station ID | Permiso CNE exacto | Precio diésel CNE más reciente observado | Punto SEMARNAT | Resultado dirigido |
| --- | --- | --- | --- | --- |
| `E00003` | `PL/5497/EXP/ES/2015` | 2026-02-28 · MXN 26.39/L | 1 punto · lon -99.151869, lat 19.440201 | 4 de 4 llaves/sources encontradas |
| `E00013` | `PL/1316/EXP/ES/2015` | 2026-02-28 · MXN 26.98/L | 1 punto · lon -99.190335, lat 19.346443 | 4 de 4 llaves/sources encontradas |
| `E00019` | `PL/7065/EXP/ES/2015` | 2026-02-28 · MXN 26.79/L | 1 punto · lon -99.173096, lat 19.491152 | 4 de 4 llaves/sources encontradas |

Cada permiso consultado aparece como `Vigente` en el recurso de permisos con fecha de datos a febrero de 2026. Cada uno devolvió 27 observaciones de diésel automotriz y ninguna DUBA en ese archivo. Se verificó el valor de la observación máxima de fecha, no precio pagado por un tractocamión. Se revisaron filas dirigidas, no se calculó el porcentaje nacional de cruce ni unicidad para todas las estaciones.

## Perfil de calidad y riesgo al FCM

- **Llave compuesta viable en muestra — severidad media, confianza alta para esos tres IDs:** `numero_permiso` coincide literalmente entre precio y permiso; el documento CNE traduce permiso a `E#####`; SEMARNAT usa ese mismo identificador para el punto. Falta cuantificar excepciones nacionales, cambios de permiso por estación, estaciones multicomponente y duplicados.
- **Vigencia desalineada — severidad alta, confianza alta:** la fuente de precio y el catálogo de estatus tienen fecha máxima febrero; el PDF de dirección está actualizado a julio y el servicio geoespacial no declara fecha de actualización en los metadatos leídos. El punto exacto no acredita que el permiso continúe activo ni que el precio sea actual.
- **Cobertura espacial — severidad alta, confianza media:** 8,392 puntos con atributo de diésel en SEMARNAT y 14,300 permisos de expendio de estación en CNE son conteos de productos distintos; no se pueden dividir ni tomar como cobertura hasta filtrar producto/permiso, conciliar códigos, deduplicar y establecer denominador comparable.
- **Riesgo económico:** una coordenada de estación permite ubicar un precio reportado, pero no indica dónde carga la unidad, cuánto compra, descuento, método tributario, consumo loaded/empty, ni si el precio está incluido en una tarifa contratada. La llave geográfica resuelve ubicación de fuente; no costo de combustible por viaje ni costo por milla.

## Siguiente actividad para cerrar el enlace

1. Extraer con revisión reproducible los permisos CNE de estación del PDF de julio y normalizar `num_per` + `E#####`; medir permisos duplicados, códigos ausentes y una relación permiso↔estación no 1:1.
2. Leer el catálogo vigente completo por páginas desde DataStore y el conjunto de puntos diésel de SEMARNAT por ObjectID; cruzar en ambos sentidos y reportar conteos, unicidad, faltantes, estatus y distribución geográfica. Mantener fecha de corte por fuente.
3. Cruzar permisos emparejados con las 234,616 filas de diésel automotriz de CNE; reportar por permiso y fecha `matched`, `unmatched`, `duplicate`, `inactive/stale`, sin convertir cobertura de llave en evidencia de vigencia actual.
4. Sólo después, probar una ruta aprobada y medir estaciones/precios cercanos bajo tolerancia explícita. Para alimentar CFU/CVU todavía se requieren consumo/rendimiento por segmento, lugar real de abastecimiento, impuestos/FX y política de `fuel surcharge`/buy rate.

**No se integró la capa al producto, no se descargó una tabla completa, no se adoptó ningún valor y no se cambiaron motor, Auth, base de datos, usuarios, infraestructura o despliegues.** La consulta fue pública y de sólo lectura.

## Recomendación de modelo/esfuerzo

- Conciliación/normalización de los archivos y cálculo de cobertura: **GPT-6 Luna · esfuerzo medio**; foco en extracción determinista, llave, conteo y reproducibilidad.
- Dictamen sobre vigencia, sesgo de cobertura y aptitud como supuesto económico FUEL/CFU/CVU: **GPT-6 Astra · esfuerzo medio-alto**; usar sólo al revisar resultados agregados y excepciones, no para sustituir datos faltantes.

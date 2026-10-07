# B1 · vigencia y contrato de captura de combustible público

Fecha de corte: 29 sep 2026 · HEAD antes de editar: `4f5fc2de0c3d178dace917231e1092040dec21fd` · rama `codex/cost-tires-release-s14`.

## Decisión para el benchmark

La fuente pública de CNE aporta precios diarios reportados por estación, pero el recurso de datos disponible llega hasta el 28 feb 2026: al 29 sep son **213 días sin observación**. Esa instancia sirve para investigación histórica y diseño de ingestión, no para fijar un precio vigente de diésel ni cotizar un viaje actual. EIA ofrece una referencia distinta: semanal, regional y minorista. No debe rellenar la ausencia de precio de estación/compra en México ni representar el costo real de cualquier carrier US.

La actualización de datos de CNE es retroactiva y el conjunto puede modificarse en cargas futuras. Para reproducibilidad hay que conservar `observed_at`, `retrieved_at`, fuente/recurso, versión/hash y regla de normalización; una URL viva sin snapshot no alcanza para auditar una estimación histórica.

## Revisión de frescura ejecutada

| Fuente | Acceso y cobertura observados | Freshness al corte | Lectura correcta |
| --- | --- | --- | --- |
| CNE · precio promedio diario por estación | La ficha del recurso identifica CSV `pl_exp_pre_dia_feb26.csv`, 920,989 filas en el DataStore, campos `numero_permiso`, `fecha`, `subproducto`, `precio`. Query ordenada por `fecha DESC` verificó máximo `2026-02-28`. Filtros exactos devolvieron 234,616 registros de `diésel automotríz` y 25,405 de `dUBA`; máximo en ambos productos: `2026-02-28`. | 213 días entre última fecha observada y el corte; título de la carga refiere actualización a febrero y metadato del recurso tiene corte de publicación 17 abr 2026. **Vencido para precio al día.** | El nombre “precios promedio diarios” describe la frecuencia del campo observado, no que el archivo se refresque diariamente. Los campos del recurso de precio no incluyen coordenadas/municipio. Hace falta empatar permiso con un padrón oficial de estaciones que tenga geografía vigente, preservando vigencia e identidad del permiso. |
| EIA · retail diesel all-types / PADD 3 | La tabla EIA abierta y leída muestra como última columna la semana `2026-09-28`: `USD/gal 5.955`, publicada con `Release Date: 9/29/2026`; precio minorista on-highway, impuestos incluidos. PADD 3 es región Gulf Coast e incluye estados además de Texas; no equivale a un punto o carrier concreto. | Un día desde el lunes observado hasta el martes de publicación 29 sep. El release semanal esperado para el día del corte ya estaba publicado; observación previa `2026-09-21: 6.177` permanece en la serie histórica, pero dejó de ser la última. | `PUBLIC_CONTRAST` regional para sensibilidad; no es neto contractual del carrier, precio de terminal, recibo de combustible, descuento, ni surcharge recovery. El resultado no se adoptó a ninguna base ni cálculo de ruta. |

### Acceso, integridad y limitaciones verificadas

- La API de catálogo CKAN CNE respondió para `resource_show` y `datastore_search`, permitiendo verificar metadatos, el máximo observado por producto y conteos filtrados sin descargar los ~921 mil registros.
- El endpoint publicado por el recurso, `https://repodatos.atdt.gob.mx/api_update/cne/petroliferos/pl_exp_pre_dia_feb26.csv`, rechazó una petición de encabezados HTTP con `403`; no se interpretó ese error como prueba de que el CSV no exista. La consulta de DataStore es una alternativa de lectura acotada, pero no autoriza un job productivo ni garantiza continuidad, paginación completa o contrato de servicio.
- La página histórica primaria EIA mostró explícitamente la semana 28 sep, el valor 5.955, la unidad “Dollars per Gallon, Including Taxes” y `Release Date: 9/29/2026`; ese registro sustituye a la semana 21 sep como última observación al corte. Se conserva la página primaria como autoridad, no un republicador rezagado.
- Los conteos son comprobaciones de respuesta para esos filtros, no una certificación de cobertura de todas las estaciones/permisos ni del precio en un corredor particular. No se calculó promedio, mediana, rango, FX, costo/L ni consumo de unidad.

## Contrato de ingestión propuesto (no implementado)

Mantener cada observación sin perder procedencia y unidad:

```text
sourceId, sourceUrl, sourceResourceId, retrievedAtUtc, publishedAtUtc?,
observationDateOrWeek, geographyLevel, geographyId?, stationPermitId?,
productCode, productLabel, price, currency, unit, taxBasis, priceBasis,
sourceRowId?, sourceVersionOrHash, revisionStatus, qualityStatus
```

**CNE / fila de precio**: ingesta incremental por recurso y `fecha`; producto explícito (`diésel automotríz` o DUBA, nunca mezclarlos); excluir precios nulos/no positivos sin borrar su conteo de calidad; deduplicar sólo con una llave validada que incluya permiso, fecha y producto; si se repite la llave, seguir la versión más reciente de la fuente y dejar evento de revisión. La investigación posterior encontró un puente público viable para probar `numero_permiso → código E de estación → punto geográfico`: CNE publica un catálogo de permisos vigentes con entidad y un registro separado de permisos de estación con domicilio/código E; SEMARNAT publica una capa de puntos con `ID=E#####`. La prueba dirigida de tres registros empató, no mide cobertura nacional ni reemplaza la verificación de estatus/frescura. Ver [prueba de enlace](C1_B1_FUEL_STATION_LOCATION_JOIN_2026-09-29.md). Permiso sin pareja o pareja ambigua queda fuera del cálculo puntual y en `UNMATCHED`, no se le asigna ciudad por heurística.

**EIA / observación regional**: capturar código de serie y descripción, período semanal, PADD, valor, USD/gal, método/precio minorista y retrieved timestamp. No generar un registro diario copiando el valor semanal sin etiquetarlo como imputación/forward-fill. Para compararlo con CNE, normalizar unidades solamente en una vista calculada, conservando observación original, factor exacto, FX/fecha si aplica, y la diferencia de alcance minorista/regional.

**Snapshot y backfill**: guardar respuesta cruda inmutable o snapshot particionado, `retrieved_at`, `observation_date`, conteo, campos/tipos y hash; tolerar revisiones retroactivas de CNE como nuevas versiones y no sobrescritura silenciosa. El consumidor de un benchmark debe fijar explícitamente `as_of` y poder reproducir la versión que usó.

## Regla de vigencia candidata

Esta tabla es una propuesta de producto para revisión económica; los límites no los prescribe CNE/EIA y **no se activan** con este corte:

| Nivel del dato | Propuesta de máximo atraso | Si excede el límite |
| --- | ---: | --- |
| Precio MX reportado por estación | 7 días calendario desde `fecha` | No apto para quote actual: `FUEL_PRICE_STALE`, devolver `INCOMPLETE` y pedir precio vigente/factura u operador. Puede usarse únicamente para corrida histórica con fecha base que incluya la observación. |
| Precio US EIA PADD weekly | 14 días desde el lunes de observación | Bloquear sensibilidad “actual”; permitir sensibilidad histórica o indicar último período, sin presentarlo como spot. La tolerancia cubre publicación semanal/feriados, no permite tasa de carrier. |
| Precio de factura/contrato de carrier | Vigencia y ventana contractual explícitas, no SLA público | Rechazar fuera de la vigencia comercial o marcar pendiente; no sustituir con precio público minorista ni con valor de otra base. |

Los thresholds deben configurarse por fuente y clase de uso (`current quote`, `historical reconstruction`, `public contrast`). No promediar ambos países en una sola tasa, interpolar silenciosamente, seleccionar la estación más barata, transformar el precio al tramo opuesto, o sustituir combustible contractualmente incluido en buy rate sin leer el alcance de ese buy rate.

## Implicación en CFU/CVU y siguiente corte

Con este atraso, el precio CNE no puede alimentar una calibración “actual” de la sección FUEL al corte, aunque la fuente sea gubernamental. EIA ofrece una sensibilidad regional de US de reciente publicación, no el rendimiento ni la compra de combustible de un carrier. Ambos feeds son evidencia del componente precio; hacen falta además rendimiento/consumo loaded-empty del mismo operador, regla de impuestos/FX y aclaración de si fuel/surcharge está incluido en el costo contractual.

Siguiente corte: extraer de forma reproducible el mapa público CNE permiso↔código E y medir el join completo con el catálogo de estatus y los 8,392 puntos SEMARNAT de diésel; informar claves duplicadas, unmatched y corte de fecha por fuente. La prueba de tres pares sólo prueba factibilidad. Después medir qué observaciones por estación quedarían asociables a un corredor aprobado. La fuente EIA ya se refrescó en este corte; seguir su ventana semanal en el próximo refresh. No elegir corredor sin endpoints y punto de intercambio confirmados; no activar umbrales ni poblar la base.

## Fuentes

- CNE / datos.gob.mx, [recurso oficial de precios diarios de estaciones, actualización a febrero 2026](https://www.datos.gob.mx/dataset/petroliferos/resource/aaefe434-8464-4be6-ba6a-7f1f3a436cd3/view/7b435e5b-cd17-431e-a1be-41f6e8c96396); API pública usada para verificar conteos y fecha máxima: `resource_show?id=aaefe434-8464-4be6-ba6a-7f1f3a436cd3`, más `datastore_search?resource_id=aaefe434-8464-4be6-ba6a-7f1f3a436cd3&filters=%7B%22subproducto%22%3A%22di%C3%A9sel%20automotr%C3%ADz%22%7D&limit=1&sort=fecha%20desc` y el mismo endpoint con filtro `dUBA` codificado como `%7B%22subproducto%22%3A%22dUBA%22%7D`.
- EIA, [Retail Prices for Diesel (On-Highway), serie y observaciones semanales](https://www.eia.gov/dnav/pet/PET_PRI_GND_DCUS_R30_W.htm); [panel EIA Open Data](https://www.eia.gov/opendata/browser/petroleum/pri/gnd).
- EIA, [tabla histórica primaria de precios retail por semana para Gulf Coast (PADD 3)](https://www.eia.gov/dnav/pet/PET_PRI_GND_DCUS_R30_W.htm): columna 09/28/26 = USD 5.955/gal; publicación 9/29/2026. La semana previa 09/21/26 = USD 6.177/gal.

Rollback: retirar este documento y sus enlaces al estado B1; sin dependencia de ejecución ni efecto en aplicación/datos.

Modelo/esfuerzo recomendado: GPT-6 Luna · alto para lectura/normalización de datos públicos por volumen; GPT-6 Astra · medio para revisar calidad, vigencia y frontera económica. Esta actividad fue extracción documental acotada; no se ejecutó un proceso batch, cálculo de costo ni integración.

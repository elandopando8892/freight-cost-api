# Reemplazos de rutas de producción

Una ruta con estado `PRODUCTION` es inmutable. Cuando cambian los costos o se
aprueba una versión de supuestos distinta, el operador no edita ni recalcula
esa ruta: propone una nueva revisión.

`POST /production/routes/:routeId/replacements` exige:

- que la ruta fuente esté en `PRODUCTION`;
- `confirmedCostBaseId` y `confirmedAssumptionSetId` explícitos;
- una versión publicada, perteneciente a la base compatible con la operación.

El resultado es una nueva `ProductionRoute` en `DRAFT`, con:

- el mismo contexto comercial y geográfico de la ruta fuente;
- `revision` incrementada dentro de su `routeKey`;
- `supersedesRouteId` para mantener la línea de sucesión;
- la base y versión elegidas por el operador.

La nueva revisión debe superar las validaciones habituales y ser promovida por
separado. Crear o producir el reemplazo no archiva la ruta original, no cambia
sus cotizaciones guardadas y no reenvía información a Rateware. El archivo de
la anterior sigue siendo una decisión humana posterior.

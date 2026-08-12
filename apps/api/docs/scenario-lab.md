# Scenario Lab

`POST /scenarios/quotes/:id` toma el snapshot reproducible de una cotización existente y evalúa una alternativa solo en memoria.

- Palancas iniciales: diésel MX, diésel frontera, tipo de cambio y margen bruto objetivo.
- El snapshot se verifica antes de calcular. Si no es reproducible, no se genera escenario.
- No crea ni actualiza Quotes, AssumptionSets, Production Routes, RateBooks ni entregas Rateware.
- El resultado identifica el delta contra el baseline y requiere que una persona decida si debe crear una nueva versión de supuestos o una nueva cotización.

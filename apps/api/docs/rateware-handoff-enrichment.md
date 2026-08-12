# Enriquecimiento humano del handoff

`POST /integration/rateware/quotes/:id/enrichment` permite registrar en una
cotización confirmada y elegible: carrier, fecha de vigencia, responsable,
capacidad opcional y notas. El registro se guarda como un evento
`RATEWARE_ENRICHED` de auditoría con actor y fecha.

No se infieren campos comerciales, no se publica una tarifa y no se envía el
registro a Rateware. El enriquecimiento únicamente completa evidencia local
para una revisión humana posterior.

# Preflight de candidato Rateware

El preflight local revisa que el paquete confirmado tenga ruta, operación,
servicio, equipo y tarifa USD válidos. Mapea esos datos como un candidato de
lectura para Rateware.

No infiere ni completa `carrier`, `effectiveDate` o `rateOwner`: son campos
comerciales que deben ser enriquecidos y confirmados por una persona en el
flujo correspondiente. Por ello una cotización puede estar estructuralmente
lista y aun requerir enriquecimiento antes de cualquier alta de tarifa.

Esta validación no crea un RateBook, no crea tarifas y no llama a Rateware.

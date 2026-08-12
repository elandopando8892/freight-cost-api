# Inteligencia de mercado

`GET /market/intelligence` entrega señales de solo lectura, autenticadas y aisladas por organización.

La respuesta compara las dos últimas observaciones disponibles de diésel histórico de EE. UU. y FX de la organización; además identifica RateBooks publicados que vencen dentro de 30 días o que fueron publicados contra una versión de supuestos distinta de la activa para la misma base.

No actualiza FSC, parámetros, cotizaciones, rutas ni RateBooks. Cada señal contiene su evidencia, los alcances afectados y una ruta de revisión. El operador decide si corresponde revisar el combustible, los supuestos o preparar una regeneración controlada.

# RateBook Core

RateBook es el tarifario comercial versionado; no sustituye los supuestos ni
sobrescribe rutas de producción. Su ciclo es `DRAFT -> PUBLISHED -> ARCHIVED`.

Un borrador se ata a una base de costos activa y a una versión de supuestos
publicada de esa misma base. Sólo puede incorporar snapshots de cotizaciones
internas confirmadas que tengan esa misma línea de gobierno. Cada entrada copia
ruta, operación, tarifa USD/MXN, tipo de cambio y versión de la cotización.

Publicar requiere al menos una entrada y una nota explícita del administrador.
Cambios futuros a la ruta, costo, supuestos o cotización fuente no modifican el
snapshot publicado.

## Regeneración controlada

Un RateBook publicado se revisa contra la versión activa de supuestos y el
estado de sus rutas fuente. Si detecta una versión distinta, una ruta archivada
o una ruta fuente ausente, muestra la diferencia y las cotizaciones confirmadas
compatibles. Crear regeneración nunca edita ni archiva el publicado: crea un
RateBook `DRAFT` derivado con su propia selección de snapshots y nota de
regeneración. La publicación continúa requiriendo revisión explícita.

## Exportación operacional

Sólo un RateBook publicado puede descargarse como CSV. El archivo usa orden
determinista e incluye encabezados de versión, vigencia, base de costos y la
evidencia de cada entrada fuente. Los campos de texto se protegen contra
inyección de fórmulas de hoja de cálculo. Exportar es una lectura auditada por
la identidad autenticada; no envía datos a Rateware, Gmail ni terceros.

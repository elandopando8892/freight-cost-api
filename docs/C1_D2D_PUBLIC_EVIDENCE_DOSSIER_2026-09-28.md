# Expediente público inicial: D2D con intercambio y remolque compartido

Consulta: 2026-09-28, fecha local del entorno. Base Git: `5df998bae7166e25b1312eb562314a57c3e88c5f`, rama `codex/cost-tires-release-s14`, worktree en D: limpio al inicio. Investigación documental; ningún importe adoptado, ningún cambio de código, UI, Auth, infraestructura o datos. Modelo recomendado: Luna alto para extracción; Astra alto para comparabilidad y derivaciones. No se cambió el modelo ni se delegó trabajo.

## Alcance y decisión

Hipótesis a investigar: caja seca compartida entre tractores MX/US, sin transbordo. No es una afirmación sobre una operación real de XBF. El expediente anterior y los contratos locales se reutilizan; no se crea otra metodología paralela. No se consultaron formularios privados ni se enviaron solicitudes comerciales.

Resultado: existen referencias públicas útiles para contraste y asignación de responsabilidades, pero las fuentes revisadas no completan los cinco inputs económicos/productivos del remolque. Distancia y ciclo son datos del viaje, no faltantes que deba llenar una media sectorial. No se asigna vigencia de uso económico por el mero hecho de consultar hoy una página.

## Registro de fuentes y hallazgos

### S1 — TTI, Urban Mobility Report 2025, Appendix C

Fuente primaria abierta: https://static.tti.tamu.edu/tti.tamu.edu/documents/mobility-report-2025-appx-c.pdf

Exhibit C-3, página PDF 7 (impresa 5), y Exhibit C-4, página PDF 9 (impresa 7): estimaciones 2024 en USD/milla de camión: pagos tracto/remolque 0.378, mantenimiento 0.212, llantas 0.048. Son referencias agregadas, no observaciones separadas del remolque. La metodología combina antecedentes ATRI con estimación TTI. Uso: contraste externo de magnitud, nunca suma adicional a los mismos componentes ya calculados. No convertir un pago combinado por milla en fijo mensual del remolque sin desglose y exposición documentados. No trasladar automáticamente a MX ni a 2026. Se revalidó la fuente ya registrada en Sprint 21; no es una fuente nueva para el proyecto.

### S2 — EIA, metodología semanal de diésel

Fuente primaria abierta: https://www.eia.gov/petroleum/gasdiesel/diesel_proc-methods.php

Localizador: Weekly on-highway diesel fuel price and annual sales volume data collection. Encuesta de precio minorista en efectivo/autoservicio, impuestos incluidos, observado el lunes; medias nacionales y regionales ponderadas. Uso: input FUEL del tractor de EE. UU., con región y fecha explícitas. No respalda combustible MX, rendimiento ni gastos del remolque. No se extrajo precio vigente en este corte. Antes de adoptar debe resolverse el tratamiento de impuestos para no describir el resultado como neto de impuestos si usa precio de bomba.

### S3 — XTRA Lease, Dry Van Leasing

Fuente primaria comercial abierta: https://www.xtralease.com/get-trailer/trailer-leasing/dry-vans

Localizador: Leasing Options. Distingue arrendamiento operativo, venta condicional/financiamiento y opciones de mantenimiento. Respalda separar modelos de tenencia e inclusiones; no publica en esa sección un importe comparable para adoptar. No acredita autorización de uso transfronterizo ni aplicabilidad contractual a XBF.

### S4 — Milestone, Standard Maintenance

Fuente primaria comercial abierta: https://customer.milecorp.com/standard-maintenance/

Localizadores: párrafo inicial y responsabilidades de arrendador/cliente. El programa tiene cargo por millaje; el arrendador cubre desgaste normal y ciertos reemplazos de llantas/frenos, mientras daños y otros conceptos quedan al cliente. No contiene el valor monetario del cargo. Inferencia para FCM: un paquete de mantenimiento que incluya llantas no puede sumarse además a un costo completo de llantas. Tampoco su regla de desgaste contractual demuestra una vida económica observada de neumáticos.

### S5/S6 — documentos localizados pero no recuperados íntegramente

- IMT PT881 (costos base 2025): https://www.imt.mx/archivos/Publicaciones/PublicacionTecnica/pt881.pdf devolvió 403. El resultado indexado del boletín https://www.imt.mx/resumen-boletines.html?IdArticulo=657&IdBoletin=221 describe costos interurbanos y condiciones geométricas/superficiales de referencia; la apertura también falló. Sin extracción de tablas ni cifras nuevas.
- ATRI formulario 2026: https://truckingresearch.org/wp-content/uploads/2026/02/2026-Ops-Costs-OO-Form.pdf devolvió 403. El resultado indexado menciona costos conjuntos de tractor y remolque. Solo pista de investigación, no evidencia íntegramente revisada ni fuente de valores.

## Conciliación de los ocho campos del contrato

| Campo | Clase | Evidencia obtenida | Falta para usarlo |
| --- | --- | --- | --- |
| monthlyFixedUsd | Economía de base | S1 contraste agregado; S3 modelos de tenencia | Precio/renta de caja comparable, edad/configuración, moneda/fecha, residual/plazo y gastos exclusivos; separar compra de arrendamiento |
| productiveKmPerMonth | Supuesto productivo de base | Ninguna cifra comparable revisada | Utilización por remolque, no por tractor; cohorte y relación remolques/tractores |
| productiveDaysPerMonth | Supuesto productivo de base | Ninguna cifra comparable revisada | Días disponibles/productivos, inactividad y definición de exposición consistente |
| maintenanceUsdPerKm | Economía de base | S1 agregado; S4 inclusiones | Costos exclusivos de caja y denominador comparable, o paquete con inclusiones explícitas |
| tiresUsdPerKm | Economía de base | S1 agregado; S4 límites de responsabilidad | Cantidad/medida, precio instalado, vida sustentada, casco/recape y exclusiones de paquetes |
| totalKm | Dato de viaje | No corresponde adoptar benchmark | Ruta cargada, reposicionamiento del remolque, procedencia y fecha de distancia |
| cycleDays | Dato de viaje | No corresponde adoptar benchmark | Traslado, intercambio, espera, carga/descarga y reposicionamiento, sin duplicar intervalos |
| allocationEvidence | Regla de asignación | S3/S4 muestran que inclusiones varían | Definir quién absorbe cada costo en la modalidad modelada y respaldar exclusión en ambos tractores |

Estado de estos ocho campos: ninguno queda económicamente aprobado por este documento. Cinco inputs económicos/productivos pendientes, dos datos dependientes del viaje y una asignación pendiente. Esto no es un porcentaje de completitud del inventario total de FCM.

## Hallazgo que condiciona el siguiente desarrollo

El adaptador actual suma mantenimiento y llantas separados. Eso sirve para costos exclusivos documentados; no representa por sí solo un paquete comercial con ambos incluidos. No repartir arbitrariamente un paquete entre ambos ni escribir cero sin documentar inclusión. Se requiere contrato explícito de conceptos cubiertos y rechazo de duplicados antes de admitir esa modalidad. Igualmente, la fórmula local de fijo por máximo entre tiempo/distancia es asignación económica, no reproducción de una factura de arrendamiento con mínimos/cargos por uso.

Prioridad siguiente: representar OWNED vs LEASED y exclusiones/inclusiones del remolque; después extraer precios públicos comparables de caja seca y componentes bajo ese alcance. No sumar renta y depreciación/financiamiento del mismo activo. La investigación pública sigue siendo el camino; no se exige al usuario documentación privada para continuar.

## Evidencia de cierre y rollback

Lectura actual de cuatro fuentes primarias; dos documentos con acceso fallido registrados. No se ejecutan pruebas de software porque no cambia lógica; el resultado previo de 73 pruebas no se presenta como validación del benchmark. Revisión de cambios con git diff --check. El Preview permanece sin cambios y el expediente no declara C1 cerrado. Rollback: revertir solo el commit documental; no hay datos remotos que restaurar.

# Cierre de conformidad metodológica · 7 octubre 2026

Estado general: EN CURSO. No equivale a aceptación económica, publicación ni habilitación comercial.

## Objetivo y alcance

Cerrar la cadena fuente → supuesto/input → unidad/fecha/perfil → fórmula → CFU/CVU → output → prueba. Caso inicial: empresa binacional operando, relevo propio MX/US, misma caja seca 53′, CDMX–Fort Smith vía World Trade Bridge, ambos escenarios de retorno. No ampliar ese resultado a otros perfiles sin su propia evidencia.

La autorización de continuar permite implementación y comprobaciones locales. No se ejecutaron escrituras de base, migraciones, llamadas de rutas facturables, cambios de Auth, despliegues o adopciones de importes. Se conservan todas las modificaciones anteriores.

Entorno verificado: `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `689432674e65619352318182e2cc05fc97af53d8`. Índice sin cambios de este corte. La ruta ambiental C: no se usó para editar.

## Revisión previa y elección

Se reutilizan `reconcile-economic-model-inventory.ts`, `model-parameter-consumers.ts`, `model-formula-contracts.ts`, el paquete B2 congelado y la revisión R2. Ya existe el inventario completo: no construir otro catálogo ni otro motor. La primera revisión conversacional había enfatizado las 135 dependencias; el auditor existente también cubre los 210 campos y las lecturas externas a ese subconjunto.

Alternativas para combustible:

1. Conservar el parser legado: menor cambio pero permite mezclar regiones y leer gasolina cuando falta diésel. Rechazada por pruebas reproducibles.
2. Corregir el lector existente y devolver observación fechada: elegida. Sin dependencia, infraestructura ni credencial nueva; implementación pequeña y verificable.
3. Migrar inmediatamente caché/modelo de datos y adoptar precios nuevos: no realizada. La persistencia requiere un cambio acotado de contrato y su validación, no sustituir la fecha de observación por `updatedAt`.

La [fuente RSS oficial EIA](https://www.eia.gov/petroleum/gasdiesel/includes/gas_diesel_rss.xml) fue leída por HTTP el 7 octubre. Mostró `Data For 10/05/26`, publicación `Tue, 06 Oct 2026 09:18:36 EST`, un item, once regiones y dólares por galón. La herramienta web no admitió XML; se usó lectura HTTP sin credenciales ni escrituras. No se adoptaron esos precios. Los tests usan fixtures, no una prueba de persistencia del feed real.

## Tablero único: ocho áreas, sin porcentajes ficticios

“Verificado local” sólo cierra el alcance indicado. Ninguna fila se considera económicamente cerrada por contar archivos, parámetros o tests.

| Área | Evidencia/resultado actual | Condición pendiente de cierre integral |
|---|---|---|
| A1 Inventario y supuestos | Auditor reutilizado: 210/210 campos, 16 secciones; 135 dependencias del benchmark, 58 campos adicionales con lector literal y 17 sin lector literal en los siete archivos inspeccionados. También expone 30 lecturas de 29 claves FACTORS fuera del catálogo. Cero lecturas dinámicas en ese alcance. | Resolver destino/aplicabilidad de los 17 campos y evidencia de FACTORS; distinguir input de viaje, política comercial y parámetro económico. La ausencia de lector en esos archivos no demuestra ausencia en toda la aplicación. |
| A2 Fórmulas, CFU/CVU y unidades | 82 sondas aritméticas fijas/mantenimiento sin discrepancias; R2 reconcilia 24 escenarios, 32 partidas fijas, 20 conceptos variables y 88 pins. Nueva ejecución de sólo lectura disponible. | Tres asociaciones de PU de llantas del legado difieren del método por posición. Mantener identificados WORKBOOK_V3, benchmark posicional y presupuesto por familias; no declararlos equivalentes ni aplicar agregados a microinputs. |
| A3 Bases operativas | Perfiles/configuración y controles de aplicabilidad existentes comprobables; propuesta propia B2 conserva misma caja y responsables. | Cinco segmentos CONFIGURABLE no significan cinco bases calibradas. Cuatro segmentos MODEL_PENDING: socios MX/US en ambas direcciones, transbordo y MX drayage. El relevo propio B2 tampoco equivale al preset through-tractor. |
| A4 Benchmark económico | Linaje público y reservas explícitas conservados; importes congelados no modificados. | Sustentar o limitar transferencias de primas, prestaciones, pernocta y peajes. Seis reservas no se transforman en tarifas observadas por aprobar un cálculo. Calibración pública del perfil no equivale a costos privados del carrier. |
| A5 Combustible | Corregidos cruces de región, fallback gasolina, duplicados contradictorios y valores inválidos. Lector fechado vincula precio/fecha al mismo item, valida fecha/unidad y exige once regiones antes de escribir. Respuesta declara `observationDatePersisted:false`. | Persistir fecha/fuente con el precio y transportarlas a revisión/recarga/snapshot; invalidar procedencia si hay edición manual. Regla de vigencia por fuente/servicio y proveedor mexicano pendientes. `updatedAt` no es observación. |
| A6 Ruta, distancia y ciclo | Clientes y pruebas existentes preservan distancias candidatas; controles no permiten llamar validación truck a DRIVE. | Ruta elegida → km/millas cargadas/vacías por recurso → reloj operativo, no duración DRIVE como ciclo. Confirmar atributos/ámbito del proveedor y traslado aceptado al modelo. Sin optimización de flotas nueva. |
| A7 Casetas México | SAKBE y conciliador existentes prueban estructura, ejes y consistencia; no adoptan automáticamente tarifas. | Mismo itinerario, sentido, clase/ejes, moneda, impuestos y vigencia; puente separado; desconocido no es cero. Conservar controles por excepción, no investigar cada caseta como condición para aprobar la matemática. |
| A8 Outputs y cotizador | Separación costo productivo/compra/venta; propuesta local no se anuncia publicada/calibrada ni aplicada a parámetros. | Recorrido de método elegido y base versionada → inputs de viaje → resultado explicable → persistencia/recarga/replay; aceptación real antes de adopción. No habilitar por booleanos o por aprobar los tests. |

Las 13 secciones económicas solicitadas permanecen dentro de las 16 del catálogo. Las otras tres son BORDER, CONFIG y COST_CROSSBORDER; no deben desaparecer de la revisión por no figurar en la lista inicial.

### Los 17 campos que requieren adjudicación explícita

- LABOR: Sueldo Base Operador MX, Viáticos MX, Team Driver Premium, Hazmat Driver Premium.
- FINANCE: Inflation Buffer.
- UTILIZATION: Trailer Utilization, Truck Utilization Days, Free Time, Detention Rate.
- BORDER: Border Friction Time, Yard Transfer Cost, Inspection Delay Reserve.
- RISK: Tight Market Premium, Expedited Premium, Hazmat Premium, Weather Disruption Buffer.
- TECHNICAL_MARGIN: Buy Market Weight.

No eliminados ni llenados con defaults. Ejemplo: que B2 modele viáticos por familia no conecta automáticamente el campo canónico Viáticos MX al cotizador legado.

## Orden de los próximos trabajos y cierre exigido

1. **A1/A2:** adjudicar los campos/FACTORS y contrato de método; para cada uno, consumidor/fórmula o exclusión justificada. Separar costo de prima comercial. Conservar compatibilidad histórica por versión, no corregir silenciosamente los snapshots.
2. **A5–A7:** completar procedencia y aceptación de datos externos usando integraciones existentes. Cierre: misma fuente/fecha/unidad/perfil en entrada, cálculo y recuperación; errores, vencimiento y duplicación probados. Cambios de DB o proveedor externos requieren autoridad puntual; no usar permisos históricos caducados.
3. **A3/A4/A8:** caso propio completo y aceptable antes de expandir segmentos. Cada perfil adicional requiere su canasta y responsabilidades; la caja seca no calibra reefer/hazmat/flatbed. Cierre: resultado reproducible y límites visibles, sin vender una referencia de planeación como tarifa comercial.

Responsable: Codex, implementación e integración local. Recomendación por los tres bloques: OpenAI GPT‑6.1 Sol, esfuerzo alto; modelo servido/esfuerzo efectivo no observables. Claude es alternativa para revisión independiente, pero no se invocó ni se presume presupuesto disponible. Este documento no activa una política ni concede cuotas. Corte local acotado a 45 minutos; cero llamadas de IA de aplicación/Claude, cero reintentos de proveedor de pago. Nuevos bloques se acotan con su evidencia, no autorizaciones permanentes. Cuota y consumo monetario atribuibles: desconocidos.

Skills aplicadas: diseño de código para reutilizar el módulo existente; estrategia de pruebas para separar cálculo/contrato simulado de persistencia y aceptación real. Sin UI modificada; no corresponde wireframe nuevo en este corte.

## Evidencia de ejecución y limitaciones

- Rojo inicial: cuatro casos nuevos reproducen mezcla geográfica, gasolina como diésel, contradicciones y precios inválidos. Reparados.
- Rojo de observación fechada: ocho casos fallaron antes de incorporar el lector. No confundir pruebas deliberadamente rojas con fallos económicos de producción.
- Batería local de 12 archivos: 250/250 pruebas PASS, 104.65 s. Incluye inventario, 82 sondas de fórmulas, presupuesto binacional, fuente/base propia, clientes Google/SAKBE, conciliación de casetas y perfiles. Después se añadió rechazo de observación futura: se repitió el archivo afectado, 22/22 PASS, 1.11 s. No sumar ambas ejecuciones como si fueran pruebas distintas.
- Typecheck API completo: PASS, repetido después de la última guarda (`npm run typecheck -w freight-cost-api`, salida 0).
- `node docs/reviews/r2-economic-review.mjs --check`: nuevo modo sin escritura; reconstruye revisión, verifica 24 escenarios/88 pins y compara las dos fichas existentes. `--write` conserva creación exclusiva, sin sobrescribirlas. Una invocación sin bandera se rechazó; no se reejecutó con escritura.
- `npm run verify:planning-arithmetic`: acceso repetible al mismo comprobador, no otro motor. No incorporado como falsa certificación económica global.
- Sin pruebas autenticadas, DB, recarga real, APIs de rutas o adopción de precios en este corte. Las lecturas HTTP de EIA no prueban el cron desplegado.
- `git diff --check` del alcance pasa. El global detectó CRLF/trailing whitespace preexistente en tres líneas modificadas de `apps/api/package.json`; no se sobreescribió trabajo anterior para esconderlo. No se declara CI global verde.

## Rollback

Revertir sólo los hunks de `fuel.service.ts` y `fuel.test.ts` de este corte, el modo `--check` de `docs/reviews/r2-economic-review.mjs`, y la nueva entrada `verify:planning-arithmetic` del package raíz. Conservar los cambios R1/R2, archivos excluidos, reportes y demás trabajo previo. No hubo migración ni efecto externo que deshacer. Este tablero puede conservarse como registro histórico; no equivale a un cierre aprobado.

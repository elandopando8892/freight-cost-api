# R2 · entrega de revisión económica

Solicitud: «Continua con el siguiente trabjo», después de recomendar R2. Objetivo:
entregar resultados, inventario, conexión CFU/CVU y límites para aceptación humana.
Checkout D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927,
rama codex/cost-tires-release-s14, HEAD 689432674e65619352318182e2cc05fc97af53d8.
Se conservan todos los cambios R1 y evidencias anteriores; índice intacto.

Responsable Codex/OpenAI, sesión actual; recomendado GPT-6.1 Sol/high. Nativo y
esfuerzo efectivo no observables, sin cambio de modelo. Claude considerado como
alternativa analítica, pero no aporta acceso a evidencia adicional y el encargo
previo está cerrado: cero llamadas nuevas. Cuota/consumo/cargos no observables.
Presupuesto 30 minutos, un análisis local con hasta dos correcciones de formato,
cero inferencias auxiliares, nuevas suscripciones o acceso remoto.

Benchmark proporcional: se revalidaron la entrega de planeación 4-oct, matriz
canónica 3-oct, paquete runtime y 88 pins. Opciones: reutilizar paquete congelado
(elegida, trazabilidad y costo mínimo), reconstruir investigación completa
(ya comprobada en R1, sin necesidad de repetir), refrescar mercado/recalibrar
(cambiaría la población y el alcance de aceptación). No se certifica actualidad
de precios. No hay tecnología, UI ni wireframe nuevos; es una ficha documental.
Skill data:validate-data aplicado para denominadores, dobles conteos, unidades,
comparaciones homogéneas y separación entre cálculo y conclusión económica.

## Entregables y criterio de cierre

[Ficha de decisión con 24 casos y 52 conceptos](../reviews/B4_R2_ECONOMIC_ACCEPTANCE_2026-10-07.md),
[resultados estructurados](../reviews/B4_R2_ECONOMIC_ACCEPTANCE_2026-10-07.json),
y [análisis reproducible](../reviews/r2-economic-review.mjs). El generador usa wx:
no sobrescribe una revisión previa. Para otra revisión se requiere otro destino
deliberado; no borrar evidencias para repetir. No carga ni modifica la app.

Ejecutado: `node docs/reviews/r2-economic-review.mjs --write`, exit 0.
24 casos únicos, 88 hashes íntegros, sumas mensual/CFU/CVU/total y MAX por recurso
verificados con tolerancia 1e-7 USD. 12 parejas contado/financiado mantienen CVU
idéntico y sólo cambian tres partidas de capital. Dos exclusiones permanecen null
con explicación. Compra/venta null, quoteReady false, adoptedValues 0.
No son pruebas de facturas reales, calibración estadística, SQL, UI o producción.

## Conexión de las 13 secciones al modelo

Esta tabla es una guía de lectura, no asignación de valores a los 210 inputs.

| Sección | Función en la referencia | Límite para aceptación |
|---|---|---|
| GENERAL_BASE | Perfil binacional, dos tractores/una caja, alcance y unidades | No es una flotilla real observada ni todos los segmentos operativos |
| COST_CAPITAL | Tres componentes mensuales → CFU | Depreciación económica/interés; contado y financiado son alternativas |
| COST_COMPANY | Administración, tecnología, patios, servicios → CFU | Escala pública y reservas de cargos; no facturas del carrier |
| COST_INSURANCE | Primas/proxies y reservas → CFU | Cobertura territorial, custodia y COI no certificados |
| COST_MAINT | Desgaste/mantenimiento agregado → CVU | Transferencias de población y época; no todos los microinputs del modelo detallado |
| COST_PAYROLL | Nómina administrativa → CFU; operador → CVU | Prestaciones MX transferidas no acreditan un estándar mexicano |
| COST_TIRES | Agregados de desgaste → CVU | No calibra precio por medida, renovado o cohortes operativas |
| FINANCE | FIX de referencia y costo financiero incorporado en capital | No liquidación real ni precio de venta; evitar sumar capital dos veces |
| FUEL | Diésel vial, ralentí y DEF → CVU | Tasas/rendimientos de referencia, no consumos medidos del equipo |
| LABOR | Salarios, descansos, prestaciones y cuota fija | Cuota fija patronal una vez en CFU; componente dependiente de operación en CVU |
| RISK | Se conserva separado del costo productivo | No significa exposición a riesgo nula ni cobertura completa |
| TECHNICAL_MARGIN | Fuera del costo productivo | Política comercial pendiente; no aplicar margen implícito |
| UTILIZATION | km/días productivos y ciclos compatibles → asignación CFU | Hipótesis de utilización; no certificación del itinerario ni jornada |

## Juicio y decisión concreta

La referencia central contiene seis reservas fijas por USD 959.77/mes. Además,
prestaciones, hospedaje y peajes incorporan políticas de planeación descritas.
La aritmética concilia; la evidencia no permite llamar a todos esos valores
costos operativos calibrados. Recomendación: aceptar los resultados únicamente
como comparación pública de planeación del perfil confirmado, manteniendo esas
reservas visibles y sin activar cotización comercial.

R2 tiene la revisión local entregada. La aceptación humana de estos resultados
concretos permanece pendiente; no se infiere del permiso para calcularlos ni del
mensaje «continúa». R1 aún tiene la certificación global con fixture PostgreSQL
pendiente. R3 requiere candidato Web/API del mismo commit y aceptación autenticada;
ninguno queda aprobado automáticamente por la ficha.

Rollback: sólo retirar estos nuevos artefactos si se solicita, preservando todos
los originales y cambios anteriores. Sin commit/push, Auth, DB, infraestructura,
publicación o actualización de valores canónicos en este corte.

# B1 · revisión de suficiencia del piloto D2D

Corte: 29 septiembre 2026, America/Mexico_City. Revisión documental/local; sin refresh integral de precios ni QA remota.

## Dictamen y objetivo preservado

**GO técnico para completar B2 local. NO-GO para calcular/persistir un costo completo del piloto, adoptar valores o salir a producción.** B1/E1 sigue abierto. La revisión entrega una decisión y pendientes concretos, no una certificación económica.

Objetivo: estimar costos de transportistas **terceros** mediante referencias públicas para D2D caja seca T3-S2 MX→US, dos líneas con intercambio y sin transbordo. El sentido inverso conserva las bases nacionales. Costo productivo, compra observada y venta XBF siguen independientes.

Un supuesto modelado puede aceptarse si su fundamento, unidad, alcance, sensibilidad y revisión son explícitos; no necesita convertirse en contabilidad privada ni observación real XBF. La evidencia pública insuficiente no se sustituye por cero o por un rango inventado. No se exige segundo revisor inexistente.

Auditor vigente y conteo independiente del registro concilian: **135/135 claves documentadas; 132 MX, 131 US; 3 candidatos, 47 contrastes, 85 faltantes; cero adoptadas**. 128 compartidas + 4 MX + 3 US = 135. Estos estados miden localización documental, no porcentaje de calibración.

[ADR-007](architecture/ADR-007-public-reference-fixed-productivity.md) propone cobertura por familias al nivel de evidencia pública. [ADR-008](architecture/ADR-008-payroll-capital-economic-contract.md) ya aporta un auditor aislado reutilizable, no un motor integrado. Mantener el método detallado y su inventario; no repartir agregados en microinputs para aparentar cierre.

## Matriz única: 13 secciones + viaje/frontera

Cada fila es una pregunta de suficiencia para ambos tramos. “Faltante” describe el bloque completo, no ausencia de investigación. Se reutilizan expedientes con fechas originales; no se certifica frescura externa de todos sus valores en esta revisión.

| Sección / destino | Evidencia disponible | Decisión actual | Pendiente concreto |
| --- | --- | --- | --- |
| GENERAL_BASE · exposición | [SICT](research/B1_SICT_MX_GENERAL_CARGO_FLEET_EXPOSURE_2026-09-29.md), [IMT](research/B1_IMT_MX_HISTORICAL_PRODUCTIVITY_2026-09-29.md), ADR-008 | Contrastes; perfil/exposición faltantes | Dos fichas: país/equipo/escala, km totales y días-vehículo mensuales. Hipótesis sustentadas y rotuladas; no gasto EAT dividido entre parque SICT. |
| COST_CAPITAL · CFU | [Ofertas](research/B1_PILOT_ASSET_LABOR_EVIDENCE_2026-09-29.md), [vida/residual](research/B1_USED_CAPITAL_LIFECYCLE_2026-09-29.md) | Contrastes; costo capitalizable y asignación faltantes | Por activo: condición, tenencia, costo puesto en servicio, vida restante, residual/interés o renta; responsabilidad del remolque. Cuota/principal no es depreciación. |
| COST_INSURANCE · CFU | [Prima/cobertura](research/B1_INSURANCE_COVERAGE_COST_BRIDGE_2026-09-29.md) | Paquetes/plazos distintos; canasta compatible faltante | Prima del plazo, normalización, cobertura, territorio, activos e intercambio. Requisito legal y deducible no son prima. |
| COST_PAYROLL · CFU | [Roles/salarios](research/B1_MX_US_PAYROLL_ASSET_COMPARATORS_2026-09-29.md), ADR-008 | Contexto; dotación/costo administrativo faltantes | Roles/FTE sustentados o bloque conjunto con corporativo, no ambos. Beneficios incluidos/excluidos explícitos. |
| COST_COMPANY · CFU | [23 pares y overhead](research/B1_OVERHEAD_EXPOSURE_BRIDGE_2026-09-29.md) | Agregados parciales; overhead compatible faltante | Frontera e importe/rango sustentado por país con exposición del mismo periodo/cohorte. No “otros” como residual fijo ni 46 facturas XBF. |
| UTILIZATION · denominadores | IMT/SICT/ATRI; ADR-008 | No consumida como sección; política productiva faltante | Relacionar exposición con cargado/vacío, disponibilidad y ciclo. Empleado-días no son tractor-días; conteo de vacíos no es proporción de km vacíos. |
| LABOR · CVU | [Truckload por tamaño](research/B1_PILOT_ASSET_LABOR_EVIDENCE_2026-09-29.md), [reglas MX](research/B1_MX_DRIVER_EMPLOYER_COST_RULES_2026-09-29.md) | Contrastes; remuneración total aplicable faltante | Pago/beneficios por país y exposición coherente. No carga universal; la Carga Social heredada es administrativa, no del operador/km. |
| FUEL · CVU | [Frescura](C1_B1_FUEL_SOURCE_FRESHNESS_2026-09-29.md), [join estaciones](C1_B1_FUEL_STATION_LOCATION_JOIN_2026-09-29.md) | Precio US candidato regional; MX histórico; rendimientos faltantes | Fecha/lugar/producto y consumo cargado-vacío sustentados. CNE capturado no es precio actual. FX es dependencia, no otro sprint genérico. |
| COST_MAINT · CVU | [IMT→FCM](C1_B1_PUBLIC_METHOD_CROSSWALK_2026-09-29.md), ATRI | 31 contrastes, cero adopciones del piloto | Método detallado o bloque sustentado por equipo/ciclo/país. Partes/labor/lubricantes una vez; excluir llantas si van aparte. |
| COST_TIRES · CVU | IMT→FCM y dossier histórico de llantas | 12 contrastes, cero adopciones del piloto | Configuración/posición, costo instalado, vida/casco/recape o bloque compatible; precios históricos no bastan para costo/km. |
| FINANCE · responsable | [Registro](C1_B1_PARAMETER_SOURCE_REGISTER_2026-09-29.md), ADR-007/008 | FX candidato; financiación operativa faltante | Separar interés de activo, capital de trabajo del carrier y financiación XBF. Exclusión por alcance no equivale a costo observado cero. |
| RISK · línea separada | Dossier de seguros y alcance B0 | No consumida; política pendiente | Responsable y exclusiones/esperas/siniestros; no porcentaje automático ni riesgo escondido en seguro. |
| TECHNICAL_MARGIN · fuera de CFU/CVU | Separación de tres resultados B0/ADR-007 | No consumida; no respalda compra/venta | Mantener margen comercial fuera de costo. Una tarifa privada no es requisito para estimación pública; compra/venta requieren evidencia propia si se ofrecen. |
| Viaje, peajes, frontera/intercambio | [Puente D2D](C1_B1_D2D_ROUTE_EVIDENCE_BRIDGE_2026-09-29.md) | Fuentes localizadas; caso completo faltante | Origen/destino, puente/ejes, km/ciclo y cargo por evento/pagador. Peaje del puente no cubre patio/intercambio; no inventar corredor aprobado. |

**Utilizable ahora:** fuentes/transformaciones para propuestas de referencia, restricciones y contraejemplos locales. **No hay un bloque numérico completo revisado y adoptado para ambos carriers del piloto.** Esto no significa que construirlo con evidencia pública sea imposible.

## Hallazgos prioritarios y remedios

1. **P1 · Granularidad y exposición:** estadísticas agregadas no respaldan reparto en 46 claves corporativas y 14 administrativas. **Propuesta:** completar cobertura por familias de ADR-007 reutilizando ADR-008; conservar método canónico y exclusiones.
2. **P1 · Economía incompleta:** ofertas, salarios, costos viales y seguros tienen fronteras/cohortes/fechas diferentes. **Propuesta:** dos fichas modeladas con valores/rangos sustentados, sensibilidad y revisión explícita. No exigir observación de un carrier privado para una hipótesis pública, ni llamar actual al ejemplo histórico.
3. **P1 · Operación no resuelta:** faltan asignación del remolque, corredor y cargos de intercambio. **Propuesta:** caso de evaluación claramente rotulado, físicamente coherente y con fuentes; confirmar su aplicabilidad antes de aceptación comercial.
4. **P1 · Aceptación pendiente:** pruebas sintéticas no demuestran suficiencia ni sesión operativa. **Propuesta:** recorrido B2→B3 con ausencia honesta; gates E1–E4 sólo con caso revisado, guardado/reapertura y QA real.

No se cambian fórmulas activas: petición de revisión, remedios económicos inciertos quedan propuestos.

## Cobertura honesta

**Needs revision** para el piloto económico; revisión **parcial** respecto a certificación de valores/fuentes vivas, completa para el mapa de preguntas del dossier. Los totales cuentan unidades del alcance; 0/N es ausencia de defectos observados, no N valores calibrados. Categorías superpuestas no se suman ni forman porcentaje.

### Calidad/utilidad del expediente

| Categoría | Defectos observados | Evaluación |
| --- | --- | --- |
| Suficiencia del piloto | 14 / 14 | Las 14 preguntas requieren evidencia/decisión para cerrar el piloto, no representan 14 errores de código. |
| Claridad analítica | 0 / 3 | Alcance, clasificación de evidencia y gates distinguen escenarios y aceptación. |
| Visual/interacción | N/A | Sin cambio UI ni revisión de pantallas. |

### Corrección y robustez

| Categoría | Defectos observados | Evaluación |
| --- | --- | --- |
| Autoridad/aplicabilidad | 0 / 14 | Linaje documental inspeccionado; valores por cohorte no homologados, fuentes externas no refrescadas integralmente. |
| Exactitud de valores | 0 / 2 | Recuento independiente de keys y estados coincide; ningún total monetario certificado. |
| Concordancia dentro de gráficos | N/A | No hay gráficos. |
| Detalles interactivos de fuente | N/A | No hay inspector; matriz con enlaces/límites. |
| Consistencia entre artefactos | 0 / 3 | Inventario, contrato incompleto y separación de precios concilian; conteos inferiores son snapshots históricos. |
| Controles de calidad | 0 / 4 | Ausencia, contraste, periodo y activo compartido cubiertos localmente; no certificación de inputs externos. |
| Soporte de conclusiones | 0 / 3 | GO técnico, NO-GO económico y gates abiertos; no QA autenticada. |

Registro de cobertura auxiliar: `tmp/reviews/b1-sufficiency-20260929/coverage.json`. No es fuente del motor.

## Ruta finita de cierre

No se agregan sprints por cada key, proveedor pagado ni fechas sin capacidad confirmada. Una familia que no pueda sustentarse termina en NO-GO específico, no en búsqueda genérica indefinida.

| Orden / estado | Entregable y criterio de cierre | Responsable / modelo recomendado |
| --- | --- | --- |
| Ahora · B1/B2 local, parcial | Contrato de bloques públicos y libro de cobertura MX/US con fuente, fecha, unidad, rango, frontera y responsable; reutilizar auditor, ensayos incompletos y rechazo de solapes. Sin adopción. | Codex ejecución; XBF decisión económica sobre propuesta concreta. GPT-6.1 Sol · alto. |
| Siguiente · E1→E2, pendiente | Dos fichas sustentadas y caso D2D con CFU/CVU/frontera/sensibilidad conciliados. Adopción/persistencia con autorización puntual del objeto/entorno. | Codex preparación; XBF aprobación de referencia. GPT-6.1 Sol · alto. |
| Después · B3/E3, pendiente | Wireframes MARKSMAN desktop/móvil; seleccionar bases, viaje, calcular, guardar/reabrir benchmark; roles/tenant. Sin fingir compra/venta. | Codex implementación/QA; entorno autorizado. GPT-6.1 Sol · alto. |
| Salida · B4/E4, pendiente | Un candidato Web/API alineado, login/recarga/renovación/denegación reales, demo completa, monitoreo y rollback. Producción autorizada puntualmente. | Codex revisión; XBF autorización de producción. GPT-6.1 Sol · alto. |

B0 definido; B1 insuficiente; B2 parcial local; B3 parcial histórico y pendiente para piloto; B4 pendiente. **0/4 gates completos**, no 0% de desarrollo. Siguiente desarrollo recomendado: cobertura económica por bloques local, no otro índice de FX/overhead. Recomendaciones antiguas múltiples permanecen como historial, no selector actual.

## Evidencia actual y límites

Worktree D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927; rama codex/cost-tires-release-s14; HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd. AGENTS central vacío; el C:\Users\andre\.codex\AGENTS.md indicado ya no existe; no AGENTS adicional API/docs. Cambios previos preservados.

Comprobaciones realizadas en esta revisión:

- Auditor canónico: DOCUMENTATION_RECONCILED, economicStatus=INCOMPLETE, 135/135, 3/47/85, cero adoptadas. Recuento independiente Markdown sin duplicados.
- Plantilla B2: INCOMPLETE, 14 incidencias iniciales por país (28 total), sin contar todas las obligaciones condicionales. Control mensual añadido después de ADR-008 explica aumento desde sus 13 históricas. Valores reales null.
- 201/201 pruebas en ocho archivos y typecheck API aprobados. Pruebas locales, no calibración.
- SHA requisitos: 9c8510de32dbdd8a9a86f99f571f1e41171f683ce005106eeb26fbae1e46001d.
- SHA registro: a31864f52ce5cd3d9f111056ec4dc58181587e99258614f1e2636e61ff992f0a.
- SHA plantilla: cabfda00873356406d838306bfa87b912eccd9a6026449c0ebb26046acd8bd85.
- engine.outputs, benchmark-rates y benchmark-leg sin diff frente a HEAD.
- Registro auxiliar de cobertura validado y 16 enlaces documentales comprobados, sin destinos locales faltantes; diff-check aprobado. Recibo de fuentes generado como evidencia documental, sin certificación de interacción visual.

Sin DB/Neon, Auth/usuarios, infraestructura, adopción, deploy, negocio ni IA de la aplicación. Sin nuevo wireframe porque UI no cambió; permanece obligatorio en B3. No se certifica frescura de todas las fuentes, total económico, autenticación/tenant remoto ni salida a producción.

Rollback: retirar exclusivamente este MD y notas nuevas en plan/status; preservar todos sus cambios anteriores y no revertir archivos completos. Cobertura y recibo de fuentes son auxiliares de revisión; sin rollback externo.

Modelo/esfuerzo: GPT-6.1 Sol · alto para revisión/plan y recomendado único para siguiente contrato local; no se afirma cambio automático del modelo. Las guías de validación/roadmap determinaron cobertura explícita, separación entre suficiencia y pruebas, y priorización por dependencia.


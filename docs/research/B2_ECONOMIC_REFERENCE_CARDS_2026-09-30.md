# B2 · dos fichas económicas parciales MX/US

Corte: 30 sep 2026. Investigación consolidada de expedientes del 29 sep; sin refresh externo de sus precios o reglas. **Entregable de ensamblaje terminado; B2 económico todavía parcial.**

## Resultado de negocio

Cada ficha relaciona las 13 secciones con su destino económico, evidencia nacional, supuesto propuesto, exclusión, faltante y fórmula candidata. Se conserva el piloto: terceros, caja seca, dos líneas D2D con intercambio y sin transbordo. El sentido inverso mantiene las bases nacionales. No se afirma que otros segmentos estén listos.

Ya no hace falta reconstruir el inventario en cada corte. El [registro estructurado](B2_ECONOMIC_REFERENCE_CARDS_2026-09-30.json) fija doce expedientes por SHA-256 y sus referencias internas. Un [ensamblador local](../../apps/api/scripts/assemble-economic-reference-cards.ts) valida el linaje y reutiliza el auditor económico existente. No es otro motor, ruta API ni registro de parámetros adoptados.

**Dos fichas × 13 secciones = 26 filas documentadas, no 26 calibraciones.** Ninguna fila permite ahora un subtotal monetario completo del piloto; los seis outputs de cada país permanecen null. No se suman salarios parciales, precio de oferta, retención bruta y medias sectoriales para aparentar CFU/CVU. Se admiten hipótesis públicas modeladas con fundamento, unidad, frontera, sensibilidad y revisión explícitos; no se exige historia privada XBF ni un segundo revisor inexistente.

## Lectura comparada de las fichas

| Sección → destino | Ficha MX: soporte y límite | Ficha US: soporte y límite | Condición de cierre económico |
| --- | --- | --- | --- |
| GENERAL_BASE → exposición | IMT T3-S2 histórico modelado, no flota actual de caja seca | ATRI nacional, todos sectores, no subcohorte dry van/D2D | Perfil público modelado y exposición del mismo alcance/periodo |
| COST_CAPITAL → CFU | Oferta usada MXN más IVA; A/vida/R neto/interés desconocidos | Oferta usada con ISO no certificada; residual condicionado, no vida/R neto | Capitalizable, residual neto, horizonte e interés o renta alternativa sustentados |
| COST_INSURANCE → CFU | Ejemplo IMT histórico; prima/km impresa no reconcilia | Progressive/ATRI cubren riesgos diferentes | Canasta/territorio/custodia, prima del plazo y normalización una vez |
| COST_PAYROLL → CFU | Siete roles mapeados; FTE/costo patronal no elegidos | Proxies BLS/ECEC no son costo de plantilla del perfil | Detalle por rol o bloque ADMIN+COMPANY compatible, no ambos |
| COST_COMPANY → CFU | EAT agregado nacional, no oficina fija del perfil | Other costs/consolidado carrier no equivalen a overhead | Bloque/familias con inclusiones, exposición y periodo coincidentes |
| UTILIZATION → denominadores | Capacidad utilizada no es km cargado | Días/millas nacionales no completan otro segmento | Ciclo, cargado/vacío y días-vehículo productivos coherentes |
| LABOR → CVU | Pago/km y vales, moneda inferida; encabezado anual conflictivo excluido | ATRI por tamaño, BLS/ECEC/IRS en ramas separadas | Remuneración patronal atribuible, exposición y FX; cargas una vez |
| FUEL → CVU | Captura CNE con observaciones hasta febrero, no precio actual | EIA regional semanal en expediente, no compra carrier | Precio fechable + rendimientos cargado/vacío del equipo/alcance modelado |
| COST_MAINT → CVU | IMT técnico, no tasa actual del perfil | Definición ATRI, no tasa de usado dry van seleccionado | Tasa o detalle por ciclo/equipo; partes/labor/lubes una vez, llantas fuera |
| COST_TIRES → CVU | Contrastes históricos, no costo instalado/vida del perfil | Agregados, no ciclo por posición/carcasa | Configuración, instalación, vida, casco y recape o bloque compatible |
| FINANCE → responsable | FX por fecha; carrier no equivale a financiación XBF | TRAC no es renta pura ni tasa de interés | Separar activo, capital de trabajo carrier y XBF; no cero por ausencia |
| RISK → línea separada | Póliza/deducible no fijan reserva | Siniestros retenidos no son prima | Política y pagador explícitos; no porcentaje tácito en CFU/CVU |
| TECHNICAL_MARGIN → fuera de costo | Costo no es oferta de línea mexicana | Costo no es oferta de línea americana | Mantener compra/venta independientes; política pendiente, sin margen sumado |

Fuentes principales: [perfil/exposición](B2_REFERENCE_PROFILE_EXPOSURE_2026-09-29.md), [adquisición](B2_CAPITAL_ACQUISITION_BRIDGE_2026-09-29.md), [residual y ciclo](B2_USED_RESIDUAL_SHARED_CYCLE_2026-09-29.md), [personal](B2_LABOR_COMPENSATION_BRIDGE_2026-09-29.md), [seguros](B1_INSURANCE_COVERAGE_COST_BRIDGE_2026-09-29.md), [overhead](B1_OVERHEAD_EXPOSURE_BRIDGE_2026-09-29.md), [FUEL](../C1_B1_FUEL_SOURCE_FRESHNESS_2026-09-29.md), [cruce metodológico](../C1_B1_PUBLIC_METHOD_CROSSWALK_2026-09-29.md). Las fechas de origen permanecen en esos expedientes; la consolidación del 30 sep no los convierte en datos actuales.

## Puente al resultado, sin ejecutar costos

Fórmulas candidatas explicativas, no código nuevo integrado al motor:

- Capital propio mensual: `(A_capitalizable - R_neto) / horizonte_restante_meses + interes_mes`. Principal no se suma a depreciación; renta es otra rama, no adición.
- Administración: `sum(FTE * costo_patronal_mes)` o bloque conjunto con corporativo. `WAGES_ONLY` necesita beneficios aparte; `EMPLOYER_TOTAL` no los vuelve a sumar.
- Seguro mensual: prima del plazo / meses del plazo × cantidad. No dividir una prima ya anualizada por un plazo de seis meses.
- CFU de tracto por país: `C_mes * max(km_ciclo / km_productivos_mes, dias_ciclo / dias_vehiculo_productivos_mes)`, con presupuesto y denominadores del mismo alcance. No sumar ambas asignaciones.
- Combustible del viaje: `precio_USD_L * (km_cargados / km_L_cargado + km_vacios / km_L_vacio)`. Ralentí/auxiliar requiere frontera adicional sustentada; no se presume costo cero ni se añade sin aclarar inclusiones.
- CVU: combustible + mantenimiento + llantas + operador + peajes de ruta, con km costeados y fronteras compatibles. Esta ficha no calcula ninguna de esas tasas.

El mismo remolque cargado tiene **un solo ciclo físico** con presupuesto/exposición propios. Primero se asigna su costo por ciclo, después se reportan participaciones acordadas; no se repite el máximo por tramo. Responsable, costo y participaciones siguen desconocidos. Las fichas nacionales son de tracto: no contienen dos remolques completos.

[Viaje/peajes/intercambio](../C1_B1_D2D_ROUTE_EVIDENCE_BRIDGE_2026-09-29.md) permanecen separados. No se seleccionó corredor, puente ni medio de pago. El costo D2D se podrá conciliar sólo con tractos, remolque único y cargos compatibles. Riesgo y precio comercial no se esconden en ese total.

## Ruta finita de cierre: no nuevos sprints por clave

| Orden | Salida pendiente | Criterio verificable |
| --- | --- | --- |
| 1 · siguiente corte | FUEL por país: precio + rendimiento cargado/vacío | Rama pública modelada explícita por equipo/fecha/alcance, transformaciones, inclusiones y sensibilidad; NO-GO específico donde no alcance |
| 2 | Mantenimiento + llantas | Costos exclusivos por km/ciclo sustentados; sin duplicación de labor/lubes/llantas ni reserva como gasto |
| 3 | Fijo, personal, exposición y remolque | Resolver faltantes heredados de capital/beneficios/overhead; presupuesto y exposición coherentes, responsable y ciclo único |
| 4 · E1/E2 | Un caso D2D conciliado | Viaje documentado, CFU/CVU/cargos y sensibilidad por país; adopción/persistencia sólo con autorización puntual |
| 5 · E3/E4 | Recorrido SaaS y salida | Wireframes MARKSMAN, calcular/guardar/reabrir y roles/tenant; Web/API alineados y QA real en entorno autorizado |

Estas cinco salidas agrupan trabajo de B1/B2/B3/B4; **no son cinco sprints nuevos ni una estimación de duración**. El combustible inicia una familia operativa que sigue abierta; no borra los pendientes fijos. No más búsqueda genérica de sueldo, ofertas usadas o FX. Cada investigación terminará en referencia sustentada o NO-GO concreto, no otro índice indefinido.

## Validación y límites

- **275/275 pruebas en diez archivos**, 17 nuevas del ensamblaje. Cubren países, 13 secciones/destinos, fuentes/hash/pointers, cero ficticio, preparación/adopción falsa, linaje del contrato, separación riesgo/margen, remolque y ruta no seleccionados.
- Typecheck API PASS; typecheck explícito del nuevo script PASS (el proyecto API no incluye scripts/tests). Ejecución CLI PASS con salida `2` esperada por resultado económico incompleto: doce fuentes coinciden; auditor previo conserva **48 incidencias** (24 por país), no 48 claves nuevas ni certificado exhaustivo E1.
- Auditor canónico sin deriva: 135/135, 3 candidatos / 47 contrastes / 85 faltantes, cero adoptadas, sin incidencias documentales. Ese conteo no mide calibración.
- [Notebook](B2_ECONOMIC_REFERENCE_CARDS_2026-09-30.ipynb): cuerpo de celda ejecutado completo con Python estándar, hashes/26 filas/outputs comprobados y salida guardada. Kernel Jupyter e inspección renderizada pendientes; no se atribuye ejecución de kernel ni QA visual. No hay cambio UI ni wireframe nuevo.
- Suite general y aceptación autenticada no certificadas por estas pruebas focalizadas. Fuentes externas no refrescadas; cobertura documental no prueba costo vigente, sesión real ni aislamiento remoto.

Estado: B1/E1 abiertos; B2 parcial; **0/4 gates de negocio completos**, no 0% de desarrollo. Ninguna cifra cargada a bases. Sin DB/Neon, Auth, usuarios, infraestructura, deploy, negocio ni IA de la aplicación.

Evidencia de trabajo: D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927; rama `codex/cost-tires-release-s14`; HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. AGENTS central leído vacío; sin instrucciones API/docs adicionales. Cambios previos preservados; motor activo y expedientes anteriores sin edición en este corte.

Rollback: retirar únicamente los tres nuevos artefactos `B2_ECONOMIC_REFERENCE_CARDS_2026-09-30.*`, el nuevo ensamblador y su test; quitar sólo las notas nuevas de este corte en plan/status. No revertir archivos completos que ya tenían cambios. Notebook/recibo son auxiliares locales; no hay rollback externo.

Modelo/esfuerzo recomendado por actividad: GPT-6.1 Sol · alto para conciliación económica, implementación del ensamblaje y revisión; medio para empaquetado documental. Próximo FUEL: **GPT-6.1 Sol · alto**, única recomendación, sin Astra obligatorio ni cambio automático del selector. La guía de análisis de negocio condujo a separar evidencia, hipótesis, exclusiones y ausencias y a priorizar entregables de negocio; no a sustituir calibración con cobertura técnica.

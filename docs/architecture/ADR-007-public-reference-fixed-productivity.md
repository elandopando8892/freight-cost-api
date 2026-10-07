# ADR-007 · base pública de referencia sin confundir costo marginal y CFU

**Estado:** Proposed — decisión técnica/económica recomendada, no activada ni aprobada como calibración.
**Fecha:** 29 sep 2026.
**Decisores:** responsable de producto XBF para alcance y aprobación económica antes de adoptar datos; revisión de implementación en B2. No se exige un segundo revisor inexistente.

## Contexto y objetivo

FCM debe estimar el costo de transportistas terceros con benchmark público, no exigir conocer la contabilidad privada de cada proveedor ni inferir su compra/venta. Una base de referencia describe una operación/equipo y supuestos documentados; no certifica el costo observado de una empresa concreta. El inventario vigente está conciliado pero sus 80 drivers de fijo por país carecen de evidencia suficiente para el piloto.

La estructura actual requiere siete puestos administrativos, 23 pares Qty×PU de gasto corporativo y cinco inputs de productividad. Esa apertura puede funcionar con una fuente desagregada, pero no debe ser el único contrato posible para investigación pública. Fuentes macro no demuestran la cantidad ni el precio de cada microconcepto. Tampoco se permitirá que un agregado de costo total se registre como CFU y se sume de nuevo a CVU.

Este ADR usa [observaciones históricas verificadas](../research/B1_FIXED_PRODUCTIVITY_OBSERVATIONS_2026-09-29.json) y no cambia fórmulas, parámetros, bases ni el alcance del primer piloto D2D.

## Evidencia nueva y sus límites

| Fuente primaria y localizador | Hallazgo útil | Uso defendible / límite |
| --- | --- | --- |
| [ATRI 2025 completo](https://truckingresearch.org/wp-content/uploads/2025/07/ATRI-Operational-Costs-of-Trucking-07-2025.pdf), tablas 8/13, pp.15/18; utilización p.12 | Partidas por milla y exposición anual de 2024 accesibles sin enviar formulario; la región no es el sector ni la cohorte nacional. | Contraste histórico desagregado. No reconstruir depreciación/interés desde pagos de adquisición, ni multiplicar promedios regionales por exposición nacional como observación conjunta. |
| ATRI 2025, figura 27, p.53 | Identifica gastos fuera de sus nueve partidas marginales. | Su total no prueba cobertura completa de nómina no conductora y gasto corporativo del FCM. No fabricar el residual de overhead. |
| [INEGI EAT 2024](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/eat/EAT2024_RR.pdf), cuadro 17 p.14 | Carga general: composición de gastos de bienes/servicios, datos preliminares. | El 44.4% de “otros” no es CFU ni porcentaje de administración. Tampoco tiene por sí solo denominador de km del segmento D2D. |
| [Cuestionario INEGI CEAT2025](https://www.inegi.org.mx/contenidos/programas/eat/2018/doc/CEAT2025.pdf), pp.4–6, 20 | Separa K000 (consumos), J000 (remuneraciones), L000 (fiscales/financieros) y depreciación de activos. K060 mezcla primas de transporte/inmuebles; K833 mezcla infraestructura. | Taxonomía para extraer los futuros agregados MX sin sumar familias dos veces; formulario vacío no equivale a valores de empresas. |
| [Census VIUS211E](https://www2.census.gov/programs-surveys/vius/data/2021/VIUS211E.zip), filtro en JSON | Exposición histórica por tipo/configuración y actividad; flags/CV permiten revisar calidad. | 2021, sin NH, no caja seca transfronteriza. No empatar con costos ATRI 2024 como si fueran la misma muestra. [Definición de unidades](https://api.census.gov/data/2021/viuse/variables.html). |
| [ATRI sample customized report](https://truckingresearch.org/wp-content/uploads/2026/02/sample_customized_yoy_report.pdf) | Enseña cómo presentar cohorte y dispersión. | Rechazar como evidencia numérica de carrier: es un reporte de ejemplo público, no identificación operacional comprobada. |

La disponibilidad del informe **2025** cambia la conclusión previa de acceso restringido a comunicado/formulario para ese año. No se obtuvo el informe completo **2026** y no se atribuyen sus datos de 2025 al PDF anterior. Los costos históricos siguen separados de precio/fecha de un viaje actual.

## Decisión propuesta

**Adaptar el contrato, no sustituir la metodología por un promedio total.** Conservar el método canónico detallado y diseñar en B2 una vía explícita `FCM_PUBLIC_REFERENCE_COMPONENTS_V1`, separada y versionada. Esta vía aceptaría un bloque agregado de una familia cuando su evidencia respalde la frontera del bloque, sin inventar su distribución a microinputs.

Cada bloque debe declarar país/segmento/equipo/tenencia, responsable del costo, período/cohorte, moneda/unidad, método de capital, denominador, qué incluye/excluye, fuente/localizador/hash, transformación y condición de uso. La evidencia puede ser una estadística pública comparable o un supuesto modelado apoyado en ella; el segundo se etiqueta como hipótesis revisada, nunca como observación del proveedor. Una observación puede servir de contexto sin aprobarse para una tasa.

### Frontera económica por bloque

| Bloque | Puente CFU/CVU | Regla antes de producir una estimación completa |
| --- | --- | --- |
| Capital económico | CFU | Elegir depreciación/residual + financiación sustentada **o** un alcance de renta compatible. Un payment benchmark con adquisición/principal no se equipara a depreciación/interés ni se suma a ellos. Métodos diferentes por país requieren conciliación antes del D2D. |
| Primas y cobertura | CFU | Identificar prima recurrente, activos/coberturas y período; separar siniestros/riesgo. No equiparar K060 de todos los bienes a póliza por tractor. |
| Administración + corporativo | CFU | Permitir bloque conjunto sólo con definición sustentada que excluya operador, activos, primas ya contadas, mantenimiento y costos del viaje. Si cubre payroll+company, ambos se cubren una vez; no rellenar roles/Qty×PU. |
| Exposición productiva | Denominadores CFU | Km totales y días productivos por vehículo y período comparables al fijo; incluir vacíos una vez. No inferirlo desde el conteo de empleados o días legales de conducción. |
| Conductor y beneficios | CVU o regla laboral declarada | Alinear costo del empleador y distancia/tiempo; no añadir carga social otra vez a una tasa que ya la incorpora. |
| Mantenimiento / llantas | Dos bloques CVU | Rubros disjuntos y alcance de mano de obra/lubricantes/recape explícito. Un rate agregado no calibra Qty/PU/vida individuales. |
| Combustible y viaje | CVU y cargos específicos | Conservar precios/consumos cargado-vacío por fecha/país. Peajes por ruta y cruce/intercambio independientes; no agregarlos a un total que ya los contiene. |
| Capital de trabajo | Ajuste separado por responsable | `Customer Collection Days`, `Carrier Payment Days` y `Monthly COGS Proxy` actuales tienen origen potencial XBF. No incluir financiación XBF como costo productivo del tercero sin justificar responsable y base; ausencia no equivale a cero. |

No hay parámetros numéricos de capital/administración nuevos ni número arbitrario de tractores. Si sólo hay un costo público por milla, se mantiene como contraste de magnitud sin salida CFU por tiempo. Si falta un bloque requerido, el resultado es incompleto aunque existan varios contrastes parciales.

### Contrato y asignación propuestos, no implementados

```text
methodId / revision / referenceProfile (country, mode, equipment, assetScope)
component: economicFamily, coveredFamilies[], costBearer, costBasis,
           amountOrRange?, originalCurrency/unit, normalizedUnit,
           period, cohort, exposureBasis?, inclusion/exclusion,
           sourceId, locator, sourceHash, transformation, limitation,
           state = MISSING | PUBLIC_CONTRAST | MODELED_ASSUMPTION | REVIEWED_REFERENCE
```

`REVIEWED_REFERENCE` requerirá revisión de la cifra y transformación, no una etiqueta que el cliente pueda autoasignarse. Las familias no pueden solaparse entre componentes aceptados. Metadata suficiente no garantiza comparabilidad; una regla de cobertura no reemplaza revisión económica.

Cuando las fronteras y denominadores estén sustentados en unidades compatibles:

```text
F_veh_mes = capital + primas + overhead_administrativo
           + ajustes_financieros_del_carrier_que_correspondan
CFU_tramo = max(km_totales × F_veh_mes / km_veh_mes,
                días_ciclo × F_veh_mes / días_veh_mes)
CVU_tramo = combustible + mantenimiento + llantas + operador + peajes_ruta
```

Son relaciones propuestas sobre exposición por vehículo; **no** autorización para obtener `F_veh_mes` de una tasa marginal mezclada. No aplicar floor temporal si no se conocen ambos denominadores. El total de referencia no es precio de compra ni venta.

## Opciones consideradas

| Opción | Complejidad / trabajo | Evidencia y utilidad | Dictamen |
| --- | --- | --- | --- |
| A · Sólo 80 microdrivers canónicos | Código existente; investigación alta | Necesita apertura para cantidades/precios/roles. Mantiene capacidad detallada sin fabricar evidencia. | Conservar cuando exista soporte; no obligar a que todo agregado público se descomponga. |
| B · Total ATRI/IMT como CFU | Implementación corta | Mezcla costos, métodos y familias; omite overhead o duplica CVU. | Rechazar. |
| C · Bloques públicos/hipótesis revisadas, versionados | Adaptación acotada de contrato/lineage y pruebas en B2; sin proveedor nuevo | Permite conciliar el nivel real de evidencia y mantener faltantes honestos. No resuelve por sí sola la falta de importes MX o overhead. | Recomendada, Proposed. |

## Consecuencias y salida pendiente

La matriz canónica de 135 keys permanece vigente para su método: no reclasificar sus 87 faltantes por encontrar bloques de otra granularidad. Un método nuevo debe llevar su propio inventario de cobertura por familia y no fingir que calibró 210 parámetros. Las 13 secciones permanecen visibles; falta de consumo actual de RISK/TECHNICAL_MARGIN/UTILIZATION no es certificación.

La revisión metodológica de este corte queda entregada. **B1/E1 siguen abiertos**: faltan una ficha económica MX cuantificada con denominadores, overhead comparable, base de capital alineada MX/US y condiciones del piloto. B2 puede diseñar el contrato local, pero no activar una base ni calcular un total defendible antes de suficiencia.

Acciones concretas, sin abrir sprints nuevos:

1. [ ] Extraer tabulados públicos EAT de carga general: remuneraciones, gastos por familia, depreciación/tenencia y parque/km, verificando que tengan el mismo año/población. Una variable en el cuestionario no demuestra disponibilidad pública del dato.
2. [ ] Fijar qué perfil de referencia puede sustentarse y delimitar el bloque overhead; si no existe apertura, presentar el faltante y alternativa sustentable sin usar cero ni residual arbitrario.
3. [ ] Diseñar/validar `FCM_PUBLIC_REFERENCE_COMPONENTS_V1` con contraejemplos de solape, pago vs depreciación, país/cohorte y ausencia de exposición. Mantenerlo separado del método canónico y de datos activos.
4. [ ] Revisar suficiencia del piloto y sólo después autorizar incorporación de valores al objeto/entorno concretos.

## Evidencia de ejecución y rollback

Checkout D: `cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD previo `4f5fc2de0c3d178dace917231e1092040dec21fd`. Archivos/hash/localizadores en el JSON de investigación; PDF revisados con extracción y lectura visual de tablas ATRI 13/18 y cuadro EAT 17. VIUS se extrajo del DAT delimitado por `|`, no API con credencial. Comprobación aritmética ATRI regional: diferencia de redondeo 0.001 USD/milla; no es un cálculo de viaje. No hubo formularios enviados, credenciales, consultas de DB, consumo IA del producto ni operaciones de negocio.

Se conservó el worktree sucio. Sólo documentos/research JSON y sus enlaces cambian; sin UI (no requiere wireframe), motor, datos gobernados, usuarios, Auth, DB, infraestructura o despliegue. Auditor canónico antes/después debe permanecer en 135/135, 3/45/87 y cero adoptados; no se reclama QA económica completa ni autenticación remota.

Validación final realizada: JSON válido; cinco hashes de las descargas contrastados; cuatro grupos de observación; suma/total ATRI con redondeo conservado; porcentajes EAT suman 100 dentro de su propio denominador; fila VIUS única y valores/flags/CV idénticos al DAT. El auditor canónico posterior quedó `DOCUMENTATION_RECONCILED`, `economicStatus=INCOMPLETE`, 135/135, 3/45/87, cero adoptados y el mismo hash de dependencias `9c8510de32dbdd8a9a86f99f571f1e41171f683ce005106eeb26fbae1e46001d`. `git diff --check` aprobado. No se repitió la suite de aplicación porque no hubo código ejecutable modificado en este corte; las 104 pruebas corresponden al corte anterior, no a una validación económica nueva.

Rollback: retirar este ADR y el JSON nuevos, y quitar exclusivamente las referencias de este corte en plan/estado/comparación de método; conservar cambios previos. Las fuentes descargadas para inspección son auxiliares, no bases persistidas.

Tras validar, los cinco archivos fuente temporales y cuatro renders se retiran de la carpeta acotada `tmp/pdfs/b1-fixed-productivity-20260929`; quedan las observaciones, enlaces, filtros y hashes permanentes. Son descargas públicas recuperables desde sus URLs (volver a contrastar hash por posibles revisiones), no documentos originales del usuario.

Modelo recomendado: GPT-6.1 Sol · alto para método y contrato; GPT-6 Luna · alto para siguiente extracción EAT. Astra · alto sólo si la revisión de fronteras/capital requiere una decisión adicional no resuelta. Las guías de arquitectura/documentación dieron la estructura Proposed/opciones/acción/rollback; la guía PDF exigió revisar las tablas visualmente. No se cambió el selector del chat.

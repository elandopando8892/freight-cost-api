# B2 · Consolidación fijo, exposición y remolque

## Entregable y decisión

Se reúnen las fichas nacionales MX/US, sus faltantes de fijo/financiamiento, denominadores, operador y los últimos cortes FUEL y mantenimiento/llantas en **un handoff local reproducible**. El manifiesto `B2_FIXED_EXPOSURE_TRAILER_CONSOLIDATION_2026-09-30.json` fija tres expedientes principales; el consolidado comprueba también sus dependencias documentales: 17 archivos locales únicos. Reutiliza el ensamblador y auditor existentes, no crea otro motor de precios ni evalúa las fórmulas explicativas.

**Consolidación terminada; cierre económico NO-GO.** No existe un presupuesto fijo mensual sustentado del mismo perfil/periodo/alcance que sus km y días productivos. El remolque tampoco tiene responsable, presupuesto, exposición y reparto seleccionados. Los importes, CFU/CVU, compra y venta siguen `null`, nunca cero. B1/E1 abiertos, B2 parcial, cero adopciones y 0/4 gates de negocio completos. La guía de análisis de negocio influyó en esta separación: tener un documento o una fórmula no acredita aptitud económica para cotizar.

Este corte no vuelve a investigar precios genéricos ni actualiza fuentes externas. Los hashes acreditan bytes locales, **no vigencia de las páginas públicas**, exactitud del benchmark ni aceptación operativa. No se le exige al usuario información privada de XBF: se mantiene el alcance de fuentes públicas y supuestos de referencia explícitos.

## Qué queda relacionado por país

Cada ficha conserva cinco secciones de fijo/financiamiento (`COST_CAPITAL`, `COST_INSURANCE`, `COST_PAYROLL`, `COST_COMPANY`, `FINANCE`), dos de exposición (`GENERAL_BASE`, `UTILIZATION`) y operador `LABOR` separado en CVU. FINANCE conserva su destino explícito: no se añade automáticamente al CFU. Las restantes secciones continúan documentadas en el ensamblaje original de 13 secciones por país; riesgo y margen no se convierten en costo productivo por este corte.

| Relación | MX | US | Condición antes de un importe piloto |
| --- | --- | --- | --- |
| Perfil/exposición | IMT PT260: escenario histórico T3-S2, no cohorte caja seca D2D confirmada | ATRI nacional 2024, no subconjunto usado/propio/caja seca/intercambio | Presupuesto y denominadores comparables, con unidad/periodo/alcance explícitos |
| Tracto/capital | Oferta usada no es adquisición capitalizable; residual/vida restante sin calibrar | Oferta usada y escenario histórico de retención bruta, no residual neto ni vida restante | Adquisición puesta en servicio, horizonte restante, residual neto, tenencia/financiamiento |
| Administración/corporativo | FTE y bloque corporativo no seleccionados | Agregados sectoriales y consolidados no identifican el fijo completo de esta cohorte | Método por roles **o** bloque combinado, sin solapes ni reparto Qty/PU inventado |
| Seguro | Canasta/territorio/intercambio/plazo no resueltos | Canastas públicas diferentes, no sumables como una prima universal | Prima del plazo y tratamiento mensual consistentes, cobertura/custodia identificadas |
| CVU | Operador, precio/rendimiento y mantenimiento/llantas permanecen parciales | Mismos bloques con sus propias fuentes nacionales | Costo patronal, cargado/vacío y fronteras tracto/remolque aplicables |

No se infiere una flota real de un tracto por usar la unidad «tracto equivalente». Tampoco se divide un gasto agregado nacional por exposición de otra población. Una media anual dividida entre doce no equivale a un mes calendario observado.

## Remolque y doble conteo

El piloto es una caja seca física intercambiada entre dos transportistas, sin transbordo. Las opciones documentadas `MX_PROVIDES`, `US_PROVIDES` y `AGREED_POOL` siguen **no seleccionadas**. El responsable es un supuesto operativo del caso que se debe declarar y justificar, no una cifra que se obtiene de un índice público; declarar una política modelada tampoco demuestra propiedad real.

Reutilizar `benchmark-shared-trailer.ts::calculateSharedTrailer`: calcular una vez el ciclo completo con presupuesto/exposición propios, incluyendo vacío y permanencias pertinentes, y después atribuir participaciones documentadas. No volver a ejecutar `max` por cada participación ni sumar dos tarifas compuestas tracto+remolque. No se impone 50/50, no se traslada el stress sintético del expediente anterior a las fichas y no se presume remolque gratuito.

Para el fijo del tracto, distancia/tiempo son bases alternativas del asignador existente `max`, no dos costos sumables. Nómina administrativa y overhead combinado no se agregan para los mismos gastos; costo patronal total no recibe los beneficios nuevamente. La ambigüedad heredada de seguro anual/plazo no se certifica corregida: su normalización sigue pendiente y el motor activo no se modificó.

## Handoff finito hacia el caso D2D

Estos son **siete paquetes de faltantes**, no siete sprints nuevos ni siete gates adicionales. Cada paquete puede cerrarse con fuentes públicas compatibles y supuestos de planificación explícitos, o quedar identificado como no sustentado. No corresponde reemplazar faltantes por promedios ajenos para declarar el cálculo completo.

| Paquete | Salida exigida para el caso |
| --- | --- |
| Perfil + fijo + exposición | País/cohorte/activo/periodo/moneda comunes y presupuesto con km y días-vehículo compatibles; distinguir escenario modelado de observación |
| Capital + financiamiento | Adquisición capitalizable, horizonte, residual neto y rama de tenencia con inclusiones |
| Administración + overhead | Método excluyente sustentado, costo patronal e inclusiones corporativas |
| Seguro | Paquete de cobertura, custodia, prima/plazo y puente mensual sin doble anualización |
| Remolque compartido | Responsable declarado, presupuesto/exposición propios, ciclo físico y política de reparto |
| Operador + FUEL + mantenimiento/llantas | Tasas aplicables por país, unidad y fecha; cargado/vacío y activos exclusivos |
| Viaje + frontera | Ruta/intercambio, distancias/tiempos/ciclo, peajes/cargos y exclusiones con evidencia |

**Siguiente actividad única: caso D2D de aptitud y handoff.** Conectar estas fichas al contrato/compositor existente para mostrar por tramo y remolque qué impide calcular; no crear otro catálogo. Las bases nacionales se mantienen al invertir el sentido. Si faltan tasas o ruta/ciclo sustentados, el resultado sigue `INCOMPLETE`, sin total monetario. Un caso de aptitud no cierra E1/E2. Después viene el recorrido SaaS con wireframes MARKSMAN y candidato autorizado; guardar/adoptar/desplegar necesita el alcance y permiso específicos correspondientes.

## Reproducción y límites de QA

Desde el worktree de D:, usando el Node configurado y `node_modules/tsx/dist/cli.mjs`:

```text
apps/api/scripts/consolidate-fixed-exposure-trailer.ts docs/research/B2_FIXED_EXPOSURE_TRAILER_CONSOLIDATION_2026-09-30.json
```

El CLI imprime las fichas y devuelve **2 esperado** por NO-GO económico; errores de integridad/esquema devuelven 1. Es un auditor del snapshot pendiente, no un endpoint de cálculo ni un contrato que habilite adoptar nuevas cifras por cambiar el JSON. Revalidar expediente/método antes de cualquier adopción.

QA de este corte: **360/360 pruebas focalizadas en 14 archivos**, incluyendo 25 nuevas de integración documental, identidad nacional independiente del orden, hash/linaje, rechazo de readiness declarada, cero como faltante, fleet-size-one, reparto inventado, tarifas compuestas y falsa corrección del seguro. Typecheck del API y script, auditor canónico y `git diff --check` aprobados; sin whitespace final en los cuatro archivos nuevos. Primer intento del CLI detectó un hash de mantenimiento mal transcrito; corregido con el SHA-256 real del archivo, sin alterar la fuente, y ejecución final devolvió 2 esperado.

No se probó en este corte login, sesión, flujo autenticado, persistencia real, ruta externa, precios vigentes ni funcionamiento de producción. No se certifica la suite general; el snapshot antiguo de metadatos fronterizos documentado en cortes previos no fue reparado por esta consolidación. Inventario canónico reejecutado: 135/135 documentadas, 3 candidatas, 47 contrastes, 85 sin evidencia suficiente, cero adoptadas. El auditor económico anterior conserva 48 incidencias y `INCOMPLETE`; no se elimina deuda para mejorar el conteo.

## Entorno, seguridad y rollback

Trabajo: `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD base `4f5fc2de0c3d178dace917231e1092040dec21fd`. Worktrees verificados antes de editar; cambios tracked/untracked anteriores preservados. No commits, push ni despliegue. No modificaciones a motor activo, UI, Neon/DB, Auth, usuarios, infraestructura, operaciones de negocio o IA de aplicación.

Rollback acotado, **sin ejecutarlo**: retirar sólo el nuevo script `consolidate-fixed-exposure-trailer.ts`, su test `benchmark-fixed-exposure-trailer.test.ts`, manifiesto y este documento; quitar únicamente los párrafos de este corte añadidos al plan/estado. No restaurar documentos completos ni borrar el directorio de investigación: contienen trabajo anterior. No hay datos externos que revertir.

Modelo recomendado único para consolidación, revisión económica e integración local: **GPT-6.1 Sol · alto**. Es recomendación, no afirmación de haber cambiado el selector. No se pidió Astra ni se delegó a agentes.

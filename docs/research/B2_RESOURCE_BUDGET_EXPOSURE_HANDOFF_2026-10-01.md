# B2 · puente de presupuesto, capacidad y ciclo por recurso

Corte local 2026-10-01. **Puente desarrollado y probado; presupuesto y estimación del caso aún incompletos.**

## Antes y ahora

Antes, el conciliador distribuía el presupuesto mensual entre tres recursos, pero el reporte no enlazaba ese resultado a un contrato conjunto de cantidades, kilómetros, días productivos y ciclo. Ahora una función de investigación reutiliza ese conciliador, el revisor de fases de caja y el asignador `MAX(distancia, tiempo)`. No sustituye el motor ni crea otro servicio.

El puente comprueba ámbito de flota, grupo, perfil, periodo, unidades y referencias. Normaliza simultáneamente costo, kilómetros y días por la misma cantidad de activos. Una declaración compatible permite un **escenario aritmético**, no certifica autenticidad del dato ni calibración.

## Revisión previa, definición y alternativas

Se inspeccionaron historial, conciliador, compositor de activos propios, contrato de remolque y fases, fórmulas y pruebas existentes. Se reutilizan los expedientes públicos fijados en el reporte: presupuestos, exposición histórica y componentes recientes. No se incorporaron nuevas observaciones monetarias ni se actualizó su vigencia. Dos intentos de acceso a páginas ATRI no fueron accesibles: no se sustituyó el informe archivado ni se atribuyó actualización externa a este corte.

| Alternativa | Ajuste y decisión |
| --- | --- |
| Presupuesto de toda una flota dividido por exposición de un vehículo | Rechazada: ámbito inconsistente, posible sobreasignación; no se corrige con un porcentaje arbitrario. |
| Presupuesto/exposición del mismo recurso y cohorte, normalizados conjuntamente | Adoptada para investigación local: reutiliza contratos y cálculo existente, sin dependencias, cargos o infraestructura nuevos. |
| Nuevo motor o suma de distancia y tiempo | Rechazada: duplica reglas o asignaciones del mismo costo fijo. |

Objetivo: transformar un presupuesto compatible en asignación fija por recurso y ciclo, con trazabilidad. Flujo: completar importes y reparto → declarar capacidad/exposición compatible → describir ciclos propios y fases de caja → revisar cálculo y condiciones. Cierre de este puente: cálculo sintético completo, conservación del fondo, invariancia al escalar flota/costos/exposición, fallos controlados y caso real sin resultado inventado.

## Qué unidad alimenta cada fórmula

Para recurso `r`, cantidad de su cohorte `N_r`, costo fijo mensual de esa cohorte `C_r`, distancia mensual total `Q_r` y días productivos totales de activos `P_r`:

```text
C_activo = C_r / N_r
Q_activo = Q_r / N_r
P_activo = P_r / N_r

CFU_r = MAX(C_r * km_ciclo_r / Q_r,
            C_r * días_ciclo_r / P_r)
      = C_activo * MAX(km_ciclo_r / Q_activo,
                      días_ciclo_r / P_activo)

CFU_D2D = CFU_MX + CFU_US + CFU_caja
```

El fondo compartido ya debe estar distribuido una sola vez por el conciliador. El puente **no elige ni recalcula porcentajes** del grupo. Cantidades y exposición no se estiman a partir de un precio unitario administrativo.

La capacidad máxima comprobada es `N_r × días reales del mes`, incluyendo febrero bisiesto. Días de calendario son un techo físico, **no un valor productivo por defecto**. Promedios anuales divididos entre doce y horas ideales de conducción no se renombran como exposición mensual/ciclo compatibles.

Dos tractores y una caja en un servicio no significan que una empresa sólo tenga dos tractores y una caja. El manifiesto conserva los conteos físicos elegidos por el usuario y deja las cantidades de flota desconocidas.

## La caja tiene su propio ciclo

Se reutiliza la partición serial `adherida_MX + frontera_sin_tractor + adherida_US`. Las fases adheridas no pueden superar los ciclos de sus tractores; el ciclo de caja debe cubrir esa suma. Las identidades físicas y referencias deben coincidir. Un tractor MX puede continuar su retorno sin caja; ese retorno no se copia a los días de caja.

Distancia total de cada recurso no puede ser inferior a su distancia cargada. La caja debe cubrir las distancias cargadas de las fases nacionales, pero **no hereda automáticamente todos los vacíos/retornos de ambos tractores**. No se añadió un cruce, espera, consumo o costo de drayage sin evidencia.

## Pruebas y lectura real

35 pruebas nuevas cubren: escala coherente de cantidades/costos/denominadores; conservación del grupo; `MAX` y no suma; caja única; capacidades de mes; distancias/fases; grupo/perfil/periodo; referencias vencidas/futuras/desconocidas/duplicadas; unidades incompatibles; datos nulos; reparto duplicado; desbordamiento y flags de aceptación rechazados.

**147/147 pruebas dirigidas en cinco suites** después de la última modificación. Typecheck estricto de helper, consolidación y suites afectadas PASS. La estrategia de pruebas se enfocó en riesgos económicos y fronteras del dato; no se repitió un build web sin cambios de UI.

Fixture puramente sintético, no benchmark ni ruta real: presupuesto de prueba USD 1,000/mes, repartido 360/330/310 por recurso; capacidad/ciclos también inventados exclusivamente en tests. El puente devuelve asignación fija 7.20 + 9.90 + 11.625 = 28.725 USD. Al triplicar conjuntamente fondo, cantidades, km y días mensuales, la asignación por servicio no cambia. **Estos importes no se guardan en bases ni se usan en el caso DF–Fort Smith.**

Lectura del CLI con manifiestos documentales: 13 JSON fijados por SHA-256, presupuesto con 15 condiciones originales y puente conjunto con **41 condiciones**, estado `INCOMPLETE`, asignación fija/costos productivos/precio nulos, cero adopciones. Código de salida **2 esperado por datos incompletos**, no error de ejecución. Las 41 condiciones son controles de inputs repetidos por recurso, no 41 sprints ni un porcentaje de avance.

El manifiesto nuevo `B2_RESOURCE_BUDGET_EXPOSURE_HANDOFF_2026-10-01.json` tiene SHA-256 `601717e1cd49dce33fb645b03ec57564b7858f69878500ce5a306250ebc74cf7`. No altera los 12 expedientes fijados anteriores ni el worksheet. El helper sólo lee entradas; el CLI es offline, sin DB/red/adopción. No nuevo endpoint, integración al formulario, persistencia, ejecución de negocio o aceptación SaaS.

## Cuatro entregables de cierre, sin ampliar la cola

| Entregable pendiente | Criterio de cierre | Dependencia y modelo recomendado |
| --- | --- | --- |
| Presupuesto fijo compatible | Diez partidas completas: capital, seguros, permisos y overhead; moneda/periodo/perfil documentados; fondo del grupo conservado | Evidencia pública y supuestos económicos explícitos; Sol 6.1 alto |
| Capacidad por recurso | Tres cantidades de cohorte, km y días productivos del mismo ámbito/periodo, sin adoptar automáticamente históricos | Tamaño/ámbito del modelo público y productividad respaldados; Sol 6.1 alto |
| Ciclo DF–Fort Smith | Fecha, distancias cargadas/vacías, retornos y fases de la caja compatibles; asignación fija del caso calculable | Los dos anteriores; Sol 6.1 alto |
| Variables y piloto usable | CVU completo, políticas separadas de finance/risk/margen y recorrido SaaS con resultado trazable | Cálculo integrado; Sol 6.1 alto economía, medio implementación/QA; wireframe MARKSMAN antes de UI |

El siguiente trabajo debe completar inputs de estos entregables, no otro revisor genérico, investigación FX/Auth o requisitos privados. El puente local está terminado; B2 económico y MVP no lo están. No se requiere decisión nueva para este desarrollo local; fecha y ámbitos del modelo siguen como entradas pendientes, no inferidas de la fecha del corte. Selector no comprobado/cambiado; tokens y precios no medidos.

## Límites y rollback

Worktree `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Se inspeccionaron topología y cambios antes de editar; trabajo previo/ajeno conservado. No rama, commit, PR, preview, despliegue, Auth, Neon/DB, usuarios o infraestructura modificados. No consumo de APIs de negocio o IA de aplicación.

Rollback selectivo: retirar sólo helper `reference-budget-exposure.ts`, su nueva suite y nuevo manifiesto/MD; quitar import, pin y bloque de proyección añadidos al consolidado, más las dos entradas nuevas de cronología. Mantener todas las demás modificaciones y los expedientes anteriores; no reset, checkout de archivos completos o borrado amplio. No rollback ejecutado ni efecto externo que deshacer.

# B2 — integración del presupuesto fijo público

Corte observado: 2026-10-03 UTC. Trabajo local, sin adopción ni publicación.

## Objetivo y alcance

Validar inventario → evidencia pública → supuesto económico → presupuesto por recurso → asignación de costo fijo. El caso sigue siendo México DF–Fort Smith, vía Puente III, caja seca 53′ y relevo propio MX/US conservando una caja. No se investiga cada caseta ni se utiliza esa investigación como condición para validar el modelo. Distancia, tiempo, peajes y servicios del viaje son entradas separadas; siguen siendo necesarios para una estimación completa, no para demostrar cada fórmula.

Este corte consolida componentes que ya estaban calculados en dossiers posteriores, pero no incorporados al presupuesto histórico. No demuestra que las 135 claves del inventario estén calibradas ni que sus 13 secciones estén cerradas. La conciliación del inventario permanece en `B2_MODEL_INVENTORY_RECONCILIATION_2026-10-03.md`.

## Reutilización y decisión

| Alternativa | Evidencia y decisión |
| --- | --- |
| Adoptar directamente el presupuesto histórico | Se conserva su identidad y linaje, pero contiene casillas sin importe y un pool administrativo combinado aún vacío. Insuficiente como presupuesto final. |
| Adaptar el presupuesto existente con componentes públicos ya calculados | Elegida: usa el mismo esquema, auditor, reparto de centavos y asignador CFU. Copia el presupuesto y ensambla componentes sin modificar su origen. |
| Crear otro motor o introducir una base externa | Rechazada: duplicaría contratos y cálculo sin resolver representatividad ni obligaciones pendientes. Sin nuevas dependencias o infraestructura. |

No hay cambio de interfaz; no aplica un wireframe nuevo. Se conserva la dirección visual vigente. El flujo de este corte es seleccionar explícitamente las hipótesis → ensamblar → auditar → consultar resultados parciales y faltantes, sin guardar ni publicar.

## Resultado reproducible

Entrada explícita del ejemplo: contado, `NET_PLUS_VAT`, seguro físico de caja `PUBLIC_GUIDE_LOW`, patio MX `NET_PLUS_VAT_RESERVE`, sin alternativa financiada. No existen opciones por defecto ni aprobación implícita.

| Recurso | Componentes fijos conocidos, USD/mes |
| --- | ---: |
| Tractor MX | 3,807.58 |
| Tractor US | 3,723.66 |
| Una caja compartida | 437.63 |
| Total de componentes conocidos | 7,968.87 |

32 renglones: 26 con componentes calculados y 6 remanentes sin importe. Capital, seguros conocidos, administración, servicios y componentes de cumplimiento conservan fuente, perfil, periodo y derivación. El pool administrativo de 3,020.22 se reparte una vez entre los tractores; la caja no recibe una duplicación del pool. Suscripción TMS, comunicaciones y equipos se identifican por separado. La financiación sustituye los tres componentes de capital, no suma contado más crédito ni cuotas completas del préstamo.

Los componentes se redondean una vez a centavos mensuales y los repartos conservan exactamente el total. La fecha de ensamblaje no sustituye los periodos originales de las fuentes: no se afirma que cada precio haya sido actualizado el 3 de octubre.

Con las exposiciones productivas ya auditadas, la función vigente `MAX(asignación por distancia, asignación por tiempo)` produce:

| Ciclo | Asignación de componentes fijos conocidos, USD |
| --- | ---: |
| Vacío de red | 977.5214606060725 |
| Retorno vacío dedicado | 2,224.693428106686 |

Estos importes **no son CFU completo, costo completo del viaje, tarifa de compra, precio de venta ni límite inferior certificado**. Las hipótesis de capacidad y utilización siguen siendo referencias públicas, no operación observada de XBF. `fullMonthlyBudgetUsd`, `fullCfuUsd`, `fullCvuUsd` y `fullPilotCostUsd` permanecen nulos; `calibrated=false`, `quoteReady=false`, `adoptedValues=0`.

## Faltantes económicos, no nuevos proyectos

1. Remanente de permisos del tractor MX.
2. Remanente de permisos del tractor US, más allá de los componentes IRP/UCR/HVUT ya separados.
3. Remanente de permisos de la caja, más allá del componente de renovación ya separado.
4. Cobertura territorial adicional del tractor MX; el componente doméstico no la acredita.
5. Cobertura territorial/custodia adicional de la caja; una guía de daño físico no acredita una póliza binacional completa.
6. Impuestos, activación o instalación pendientes de los servicios seleccionados, sin duplicar instalación ya incluida.

Son remanentes explícitos, no ceros ni cargos adicionales automáticamente aplicables. Su cierre admite hipótesis públicas documentadas y sensibilidades cuando sean pertinentes; no exige inventar cotizaciones privadas ni solicitar libros internos para este benchmark. Debe justificarse cada inclusión/exclusión antes de consolidar el total completo.

La revisión pública acotada encontró periodicidad de inspección físico-mecánica en la [NOM-068, apartados 5.3.2.4 y 5.3.4](https://sidof.segob.gob.mx/notas/docFuente/5378852), no una tarifa vigente. El intento de abrir la página oficial de expedición de permisos no devolvió contenido utilizable; no se adoptó una tarifa nueva. Tampoco se declaró leído el PDF del programa 2026 encontrado en búsqueda. Esta revisión no es dictamen de cumplimiento de vehículos concretos.

## Criterios y verificación

- Mismos contratos y 79 archivos de fuentes fijados que el consolidado existente; sin modificar el presupuesto upstream.
- Una caja, administración cobrada una vez, alternativas no sumadas y capital financiado por sustitución.
- Faltantes nulos y estado `INCOMPLETE`; únicamente incidencias de importe pendiente, no errores de contrato.
- Pruebas de conservación, dos tratamientos fiscales, sensibilidad de seguro/patio, financiación compatible, asignación de ambos ciclos e identidad de fuentes.
- Rechazo de entradas adicionales, selección ausente, financiación incompatible, sobrescrituras y fuentes monetarias faltantes.

Validación final local: 23 pruebas en dos archivos (12 de integración mensual y 11 de conciliación del inventario); TypeScript estricto dirigido; CLI real con el escenario explícito, salida 2 esperada por incompletitud y lectura de vuelta de totales y seis pendientes. No se ejecutó nuevamente toda la suite del repositorio. Las fuentes públicas no constituyen calibración operativa observada. Sin evidencia nueva de persistencia, sesión autenticada, preview, producción o aceptación comercial.

## Ejecución y consumo

Responsable/escritor: Codex. Elección humana previa: `gpt-6.1-sol`, esfuerzo `high` (2026-10-02T16:46:22Z). El modelo/esfuerzo principal efectivamente servido no es observable en esta superficie; no se afirma haberlo cambiado. No se invocaron Claude, Fable, API de IA ni subagentes.

Lectura automática de cuota Codex durante este corte del 2026-10-03 UTC: uso semanal 13%, reposición Unix 1791580450, plan Pro y uso ordinario permitido; ventana de cinco horas sin dato. No se conservó la hora exacta de esa lectura. Claude/Fable: capacidad desconocida, sin llamadas. No se transforman estos datos en tokens, dólares ni garantía de disponibilidad. Consumo de tokens del corte no observado; no se activó uso adicional ni créditos.

Presupuesto global humano: 240 horas; esta autorización no cambia permisos externos. Contrato acotado: máximo 80 pasos, 6,500 bytes de contexto auxiliar, cero reintentos de proveedor, máximo dos reparaciones locales diagnosticadas; ninguna reparación por fallo de prueba en este corte. Reserva no cuantificable con la evidencia de cuotas disponible. Parada ante ampliación de alcance, ausencia de evidencia monetaria o incompatibilidad de contrato, sin encadenar llamadas para resolver falta de datos.

Registro de ejecución: `public-monthly-budget-assembly.json`, proyecto `freight-cost-model`, sprint `b2-closure-240h-20261002`, lease `bd2bc38a7d3e4b5d92a2f1409da9dd7f`. La recepción del modelo principal sigue desconocida; esa limitación del registro no equivale a bloqueo del objetivo B2.

## Recuperación y siguiente paso

Rama revalidada `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, checkout físico en D:. Se preservaron todos los cambios preexistentes. Este corte añade únicamente el compositor, su prueba y este documento. Rollback: retirar esos tres archivos nuevos después de verificar que no contienen cambios posteriores; no restaurar ni borrar el trabajo ajeno.

Antes había componentes documentados dispersos y casillas sin conexión al presupuesto; ahora están ensamblados y su asignación fija puede reproducirse. Falta resolver los remanentes económicos y conciliar los componentes variables del inventario para producir una estimación completa sustentada. El próximo trabajo es esa conciliación de fronteras y cobertura económica, no el desglose individual de tarifas carreteras. B2 continúa activo e incompleto.

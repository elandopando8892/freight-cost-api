# B2 · Riesgo patronal y subtotal administrativo de referencia

## Resultado

Antes: el subtotal del monitorista incluía sueldo, prestaciones mínimas, nueve aportaciones y devengo ISN, pero riesgo patronal sin importe. Ahora: se agrega una hipótesis legal explícita de alta nueva para transporte de carga, sobre SBC y días cubiertos. El caso de registro existente con prima desconocida conserva `null`; no recibe una tasa por defecto.

Este corte modifica el consolidador local de B2, no un catálogo activo ni nómina real. Mantiene íntegro el objetivo: estimación D2D sustentada por recurso/tramo para XBF, no compra pactada ni precio de venta. Resuelve un componente del presupuesto administrativo; no declara completada la base.

## Benchmark previo y alcance elegido

Se inspeccionaron el helper patronal existente, el componente ISN, el contrato de presupuesto, las referencias pinneadas y el estado Git. Se reutilizan Zod, calendario/SBC y consolidador existentes. Sin dependencia, tecnología, infraestructura, servicio o motor fiscal nuevo.

1. **Adaptar el cálculo existente con prima legal y ámbito explícitos:** elegido, permite transformación reproducible y conserva escenarios incompletos.
2. **Asignar clase I por puesto administrativo o clase IV al transporte de carga:** rechazado por la clasificación oficial. No es clasificación por ocupación individual.
3. **Usar prima nacional promedio o mínimo 0.5% como prima del carrier:** rechazado; no demuestra registro/siniestralidad. Un motor completo de determinación anual no es necesario para este benchmark y requeriría datos que no tenemos.

La clasificación es estándar; la asignación económica por recurso y la caja única siguen en el núcleo del modelo ya existente. No se convierte un dato público de un empleador en hechos de otro. La hipótesis de referencia es deliberadamente **alta nueva, actividad exclusiva de carga y mismo registro patronal**, no historia real del carrier. Se conserva monitorista de General Escobedo, bruto fijo/primer año/mes completo octubre 2026; no se trata como conductor.

## Evidencia oficial y transformación

[LSS vigente](https://www.diputados.gob.mx/LeyesBiblio/pdf/LSS.pdf), reforma 15-01-2026, páginas físicas 26–27 inspeccionadas: artículos 72–75 distinguen prima inicial y revisión anual; clase V media 7.58875%. La prima de una empresa establecida no se deduce automáticamente de esa media.

[RACERF consolidado](https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LSS_MACERF.pdf), reforma 15-07-2005: páginas físicas 8 y 98 revisadas visualmente. Artículo 196 fracción 712 corresponde a transporte exclusivo de carga, clase V. Artículos 24/26 fijan base y unidad de clasificación; no disociar automáticamente oficina y transporte del mismo ámbito. El archivo tiene 111 páginas físicas aunque la numeración impresa indica 113; los localizadores se conservan explícitos.

Las descargas originales y sus SHA256 están en el JSON pinneado. El hash LSS coincide con el ya documentado en B1; se reutilizan las reglas, sin reautorizar el dossier antiguo. El lector IMSS devolvió error para PDF/FAQ: se usó el consolidado de Diputados y corroboración pública DOF/Orden Jurídico, sin eludir controles ni consultar registros privados. Poppler advirtió fuentes Symbol/ArialUnicode, pero las cuatro páginas relevantes renderizadas quedaron legibles y las celdas normativas fueron inspeccionadas. No se omitió la revisión por confiar sólo en búsqueda.

`riesgo = SBC_diario_limitado × días_cubiertos_del_mes × 0.0758875`

| Sueldo bruto hipotético MXN/mes | Riesgo octubre 31 días MXN | Subtotal de planificación con ISN MXN |
| --- | --- | --- |
| 15,000 | 1,234.2634075342464 | 21,349.87918328767 |
| 16,000 | 1,316.5476347031963 | 22,731.747108173513 |

El subtotal suma sueldo y devengo de beneficios, aportaciones calendáricas más riesgo y devengo anual ISN, cada componente una vez. No se añaden SBC como pago, salario vacacional duplicado, retenciones del trabajador ni riesgo dentro de la base ISN. Es planificación híbrida de cuotas de octubre y devengos anuales; no equivale a desembolso efectivo de octubre, tasa patronal global, mínimo de costo o costo mensual completo.

No falta una nómina privada para continuar el benchmark público. Sí falta completar y revisar la **coherencia del modelo**: dotación/cobertura del personal, prestaciones y demás partidas seleccionadas, mismos periodos/geografía, flota/exposición y FX compatible. Las hipótesis permiten un escenario de referencia; nunca acreditan hechos de un transportista. En un uso tributario real, alta, clase y prima requerirían su evidencia propia; este corte no hace esa determinación.

## Verificación y auditoría del objetivo B2

287 pruebas focalizadas en seis archivos PASS; 23 nuevas unitarias y cuatro casos adicionales del consolidado (incluido el nuevo pin). Typecheck estricto PASS. Caso existente desconocido, clase/tasa equivocadas, porcentaje/facción confundidos, neto, baja base no soportada, cap SBC, 28/30/31 días, duplicaciones y dos archivos originales alterados comprobados. Pruebas no se extienden a UI, sesión o datos persistidos.

CLI read-only: 30 pins, salida 2 por incompleto, cero partidas presupuestarias completas, cero adopciones, `quoteReady=false`; las seis salidas económicas siguen `null`. Hash de escenarios patronal e ISN anteriores intactos. Esto prueba integración y límites, no el costo completo del piloto.

| Requisito del objetivo completo | Evidencia actual | Dictamen |
| --- | --- | --- |
| Fijos, variables y supuestos con fuentes públicas | Partidas patronales ahora incluyen escenario riesgo; capital, seguros, permisos, dotación y variables aún tienen faltantes | Parcial |
| Capacidad, distancia, tiempos, vacíos y cruce compatibles | Contratos y observaciones anteriores; capacidades/ciclo del caso no completados ni adoptados | Incompleto |
| Cálculo por recurso/tramo, caja y administración una vez | Contratos/contraejemplos existentes; no presupuesto completo para ejecutar el piloto | Parcial, no resultado económico |
| Estimación reproducible con fuentes, vigencia e inclusiones | Dossier y componentes reproducibles, seis resultados finales desconocidos | No logrado |

El objetivo permanece **active**. No se marca B2/MVP completo ni se reduce el alcance al subtotal de monitorista. El turno produce progreso material: fuentes originales pinneadas, cálculo e integración ejecutados y verificaciones que distinguen escenarios legales.

## Modelo, consumo y límites

Responsable: OpenAI/Codex, único escritor/integrador/verificador. Recomendación GPT-6.1 Sol · medio para este corte aritmético/normativo acotado; catálogo de la sesión admite medium/high, pero no revela ID exacto de inferencia principal ni demuestra una selección nueva. Selector intacto. Para conciliación de presupuesto completo/exposición: Sol6.1 alto recomendado. No agentes ni llamadas auxiliares.

Fable/Astra no presentan ventaja demostrada para duplicar esta aritmética y lectura oficial focalizada. Claude Max x5 es declaración del usuario; cuotas actuales 5h/semanal/Fable, reposición, ruta de suscripción y uso extra desconocidos, por lo que no se invoca ni presume inclusión/facturación. No instalar lectores ni ampliar bridge.

Fuente soportada Codex, lectura 2026-10-01 21:28:53 MX: semanal 100% usado, ventana 10,080 minutos, ordinaryUsageAllowed=false; secundaria desconocida, créditos disponibles y reposición 2026-10-06 13:08 MX. Continuidad bajo autorización precedente de posibles consumos adicionales. No activar créditos/pagos/API/condiciones; cargo real y consumo por intento no observables. Errores de lector/fuentes no cuentan como consumo cero. Al cierre no se presume saldo/capacidad nuevos desde la lectura inicial.

Presupuesto previo: máximo 25 minutos, un reintento, reserva cinco minutos QA/cierre; no builds generales ni llamadas de aplicación. Inicio 21:28:53 MX; pruebas/typecheck/CLI comprobados a 21:36:24, sin fallo de pruebas/reparación. Fuentes pertinentes finalizadas: no abrir otra búsqueda fiscal general. La concentración en un integrador evita duplicar contexto y revisiones; no se fija ahorro porcentual/monetario sin medición.

## Siguiente y recuperación

Cierre comprobado 21:38:27 MX: 9 minutos 34 segundos desde preflight, dentro del presupuesto. Último cambio de código precedió a las 287 pruebas y al typecheck; sólo documentación cambió después. Lectura final del dossier/hash, rama/HEAD y whitespace sin deriva material. El objetivo sigue activo; la revisión de requisitos anterior muestra que no corresponde marcarlo complete.

Continuar dotación y presupuesto administrativo con cargas/turnos y reparto sustentado por exposición; después presupuestos directos, ciclo/variables. El costo del monitorista no sustituye el costo de operador/km. No asignar iguales tercios ni unidad física del viaje como tamaño de flota.

Worktree `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Dirty preexistente preservado. Sin commit, ramas/PR/previews, DB/Neon/usuarios/migraciones/Auth/infraestructura/producción, operaciones ni IA de aplicación.

Rollback selectivo: retirar sólo import/pin/risk mapping/validación adicional de fuentes/refs/campos `mxWorkRisk*`, `mxEmployerRiskContrasts` y `currentMxEmployerMissing` de este corte y sus tres casos específicos de integración; conservar NL, employer y demás código previo. Retirar helper/test/dossier nuevos y notas encabezadas de este corte tras revisar referencias; originales pueden conservarse para auditoría. No resetear Git ni sobrescribir snapshots anteriores.

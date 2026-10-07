# B2 - Cobertura de monitoreo y componente del pool administrativo

Fecha: 1 octubre 2026, revisión 21:52:48 America/Mexico_City. Local D:, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, worktree con cambios previos preservados.

## Resultado y decisión previa

Antes existían dos alternativas salariales de una persona: no una dotación continua. Ahora el resumen local conecta una cantidad calculada con salarios, prestaciones, contribuciones patronales, riesgo e ISN del escenario anterior. Es un componente condicionado de administración; no una base completa de costos ni el precio D2D.

Se compara y adapta, no se reconstruye nómina:

| Opción | Evidencia / ajuste | Decisión |
| --- | --- | --- |
| Una persona | Aritmética histórica ya implementada; insuficiente para un puesto 24/7 | Conservar como antecedente, no llamarla cobertura |
| Capacidad interna continua | FAQ público de Trayecto anuncia monitoreo 24/7; vacante publica rango mensual y turnos; LFT permite delimitar jornada y descansos | Adaptar helpers patronales y staffing existentes, declarar explícitamente la cantidad modelada |
| Tarifa externa por unidad | No hay en este corte una tarifa compatible verificada que cubra todas las funciones internas del puesto | No contratar, activar ni sustituir alcance |

La capacidad común es cálculo de horas y cantidades, no una innovación ni nuevo servicio. La parte propia es su linaje hacia un único pool y recursos binacionales sin duplicaciones. Se reutilizan TypeScript/Zod, `reference-facility-staffing`, `reference-mx-employer`, `reference-nl-payroll-tax` y `reference-mx-work-risk`. Sin dependencia nueva, infraestructura ni cambio del motor publicado.

## Fuentes y límites

- [LFT original vigente](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf): archivo `sources/LFT_COVERAGE_REVIEW_20261001.pdf`, SHA256 `12f09393a1951a91c3f57f579bf611b034edf1a5f78cdbfb828e23ff3a9acbf7`. Páginas físicas 22,23,24,454 renderizadas e inspeccionadas completas. Reforma 14 mayo 2026; transición del decreto 1 mayo: 2026=48 horas semanales, no aplicar todavía 40. Topes diarios 8/7/7.5; descanso continuo mínimo media hora; descanso semanal pagado, vacaciones, prima dominical y festivos por separado.
- [FAQ primario Trayecto](https://trayecto.com/forumtrayecto/wp-content/uploads/2023/04/FAQ-Trayecto.pdf): lector web página 3 anuncia monitoreo 24/7. Documento 2023, no plantilla actual ni relación unidades/monitor. Descarga directa bloqueada por Incapsula y screenshot web falló por cache miss; NO se presenta como original archivado o visualmente validado. Se conserva observación derivada en JSON, `archive:null`.
- [Vacante primaria de monitorista](https://careers.trayecto.com/monitorista-satelital-CBlgyOklPF8f/): rango 15000-16000 MXN/mes, Escobedo NL y turnos rotativos de ocho horas corroborados mediante lector web; fecha absoluta y bruto/neto no establecidos. Se conserva ubicación y readout previo. Anuncio de ocho horas no demuestra una jornada nocturna válida ni dotación completa.

La ley y el benchmark informan límites; **no publican seis trabajadores por puesto**. Un puesto concurrente y el turno de seis horas son hipótesis de diseño visibles, no facts del transportista. No inferir flota del FAQ, de sus terminales o de anuncios de otros puestos. No extrapolar el sueldo como oferta comprobada para un turno de seis horas: el salario completo aplicado es una hipótesis explícita de compensación.

## Escenario y fórmulas

Un puesto concurrente, 24 horas todos los días de 2026; jornada pagada de seis horas, hasta seis días por semana, media hora por día con relevo para descanso, doce días laborales de vacaciones. Ausencia adicional cero es sensibilidad declarada, no medición ni garantía de ausencia. Festivos mantienen servicio y requieren pago adicional todavía no cuantificado; no se descuentan como cierre a la vez que se presupuestan como trabajados.

```text
Horas requeridas = 365 * 24 * puestos concurrentes = 8760
Días disponibles anualizados = 365 * 6/7 - 12 = 300.857142857
Horas de puesto por trabajador = días disponibles * (6 - 0.5) = 1654.714285714
Personas equivalentes = 8760 / 1654.714285714 = 5.293965294
Dotación redondeada de planeación = ceil(personas equivalentes) = 6
```

Esto verifica capacidad agregada, **no construye ni certifica un calendario de turnos**. Jornadas, relevo puntual, secuencia, vacaciones, domingos, festivos y ausencias aún requieren conciliación. Dos puestos se calculan antes de redondear (11 personas analíticas redondeadas), no multiplicando automáticamente seis por dos. No usar estos horarios administrativos para conductores long-haul.

| Alternativa mensual por trabajador | Salario de 6 personas | Componentes patronales + beneficios + ISN de 6 personas |
| --- | ---: | ---: |
| 15000 MXN | 90000 MXN | 128099.275100 MXN |
| 16000 MXN | 96000 MXN | 136390.482649 MXN |

La última columna es componente híbrido de planeación: cuotas de octubre 2026 más devengos medios anuales de prestaciones e ISN. No anualizar octubre ni llamarlo nómina efectiva de octubre. Reutiliza hipótesis bruto fijo, primer año y alta inicial de transportista clase V; no prima de empresa identificada. Los extremos son alternativas, NO dos equipos sumados. No añadir otra vez la persona histórica, sueldo de vacaciones o sueldo de descansos. Sin prorratear salario por turno corto ni convertir a USD sin FX compatible.

## Contrato, aceptación y camino al costo D2D

Salida bajo `supportingFacilityStaffing.monitoringCoverageContrast` y `monitoringPlanningPayrollContrasts`, expediente pin31 `monitoringCoverage`. Referencia vinculada a `GROUP_ADMIN_COMPANY_SINGLE_POOL`; no a ambos tractores como dos administraciones. Los seis roles restantes siguen desconocidos, no cero. El pool sólo podrá asignarse una vez con exposición del mismo alcance; `actualFleetQuantity`, `monitoredUnitsPerSeat`, `allocationShares` y costos por recurso permanecen null.

Criterios de este corte: cantidad reproducible; descanso/vacación/relevo explícitos; extremos económicos conectados una vez; históricos intactos; fuentes íntegras; ninguna adopción o salida definitiva derivada de incompletos. UI sin cambios, no requiere wireframe nuevo. B3 sí lo requiere cuando se lleve al recorrido seleccionar/calcular/guardar/reabrir.

**B2 no se cierra**: presupuesto completo 0/10 partidas, cero adopciones, seis outputs null. Faltan rotación y primas/efectos patronales, demás administración e instalaciones, exposición compatible, presupuestos directos pendientes, ciclo operativo y variables del caso. El siguiente trabajo debe conectar esos paquetes al costo piloto; no abrir otra investigación fiscal genérica ni confundir incremento de pins/pruebas con MVP logrado. Se mantiene el objetivo íntegro: México DF-Fort Smith vía Puente III, caja seca 53, relevo propio MX/US, misma caja, CFU/CVU sustentados sin compra/venta inferida.

## Ejecución, pruebas y consumo

- Responsable/escritor/integrador: Codex actual. Recomendado GPT-6.1 Sol, esfuerzo alto para conciliación, medio suficiente para empaquetado; selector intacto. ID/esfuerzo realmente servido no observables en esta superficie. Catálogo disponible no demuestra acceso de una cuenta a otro modelo. Modelo actual suficiente por fórmulas pequeñas, fuentes acotadas y pruebas deterministas; no invocación auxiliar ni writers concurrentes.
- Claude Max x5: declarado previamente por usuario; ventana cinco horas, semanal, límites Fable, reposición, uso extra y ruta de suscripción desconocidos actualmente. Fable/Astra no necesarios para este cálculo verificable, no disponibilidad ni condiciones de consumo presumidas; no CLI/API ni datos compartidos. Distribución revisada al cierre: mantener Codex, no revisión duplicada por defecto.
- Cuota Codex leída automáticamente con herramienta soportada a 21:47:12 MX: semanal usada 100%, duración10080min, `ordinaryUsageAllowed:false`, créditos disponibles; reset observable6oct2026 13:08MX. Continuidad con posible consumo adicional autorizada previamente por usuario, no nuevo pago o activación. Costos/cargos y tokens de este corte no observados; no convertir porcentaje a tokens/dinero.
- Límite previo25min, un reintento, reserva5min para corrección. Dos fallos documentados distintos: descarga FAQ y screenshot cache miss; consumo desconocido, no contado cero. No cadena de reintentos ni escalamiento para bloqueo de acceso.
- 273 pruebas únicas focalizadas aprobadas en seis archivos: resumen161, office/admin30, riesgo23, empleador22, cobertura19, NL18. Casos de año/política inválidos, horas nocturnas no soportadas, NaN, descanso/ausencia, dos puestos, adulteración JSON/PDF, referencias/duplicaciones y outputs incompletos. Typecheck strict PASS, CLI exit2 esperado por incompleto, 31pins; lectura del resultado confirma cifras y nulls. No prueba autenticada, producción, nómina observada ni rotación real.
- `git diff --check` PASS sobre tracked; nuevos archivos TypeScript/JSON verificados por pruebas/typecheck. No full build repetido: cambio local de investigación sin UI/Auth/rutas publicadas.

## Rollback

Sin DB/Auth/Neon/usuarios/migraciones/infraestructura/despliegue/operaciones de negocio o IA de la aplicación. Originales previos y expedientes históricos no modificados. Para retirar este corte, revertir únicamente import/pin/binary-validation/proyección/refs de `monitoringCoverage` en el consolidator y los dos nuevos tests de integración; retirar helper/test/JSON/MD y nuevo original LFT tras revisar rutas exactas. Conservar todos los demás archivos ajenos; no `git reset`, checkout global ni borrado de directorios. Los encabezados nuevos de status/plan son separables, no reemplazan la cronología anterior.

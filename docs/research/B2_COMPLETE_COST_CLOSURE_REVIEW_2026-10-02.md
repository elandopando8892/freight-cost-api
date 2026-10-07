# B2 — revisión para cerrar el costo completo, no acumular subtotales

Revisión: 2026-10-02, 16:14:51–16:22 UTC (10:14:51–10:22 México). El corte anterior fue progreso: integración y pruebas de peajes/cruces. Esta continuación conserva la elección humana «codex» para inspección independiente; no asigna otra implementación, modelo efectivo, Claude o subagente. Se mantiene B2 activo: el entregable sigue siendo costo D2D completo contado/financiado, CFU/CVU por recurso y tramo, caja/admin una vez. No se presenta una proyección parcial como resultado terminado.

## Evidencia local y hallazgo que cambia la prioridad

Workspace físico D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd, revalidados. La ruta histórica C:/Users/andre/.codex/AGENTS.md ya no existe; se aplicó la política completa proporcionada por el usuario y la sección 9 central vigente. No se crearon ramas/worktrees ni se alteraron cambios ajenos.

El readback actual muestra dos sumatorias mensuales conocidas de 32,174.88166667 / 32,343.83166667 USD. Ambas cargan 27,078.88 USD de compensación administrativa, 3.7 equivalentes funcionales/592 horas supuestas, a sólo dos tractores. La nómina representa 84.16% / 83.72% de esas sumas parciales, no del costo total. El código conserva también un escenario de diez parejas, pero no lo integra porque permisos/pólizas/exposición siguen modelados para una pareja. Cambiar el divisor a diez sin rebasar el resto no arregla el problema.

No es un error aritmético demostrado: es una hipótesis de tamaño desproporcionada para construir el benchmark de referencia sin contraste. El caso de una pareja puede conservarse como sensibilidad, no adoptarse automáticamente. Las siete funciones tampoco prueban siete personas, siete teléfonos, siete membresías o siete cuentas de software.

## Contraste público nuevo, sin adopción

[Werner 10-K 2025](https://www.sec.gov/Archives/edgar/data/793074/000079307426000071/wern-20251231.htm), Human Capital/Revenue Equipment y tabla TTS: 1,465 empleados de oficina y 7,100 tractores TTS al cierre; conductores, mantenimiento y operaciones no trucking se informan aparte. Cociente descriptivo 0.206338 personas de oficina/tractor; 0.412676 por dos unidades. Es stock de personas, no FTE, horas ni costo; TTS mezcla servicios, propiedad y contratistas. Sólo es contraste de escala, no plantilla MX ni ratio calibrado del piloto. La relación de 3.7/0.412676 = 8.96587 no demuestra un ahorro ni un exceso exacto de FTE.

[PAMT 10-K 2025](https://www.sec.gov/Archives/edgar/data/798287/000143774926007960/ptsi20251231_10k.htm), Human Capital: 2,365 empleados, 1,598 conductores. Los 767 restantes no separan oficina de otras funciones: se rechaza usarlos como plantilla administrativa. Este límite coincide con la investigación local de capacidad; no hace falta repetirla ni pedir archivos privados XBF.

[TIP México](https://www.tipmexico.com/arrendamiento-de-trailers/) confirma productos de caja seca y esquemas de arrendamiento, pero la página revisada no ofrece tasa nominal, renta aplicable o prima numérica suficiente para completar el modelo de caja financiada. No se envió formulario ni se confundió capacidad comercial con evidencia monetaria. El crédito de un tractor o una tasa automotriz no pasan automáticamente a caja.

Captura de estas observaciones: lector web sobre fuentes primarias, no originales HTTP archivados. Una lectura de la noticia ATRI devolvió 403; no se reintentó ni se eludió. No se usaron resúmenes secundarios para sustituir tablas primarias ni se descargó otro PDF. No se exige factura, transportista, contrato de deuda o póliza real para una **estimación pública**; sí se exige fuente y transferencia económica explícita.

## Alternativas y recomendación antes de código

| Enfoque | Ajuste / costo y mantenimiento | Decisión propuesta |
| --- | --- | --- |
| Conservar plantilla3.7 y aplicar a1/10parejas | Reutilización inmediata, sin tecnología nueva; escala elegida no respaldada por workload, otro cambio de divisor puede duplicar o desalinear pólizas/permisos | Conservar sólo como sensibilidad histórica |
| Normalizar administración con evidencia pública de capacidad y servicios compartidos, mantener el contrato mensual/MAX | Modificación local acotada; roles/horas/membresías/licencias necesitan hipótesis separadas, mantiene trazabilidad y evita datos maestros duplicados | Recomendada, sin adoptar automáticamente el cociente Werner |
| Sustituir el motor con un costo agregado por milla o un TCO externo | Rápido contraste, pero riesgo de incluir otra vez combustible, nómina, mantenimiento, caja y financiación; no prueba costo binacional ni CFU/CVU | Sólo contraste externo, no reemplazo del núcleo |

La capacidad diferencial es composición física/económica binacional por segmentos y caja compartida. Compensación, cronogramas, tarifas y conversión son bases estándar: reutilizar componentes ya probados, sin otro motor, stack, servicio o integración de IA.

## Contrato de la siguiente implementación propuesta

Una entrega de cierre B2 con fases internas; no otro sprint genérico por cada prueba. Sin UI nueva: B3 presentará wireframes MARKSMAN antes de implementar selección/cálculo/guardado/reapertura. Mantener cálculo local reproducible hasta entonces.

1. Normalizar escala administrativa y fuentes de cantidades. Separar funciones de personas/FTE/cuentas/servicios; conservar modelos anteriores. No usar flota promedio con nómina de cierre como observación conjunta ni atribuirla a XBF.
2. Recomponer el ciclo físico completo de ambos escenarios, con retorno bobtail MX y recuperación de la misma caja. Separar conducción, espera, descanso, cruce, transferencia y compromiso de cada tractor; validar que un mismo minuto/km no esté en dos fases.
3. Cerrar inclusiones monetarias pendientes y periodo fiscal: carga patronal/pago de espera, ralentí/DEF, mantenimiento bobtail, seguros/custodia/territorios, permisos, patios/servicios fronterizos, cobertura carretera y caja financiada. Un servicio no aplicable se excluye con motivo contractual/modelado; un importe desconocido no se vuelve cero. Documentar cada transferencia pública, no afirmar calibración por tener un precio.
4. Emitir costo completo contado y financiado por recurso/tramo; validar con contraste independiente sin sumar referencias agregadas al presupuesto. Mostrar limitaciones/sensibilidades, no precio de compra pactado ni precio de venta.

### Criterios de cierre, no reducibles a pruebas verdes

- Una lectura local debe producir CFU, CVU y costo D2D **íntegros** en ambos modos financieros y los dos escenarios de vacío, o señalar exactamente el componente que sigue impidiéndolo; esto último no cierra B2.
- Cuadro de inclusiones/exclusiones: cada familia del presupuesto y gasto variable del alcance tiene importe sustentado, hipótesis económica revisada o exclusión fundada; ningún monto desconocido oculto en un cero.
- Por recurso: presupuesto mensual compatible, km/días de capacidad, km/días del ciclo y asignación MAX verificable; suma por tramo conserva un solo costo de caja y un solo pool administrativo. Principal/pago total no se añade otra vez a depreciación e interés.
- Pruebas de errores, duplicados, conservación de montos/tiempo/distancia, unidades, moneda, periodos, variantes, determinismo e integridad de fuentes. Una prueba que espera `null` no prueba estimación completa.
- Paquete reproducible con fuentes, fechas, reglas, límites y rollback; no despliegue ni autorización operacional implícita. El recorrido persistente SaaS aún es B3.

## Ejecutor, presupuesto y límites

Para esa implementación recomiendo **Codex GPT-6.1-Sol, alto**, integración/verificación por el mismo escritor. Razón: ya tiene contexto y el trabajo requiere resolver asignaciones económicas y físicas verificables, no un cambio visual. Es recomendación, no cambio efectivo de selector ni asignación nueva. El principal actual no es observable con las herramientas expuestas; el usuario confirma modelo/esfuerzo por el selector soportado.

Alternativa: Claude `claude-sonnet-5-5`, medio, para implementación e integración local en un handoff de único escritor, si el usuario lo elige y hay evidencia actual de Max/cuota/uso extra OFF. Catálogo local revisado2026-10-02 indica compatibilidad y éxito histórico, NO disponibilidad efectiva de cuenta hoy. Se consideró Fable `claude-fable-5-1`: no se ha demostrado insuficiencia de razonamiento que justifique escalar; inclusión/privacidad/cuota efectiva desconocidas, no invocado. No usar el cupo por usarlo ni repartir proveedores por porcentaje.

Presupuesto propuesto para la primera sesión de cierre:60min, reserva15min para correcciones/verificación, una reparación por fallo diagnosticado y máximo dos fallos diferentes antes de reevaluar. Fuentes y contexto dirigidos; ninguna llamada auxiliar autorizada por esta ficha. Parar esa implementación si exige una ampliación material de método/costo/autoridad o si un componente indispensable sigue sin respaldo tras la investigación acotada; conservar checkpoint y requisito pendiente, sin declarar terminado ni volver a repetir todas las pruebas.

Lectura automática Codex2026-10-02 16:14:51UTC: semanal100% utilizada, reposición6oct13:08México; ventana5h no disponible, créditos existentes sin compras/activaciones. Estado Claude Maxx5/5h/semanal/Fable/reposición/usoextraOFF: desconocido, no llamadas. Costo real/cache/consumo equivalente: desconocidos; continuidad evita preparar otra sesión, pero no se afirma ahorro cuantificado. Contador soportado del objetivo al cierre:3,595,247tokens acumulados del hilo, no de esta ficha ni porcentaje de cuota/cargo real. Revisión actual limitada15min desde16:14:51UTC; un fallo de ruta AGENTS histórica y un403 público preservados, no consumo cero inferido.

## Verificación y recuperación de esta revisión

Se ejecutó el consolidado actual y cálculos auxiliares de contraste, no una nueva implementación. No se rerunearon324pruebas del corte anterior porque el código no cambió; son evidencia anterior, no aceptación nueva ni prueba del costo completo. La skill [claude-review](D:/andre/apps/codex-home/skills/claude-review/SKILL.md) delimitó elección, un escritor y ausencia de invocaciones con cuota/selección no verificadas.

Hashes antes/después confirmados sin cambios a las16:24:43UTC. `git diff --check` PASS; las advertencias LF/CRLF pertenecen a archivos ya modificados. No confundir este check de archivos tracked con validación de la estimación completa. Lectura de la ficha nueva confirmada.

| Archivo | SHA256 previo |
| --- | --- |
| B2_CENTRAL_ADMIN_POOL_SCENARIOS_2026-10-02.json | eb62ffdd98781fbb04b48849bd69fbdfe32f7f43621ea93b45625241ce3800f8 |
| B2_COMPANY_SERVICE_POOL_SCENARIOS_2026-10-02.json | 5eb76af7da21df1459d0628f254a03d1bf6b512f61cba278c02e420697790ab5 |
| B2_PILOT_CYCLE_EXPOSURE_SCENARIOS_2026-10-02.json | 327674619252a10df0a01ed692f40829829c67141d330bc46e568debde4b9ea4 |
| reference-central-admin-pool.ts | a756d3031f0b90722b3cfe2ea86232f7a550353958dbdd9653ff6303b8ad08cb |
| reference-pilot-cycle-exposure.ts | c895863cd827a254ccb85a57b4ea758afd466079cc1677d39979827ae7d128f7 |
| consolidate-binational-reference-budget.ts | 18553c7768d97843cc67914be3fe055f7f0dd8911093a90cadd0d348c301cf7c |

Sólo se añade esta ficha. Rollback: retirar esta ficha si no tiene ediciones posteriores; no restaurar scripts, bases, documentos previos ni tableros. Ningún efecto en Auth/Neon/DB/usuarios/infraestructura/producción, servicios externos activados, negocios o consumo de IA de aplicación.

## Checkpoint de asignación pendiente — 2026-10-02 16:36:15 UTC

La continuación anterior aportó la ficha pública de crédito de caja, sin adoptar una tasa. En esta continuación se revalidaron rama, HEAD y worktrees; no hay implementación ni proceso vivo por esperar. El código vigente conserva `completeCfuUsd`, `completeCvuUsd` y `completeD2DCostUsd` nulos y exige recalcular el ciclo físico. Esto confirma que el entregable completo no está demostrado, no que estos nulos sean un resultado aceptable de B2.

Lectura soportada actual de cuotas Codex: ventana semanal de 10,080 minutos, 100% utilizada, reposición Unix 1791313680 (2026-10-06 13:08 México); ventana de cinco horas no devuelta. No se mostraron ni archivaron identificadores de cuenta o saldo. Capacidad Claude, inclusión/uso extra y modelo/esfuerzo principal efectivos siguen sin observarse. No se activó consumo extra ni se cambió proveedor/modelo.

Elección humana registrada: «codex». La elección específica propuesta 6.1 Sol / alto para el corte de implementación de 60 minutos continúa sin confirmación humana posterior; el mensaje de continuación del objetivo no sustituye esa elección. No se hacen nuevas invocaciones auxiliares, investigación adicional ni pruebas repetidas para simular avance mientras falta ese dato. Esta continuación sólo inspecciona y registra el checkpoint; no se cuenta como desarrollo completado. B2 sigue activo, sin declarar cierre ni pausar unilateralmente.

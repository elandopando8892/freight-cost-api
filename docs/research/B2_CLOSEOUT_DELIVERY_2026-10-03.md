# B2 — entrega local de cierre y límites que impiden aceptarla

Actualización posterior: [perfil confirmado por el usuario y pernocta en ambos países](B2_CONFIRMED_PROFILE_DELIVERY_2026-10-03.md). Fecha/mercancía/valor/pagador ya recibidos; no siguen pendientes de respuesta. Cambian el alcance del cierre, no acreditan automáticamente importes o cobertura. Este documento conserva la evidencia del corte anterior.

3oct2026. Solicitud: completar los cuatro bloques B2, sin nuevas tareas por caseta, importes inventados o cierre basado exclusivamente en pruebas. **No se completaron todos los trabajos económicos.** Se completó la integración local de resolución y se amplió la comprobación independiente; el benchmark público sigue incompleto. No declarar B2 terminado, todo el inventario calibrado o producción lista.

## Qué había / qué hay ahora

Antes: matriz210/135, componentes públicos, diagnóstico de llantas y compositor parcial. Ahora: una lectura actual reúne inventario, contratos comprobados, escenarios, brechas y plantilla exacta de resolución. No otro motor, stack, proveedor, ruta SaaS o copia adoptada del catálogo. El ejecutable `apps/api/scripts/prepare-b2-closeout.ts` exige opciones explícitas; conserva toda la trazabilidad e incompletitud.

| Bloque solicitado | Entrega / evidencia | Estado de cierre B2 |
| --- | --- | --- |
| Inventario y fórmulas |210claves/16secciones,135dependencias benchmark,58lecturas fuera de benchmark y17sin lectura literal en siete archivos;82sondas independientes nuevas de fijo/mantenimiento; combustible y llantas ya contrastados | Trazabilidad y ecuaciones comprobadas, no calibración de210inputs ni equivalencia de todos los métodos |
| Bases operativas | Compositor conserva ocho brechas: permisosMX/US/caja, RCextranjeraMX, custodia/territorio de caja, impuestos/instalación de servicios, remanentes patronalesMX y otros viáticosMX | Pendiente de suficiencia pública y definición de aplicabilidad; no se inventan importes |
| Viaje y mercancía | Cuatro partidas agregadas y una definición de servicio, separadas del benchmark de base | Pendiente de peajesMX/US, cruce, relevo y mercancía/valor/pagador; no investigación plaza por plaza |
| Resultado completo | Integración real del compositor con el contrato CFU/CVU existente, ambos ciclos y contado/financiado | Completo sólo con remainders sintéticos de prueba; los casos públicos permanecen incompletos |

## Benchmark previo, alternativas y límites de fuentes

Se releen expedientes ya fijados de permisos/IRP/UCR/HVUT, cajaTexas, seguro extranjero, servicios, operadorMX, viáticos y carga, más código/historialGit. Reutilización de82pins en la configuración probada. Se adopta la matemática y los contratos existentes; se adapta una integración acotada de resoluciones. Se rechazan reemplazar el modelo por una tarifaTCO agregada, trasladar un límite fiscal a gasto observado o excluir obligaciones desconocidas sólo para que el total sea numérico. Fuentes públicas precisan capacidades/reglas, no automáticamente la combinación económica del piloto.

Investigación dirigida3oct2026, sin contactos, formularios, órdenes ni llamadas facturables:

- [SICT catálogo de trámites](https://micrs.sct.gob.mx/index.php/transporte-y-medicina-preventiva/autotransporte-federal/tramites-y-servicios/requisito-y-costos-de-los-tramites): derechos por trámite no determinan una canasta anual completa. La lectura no acredita periodo2026/aplicabilidad/frecuencia de todos los importes; no se anualizan altas, cambios y renovaciones conjuntamente. IRP2026 ya documentado excluye cargos administrativos/misceláneos. El escenarioTexas ya deja entrada/custodiaMX sin resolver; no se suma un registro completo por país.
- [FMCSA, cobertura de transportistas mexicanos](https://www.fmcsa.dot.gov/international-programs/what-insurance-and-proof-financial-responsibility-do-i-need-operate-us): regla para zona comercial y long-haul, no prima publicada. [QuálitasPremier](https://www.qualitaspremier.com/Home/Products?lang=en) describe producto crossborder, sin precio compatible en la página. Los extremos domésticos ya integrados siguen sensibilidades no homologadas; no representan cobertura contratada ni se seleccionan automáticamente.
- [T-Mobile](https://www.t-mobile.com/business/wireless-business-plans): cargos por conexión y tasas dependientes de ubicación; no una factura completa del conjunto oficina/patios/servicios. No amortizar activación durante un plazo inventado ni añadir conexión como gasto mensual perpetuo. [Outpost](https://outpost.us/locations/laredo-metropolitan/) precisa reserva mensual, no cierre fiscal de toda la canasta.
- Viáticos: expedienteMX existente no permite completar alojamiento y otros gastos del caso. Límites fiscales o viáticos de empleados públicos/otras modalidades no son un benchmark directamente comparable de operador dryvan. Búsquedas nuevas no aportaron fuente primaria comparable suficiente; agregadores/tesis de autobuses/documentos personales no se adoptan. Una aperturaIMT devolvió errorinterno, sin retry/fallback ni cifra inferida.
- [Timi, costo por viaje](https://timi.mx/carga/cuanto-cuesta), tabla20sep2026 reconsultada: hay fórmula pública condicionada por valor, derechos y elegibilidad. Falta la selección de mercancía/valor/pagador del viaje, no otra fórmula. No seleccionar el ejemplo500000MXN ni interpolar derechos como si fueran una tarifa publicada.

Esto no exige registros privados XBF, ni afirma que un precio privado sea la única vía posible. La brecha es evidencia pública suficiente, alcance y supuestos explícitos revisados. No se declara una fuente inexistente porque la búsqueda acotada no la encontró. La fecha del viaje también se solicita separadamente, sin impedir la validación matemática del inventario.

## Contratos implementados

`model-formula-contracts.ts`:82sondas con valores sintéticos desiguales ejecutan el kernel puro real. Comprueban siete pares administrativos,23corporativos,13programados de mantenimiento, cinco reservas, normalización de seguro, propiedad/residual de activos, financiación, compliance mensual/anual y capital de trabajo por país. Comparación esperada se construye independientemente; fallos quedan visibles. No se cambia el kernel, se certifican sus defaults o se trasladan sentinelas a precios. La sonda previa de llantas sigue mostrando tres asociacionesPU distintas; método público agregado y ciclo detallado son alternativas, no equivalentes ni gastos sumables. Se conserva el bloqueo del recape ambiguo en el adaptador, sin migrar historia.

`pilot-cost-resolution.ts`: plantilla de seis remanentes fijos y siete variables de la configuración pública seleccionada, uno por identidad/ciclo. Entradasnull no pasan como resolución. Requiere hash del linaje original, fuentes compatibles con periodo/grupo/perfil/recurso, unidadesUSD/mes oUSD/ciclo y explicación. Resuelve sólo targets realmente incompletos; no acepta totales autorreportados ni override de aceptación. Para una fila parcial añade únicamente el remanente declarado, no repite el componente conocido. Exclusión/zero exigen fundamento y una exclusión no puede borrar un importe parcial conocido. La cuota patronal fija permanece obligatoria y separada. Una prima extranjera íntegra sustituye el proxy anual, no se añade por segunda vez. Caja/admin/capital se conservan.

Las declaraciones/fuentes suministradas al adaptador no se autentican por existir ni por tener URL. `acceptedForB2=false`, `publicSourcesIndependentlyVerified=false`, `quoteReady=false`; un costo numérico es un escenario calculado, no aceptación económica. Nunca usar este adaptador como mecanismo de adopción. No conexión HTTP ni persistencia nuevas.

## Uso local reproducible

Desde la raízD del checkout, con Node instalado y `--import tsx`, ejecutar `apps/api/scripts/prepare-b2-closeout.ts` con un argumentoJSON:

```json
{"options":{"monthlyBudget":{"cashTaxScenario":"NET_PLUS_VAT","financeMonthlyScenarioId":null,"boxInsuranceAlternativeId":"PUBLIC_GUIDE_LOW","mxYardAlternativeId":"NET_PLUS_VAT_RESERVE"},"restInterpretation":"RATE_EXCLUDES_WEEKLY_REST","defFraction":0.04,"borderLinkBasis":"PUBLIC_LINK_FORECAST","bobtailWearBasis":"IMT_C3_NON_ARTICULATED_PROXY","usMaintenanceBasis":"ATRI2024_ALL_RM_PLANNING","usDriverBasis":"BLS2025_ECEC2026_MIE_PLANNING","mxFoodEmployerBasis":"REMUNERATIVE_FOOD_NL_EXEMPT_PLANNING"}}
```

Son alternativas explícitas de readback, no selección operativa del usuario. CLI no escribe archivos/bases. Salida2 significa aceptación económica pendiente, incluso si una resolución sintética permite calcular todo. Salida1 es contrato/error real. El JSON devuelto contiene matriz210, hashes/pins, ecuaciones, outputs y `requiredInputs`. Una resolución declarada se presenta porcycleId en `resolutions`; nunca completar su plantilla con sentinelas del test para mostrar un costo público terminado.

## Validación ejecutada

Después del último código: **329pruebasPASS/13archivos,77.23s**. Incluye24tests del adaptador/closeout, cuatro de82sondas, inventario24, piloto63, mensual22, presupuesto30, proyección21, fluidos11, variables18, RC11, tasas25, D2D72 y ciclo de vida4. TSCestricto de siete archivos y dependencias, salida0. Pruebas sintéticas de finanzas/vacíos, MAXporrecurso, caja única, driverfijo, conservación/recarga determinista, aplicación duplicada, falta de una partida, cero/exclusión, periodos/perfiles/propietarios incompatibles, fuente ausente, monto negativo, centavo fraccionario y manipulación de aceptación. No hay UI/roles/auth/persistencia a validar en este cambio; son B3 y no se presentan como probados.

Primera suite:184PASS/1FAIL; un test quitaba cargaMISSING y esperaba erróneamente el código de remanente parcial. Se corrigió únicamente la expectativa a `UNRESOLVED_VARIABLE_COMPONENT` con identidadexacta, sin aflojar la guarda. Repetición185PASS y luego329PASS tras añadir pruebas de laCLI. Primer y último TSCsin errores. Fallos de lectura/búsqueda se conservan; no se contabilizan como consumo cero. WarningCJS deVite preexistente. No build global ni instalación.

CLI real después de cambios, DATABASE_URL/STAGING_DATABASE_URL eliminadas sólo del proceso hijo: salida2, `INCOMPLETE_PUBLIC_COST`,210/16/135/58/17,82pins,82ecuacionescoincidentes,3discrepanciasllantas y13issues por cada ciclo. CFU/CVU/productivo íntegrosnull, cero adopciones/escrituras. Las cifras públicas conocidas siguen4816.210709853235/9645.151413785585USD parciales. La resolución sintética de contado/financiado permite sumaCFU+CVU completa, no costo público ni precio compra/venta. Todos los procesos de prueba/typecheck/readback terminaron.

## Modelo, consumo, recuperación y condición de parada

Codex único investigador/escritor/integrador/verificador, elección humana registradagpt-6.1-sol/high conservada; runtime principal efectivo no observable ni selector modificado. Claude alternativa viable no elegida; Fable no resuelve ausencia de evidencia/definición y no se invoca; disponibilidad y cuota desconocidas. Sin delegación, nuevas sesiones o datos remitidos a IA auxiliar. Skillstesting-strategy/documentation orientaron las pruebas críticas y esta entrega.

Presupuesto acotado90min/dos reparaciones diagnosticadas/cero llamadas auxiliares, dentro de la autorización global240h previa. No obligación de consumirlo. Lectura automática20:04:07UTC3oct2026: CodexPro permitido, semanal31%utilizado/10080min, reposiciónUnix1791580450; ventana5hnull. No atribuir la diferencia frente a la lectura anterior únicamente a este trabajo ni inferir cargos/saldo/cuotaMax. Tokens atribuibles/cargos no observables. No pago, uso extra, API o condición de privacidad activados.

Rama codex/cost-tires-release-s14/HEAD4f5fc2de0c3d178dace917231e1092040dec21fd, raíz físicaD:/andre/worktrees/freight-cost-model/cost-tires-release-20260927. KernelSHA3640a05d4cc10820f84de5f295f8d7e0413ad48a87a3921be8981336b6ef5d8b intacto. Conservar árbol sucio y otros trabajos; no DB/Auth/Neon/usuarios/migraciones/infra/negocio/deploy/commit/push/PR. No UI nueva: no wireframe nuevo; requisitoMARKSMAN/wireframesB3 vigente.

Rollback: retirar únicamente tres archivos nuevos de implementación y dos tests de este corte si siguen sin cambios posteriores; retirar imports/propiedadfixedMaintenanceFormulaVerification añadidos al inventario y cierre por sección; retirar esta entrada y enlaces/estado documentales. No restaurar archivos completos ni borrar directorios. Sin estado externo que revertir. Checklist de whitespace cubre también archivos no rastreados, fuera de `git diff --check`.

**Parada económica, no cierre:** no hay evidencia suficiente en esta entrega para dar valor/aplicabilidad a todos los remanentes y faltan datos de mercancía/fecha/pagador. Se solicita sólo esa definición de viaje al usuario, no historia financiera privada. Investigar/aprobar los supuestos restantes de base sigue pendiente; no redefinir unilateralmente B2 como una calculadora sintética ni ocultar costos. Mantener B2 abierto hasta costo público completo, cuadro económico de inclusiones/exclusiones revisado y paquete reproducible aceptable.

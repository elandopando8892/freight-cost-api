# Should-Cost Engine: cierre del producto modular

> Estado vigente (9 de octubre de 2026, Ciudad de México): este es el plan de tres sprints de cierre del MVP; S1, S2 y S3 siguen abiertos. Claude Kit está cargado y activo en `assignment-capacity-100000-20261010T020421Z`, con `local_consumption_mode: user_managed` y `restart_required: false`, según `kit_info`. La capacidad de 100,000 es del registro técnico. Para operar el kit rigen [AGENTS.md](D:/andre/apps/codex-home/AGENTS.md) y [OPERATING.md](D:/andre/apps/codex-home/integrations/claude-review/OPERATING.md). Los checkpoints fechados abajo conservan la historia y no sustituyen este estado.

## Resultado que define el MVP

Usuario autorizado selecciona una base operativa versionada y su método, captura un viaje, revisa distancia/ciclo/combustible/casetas y la procedencia de sus inputs, obtiene costo explicable CFU/CVU por recurso, guarda y recupera el mismo resultado. Ve los faltantes y reservas sin importes inventados. La estimación de costo se distingue de compra, venta y política comercial. Primero se acepta un perfil completo; la cobertura de segmentos adicionales no se presume.

Caso piloto conservado: empresa binacional operando con permisos vigentes; relevo propio de tractor MX/US y misma caja seca53′; CDMX–Fort Smith AR72916 vía Nuevo Laredo/Laredo, World Trade Bridge; partes automotrices75000USD; última semana septiembre2026; ambos escenarios de retorno. Prestaciones y alojamiento en ambos países conforme al alcance previamente declarado. Las fuentes públicas sustentan referencias de planeación, no costos privados observados ni una cobertura de póliza real acreditada.

## Evidencia verificada y benchmark reutilizado

Checkout D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD9c240794981470d50b76671e1a9c50b09bc1063f al iniciar. Preservados45artefactos ajenos. Next.js existente en apps/web/app; backend TypeScript/Prisma y auditor económico existentes. No reconstruir catálogo, motor, autenticación o integraciones comunes.

Nueva ejecución local del auditor `reconcile-economic-model-inventory.ts`: reporte entregado con exit2 previsto por el contrato, 210campos,135dependencias benchmark,75fuera del benchmark,58de éstos con lector literal y17sin lector literal en el alcance inspeccionado. Trece familias económicas: once PARTIAL_PUBLIC_MODEL_NOT_CALIBRATED; RISK/TECHNICAL_MARGIN SEPARATE_POLICY_NOT_A_COST_RATE. `quoteReady=false`. El reporte es conciliación actual del código y evidencia congelada, no actualización de fuentes ni calibración nueva. No persistencia o escritura remota.

Referencias reutilizadas comprobadas contra repositorio: [ocho áreas metodológicas](METHODOLOGY_CLOSURE_2026-10-07.md), [cierre B2](../research/B2_FINAL_CLOSURE_GATE_2026-10-04.md), [contrato B3 y wireframe](B3_SAAS_WIREFRAME_CONTRACT_2026-10-05.md), [wireframes MVP](freight-cost-model-mvp-wireframes.html), [revisión de recuperación](../reviews/RECOVERY_ASTRA_AND_KIT_READINESS_2026-10-09.md).

Alternativas: (1) seguir cerrando subcomponentes técnicos sin aceptación del caso completo: no resuelve la brecha producto/metodología; (2) cerrar un perfil por tres gates de producto reutilizando todo lo existente: recomendado; (3) adoptar otro TMS/cotizador completo: requeriría estudiar compatibilidad del núcleo por recurso/CFU/CVU y migración, sin evidencia actual de menor costo. No se elige tecnología ni proveedor nuevo. El núcleo diferencial es la trazabilidad de la metodología y atribución por recurso; las capacidades comunes conservan bibliotecas/servicios existentes.

## Tres sprints de cierre, sin renumerar entregas históricas

Estos gates consolidan pendientes existentes, no declaran cerrados B2/B3/B4 ni abren una cadena ilimitada de cortes.

| Gate de producto | Alcance y dependencias | Criterio de cierre |
| --- | --- | --- |
| S1: metodología y base piloto | A1/A2/A3/A4: adjudicar17campos y FACTORS; contrato WORKBOOK_V3/benchmark posicional/familias; selección y responsabilidad por recurso; evidencia y reservas de benchmark | Cada campo tiene consumidor/fórmula o exclusión justificada; versión/método visibles; no dobles conteos; salida del caso propio reproducible y con límites económicos explícitos. Calibración sólo se acepta con evidencia suficiente |
| S2: recorrido útil y persistencia | A5–A8 y B3: procedencia combustible; ruta/distancia/ciclo; casetas por clase/fecha; cálculo explicable; guardado/recarga/replay y permisos. Depende del contrato S1 y aceptación de datos externos | Una persona completa base→viaje→revisión→resultado→guardar→recuperar; fecha/unidad/perfil/fuente conservados; errores/vencimiento/cambio de cuenta/duplicación y VIEWER comprobados. Datos simulados no se presentan como integración real |
| S3: release y aceptación operativa | B4: recuperación aislada, identidad histórica, migraciones mínimas, par frontend/API del mismo commit, sesión y autorización real. Depende de S1/S2 | Backup exportado recuperable sin origen; permisos/ledger conservados; release reproducible; login/intercambio/sesión/recarga/renovación y roles reales aceptados; aprobación puntual vigente antes de publicación/SQL/Auth |

## Roles elegidos y encargos

Usuario eligió Anthropic Fable5.1 para arquitectura/diseñoUIUX, Opus5.5 para optimización/implementación/mejora y OpenAI Astra6 para revisión. IDs concretos: claude-fable-5-1/high, claude-opus-5-5/high y gpt-6-astra/high. Esfuerzos efectivos desconocidos cuando no expuestos. Coordinación/integración local a cargo de Codex nativo, sin cambio de modelo por JSON o CLI. No se asigna otra familia como fallback.

Por gate: Fable compara alternativas aplicables y define contrato/diseño; Opus implementa en rutas exactas, conserva pruebas y verifica el recorrido; Astra revisa diff, metodología/evidencia, permisos y aceptación. Para UI, Fable usa manual MARKSMAN y dirección existente, con wireframe antes del código, estados vacío/error/cargando/vencido, desktop/móvil/teclado. No introducir un rediseño global como requisito de S3. Wireframes ya existentes son baseline, no una propuesta nueva atribuida a Fable.

Presupuesto explícito ya aceptado para el bloque local de recuperación: Fable20min, Opus45min, Astra20min, vigencia24h, sin reintentos automáticos. Se conserva consumo anterior; el kit user_managed no impone los cupos acumulados antiguos. Los siguientes gates deben concretar archivos, pruebas, aceptación y tiempo antes del lanzamiento dentro del alcance autorizado; esta planificación no modifica permisos, activa gasto o constituye una política automática de modelos. Contexto mínimo sanitizado, un escritor por rutas solapadas, cierre comprobado antes del traspaso.

## Plan ejecutable para llegar a producción

Planificación del9oct2026, Ciudad de México. HEAD inspeccionado `31e2f7553b13fbd1f984b0e226bf134eaad7fc54`; se conservan los tres documentos modificados del corte anterior y los45artefactos ajenos. La lectura actual del kit vuelve a confirmar la release de100,000 cargada/activa, modo `user_managed` y sin reinicio requerido. El catálogo es del2oct y declara disponibilidad desconocida: cada ejecución conserva la comprobación de cuenta/modelo de su ruta. La copia remota0.4.0 en disco no reemplaza el plugin Windows0.3.0 observado.

### Alcance de la primera salida

Entregar el Should-Cost para el perfil piloto ya definido: base versionada, datos del viaje, costo por recurso y explicación de CFU/CVU, guardado y recuperación, acceso de las dos cuentas existentes. La referencia de septiembre es un escenario histórico de planeación; las observaciones posteriores se muestran con su fecha y no se convierten en tarifas de septiembre. Los otros perfiles quedan identificados según su cobertura real. Reefer, hazmat, flatbed, transbordo y nuevos segmentos requieren su propia aceptación y no forman parte del cierre de este piloto.

El benchmark y la metodología existentes son la base del trabajo. La [entrega B2 de planeación](../research/B2_PLANNING_CLOSEOUT_DELIVERY_2026-10-04.md) permite reutilizar el escenario público explícito; la [ficha R2](../reviews/B4_R2_ECONOMIC_ACCEPTANCE_2026-10-07.md) aún solicita aceptación de sus24resultados y límites. Su aceptación no significa calibración del carrier, precio de venta ni adopción automática de parámetros. Si una limitación impide el uso esperado, se resuelve o se acota explícitamente antes de publicar; no se habilita el producto cambiando un indicador de readiness.

La estrategia elegida frente a las alternativas sigue siendo cerrar este perfil con el stack y los contratos existentes. Completar simultáneamente todos los segmentos retrasaría el primer uso; sustituir el motor por un cotizador genérico pierde la atribución por recurso que necesitamos validar. Reutilizar catálogo, Prisma, integraciones Google/SAKBE, evidencia B2 y persistencia B3 reduce implementación y retrabajo. No hay selección de arquitectura nueva en este plan.

### Trabajos P0 y entregables

| ID / sprint | Trabajo y responsable elegido | Entregable y condición de cierre | Dependencia |
| --- | --- | --- | --- |
| S1.1 | Fable define el contrato de método; Opus conecta o documenta las exclusiones; Astra revisa | Matriz de210campos,17sin lector literal y FACTORS: consumidor/fórmula o exclusión por método/perfil; distinción entre costo, input de viaje y política comercial. WORKBOOK_V3, llantas por posición y presupuesto por familias permanecen identificados. Pruebas de doble conteo/unidad/reparto MX-US-caja compartida | Inventario y contratos existentes; no otra investigación por cada campo |
| S1.2 | Opus integra el expediente económico; Astra revisa aplicabilidad y suficiencia; Fable interviene sólo si cambia el contrato | Cada concepto utilizado tiene fuente, unidad, periodo, ámbito, tratamiento y nivel de evidencia. Reservas y transferencias visibles; seguro de mercancía/flotilla, prestaciones y pernocta asignados una vez. Investigación pública dirigida sólo a faltantes que afectan el piloto | S1.1; fuentes B2/R2 ya archivadas |
| S1.3 | Opus presenta el caso conciliado; Astra revisa; el usuario acepta el alcance económico concreto | Caso piloto completo por recurso y ambos escenarios de retorno; regresión de24escenarios R2 y sensibilidad de las reservas. Ficha breve para aceptación, con límites pendientes y uso permitido. Calibración y readiness conservan su significado real | S1.1/S1.2; aceptación económica pendiente |
| S2.1 | Fable diseña el recorrido y los wireframes; Opus implementa; Astra revisa | Un recorrido base→viaje→fuentes→resultado→guardar→recuperar. Método/versión y faltantes comprensibles; estados vacío/cargando/error/vencido; desktop/móvil/teclado. Manual MARKSMAN y wireframes existentes como punto de partida | Contrato S1.1 estable; evita rediseño global |
| S2.2 | Opus completa los contratos de datos externos; Astra verifica | Combustible/FX y ruta/casetas conservan fuente, fecha de observación, unidad, región, clase/ejes, sentido y aceptación en cálculo y recarga. Edición manual invalida procedencia anterior. Google DRIVE aporta una ruta candidata: no acredita restricciones truck ni ciclo operativo. SAKBE/conciliador existentes conservan el mismo itinerario; puente separado; desconocido nunca se convierte en cero | S1.1/S1.2 y clientes actuales. Llamadas reales sólo dentro del acceso/gasto autorizado |
| S2.3 | Opus conecta y comprueba el recorrido; Astra revisa permisos, integridad y recuperación | Resultado mostrado y recuperado conserva método/base/fuentes/inputs/costo. Guardado/replay no duplican y la precisión persistida es estable. Cambio de cuenta, expiración, acceso indebido y VIEWER comprobados. Se reutiliza el guardado y la recuperación QA ya aceptados de B3; no se reconstruyen por estar documentados en una etapa anterior | S2.1/S2.2; [recuperación B3](B3_RECOVERY_QA_CLOSEOUT_2026-10-05.md) |
| S3.1 | Diseño Fable existente; Opus implementa recuperación aislada; Astra revisa | Archivo durable→receptor independiente con origen apagado, IDs/contexto fijados, manifiesto verificado y rechazo de objetos no cubiertos. Prueba sintética real en PostgreSQL desechable. Después, respaldo/restauración del destino autorizado: el ensayo local no certifica por sí solo la recuperación productiva | Encargo corregido preparado; los dos archivos nuevos aún no existen |
| S3.2 | Opus completa el adaptador de transición; Astra revisa aislamiento/historia; Codex coordina | Ensayo aislado del coordinador con adaptador real, exclusión de escritores, inventario/ledger/historia/paridad y rollback comprobados. Inventario actual de producción identifica frontend/API/repositorio/SHA/Auth efectivos. Sólo cambios necesarios y autorizados al destino; las identidades históricas se conservan sin inventar sujetos ni reasignar organizaciones | S3.1; coordinador/inspección existentes; ventana específica para escrituras reales |
| S3.3 | Opus corrige defectos del candidato; Astra revisa el release; Codex verifica e integra | Compilación y pruebas necesarias API/Web/RLS con fixtures propios; export escaneado reproducible; frontend y API del mismo commit. Login real Supabase, código, sesión, recarga, renovación, logout/cambio de cuenta y permisos de sales/JG. Callback/origen de la URL elegida comprobados; otros usuarios rechazados conforme al alcance | S1/S2 y S3.2; acciones humanas de login cuando el proveedor las exija |
| S3.4 | Codex ejecuta el procedimiento autorizado; Astra revisa el recibo | Candidato concreto, respaldo, rollback y aceptación del usuario antes de promoción. Despliegue de la pareja validada, smoke autenticado y comparación del cálculo guardado en producción. Recibo distingue desarrollado, probado, desplegado y usado; un cálculo sintético no se presenta como cotización comercial | S3.3 y autorización puntual vigente de producción |

### Orden, capacidad y tiempos propuestos

La recuperación S3.1 ya iniciada se termina primero dentro de un bloque acotado. Se reutiliza el diseño entregado por Fable, se ejecuta el contrato corregido de Opus y se revisa con Astra. Una vez entregada esa pieza, la prioridad vuelve a S1 y al recorrido S2. La recuperación no se convierte en otro proyecto del kit.

Estimación inicial: S1 dos a tres jornadas, S2 dos a tres y S3 dos a tres incluyendo la recuperación iniciada; añadir una a dos jornadas de contingencia. Total de **7–11jornadas efectivas**, asumiendo unas6horas útiles por jornada, continuidad del trabajo y acceso disponible. Son estimaciones de planificación, no duración medida ni fecha garantizada. Las esperas de aceptación, login o permisos externos se registran aparte. Reestimar al cerrar S1 con el inventario de faltantes resuelto; no abrir otro sprint por cada defecto.

Un único implementador escribe rutas solapadas. Astra puede revisar en paralelo en solo lectura. Codex coordina, prepara contexto, adjudica hallazgos, verifica y entrega checkpoints; el usuario acepta la ficha económica y la publicación. No se supone un segundo revisor humano.

| Actividad significativa | Proveedor / ruta / modelo / esfuerzo solicitado | Tiempo previsto por encargo |
| --- | --- | --- |
| Contrato económico y diseño de recorrido S1/S2 | Anthropic, Claude Code con suscripción por Claude Kit · Windows; `claude-fable-5-1`, `high` |20–30min; reutilizar diseños vigentes antes de otra llamada |
| Recuperación corregida S3.1 | Anthropic, misma ruta; `claude-opus-5-5`, `high` |40min previstos, conservando el contrato y tiempo del bloque autorizado |
| Implementación/conexión S1/S2/S3 | Anthropic, misma ruta; `claude-opus-5-5`, `high` |45–60min por paquete funcional y rutas explícitas |
| Revisión de cada entregable | OpenAI, subagente Codex explícitamente elegido; `gpt-6-astra`, `high` |20–30min, solo lectura; correcciones sólo de hallazgos adjudicados |
| Coordinación y verificación determinista | Codex nativo, sin cambio de selector por el kit |Incluida en las jornadas estimadas; modelo/esfuerzo efectivos no acreditados por el plan |

Estos tiempos son propuesta de trabajo, no cupos nuevos de la suscripción ni permiso de gasto. `user_managed` conserva contadores y techos acumulados como evidencia; siguen exigibles rutas, contexto, salida, tiempo/pasos acordados y cardinalidad por solicitud. Cada paquete sella sus valores técnicos mediante el mecanismo existente. Cero reintentos automáticos y ningún fallback a API o modelo. Una corrección diagnosticada conserva problema, intentos y cierre; ante lanzamiento incierto o segundo bloqueo de la misma causa se entrega el estado antes de continuar. Cuota, cargos y tokens futuros son desconocidos; se registra lo observado después de cada ejecución. El esfuerzo efectivo se declara desconocido cuando no sea observable.

### Aceptaciones y cierre del lanzamiento

Antes de pedir una decisión se entrega un resultado revisable: para S1, ficha económica con reservas y uso propuesto; para S3, candidato del mismo commit, diferencias necesarias en destino, pruebas, respaldo y rollback. Las autorizaciones locales previas se reutilizan dentro de su alcance; las ventanas QA/productivas vencidas no se reabren por este plan.

La meta se cumple cuando las dos cuentas existentes pueden usar el perfil aprobado, seguir el recorrido completo y recuperar el mismo resultado en producción, con permisos, fuentes y límites visibles. B3 ya tiene evidencia real de guardado/recuperación QA; OAuth renovado en producción y recuperación independiente del destino siguen pendientes. Pasar pruebas locales no sustituye esas dos comprobaciones.

La siguiente narrativa de entrega informa qué cambió, qué recorrido pasó, qué falta y si existe una decisión concreta. Nuevos segmentos, optimización de flotas, rediseño del kit, túneles, ERP completo, envíos comerciales y expansión de usuarios se mantienen fuera de este plan salvo cambio expreso de alcance. Rollback documental: retirar sólo esta sección y su enlace de continuidad; conservar los recibos, contratos sellados y el trabajo previo.

## Historial de admisión anterior a la activación

Primera ejecución pendiente ya preparada: recuperación aislada con diseño técnico Fable, implementación Opus y revisión Astra. Cuatro requisitos adjudicados: fijar IDs/contexto Docker; recuperar desde archivo persistido con origen apagado; manifiesto limitado de roles/settings; rechazo previo de objetos sin cobertura. Encargo de diseño sellado en el kit, sin inferencia Claude iniciada.

Observación histórica2026-10-09T22:11:43Z: release activa/cargada personal-usage-20261009T153439Z, user_managed, sin restart requerido ni active.lock. Los tres registros de marksman-investors-narrative que bloqueaban antes ya no aparecen en la validación. Entonces closed() rechazó marksman-loads-quickpay:s6-delivery:fable-design, opus-implementation y opus-implementation-medium con closure/lease unconfirmed. Sólo se consultaron metadatos del validador; no sus prompts, sesiones o datos. Ausencia de active.lock no demuestra cierre de leases/resultados.

La creación de un ledger exige inventario global cerrado en policy_budget.py:260–261; por ello encargos ajenos impiden admitir el bloque FCM. No es agotamiento de cuota ni falta de elección del usuario. No se relanza authorize contra el mismo estado, cancela procesos ajenos, altera manifest/guardas ni usa ruta sin ledger para eludirlo. Cierre debe acreditarse mediante mecanismo soportado en los encargos propietarios. Una modificación del validador/globalidad del kit sería otro alcance, con tests y activación propios.

## Límites del corte

Entregado: conciliación vigente, plan finito de producto y continuidad del encargo preparado. No nueva implementación Opus, diseño Fable ejecutado, publicación, calibración, fuentes actualizadas o aceptación económica/auth certificadas. Astra revisó estáticamente el transporte anterior en el corte previo; no se repitió ni se convirtió en aprobación del código futuro. No tests UI o API repetidos por un cambio documental. Rollback: revertir únicamente este documento/checkpoint preservando evidencia y archivos ajenos. No cambio externo del producto que revertir.

## Checkpoint histórico: ejecución de modelos y antiguo límite del registro

Este corte histórico queda documentado en el [recibo de ejecución del 9oct](../reviews/RECOVERY_MODEL_EXECUTION_2026-10-09.md). Diseño Fable5.1 ejecutado/completado y lease liberado. Opus5.5 ejecutó el encargo inicial, se detuvo por falta de contexto de la inspección en su contrato y no escribió código; el host comprobó archivos ausentes. Contexto corregido y precisiones de Astra preparados. En ese momento el registro tenía64asignaciones y rechazó el candidato65con `registry entity limit`. La [propuesta64→128](../reviews/KIT_REGISTRY_CAPACITY_REQUEST_2026-10-09.md) quedó superada por la activación posterior de100,000. El diseño local de recuperación es sólo parte de S3.

## Siguiente trabajo vigente

Registrar y ejecutar el encargo corregido de Opus5.5 con el módulo real de inspección como contexto, conservar la evidencia y los intentos previos, verificar recuperación desde un archivo con origen apagado y pedir revisión de solo lectura a Astra6. Fable5.1 ya entregó el diseño de ese bloque; se reutiliza para arquitectura y wireframes de los flujos pendientes. El cierre de cada sprint exige el recorrido y las pruebas de su tabla, no un número de encargos del kit. La activación del kit no equivale a calibración económica, aceptación de OAuth ni despliegue del producto.

El [bloqueo anterior de admisión](../reviews/RECOVERY_CONTEXT_ADMISSION_BLOCK_2026-10-09.md) quedó resuelto y el encargo corregido se ejecutó. El supervisor abortó por una línea mayor que65536caracteres, sin código ni pruebas; cierre y lease liberado confirmados. La [revisión Opus/Astra y propuesta de perfil](../reviews/RECOVERY_OPUS_ASTRA_FRAME_REVIEW_2026-10-09.md) recomienda opt-in concreto para inline-medium-v1 en un nuevo encargo del mismo problema. Elección pendiente; no modificar la release ni relanzar automáticamente. El plan de tres sprints se conserva.

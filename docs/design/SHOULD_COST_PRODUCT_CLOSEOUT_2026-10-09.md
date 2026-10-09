# Should-Cost Engine: cierre del producto modular

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

## Bloque inmediato y admisión del kit

Primera ejecución pendiente ya preparada: recuperación aislada con diseño técnico Fable, implementación Opus y revisión Astra. Cuatro requisitos adjudicados: fijar IDs/contexto Docker; recuperar desde archivo persistido con origen apagado; manifiesto limitado de roles/settings; rechazo previo de objetos sin cobertura. Encargo de diseño sellado en el kit, sin inferencia Claude iniciada.

Observación actual2026-10-09T22:11:43Z: release activa/cargada personal-usage-20261009T153439Z, user_managed, sin restart requerido ni active.lock. Los tres registros de marksman-investors-narrative que bloqueaban antes ya no aparecen en la validación. Ahora closed() rechaza marksman-loads-quickpay:s6-delivery:fable-design, opus-implementation y opus-implementation-medium con closure/lease unconfirmed. Sólo se consultaron metadatos del validador; no sus prompts, sesiones o datos. Ausencia de active.lock no demuestra cierre de leases/resultados.

La creación de un ledger exige inventario global cerrado en policy_budget.py:260–261; por ello encargos ajenos impiden admitir el bloque FCM. No es agotamiento de cuota ni falta de elección del usuario. No se relanza authorize contra el mismo estado, cancela procesos ajenos, altera manifest/guardas ni usa ruta sin ledger para eludirlo. Cierre debe acreditarse mediante mecanismo soportado en los encargos propietarios. Una modificación del validador/globalidad del kit sería otro alcance, con tests y activación propios.

## Límites del corte

Entregado: conciliación vigente, plan finito de producto y continuidad del encargo preparado. No nueva implementación Opus, diseño Fable ejecutado, publicación, calibración, fuentes actualizadas o aceptación económica/auth certificadas. Astra revisó estáticamente el transporte anterior en el corte previo; no se repitió ni se convirtió en aprobación del código futuro. No tests UI o API repetidos por un cambio documental. Rollback: revertir únicamente este documento/checkpoint preservando evidencia y archivos ajenos. No cambio externo del producto que revertir.

## Checkpoint posterior: ejecución de modelos y siguiente dependencia

El estado anterior queda histórico, sustituido por [recibo de ejecución del 9oct](../reviews/RECOVERY_MODEL_EXECUTION_2026-10-09.md). Diseño Fable5.1 ejecutado/completado y lease liberado. Opus5.5 ejecutó el encargo inicial, se detuvo por falta de contexto de la inspección en su contrato y no escribió código; el host comprobó archivos ausentes. Contexto corregido y precisiones de Astra preparados. El registro del kit ahora tiene64asignaciones y rechazó el candidato65con registry entity limit; reencargo no registrado/lanzado. Propuesta concreta de [ampliación técnica64→128](../reviews/KIT_REGISTRY_CAPACITY_REQUEST_2026-10-09.md) pendiente de autorización específica. No es cuota Claude, ni falta de elección del usuario. S1/S2/S3 permanecen abiertos; el diseño local de recuperación es sólo parte del gate de release.

# B3: ejecución QA con diagnóstico de fases

Autoridad humana: «autorizo» en respuesta a una ejecución QA de45min/un guardado con registro de fases y cierre al terminar/fallar. Registro real 2026-10-05T19:04:16Z; límite19:49:16Z (13:49:16 Ciudad de México). No se resetean OPTIMIZED ni intentos anteriores. TRACE requiere OPTIMIZED cerrado/NOLOGIN/0sesiones y2eventos previos; no admite su propio marcador como antecedente.

Mismo QA/base/versión/rol/grants, máximo un nuevo PUT de planeación; recuperación/replay/cold-readback/reinicio dentro de la misma activación sólo tras guardado confirmado. Sin Auth, producción, migraciones, usuarios, fórmulas o importes. Ante fallo no reactivar ni repetir escritura incierta. Controladores con tty:true para cierre normal check/stop.

Benchmark y contrato reutilizados: B3_TRANSACTION_PHASE_DIAGNOSTICS_2026-10-05.md. Sólo nuevo modo finito y propagación de plazo al lector independiente. OpenAI/Codex ejecutor, recomendado GPT-6.1 Sol/high; observados desconocidos, sin Claude/subagentes/IAnegocio. Cupo finito45min/1activación/1guardado nuevo; cuota y consumo nativo no observados. Referencia documental auditable, no autenticación criptográfica del consentimiento.

Pruebas previas:14/14 de gate y fases. Tipos focales y resultado real se registran al cierre. Rama codex/cost-tires-release-s14/HEAD4f5fc2de0c3d178dace917231e1092040dec21fd comprobados en D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927.

Rollback: cerrar procesos propios, desconectar runtime y NOLOGIN/0sesiones; conservar cualquier evento auditado, intentos anteriores y evidencia. Retirar sólo los hunks TRACE/helper/test/lector/web si se solicita. No reset ni eliminación de datos.

## Preflight

Tipos focales exit0;14/14tests gate/fases exit0. Web86455/pid43148 arrancó con tty:true. Primer preparador60008 se detuvo en verify-preview-target por ETIMEDOUT del CLI, antes de conexión/activación/escritura. Comprobación READ_ONLY independiente28453 terminó exit0: rolOPTIMIZED/NOLOGIN/0sesiones, metadataEvents2, permisos inesperados[], secuencias0/definers0. Configuración Preview volvió a responder, por lo que se continuó dentro de la misma ventana/cupo, sin reset de intentos. CLI instalado54.4.1; se deshabilitaron telemetría y aviso de actualización sólo en el proceso de continuación27709 mediante variables ya soportadas por su código. No se atribuye el timeout a esas funciones; causa de latencia externa no aislada. Sesión browser local sales@heymarksman.com visible.

## Resultado real y cierre

Una activación TRACE y un guardado nuevo consumidos. Preflight verificó fuente210/hash, QA existente, usuarios y privilegios limitados; runtime anónimo401/fuera de alcance403. ADMIN existente abrió planning; GET200 total2544ms (identidad891/handler+respuesta1653). NETWORK_EXPECTED_EMPTY_PROXY/CASH/2026-09-30/RATE_EXCLUDES_WEEKLY_REST mostró CFU1115.61/CVU4326.71/total5442.31USD,88fuentes/0adopciones.

**PUT guardó revisión1 y confirmó commit**. Interfaz mostró «Cálculo guardado con su escenario, fuentes y supuestos» y revisión1 a13:13:46 Ciudad de México. No screenshot de ese instante: evidencia AX y log real, no sustituirla por la captura posterior de error. TraceId64d0895d-efdd-468a-9ada-b2896dd61f20:

| Fase | Duración observada ms |
|---|---:|
| Adquisición | 97 |
| Lock organización | 195 |
| Lock versión | 186 |
| Lectura validada | 619 |
| Validación comando/cálculo | 6 |
| Append | 915 |
| Commit/resolución | 96 |
| Total transacción | 2117 |

Pequeña diferencia entre suma y total corresponde a redondeo y límites de medición. No métrica de throughput ni garantía de latencia futura. P2028 no se reprodujo en este guardado; causa de anteriores expiraciones/NOT_FOUND aún no demostrada.

Control replay con el mismo recibo: adquisición108ms, locks103+103ms; falló en lectura a1164ms totales/849ms fase, código inicial UNKNOWN. No alcanzó append/commit de replay. El controlador cerró automáticamente **exit0, NOLOGIN/0sesiones**, metadataEvents3, sourceIntact/usuariosIntactos/parámetros-perfil-calibración-estado intactos y hashQA dc45b03c932f830dc77d65062f14b0ce4ad09d631d94e4f164e72eb6ec89e05c. Recarga del navegador mostró error de workspace durante este cierre: no atribuir su captura exclusivamente a la comparación de datos, pues la API se estaba cerrando. [Captura real posterior](B3_TRACE_RECOVERY_FAILURE_2026-10-05.png).

Web se cerró con stop víaTTY: taskkill propio pid43148 status0, childexit1 esperado, controlador exit0. No procesos ajenos detenidos. No reactivación TRACE. No cold-readback/reinicio HTTP/aceptación responsive, ni replay exitoso.

## Diagnóstico READ ONLY del registro existente

Después del cierre se ejecutó diagnose-b3-stored-planning.ts usando conexión administrativa únicamente dentro de transacciones READ ONLY, mismo target verificado, plazoTRACE, marcadorTRACE/NOLOGIN/0sesiones obligatorios. Sin recrear runtime ni suplantar una sesión autenticada: diagnóstico con owner no cuenta como aceptación del rol limitado. Tres lecturas progresivas exitosas (schema/causa, diferencias, transporte textual), no escrituras ni reintentos de guardado.

Resultado: metadata3/planeación1, schema válido, rechazo **PLANNING_RESULT_CORRUPTED** al comparar snapshot persistido con lector B2. Nueve importes difieren sólo en precisión flotante. Ejemplos públicos:

- case.resources.1.cvuUsd: persistido1922.089706245089 / esperado1922.0897062450886.
- case.outputs.cfuUsd: persistido1115.609272121467 / esperado1115.6092721214666.
- case.variableCosts.5.amountUsd: persistido18.83365343519681 / esperado18.833653435196812.

También diferencias en variableCosts índices6,7,9,14,16,18. No ceros negativos. Desviación máxima observada aproximadamente4.55e-13USD. Sólo difiere el objeto case; comparación estricta de resto de propiedades coincide. `payload::text` + JSON.parse también difiere del cálculo esperado: lectura textual por sí sola no resuelve la representación ya persistida. No se aisló qué componente de escritura/transporte produjo la variación; no atribuir un bug concreto a Neon/PostgreSQL/Prisma sin otra prueba.

Diagnóstico concreto de recuperación: isDeepStrictEqual rechaza la representación decimal retornada/persistida. Esto es distinto de la causa no reproducida de P2028. No se relajó la comparación ni se modificaron fórmulas/valores/evento. La investigación sólo imprimió caminos y números del benchmark público, nunca secretos/payload completo/identidad/SQL.

## Siguiente corrección y criterio de cierre

B3 sigue abierto, con **guardado real conseguido** y recuperación/replay pendientes. Reutilizar esta revisión1; no necesita un segundo guardado para diagnosticar recuperación. Comparar una representación canónica persistible con preservación exacta frente a normalización estrictamente acotada al transporte; no introducir tolerancias económicas generales ni borrar el evento. La alternativa de lectura textual ya fue descartada con evidencia. Primero reproducción local de los nueve pares y prueba de que cambios económicos reales siguen rechazados; luego verificación READ ONLY del mismo registro. Nueva activación del rol o escritura exige enmienda explícita; TRACE no se reutiliza.

No se declara B3 cerrado ni release verde. Las pruebas previas14/14 y tipos siguen vigentes para los hunks de gate; diagnóstico focal se comprueba al cierre. Los demás94tests pertenecen al corte local previo. Sin deployment/Auth/usuarios/migraciones/adopción/IAauxiliar. Conservar el evento y evidencia en rollback.

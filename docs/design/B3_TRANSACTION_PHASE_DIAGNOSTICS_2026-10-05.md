# B3: diagnóstico local por fases

## Resultado y límite

Guardado instrumentado y probado localmente; causa real de P2028 aún no aislada. No conexión DB ni reactivación QA en este corte. OPTIMIZED sigue cerrado/consumido. Puertos3001/3002 sin listeners durante la inspección local.

Objetivo: que una futura ejecución admisible distinga adquisición, lock de organización, lock de versión, lectura con validación del historial, validación del comando/cálculo, append y confirmación. La fase commit mide desde el retorno del callback hasta resolución/rechazo de $transaction; no es medición SQL directa. La fase read agrupa la carga validada de wizard y registros B3, sin atribuir su duración a una consulta individual.

## Revisión previa y decisión

Se reutilizó el benchmark del corte B3_TRANSACTION_READ_CONSOLIDATION_2026-10-05.md y se inspeccionaron versión5.22, singleton config/prisma.ts, servicio B3, callback, locks, lector económico y cierre del launcher. No hay $disconnect dentro de save ni otra llamada $transaction dentro del callback: el wizard recibe work=>work(tx). El lector B2 usa snapshot empaquetado, sin fetch ni investigación en runtime. Eso descarta esas causas explícitas en el código inspeccionado, no demuestra la causa del fallo externo.

Opciones: logging SQL de Prisma (innecesario para ubicar fase y expone más contexto); repetir guardado/cambiar timeout (sin evidencia causal); observer de fases opcional con campos cerrados (elegido). Sin nueva dependencia, proveedor, infraestructura ni cambio metodológico. engineering:debug orientó aislamiento y fallos simulados antes de otra ejecución.

## Implementación y contrato

planning-transaction-trace.ts envuelve la transacción existente; version-planning.ts marca pasos. start-w2-authenticated-gate.ts instancia el mismo factory con runtime limitado y WIZARD_TRANSACTION_OPTIONS existentes; únicamente ese launcher suministra el observer de consola. Servicio normal conserva observer ausente. No cambian respuesta HTTP, permisos, cálculo, locks, timeout, idempotencia ni número de transacciones.

Cada evento contiene nombre fijo, traceId aleatorio independiente de datos, fase, estado start/ok/error, milisegundos y código Prisma allowlisted o UNKNOWN. Sin identidad, requestId de negocio, SQL, error.message/meta, entradas, resultados, tokens ni valores económicos. No retries; se propaga el mismo objeto de error. Fallo síncrono del observer no cambia resultado de negocio. El observer configurado es síncrono y sólo escribe JSON a stdout.

Pruebas finales: **94/94 en7archivos exit0**, tipos focales de servicio/launcher/helper/tests exit0. Cobertura: adquisición vs fallo de lock vs rechazo después del callback (commit), duración sintética determinista, redacción de errores, sink que falla, ruta sin observer, guardado real del módulo con fixture y replay sin append. No equivalen a transacción PostgreSQL real. Primera comprobación de tipos detectó mock no genérico; se corrigió el test y se repitieron verificaciones afectadas. Sin build global ni aceptación UI nueva.

## Autoridad, modelo y siguiente paso

Petición humana «continua» tras entregar bloqueo y recomendar diagnóstico local. Ejecutor Codex en sesión existente; recomendado OpenAI GPT-6.1 Sol/high; modelo/esfuerzo efectivos no observados. Sin Claude/subagentes/inferencia externa; cuota/tokens/cargos nativos desconocidos. Corte local hasta60min, cero escrituras externas y sin nuevo cupo QA. Fuente de autoridad explícita del usuario, sin activar política de selección global.

Trabajo en D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd verificados. Cambios ajenos preservados. Sin nuevo branch/worktree/deploy.

Siguiente aceptación propuesta: nueva ejecución QA finita con un único guardado, mismos IDs/rol/permisos, registro de fases, recuperación/replay sólo si guardó, y cierre obligatorio al terminar/fallar. Requiere enmienda humana porque OPTIMIZED se consumió y cerró tras el fallo; este corte no agrega modo/fecha/marker de reactivación. Lanzar controladores con tty:true y comprobar stdin para disponer de check/stop; mantener cierre de recuperación existente. No aumentar timeout ni repetir un guardado incierto.

Rollback: retirar observer del launcher y volver al factory de servicio previo; revertir sólo wrappers de fases/tercer argumento en version-planning.ts y retirar helper/pruebas nuevas cuando no tengan consumidores. Conservar consolidación previa, reglas económicas, eventos, gates cerrados y evidencia. No rollback de datos: no escrituras DB en este corte.

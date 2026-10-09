# Coordinación y comprobación de login: entrega local

Origen: HEAD 0e143d3f66e6a61007835d27144b14a1ca5d1ada, rama codex/cost-tires-release-s14, worktree D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927. Tracked limpio al inicio; 45 artefactos ajenos sin versionar conservados. La ruta C:/Users/andre/.codex/AGENTS.md no existe; se leyó la copia vigente en D:/andre/apps/codex-home y la instrucción suministrada por el usuario.

## Qué cambia

Antes había empaquetado y ejecución Docker comprobados, sin coordinación reutilizable ni evaluador de aceptación de las dos cuentas. Ahora hay dos módulos y una CLI offline:

- `superviseHistoricalTransition`: diario durable por target, contrato fijo, inspección antes/después de backup, restauración coincidente, aplicación por adaptador, verificador histórico existente y comprobante de esquema. Conserva reserva ante fallo; una referencia humana distinta no permite relanzar en la misma raíz. Replay completo devuelve evidencia guardada, con orden y reloj verificados.
- `evaluateCutoverLoginAcceptance`: contrasta observaciones con expectativa separada de release/membresía. El esquema estricto rechaza campos adicionales como tokens. No confunde simulación con observación ni verificación de evidencia con login ejecutado.
- `check-cutover-login-evidence.ts`: lee dos JSON locales limitados a 128 KiB, devuelve sólo estado/códigos y exit 0/1. No lee .env, no abre navegador ni red. Desde apps/api: `node --import tsx scripts/check-cutover-login-evidence.ts <expectativa.json> <evidencia.json>`.

La [ADR-012](../architecture/ADR-012-historical-transition-coordination.md) contiene alternativas, contratos y límites. No cambia la UI, por lo que no se requiere un wireframe nuevo. No se llamó al API real ni se usaron identidades o importes privados en las pruebas.

## Verificación

Rojo inicial observado en ambos módulos: imports ausentes antes de implementación. Ensayo del coordinador con puerto simulado y archivos reales: exclusión simultánea, target/release/autoridad divergentes, evidencia vieja, mantenimiento insuficiente, cambios de inventario, restauración diferente, historial/importe alterados, drift extra, vencimiento y replay. Prueba con reloj simulado confirma que un adaptador colgado recibe cancelación y conserva la reserva.

La aceptación incluye pruebas de secuencia, renovación, callback, roles/tenant/sujeto/ID, cambio de cuenta, logout, rechazo de usuario excluido, permisos VIEWER y campos secretos. Pruebas del proceso CLI con archivos sintéticos comprueban observaciones completas (exit 0), simulación (exit 1) y entrada inválida (exit 1). Que una fixture se etiquete OBSERVED sólo prueba la rama del programa; no acredita un login real.

Verificación final: **141/141 pruebas, 8 archivos, exit 0, 43.08 s**. Incluye 21 del coordinador, 23 de aceptación/CLI y regresiones del empaquetado, planes, membresía y alcance. TypeScript estricto (ES2022/NodeNext) de los cinco archivos nuevos de código/pruebas: exit 0. No suite completa API/Web, build productivo, PostgreSQL real ni OAuth real repetidos en este bloque; los nuevos módulos son offline y no se importan desde runtime.

## Modelos, alcance y recuperación

Fuente: solicitud humana de continuar los siguientes bloques de desarrollo. Sesión nativa OpenAI/Codex; recomendación Sol 6.1 / high. Modelo exacto servido y esfuerzo efectivo no verificados; no se cambió modelo mediante CLI. Claude es un candidato equivalente para revisión, pero aquí requeriría otro encargo y contexto; la lógica es verificable con pruebas y se conserva la sesión. Sin llamadas a Claude o subagentes ni cambios al ledger anterior. Cuota, tokens y cargos efectivos de sesión desconocidos. Presupuesto de trabajo: 40 minutos; cero reintentos externos, cero activaciones de gasto.

Skills arquitectura y TDD orientaron contratos/pruebas de frontera; code-review orientó revisión propia de cancelación, replay y redacción. No hubo una nueva revisión independiente. Ninguna skill causó una pausa o solicitud de permiso.

Rollback local: revertir exclusivamente el checkpoint de estos archivos, preservando trabajo ajeno. Los directorios sintéticos `fcm-supervisor-test-*` y `fcm-login-cli-*` de D:/andre/validation conservan diarios/fixtures; no contienen credenciales reales. No se abrió Docker ni se hicieron operaciones sobre bases reales, producción, Auth o valores económicos.

## Pendiente concreto

El adaptador remoto aún no está implementado/conectado: faltan transporte con credenciales del entorno autorizado, exclusión durable en destino, mantenimiento y respaldo/restauración reales. Este bloque entrega el coordinador probado con simulación, no un ejecutor productivo completo. Tras conectarlo y validarlo: promover API/Web del mismo commit, aplicar la membresía preparada en el orden aprobado y capturar OAuth real de sales/JG con recarga/renovación y permisos. No se amplía el alcance de acceso a autores históricos ni se modifica el Site URL compartido.

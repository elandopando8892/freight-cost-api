# B3: recuperación autenticada y cierre del acceso QA

## Autoridad, alcance y benchmark

Respuesta humana «autorizo» a una activación adicional de hasta45min para recuperar revisión1, replay sin duplicados y recarga/reinicio. Registro de ventana2026-10-06T01:41:29.343Z →02:26:29.343Z (5oct2026,19:41:29 →20:26:29 Ciudad de México). Una activación adicional, cero guardados nuevos, sin resetear TRACE/OPTIMIZED/FINAL ni sus intentos. Los hashes y referencias documentan; no autentican criptográficamente el consentimiento.

Revisión proporcional: reutilizados launcher acotado, middleware de usuarios existentes, lector independiente y contrato/wireframe B3. Alternativas: owner READ ONLY ya demuestra recuperación pero no sesión real; nuevo preview/infraestructura añade superficie sin necesidad; sesión local+BFF+rol limitado existente permite aceptación y cierre con menor cambio (elegida). Sólo ampliación finita del gate QA; no cambios del producto, DBschema, Auth/Google, producción, usuarios, grants, fórmulas/importes ni IA de negocio.

Codex/OpenAI ejecutor único, recomendado GPT-6.1 Sol/alto, nativos efectivos desconocidos. Claude considerado y no necesario para un flujo existente directamente verificable; cero Claude/subagentes. Cuota/tokens/cargos nativos desconocidos. Presupuesto45min/1activación/0nuevo append/0reactivación automática; cerrar al terminar, fallar o vencer. Skills test-driven-development y verification-before-completion aplicadas: dos pruebas nuevas fallaron primero por ausencia de las guardas, luego30/30tests gate/planeación y tipos focales estrictos pasaron antes de activar. Computer-use guio observación de la interfaz real.

## Implementación del gate

Nuevo modo --b3-recovery-validation-authorized sólo admite predecessor TRACE/NOLOGIN/0sesiones, mismo hash QA y3eventos. No acepta su propio marcador como antecedente. Recupera y valida único PlanningRecord/revisión1 y reconstruye recibo estricto en memoria. PUT de planeación admite exclusivamente mismo actor/org y cuerpo exacto; comandos nuevos/otra UUID/cambios de nota/revisión/cuenta rechazados antes del save. El replay usa los locks y validación habituales y no alcanza append. Inventario de cierre exige exactamente3eventos, además de invariantes anteriores. Se conserva el mismo rol/grants, credencial efímera sólo memoria y plazo VALID UNTIL; sin almacenar tokens/credenciales.

Archivos: scripts/lib/b3-saas-gate.ts, start-w2-authenticated-gate.ts, start-b3-local-web.ts, b3-cold-readback.ts y test b3-recovery-gate.test.ts. Rama codex/cost-tires-release-s14/HEAD4f5fc2de0c3d178dace917231e1092040dec21fd en D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927. Trabajo ajeno preservado, sin rama/worktree/commit/deploy nuevos.

## Evidencia real

API/controlador61882, Web/controlador18030/pid38612. Preflight verificó fuente210/hash47a5bf5ea3571cad8b0c40a15b3715c93d0ab6ab93e1c9ad529f0e7270076346, QA210/hashes, usuarios intactos y grants existentes. Anonymous401/out-of-scope403. Única activación RECOVERY confirmó existingPlanningRecovered:true/revision1/newPlanningCommandsAllowed:false.

- Sesión ADMIN existente visible en interfaz, sin login/configuración Auth nuevos. GETplanning200, recuperación por botón y recarga posterior conservaron revisión1, nota y selección NETWORK_EXPECTED_EMPTY_PROXY/CASH/2026-09-30/RATE_EXCLUDES_WEEKLY_REST. Total5442.31USD redondeado, CFU1115.61/CVU4326.71,88pins/0adopciones. [Captura real](B3_RECOVERY_AUTHENTICATED_2026-10-05.png).
- Replay por control stdin del mismo recibo/actor contra rol limitado real: realPlanningReceiptReplay:true/revision1, metadataEventsBefore3/After3. Trace83bd149f-cb85-4358-80db-1ce14200f0bf,1500ms, no fase append. **No segundo PUT autenticado HTTP**: el replay es prueba real de persistencia/recibo, no otra autenticación. La recuperación de navegador sí pasó por sesión/BFF/middleware.
- cold: hijo independiente con credencial limitada por stdin, transacción READ ONLY, revisión1, costo completo5442.314491632507, fullViewSha256146240d4557daa3804b039bb4237dd40940878d82e2e9939436692801bddc3e06 igual al padre.
- restart: reinicio del servidor HTTP dentro del mismo controlador/cliente limitado, invariantes intactas, anonymous401/out-of-scope403 de nuevo; recarga del navegador recuperó revisión1. El proceso independiente anterior prueba recuperación fuera de memoria del servicio. No se afirma cold restart completo de la máquina ni del proveedor Auth.
- UI: breakpoint390px CSS confirmado root/clientWidth390/scrollWidth390; tabla con scroll propio, foco por Tab y scrollLeft>0 mediante ArrowRight. [Captura390](B3_RECOVERY_MOBILE390_2026-10-05.png). La capacidad viewport inicial pidió390 pero devolvió520px; ese intento se documenta y no cuenta como390. CDP emuló luego390 y1280px CSS, ambos sin overflow global observado; recuperación por Enter en escritorio pasó. No auditoría WCAG exhaustiva. Viewport/emulación restaurados y pestaña propia cerrada.
- GETplanning observados200:1827ms,1124ms,1052ms,1201ms y1449ms. No garantías de rendimiento futuro.

## Cierre y límites

stop API exit0: parámetros/perfil/calibración/estado intactos, sourceIntact:true/usersIntact:true/metadataEvents3/hashQAdc45b03c932f830dc77d65062f14b0ce4ad09d631d94e4f164e72eb6ec89e05c, temporaryRoleDisabled:true/remainingRoleSessions0. Web stop pid38612/status0/ownNextExitVerified exit1 esperado por taskkill, controlador exit0. Sin listeners3001/3002 observados al cierre19:49:24. Ningún evento añadido/borrado, no adopción de inputs.

El recorrido funcional B3 de planeación tiene guardado real anterior y ahora recuperación autenticada/recarga/replay/cold-readback/reinicio reales. Casos otras cuentas/tenant/vencimiento/concurrencia permanecen comprobados con fixtures previos, no cuentas humanas adicionales. Renovación OAuth no fue ensayada ni cambiada. No confundir el cierre de este recorrido QA con calibración de210inputs, precio de venta, promoción o aceptación productiva.

Suite API completa (vitest run, mismo comando del script test) terminó exit1: **207 archivos pasan/3 fallan/4 omitidos;3238tests pasan/2fallan/25omitidos**,214archivos/3265tests; inicio19:44:50/duración465.10s. No release verde. Fallos exactos:

1. tire-calibration-rls-postgres.test.ts: guard de colección exige FCM_TEST_ADMIN_DATABASE_URL apuntando a loopback/fcm_tire_s8 desechable. No se proporcionó ni creó esa base; falla antes de conectarse/ejecutar tests. No usar Neon QA como sustituto.
2. quote-preview-create-route.test.ts, «binds capture, resolved legs, FX, policy and benchmark to the same tenant preview»: esperaba200, obtuvo422. Causa no aislada en este corte; no modificar economía ni fixture sólo para volverlo verde.
3. dashboard-state.test.ts, «keeps a valid empty response distinct from an API failure»: esperaba error.status500, recibió status:null/kind:UNKNOWN. Requiere conciliar contrato de errores/fixture con evidencia.

Estas rutas no se editaron en este corte. No se comprobó una baseline previa de toda la suite, por lo que no se afirma que los fallos fueran preexistentes. Los demás25tests omitidos requieren entornos de integración.30/30focales B3 y TSC estricto de launchers/lector pasaron después del último cambio de código. git diff --check focal exit0, aunque estos scripts nuevos/untracked no forman un diff tracked; tipos y ejecución real cubren su sintaxis y recorrido. No build completo ni CI/deploy.

## Rollback y siguiente paso

Gate consumido/cerrado; no admite reactivar RECOVERY. Retirar únicamente hunksRECOVERY y test nuevo si se solicita, preservando trazas, eventorevisión1 y todos los intentos/hunks previos. No reset ni eliminación de datos. Cierre de rol verificado, sin leases/procesos propios pendientes.

Siguiente: conciliar los gates B4 de release y fallos de suite completa por causa y alcance, sin otra activación QA por defecto ni extender este permiso. La planeación no equivale a calibración operativa ni a nueva autorización de producción.

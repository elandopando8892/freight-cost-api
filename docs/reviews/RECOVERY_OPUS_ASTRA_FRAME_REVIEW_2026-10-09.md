# Recuperación aislada: ejecución Opus y revisión Astra

9oct2026, Ciudad de México. Continuación humana: «ya termino la otra sesion, adelante continua con Opus y la revision de Astra». Mismo checkoutD:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD31e2f7553b13fbd1f984b0e226bf134eaad7fc54. Trabajo documental anterior y45artefactos ajenos preservados.

## Admisión y corrección del ayudante

La nueva planificación P2 revision61→62 y su apply completaron; sólo agregaron implement-isolated-recovery-context-fixed. Adición de scope aplicada sobre el mismo ledger, sin reset, expiración o modelos nuevos. Autoridad resultante e4139637c4c86ca08e6a8ecae9890de4d1556b0026acb773334c9e8fe809d73f. Archivos/recibos en D:/andre/validation/fcm-recovery-context-VY4qUu.

El primer apply de scope rechazó `policy/authorization hash mismatch`. El ayudante externo convertía la respuesta sellada de Python a números JavaScript: cambió creation_ticks134360578337533982→134360578337533980 y134360582131454448→134360582131454450. Se corrigió únicamente D:/andre/validation/fcm-kit-command-20261009.mjs para guardar stdout original, sin reserializar. El plan nativo regenerado pasó y dejó receiptcomplete. No cambio de validador/hash/guardas de la release, ni edición manual del ledger. Los archivos anteriores se conservan como evidencia.

Una primera preparación MCP encontró ocupación temporal del registro; readback confirmó job ausente. Tras espera acotada, prepare completó. Atestación c90a94f12ae1cc971b9f8af687e0eb9e7b19605631f85489a8963d726ce8a3c1. Contrato9d2020dc0cd2b5b9c4d69300ddafc679fa8a9a56b655a6379db821222949d503, choicec133e8211aa84fb5ac5689da59762516, clavefcm-isolated-recovery-context-fixed-20261009. No se usó la preparación fallida como prueba de lanzamiento.

## Resultado real Opus

Run40a48f58dd9e42dba9a05979dedb56a2, sesión47f69981-4b7a-484a-bcc8-ecb49a13df41. Modelo solicitado/observado claude-opus-5-5; high solicitado, efectivo desconocido. Ruta firstParty/claude.ai/Max; billingguard reutilizó últimoOFF conocido ligado a la cuenta, no observación en vivo. No API fallback ni gasto extra activado.

Inicio confirmado; duración463.672s. El proceso terminó abortado por `output_limit`, line_limit_exceededtrue, stream_limit_exceededfalse y timeoutfalse. Se observaron65537caracteres frente a65536permitidos. Es el fragmento de lectura acotada, no la longitud íntegra de la línea original. Total144723bytes,70764presupuestados y73959de progreso excluidos; techo total2097152. La línea rechazada no se conservó ni interpretó como objeto completo. Se desconoce si contenía razonamiento, código u otro contenido;374eventos thinking_tokens anteriores no lo demuestran.

Returncode0 no acredita éxito: no hay resultado final CLI. Cierre confirmado processes_closedtrue/helper_reapedtrue/job_closedtrue/lease_releasedtrue. Cambios[], pruebas host[], callbacks/records nativos[]; los dos archivos nuevos siguen ausentes. Uso, tokens, estimación monetaria, cuota y cargos desconocidos. El intento y su reserva permanecen contados; no se reportan consumo cero ni pruebas de recuperación.

Todas las páginas de claude_result leídas:9108bytes, next_cursornull. El error genérico inicial «cause unknown» queda precisado por la evidencia de proceso anterior, sin inventar el contenido del frame.

## Revisión Astra entregada

Revisión explícita gpt-6-astra/high, agenteastra_recovery_frame_review, sólo el breve sanitizado suministrado, sin herramientas, escrituras, pruebas o red. Modelo solicitado por la superficie; esfuerzo efectivo, consumo y duración no expuestos. Confirma aborto por línea, no timeout/stream; mantiene desconocidos contenido y consumo. No revisión de implementación inexistente.

Recomendación adjudicada: usar el perfil existente inline-medium-v1 con opt-in humano concreto, conservando problema/modelo/contexto/rutas. Dividir código puede organizar trabajo, pero no limita todas las líneas emitidas por CLI y no demuestra que evite este incidente. No modificar la release compartida. La aprobación debe describir todos los límites del perfil y el cambio de medición raw_bytes, no sólo aumentar una línea.

## Propuesta concreta pendiente de elección humana

Un nuevo encargo, mismo problema, Opus5.5/high y mismas dos rutas. Se reutiliza el diseño Fable; Astra revisará el código cuando exista. Contextos: contrato adjudicado e inspector real (18881bytes físicos combinados); max_prompt_bytes se mantiene24000,60pasos, un lanzamiento, cero reintentos automáticos, respuesta final breve. Tiempo propuesto30min: las dos ejecuciones Opus medidas consumieron35.36+463.672=499.032s del bloque45min; quedan2200.968s(36min40.968s). No se renuevan tiempo, vigencia ni consumo anteriores.

| Límite del perfil | legacy-small-v1 actual | inline-medium-v1 propuesto |
| --- | ---: | ---: |
| Techo de prompt |24000bytes|262144bytes; petición conserva24000|
| Archivo de contexto |24000bytes|131072bytes; mismos dos contextos|
| Archivo escribible / operación de escritura |65536bytes|262144bytes; mismas dos rutas|
| Línea del stream |65536caracteres|2097152caracteres|
| Salida total supervisada |2097152bytes|8388608bytes|
| Medición del flujo |texto con normalización de saltos|raw UTF-8; raw_bytestrue|

Es un perfil de transporte/contexto, no esfuerzo medium del modelo. El catálogo o la presencia del perfil en disco no lo autorizan: context_profiles.enabled exige inclusión en la autoridad y devuelve `context profile requires human opt-in` en otro caso. No se ha agregado el perfil al scope ni lanzado otro run. Elegirlo no prueba cuotas disponibles ni garantiza éxito/menor consumo.

Antes de lanzar: enmienda aditiva trazable de context_profiles y task, P2, revisión/atestación del mismo contexto, elección nueva, comprobación de cuenta/facturación y escritor único. Tras resultado válido: inspección de archivos, prueba con origen apagado, verificación de datos/secuencias/ACL/roles y revisión Astra. Un segundo bloqueo por la misma causa detiene el trabajo. No se resume automáticamente la sesión abortada.

## Verificación y limpieza

Tres tests offline de la release existente PASS,2.055s, sin inferencia ni modificar el paquete: progreso no evade límitelegacy; líneas900000/900001aceptadas bajo medium; frontera2097152aceptada y2097153rechazada, con cierre de procesos. Se usaron CLI sintéticas y temporales en D:/andre/validation. Prueban el supervisor, no una ejecución Opus futura ni recuperación PostgreSQL.

Fixtures propias creadas con imagen local PostgreSQL16-alpine y endpoints loopback; ambas aceptaron conexiones. No se ejecutó el ensayo de recuperación porque falta implementación. Tras comprobar ID/name/label se detuvieron y retiraron únicamente source646034b2438ba70f1f3816d43aa2e8138985a50b21e4ec2c86cc12672a0140b6 y target61a508e53023348c31b042b86d295d918b08d2684f90faa5d39fbef28a6f23d7, con sus volúmenes anónimos vacíos. Se pueden recrear; no contenían datos de negocio. Recibos y propuesta permanecen en D:.

git diff --check pasa. Sin implementación nueva, pruebas del motor, bases reales, Auth, economía o despliegue en este corte. Rollback documental: retirar sólo este recibo y su referencia si se solicita; conservar historial/ledger, registros cerrados, contextos y trabajo ajeno. La recuperación y S3 permanecen abiertos.

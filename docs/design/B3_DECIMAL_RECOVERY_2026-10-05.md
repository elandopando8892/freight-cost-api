# B3: recuperación decimal del registro existente

## Objetivo y alcance

Recuperar revisión 1 ya guardada sin duplicarla, sin modificar el evento, parámetros, fórmulas, importes económicos, Auth, usuarios o producción. Corte local autorizado por «continua con el siguiente trabajo». Checkout D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd comprobados antes y después. Worktree con cambios previos conservados; sin nueva rama, commit ni deploy.

Benchmark proporcional reutilizado y verificado: [diagnóstico real previo](B3_TRACE_QA_EXECUTION_2026-10-05.md), contrato RelayResponse y lector B2 existente con snapshot inmutable validado por SHA. No nueva infraestructura ni librería.

| Alternativa | Evidencia y costo | Decisión |
|---|---|---|
| Leer JSONB como texto | Ya probado: mantiene las nueve diferencias persistidas | Descartada |
| Nuevo contrato con decimales como strings | Más cambios en API/web y compatibilidad del registro existente; no corrige por sí solo el histórico | No necesaria para este corte |
| Comparar representación binaria sólo en USD derivados y devolver snapshot verificado | Sin escritura, consulta adicional, cambio de contrato ni dependencia | Elegida, con límites explícitos |

La capacidad estándar es comparación de representación IEEE-754; no se reconstruye el motor. La autoridad económica sigue siendo el mismo lector B2. Sin cambio visual: flujo y wireframes B3 existentes permanecen intactos.

## Implementación y límites

Nuevo helper planning-calculation-recovery.ts: copia el resultado persistido y compara únicamente los campos monetarios USD de recursos, outputs y variableCosts. Admite como máximo tres pasos binarios64 y diferencia absoluta estrictamente menor a 1e-9 USD, simultáneamente. Tres pasos se justifican por el par observado 1020.3051593572643 → 1020.305159357264; los demás pares son de uno o dos pasos. La primera prueba asumía dos y falló; se corrigió según los nueve pares reales, no por una tolerancia económica general.

FX, scope, SHA, fuentes, texto, contadores, orden, nulls y cero son exactos; negativos/no finitos no se normalizan. Las comprobaciones de esquema, binding, actor, digest del comando, revisiones, permisos e idempotencia permanecen. Si la comparación pasa, la vista devuelve el cálculo exacto del snapshot verificado; jamás reescribe el audit payload. No garantiza detectar alteraciones deliberadas dentro de esos tres pasos: es un límite explícito de compatibilidad numérica, no prueba criptográfica de integridad de cada importe. No se atribuye la deriva a un componente específico de Prisma/PostgreSQL/Neon porque no se aisló.

Archivos del corte: helper nuevo, hunk de load en version-planning.ts, regresión de nueve pares/replay en version-planning.test.ts, pruebas de límites en planning-calculation-recovery.test.ts y este documento. Otros cambios/untracked pertenecían al trabajo previo.

## Verificación

- 187/187 pruebas en 11 archivos: planeación/rutas, recuperación decimal, fases/gate, lector B2, wizard/binding/transaction/rutas/draft/version. Ejecución final 13:45:28, exit0. No equivale a suite completa ni release verde.
- Tipos focales con --strict, ES2022, commonjs, resolveJsonModule y skipLibCheck: exit0. Primera invocación omitió --strict y produjo inferencias Zod opcionales; la comprobación correcta pasó sin cambios a contratos.
- git diff --check: exit0, con avisos CRLF de archivos previos; los archivos nuevos se verifican mediante tipos/pruebas, no están incluidos como tracked en ese diff.
- Regresión local recupera nueve pares, conserva audit payload/parámetros y replay revision1 sin segundo append. Rechaza cuatro pasos, un centavo, FX mínimo, evidencia, identidad, contadores, null, orden, cero negativo y deriva de cantidades grandes.

### Recuperación real READ ONLY

Dentro del plazo TRACE original, diagnose-b3-stored-planning.ts terminó exit0: metadataEvents3, planningEvents1, schemaValid:true; persistido sigue diferente en nueve números (sin reescritura), y servicio corregido devuelve recovered:true/revision1/appliedToParams:false. Precondición obligatoria: marcador TRACE, NOLOGIN y 0 sesiones del rol QA. Conexión administrativa en transacciones READ ONLY, target Preview verificado; no activación del rol, PUT, nuevo evento o migración. El primer comando carecía de VERCEL_CLI_PATH y salió antes de obtener target/conectar; se corrigió únicamente el entorno del proceso usando el CLI instalado54.4.1 y luego se realizó la lectura. Sin reintento de escritura ni reset de cupos.

Esta evidencia es recuperación real con owner, NO aceptación de sesión autenticada del rol limitado. No se ejecutó replay real adicional, cold-readback HTTP, recarga/reinicio ni aceptación responsive/teclado. B3 permanece abierto por esas comprobaciones; el bloqueo decimal concreto queda resuelto.

## Responsable, consumo y siguiente gate

OpenAI/Codex local; recomendado/solicitado GPT-6.1 Sol, esfuerzo alto; modelo y esfuerzo efectivos no observados. Sin Claude, subagentes ni IA de negocio. Alcance acotado a este problema, hasta60min, máximo dos correcciones locales; cupos TRACE de activación/guardado ya consumidos, no ampliados. Cuota, tokens y costos nativos no observados; sin nueva API facturable.

Las skills codebase-design y engineering:debug guiaron reutilización de contratos, reproducción del caso real y cierre con evidencia separada. Siguiente gate: validar la recuperación y replay del mismo recibo desde sesión autenticada, recarga/reinicio y controles de UI, sin un segundo guardado. Reabrir el rol cerrado requiere autorización específica finita; no reutilizar TRACE ni extender su vencimiento automáticamente.

## Checkpoint siguiente corte: 2026-10-05, 14:49 Ciudad de México

Solicitud humana «aadelaante continua»: se avanzó con comprobaciones locales, sin inferir autorización para reabrir el rol QA consumido. Skill engineering:debug aplicada a recuperación, recibo idempotente y vencimiento de sesión. Reutilizados componentes y pruebas existentes: 62/62 tests web en cinco archivos (planeación, página, lector own-relay, wizard y página), exit0; typecheck-version-wizard.json exit0. Son pruebas DOM con transporte simulado, no sesión Supabase real ni aceptación de navegador. Sin cambios de implementación en este corte. Rama/HEAD sin cambio. No listeners3001/3002 observados. TRACE venció a13:49:16; no se ejecutaron sus launchers ni diagnóstico externo.

Pendiente autorización puntual propuesta: una activación adicional de hasta45min en el mismo QA, sin resetear consumo previo, exclusivamente recuperar revisión1, replay exacto de su recibo sin append, lector independiente, recarga/reinicio de procesos propios y aceptación UI. Cerrar al terminar, fallar o vencer; sin nuevo guardado, Auth, producción, usuarios, migraciones, fórmulas, importes, deploy ni IA de negocio. No está autorizada ni activada por este checkpoint. Ejecutora Codex/OpenAI existente, recomendado GPT-6.1 Sol/alto, efectivo y consumo desconocidos; Claude no necesario para comprobar el flujo ya implementado y verificable, sin invocaciones auxiliares.

## Rollback

Retirar sólo import/helper y hunk de comparación/retorno en load, más las pruebas nuevas de este corte. Conservar el evento real, documentos anteriores y todos los cambios ajenos; no reset del repositorio ni eliminación de datos. El rollback reintroduce el rechazo conocido de recuperación del registro; no deshace el guardado. Ningún servicio nuevo quedó iniciado por este corte, y el rol QA siguió cerrado.

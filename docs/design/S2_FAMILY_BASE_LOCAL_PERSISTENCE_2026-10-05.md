# Sprint2: lector B3 y persistencia local de propuestas por familias

## Antes y ahora

Antes, el puente usaba un reader inyectado sintético y JSON local. Ahora [family-base-store.ts](../../apps/api/src/modules/cost-bases/family-base-store.ts) invoca directamente el factory **createVersionPlanning** existente, en la misma transacción, y guarda/recupera propuestas en **CostBaseAuditEvent**. No inicializa Prisma global, no inventa otro Auth, no crea tabla/migración ni modifica las fórmulas/reservas B2 o el método V3.

La prueba de integración usa el lector B3 real y Prisma/PostgreSQL real con rol limitado, pero **identidades y datos sintéticos**. No es sesión Supabase, Neon QA o creación de una base en la aplicación publicada. No hay endpoint/UI habilitados ni registro de fuente B2 en el servicio productivo: el factory recibe explícitamente el source verificado; conectar esa provisión y el flujo UI sigue pendiente.

## Autoridad, benchmark y presupuesto

Instrucción humana «adelante continua» después de entregar el puente: implementación y validación local del lector/persistencia. Checkout D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14/HEAD4f5fc2de0c3d178dace917231e1092040dec21fd verificados. Inicio5oct2026 aproximadamente23:17 Ciudad de México; corte máximo90min/hasta dos reparaciones por causa, sin ampliar acceso/gasto. Referencia documental auditable, no autenticación criptográfica del consentimiento.

Codex/OpenAI único escritor/verificador, recomendado GPT-6.1 Sol/alto; efectivos/cuota/tokens/cargos desconocidos. Claude considerado pero no necesario para una adaptación verificable del factory y tabla existentes; sin Claude/subagentes/IA de negocio. No nueva rama/worktree/commit/PR/deploy, Auth, usuarios reales, infraestructura persistente ni reactivación QA.

Benchmark proporcional: revisión de version-planning, contratos/version locks, schema existente, bridge y runners locales. Opciones: tabla/migración nueva (innecesaria para propuesta auditada), importar scripts de investigación al servicio API (rechazado por acoplamiento/rootDir), reutilizar tabla auditada + source explícito + factory B3 (elegida). Para serialización: comparación difusa de toda la economía (rechazada), nuevo motor decimal (no necesario), JSON textual con hash dentro de JSONB (elegida para preservar literales nativos sin relajar cantidades). No dependencia/servicio nuevo.

codebase-design guio separación reader/tx/source y reutilización; TDD reprodujo ausencia de store antes de implementar, y verification-before-completion exige prueba después del último cambio. No UI modificada: wireframes/branding B3 conservados; un futuro control UI debe tener su wireframe, no queda aceptado por esta entrega backend.

## Contrato de guardado y recuperación

Comando estricto: contexto, revisión esperada de propuesta, fingerprint de versión, recibo/revisión B3 esperados, snapshot y UUID. **No acepta importes, parámetros o un presupuesto del cliente.** Rol ADMIN/OPERATOR verificado por caller/middleware; VIEWER rechazado. El factory por sí solo no autentica JWT.

Una transacción usa locks existentes organización→versión, lee B3 mediante el factory real y revalida todas las referencias. Deriva la propuesta del source B2, valida su contenido y añade sólo un evento METADATA_UPDATED/kind **FCM_FAMILY_BASE_PROPOSAL_V1**. Datos originales/AssumptionSet/params/perfil/calibración/publicación no cambian.

Body económico almacenado como **proposalJson:string** con proposalSha256; record entero tiene actor, fecha, revisión, UUID y digest del comando. JSONB puede reordenar claves del envelope, pero no reinterpretar números dentro del string. Al recuperar se verifica hash, schema, contexto/actor, revisión consecutiva/UUID único, comando y contenido contra el source. Hashes son controles de integridad, no firmas o pruebas infalsificables de autoría/aprobación.

Extensión del puente: **validate** comprueba contenido histórico contra el source sin depender del último recibo; **calculate** sigue requiriendo planeación/versión vigentes. Read puede indicar NONE/CURRENT/STALE después de un nuevo recibo B3, conservando el evento anterior. Si cambia la fuente de versión y el propio lector B3 falla WIZARD_REVIEW_SOURCE_CHANGED, se mantiene ese rechazo; no se introduce fallback para fabricar una vigencia.

Replay exacto de UUID/actor/comando no añade evento; reutilización alterada, revisión obsoleta y propuesta idéntica con UUID nuevo se rechazan. Historia limitada128registros, lecturas129para detectar exceso. Cambiar hashes tras manipular importes tampoco basta: el bridge compara con el source fijado. Calibrated/quoteReady/published/appliedToParams siguen false; cero adopciones.

## Prueba PostgreSQL local

[test-family-base-local.ps1](../../apps/api/scripts/test-family-base-local.ps1) adapta el runner existente: Docker Desktop/named pipe local, imagen postgres17-alpine, contenedor propio aleatorio label=fcm.disposable=family-base-s2, tmpfs y puerto dinámico **127.0.0.1**, DBfcm_family_s2.46migraciones existentes aplicadas sólo ahí; no migraciones nuevas ni ejecución en Neon/QA/producción.

Rol fcm_family_app NOSUPERUSER/NOBYPASSRLS/NOINHERIT, SELECT sobre6tablas, UPDATE sólo id en Organization/AssumptionSet para locks, INSERT sólo8columnas CostBaseAuditEvent. No credencial real ni nuevo usuario Supabase: fixtures User tienen UUID/email sintéticos sólo dentro del DB descartable. Aislamiento probado por las consultas de aplicación; no se afirma RLS genérico de esas6tablas ni imposibilidad de SELECT directo usando la credencial local.

Primer y segundo ensayos3/3 PostgreSQL pasaron; segundo repitió después de corregir tipos nullable del fixture y command unknown, sin cambios al esquema/guardas. Prueba final **4/4 PASS**, inicio23:40:53/duración24.43s/exit0, después del último test:

1. B3 real guarda planeación y store añade una propuesta. JSON textual recuperado con **otro PrismaClient/factory** conserva cada valor y el objeto completo; replay true,3eventos (binding+plan+familia), no duplicado.
2. Nueva UUID equivalente, recibo alterado, otra org/cuenta y VIEWER rechazados, sin eventos adicionales.
3. Baseline JSON de AssumptionSet con210params/CostBase igual: DRAFT/no activo/calibración null/política OPERATIONAL_V3/perfil intactos.
4. B3 nuevo recibo FINANCED deja propuesta anterior STALE. Dos escritores concurrentes con row locks producen una sola revisión2; otro rechazado, total5eventos, propuesta actual FINANCED y baseline económico intacto después de la carrera.

finally detuvo/eliminó cada contenedor --rm/tmpfs y restauró env del proceso. Filtro Docker por label no mostró contenedores propios al terminar23:43. Datos sintéticos descartados, no recuperables; runner puede recrearlos. No se tocaron contenedores ajenos ni se reparó/reinició Docker.

## Pruebas, fallos y cierre

Unit RED:7fallos por factory ausente. Primer unit esperaba STALE tras editar updatedAt; lector B3 correctamente rechazó fuente alterada. Se ajustó la expectativa a conservar historial y fallar, y se añadió caso STALE por nuevo recibo válido; no se suavizó B3. Se retiró re-export que creaba ciclo entre store/bridge. También se comprobó corrupción de JSON/hash/actor/revisión y economía rehecha con hashes nuevos.

Último focal48/48 PASS (9store+18bridge+21planning), tipos estrictos de tests local/DB y build API(tsc) exit0. Test de DB4/4 posterior al último cambio PASS. No se suman resultados repetidos/solapados como más cobertura. Suite API completa congelada:3276PASS/29SKIP (3305tests),212archivosPASS/1FAIL/5SKIP (218),inicio23:40:53/duración302.08s/exit1. Cero tests ejecutados fallidos; única suite bloqueada en colección=tire-calibration-rls-postgres.test.ts por FCM_TEST_ADMIN_DATABASE_URL local ausente. Guard no cambiado ni llamado PASS por esta prueba. Cuatro de29SKIP del runner amplio son family-base-postgres, que pasaron en su runner independiente;25restantes no quedan certificados aquí.

Checkpoint final5oct2026 aproximadamente23:46 Ciudad de México: rama/HEAD conservados, diff --check exit0/sólo avisosCRLF,0contenedores propios por label, pruebas/clients cerrados. No procesos de servicio/leases/gates iniciados ni commits/deploy/cambios de Auth/DBexterna/valores económicos.

No browser, JWT/sesión real, renovación OAuth, cold restart de proceso completo, UI, source empaquetado para servicio online, despliegue o base externa probados. La recuperación usa nuevo cliente real de DB local, no sólo memoria, pero no prueba aceptación productiva.

## Archivos y recuperación

Nuevo store, tests family-base-store/family-base-postgres y runner; hunk validate en own-relay-family-base, documentos/status. El source B2/ledger/210valores/V3/históricos reales permanecen sin cambio. Rollback retira sólo esos hunks/archivos; no borrar eventos reales ni reset del worktree. No procesos/gates/leases de servicio iniciados. Fuente online/endpoint/UI con wireframes y aceptación económica quedan como siguiente trabajo; publicación/external writes requieren autorización puntual.

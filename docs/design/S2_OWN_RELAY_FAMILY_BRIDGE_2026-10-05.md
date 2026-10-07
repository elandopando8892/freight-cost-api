# Sprint2: puente local de base por familias para relevo propio

## Continuación: lector y persistencia local probados

[Integración local](S2_FAMILY_BASE_LOCAL_PERSISTENCE_2026-10-05.md): store llama el factory B3 real en transacción y persiste en CostBaseAuditEvent existente. JSON textual/hash evita reinterpretación numérica;4/4PostgreSQLreal con rol limitado/identidad sintética, replay/coldcliente/concurrencia y210params intactos. No lectorDB de nube/JWT/UI o publicación aceptados. validate permite comprobar contenido histórico conservado; calculate exige recibo vigente. Se conserva la demo anterior como evidencia sintética de ese corte, no como único reader actual.

## Resultado y alcance

Autorización humana «autorizo» al puente versionado por familias, sólo local, conservando V3, históricos y reservas provisionales, sin publicar bases. Registro de inicio5oct2026 aproximadamente22:27:51 Ciudad de México. Codex/OpenAI ejecutor único; recomendado GPT-6.1 Sol/alto, efectivos/cuota/tokens/cargos desconocidos. Presupuesto de corte60min, máximo dos reparaciones por causa; sin Claude/subagentes/IA de negocio ni nuevos proveedores/gasto. No se activa política de selección de modelos por este registro documental.

Checkout D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd comprobados. Cambios previos preservados. Sin rama/worktree/commit/PR/deploy, SQL, migraciones, usuarios, Auth, infraestructura ni reapertura de gates QA.

Antes: B3 recuperaba un cálculo versionado, pero sus familias B2 no tenían un contrato de propuesta de base separado de THROUGH_TRACTOR/V3. Ahora: módulo [own-relay-family-base.ts](../../apps/api/src/modules/cost-bases/own-relay-family-base.ts) transforma una lectura de planeación validada en propuesta `FCM_OWN_RELAY_FAMILY_BASE_V1` y la recalcula con el kernel B2 existente. No escribe ni rellena los210campos, no registra el método como política activa de cotización, no cambia los importes/fórmulas/reservas originales.

## Benchmark y definición previa

Reutilizados [conciliación210](../research/S2_OPERATING_BASE_ADOPTION_REVIEW_2026-10-05.md), compositor de24casos/88pins, PlanningView/reader validado de B3, esquema del presupuesto binacional y calculateBinationalBudgetCostProjection/MAX existentes. Alternativas: rellenar microcamposV3 desde tasas agregadas (rechazada), reconstruir otro calculador (rechazada), adaptar el recibo validado al presupuesto por familias y delegar el cálculo al kernel actual (elegida). Ningún producto/paquete nuevo aporta ventaja para esta conversión local de un contrato ya disponible.

Objetivo del corte: planeación recuperada→propuesta versionada con32partidas fijas/20conceptos variables/exposiciones por recurso→revalidación de versión→mismo CFU/CVU. codebase-design guio una interfaz de dos operaciones y reader inyectado, evitando inicializar DB o cargar scripts de investigación en el grafo de build API. TDD reprodujo fallos antes de corregir; verification-before-completion exige resultados finales. No markup nuevo: wireframes/branding B3 se conservan; no pantalla o autenticación nueva aceptadas aquí.

## Contrato y guardas

- Factory recibe source del compositor local y reader que **debe** usar el actor verificado y versionPlanning.read cuando se integre a la aplicación. El módulo no autentica JWT ni acepta un body HTTP como prueba de sesión. La demostración sustituye ese reader por un fixture explícitamente sintético.
- Source debe coincidir con SHA del payload de casos B2 empaquetado y sus pins; se posee una copia interna. Esto detecta deriva de contenido, no prueba consentimiento humano infalsificable ni calibración económica.
- prepare(binding): ADMIN/OPERATOR, org/sub/base/version/fingerprint estrictos, borrador editable y recibo existente/última revisión, binding vigente y autor del recibo igual al actor. No fallback a otra base/version/cuenta o ausencia de planeación.
- Selección sólo entre24combinaciones existentes de ciclo/contado-financiado/FIX/descanso. Planeación se compara al snapshot B2 con la compatibilidad decimal acotada existente, no tolerancia económica general.
- Presupuesto,20conceptos y32partidas conservan fuente, moneda/periodo, asignación y exclusiones. Se mantiene una caja/pool administrativo/cuota patronal fija; ledger es representación documental, no otra suma de costos.
- calculate(proposal,binding): vuelve a leer la planeación, valida versión y exige igualdad de toda la propuesta con una nueva preparación. Alterar importes, responsable, periodo, método, recibo o quoteReady se rechaza. Recalcular un checksum no habilita cambios: no es firma/autorización.
- Cálculo lo realiza calculateBinationalBudgetCostProjection, no fórmulas copiadas. purchase/sell siguen null; calibrated/quoteReady/published/appliedToCanonicalParams permanecen false/adoptedValues0.

**Límite importante:** esta propuesta contiene economía/exposiciones y costos variables del **ciclo de referencia** MéxicoDF→FortSmith/WTB/relevo propio. No convierte automáticamente esos importes por ciclo en tasas aplicables a cualquier ruta, otro carrier/equipo o periodo. Nuevos viajes requieren reconstruir los componentes y denominadores con sus inputs/revisión; no se escalan todos los CVU por distancia arbitrariamente. No es una base comercial publicada ni garantiza cobertura territorial de seguros/mercado.

## Demostración local

[demo-own-relay-family-base.ts](../../apps/api/scripts/demo-own-relay-family-base.ts) generó [propuesta y readback JSON](../research/S2_OWN_RELAY_FAMILY_BASE_DEMO_2026-10-05.json),294195bytes, exclusivamente con contexto/lector/recibo sintéticos. No es la base QA real ni un guardado adicional. Archivo creado conwx, no sobrescribe artefactos existentes.

Se preparó, serializó/parseó y recalculó la propuesta para NETWORK_EXPECTED_EMPTY_PROXY/CASH/2026-09-30/RATE_EXCLUDES_WEEKLY_REST. Fingerprintb35bfea6216fe15d12cce7377c5a49d757403f2ebb8f2c55854bdaa665cab1b1.

| Resultado | USD/ciclo de referencia |
|---|---:|
| CFU | 1115.6092721214666 |
| CVU | 4326.705219511041 |
| Total productivo de planeación | 5442.314491632507 |
| Compra / venta | null / null |

JSONRoundTripVerified:true, caja1,18componentes documentados/2exclusiones dentro de20conceptos,6remanentes fijos explícitos dentro de32partidas. SHA del archivo0A997B5EFC1F8371BB07B941955C2F3400ABE0D882D114CC723361BC0E9AAF03. Cero valores nuevos, adopciones o escrituras externas; autenticación y creación de base persistida false. No se presenta el costo modelado como tarifa comercial o costo observado del carrier.

## Fallos conservados y correcciones

1.14tests RED por interfaz ausente, no por import roto. Primer fixture incluyó role en scope, contrario al contrato estricto; se corrigió sólo el fixture, sin relajar schema. Otro fixture compartía contexto mutable entre casos: se clonó para evitar contaminar las pruebas negativas.
2.Typecheck detectó un type-only import del compositor que arrastraba scripts/import.meta fuera de rootDir API, y narrowing de null insuficiente. Se reemplazó por contrato estructural mínimo del productor y función fail declarada; no se cambió configuración global ni fórmulas. Build API posterior exit0.
3.Prueba adversarial detectó referencias mutables del ledger entregadas al caller: al alterarlas y recomputar checksum, cambiaba la copia interna y resolvía en lugar de rechazar. Se clonó la salida antes de parse/entrega. Regresión pasó; no se suavizó el comparador ni se declaró que hash autentica al usuario.
4.Asserción exigía un error concreto para cálculo alterado aunque el schema rechazaba antes por suma inconsistente. Se mantuvieron sumas coherentes en el ataque de prueba para comprobar el guard contra resultado fijado, conservando el rechazo del schema.

## Verificación final

18tests del puente: actor/org/version/fingerprint/borrador/recibo, propuesta manipulada, periodo/responsable/método/quoteReady, fuente alterada, checksum rehecho y24selecciones con JSONroundtrip.82/82focales incluyendo21planning y43readerB2 después del último código/test, exit0. Otra corrida previa97/97 con compatibilidad decimal también pasó, no se suma porque hay solape. Tipos estrictos dirigidos a test/demo exit0; build API(tsc) y diff --check exit0, sólo avisosCRLF ajenos; archivos nuevos/untracked no están incluidos como hunks tracked de ese diff.

Suite API completa desnuda con código congelado:3267testsPASS/25SKIP (3292),211archivosPASS/1FAIL/4SKIP (216),inicio22:46:13/duración494.21s/exit1. Cero tests ejecutados fallidos; única suite bloqueada en colección=tire-calibration-rls-postgres.test.ts por env local ausente. Guard no relajado, no apuntado a Neon ni omitido silenciosamente. No build/frontend, navegador real, readerDB, persistencia, otros roles reales o renovación de sesión en este corte. No declara suite completa ni release verde. RLS del sprint1 es evidencia anterior, no se repitió como parte de este módulo sin DB.

Checkpoint final aproximadamente22:55 Ciudad de México: módulo/CLI/test/artefacto preparados, rama/HEAD conservados, sin procesos propios de prueba pendientes ni cambios externos. No hubo inferencia Claude/subagentes o IA del producto; uso/cargos nativos desconocidos. La demostración es funcional en local bajo contexto sintético, no una base SaaS publicada.

## Trabajo restante y rollback

Puente de preparación/cálculo local implementado; sprint2 económico completo aún abierto: revisar/aceptar compatibilidad del benchmark y reservas por base, construir inputs de nuevos viajes, integrar reader/propuesta a flujo UI/persistencia con sus wireframes y autorización específica de escrituras cuando corresponda. No falta otra autorización para este módulo ya implementado; las decisiones económicas/publicación no quedan aprobadas por el éxito técnico.

Rollback: retirar sólo módulo, test, CLI y artefacto/documentos nuevos de este corte. V3, kernel B2, snapshots, eventos, importes y código previo no fueron modificados. No reset del worktree ni eliminación de bases reales. No procesos de servicio/leases/gates iniciados; artefactos dist son build local, no despliegue. Mantener evidencia de intentos anteriores.

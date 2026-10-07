# W2 · entrega local de revisión del relevo propio

4 oct 2026, America/Mexico_City. Autoridad: respuesta humana «adelante contiinua» a la propuesta explícita de integración local no comercial, 60 minutos. Inicio 15:19; comprobación visual final 15:51 aprox.; cierre documental dentro del presupuesto. No renovación del gate anterior de persistencia, vencido a las 20:30 UTC. Las autorizaciones de otros cortes no se amplían.

## Antes / ahora / pendiente

Antes: el compositor B2 separaba recursos, pero el wizard no mostraba su revisión; el motor V3 agregado no acredita un relevo propio por cambiar solamente el validador. Ahora: panel expandible en el wizard, GET protegido y contrato de lectura con tres recursos explícitos: tractor MX, tractor US y una caja compartida. Reutiliza la aritmética existente; ofrece 24 comparaciones de ciclo, financiación, FIX fechado y descanso MX, procedencia y exclusiones. No guarda ni adopta inputs, no calcula compra/venta y no publica. Perfil OWN_RELAY_SAME_TRAILER exclusivamente DTO, no enum V3/SQL ni modificación del perfil histórico.

Pendiente: autenticación/BFF y persistencia reales del W2 en entorno autorizado; compatibilidad operativa del relevo propio y eventual adopción al motor requieren trabajo separado, no una relajación del gate. B2 sigue siendo referencia pública de planeación, no benchmark calibrado de un carrier ni cotización habilitada. Este corte de lectura local se cierra; no se declara cerrado W2 operativo ni listo producción.

Benchmark reutilizado y revalidado: [auditoría](W2_OWN_RELAY_SUPPORT_AUDIT_2026-10-04.md), [baseline del ecosistema](../research/ECOSYSTEM_REUSE_BASELINE_2026-10-03.md), compositor, readers, wizard y contratos/roles actuales. Mantener stack y sumar un adapter tiene menor superficie que adoptar otra plataforma o duplicar fórmulas en React. Sin investigación de nuevos precios, dependencias nuevas ni llamadas públicas facturables. [Wireframe y criterios](W2_OWN_RELAY_REVIEW_WIREFRAME_2026-10-04.md).

## Contrato y fuentes

El generador read-only ejecuta composeB2PlanningScenario, valida 88 pins y proyecta 24 casos. Paquete compacto reproducido: 538454 caracteres JSON; archivo formateado con 11408 líneas. SHA256 del payload: `69a5d1af1d07d072b5238c5c92d4490479940c569bb3bca68dd7b0e8b6b8d2b3`. `project-b2-own-relay-review.ts --check` PASS contra el productor. Normalización de código CRLF a LF únicamente cuando el pin lo declara; evidencia binaria sin normalización. No nuevos importes, políticas hotel/pensión ni supuestos salariales elegidos silenciosamente.

GET ADMIN/OPERATOR, identidad/org verificadas por hooks existentes, no org/base/version enviados por cliente, no-store, fingerprint opcional que exige recarga si cambia. Zod estricto, integridad del paquete, recursos/contextos únicos, sumas por recurso y total, componentes/exclusiones y procedencia completos, URLs HTTPS. Respuestas tardías, cambio de selección/cuenta, vencimiento y pagehide limpian los importes. Cliente de producción importa sólo contrato puro, no snapshot, Prisma, Node crypto ni compositor. Transporte visual QA sí usa paquete público fijado; no es fallback de producción.

## Archivos de este corte

Nuevos:

- API: `src/modules/engine/b2-own-relay-contract.ts`, `b2-own-relay-review.ts`, `b2-own-relay.snapshot.json`; `scripts/project-b2-own-relay-review.ts`; `tests/b2-own-relay-review.test.ts`.
- Web: `lib/own-relay-review.ts`; `app/(app)/cost-bases/own-relay-review.tsx` y `.module.css`; `tests/own-relay-review.test.tsx`, `tests/typecheck-own-relay.json`.
- Documentos: este entregable y wireframe.

Hunks propios sobre trabajo existente: import/GET en `apps/api/src/modules/engine/benchmark.routes.ts`; import/panel con key de organización en `apps/web/app/(app)/cost-bases/version-wizard.tsx`; dos selectores de test scoped en `apps/web/tests/version-wizard.test.tsx`; QA GET/banner en `apps/web/tests/visual/version-wizard.tsx`; entrada en `docs/SPRINT_STATUS.md`. Los archivos del wizard ya estaban sin seguimiento por trabajo previo: no son enteramente autoría de este corte. No stage, commit, rama, worktree, PR ni deploy.

## Verificación

Checkout D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama codex/cost-tires-release-s14; HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, verificados antes y al cierre. Dirty worktree ajeno conservado.

- API: `npx.cmd vitest run tests/b2-own-relay-review.test.ts tests/w2-own-relay-audit.test.ts tests/b2-evidence.test.ts tests/cost-base-wizard-routes.test.ts tests/benchmark-b2-planning-scenario.test.ts` — **100/100 PASS**, cinco archivos, 15:35:14, 41.50 s. Incluye 24 contextos, roles simulados, query injection, fingerprint, mutaciones rechazadas y corrupción del contrato. Prisma proxy rechaza todo acceso: demuestra ausencia de DB en esas pruebas, no persistencia real.
- Web final tras última modificación UI: `npx.cmd vitest run tests/own-relay-review.test.tsx tests/version-wizard.test.tsx tests/version-wizard-page.test.tsx tests/b2-evidence.test.tsx` — **51/51 PASS**, cuatro archivos, 15:44:30, 7.03 s. Fetch/Auth simulados; límites de org/cuenta, sesión, errores, respuesta tardía y limpieza. Primer intento tuvo 50/51 por selector antiguo del primer h2, corregido scoped al concepto seleccionado y reejecutado; no se presenta aquel intento como verde.
- Web focal: `npx.cmd tsc --noEmit --project tests/typecheck-own-relay.json` — PASS, exit 0 tras última modificación.
- Typecheck general API FAIL en `trip-fuel-review.ts:79,81` (number|null a number). Web general FAIL además en `config/prisma.ts:9` (ProcessEnv/DatabaseEnvironment) y dos referencias `error` en `quote/use-quote-draft.ts:86`. Archivos ajenos, sin corregir ni declarar build global aprobado.
- Lint focal: exit 0, cero errores, un warning react-hooks/exhaustive-deps por generación actual del cleanup. No claim de lint sin advertencias.
- Integridad del generador PASS; diff check de hunks propios PASS. No full build ni CI Linux.

Navegador mediante computer-use, servidor QA de este corte en `http://127.0.0.1:4730/tests/visual/version-wizard.html`, sesión local 79131. Se dejó pestaña entregable, viewport normal restaurado. Capturas visibles en la ejecución, sin atribuirles un archivo de screenshot guardado. Identidad/transporte y guardado QA sólo en memoria, sin Auth/DB real, señalados en banner. Lectura inicialmente vacía y explícita; recarga vacía la consulta; VIEWER devuelve rechazo sintético 403, retira importes y bloquea controles. Caso red/contado/FIX Sep30/descanso excluido muestra CFU 1115.61, CVU 4326.71 y costo planeación 5442.31 USD. Dedicado/financiado equivalente muestra 2839.66, 8180.88 y 11020.53 USD. Son salidas de referencia pública fijada, no costo observado ni precio de venta. La suma usa precisión completa, no cifras visuales redondeadas. CVU separado de caja cero porque desgaste con caja ya está incluido en MX/US; explicación visible evita duplicación.

Móvil medido CSS 390 x 843: documento 371 px, región de tabla 305 px con tabla 590 px en scroll propio; controles una columna, sin overflow horizontal global. No certificación WCAG completa ni prueba de modo claro en este corte.

## Preservación y rollback

Hashes de archivos económicos comprobados sin cambio entre inicio y cierre:

- engine.calculator.ts: `0b22dd0e223c300fbad40964d8c671660a4050c0cd409bbcc514353da5988ea6`
- engine.outputs.ts: `3640a05d4cc10820f84de5f295f8d7e0413ad48a87a3921be8981336b6ef5d8b`
- benchmark-binational-cost-projection.ts: `4e93fcfba6c0da647006b077cc95895eefebab515a84eb11b27f9f8844444776`
- cost-base-profile.ts: `e33d6d8a480a02d4adb877881de9dc29559f273a1a4767dfa2e41f9085b9ff2f`

Rollback sólo de este corte: retirar panel/import y GET/import propios, restore manual de dos selectores y hunks QA/barra; retirar exclusivamente archivos nuevos listados y esta entrada de status. Conservar readers/rutas previas, wizard, pruebas y cambios ajenos; NO reset/checkout global, NO borrar directorios. Detener únicamente el servidor QA propio sesión 79131 si ya no se necesita. Sin rollback DB/Auth porque no hubo escrituras/cambios.

## Modelo, esfuerzo y consumo

Ejecutor único Codex/OpenAI, recomendación y solicitud conservada gpt-6.1-sol/high para contrato, integración y verificación. Modelo/version/effort nativos efectivos no observables, no cambio silencioso ni declaración de equivalencia. Claude considerado por UI/arquitectura pero no invocado: continuidad y verificabilidad favorecen el ejecutor actual. Sin Astra/Luna/subagentes/inferencia externa; cuota, tokens nativos y costo real desconocidos. No activación de créditos/API/OAuth. Presupuesto 60 min, dos reparaciones diagnosticadas (política de pin y selector de test); sin reintento automático de proveedor. Skills codebase-design/frontend-design para seam y variables visuales; testing-strategy/documentation y computer-use para evidencia por capa. Sin bases, usuarios, Auth, infraestructura, migraciones, producción ni operaciones de negocio.

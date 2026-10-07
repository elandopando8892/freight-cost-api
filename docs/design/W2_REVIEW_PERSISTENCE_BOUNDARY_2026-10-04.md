# W2 · qué impide la persistencia real y siguiente corte

Actualización posterior: [separación local autorizada e implementada](W2_REVIEW_CONTEXT_DELIVERY_2026-10-04.md). El contrato de revisión ya fue desarrollado y probado por separado; DB/Auth/persistencia real siguen pendientes. La propuesta y evidencia anteriores de esta nota conservan su momento histórico; no conceden permisos nuevos al gate vencido.

Revisión local 4 octubre 2026, checkpoint 16:08 America/Mexico_City. Respuesta humana «adelante continua» autoriza continuar dentro del alcance local, no renovar roles/grants/deadlines ni cambiar metodología comercial. Sin lanzar el gate vencido ni conectar a DB/Auth, sin leer credenciales.

## Resultado actual

**No basta renovar el permiso de DB. Antes hay que separar el contexto de revisión B2 del perfil cotizable V3.** La lectura del relevo propio entregada en [el corte anterior](W2_OWN_RELAY_REVIEW_DELIVERY_2026-10-04.md) es válida como referencia pública. No demuestra que el wizard sea accesible/guardable para una base real del escenario confirmado.

Evidencia de código revalidada:

- `cost-base-wizard-version.ts:32–38` exige CROSS_BORDER, segmento del catálogo, applicabilityContext explícito y perfil OPERATIONAL_V3, MX/US, equipo y ownership compatibles. `parseCostBaseProfile` conserva los bloqueos V3.
- `cost-base-profile.ts:141–142` admite sólo THROUGH_TRACTOR en V3 cross-border. No admite relevo propio por cambiar el nombre del segmento.
- `cost-base-wizard-draft.ts:43–44` define referencias con tractorPolicy OWN_MX_US_RELAY_SAME_TRAILER. Esa política de investigación no es el perfil de cálculo V3.
- `cost-base-wizard-version.test.ts:12–15` arma un fixture usando defaultCostBaseProfile(CROSS_BORDER), que devuelve THROUGH_TRACTOR (`cost-base-profile.ts:75`). Sus pruebas simuladas de guardado no acreditan persistencia de un perfil real de relevo propio. `load` no comprueba equivalencia específica de tractorPolicy con borderProcess: hay una brecha semántica que el nuevo contrato debe resolver, no ocultar.
- Página `apps/web/app/(app)/cost-bases/[baseId]/versions/[versionId]/build/page.tsx:15–24`: carga wizard y auth/me antes de renderizar el panel. Perfil no admitido → pantalla de indisponibilidad. El panel B2 por sí solo no elimina esa precondición.
- `start-w2-authenticated-gate.ts:15,57` conserva deadline 2026-10-04T20:30Z vencido. `:86–96` conserva rechazo del perfil antes de alta/grants. No se ejecutó ni editó el launcher. El último inventario DB de borradores/grants sigue siendo histórico, no se presenta actualizado.
- Listener local actual: sólo 127.0.0.1:4730 entre puertos 3000/3001/3002/4730 revisados. Es QA, no runtime autenticado. No se detuvo/adoptó ningún proceso ajeno.

Rama/HEAD/worktrees y dirty worktree verificados: D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; codex/cost-tires-release-s14; 4f5fc2de0c3d178dace917231e1092040dec21fd. Sin edición de implementación ni pruebas repetidas: no hay resultados nuevos de login/guardado/recarga real. Los 100/51 PASS anteriores conservan su fecha y capa.

## Alternativas revalidadas, no implementación

| Ruta | Ajuste / alcance | Decisión |
| --- | --- | --- |
| Relajar V3 o usar THROUGH_TRACTOR para aparentar relevo | No resuelve reparto ni fidelidad del caso; oculta incompatibilidad | Rechazada. |
| Contexto B2 de revisión explícito, separado del perfil económico de la versión | Reutiliza catálogo, draft/receipts, fingerprint y auditoría JSON existentes; sólo propuestas no comerciales. Requiere contrato de binding servidor org/base/versión/perfil de revisión y bloqueo de adopción | Recomendada para cerrar W2 sin ampliar al motor comercial. |
| Llevar ya el reparto al motor cotizable | Alcance mayor: versionado metodológico, pools, costos/riesgos/márgenes, migración de consumidores y aceptación económica | Posterior, no necesaria para comprobar persistencia de propuestas. |

Benchmark vigente reutilizado: [baseline del ecosistema](../research/ECOSYSTEM_REUSE_BASELINE_2026-10-03.md), [auditoría metodológica](W2_OWN_RELAY_SUPPORT_AUDIT_2026-10-04.md) y contratos inspeccionados ahora. Una plataforma nueva no resuelve la confusión de perfiles; conservar Fastify/Prisma/Zod, JSON de auditoría y UI actual minimiza retrabajo. No nueva librería, proveedor, tabla, infraestructura o fórmula propuestos. No se vuelven a investigar peajes/FX ni a construir otra pantalla.

## Propuesta concreta para autorización local

Un corte de máximo 60 minutos, escritor único Codex/OpenAI, recomendación gpt-6.1-sol/high conservada; modelo/version/esfuerzo efectivos y tokens/cuota/cargos nativos desconocidos. Claude considerado, no invocado; sin IA auxiliar ni gastos externos. Máximo dos reparaciones diagnosticadas locales. El documento no activa un router ni política ni autoriza implementación por sí mismo.

Separar en el adapter del wizard **perfil de revisión** de **perfil de cálculo**, conservando el camino histórico. Contrato explícito de revisión OWN_MX_US_RELAY_SAME_TRAILER/Sep2026, versionado y no comercial. No aceptar un flag libre del navegador que habilite otro tenant/base/perfil. Binding verificado por servidor, fuentes y fingerprint; ninguna propuesta altera los 210 params, estados, calibración o perfil económico. El expediente de revisión no convierte su base fuente en una base apta para cotizar relevo propio. Todo cálculo/adopción de ese contexto debe seguir bloqueado. La selección/preparación de un target real queda para un gate separado: no se presume borrador elegible ni se escribe sobre una versión activa por fallback.

Flujo/wireframe: conservar [el wizard y panel aprobados](W2_OWN_RELAY_REVIEW_WIREFRAME_2026-10-04.md), añadiendo sólo la distinción visible «Contexto de revisión: relevo propio · perfil económico de la versión: no modificado · no comercial». Misma navegación, branding y controles; no nueva página/módulo visual.

Cierre del corte local propuesto:

1. Comparación B2 accesible en contexto de revisión explícito sin falsear el perfil V3; caminos históricos sin reinterpretación automática.
2. Adapter y metadata separados/versionados, org/base/versión/binding servidor, fingerprint, actor, revision y replay estrictos; errores sin fallback.
3. Pruebas que distinguen referencia OWN_RELAY de fixture THROUGH_TRACTOR: separación de contexto, scopes, edición prohibida de activos, duplicados, conflicto/stale y cero actualización de parámetros/calibración. No eliminar guardas para conseguir verde.
4. UI conserva wireframe; guardar propuestas queda claramente separado de aplicar/cotizar. Simulación identificada; ninguna prueba local se llama persistencia real.
5. Evidencia/rollback por hunks propios; no renovar fecha/rol ni lanzar launcher antiguo. Después solicitar target/accesos mínimos para un único guardado real y replay, sin permisos generales ni owner como aplicación.

**Decisión requerida ahora:** autorizar esta separación local del contexto de revisión, no relajar V3. DB, nuevos registros, roles, Auth, producción y despliegue quedan fuera de esa autorización. Los accesos del gate real se propondrán sólo cuando el contrato pueda representar correctamente el caso.

## Qué cambió y rollback

Sólo este checkpoint y entrada de SPRINT_STATUS; corrige la expectativa de que faltaba exclusivamente acceso a DB. Skills testing-strategy/documentation permitieron identificar el fixture no equivalente y separar capas de prueba. Sin implementación/pruebas/SQL/login/credenciales/UI alterados en este corte. Rollback documental: retirar sólo este archivo y la entrada propia de status, sin reset global ni borrar historial previo.

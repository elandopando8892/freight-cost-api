# Freight Cost Model · estado del MVP

Fecha de corte: 2026-09-07  
Checkout: `D:\\andre\\worktrees\\freight-cost-model\\supabase-auth-migration-20260830`  
Rama: `codex/supabase-auth-slice`  
HEAD base del incremento de revisión comercial: `3b4f6a8`

## Lectura ejecutiva

Incremento posterior 2026-09-08: recuperación de carga del equipo publicada en
preview web/API `f739e83`. Google login y listado ADMIN comprobados; sales ADMIN
y jgonzalez VIEWER conservados. Wireframes desktop/móvil incluidos. Rama de error
no ejercitada en cloud; QA VIEWER/renovación sigue pendiente. Ver `TEAM_LOADING_UX_2026-09-08.md`.

Último incremento 2026-09-08: listado de equipo recuperado en preview `725646a` y
rol de jgonzalez cambiado de OPERATOR a VIEWER con vista previa, confirmación,
auditoría y persistencia. Sales permanece ADMIN. Falta login real de jgonzalez para
validar sólo lectura; no se cierra AUTH-07. Ver `TEAM_ROSTER_COMPATIBILITY_2026-09-08.md`.

Último incremento 2026-09-08: arreglo responsive publicado en web/API preview
alineados `00cfa51`. Detalle sin overflow a 390/1280/1440 px; Google login,
revisión comercial ADMIN y recarga reales comprobados. El pendiente de despliegue
del ajuste descrito abajo queda resuelto. OPERATOR/VIEWER y renovación continúan
pendientes; no se recalcula el porcentaje global ni se cierra sprint por este gate.
Ver `PREVIEW_RESPONSIVE_RELEASE_2026-09-08.md`.

Incremento posterior 2026-09-08: revisión comercial real ADMIN con dos respuestas
200, edición y descarte probados. Se detectó overflow del detalle móvil en preview
y se corrigió localmente con wireframe y fixture de regresión. No está publicado
ese ajuste; OPERATOR/VIEWER y renovación siguen pendientes. Evidencia en
`COMMERCIAL_REVIEW_QA_2026-09-08.md`.

Release preview autorizado 2026-09-08: web/API `7a3d92d` READY, login Google real
y recarga comprobados con ADMIN existente, sin migraciones ni cambios de Auth.
El desfase descrito abajo queda resuelto para esta pareja nueva. Recorrido comercial,
OPERATOR/VIEWER y renovación siguen pendientes. Ver `PREVIEW_RELEASE_2026-09-08.md`.

Actualización 2026-09-08: se agregó `verify:preview-revisions`. La consulta viva de
metadatos declara web `b4bdd4d` y API `f6e0d64` con `gitDirty=1`; la revisión
comercial `06bc5ab` sigue validada localmente, no en esos previews. QA autenticada
permanece pendiente. Evidencia y siguiente paso en `PREVIEW_REVISION_GATE.md`.

El plan vigente del MVP comercial tiene cuatro sprints quincenales. Estamos cerrando
Sprint 1 y avanzando Sprint 2. El progreso ponderado es aproximadamente **28%**
(se comunica como 30% redondeado); esto es avance local/preview, no aceptación de
producción.

El documento `apps/web/UI_UX_CONVERGENCE.md` conserva el historial de siete
iteraciones visuales anteriores. No debe mezclarse con esta secuencia de MVP.

## Sprint 1 · navegación y wireframes — 80%

Completado:

- Wireframes desktop/mobile de tres direcciones en `docs/design/freight-cost-model-mvp-wireframes.html`.
- Dirección adoptada: Ruta directa.
- Navegación primaria reducida a Inicio, Cotizar, Mis cotizaciones y Mis costos.
- Herramientas secundarias agrupadas bajo “Más herramientas”.
- Acciones del wizard fijadas en móvil y contexto técnico priorizado en el flujo.

Pendiente de cierre:

- Capturas autenticadas en 1440 × 900, 1280 × 800 y 390 × 844.
- Comparación contra wireframe y aprobación visual humana.

## Sprint 2 · cotización end-to-end — 30%

Iniciado:

- Resultado de cotización muestra ruta, equipo, servicio, base y versión junto al precio.
- Guardado mantiene el linaje y ofrece abrir directamente el detalle o volver al historial.
- El detalle vuelve a `/quote?quoteId=...` y precarga ruta, operación, servicio, base y equipo;
  el original permanece intacto hasta que el usuario calcule y guarde una nueva cotización.
- Una reapertura fallida ya no cae silenciosamente en un formulario vacío: muestra el motivo,
  conserva el contexto de la acción y ofrece iniciar una cotización nueva.
- La carga de `/quote` conserva la composición final del flujo (encabezado, modos, formulario
  y revisión técnica) y expone un anuncio accesible mientras llegan los datos.
- Sin base gobernada, el aviso aparece al entrar a Cotizar y dirige a Mis costos; `VIEWER`
  recibe una vista de solo lectura que separa claramente lo permitido de lo que requiere operador.
- El filtro de alcance de estándares en Mis costos usa semántica de pestañas válida (`aria-selected`),
  foco único y navegación con flechas/Home/End para teclado y lectores de pantalla.
- La matriz de QA autenticada quedó preparada en `docs/QA_AUTHENTICATED_MVP_MATRIX.md`;
  permanece PENDIENTE hasta ejecutar con sesión Supabase real y evidencia redactada.
- En Mis costos, “Revisar bases” selecciona la primera base activa del alcance y lleva al
  panel de versiones; ya no obliga a encontrar manualmente la base después del salto.
- Al volver a cotizar, el nuevo resultado identifica la cotización de origen y propone una
  etiqueta `Reapertura · ...`; guardar crea un registro nuevo y conserva intacto el original.
- El resultado concentra precio sugerido, margen, utilidad y decisión en “Resumen para propuesta”,
  sin publicar tarifas ni enviar comunicaciones.
- La trazabilidad persistente `sourceQuoteId` quedó diseñada en `docs/architecture/ADR-002-quote-derivation-lineage.md`,
  pero permanece propuesta: no se modificó Prisma/Neon ni se aplicó migración.
- El resumen copiable del detalle ahora usa la misma terminología en español que la UI
  (`Ruta`, `Tarifa base`, `Piso de costo`, `Recomendada`), sin enviar automáticamente.
- Quote Desk ahora hace visible el flujo Capturar → Revisar → Aprobar → Enviar manual;
  los estados son informativos y no conectan todavía una cotización interna con una propuesta externa.
- El contrato propuesto para esa futura conexión quedó documentado en
  `docs/architecture/ADR-003-quote-to-quote-desk-contract.md`: acción server-side,
  payload comercial mínimo, aislamiento por `orgId`, redacción de costo interno,
  idempotencia y rollback. Sigue sin endpoint persistente, migración, borrador o correo creados.
- El wireframe ahora cubre “Preparar propuesta” en desktop y mobile, con revisión
  previa, CTA fijo, exclusiones de datos internos y estados VIEWER/rechazo.
  Su corte funcional de revisión, sin guardado, está en
  `docs/design/proposal-review-wireframe.html`.
- El API ya tiene un preview reversible en
  `POST /quotes/:id/customer-proposal-draft/preview`: exige `ADMIN/OPERATOR`,
  limita la lectura por `orgId`, devuelve sólo el payload comercial permitido y
  calcula una huella de reintento. Las pruebas focalizadas cubren 25 casos; no
  persiste `CustomerQuote`, no ejecuta email y no reemplaza la futura idempotencia
  persistente.
- Desde el detalle confirmado, “Revisar propuesta” permite capturar cliente,
  contacto, vigencia y condiciones; consultar la tarifa comercial; volver a editar
  o cerrar. Cancelar descarta los campos y aborta la petición en curso.
- El BFF conserva `Idempotency-Key` y toma la identidad de la sesión verificada.
  La ruta rechaza fuentes ajenas con 404 y evidencia alterada con 409. La vigencia
  usa fecha civil de México; las distancias transfronterizas muestran ambos tramos.
- QA local del componente y CSS reales: 1440×900, 1280×800 y 390×844; revisión,
  edición, errores, reintentos, cancelación, permisos y teclado. Respuestas API
  simuladas; la matriz de QA autenticada sigue pendiente. Ver
  `docs/design/PROPOSAL_REVIEW_HANDOFF.md`.
- Se conserva el límite: guardar una cotización no publica tarifas ni envía comunicaciones.

Siguiente incremento:

- Validar el recorrido captura → cálculo → resultado → guardado → reapertura con datos sintéticos.
- Cubrir estados loading, error, sin base gobernada y VIEWER.
- Completar QA visual desktop/mobile del recorrido.
- Probar el recorrido de revisión comercial con una sesión real y el mismo SHA
  en frontend/API de preview. La persistencia queda pendiente del contrato de
  linaje/idempotencia y de autorización para cualquier cambio de base de datos.

## Sprints siguientes

| Sprint | Objetivo | Gate de salida |
|---:|---|---|
| 3 | Mis costos, propuesta y duplicación/reapertura | Configurar costos y preparar una propuesta sin publicación automática |
| 4 | Piloto, permisos, estados y release readiness | Evidencia de sesión, aislamiento, errores y checklist humano de release |

## Modelo y esfuerzo

- GPT-5.6 Sol · esfuerzo medio: UX normal, documentación y pruebas focalizadas.
- GPT-5.6 Sol · esfuerzo alto: integración funcional, cotización y depuración.
- GPT-6 Astra · esfuerzo alto: sólo revisión crítica de Auth, seguridad, aislamiento o release.
- GPT-5.6 Luna · esfuerzo bajo: tareas mecánicas de bajo riesgo.

## Límites de esta fase

No se modifican producción, Auth compartido, Neon, usuarios, infraestructura,
permisos, migraciones destructivas ni comunicaciones externas. La validación
autenticada se reporta separada de la cobertura de configuración.

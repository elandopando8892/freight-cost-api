# Freight Cost Model · matriz de QA autenticada del MVP

Fecha de corte: 2026-09-07  
Checkout: `D:\\andre\\worktrees\\freight-cost-model\\supabase-auth-migration-20260830`  
Rama: `codex/supabase-auth-slice`

## Estado de evidencia

Regresión local posterior 2026-09-08: 32/32 pruebas de revisión comercial y roles;
incluye rechazo de claims de rol del cliente y equivalencia de errores para fuente
ajena/inexistente con ADMIN/OPERATOR. Identidad/Prisma simulados: no cambia ningún
caso autenticado a PASS. Ver `PERMISSION_REGRESSION_2026-09-08.md`.

Última comprobación 2026-09-08: preview web/API `00cfa51` alineado. Arreglo móvil
ya desplegado, detalle sin overflow a 390/1280/1440 px y revisión comercial a 390 px.
Google login ADMIN y recarga reales aprobados en este origen; revisión comercial
respondió con fuente existente y cliente ficticio. Esto resuelve el pendiente local
de layout descrito abajo, no AUTH-09 completo ni casos OPERATOR/VIEWER/renovación.
Evidencia: `PREVIEW_RESPONSIVE_RELEASE_2026-09-08.md`.

Actualización posterior 2026-09-08: dos revisiones comerciales reales ADMIN con
respuesta 200, edición y descarte al cerrar; fuente del piloto existente y cliente
ficticio. AUTH-11 queda parcial, no PASS OPERATOR/sintético. La revisión móvil
detectó desbordamiento del detalle: corregido localmente, aún no desplegado.
Ver `COMMERCIAL_REVIEW_QA_2026-09-08.md`.

Actualización 2026-09-08: el preview alineado `7a3d92d` ya tiene evidencia real
de Google login, recarga, panel e historial con la cuenta existente ADMIN.
Ver `PREVIEW_RELEASE_2026-09-08.md`. Esta comprobación de lectura no sustituye los
casos OPERATOR/VIEWER de la tabla, ni confirma renovación o recorrido comercial.

La matriz completa permanece **PENDIENTE** hasta completar los casos con roles y
datos de prueba autorizados en el preview. La cobertura de rutas sin sesión y la
compilación no sustituyen el intercambio OAuth, la persistencia de sesión ni la
renovación por expiración.

Este documento no autoriza producción, no crea usuarios, no modifica Auth, no escribe
cotizaciones de negocio y no usa datos sensibles. Los datos de prueba deben ser
sintéticos y la persona que ejecuta debe conservar capturas y timestamps.

## Precondiciones

- Comprobar primero las revisiones web/API con `verify:preview-revisions` y el
  upstream efectivo del BFF. Ver `PREVIEW_REVISION_GATE.md`: el 2026-09-08 los
  últimos previews consultados no acreditan el incremento local `06bc5ab`.
- Preview/local del mismo origen con `/auth/callback` configurado.
- Una cuenta de prueba con rol `OPERATOR` y otra con rol `VIEWER` en la organización
  autorizada; no reutilizar cuentas de producción.
- Una cotización sintética guardada y un caso sintético sin base gobernada.
- Navegador limpio o perfil de prueba; DevTools disponible para observar cookies,
  redirecciones y errores sin copiar tokens.
- Viewports: 1440 × 900, 1280 × 800 y 390 × 844.

## Casos

| ID | Actor / estado | Pasos mínimos | Resultado esperado | Evidencia requerida | Estado |
|---|---|---|---|---|---|
| AUTH-01 | `OPERATOR` · login Google | Abrir login → continuar con Google → volver a `/auth/callback` | Intercambio de código exitoso; llega al workspace; no aparece error de callback | URL final sin `code`/`error`, timestamp y captura | PENDIENTE |
| AUTH-02 | `OPERATOR` · sesión | Abrir `/quote`, recargar y navegar a `/quotes` | La sesión permanece; el rol operativo puede calcular y guardar | Capturas antes/después y request status, sin tokens | PENDIENTE |
| AUTH-03 | `OPERATOR` · cotización | Capturar datos sintéticos → calcular → guardar → abrir detalle | Resultado conserva ruta, base, versión y estado; guardado no publica ni confirma | ID sintético, captura del detalle y auditoría | PENDIENTE |
| AUTH-04 | `OPERATOR` · reapertura | Desde detalle seleccionar “Volver a cotizar” → ajustar → recalcular | `/quote?quoteId=...` precarga datos; banner informa reapertura; original no cambia | Capturas antes/después y dos IDs sintéticos | PENDIENTE |
| AUTH-05 | `OPERATOR` · folio no disponible | Abrir `/quote?quoteId=<id-inexistente>` | Alerta explica que no pudo reabrirse y ofrece “Iniciar cotización nueva”; no aparece formulario vacío silencioso | URL, captura de alerta y status de API | PENDIENTE |
| AUTH-06 | Organización sin base gobernada | Entrar a Cotizar con catálogo sin base gobernada | Aviso temprano dirige a Mis costos; cálculo se presenta como propuesta y el guardado requiere revisión | Captura del aviso y resultado | PENDIENTE |
| AUTH-07 | `VIEWER` | Abrir `/quote`, historial y detalle | Vista solo lectura; no puede calcular, guardar, confirmar ni compartir | Capturas de controles visibles/ocultos y respuesta 4xx si se prueba guard directo | PENDIENTE |
| AUTH-08 | Renovación | Esperar expiración controlada o usar ventana autorizada; recargar y repetir una lectura | Cookie/sesión se renueva por el flujo vigente; la app no pierde organización ni rol | Timestamps, status de red y captura; nunca token | PENDIENTE |
| AUTH-09 | Visual responsive | Repetir AUTH-02/AUTH-04 en los tres viewports | Layout coincide con wireframe, no hay scroll horizontal ni CTA duplicado | Capturas con viewport visible | PENDIENTE |
| AUTH-10 | Salida / rollback | Cerrar sesión y volver a `/quote` | Redirección a login; no quedan datos privados renderizados en la pantalla | Captura y status 307/route guard | PENDIENTE |
| AUTH-11 | `OPERATOR` · revisión comercial | Detalle confirmado → Revisar propuesta → completar cliente/vigencia → Ver propuesta → Editar datos → cerrar | Preview 200 con mismo origen, tarifa verificada y cabecera de reintento; no se crean propuestas/correos | Capturas desktop/mobile y estados de red redactados | PENDIENTE |
| AUTH-12 | Revisión · permisos / fuente | `VIEWER` consulta detalle; operador intenta ID inexistente/ajeno en datos de prueba | VIEWER sin acción; API 403/404 según caso, sin datos de otra organización | Capturas y respuestas sin identificadores reales | PENDIENTE |

La prueba local de `apps/web/scripts/proposal-review-smoke.mjs` valida el componente
con respuestas sintéticas y el contrato HTTP se prueba con Prisma simulado. Esa
evidencia está en `docs/design/PROPOSAL_REVIEW_HANDOFF.md`; no cambia AUTH-11/12 a PASS.

## Criterios de salida

1. AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-07 y AUTH-10 tienen evidencia PASS.
2. AUTH-06 y AUTH-08 tienen evidencia PASS o un bloqueo reproducible documentado;
   no se convierten en PASS por inspección estática.
3. No hay errores de consola, loops de redirección ni datos privados en URLs,
   logs o capturas.
4. La comparación visual contra
   `docs/design/freight-cost-model-mvp-wireframes.html` está aprobada por una persona.
5. Si falla un caso, se conserva el preview/release actual y se revierte sólo el
   cambio del branch; no se modifica Auth compartido ni producción como workaround.

## Evidencia y rollback

- Nombrar artefactos `fcm-qa-<id>-<yyyyMMdd-HHmm>-<viewport>.<ext>`.
- Redactar correo, `access_token`, `refresh_token`, cookies y valores de sesión.
- Registrar commit, URL de preview, navegador, rol, organización sintética y timestamp.
- Un resultado `PENDIENTE` no bloquea el desarrollo local, pero sí bloquea la
  afirmación de “login validado” o el cierre de QA visual autenticado.

## Modelo y esfuerzo

- Ejecución de la matriz y captura de evidencia: GPT-5.6 Sol · esfuerzo medio.
- Revisión de intercambio OAuth, aislamiento y renovación: GPT-6 Astra · esfuerzo alto.
- Comparación visual y accesibilidad: GPT-5.6 Sol · esfuerzo medio.

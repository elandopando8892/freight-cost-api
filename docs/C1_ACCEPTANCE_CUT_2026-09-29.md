# C1 — corte de permisos y aptitud de cotización

Estado: **C1 abierto**. El defecto de permisos se corrigió y publicó en Preview; la cotización nueva con la base XBF sigue bloqueada por gobierno económico. Modelo recomendado: GPT-6 Sol, esfuerzo alto para implementación; GPT-6 Astra, esfuerzo alto para revisión final de Auth/tenant. Las etiquetas son recomendaciones, no afirman qué selector se usó. No hubo cambio visual, por lo que no se necesita otro wireframe.

## Candidato técnico del corte

- Código desplegado: `464ed48b4a4bef6f938f68d85e68a51a17297d8a`, rama `codex/cost-tires-release-s14`, fuente limpia.
- Web Preview: `https://freight-cost-bjsq11eye-elandopando8892s-projects.vercel.app`, deployment `dpl_Df6N5azgkV17VSWnhzZv1WsQcfic`.
- API Preview: `https://freight-cost-abjaf48sh-elandopando8892s-projects.vercel.app`, deployment `dpl_9WxRenA3BjQuKimRd2MnwcABAZ7A`.
- Gate de pareja: 8/8 PASS, mismo SHA/ref, `API_URL` presente y release en `/health` y `/ready`. Smoke público BFF: login 200, BFF anónimo 401/no-store, CSP Report-Only, health/ready 200. La ruta de captura de investigación v2 continúa 404, bandera OFF.

El Preview anterior `bb8qaubt7`/`h63kwa221` quedó reemplazado: la rotación de contraseña del rol de API invalida su conexión. No usarlo para QA ni como rollback. No se cambió ningún alias ni entorno compartido.

## Bloqueador P1 corregido: VIEWER calculaba por API

La UI ya impedía a VIEWER generar tarifas, pero `POST /engine/quote-by-route` aceptaba ese rol y persistía `QuoteCalculationPreview`. Se añadió `requireRole('ADMIN', 'OPERATOR')` a esa ruta y a `/engine/calculate` y `/engine/compare-observed-cost`. La regresión comprueba que VIEWER recibe 403 antes de resolver ruta, contexto o escribir preview; OPERATOR conserva el caso positivo. Esto demuestra la regla en pruebas locales y que el código corregido es el desplegado, **no** una petición autenticada de VIEWER al API remoto.

Validación: API 659 PASS, 25 SKIP al excluir la suite que exige PostgreSQL desechable `fcm_tire_s8`; esa suite no fue falseada ni apuntada a Neon. Web 64 PASS; typecheck API PASS; `git diff --check` PASS. La primera corrida amplia reveló un fixture de comparación que usaba VIEWER como actor positivo; se actualizó a OPERATOR y se repitió con éxito. Las pruebas PostgreSQL omitidas requieren su entorno aislado para la matriz de release completa.

## Bloqueador A3 comprobado sin escritura

`npm run audit:c1:quote-readiness -w freight-cost-api` consulta únicamente el proyecto Neon staging verificado `broad-art-99750179/neondb`, usando una transacción READ ONLY. Resultado 2026-09-29 03:54 UTC: `XBF-XB-PILOT` está ACTIVE/default, pero su única versión v1 está PUBLISHED/active **sin applicabilityContext**. `targetCandidateForNewCalculation=false`, salida 1. La API rechaza por diseño el cálculo nuevo sobre esa versión con 409; un login exitoso no cerraría A3. La consulta no valida valores económicos, compatibilidad completa del perfil ni el resultado de una cotización.

No se creó, publicó ni activó una versión, ni se guardó cotización. La decisión y recuperación de datos siguen en `C1_PROFILE_DECISION_2026-09-19.md`; activar una versión nueva no tiene rollback equivalente a reactivar v1 sin perfil. No convertir este bloqueo en un permiso para inventar parámetros o relajar el guard.

## Plan de prueba de aceptación pendiente

| Gate | Tipo y caso mínimo | Criterio de cobertura | Estado |
| --- | --- | --- | --- |
| A1 | E2E en **este** origen: Google → callback → rol; recarga y renovación | Tres roles existentes sin exponer tokens; ninguna sesión antigua sustituye el candidato | PENDIENTE: Preview nuevo inicia sin sesión |
| A2 | E2E/UI + API: ADMIN/OPERATOR habilitados, VIEWER lectura y 403 en las tres rutas; recurso ajeno 404/403 | Denegación remota antes de cómputo/escritura, más aislamiento entre organizaciones | PARCIAL: regresión local y mismo SHA; falta sesión VIEWER y tenant remoto |
| A3 | Integración autenticada tras disponer de base gobernada: captura → cálculo → guardado → detalle → reapertura | Resultado y linaje iguales; original intacto; sin publicación ni envío | BLOQUEADO: v1 sin perfil y sin candidato activo alternativo aprobado |

El siguiente cambio de datos requiere identificar perfil operativo real, impacto, fuente de parámetros y recuperación posible, además de autorización puntual para crear/revisar, para activar y para una cotización sintética. Hasta entonces avanzar en A1/A2 sin afirmar C1 cerrado.

## Recuperación

La corrección es sólo de código y restringe acceso. Si afecta a usuarios autorizados, inspeccionar logs del deployment inmutable, revertir el commit de código en una rama limpia y publicar **otro** par Preview comprobado; no reutilizar los previews anteriores de runtime rotado. El script de auditoría sólo lee. No se modificaron producción, Supabase Auth, usuarios, migraciones, parámetros, bases o cotizaciones.

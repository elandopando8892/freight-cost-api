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

El gate se endureció en la fuente local para fallar cerrado si el código aparece en más de una organización, la base no está ACTIVE, no hay exactamente una versión activa y PUBLISHED, faltan los 210 parámetros canónicos o el perfil es nulo/inválido. Relectura de staging a las **04:16 UTC** con esquema `fcm.c1-quote-readiness.v2`: una base, v1 PUBLISHED/activa, 210 parámetros; `targetCandidateForNewCalculation=false` y bloqueador único `APPLICABILITY_PROFILE_MISSING` (salida 1 esperada). Typecheck API y 11/11 pruebas del evaluador PASS. Contar parámetros y validar la estructura del perfil **no** prueba valores económicos, cobertura de un viaje concreto ni autorización remota. Este auditor no forma parte del SHA desplegado del Web/API; no se redeplegó el par por un cambio local de preflight.

No se creó, publicó ni activó una versión, ni se guardó cotización. La decisión y recuperación de datos siguen en `C1_PROFILE_DECISION_2026-09-19.md`; activar una versión nueva no tiene rollback equivalente a reactivar v1 sin perfil. No convertir este bloqueo en un permiso para inventar parámetros o relajar el guard.

## Lectura autenticada del mismo candidato (29 sep, ~04:04 UTC)

En el Web Preview citado arriba se observó una sesión existente de `sales@heymarksman.com` como ADMIN de HeyMarksman. `/quote` abrió en ese mismo origen y **conservó la sesión tras recarga**. `/settings` mostró la identidad Supabase vinculada, el rol ADMIN actual y el equipo con OPERATOR y VIEWER. No se observó el intercambio inicial del código OAuth ni se esperó la expiración del token: callback y renovación siguen sin acreditarse. Tampoco se usaron credenciales o tokens en pruebas automatizadas.

En `/quote`, la UI etiquetó `XBF-XB-PILOT` v1 «requiere revisión» y advirtió que no hay base gobernada para el cálculo nuevo, consistente con la auditoría de solo lectura. `/cost-bases/partners` mostró **cero bases de socios**; no hay tarifa reutilizable publicada. `/quote/partners` ofrece la captura manual de compra; `/quote/partners/saved` permitió leer dos versiones históricas expresamente QA de una estimación sintética, sin verificar su vigencia ni convertirlas en benchmark o precio de venta. No se presionó Calcular, Guardar, Publicar ni Enviar.

El historial `/quotes` cargó 11 cotizaciones históricas. Se abrió la cotización existente `cmsr2lcy2000bidzgq4d2oqst` y su enlace «Volver a cotizar»: el formulario recuperó ruta, operación, servicio, base y versión, **sin recalcular ni cambiar el original**. El aviso de reapertura explicó explícitamente que v1 carece de perfil y sólo permite consultar cálculos históricos. Esta lectura acredita la parte de consulta/reapertura de un registro previo, no el recorrido A3 de crear una cotización nueva en el candidato.

## Contraste público de compra a terceros: sólo referencia, no parámetro

Fuente primaria inmutable: [USDA AMS, Specialty Crops National Truck Rate Report del 22 sep 2026, publicado el 23 sep](https://mymarketnews.ams.usda.gov/filerepo/sites/default/files/2375/2026-09-21/1353300/ams_2375_00344.pdf), pp. 1, 4–5. Para cruces de México por el sur de Texas a Dallas reporta un rango de **$2,000–$2,400 por carga**, con rango predominante de **$2,200–$2,400**. El propio informe define estas cifras como precios de venta spot pagados por cargadores o receptores, incluidas comisiones de brokers, para carga completa de productos frescos en remolques refrigerados de 48–53 pies y un destino. No cubre necesariamente terminal, múltiples paradas, tramo mexicano ni intercambio entre líneas.

**Elegibilidad para el motor: NO.** Esa observación no es la tarifa de compra contratada por XBF, no es dry van ni un costo D2D Monterrey–Dallas, y tampoco prueba el desglose MX/EE. UU., vigencia o condiciones de una contraparte. Sirve sólo para contrastar una eventual propuesta comercial comparable de reefer en ese corredor. Antes de crear una base de socios se necesita una fuente verificable de compra para cada tramo/modalidad, con proveedor, equipo, origen/destino, moneda, fecha y vigencia, incluidos/excluidos y aprobación; la ausencia de esa fuente se mantiene visible como `sin cobertura`, sin usar las estimaciones QA históricas ni convertir este rango público en CFU, CVU o precio de venta.

## Plan de prueba de aceptación pendiente

| Gate | Tipo y caso mínimo | Criterio de cobertura | Estado |
| --- | --- | --- | --- |
| A1 | E2E en **este** origen: Google → callback → rol; recarga y renovación | Tres roles existentes sin exponer tokens; ninguna sesión antigua sustituye el candidato | PARCIAL: ADMIN y recarga observados; faltan callback, renovación y otros roles en este SHA |
| A2 | E2E/UI + API: ADMIN/OPERATOR habilitados, VIEWER lectura y 403 en las tres rutas; recurso ajeno 404/403 | Denegación remota antes de cómputo/escritura, más aislamiento entre organizaciones | PARCIAL: ADMIN y regresión local; faltan sesión VIEWER, denegación remota y tenant cruzado |
| A3 | Integración autenticada tras disponer de base gobernada: captura → cálculo → guardado → detalle → reapertura | Resultado y linaje iguales; original intacto; sin publicación ni envío | BLOQUEADO: auditor v2 confirma perfil ausente; bases de socios vacías; QA históricos no son tarifas vigentes |

El siguiente cambio de datos requiere identificar perfil operativo real, impacto, fuente de parámetros y recuperación posible, además de autorización puntual para crear/revisar, para activar y para una cotización sintética. Hasta entonces avanzar en A1/A2 sin afirmar C1 cerrado.

## Recuperación

La corrección es sólo de código y restringe acceso. Si afecta a usuarios autorizados, inspeccionar logs del deployment inmutable, revertir el commit de código en una rama limpia y publicar **otro** par Preview comprobado; no reutilizar los previews anteriores de runtime rotado. El script de auditoría sólo lee. No se modificaron producción, Supabase Auth, usuarios, migraciones, parámetros, bases o cotizaciones.

# Freight Cost Model — control de avance a producción

Última actualización: 2026-08-20
Fuente operativa: [`release-progress.json`](./release-progress.json)
Comando: `npm run progress:release`

Sprint activo: **12 — QA visual autenticada contra wireframes**
Candidato remoto verificado: `bbf4716a6b33aa72681717a9a9bcbb01d9ed0c1c`
Evidencia: [`../pilot-evidence/2026-08-20/bbf4716/visual/audit-status.json`](../pilot-evidence/2026-08-20/bbf4716/visual/audit-status.json)

## Lectura actual

El avance general se calcula como promedio ponderado de siete frentes. La ponderación representa el riesgo y el trabajo que todavía deben quedar demostrados para producción; no es un promedio simple de features.

| Frente | Peso | Avance | Estado |
|---|---:|---:|---|
| Motor, datos y gobierno | 20% | 96% | Release verificado en staging |
| UI/UX Rateware y wireframes | 15% | 90% | Tres P2 corregidos localmente; recaptura pendiente |
| Bases, presets y wizard consultivo | 15% | 90% | Implementado; validación con datos reales pendiente |
| Cotización y Quote Desk | 15% | 100% | Piloto y reconciliación PASS en staging |
| RateBook e integración Rateware | 15% | 88% | Piloto Gmail PASS; handoff RateBook pendiente |
| Kinde, roles y seguridad | 10% | 95% | ADMIN, BFF y OAuth conectado |
| QA, evidencia y release | 10% | 95% | Promoción de Sprint 11 verificada |

**Avance general ponderado actual: 93.4%.**

El Sprint 12 ya recorrió autenticadamente Dashboard, Bases, Supuestos, Producción, Quote Desk y RateBook. A 1280 px las seis superficies conservaron el shell horizontal sin overflow de página. A 390 px, cuatro pasaron y Quote Desk/RateBook revelaron que el ancho mínimo de sus tablas podía expandir el contenedor raíz; también se confirmó un selector de Producción sin nombre accesible y un mensaje de reconciliación en inglés. Los tres defectos P2 quedaron corregidos localmente y pasan 10/10 pruebas focales del correo, typecheck API/Web, ESLint focal y `git diff --check`.

La aceptación visual aún no está cerrada: los fixes deben publicarse en staging y recapturarse en los tres breakpoints. La herramienta de captura agotó el tiempo después de conservar cinco capturas aceptadas de 1440×900, por lo que este avance no se presenta como PASS final.

Sprint 10 dejó el receiver Gmail activo en Rateware staging, la migración `20260814000300` aplicada, una sola rama preview de Supabase, CORS exacto, rechazo anónimo `401/no-store` y el BFF autenticado funcionando. API y Web de staging están READY sobre el SHA `bbf4716`; `/health` y `/ready` coinciden con ese release y la base responde conectada.

Los secretos OAuth están presentes en el preview aislado. La función `rateware-api` v439 y `gmail-oauth-callback` v65 completaron el consentimiento para `sales@heymarksman.com`: Settings muestra **Conectado**, los tokens de acceso y renovación están cifrados, no existe error y no quedó un estado OAuth activo pendiente. La base de staging recibió las tres migraciones que le faltaban y el API fue redeplegado con `DATABASE_URL` aislada por la rama `staging`; producción no cambió.

La cotización `CQ-2026-F49BD6B7` fue enviada una sola vez desde `sales@heymarksman.com` hacia `jgonzalez@xbfreight.com`, con la ruta Monterrey → Dallas, tarifa USD 2,100 y vigencia al 27 de agosto de 2026. Gmail `SENT` y el ledger de Rateware coinciden con el recibo `96335a0f-b1cd-43a2-9b90-421ac10aad34` y provider message id `1a01e70f80887783`. El avance sube a 92.0%.

El piloto descubrió y acotó un intento previo que falló antes de llamar a Gmail. El hardening ya está publicado en FCM staging y Rateware `rateware-api` v443: la reconciliación devolvió `NOT_ATTEMPTED`, marcó el intento como fallido y bloqueó borradores equivalentes porque existe una entrega SENT. Gmail y el ledger conservan una sola copia.

Este porcentaje significa “trabajo implementado y verificable localmente”, no “listo para publicar”. El producto no puede marcarse 100% mientras exista un gate externo en estado pendiente o bloqueado.

## Qué falta para 100%

1. QA visual autenticada de las pantallas principales en 1440×900, 1280×800 y 390×844, comparada contra el wireframe horizontal.
2. Smoke autenticado con `sales@heymarksman.com` como ADMIN principal: login, Settings, Gmail, permisos y logout.
3. Ejecutar handoff real de un RateBook a Rateware y conservar payload, respuesta, checksum y actor.
4. Generar el paquete de evidencia del SHA candidato y ejecutar el preflight/release gate completo, incluyendo migraciones y configuración de producción.

## Sprints de cierre

El plan ejecutable está en [`docs/superpowers/plans/2026-08-19-production-closure-sprints.md`](docs/superpowers/plans/2026-08-19-production-closure-sprints.md). La secuencia actual es:

| Sprint | Enfoque | Meta acumulada |
|---:|---|---:|
| 9 | Baseline de release y paridad de ambientes | 86% |
| 10 | Promoción del receiver Gmail de Rateware | 89% |
| 11 | Piloto autenticado de Quote Desk con `sales@heymarksman.com` | 92% |
| 12 | QA visual y cierre UI/UX contra wireframes | 94% |
| 13 | Handoff end-to-end de RateBook a Rateware | 97% |
| 14 | Release productivo y hypercare | 100% |

Las metas sólo se incrementan cuando existe evidencia del gate correspondiente. Un sprint con dependencia externa pendiente conserva el porcentaje anterior.

## Modelo y esfuerzo por sprint

| Sprint | Modelo | Esfuerzo | Participación humana |
|---:|---|---|---:|
| 9 | Codex Spark + revisión fuerte | 4–6 h IA | 1–2 h |
| 10 | Modelo fuerte, razonamiento alto | 8–12 h IA | 2–3 h |
| 11 | Modelo fuerte + Spark para UI | 6–10 h IA | 2–3 h |
| 12 | Spark + auditoría fuerte | 8–12 h IA | 2 h |
| 13 | Modelo fuerte, razonamiento alto | 8–12 h IA | 2–3 h |
| 14 | Modelo fuerte, modo máximo | 4–8 h IA | 3–4 h |

Estimación total: **38–60 horas de IA**, **12–17 horas humanas** y **2–3 semanas calendario**. La parte humana es obligatoria para OAuth, recepción real en Rateware, aprobación del envío y decisión GO.

## Regla de actualización

Después de cada sprint se actualiza únicamente [`release-progress.json`](./release-progress.json):

- `progress` mide implementación verificada.
- `status` distingue implementado de pendiente externo.
- `blockers` enumera lo que todavía impide producción.
- `productionGates` evita que el avance de código oculte una integración no probada.

El 100% se alcanza sólo cuando todos los gates tienen `status: PASS` y existe evidencia remota asociada al commit desplegado.

# Sprint 11 — corte Supabase Auth y aceptación móvil

**Fechas propuestas:** 2026-08-31 — 2026-09-11
**Equipo supuesto:** André como Product/Release Owner + Codex como ejecución de ingeniería
**Objetivo:** demostrar en staging que todos los usuarios, permisos e integraciones críticas operan con Supabase Auth y aceptar la experiencia móvil MARKSMAN, conservando rollback y sin promover a producción.

> La capacidad se estima porque no se proporcionaron PTO, reuniones ni otros integrantes. Replanificar si cambia el equipo. Ninguna tarea autoriza por sí sola migraciones remotas, envíos Gmail, promoción a producción o gasto adicional.

## Capacidad

| Participante | Disponibilidad | Asignación | Notas |
| --- | ---: | ---: | --- |
| André | 4 bloques de decisión/aceptación | Aprobaciones y sign-off | Ventanas, conciliación y aceptación visual |
| Codex | 8 días efectivos de 10 | 24 puntos máximos | 20% reservado para diagnóstico y correcciones |
| **Capacidad comprometible** |  | **18 puntos** | 75% de la capacidad máxima |

## Backlog comprometido

| Prioridad | Entregable | Estimación | Responsable | Dependencias / gate |
| --- | --- | ---: | --- | --- |
| P0 | Censo de identidad y dry-run del corte: total de usuarios, enlazados, sin enlace, duplicados por email y conflictos de sujeto | 3 pts | Codex + André | Acceso de sólo lectura a Neon; cero datos sensibles en el reporte |
| P0 | Aplicar primero la fase aditiva y después `20260830000200_finalize_supabase_identity` en staging | 3 pts | Codex | Autorización explícita para la ventana; backup; `usuarios_sin_supabase_id = 0` |
| P0 | Matriz E2E Auth: Google, email/contraseña, confirmación, recuperación, sesión SSR, expiración, logout, tenant y rol | 5 pts | Codex + André | SMTP de desarrollo o cuentas de prueba; no SMS/MFA Phone |
| P0 | Receptor Rateware con JWT Supabase: verificación de issuer/audience/sesión y smoke sin efecto para RateBook/Gmail | 5 pts | Codex | Checkout Rateware vigente; autorización separada antes de cualquier envío real |
| P0 | Evidencia de release y rollback: SHA, variables por nombre, migraciones, conteos, callbacks, CORS y runbook | 2 pts | Codex | Los artefactos deben apuntar al mismo entorno |

**Carga comprometida:** 18/24 puntos — 75%.

## Stretch, sólo si los P0 están verdes

| Prioridad | Entregable | Estimación | Gate |
| --- | --- | ---: | --- |
| P1 | Corregir hallazgos visuales móviles P1/P2 de login, navegación y dashboard MARKSMAN | 3 pts | Dispositivo o navegador con viewport verificable |
| P2 | Diseñar SMTP productivo y MFA TOTP | 3 pts | Decisión de proveedor, costo y operación; no activar en este sprint |

## Matriz mínima de aceptación móvil

| Superficie | Estados obligatorios | Evidencia |
| --- | --- | --- |
| 390 × 844 | Login, Google, error, recuperación, dashboard, menú, logout | Capturas completas y prueba de interacción |
| 768 × 1024 | Login y dashboard con navegación adaptable | Captura y ausencia de scroll horizontal |
| 1280 × 800 | Login y dashboard autenticado | Comparación con el manual MARKSMAN |
| 1440 × 900 | Dashboard, tablas y Settings | Captura, foco visible y jerarquía consistente |

## Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Usuarios históricos sin `supabaseId` | El corte final aborta | Conciliar por email confirmado; no reasignar tenant o rol automáticamente ante conflicto |
| Rateware todavía valida el proveedor anterior | RateBook/Gmail queda bloqueado | Migrar verificación JWT y probar recepción sin envío antes del corte |
| El navegador integrado no cambia viewport | Falsa aceptación móvil | Usar un dispositivo o navegador autorizado cuyo `innerWidth` pueda comprobarse |
| Google OAuth sigue en Testing | Sólo usuarios de prueba pueden entrar | Mantener allowlist de testers hasta la revisión de publicación de Google |
| Correo de Supabase sin SMTP propio | Entregabilidad limitada | Usar únicamente cuentas de prueba; SMTP productivo queda fuera sin decisión y autorización |

## Definition of Done

- [ ] Censo de staging con `usuarios_sin_supabase_id = 0` y conflictos resueltos por una persona.
- [ ] Backup registrado y migraciones aplicadas en orden al entorno autorizado.
- [ ] Esquema remoto sin `kindeId` y con `supabaseId` obligatorio y único.
- [ ] Matriz Auth completa en staging con tenant y rol preservados.
- [ ] Rateware acepta JWT Supabase; no se ejecutó ningún envío real sin autorización.
- [ ] Login y shell MARKSMAN aceptados en los cuatro viewports.
- [ ] Lint, pruebas, typecheck, build, auditoría de producción y contratos de migración verdes.
- [ ] Runbook de rollback probado y evidencia ligada al mismo SHA.
- [ ] Sign-off de André antes de cualquier promoción a producción.

## Fechas clave

| Fecha | Evento |
| --- | --- |
| 2026-08-31 | Inicio y censo de identidad |
| 2026-09-03 | Gate de conciliación y decisión de ventana staging |
| 2026-09-07 | Checkpoint E2E Auth + Rateware |
| 2026-09-10 | Aceptación móvil y revisión de evidencia |
| 2026-09-11 | Demo, decisión Go/No-Go y retro |

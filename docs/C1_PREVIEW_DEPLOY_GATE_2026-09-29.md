# C1 — preflight del siguiente par Preview

Estado 2026-09-29 04:36 UTC: **NO DEPLOY / requiere autorización puntual del runtime**. Esta lista se limita a Freight Cost Model; no es autorización para producción, migraciones, Auth ni cambios económicos. Modelo recomendado: GPT-6 Sol, esfuerzo medio para preflight; GPT-6 Astra, esfuerzo alto para el corte de credenciales/aislamiento.

## Pre-deploy

- [x] Fuente en D: limpia: `codex/cost-tires-release-s14`, HEAD `1dfde4aae0bce25768ba37c0a5864e74369053e7`.
- [x] Desde el candidato publicado `464ed48b4a4bef6f938f68d85e68a51a17297d8a`, los cambios de código son el auditor C1 de sólo lectura y el 404 uniforme de cotizaciones; sin cambios en migraciones, Auth o callback.
- [x] API: 672/672 pruebas locales en 85 suites sin PostgreSQL desechable, typecheck PASS; las cinco suites `*postgres.test.ts` no se incluyen en este resultado.
- [x] Par Preview vigente Web `bjsq11eye` / API `abjaf48sh`: verificación de sólo lectura **8/8 PASS**, `/health` y `/ready` HTTP 200, release del SHA anterior. No es prueba de que el commit nuevo esté desplegado, ni de upstream BFF autenticado.
- [x] Identidades de proyecto/equipo API y par anterior verificadas con metadatos Vercel; ninguna consulta imprimió valores de variables de entorno.
- [ ] **Runtime seguro del nuevo API:** el `STAGING_DATABASE_URL` configurado para todo Preview no usa el rol limitado `fcm_tire_v2_preview_20260929` documentado para el API vigente. No se ha acreditado su nivel de privilegios ni un mecanismo seguro de reutilización de la credencial de ese rol por deployment. Bloquea el deploy con el entorno compartido.
- [ ] Cobertura OAuth de la URL Web nueva exacta y smoke público/BFF después de desplegar; no inferirla de la URL anterior.
- [ ] Sesiones remotas autorizadas de OPERATOR, VIEWER y otro tenant para aceptación A1/A2; las regresiones locales no las sustituyen.

## Corte propuesto, sujeto a autorización

Preferir **un rol de runtime nuevo y limitado**, sólo en Neon staging `broad-art-99750179/neondb`, con grants mínimos comprobados, sin superusuario ni `BYPASSRLS`, RLS forzada donde aplique y sin lectura del ledger de migraciones. Inyectar su URL sólo en el deployment API Preview, mantener apagada la captura de llantas v2, publicar API y Web del mismo SHA, verificar ocho checks del par, health/ready, cobertura OAuth y smoke. No cambiar el `STAGING_DATABASE_URL` compartido, Site URL, alias, usuarios, bases de costos ni producción. Crear/otorgar credenciales en Neon es una mutación de infraestructura y requiere autorización específica antes de ejecutar.

No rotar el rol que utiliza el par vigente: una rotación invalidaría su conexión y eliminaría el fallback. Si falla un deployment nuevo, dejar de usar sus URLs inmutables, conservar el par vigente y revisar logs sin exponer credenciales. Revocar un eventual rol nuevo sólo tras comprobar qué deployments dependen de él. El fix del 404 está **sólo en Git** hasta que este gate se resuelva.

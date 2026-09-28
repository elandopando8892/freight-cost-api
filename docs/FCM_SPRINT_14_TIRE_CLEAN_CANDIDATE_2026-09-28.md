# Sprint 14 — candidato limpio de COST_TIRES

Fecha: 2026-09-28
Modelo: GPT-6 Sol
Esfuerzo: alto

## Resultado

Se materializó el corte gobernado de COST_TIRES sobre un worktree limpio, partiendo exactamente de `8b2cc00b003a9e809c1119ceaeeaf15be5fc7616`. El candidato contiene el workbench autenticado, la economía de ciclo de vida, cohortes, estadística, propuesta de calibración, persistencia multi-tenant y el contrato de migración correspondiente.

- Worktree: `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`
- Rama: `codex/cost-tires-release-s14`
- Corte funcional: 33 archivos; 29 completos y 4 reconstruidos parcialmente desde el commit base.
- Digest del corte: `301cebbda6f27dea72d6f226cae306ddabdf8a7516125ace8bccb9b2b2e8eab3`
- Esta bitácora es el archivo 34 del candidato y no forma parte del digest funcional.

## Evidencia reproducible

El materializador validó el manifiesto, el cierre de dependencias, el esquema Prisma reconstruido y el contrato de migración:

- Prisma schema: válido.
- Contrato de migración: conserva contexto Neon, tenant keys, `FORCE ROW LEVEL SECURITY`, evidencia append-only y estado sólo candidato.
- `productionEnabled`: `false`.
- `remoteMutationAuthorized`: `false`.

Sobre dependencias instaladas desde el lockfile del candidato limpio:

- API completa, excluyendo únicamente la prueba PostgreSQL aislada: 78 archivos aprobados, 3 omitidos; 626 pruebas aprobadas y 23 omitidas.
- COST_TIRES dirigido: 7 archivos y 45 pruebas aprobadas.
- API typecheck: aprobado.
- API build: aprobado.
- Web completa: 7 archivos y 41 pruebas aprobadas.
- Web build: aprobado; incluye la ruta `/cost-bases/tires`.

La generación local de Prisma se ejecutó después de `npm ci`; no modificó archivos versionados.

## Gate aún pendiente

La prueba `tire-calibration-rls-postgres.test.ts` exige una base PostgreSQL/Neon desechable y aislada. No se ejecutó contra una base compartida y no se aplicó la migración. Por tanto, la evidencia actual demuestra integridad de código, build, contrato estático y regresión local; todavía no demuestra aislamiento RLS real, flujo autenticado en preview ni aceptación multiusuario.

Para el siguiente gate se requiere autorización puntual antes de cualquiera de estas acciones:

1. Aprovisionar o seleccionar una base preview desechable.
2. Aplicar la migración únicamente en esa base.
3. Desplegar API y web desde el mismo commit del candidato a preview.
4. Validar sesión autenticada, autor y dos ADMIN distintos del mismo tenant.

## Límites preservados

- Sin push ni despliegue.
- Sin cambios en Supabase Auth, Site URL, redirect URLs, usuarios o roles.
- Sin migraciones ejecutadas y sin escrituras en Neon o producción.
- Sin cambios de negocio, cotizaciones, IA o infraestructura compartida.
- El candidato continúa con `quoteEligible=false`, escritura de parámetros deshabilitada y producción deshabilitada.

## Rollback

Mientras no exista push ni despliegue, el rollback consiste en abandonar la rama y retirar el worktree dedicado. No se ejecutó ningún rollback destructivo; el worktree se conserva para el gate de preview.

## Checklist de liberación

- [x] Base y rama verificadas.
- [x] Delta mínimo materializado y revisado.
- [x] Dependencias instaladas desde lockfile.
- [x] Tests, typecheck, build y contratos estáticos aprobados.
- [x] Límites de producción y mutación remota documentados.
- [x] Rollback local documentado.
- [ ] Prueba RLS sobre PostgreSQL aislado.
- [ ] Preview web/API del mismo commit.
- [ ] Aceptación autenticada multiusuario.

# Sprint 1: estabilización local, no salida a producción

## Objetivo, alcance y elección

Instrucción humana «adelante continua» tras el plan de tres sprints: resolver fallos de cotización/dashboard, comprobar PostgreSQL desechable/RLS y pruebas/tipos/build. Checkout D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14/HEAD4f5fc2de0c3d178dace917231e1092040dec21fd;353entradas sucias previas conservadas. Sin nueva rama, commit, PR ni deploy. No reactivar rol QA ni tocar Neon, Auth/Google, usuarios reales, importes o fórmulas.

Codex/OpenAI ejecutor local, recomendado GPT-6.1 Sol/alto; modelo/esfuerzo efectivos, cuota/tokens/cargos desconocidos. Claude considerado pero no necesario para fallos reproducibles con suite local; no invocaciones auxiliares/subagentes. Presupuesto de este corte45min de trabajo local desde aproximadamente21:00 Ciudad de México, hasta dos correcciones por causa, sin ampliar accesos/gasto. Se usan systematic-debugging, test-driven-development y verification-before-completion: reproducción antes de fix y resultado final antes de cierre.

Benchmark proporcional: inspeccionados contratos API/cliente, pruebas existentes, diff de sanitización RSC, guard de diésel y runner Docker ya disponible. Opciones: debilitar validadores para hacer pasar tests (rechazada); reconstruir UI/motor/infraestructura (sin ventaja); conciliar fixtures con contratos y corregir errores reproducidos conservando guardas (elegida). Guía local Next16.3.3 server-and-client-boundary.md leída completa antes del cambio al hook. No nueva librería, infraestructura persistente ni diseño: wireframes/branding existentes intactos.

## Causas y correcciones

1. **Preview de cotización:** reproducción HTTP422, cuerpo «Captura la fecha del servicio para revisar el diésel USA». El caso positivo omitía serviceDate y confirmación de combustible del viaje. Prueba actualizada para llamar route-inputs primero, verificar que no escribe preview y confirmar el contextHash real de esa respuesta antes de quote-by-route. Se conserva precio sintético5.152/gal y FX18.75, no actualiza benchmark público. Verifica fecha/precio/modo provisional guardados; casos nuevos de fecha omitida/confirmación omitida/contexto obsoleto rechazan422/409 sin insert. No guard económico relajado.
2. **Dashboard:** cliente real lanza Error con status; test viejo rechazaba objeto plano y esperaba error crudo. Contract actual sanitiza para no enviar Error/stack/cause/body a RSC. Fixture usa forma real y exige metadata HTTP500 sin datos privados; no cambio al helper de producto.
3. **Cotización web:** al ejecutar tipos/suite se detectó `error` referenciado en éxito, fuera de catch. Mock viejo de fetcher tampoco exportaba evento/clase, impidiendo montar el hook. Mock parcial conserva exports reales, representa route-inputs→quote-by-route. Con ese contrato corregido, seis pruebas reprodujeron que éxito no conserva resultado; se movió el manejo401/403/409 al catch.46/46focales pasaron después. Se agregaron tres regresiones de fuel confirmado→rechazo401/403/409→limpieza→revisión nueva, sin reuse silencioso.
4. **Tipos:** fail como declaración de función permite narrowing del precio después de guard null (mismo throw/status). Prisma recibe explícitamente las tres variables que resolveDatabaseUrl consume, evitando weak type bajo compilación Web, sin cambiar selección Preview/Production ni URLs reales. Fixture wizard reemplaza objeto de catálogo para simular cambio de revisión readonly, no modifica el catálogo real.

Archivos: apps/api/tests/dashboard-state.test.ts, quote-preview-create-route.test.ts; src/modules/engine/trip-fuel-review.ts (sólo forma de declaración fail), src/config/prisma.ts (sólo proyección de env); apps/web/app/(app)/quote/use-quote-draft.ts; tests/quote-draft.test.tsx y version-wizard.test.tsx. Cambios previos solapados conservados; retirar sólo estos hunks para rollback, nunca checkout/reset global.

## PostgreSQL/RLS real, exclusivamente local

Reutilizado sin modificar scripts/test-tire-preview-isolated.ps1. Docker Desktop local disponible, imagen postgres:17-alpine ya instalada. Runner crea contenedor propio aleatorio fcm-tire-s15-*, tmpfs, puerto dinámico sólo127.0.0.1 y base fcm_tire_s8. Se aplicaron46migraciones existentes únicamente ahí; replay no aplica nuevas, migrate status up-to-date. No migraciones en Neon/QA/producción.

17/17tests en3archivos: tire-calibration-rls-postgres6, tire-cohort-v2-rls-postgres2 y multitenant-contract9. Rol aplicación NOSUPERUSER/NOBYPASSRLS comprobado;7tablas forcedRLS. Backup y restore comparados:3dossiers/9eventos/2packages/2snapshotsv2/1head, huellas iguales. Identidades/valores sintéticos; no aceptación de transportista real o navegador. Runner exit0 y finally detuvo/eliminó su contenedor --rm/tmpfs; filtro Docker por label no mostró contenedores propios restantes. Datos sintéticos y dump interno desechados, no recuperables; las pruebas permiten recrearlos. Otros contenedores no tocados.

La suite PostgreSQL obligatoria se ejecuta con su runner, no usando una URL de Neon ni ocultando el error de colección. Suite API restante usa `vitest run --exclude tests/tire-calibration-rls-postgres.test.ts`; esa exclusión separa el entorno especializado ya ensayado, no sustituye su verificación. Los otros tests de integración que no tienen entorno siguen omitidos y no cuentan como aceptación.

## Verificación y cierre

Reproducción inicial:2fallos/7pasan en9tests API; diagnóstico detallado422 confirma causa. Tras fixtures:12/12API. Web primera suite completa:233pasan/7fallan, siete por mock incompleto; esa corrida es anterior a reparación final y no se presenta como verde. Web focal después de reparación:46/46 y tipos exit0. Se lanzó suite Web completa otra vez después de añadir tres regresiones, API restante amplia, build API y build Next; resultados definitivos se anexan al finalizar.

Sin cambios de valores, Auth o desplegados. Recorrido autenticado B3 previo permanece documentado; este corte sólo prueba ejecución local/sintética y PostgreSQL local, no nueva aceptación de producción. **Sprint1 cerrado en su alcance de estabilización local** con resultados finales siguientes; sprint2 calibración/adopción por base y B4release permanecen fuera de este corte.

### Resultados finales ya recibidos

- API build (`tsc`) exit0, seguido de66/66tests focales (database-url, quote-preview-create-route, dashboard-state, b2-own-relay-review). La declaración fail/proyección env no modifican importes ni selección de destino.
- Web suite completa después del último código:27archivos/243tests PASS. Incluye las tres regresiones401/403/409 nuevas; no resultado de navegador autenticado.
- Next16.3.3 build exit0: compilación Turbopack, TypeScript,14páginas estáticas y rutas dinámicas terminadas. NEXT_TELEMETRY_DISABLED=1 sólo en ese proceso. Build de producción es un artefacto local: no deploy ni promoción. Se cargó .env.local existente sin editarlo; no se imprimieron valores.
- RLS17/17 y backup/restore PASS según detalle anterior. Archivo obligatorio RLS no queda omitido en la verificación combinada: pasa en su entorno independiente.
- API amplia final:209archivos PASS/4omitidos,3243tests PASS/25omitidos, cero fallos;213archivos/3268tests. Inicio21:04:56/duración810.79s/exit0. Los tests omitidos no acreditan aceptación de esas integraciones. RLS se reporta aparte, no se suman sus17tests a3243 porque hay solape de nueve tests y dos casos presentes como skip en suite común.
- Typecheck Web global exit0. Lint inicial encontró dos any de fixture y warning del gate en cleanup: sustituidos por VersionWizardSave y captura de la instancia de gate dentro del effect; no se alteró la economía ni catálogo. Pruebas afectadas tras último código:35/35 (quote-draft y version-wizard). Typecheck global y ESLint de esos tres archivos, exit0/sin warnings después de última modificación. Segunda compilación Next posterior a cleanup/tipos:exit0, compila36s/TypeScript89s/14estáticas3.8s y optimización final. No se confunde la suite Web243 previa a ese cleanup menor con una ejecución completa nueva: se repitieron los35tests afectados, tipos/lint y build después del último código.

Revisión vercel:react-best-practices aplicada al hook y fixtures: se conserva una sola suscripción por dueño y cleanup de su instancia, estado transitorio en refs y errores serializados mínimos. No SWR nuevo ni paralelización de consultas dependientes: confirmar combustible necesita la respuesta previa y luego ejecutar cálculo. No nuevas capturas visuales porque no se cambió markup/branding; pruebas DOM no son aceptación autenticada ni reemplazan los wireframes B3 existentes.

Comandos reproducibles (desde raíz, excepto suite por workspace):

```powershell
./apps/api/scripts/test-tire-preview-isolated.ps1
# En apps/api:
node ../../node_modules/vitest/vitest.mjs run --exclude tests/tire-calibration-rls-postgres.test.ts
node ../../node_modules/typescript/bin/tsc
# En apps/web:
node ../../node_modules/vitest/vitest.mjs run
node ../../node_modules/typescript/bin/tsc --noEmit
$env:NEXT_TELEMETRY_DISABLED='1'
node node_modules/next/dist/bin/next build
```

El `test` API desnudo sin env PostgreSQL seguirá fallando por guard de colección, por diseño. No se cambia ese guard ni se declara un comando sin entorno como PASS. La verificación combinada divide suite común y suite DB obligatoria. Los25tests omitidos de integración restante tienen su propia configuración; no quedan certificados por esta partición.

Checkpoint final5oct2026 aproximadamente21:22 Ciudad de México: rama/HEAD sin cambio, diff --check focal exit0 (sólo aviso CRLF), no contenedor desechable propio restante. Ningún servicio API/web iniciado ni gate QA reabierto en este corte. Resultado: fallos locales conocidos resueltos y artefactos de build disponibles; no candidato productivo aceptado. Siguiente sprint2: inventario por base de valores documentados/provisionales/faltantes, criterios de adopción y trazabilidad a CFU/CVU, sin marcar210parámetros como calibrados por tener tests verdes.

## Rollback

Retirar únicamente hunks de fixtures, catch, declaración fail y proyección de env de este corte. Conservar eventos reales, benchmark, fuentes, catálogo y trabajo ajeno. No se dejan servicios nuevos ni cambios de Docker globales. Las salidas dist/.next son artefactos de build local, no despliegue. No reactivar ningún gate QA consumido.

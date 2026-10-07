# B4 · suite API reproducible con RLS local

## Objetivo y alcance

Continuación humana del desarrollo,6oct2026. El checkpoint vigente ya incluye [guardado autenticado y cierre QA18:19](S2_FAMILY_ACTOR_FIX_QA_2026-10-06.md); no se reabre ni se repite. Este corte resuelve únicamente la ejecución local de la suite API que venía fallando en colección por faltar el fixture loopback de llantas. No certifica adopción económica, UI multiusuario/refresh, candidato por SHA o salida a producción.

Checkout físico D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd. Árbol previo sucio conservado; sin rama/worktree/commit/stage/PR nuevos. Cambios: modo FullSuite/Plan en runner existente, dos pruebas de su entrada real y documentación/estado. No Auth, Neon, usuarios de negocio, fórmulas/importes/calibración, cloud, publicación o UI modificados.

## Revisión previa y elección

Se revisaron test-tire-preview-isolated.ps1 completo, runners locales de familias/partners, vitest.config.ts, npm test y guards de bases/roles. El runner existente ya crea PostgreSQL desechable, aplica/repite las46migraciones actuales, valida RLS con rol sin superuser/bypass, compara respaldo/restauración y hace finally/limpieza. El bloqueo no justificaba quitar la guarda ni conectar a Neon.

| Opción | Ajuste/costo/riesgo | Decisión |
|---|---|---|
| Relajar la prueba RLS o excluirla de npm test | Oculta el pendiente, pierde prueba de permisos | Rechazada |
| Crear otro orchestrator/servicio/DB | Duplica migraciones, roles y limpieza ya resueltos | Rechazada |
| Añadir FullSuite al runner existente | Misma infraestructura local instalada y guardas, sin dependencia/licencia contratada o coste cloud nuevo | Elegida |

[npm test](https://docs.npmjs.com/cli/v10/commands/npm-test/) ejecuta el script de pruebas del paquete; aquí es vitest run sin filtro, dentro apps/api. El nuevo modo usa **npm test**, no un alias de pruebas focales presentado como suite completa. [Docker tmpfs](https://docs.docker.com/engine/storage/tmpfs/) es almacenamiento temporal que desaparece al detener el contenedor, pero puede usar swap; no se afirma borrado criptográfico ni que jamás toque disco. Sólo fixtures sintéticos, nada de datos productivos. No se cambia la licencia de Docker instalada ni se afirma que sea gratuita para toda empresa.

Codex/OpenAI ejecutor único. GPT-6.1 Sol/high recomendado/solicitado; modelo/esfuerzo nativos efectivos desconocidos. Claude considerado: trabajo determinista/verificable con runner local; Fable anterior1/1 cerrado, cero llamadas nuevas/subagentes/IA de negocio. Presupuesto45min desde19:27 hasta20:12CDMX; una ejecución completa, sin retry automático. Cuota/tokens/cargos desconocidos, sin créditos/uso extra/proveedores activados. Skills test-driven-development y writing-good-tests para probar la entrada PowerShell real; systematic-debugging para aislar Docker apagado/fixture ausente; verification-before-completion para separar plan, RLS, suite y aceptación real.

## Implementación mínima y uso

Sin flags se conserva la validación focal original. `-FullSuite` invoca npm test después de preparar el mismo fixture y conserva backup/restore. `-Plan` devuelve modo/runner/argumentos/DB/cwd sin consultar Node/Docker ni conectar DB. STAGING_DATABASE_URL y VERCEL_ENV se neutralizan únicamente en el proceso del runner y se añaden a su restauración finally existente, evitando heredar una selección Preview.

Las pruebas de llantas usan ahora su namespace FCM_TIRE_TEST_ADMIN_URL/FCM_TIRE_TEST_APP_URL. El adaptador es **sólo de tests**: par completo, esquema PostgreSQL/127.0.0.1/fcm_tire_s8, rechazo de URL remota/otra base y compatibilidad con los runners focales antiguos. La suite RLS conserva su guarda obligatoria de ausencia/target; no se vuelve opcional. En FullSuite los aliases genéricos FCM_TEST_* se vacían sólo en el proceso, porque pertenecen también a suites de partners con otro fixture. Las integraciones de partners/familias/quote que no se provisionen quedan **omitidas y no certificadas**, no usan la base de llantas ni desaparecen por filtro.

```powershell
# Desde la raíz física; plan sin crear nada
pwsh -NoProfile -File apps/api/scripts/test-tire-preview-isolated.ps1 -FullSuite -Plan

# Suite API y RLS reales en PostgreSQL local desechable
pwsh -NoProfile -File apps/api/scripts/test-tire-preview-isolated.ps1 -FullSuite

# Modo focal anterior, preservado
pwsh -NoProfile -File apps/api/scripts/test-tire-preview-isolated.ps1
```

Windows/PowerShell, Node>=22 y Docker Desktop Linux por named pipe local. Rechaza DOCKER_HOST/DOCKER_CONTEXT overrides y cualquier puerto no127.0.0.1. No descarga/install/update en este corte: imagen postgres:17-alpine ya presente, IDsha256:1bea307dfb3ee30541a7acf7de14b58bcd6948da98e5d31a04c627c4d35ec64b. Herramientas observadas: Node24.21.0/npm10.8.1/Docker29.7.2. Docker estaba apagado; se arrancó su ejecutable existente con WindowStyleHidden, sin cambiar configuración ni detener contenedores ajenos. Dejar Docker disponible no equivale a dejar una base de pruebas persistida.

## Verificación por capas

TDD: dos pruebas nuevas fallaron antes de implementar Plan/FullSuite, porque el runner intentaba consultar Docker. El doble sólo bloquea ese límite externo; las pruebas invocan el script real con URLs externas sintéticas para que Plan no opere sobre ellas. Después2/2PASS en8.72s; parser PowerShellPASS. En hosts noWindows esos dos casos se omiten explícitamente; no son prueba de portabilidad Linux del runner.

Primera ejecución real iniciada19:33, execsession40549: contenedor propio fcm-tire-s15-3e24a8aec56e, tmpfs, puerto127.0.0.1:63772, DBfcm_tire_s8.46migraciones aplicadas, segunda pasada sin pendientes y migrate status up-to-date. Rol fcm_tire_app sin superuser/bypass; npm test reveló dos tests RLS con timeout5000ms y dos suites de partners bloqueadas en colección por interpretar FCM_TEST_DATABASE_URL de llantas como su fixture. **Corrida diagnóstica interrumpida, no completa ni verde**, sin totales finales inventados. Backup/restore no alcanzados. Se verificó árbol propio runnerPID33236→npm→VitestPID11736 antes de terminar únicamente ese árbol Vitest; taskkill terminó raíz/worker y avisó de un hijo ya ausente. El runner terminóexit1 y ejecutó finally; ausencia del contenedor exacto confirmada19:42:32, sin datos/servicios externos ni contenedores ajenos detenidos.

Corrección proporcional: helper namespaced anterior con cinco pruebas RED por función ausente→PASS; los tests de partners no se editaron ni se relajó su guard. Presupuesto únicamente del test RLS real a30000ms, como patrón ya existente de integración partners; el deadline transaccional productivo no cambia. No se atribuye el tiempo inicial a una causa de red/CPU específica no medida. Verificación focal final16/16PASS en3archivos,5.04s, parserPS sin errores; tipos estrictos dirigidos se registran al finalizar. Todos los intentos anteriores se conservan; la segunda ejecución es verificación deliberada tras causas/corrección, no retry automático ni reset de contador/modelo.

Tipos estrictos dirigidos (helper, dos tests nuevos, dos testsRLS y declaración Fastify existente): exit0. Control negativo adicional19:47:05, misma prueba RLS sin fixture ni namespaces: falla en colección con su guarda obligatoria/0tests antes de conectar; exit1 esperado. **La prueba no se hizo opcional para conseguir verde.** El comando bare sin preparar entorno sigue bloqueando; para release local se usa el runner documentado, no se elimina esa señal de seguridad.

Segunda ejecución limpia iniciada19:43, execsession83015, contenedor propio fcm-tire-s15-c2eb6750957c, puerto127.0.0.1:49797;46migraciones/replay/status correctos. La suite RLS ahora ejecutó **6/6PASS en2417ms**, y partner-base quedó12SKIP al no tener su fixture. No se certifican esos12 por pasar RLS. Suite completa/backup/restore siguen en curso al registrar este checkpoint; resultados finales debajo. Todo el código de este corte quedó congelado antes de esa ejecución; sólo este informe se actualiza durante ella.

## Resultado final y cierre del pendiente local

**Gate de colección/RLS local resuelto y runner listo para repetir la suite API.** npm test completo: inicio19:44:04/duración421.71s, **3313PASS/29SKIP/0FAIL**,219archivosPASS/4SKIP de223,3342tests totales. Runner padre exit0 tras backup/restore/finally. Los29omitidos son partner-base12, partner-cost9, family-base6 y quote-preview2: no se provisionaron sus fixtures en esta corrida ni se certifican como PASS. RLS tire6PASS, cohortV2SQL2PASS y contrato multitenant9PASS sí se ejecutaron; no se convierte identidad sintética en aceptación de usuario humano.

Respaldo/restorePASS: originales y restaurados conservaron dossiers3/events9/packages2, dos huellas de package idénticas (`db2456bca0c3ff97b4ecb76a42a5a8bb68606d71e4dd6d90316d453b0ac20955` y64f), v2-snapshots2/v2-heads1/**forced-rls7**. El rol de aplicación no era superuser ni bypassRLS; cloudPreviewValidated:false/authenticatedBrowserValidated:false. No se exportó backup al host ni se restauró datos reales.

Los dos contenedores propios del corte se descartaron por finally/--rm. Ausencia de sus nombres exactos comprobada al cerrar; datos sintéticos/dump interno ya no recuperables, pero recreables por el runner. Docker instalado queda disponible, sin contenedor de este corte ni cambio de configuración. No Docker prune, reset, broad delete o parada de contenedores ajenos. Variables asignadas sólo dentro del proceso hijo; finally conserva restauración de los ocho slots, sin tocar .env. No se hizo prueba adicional de restauración de un entorno host arbitrario con credenciales reales.

Hash final de runner F9F653252F463B98B43F1D3DBEEB1B41D27D9A412A705C2228BF4F8FDC94AB42; helperE1281C4EB316E5EACAB67076F6A58C4347D1C952DB76922FEDC04D6A8DDD683D; tests nuevos6928F11CBC89BA5F528C9A519096EB885EE73EC930B8AEE22BD0B06F3EFC3539 y5DDE395CFD65E1B94E9CE95AC883E1950DD5AF1F1D4D686969A3A703CD014B1A. Pack económico conserva D1235CA788312CB5F0DD7B82A8354809AB93756E57BF5385483E52F0026D7DF0, rama/HEAD intactos. Tipos dirigidos/parserPS/whitespace de cambios sin errores; sólo avisosLF→CRLF. No build/Web/browser/Auth/CI/deploy nuevos: no se afirma release productivo ni candidato por SHA cerrado.

Antes: npm test sin el fixture se detenía en colección, y usar aliases genéricos para toda la suite activaba partners contra la base incorrecta. Ahora: comando único documentado prepara fixture exacto, corre la suite API conservando guards, comprueba backup/restore y limpia. **Pendiente siguiente existente: consolidar un candidato local frontend/API revisado**, preservando cambios ajenos y fijando evidencia por SHA; aceptación de referencia pública y recarga/multiusuario real mantienen sus límites. Dominio quotes/producción requieren autorización puntual posterior. No crear otro sprint de llantas ni volver a Auth por este cierre.

Pack económico previo D1235CA788312CB5F0DD7B82A8354809AB93756E57BF5385483E52F0026D7DF0 intacto. No nueva migración escrita: aplicación de migraciones existentes únicamente en el fixture local, no en Neon/Supabase o producción. Ni prueba Auth real ni UI nuevas necesarias para estos flags; se mantienen sus evidencias y límites previos.

## Cierre y rollback

El finally del runner restaura las ocho variables de proceso y detiene sólo el contenedor creado por él. Fixtures/dump interno son desechables y recreables; no contienen negocio ni deben conservarse como base calibrada. Verificar ausencia del nombre exacto al terminar, no docker prune ni eliminación por glob. No apagar Docker si hay procesos ajenos.

Rollback: retirar sólo líneas Plan/FullSuite/testScope y los nuevos slots/namespaces, helper y dos tests nuevos; restaurar imports/env originales de los dos testsRLS y su presupuesto de test anterior si se solicita. Conservar el runner focal anterior, guardsRLS/migraciones, demás cambios y evidencias QA. No reset Git ni datos externos. Gate B4 local no autoriza consolidar todos los archivos sucios, desplegar o asignar quotes.

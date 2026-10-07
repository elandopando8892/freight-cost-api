# Sprint 2 · corregir frontera entre identidad Auth y cálculo

## Qué había y qué cambia

El middleware real authenticateExisting entrega sub/orgId/role/**supabaseId**. El store usaba spreadactor al crear el binding del cálculo, cuyo schemaestricto admite sólo identidad de dominio y base/versión/fingerprint. Con usuario real rechaza el campo adicional antes del append. Fixtures anteriores usaban únicamente tres campos, así que ocultaban ese caso. La lectura podía funcionar con familyNONE porque aún no validaba una propuesta histórica; eso no demostraba que el guardado funcionara.

Corregido **localmente**: el store proyecta explícitamente orgId/sub/role y los campos de contexto. El middleware conserva supabaseId, no se debilita schema.strict, no se cambian permisos ni los comandos del cliente. El recibo mantiene autor, org, alcance y replay ligado al mismo actor; el identificador del proveedor no entra en la propuesta. Kernel/importes/210parámetros/V3/pack/política sin cambio. No nuevo servicio, dependencia o arquitectura.

## Diagnóstico y benchmark previo proporcional

Se inspeccionaron objeto real del middleware, load/prepare, schemaZod, contratoCliente y fixtures; se reutiliza la frontera existente, no otro motor. Alternativas: quitar supabaseId globalmente rompe otras integraciones; hacer el schema permisivo propaga datos innecesarios y oculta contratos; **proyección explícita en la frontera existente** elegida como capacidad estándar ya soportada porTypeScript/Zod. No investigación económica ni desarrollo de otra base para este defecto.

El intento real fue diagnosticado comoUNKNOWN por el logger saneado, con0append y cierre seguro; no se inventa su excepción cruda. Reproducción fiel local con cuarto campo del middleware confirmó ZodError/unrecognized_keys/supabaseId paraADMIN yOPERATOR. Cualquier otro problema independiente necesitaría su evidencia, no queda certificado por arreglar esta frontera. El mensaje de recuperación de la captura ocurre con API cerrada y no acredita un guardado.

ResponsableCodex/OpenAI, recomendado/solicitado GPT-6.1 Sol/alto, efectivos/cuota/tokens/cargos desconocidos. Claude considerado: defecto pequeño, determinista y verificable, cupoFable1/1 cerrado; cero Claude/subagentes/IAnegocio. Continuación humana autoriza arreglo local dentro del módulo, **no otra ejecuciónNeonQA**. Presupuesto local30min desde17:39, hasta2correccionesporcausa, sin acceso/gasto/infraestructura externa nueva.

Skills systematic-debugging/root-cause inspection separan síntoma/cadena de causa; test-driven-development añade primero reproducciones; Supabase conserva límites entre campos de proveedor y autorización de negocio; verification-before-completion distingue fixture/localSQL/QAreal. No UI modificada: se conserva wireframe/layoutMARKSMAN, sin diseñarotra pantalla para un mapeo backend.

## Pruebas y límites

- TDD:2nuevas regresionesADMIN/OPERATOR fallaron exactamente por supabaseId,13existentes pasaron. Tras la única modificación de implementación: **44/44focales** en4archivos,89.00s/exit0. Reproducciones verifican guardar, identidad/autor preservados, readback, replay y que proposalJson no contiene el ID del proveedor. Identidades sintéticas, noJWTreal.
- FixturePostgreSQL reforzado: ambos actores llevan supabaseId correspondiente al User local, igual que middleware. Runner existente creó sólo contenedor/tmpfsDB **fcm_family_s2** loopback53326, aplicó46migraciones **existentes sólo en fixture**, rol limitado sin super/bypass. **6/6PASS**,28.42s/exit0: readerB3 real, JSONBsinpérdida/nuevoCliente, concurrencia/autores, HTTP/replay/denegaciones e invariantes210/perfil/calibración/V3. No nuevas migraciones, usersSupabase o basesNeon/QA reales. Fixture descartada enfinally/envrestauradas; no listener53326 ni contenedorpublicandoese puerto al cierre (datos sintéticos recreables).
- Tiposstrict dirigidos: primera invocaciónCJS incluía scripts de investigacióncon import.meta y fue incompatible; no se cambió código para esconderla. RepeticiónES2022/bundler exit0. **BuildAPI npm run build exit0**. No buildWeb/aceptaciónBrowser nueva, UI no editada.
- SuiteAPI npm test: producción congelada después de la corrección, inicio17:45:17/duración484.71s/exit1: **3296PASS/31SKIP**,215archivosPASS/1FAIL/5SKIP (221archivos/3327tests). Única suite bloqueada en colección=tire-calibration-rls-postgres.test.ts por FCM_TEST_ADMIN_DATABASE_URL loopback/fcm_tire_s8 ausente;0tests ejecutados fallidos. No guard relajado/Neon como sustituto/releaseglobalverde. Se6PG se ejecutaron por separado después de reforzar su fixture; no sumar/reclasificar todos los31SKIP como certificados. Corrida amplia comenzó antes del ajuste de ese fixture, sin otro cambio de implementación; esas pruebas afectadas se repitieron después en el runnerlocal.

Todo código de implementación y pruebas afectadas se verificaron tras su cambio; el alcance real autenticado aún no se volvió a ejecutar. No reinicio de gate ni escrituraOwner para saltarse su consumo.

## Qué falta y rollback

Actualización posterior, 6oct18:19: una nueva ejecución puntual de 30 minutos autorizada confirmó guardado autenticado revision 1, replay sin append y lectura independiente; quedó cerrada NOLOGIN/0sesiones. Véase [recibos, captura, invariantes y límites](S2_FAMILY_ACTOR_FIX_QA_2026-10-06.md). La pendiente de aceptación QA de este informe histórico ya tiene esa evidencia acotada; no implica recarga visual posterior, adopción económica ni release completo.

**Desarrollado y probado localmente; no confirmado por guardado nuevo enNeonQA.** Falta otra ejecución específicamente autorizada para guardar una propuesta, recuperar/replay/cold y cerrar. No renovarAuth, cambiar tarifas, arreglarpeajes ni publicarquotes por este fallo. Sprint2/B4 siguen abiertos por aceptación real/económica, no por esta frontera ya corregida localmente.

Archivos modificados: family-base-store.ts (proyección/comentario), family-base-store.test.ts (2regresiones), family-base-postgres.test.ts (actores completos/assertión privacidad); este informe, actualización de cierre en informeenmendado y evidenciaPNG. Rama codex/cost-tires-release-s14/HEAD4f5fc2de0c3d178dace917231e1092040dec21fd enD, cambiosajenos preservados. Pack SHA D1235CA788312CB5F0DD7B82A8354809AB93756E57BF5385483E52F0026D7DF0 intacto.

Rollback: retirar únicamente la proyección y los hunks de pruebas de este corte si se solicita, preservando código/historiaanteriores. No resetGit, eliminación de eventos, camposAuth o usuarios, ni cambio del marcadorconsumido. QA quedó NOLOGIN/0sesiones/3eventosprevios/0propuestasnuevas; procesos propios apagados. Ningún acceso externo nuevo o SQL después del fallo para el arreglo local.

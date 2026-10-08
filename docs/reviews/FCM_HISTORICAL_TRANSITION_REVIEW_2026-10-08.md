# Transición histórica: revisión corregida y ensayo local

## Resultado y límite

Bloque local de revisión, correcciones y preparación terminado. No es cierre de producción: no SQL remoto, deploy, promoción, cambio de Auth, invitación, usuario real, fórmula o importe. No endpoints de escritura nuevos. Se conservan todos los artefactos ajenos.

Inicio: worktree D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD f0294c461c2341d5187c4db66d5b6717bd243829, tracked limpio y45artefactos ajenos untracked, conservados según listado inicial y final. La ruta antigua C:/Users/andre/.codex/AGENTS.md no existe; se leyó D:/andre/apps/codex-home/AGENTS.md y se respeta la instrucción suministrada en el turno. No rama/worktree nuevos ni PR/push.

## Benchmark proporcional y decisión

Se reutilizan Prisma5.22 instalado, el inventario, los guardas y los ensayos documentados en [el bloque anterior](FCM_HISTORICAL_ACTOR_PERSISTENCE_2026-10-08.md). No se cambia stack ni se reconstruye Auth.

| Alternativa | Ajuste y riesgo | Decisión |
| --- | --- | --- |
| Reconciliar todos los autores con Auth y ejecutar el retiro antiguo | Implica activar históricos o inventar sujetos; contradice el alcance de dos accesos | Rechazada |
| Marcar el retiro antiguo como aplicado sin ejecutarlo | Oculta una divergencia de esquema; no equivale a completar SQL | Rechazada |
| Reutilizar el validador de ledger, separar acceso y diferir el retiro intacto | Conserva historial, hashes y contratos; precisa todavía ejecutor y evidencia de promoción | Adoptada para preparación local |

La documentación oficial de [Prisma sobre hotfixes](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/patching-and-hotfixing) distingue ejecutar SQL y reconciliar historial; no autoriza marcar un trabajo incompleto como aplicado. Se consultó la documentación6 como referencia de flujo, sin trasladar comandos7 al5.22 instalado. Se revisó el changelog Supabase por HTTP; el lector web no admitió text/markdown. Su [aviso PostgreSQL15.19/17.11](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes) afecta extensiones/operadores específicos: no se añadió ninguna ni se infiere que un servidor remoto esté actualizado. FCM conserva Neon y Supabase Auth; no se cambian proyectos compartidos.

## Encargo y revisión independiente

Fuente explicit_user_instruction: autorización del usuario a continuar el bloque, siguiendo la propuesta de sustituir sólo el reviewer fallido por Sol6.1/high. Registro de cierre2026-10-08T13:39:58Z. Una revisión de solo lectura, máximo15min, cero reintentos, sin cloud, credenciales, snapshots reales, escrituras o otros modelos. Agente /root/transition_review, commit f0294c4 y allowlist de fuentes/fixtures explícita. Proveedor OpenAI; modelo solicitado gpt-6.1-sol, esfuerzo solicitado high; efectivos observados desconocidos. Main conserva la sesión nativa, sin cambio de modelo por CLI. Tokens/cuota/cargos no expuestos; no se declaran cero. No llamada Claude nueva ni cambio de kit/ledger: el Opus fallido previo conserva1/1 consumido y su evidencia de cierre.

La revisión encontró P1: metadatos proyectados del propietario no se cotejaban con su fila real, permitiendo proponer otro tenant o seleccionar un histórico mediante emailHash inconsistente. P2: IS NOT DISTINCT FROM unía NULL con NULL en la búsqueda de FK y podía bloquear rollback sin referencia efectiva. Ambos eran estáticos/inferidos al entregar el reviewer; main los reprodujo en Postgres sintético y los corrigió. La revisión independiente cubre el commit inicial, no certifica por sí misma las modificaciones posteriores.

## Implementación

- La reconciliación de migraciones se extrae dentro del módulo existente; el plan antiguo conserva su contrato y sus35pruebas. No se filtra inventario para fabricar readiness ni se inventan Auth matches.
- buildHistoricalCutoverPlan reutiliza ese validador y la partición de acceso. Todas las filas y los intentos rolled_back siguen en fingerprints; sólo los dos sujetos aprobados participan en los vínculos. Exige owner original, la extensión nullable exacta y el retiro pendiente. Errores no producen una lista parcial de trabajo. reviewReady sólo significa revisión preparatoria; writesAuthorized=false siempre.
- En backup y apply, el SQL coteja ID, hash completo, hash de correo canónico, orgId y rol contra cada fila real bajo lock. INSERT deriva orgId mediante SELECT del propietario real, y postcondition verifica ambos tenants.
- Rollback usa igualdad ordinaria para detectar referencias efectivas. Se protege tanto FK simple como compuesta/CASCADE; NULL no se interpreta como un enlace. No se modifica el lock_timeout5s ni statement_timeout30s.
- Ninguna de las47migraciones se cambia en este bloque. Se mantiene pendiente e intacta20260830000200_finalize_supabase_identity. No general migrate deploy/resolve sobre producción ni supresión de drift/status.

## Evidencia nueva

1. TDD: el test del nuevo plan falla inicialmente por módulo ausente; después12/12. Un inventario falsificado con fingerprint correcto permitió backup en el código anterior: fallo real observado. Después del primer arreglo5/6pruebas SQL aprobaron y el rollback aún falló por las FK NULL. Cambiar sólo la comparación resolvió esa causa.
2. Hubo luego un timeout del test5s: la consulta posterior confirmó manifest ROLLED_BACK y2filas. Se ajustaron presupuestos del harness local a30/60s y timeout del proceso hijo60s; no guardas/SQL/producto. La ejecución final en fixture nueva aprobó **121/121 en10archivos**, exit0,34.10s. Incluye backup/restoreProbe, rechazo de tenant/correo/rol falsificados, replay sin duplicado, históricos/importe sintético75000 conservados, referencias simples y compuestas/CASCADE bloqueantes, NULL no bloqueante y rollback con restricción Kinde restaurada. Los intentos rojos no se ocultan.
3. Ensayo histórico real local: aplica33SQL de origen a una base vacía, introduce dos autores y referencia sintéticos, y planifica/aplica13SQL pendientes excluyendo el retiro. Filas completas previas permanecen iguales salvo la columna supabaseId nueva NULL; IDs, tenant, roles y referencia/importe intactos. El retiro aún aborta y conserva2filas. **Ledger de entrada sintético**, no bookkeeping ni ejecutor productivo: esta prueba no acredita un ledger remoto o aceptación de drift.
4. API build-only y TypeScript estricto de los3módulos y3fixtures modificados exit0. Verificador de contrato histórico exit0 desde raíz. Una invocación previa desde apps/api no encontró rutas duplicadas apps/api/apps/api; se corrigió cwd, no el verificador. git diff --check limpio. No se volvió a ejecutar la suite API total ni web: no se presentan resultados anteriores como nuevos.

Comando focal final desde apps/api: npm test -- --run tests/viewer-membership-postgres.test.ts tests/historical-cutover-postgres.test.ts tests/historical-cutover-plan.test.ts tests/production-cutover-plan.test.ts tests/production-cutover-sql.test.ts tests/scoped-access-plan.test.ts tests/viewer-membership-bundle.test.ts tests/fcm-access-scope.test.ts tests/supabase-token.test.ts tests/supabase-resolution.test.ts. Variables de fixture sólo a loopback, contenedor propio etiquetado transition-review-20261008, DB fcm_actor_migrations; el ensayo crea fcm_historical_bridge y rehúsa adoptar una anterior. UUIDs/perfiles sintéticos; no login real. Las pruebas Postgres se omiten si no se configuran esas fixtures, por lo que un npm test sin ellas no acredita este ensayo.

## Pendiente para salida

El ejecutor/supervisor productivo todavía falta: refrescar inventario y Auth exactos, sellar fuente/target/ledger; backup integral con restore comprobado; aplicar exclusivamente los SQL realmente pendientes con bookkeeping fiel, mantener retiro diferido y comprobar coexistencia estrecha sin ignorar otras diferencias. Después, publicar el par del mismo commit con política de dos accesos; sólo con promoción acreditada, preparar/aplicar la membresía VIEWER en el tenant original. Aceptar OAuth completo, intercambio, sesión, recarga/renovación y permisos para sales/JG. Ningún booleano, referencia o hash sustituye autorización humana ni prueba promoción. Las snapshotsOct7 no son inventarios actuales.

Rollback del bloque local: revertir únicamente su checkpoint, conservando cambios/evidencias ajenos. No rollback remoto requerido, porque no se escribió allí. Los contenedores propios --rm de ensayos rojos se cerraron con ID/label verificados antes de recrear; el contenedor final226b49d340207365a3b9168715f063df74a2a4abb969f211b9d42194cb1a8903 también se cerró y la consulta posterior no devolvió ese contenedor. Sólo se eliminaron bases sintéticas desechables de este ensayo. No se adoptaron ni eliminaron contenedores de otras aplicaciones.

Paquete local: se exportan exclusivamente los1608blobs del índice y se coteja SHA1 Git de cada archivo; scanner existente sin relajación. Las45evidencias ajenas untracked no se incorporan. El primer launch del scanner no encontró tsx desde el directorio del export; se usó después la ruta absoluta del loader instalado, sin instalación/configuración nueva, y aprobó1608/1608. Las actualizaciones del recibo se exportan y verifican de nuevo en directorios frescos, sin sobrescribir los paquetes anteriores. Esto acredita el contenido empaquetado, no que los archivos untracked de la carpeta original estén libres de patrones sensibles ni que exista un despliegue.

Skills aplicadas: Supabase, codebase-design, test-driven-development, engineering:code-review, systematic-debugging, verification-before-completion y engineering:documentation. Ayudaron a separar preparación de ejecución, probar invariantes reales y conservar límites/evidencia. Sin cambios UI: no wireframes nuevos. Sin IA de negocio, API de rutas/peajes, infraestructura nueva ni cargos activados.

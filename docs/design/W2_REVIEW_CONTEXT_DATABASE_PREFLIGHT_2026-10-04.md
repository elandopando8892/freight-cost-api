# W2 · preflight real del contexto de revisión

4 octubre 2026. Autorización humana: «autorizo» en respuesta al preflight de **sólo lectura en Neon Preview de FCM, máximo 30 minutos, sin crear registros, roles ni modificar Auth**. Inicio del corte 16:44:55 America/Mexico_City; límite 17:14:55 / 23:14:55Z. Este documento cierra la inspección; no amplía la autoridad.

## Resultado y alcance

**Preflight completado; W2 operativo sigue abierto.** La implementación local distingue la revisión B2 del perfil económico, pero aún no existe un target real elegible ni binding de revisión. No se ejecutó login, guardado, recarga, replay o renovación autenticados contra PostgreSQL.

Checkout físico D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd. Rama, HEAD y worktrees inspeccionados antes; rama/HEAD revalidados después. Dirty state ajeno preservado. Sin nueva rama, staging, commit, PR o deploy.

Proveedor/responsable: Codex, único ejecutor. gpt-6.1-sol/high recomendado y elección previa conservada; modelo/versión y esfuerzo efectivos no observables desde esta superficie. Consumo nativo, cuota y cargos no observados; ninguna llamada a Claude, subagentes, IA auxiliar o APIs de mapas. Presupuesto: 30 minutos; una inspección PostgreSQL confirmada, sin reintentos automáticos de conexión ni fallback de destino.

Skill engineering:documentation utilizada para registrar resultado, límites y recuperación. Se reutilizaron el [benchmark y contrato del adapter](W2_REVIEW_CONTEXT_IMPLEMENTATION_2026-10-04.md) y el lector existente `apps/api/scripts/inspect-partner-preview.ts`, sin dependencias ni otro producto. El corte es diagnóstico, no implementación de una nueva integración.

## Evidencia real

Lectura confirmada 2026-10-04T22:50:38.409Z–22:50:59.252Z; conexión cerrada 22:50:59.266Z. El lector comprobó la configuración exclusiva de Preview, sin overrides de rama ni ambigüedad, antes de abrir la conexión:

- Proyecto API Vercel: prj_mw1xLIqutlRSIG2F2BryfPqDvN2L; equipo team_KUG1PtOwoJ16eUqxiOJ330Os.
- Proyecto Neon configurado: broad-art-99750179; endpoint directo ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech; base neondb.
- Organización inspeccionada: cmsqrb5ye0001q7mn6i4dbx2b. No inventario de cotizaciones, clientes, facturas ni otras operaciones.
- Conexión administrativa neondb_owner **sólo para esta inspección**, nunca como runtime de la app. `transaction_read_only=on`, aislamiento read committed, statement timeout 10 s, lock timeout 2 s y transacción limitada a 30 s. No SELECT FOR UPDATE, DDL, INSERT, UPDATE o DELETE.
- Credenciales únicamente en memoria mediante el lector existente. No se imprimieron URLs con credenciales, claves, correos, IDs de Supabase ni errores crudos.

Inventario actual:

| Elemento | Estado observado | Consecuencia |
| --- | --- | --- |
| XBF-XB-PILOT / cmsqufvfb0002pn7gxy5i7cke | CROSS_BORDER, ACTIVE, predeterminada, segmento null | No usar como borrador de revisión |
| Versión cmsqufvfh0004pn7gp3c35crj | PUBLISHED, activa, 210 parámetros, applicabilityContext null | Fuente histórica; no acredita relevo propio ni calibración B2 |
| QA-S18-INTRA-MX-20260926 / cmuincn3a0001fipzvtahvtz2 | INTRA_MEX, DRAFT, no predeterminada, segmento null | No reclasificar ni reutilizar como CROSS_BORDER |
| Versiones DRAFT/no activas en bases CROSS_BORDER/DRAFT de esta organización | 0 | No hay target elegible para el adapter de revisión |
| Metadata FCM_WIZARD_REVIEW_BINDING_V1, FCM_WIZARD_REVIEW_DRAFT_V1 y FCM_WIZARD_VERSION_DRAFT_V1 | 0 eventos METADATA_UPDATED en esta organización | No existe binding/propuesta de estos tipos |
| ADMIN en esta organización con enlace de Supabase con formato UUID | 1 de 1 | Inventario de enlace; no prueba de sesión, login o identidad efectiva |

Huellas nuevas de esta observación, sin exponer importes:

- Proyección del origen calculada con `wizardReviewSourceFingerprint`: d57cf350def7c324cd5e2bf448e7d22cf1e8f2a1570852cf8310afbda553c92d.
- SHA256 de JSON del arreglo completo de parámetros ordenado por id: b49ddf13d25846f47f2b63eccdc5ffdfbdd04ec5d4d4a9475f7819ff97569537.

Estas huellas usan proyecciones diferentes del hash de versión completa de entregas anteriores: no deben compararse entre sí ni llamarse comprobación de invariancia histórica. La garantía de este corte es que las operaciones ejecutadas fueron de sólo lectura. El catálogo/benchmarks no se recalibraron.

## Permisos actuales

Inspeccionados sólo los cuatro roles conocidos del gate, no una auditoría exhaustiva de todos los roles/funciones de la base. Consultados pg_roles y privilegios efectivos de tabla/columnas, sin contraseñas ni pg_authid. No se probaron credenciales de estos roles.

| Rol | Vigencia observada | SELECT en seis tablas | INSERT metadata (8 columnas) | Lock Organization.id / AssumptionSet.id |
| --- | --- | --- | --- | --- |
| fcm_local_read_20260930 | Venció 2026-10-02T03:16:49.930Z | Sí | No | No / No |
| fcm_c1_preview_20260929 | VALID UNTIL null | Sí | No | Sí / No |
| fcm_tire_v2_preview_20260929 | VALID UNTIL null | Sí | No | Sí / No |
| fcm_w2_local_20261004 | No existe | — | — | — |

Tablas: User, Organization, CostBase, AssumptionSet, AssumptionParam, CostBaseAuditEvent. En los tres roles existentes: sin superuser, bypassRLS, createDB, createRole, replication, inherit ni CREATE de esquema/base. Sin INSERT, DELETE o TRUNCATE de tabla en esas seis tablas; C1/tire tienen UPDATE de tabla en Organization. Esto no los convierte en roles adecuados para W2 y no se adoptaron ni ampliaron.

RLS y FORCE RLS están desactivados en las seis tablas. Un futuro rol con grants de tabla/columnas **no tendrá aislamiento de organización/fila por PostgreSQL**: la restricción de target y organización debe cumplirse en el gate/API y probarse. Este preflight no certifica ausencia de otras capacidades indirectas de escritura; un nuevo rol deberá verificarse en su conexión real, incluyendo memberships, objetos propios, secuencias y funciones SECURITY DEFINER, antes de iniciar runtime.

## Incidencia del diagnóstico

Primer encargo inline mediante el wrapper Windows `tsx.cmd -e` devolvió exit0 sin salida: **no se contó como inspección ni como prueba PASS**. El diagnóstico mínimo de runtime imprimió W2_DIAGNOSTIC_RUNTIME_OK; se corrigió el transporte del código usando stdin a `node --import tsx --input-type=module`, sin escribir un script ni instalar software. Sólo esta segunda ejecución emitió la evidencia PostgreSQL anterior. No hubo relanzamiento automático del launcher vencido ni renovación de su deadline.

## Siguiente corte propuesto, pendiente de autorización

Resultado esperado: demostrar una propuesta B2 no comercial guardada y recuperada con la identidad Supabase real, sin adoptar importes ni habilitar cotización. Alternativas: reutilizar la base activa o Intra-Mex sería incompatible con los gates; ampliar roles ajenos añadiría alcance. Se recomienda un target QA nuevo y un rol dedicado temporal, con recuperación propia.

Una autorización conjunta y finita puede cubrir **preparar y probar localmente este gate, máximo 60 minutos**, incluyendo:

1. Adaptar únicamente el preparador/launcher local al contrato de revisión separado, con pruebas antes de escrituras. No basta cambiar el deadline del launcher antiguo: aún prepara YARD_TRANSFER, incompatible con V3. Sin THROUGH_TRACTOR sustitutivo ni cambios al motor.
2. Crear exactamente una base QA `W2-QA-BINATIONAL-20261004` NO COMERCIAL/CROSS_BORDER/DRAFT/no predeterminada y una versión DRAFT/no activa, clonando los 210 parámetros históricos del origen verificado. Conservar el contexto económico crudo; no asignarle una calibración o un perfil V3 de relevo que no existen. Comparar la economía del clon con el origen antes de habilitar el gate.
3. Crear un único evento de binding de revisión B2 en auditoría, con org/base/versión nuevos, perfil de relevo propio Sep2026, revisión de catálogo y huella del clon. commercial/appliedToParams/economicProfileChanged=false; no flags aceptados del navegador.
4. Crear `fcm_w2_local_20261004`, login temporal hasta 24 h desde su creación, sin privilegios administrativos; SELECT en las seis tablas, INSERT sólo en las ocho columnas de CostBaseAuditEvent y UPDATE sólo de Organization.id/AssumptionSet.id para locks. No renovar ni modificar roles existentes. Verificar privilegios efectivos e indirectos antes de runtime, sin presentar esto como RLS.
5. Runtime sólo loopback y rutas allowlisted del wizard para el target exacto. Una propuesta guardada, replay idéntico sin duplicación, recarga/recuperación; errores de scope/permisos/vigencia pertinentes. Usar sesión real sin revelar tokens ni crear identidades. Detenerse si falta autenticación humana. Cerrar runtime/conexiones al concluir o agotar los 60 minutos.

Excluidos: deploy, producción, Site URL/OAuth/Auth, migraciones, usuarios, cambios de origen/base activa, adopción económica, operaciones de negocio, mapas o IA auxiliar. Modelo recomendado gpt-6.1-sol/high por continuidad y verificabilidad local; efectivos/consumo desconocidos. Claude considerado pero no invocado; no cambio de modelo ni router por esta recomendación. Máximo dos reparaciones diagnosticadas del gate, sin reintentos de mutaciones inciertas: verificar estado y detenerse ante incertidumbre.

## Recuperación y cierre

Este corte no requiere rollback de PostgreSQL/Auth: cero mutaciones de datos/permisos, conexiones cerradas. Cambios propios únicamente este documento y su entrada en SPRINT_STATUS; retirarlos por hunks propios si se revierte la documentación, preservando el resto del estado sucio.

Para el siguiente gate, si se autoriza, definir antes de mutar una recuperación por IDs exactos del target nuevo: cierre del runtime, NOLOGIN del rol propio al terminar y conservación auditada del borrador NO COMERCIAL. No borrar bases/eventos ni retirar grants de roles ajenos automáticamente; cualquier limpieza material requiere autoridad delimitada. Un fallo no se oculta con otro target, rol, UUID o perfil.

**Desarrollado previamente:** adapter local. **Comprobado ahora con datos reales:** conexión Preview, inventario y permisos de lectura. **No comprobado:** login/intercambio de código, sesión/renovación, guardado/replay/recarga autenticados. **No desplegado ni utilizado comercialmente.** Las pruebas locales 144/144 API y 59/59 Web son evidencia histórica simulada de la entrega anterior, no pruebas repetidas o PostgreSQL de este corte. B2 calibrado y W2 operativo no cerrados.

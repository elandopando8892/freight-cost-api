# Recuperación aislada: revisión y preparación del encargo

## Estado comprobado

HEAD de partida `2b83133abb2c714fa34a445f7622c5b87c829820`, rama `codex/cost-tires-release-s14`, checkout canónico en D:. Los 45 archivos previamente no versionados se conservan. No se modifica implementación, Auth, bases reales, infraestructura remota ni datos económicos en este corte. No se ejecutan pruebas nuevas de producto; las 81 aprobadas/6 omitidas pertenecen al checkpoint anterior.

`kit_info` del MCP Claude Kit · Windows confirmó plugin0.3.0, release cargada y activa `personal-usage-20261009T153439Z`, restart_required=false, consumption_mode=user_managed. Manifiesto259f470bd47c20b78024c6931ad99583d9e6a834539f00861a952cc42566f224. El código consumption_control y SPEC corroboran que los límites acumulados son informativos; no se cambió esa configuración ni se impuso otra política de consumo. Mi interpretación del turno previo que exigía ampliar cupos antiguos fue demasiado restrictiva. La autorización del usuario se conserva en RECOVERY_MODEL_AUTHORITY_2026-10-09.md.

El retiro de cupos no eliminó validaciones de alcance, facturación, contexto, cierre o leases. La creación del ledger nuevo mediante `policy_budget.py authorize` fue rechazada con `closure/lease unconfirmed`: el helper requiere inventario global cerrado. Diagnóstico de metadatos por el validador existente identificó únicamente:

- `marksman-investors-narrative:dynamic-story-20261009:fable-functional-design`
- `marksman-investors-narrative:dynamic-story-20261009:opus-executive-core`
- `marksman-investors-narrative:dynamic-story-20261009:opus-executive-core-medium`

Son encargos ajenos; no se consultaron sus prompts, historias o datos, ni se cancelaron/adoptaron procesos o borraron registros. No se continúa por una ruta sin ledger para eludir este rechazo. Requiere cierre acreditado por sus responsables o una corrección del kit con alcance autorizado, no otra aprobación genérica del usuario para el trabajo FCM.

## Preparación concreta

El helper P2 plan/apply incorporó únicamente dos asignaciones a la raíz existente: diseño e implementación de `local-isolated-recovery-20261009`, sin ampliar proyectos ni modificar encargos anteriores. Se conservó backup/receipt en el kit. Un primer plan generado sin UTF-8 alteró caracteres del diff y fue rechazado antes de aplicar; se regeneró con UTF-8. Un cambio concurrente de inventario exigió un plan actualizado; su apply completó. Los controles no se relajaron.

Artefactos del operador: `D:/andre/validation/fcm-recovery-kit-b36ACc`. Incluyen autoridad propuesta, candidato/planes/receipt P2 y contexto atestado. Scanner del kit marcó dos asignaciones PGPASSWORD del código original (expresión runtime y contraseña sintética). Se generó un derivado de contexto con esas dos asignaciones omitidas y omisiones declaradas; no se cambió el original ni el scanner. Un timestamp de revisión inicialmente futuro fue rechazado; se registró después la hora real del host.

`claude_prepare` completó para `freight-cost-model:local-isolated-recovery-20261009:design-isolated-recovery` con contrato `bbe0230e53a62877f1b908c62bdc8e06c01c6e5c1ee56426087ba96bd3ab75fd` y atestación `f50b6a80f8eb0a41d536884ff133faf5c34fd9b311427538190675e42fb2540d`. `inference_started=false`. No hubo choose/run ni llamada Fable/Opus; cero lanzamientos Claude nuevos, sin atribuir eso al consumo histórico. La implementación permanece prevista y aún no sellada, para incorporar primero el diseño Fable. Modelo nativo sin cambio. Disponibilidad de modelos Claude sigue desconocida; catálogo no acredita acceso actual.

## Revisión independiente Astra

Una revisión de solo lectura con modelo solicitado `gpt-6-astra`, esfuerzo solicitado `high`, máximo20min, autorizada en este turno, cerró. Modelo/versión y esfuerzo efectivos no observables; tokens/cuota/cargos no observables. El revisor leyó los cinco archivos acotados, sin ejecutar tests ni escribir. No se trasladaron secretos, inventarios reales ni historiales. Hallazgos adjudicados por el coordinador contra el código:

| Hallazgo | Evidencia y corrección mínima | Criterio discriminante |
| --- | --- | --- |
| P1: nombre mutable tras validar ID | Transporte líneas68,91–92,114,121: exec/cp resuelven nombre. Usar ID completo y contexto fijado en todas las operaciones | Reemplazar nombre después de validar: sustituto no recibe escrituras |
| P2: restauración usa archivo de /tmp del origen | Líneas109–126: archivo exportado se hashea pero pg_restore consume el original. Separar recuperación desde el archivo persistido, con hash/manifest y receptor propio | Apagar origen; recuperar sólo desde archivo guardado en segundo cluster. Corrupción bloquea antes de crear objetos |
| P2: roles/settings externos al dump no recuperados | Líneas107,125,133 y fixture32: mismo cluster comparte roles; template0 hereda propiedades del receptor. Manifiesto limitado de roles NOLOGIN y propiedades soportadas, sin passwords ni privilegios elevados | Origen con ownership/ACL y setting no predeterminado; receptor limpio los recupera. Rol ajeno homónimo/settings incompatibles bloquean |
| P2: cobertura parcial de contenido | Líneas98–105,133: sólo r/S; matviews/largeobjects/foreign tables omitidos. Inventario previo y rechazo explícito de tipos sin cobertura | Fixtures independientes con objetos omitidos bloquean antes del dump; particiones admitidas verifican todas las hojas |

Los cuatro se aceptan como requisitos del siguiente bloque. No se declaran corregidos. Las banderas actuales `clusterRolesVerified=false` y `databaseSettingsVerified=false` describen honestamente la capacidad previa. No equivale a aceptación de recuperación nueva o producción.

## Continuación y recuperación

Con cierre ajeno acreditado: crear el ledger con esta autoridad vigente sin resetear consumo histórico, registrar elección Fable5.1/high y ejecutar el contrato preparado una sola vez. Tras cerrar Fable, incorporar su diseño al contrato Opus5.5/high, validar contexto/rutas/tests, implementar y ejecutar el ensayo real en dos clusters sintéticos. Revisar diff con Astra y resolver hallazgos dentro del alcance admitido. Antes de cada llamada se conservan guardas de cuenta/billing del kit; este corte no observó ni activó gastos.

No cambios de UI: el encargo es diseño técnico de recuperación, no una nueva dirección gráfica. No wireframes artificiales. Se reutilizan pg_dump/pg_restore, Docker/PostgreSQL16 y TypeScript existentes; no nueva arquitectura/proveedor.

Rollback de esta preparación: conservar registros del kit y usar el procedimiento P2 de rollback con su receipt cuando corresponda; nunca restaurar directamente un JSON antiguo sobre cambios concurrentes. Los archivos documentales locales se pueden retirar/revertir por su checkpoint conservando los ajenos. Nada en este registro acredita una autorización infalsificable ni un aislamiento OS.

Skills usadas: [usar-kit](D:/andre/apps/codex-home/plugins/cache/claude-kit-local/claude-kit/0.3.0/skills/usar-kit/SKILL.md) y [recuperar-encargo](D:/andre/apps/codex-home/plugins/cache/claude-kit-local/claude-kit/0.3.0/skills/recuperar-encargo/SKILL.md). La primera exige «No desactives esos controles para corregir un error»; la segunda «No borres locks o leases para simular cierre y no termines procesos ajenos». No exigen otra aprobación del usuario para repetir su elección; el bloqueo observado pertenece al validador de autorización del kit.

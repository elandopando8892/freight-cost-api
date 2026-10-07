# W1 · Referencias y decisiones con guardado local

04/10/2026. Autoridad: «adelante con el siguiente corte», después de aceptar 1A–6A y revisar W0. Entregable: primer recorrido de datos del wizard con tres referencias fijadas, contrato reutilizable y persistencia local real. No es integración SaaS, calibración de los 210 inputs ni adopción productiva.

## Qué cambió

Antes: wireframe con cifras sintéticas y localStorage. Ahora: [pantalla local W1](http://127.0.0.1:4722/) consume expedientes del repositorio comprobados por SHA256 y guarda decisiones en un archivo local del servidor. Recarga y reinicio del proceso conservan valores, condiciones, aceptación provisional y referencias. W0 permanece intacto como alternativa visual.

| Card | Referencia documentada reutilizada | Inputs preparados / límites |
| --- | --- | --- |
| Diésel MX | Media nacional reportada 27 MXN/L, observación 25/09/2026; captura de extracto oficial indexado, con límites conservados. | `fcm.v3.fuel.diesel-mx`; no precio contratado, neto fiscal ni corredor demostrado. |
| Diésel US | PADD3 5.955 USD/galón, observación 28/09/2026; división exacta por 3.785411784 → aproximadamente 1.573145 USD/L. | `fcm.v3.fuel.diesel-us-border`; equivalencia de unidad, no prueba de precio en Laredo. |
| Mantenimiento US | ATRI: promedio de operaciones 2024, publicado 2025, 0.198 USD/milla; compuesto tractor/caja y sin llantas. | Decisión de referencia, **sin input PM asignado**. El agregado no determina cantidades/precios de aceite, filtros o mano de obra. |

Fuentes: [expediente combustible](../research/B2_FUEL_PRICE_PERFORMANCE_REFERENCE_2026-09-30.json), [expediente mantenimiento](../research/B2_US_MAINTENANCE_PLANNING_2026-10-03.json). No se renovaron externamente en este corte. El combustible MX conserva la limitación de no tener cuerpo oficial directo archivado; el pin de nuestro expediente no autentica el contenido externo. Son referencias históricas documentadas para el periodo seleccionado, no precios actuales de octubre.

No se tomaron mínimos/máximos de `low/high/defaultValue`. Las tres cards muestran extremos ausentes y tamaño de muestra no establecido. Media publicada no equivale a cohorte homogénea de empresas binacionales; Estándar MARKSMAN se etiqueta provisional para este perfil. La selección no mejora artificialmente la calidad de evidencia.

## Benchmark previo y seam elegida

Se reutilizó la comparación W0 vigente [PatternFly/Refine/stack FCM](COST_BASE_WIZARD_SPEC_2026-10-04.md). Inspección actual: catálogo 210, reglas de dominio, servicio de versiones, locks, calibración estricta, payload de auditoría y ensamblador de referencias existentes. El ensamblador histórico por secciones sigue siendo revisión parcial; no se mutó su contrato para fingir estadísticas.

| Alternativa | Evaluación concreta |
| --- | --- |
| Contrato de decisiones + adapter de archivo aislado | Elegido para W1: ejercicio de guardado atómico y reanudación sin DB ni dependencia nueva. Interfaz pequeña: crear, guardar, restaurar; referencias y validaciones concentradas. |
| Meter decisiones en `calibrationEvidence` o `notes` | No elegido: el JSON vigente de calibración es estricto y se reemplaza al revisar; mezclarlo sin actualizar contratos perdería información o invalidaría revisión. `notes` ya tiene otra semántica. |
| Recurso persistido dedicado / uso del payload de auditoría versionada | Candidatos de W2. Existe `CostBaseAuditEvent.payload`; verificar consulta, identidad, replay y conservación antes de elegir. No se decidió ni ejecutó una migración. |

Stack: Node/TypeScript/Zod y reglas FCM ya instalados. Sin nueva licencia, framework, infraestructura o proveedor. La skill `codebase-design` orientó la seam: mismas reglas del módulo para callers, recuperación y pruebas; la pantalla no implementa otro motor de costos.

## Contrato y persistencia

- `buildWizardReferenceCatalog`: verifica pins con normalización sólo CRLF→LF; fija contexto, evidencia, normalización, premisas, unidades y ausencia de estadísticas.
- `saveWizardDraft`: contexto org/base/versión, revisión esperada y UUID de solicitud; rechaza otra identidad, fuente desactualizada, duplicados, presets manipulados y números inválidos. Fuera de un rango observado suministrado exige motivo; sin rango no inventa esa comprobación. Premisas rechazadas o costo manual cero requieren explicación.
- Decisiones y dos valores nativos preparados se guardan juntos con referencia snapshot y recibos. Ninguna asignación nativa para mantenimiento compuesto.
- El adapter de archivo serializa escrituras del proceso y sustituye el bundle mediante rename en la misma carpeta. Archivo existente inválido no se reinicia; replay exacto conserva bytes y revisión. Tope finito: 128 solicitudes nuevas de este corte local.
- Sólo `DRAFT`, `calibrated=false`, `quoteReady=false`, `productiveAdoptions=0`. No operación de publicar/activar ni modificación del cálculo histórico.
- Servidor loopback con recursos permitidos explícitos, Host exacto y Origin/JSON para PUT. Esto no sustituye Auth, RBAC o aislamiento multiusuario SaaS. No ejecutar varias instancias escritoras sobre el mismo archivo.

Archivo runtime ignorado por Git: `docs/prototypes/cost-base-wizard-w1/runtime/draft.json`. Identidad local de prueba, sin usuarios reales. Las selecciones realizadas por Codex llevan notas de QA: no son una decisión económica humana de adopción. La prueba manual utilizó 1.6 USD/L sintético y luego devolvió la card a la referencia fijada. Se conserva el historial de recibos; no se presenta ese importe QA como benchmark.

## Evidencia de cierre

- **39/39 pruebas en tres archivos PASS**: 19 del nuevo contrato/archivo, 17 de bases y dominio existentes, tres de calibración. Incluyen fuentes modificadas, falta de extremos, aceptación provisional, importe manual, justificación, contexto, revisión, idempotencia, conservación de otras cards, JSON corrupto y dos escrituras con la misma revisión.
- Persistencia de archivo probada con reapertura de adapter y validación de bundle; comandos rechazados no alteran bytes. No demuestra tolerancia a cortes eléctricos ni locks entre procesos.
- Typecheck API `tsc --noEmit` PASS. Typecheck estricto de script y tests con ESNext/Bundler PASS. Primer intento usó rutas de paquetes no hoisted y no ejecutó pruebas; corregido mediante resolución real de dependencias. El intento NodeNext para scripts con `import.meta` fue incompatible con el package CJS; no era error del contrato, se verificó con el modo que corresponde a esos scripts.
- Navegador: card incompleta rechazada; preset sin aceptación rechazado; captura negativa rechazada; «No me identifico» sin motivo rechazado; manual con nota guardado y recuperado; referencias MX/US y mantenimiento guardadas.
- HTTP real local: Origin externo 403; otro contexto 403; revisión desactualizada 409; replay 200 sin cambiar bytes/revisión. Dos inputs nativos y tres decisiones, cero adopciones productivas.
- Reinicio sólo del proceso creado para W1: recuperación de revisión 4 comprobada en UI; guardado posterior de la misma card correcto, revisión final 5. Recarga vuelve a cargar el bundle del servidor.
- Móvil CSS observado 390×843, documento 371 px: sin overflow horizontal. Viewport restaurado. Consola de la pestaña sin errores al cierre. [Captura verificada](COST_BASE_WIZARD_W1_VERIFIED_2026-10-04.jpg).

W1 probado para estas tres cards. No prueba autenticada, escritura en Prisma, multitenancy real, recorrido completo de las secciones, actualización selectiva de referencias reales ni integración CFU/CVU. Esos criterios no se dan por cerrados con pruebas locales.

## Continuidad y presupuesto

Siguiente **W2: integrar el contrato en el wizard SaaS y en el borrador versionado existente**, con recuperación, permisos y guardado atómico; ampliar la cobertura de conceptos sin convertir cada input en otro sprint. Resolver la metadata contra almacenamiento/auditoría existentes antes de necesitar otra tabla. Solicitar autoridad puntual si hace falta una migración o efecto externo; no desplegar por defecto. W3 conserva revisión, impacto y adopción explícita.

Ejecutor: Codex/OpenAI, único escritor. Recomendado `gpt-6.1-sol`, esfuerzo alto; runtime exacto y esfuerzo efectivo desconocidos. Claude considerado desde W0 como candidato de diseño/revisión; el contexto reutilizado, verificación automatizable y ausencia de un nuevo diseño favorecieron continuidad. Sin llamadas auxiliares, subagentes o política automática. Presupuesto de W1: un día local, máximo dos reparaciones por causa, cero inferencias/llamadas de pago de la aplicación; consumo nativo atribuible desconocido. No se cambió el modelo principal por un mecanismo no soportado.

Checkout D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama `codex/cost-tires-release-s14`; HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Estado previo conservado. Nuevos archivos: módulo, adapter local, script de servidor, test, HTML/JS/.gitignore de W1, captura y esta entrega. Entrada de estado añadida; sin cambios en Auth, schema Prisma, fuentes B2, motor, dependencias o producción.

## Ejecutar y rollback

Desde el checkout D:, `node --import tsx apps/api/scripts/start-cost-base-wizard-local.ts`; puerto 4722, proceso actual registrado en la sesión terminal 51777. No arrancar si otra instancia ocupa el puerto; no detener procesos ajenos.

Rollback: detener sólo este proceso; conservar/copy del bundle local si se necesitan sus decisiones; retirar únicamente los archivos nuevos W1 y su entrada de estado, tras comprobar cambios posteriores. No borrar trabajo anterior ni fuentes compartidas. El bundle no modifica una base SaaS: no hay adopción, migración, Auth ni producción que revertir.

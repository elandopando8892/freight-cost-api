# Economía de socios y persistencia · candidato local

> Ventana autorizada cerrada: [cuatro migraciones aditivas aplicadas en preview](partner-additive-window-20260923.md), de36 a40, con respaldo completamente restaurado en local antes de escribir. Auth permanece intacto y su migración final sigue pendiente. El código sigue local; falta despliegue pareado y recorrido autenticado. Los apartados siguientes conservan evidencia histórica.

> Gate remoto 2026-09-23: [inventario real de preview](partner-preview-readiness-20260923.md) confirma36 migraciones aplicadas y5 pendientes, incluida una migración destructiva de identidad fuera de alcance. **NO ejecutar migrate deploy general**. No hubo escrituras remotas; se requiere autorización puntual y aplicación selectiva ensayada para los cuatro cambios aditivos de septiembre.

> Actualización 2026-09-23: Docker recuperado sin borrar datos; 41 migraciones aplicadas en PostgreSQL desechable y 9/9 pruebas reales de persistencia aprobadas. El bloqueo local descrito en la evidencia de la primera entrega queda resuelto. Continúan pendientes la migración remota autorizada, el recorrido autenticado en preview y la aceptación de tarifas reales.

Fecha: 2026-09-23. Base comprobada: `10739caa77d14329a3c151a500cc87ea046bb587`, rama `codex/quote-integrity-sprint`, worktree `D:/andre/worktrees/freight-cost-model/supabase-auth-migration-20260830`. Árbol limpio al comenzar. No se modificaron otros worktrees.

## Resultado de negocio

XBF puede preparar una estimación de compra D2D MX/US por viaje sencillo, revisar sus componentes y guardarla como versión independiente de una cotización de venta. Historial → detalle muestra importes, fuentes declaradas, vigencias, condiciones, responsables, FX y supuestos congelados. Una nueva versión parte de esa captura y exige recalcular y revisar. No se inventa margen ni se reutiliza `OWNED_FINANCED` para simular compra a terceros. No se activan bases `MODEL_PENDING`, transbordo, MX Drayage ni roundtrip.

Reutilización: adoptar autenticación, roles, BFF, tokens y patrón de snapshots/idempotencia existentes; adaptar a compra de terceros; rechazar guardar en `Quote`, porque sus campos significan tarifa/precio comercial. Sin dependencia nueva, proveedor externo ni consumo de IA del producto. Los [wireframes](../../../docs/design/THIRD_PARTY_COST_HANDOFF.md) precedieron a los cambios UI; la guía design-handoff orientó estados, accesibilidad y breakpoints.

## Contrato económico y técnico

- `POST /engine/third-party-cost` sigue siendo aritmética sin DB. Añade `reviewChecksum`, SHA-256 canónico del resultado completo (incluye captura normalizada, versión del motor y fuente no verificada).
- `POST /partner-cost-estimates`: ADMIN/OPERATOR, entrada estricta `{input, reviewChecksum, previousId?}`, cabecera UUID `Idempotency-Key`. No recibe importe de salida del navegador. Recalcula en servidor, compara la huella y rechaza cambios con 409, captura incompleta con 422. Guardar no significa aprobar económicamente las fuentes.
- El insert único de `PartnerCostEstimate` conserva snapshot, autor interno, fecha, versión y padre. `UNIQUE(orgId,saveKey)` deduplica reintentos; misma clave con otro contenido produce 409. `UNIQUE(orgId,previousId)` arbitra dos sucesoras simultáneas: una gana y otra recibe 409, sin overwrite. FK compuesta obliga a que el padre pertenezca a la misma organización. Trigger rechaza UPDATE. No hay endpoint UPDATE/DELETE; la cascada de eliminación organizacional existente permanece permitida. Sólo se retiraron organizaciones sintéticas del test local, ninguna real.
- `GET /partner-cost-estimates` devuelve hasta 20 versiones por página, orden `(createdAt,id)` descendente y cursor por ID validado en el mismo tenant. El cursor no serializa timestamp. No expone claves de reintento, referencias ni supuestos en el listado.
- `GET /partner-cost-estimates/:id`: mismo tenant, todos los roles autenticados, snapshot y enlaces anterior/siguiente. La lectura valida checksum y devuelve la economía histórica; no aplica otro motor ni actualiza FX al abrir. Un fallo de integridad devuelve 500 sin exponer datos internos. SHA-256 detecta alteración accidental; no equivale a firma independiente ni prueba de autenticidad del proveedor.
- No hay RLS/direct access nuevo ni acceso del navegador a PostgreSQL. Aislamiento en API autenticada, consultas scoped y FK compuesta. Identidad u organización vacías fallan cerrado. Roles sintéticos en tests no prueban Supabase real.
- Todas las respuestas son `no-store`; el BFF existente conserva Idempotency-Key. UI bloquea captura durante guardar. Ante respuesta incierta conserva clave/cuerpo para reintentar en esa sesión; no emite una nueva solicitud lógica. Recargar/cerrar pierde el intento en memoria: consultar historial antes de repetir una captura. No se guardan borradores sensibles en localStorage.

## Evidencia de la primera entrega (antes de recuperar Docker)

- Node 24.19.0, sin sustituir runtime del sistema.
- 556 pruebas API aprobadas. Suite estándar omite 8 PostgreSQL: 2 previas + 6 nuevas opt-in. No contar omisiones como aprobadas.
- 25 pruebas web aprobadas: captura vacía, cálculo real 2530, conceptos pendientes, reintento exacto después de timeout, precarga y revisión a 2730, consulta de sólo lectura, conflicto 409, páginas reales de detalle/historial con API simulada y recuperación de fallo de consulta sin guardado.
- Build API y web aprobados; nuevas rutas `/quote/partners/saved` y `/quote/partners/saved/[id]`. Lint web aprobado. Validador estático: 41 migraciones; **esto no prueba ejecución SQL**.
- Navegador con componente real y almacenamiento simulado en memoria: calcular2530 → guardarv1 → reabrir → editar tarifaUS a1400 → calcular2730 → guardarv2. Iframe1280: clientWidth=scrollWidth1261; iframe390: clientWidth=scrollWidth371. Sin desbordamiento horizontal en estados inspeccionados. Fixture rotulado SIN AUTH/DB, se borra al recargar. No prueba listado/detalle SSR autenticado ni persistencia durable.
- `apps/api/scripts/test-partner-persistence.ps1` ejecutado: falla antes de crear contenedor/migrar porque Docker Desktop Linux Engine no está disponible (`dockerDesktopLinuxEngine` pipe ausente). Intento de iniciar la aplicación local no habilitó el daemon. Instalación PostgreSQL16 encontrada sólo con `data`, sin binarios de servidor. No se instaló ni reparó infraestructura, no se usó una DB remota como sustituto.
- En la primera entrega quedaron 6 pruebas reales preparadas, sin ejecutarse. Esa limitación histórica fue resuelta por la validación siguiente.

## Validación PostgreSQL ejecutada tras recuperación de Docker

Autorización explícita del usuario para reparar Docker y continuar economía/persistencia. [Diagnóstico y recuperación reversible](docker-local-recovery-20260923.md): sockets temporales residuales, sin reinstalación ni eliminación de VHDX/imágenes/volúmenes.

Primera ejecución satisfactoria a las 09:31 (America/Mexico_City): Node24.19.0, Docker Engine29.7.2, `postgres:16-alpine`, digest `sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea`. Contenedor `fcm-partner-test-7181922da44a`, DB `fcm_partner_disposable`, puerto sólo `127.0.0.1:55644`. Las 41 migraciones se aplicaron desde una base vacía; `migrate status` confirmó esquema al día. Vitest: **9 aprobadas, 0 omitidas**, duración total5.50s. No se accedió a bases remotas.

Segunda ejecución con el runner endurecido a las09:32: contenedor `fcm-partner-test-a21b571a928b`, sólo `127.0.0.1:59663`, nuevamente41 migraciones desde cero y9/9 pruebas aprobadas (2.36s). Segunda aplicación en la misma base: `No pending migrations to apply`. Ambos contenedores desechables se retiraron. Esto confirma que el runner actual y la reaplicación de migraciones también fueron ejecutados, no sólo escritos.

Regresión API repetida después:556 aprobadas. La invocación estándar no configura DB y omite11 casos (9 de socios, ejecutados aparte y aprobados como se detalla arriba; 2 heredados de Quote, no repetidos en este seguimiento). No sumar las omisiones como pruebas aprobadas. `git diff --check` sin errores. No se cambió la UI en este seguimiento; sus25 pruebas/build/lint son evidencia de la entrega anterior, no una nueva prueba autenticada.

Casos ejecutados:

1. Guardar2530USD → releer → crearv2 con2730USD → comprobar v1 intacta y enlace a sucesora.
2. Otra organización no puede leer, usar cursor ni enlazar padre ajeno; VIEWER lee pero no escribe.
3. Trigger impide UPDATE y FK compuesta rechaza parentesco entre organizaciones.
4. Cambio de tarifa tras revisar produce409; conceptos incompletos422; ninguna fila adicional.
5. Cerrar la app HTTP y desconectar clientes PostgreSQL → conexión nueva y reapertura con snapshot idéntico.
6. Abortar una transacción revierte la fila completa; reintento limpio crea una sola versión.
7. Retener un INSERT sin commit, observar `wait_event_type=Lock` en PostgreSQL y liberar: reintento retorna la misma ID, una fila.
8. Dos revisiones con bloqueo SQL observado: sólo una sucesora; competidora409.
9. Más de20 versiones: paginación sin duplicados ni faltantes.

Los mensajes Prisma de violación de UNIQUE son esperados en las pruebas de conflicto; la API los resuelve como200 de reintento o409 de sucesora existente. El contenedor y su almacenamiento efímero fueron retirados por el runner después de las pruebas; sólo contenían fixtures sintéticos. La imagen oficial queda en caché. Se mantuvieron los contenedores ajenos que Docker reanudó por sus políticas.

El runner ahora rechaza overrides `DOCKER_HOST`/`DOCKER_CONTEXT`, exige endpoint local named-pipe y Node>=22 antes de crear el contenedor. También repite `migrate deploy` para comprobar reaplicación sin cambios. Las pruebas usan identidad simulada y Fastify real con PostgreSQL real: **no** prueban Google/Supabase OAuth, BFF autenticado, recarga del navegador ni renovación de sesión.

## Salida de release (pendiente, no desplegar todavía)

1. **Gate local aprobado:** ejecutar desde la raíz con Node>=22 `./apps/api/scripts/test-partner-persistence.ps1` después de cambios de esquema/contrato. Usa contenedor propio `postgres:16-alpine`, puerto aleatorio sólo127.0.0.1 y base `fcm_partner_disposable`, sin montar datos del host. Exigir 41 migraciones aplicadas, replay sin pendientes y las 9 pruebas efectivamente aprobadas. El runner elimina únicamente su contenedor efímero al terminar.
2. Antes de cualquier migración remota, solicitar autorización específica sobre la DB aislada de preview, confirmar identidad/esquema actual y respaldo; verificar migraciones previas pendientes. No modificar Neon/Rateware como parte de esta entrega local.
3. API y web del mismo commit. Con sesión ADMIN/OPERATOR: calcular→revisar→guardar→detalle→recarga→renovación; confirmar fila y economía inalteradas. Segundo tenant:404; VIEWER:consulta200/escritura403. Provocar pérdida de respuesta y confirmar misma ID en el reintento. Dos sesiones revisando el mismo padre:una sucesora; otra409. Registrar IDs de evidencia sin tokens ni credenciales.
4. Conciliar tarifas de socios con documentos reales por dirección/ruta/equipo/fecha y responsabilidades del intercambio. Caso sintético cuadrado no es aceptación económica. Precio final de venta, impuestos, contingencias y otros segmentos requieren decisiones separadas.

## Rollback y límites

No se desplegó ni se aplicó ninguna migración **remota**. Las migraciones sólo se aplicaron en contenedores desechables locales, ya retirados; no hay datos de negocio que restaurar. Cambios de código acotados a esta entrega; baseline `10739ca`. Si después se autoriza y aplica el esquema remoto: volver API+web al commit previo y **conservar** tabla/evidencia; no ejecutar DROP ni borrar snapshots como rollback rutinario. La tabla es aditiva y no altera Quote, Neon/Auth o el Site URL compartido. No hubo invitaciones, cambios de usuarios reales, cotizaciones enviadas, operaciones de negocio ni llamadas de IA del producto.

Recomendación por actividad: Astra/alto para economía, idempotencia y aislamiento; Sol/medio para formularios, historial y wireframes; Astra/alto para revisión de concurrencia y gate de release. Es recomendación de dimensionamiento, no una afirmación de cambio de modelo: se mantuvo la configuración de la tarea y no se delegaron agentes.

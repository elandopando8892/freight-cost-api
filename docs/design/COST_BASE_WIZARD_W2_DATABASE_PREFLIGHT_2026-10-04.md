# W2 · conexión real y bloqueo de escritura

Actualización posterior: [preparación específica autorizada, rechazo del perfil y ausencia de escrituras comprometidas](COST_BASE_WIZARD_W2_PREPARATION_2026-10-04.md). La autorización propuesta en esta nota se recibió después, pero el perfil operativo impidió crear base/rol; no se considera permiso para relajar metodología. La evidencia y autoridad siguientes conservan su momento histórico.

**Preflight PostgreSQL real completado; persistencia autenticada todavía abierta.**
Verificado el 4 octubre 2026, 19:19:59–19:21:05 UTC (13:19–13:21 México).
No se guardó ninguna decisión, no se creó un borrador y no se cambiaron permisos.

## Autorización y alcance ejecutado

Respuesta humana «autorizo» a la propuesta de gate local de hasta 60 minutos:
verificar sólo Neon Preview y guardar una decisión en un borrador existente,
con recarga/recuperación/replay, si los permisos vigentes lo permiten. La propuesta
excluyó crear bases/versiones/usuarios y prometió consultar los permisos exactos
antes de modificarlos. Esta respuesta **no autoriza rol/GRANT ni nuevos registros
de base/versión**. La propuesta más amplia del gate anterior no se considera
concedida íntegramente por esta respuesta.

Checkout D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927;
rama `codex/cost-tires-release-s14`, HEAD
`4f5fc2de0c3d178dace917231e1092040dec21fd`. Lista de worktrees y cambios
previos inspeccionados; sin rama, commit, staging o reset nuevos.

## Evidencia actual, no sólo configuración

Se reutilizó `apps/api/scripts/inspect-partner-preview.ts` mediante CLI Vercel
instalada: verifica el proyecto API exacto, tres variables de scope Preview único,
sin overrides de rama, y el host/base esperados. Valores de conexión sólo en memoria,
sin volcado de secretos, archivo de credenciales ni descifrado de la recuperación
local vencida. No instalación ni nuevo proveedor.

Dos consultas Prisma acotadas, ambas con `SET TRANSACTION READ ONLY`, timeout de
statement 10 s y transacción 20 s; conexiones desconectadas en `finally`.
El owner se usó exclusivamente para preflight, **no como credencial del runtime**.

- Proyecto configurado verificado: `broad-art-99750179`.
- Host directo: `ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech`.
- PostgreSQL conectado: `neondb`; actor de inspección `neondb_owner`;
  `transaction_read_only=on` observado en la primera transacción.
- Organización existente: `cmsqrb5ye0001q7mn6i4dbx2b`.
- Base piloto: `cmsqufvfb0002pn7gxy5i7cke`, XBF Cross-border Pilot,
  CROSS_BORDER, ACTIVE, `operationalSegment=null`.
- Su única versión: `cmsqufvfh0004pn7gp3c35crj`, v1, PUBLISHED,
  `isActive=true`, sin perfil explícito.
- Otra base existente: `cmuincn3a0001fipzvtahvtz2`, QA Sprint 18 Intra-Mexico
  - NO COMERCIAL, INTRA_MEX, DRAFT, segmento null; no se reutilizó para D2D.
- **Cero borradores elegibles** al filtrar DRAFT/no activa, base no archivada,
  CROSS_BORDER/D2D_BINATIONAL_OWN. No fallback a la base predeterminada.
- Un ADMIN existente con Supabase ID no vacío en esa organización. Es inventario
  de vínculo, no prueba de UUID válido, acceso a Auth ni sesión iniciada.

Permisos efectivos consultados con `has_table_privilege`/`has_column_privilege`;
estos tres roles revisados no son un inventario exhaustivo de todos los roles:

| Rol existente | LOGIN / vigencia | SELECT evento | INSERT evento | UPDATE(id) org / versión |
| --- | --- | --- | --- | --- |
| fcm_local_read_20260930 | LOGIN; vencido 2026-10-02T03:16:49.930Z | Sí | No | No / No |
| fcm_c1_preview_20260929 | LOGIN; sin VALID UNTIL | Sí | No | Sí / No |
| fcm_tire_v2_preview_20260929 | LOGIN; sin VALID UNTIL | Sí | No | Sí / No |

Los tres tienen superuser=false y bypassrls=false. No se probaron sus passwords,
no se renovaron y no se adoptaron consumidores/credenciales de otros cortes.
Las seis tablas User, Organization, CostBase, AssumptionSet, AssumptionParam y
CostBaseAuditEvent tienen RLS y FORCE RLS **apagados**, según pg_class. Por tanto
un rol con grants de tabla no queda aislado por tenant en PostgreSQL: un runtime
futuro deberá delimitar organización/base/versión y endpoints; no prometer RLS
existente ni activar políticas bajo este gate.

## Revisión previa y mínima ampliación propuesta, NO ejecutada

Se conserva la elección W2: metadata append-only existente, sin tabla nueva ni
migración. Reutilizar la base piloto activa o ampliar los roles previos alteraría
alcances históricos; usar owner en la aplicación contradice la frontera vigente.

El alta estándar `createCostBase` crea parámetros canónicos; no permite afirmar
que se preparará una base vacía usando ese servicio. Una alternativa conservadora
para autorizar es:

1. Una base de revisión `W2-QA-BINATIONAL-20261004`, nombre claramente NO COMERCIAL,
   en la organización anterior; CROSS_BORDER/D2D_BINATIONAL_OWN, OPERATIONAL_V3,
   USD, DRAFT y no predeterminada. Una sola versión DRAFT/no activa, clonada de la
   v1 piloto identificada; sin overrides de importes, preset recomendado,
   calibración, publicación o activación. Perfil explícito MX/US, Dry Van,
   Truck Trailer/Single, OWNED_FINANCED y relevo propio/misma caja como contexto
   de revisión. Valores históricos clonados **no equivalen a benchmark calibrado**.
   Usar servicio de creación y su auditoría existentes, no una inserción vacía
   que salte el contrato canónico. Si el servicio rechaza el perfil/valores,
   detenerse sin corregir valores automáticamente.
2. Rol nuevo `fcm_w2_local_20261004`, sólo si no existe ya: LOGIN máximo 24 h,
   CONNECTION LIMIT 2, NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOINHERIT/NOBYPASSRLS/
   NOREPLICATION; CONNECT neondb, USAGE public; SELECT sólo las seis tablas
   anteriores; UPDATE sólo columna id de Organization y AssumptionSet para
   los SELECT FOR UPDATE del adaptador; INSERT sólo columnas id/orgId/costBaseId/
   action/actorId/note/payload/createdAt de CostBaseAuditEvent. Sin DELETE,
   TRUNCATE, propiedad, membresías, permisos del ledger ni mutación de parámetros,
   perfil, estados, calibración o usuarios por el rol runtime. UPDATE(id) sigue
   siendo un privilegio de actualización, no una capacidad exclusiva de lock:
   runtime exacto y validación posterior son necesarios. Verificar además grants
   heredados de PUBLIC, funciones SECURITY DEFINER y permisos efectivos antes
   de iniciar; detenerse si la frontera no se cumple, sin revocar permisos ajenos.
3. Runtime loopback temporal limitado al org/base/version resultantes y a
   auth/me, health/ready y GET/PUT del wizard exacto, con Supabase existente y
   sin aprovisionar usuarios; no API general ni owner. Un guardado de metadata y
   replay exacto; recarga/reinicio; parámetros/calibración/estado antes/después;
   conflictos y denegaciones. Sesión existente ADMIN requerida: ningún token en
   chat, ningún login simulado presentado como real. Otros roles/cuentas sólo si
   ya están disponibles, con faltantes explícitos.

Estas tres acciones requieren autorización puntual nueva. No fueron intentadas.
Permisos nuevos no autorizan cambiar usuarios, OAuth, schema, infra compartida,
producción, AI/Maps/Routes ni desplegar. Creación de base/versión y eventos de alta
son escrituras separadas del único evento de decisión; no contabilizarlas como
«una sola escritura».

## Resultado, cierre y rollback

Comprobado ahora: dos preflights READ_ONLY, conexión y target, inventario relevante,
permisos de roles conocidos y ausencia de objetivo elegible. Escrituras intentadas:
0. Sesión Supabase, guardado, recarga, restart, replay y aislamiento autenticado:
**no ejecutados**. No repetir suites simuladas para dar por superado este bloqueo;
los resultados 105/105 previos siguen siendo evidencia anterior local.

Sin servicios nuevos arrancados ni procesos ajenos detenidos. Ambas conexiones
cerradas. No existen datos o grants de este corte para revertir. Rollback documental:
retirar esta nota, su referencia en gate previo y sólo el checkpoint propio en
SPRINT_STATUS, conservando cambios ajenos. Si luego se autoriza preparar objetivo,
conservar su auditoría; nunca borrar historial ni DROP OWNED. Terminación del
acceso nuevo necesita identificar ausencia de consumidores y alcance autorizado.

Responsable de preflight/documentación: Codex/OpenAI, GPT-6.1 Sol/high recomendado
y autorizado por continuidad de la propuesta; modelo/esfuerzo efectivos desconocidos.
Tiempo local de este corte inferior al bloque autorizado de 60 min; sin Claude,
subagentes, inferencias auxiliares, instalación o gasto nuevo activado. Cuota/cargo
real no observables. `engineering:testing-strategy` separó pruebas reales/simuladas;
`engineering:documentation` conservó autorización, evidencia y rollback.

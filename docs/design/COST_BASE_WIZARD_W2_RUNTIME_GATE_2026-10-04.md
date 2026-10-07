# W2 · gate de persistencia autenticada

Actualización posterior, 2026-10-04 19:21 UTC: [conexión PostgreSQL real y frontera de autorización](COST_BASE_WIZARD_W2_DATABASE_PREFLIGHT_2026-10-04.md). El usuario autorizó el gate más estrecho propuesto en chat, sin nuevos grants ni bases/versiones. Preflight READ_ONLY ejecutado; ningún borrador elegible ni rol conocido de escritura compatible. La autorización amplia propuesta más abajo no se considera concedida; escritura/prueba autenticada siguen pendientes de decisiones puntuales. La evidencia siguiente conserva su fecha histórica.

Estado al 2026-10-04, aproximadamente 12:24 America/Mexico_City:
**preflight de configuración completado; prueba autenticada/escritura bloqueadas**.
No repetir la UI ni declarar W2 cerrado con los tests simulados. Ver
[implementación, wireframe y evidencia W2](COST_BASE_WIZARD_W2_2026-10-04.md).

## Evidencia comprobada ahora

- D: `cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD
  `4f5fc2de0c3d178dace917231e1092040dec21fd`. Worktree/lista de cambios revisados;
  no branch/worktree/commit nuevos, cambios previos preservados.
- Listeners loopback: 4722 y 4730. Ningún listener 3000/3001/3002 observado.
  No se detuvieron procesos. Las demos no equivalen a la aplicación autenticada.
- Política actual en `local-read-review.ts`: rol `fcm_local_read_20260930`, vigencia
  `2026-10-02T03:16:49.930Z`; GET acotados, sin endpoints del wizard. La vigencia
  terminó el 1 octubre a las 21:16:49.930 México. Se inspeccionó código/documentación,
  no se conectó al rol para afirmar sus atributos actuales en PostgreSQL.
- Existe el archivo cifrado de recuperación; no se abrió ni descifró. Su presencia
  no demuestra credencial vigente, permisos de escritura o disponibilidad de DB.
- Metadata Vercel leída mediante herramientas GET: API
  `prj_mw1xLIqutlRSIG2F2BryfPqDvN2L`, Web `prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV`,
  equipo `team_KUG1PtOwoJ16eUqxiOJ330Os`, nombres freight-cost-api/web.
- Sólo tres valores no secretos de configuración Preview se consultaron:
  `STAGING_NEON_PROJECT_ID=broad-art-99750179`,
  `STAGING_PGHOST_UNPOOLED=ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech`,
  `SUPABASE_EXPECTED_PROJECT_REF=alqjqzqagdmcywpjtnnr` (rateware-prod esperado).
  No lectura del valor de DATABASE_URL, contraseña, clave pública/privada o token.
  Configuración no equivale a conexión real, tablas/permisos actuales o sesión Auth.
- Últimos deployments informados por metadata de los proyectos: API
  `dpl_hsFg3Py5uLnAAfocZfk1c32sFPWu` / freight-cost-ekr1hl95j-elandopando8892s-projects.vercel.app;
  Web `dpl_DCmXHzwnsocvLt6dFP3iardd9aFN` / freight-cost-akcw62bjt-elandopando8892s-projects.vercel.app.
  Ambos READY y target **staging**, no se reclasifican como Preview normal.
  La respuesta de detalle API no incluyó SHA/gitSource; no se verifica par del mismo
  commit ni código W2. No se adoptaron esos deployments como reemplazo local.

## Alternativas y recomendación

| Ruta | Resultado y riesgo | Decisión |
| --- | --- | --- |
| Reusar el rol local SELECT vencido | No permite INSERT ni locks FOR UPDATE; renovar LOGIN no resuelve el contrato. Alteraría una autorización anterior. | No renovar ni ampliar automáticamente. |
| Usar owner o cambiar el entorno/deployment compartido | Evita preparar un runtime, pero expone escrituras ajenas al gate y no acredita código W2. | Rechazada como credencial de aplicación. |
| Runtime local temporal y restringido contra el Preview verificado | Sin nuevo deploy ni migración, usando el código local. Requiere aprobar acceso/permisos de prueba y verificar antes el borrador existente. | Recomendada, **pendiente de autorización específica**. |

No se diseñan/ejecutan grants a ciegas. Los locks existentes usan SELECT FOR UPDATE
en Organization y AssumptionSet; añadir INSERT a CostBaseAuditEvent sin examinar
permisos efectivos no basta. No otorgar UPDATE general ni habilitar API normal con
todos sus endpoints. Antes de lanzar un writer se necesita delimitar target, org,
base, versión, permisos efectivos, endpoints permitidos, expiración y consumidores.
Si no puede restringirse sin ampliar materialmente el alcance, consultar.

## Autorización propuesta, todavía no concedida

Bloque finito de hasta 60 minutos de ejecución local, acceso de prueba máximo
24 horas, sin retries automáticos ante Auth/target/permisos cambiados. Autorizar
preflight read-only de Neon Preview con conexión de administración verificada,
sin registrar secretos; preparar un rol nuevo temporal/restringido sólo si hace
falta, preservando roles existentes; identificar un borrador compatible existente.
**Una sola decisión** guardada en metadata y su replay exacto, sin nuevo evento por
repetición. No crear bases/versiones/usuarios si no existe el objetivo elegible:
detenerse y pedir la decisión concreta.

Este bloque implicaría acceso a DB y posiblemente DDL de rol/GRANT, fuera del corte
local W2 previo. No se presenta como autorización de infraestructura recibida por
el simple “continúa”. No cambia producción, Auth, Site URL, schema/migraciones,
parámetros económicos, estado de bases, calibración, publicación ni activación.
Sin IA/Maps/Routes/cron/operaciones comerciales. No nuevos deployments.

## Checklist de cierre, no ejecutado contra DB real

1. Comprobar target y permisos sin escritura. Verificar usuario ADMIN ya existente,
   organización autorizada, base D2D_BINATIONAL_OWN y versión DRAFT no activa con
   perfil explícito compatible; rechazar aprovisionamiento y selección por default.
2. Arrancar sólo runtime local acotado; capturar identidad/version/fingerprint y
   comparar antes/después de parámetros, calibración y estado. Sin secretos en logs.
3. Guardar una decisión con dato manual vacío y aceptación/premisas explícitas.
   Confirmar un evento de metadata, actor servidor y ninguna adopción.
4. Recarga y reinicio → misma revisión/decisión; replay UUID exacto → ningún evento
   adicional. Un segundo contenido con UUID repetido o revisión obsoleta → conflicto.
5. Probar anónimo, expiración, rol de consulta y otro contexto sin cambiar usuarios;
   sólo declarar aislamiento autenticado real si hay las sesiones existentes para
   hacerlo. Faltantes se distinguen de mocks, no se inventan cuentas.
6. Cerrar conexiones/runtime de prueba; conservar evento de auditoría. Rollback de
   acceso sólo sobre el rol nuevo identificado y sin consumidores ajenos, con
   autorización; nunca DROP OWNED ni borrado de historial. No activar/publicar.

## Qué cambió / qué falta

Este bloque añade sólo el gate documental y checkpoint; implementación W2 intacta.
No tests repetidos: no cambió código, no hay resultado nuevo de login/persistencia.
Las 105 pruebas del corte anterior siguen siendo evidencia local anterior, no una
validación PostgreSQL de este bloque. Falta autorización específica y un borrador
real comprobado; no puede estimarse porcentaje operativo a partir de READY.

Responsable: Codex/OpenAI; GPT-6.1 Sol/high recomendado para el gate de permisos y
persistencia. Modelo/esfuerzo nativos observados desconocidos. Sin Claude ni
subagentes; sin inferencias auxiliares o gasto activado. `engineering:documentation`
ordenó precondiciones, aceptación y recuperación; no skill de despliegue aplicada.
Rollback documental: retirar esta nota y sólo el párrafo propio de SPRINT_STATUS,
preservando el resto. Ninguna modificación externa que revertir en este bloque.

# Equipo: compatibilidad de identidades previa al corte

Base verificada en D: `2fc63e0`, rama `codex/supabase-auth-slice`, worktree limpio.
Autorización vigente: conservar sales@heymarksman.com ADMIN; cambiar únicamente
jgonzalez@xbfreight.com a VIEWER después de verificar miembros y administrador.
Ningún cambio de rol ejecutado en este incremento.

## Evidencia y causa

Consulta de logs Vercel del preview API `dpl_753yXrKDRdhu4GgrmagmroKYuPTe`:
GET /org/members devolvió 500 a las 17:21:07 UTC del 2026-09-08. Prisma P2032:
supabaseId esperado String no nullable, encontrado null. El esquema local anticipa
el corte final obligatorio, pero al menos un registro conectado aún carece de UUID.
No se inspeccionaron ni modificaron identidades individuales para resolverlo.
Settings convierte la excepción en [], por eso la UI muestra Equipo (0). Ese cero
no constituye evidencia de ausencia de miembros ni administradores.

## Corrección local

La ruta usa una proyección SQL de sólo lectura, parametrizada por orgId, que devuelve
id/email/role/createdAt e identityLinked calculado con IS NOT NULL. No decodifica ni
expone supabaseId; incluye miembros vinculados y pendientes. No cambia esquema,
migraciones, login, asignación de roles, Auth compartido, Neon ni registros.
El defecto de presentación de errores en Settings queda pendiente por separado.

12/12 pruebas focalizadas: listado, roles e invitaciones. El listado usa Prisma
simulado: prueba proyección, parametrización y propagación de errores, no ejecución
SQL contra la base real. Typecheck API PASS. La compatibilidad en preview sigue pendiente.

## Salida pendiente y rollback

Publicar web/API del mismo commit sólo en preview, sin migraciones; comprobar que
GET /org/members devuelve 200, comprobar roster y mantener sales ADMIN; después
previsualizar y confirmar el cambio de jgonzalez a VIEWER por el flujo gobernado.
No declarar el rol cambiado ni QA VIEWER aprobada antes de esas comprobaciones.
Preview vigente sigue en 00cfa51. Rollback: volver a esa pareja (con el fallo de
listado conocido) o revertir únicamente el commit de código; sin rollback de datos.

Método: skill debug para reproducir mediante logs, aislar lectura y corregir sin
rellenar datos. Modelo recomendado GPT-5.6 Sol alto para diagnóstico/compatibilidad;
medio para documentación y ejecución rutinaria. Selector real no verificado.

## Cierre en preview y cambio autorizado

Pareja web/API READY sobre `725646a93204a42b3f229e392c3753ecaf8c523c`,
target preview y sin aliases. Evidencia: `evidence/preview-release-725646a.json`.
Web: https://freight-cost-ie77ctp5q-elandopando8892s-projects.vercel.app.
API: https://freight-cost-9gqd59n78-elandopando8892s-projects.vercel.app.
Build API omitió migraciones fuera de producción; ZIP de fuente versionada SHA-256
`F307C1AB5779F6A93136E3E024F590A826AD7C7EC34E622B7FD8399BF1587AC3`.
Escaneo previo: PASS, 433 archivos. Health/ready reportaron el SHA y base conectada.

Google login real con sales@heymarksman.com; roster recuperado con tres miembros:
sales vinculado ADMIN, jgonzalez vinculado OPERATOR y un OPERATOR pendiente de primer
acceso. Se previsualizó y confirmó sólo `jgonzalez@xbfreight.com: OPERATOR → VIEWER`.
La UI indicó un administrador restante, registró auditoría y conservó el rol tras
recarga. Logs del API: POST preview 200 17:45:08Z, PATCH role 200 17:45:25Z y GET
members 200 17:45:44Z. No se modificó Supabase Auth ni otra aplicación.

AUTH-07 permanece pendiente: el selector Google del navegador no contiene la cuenta
jgonzalez y no se intentó capturar credenciales. Falta su login real y comprobar
controles de sólo lectura/403. El registro ACCEPTED de invitación conserva el rol
histórico y no sustituye el rol vigente mostrado por Equipo.

Rollback del código: pareja `00cfa51`. Rollback del permiso, sólo con nueva
autorización, mediante el mismo flujo gobernado VIEWER → OPERATOR; no se ejecutó.

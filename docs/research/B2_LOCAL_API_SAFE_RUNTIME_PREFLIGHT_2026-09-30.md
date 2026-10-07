# B2 · preflight del API local seguro

Validación posterior al corte de sesión. Fecha local 2026-09-30. Worktree D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd verificados; cambios ajenos conservados. Políticas globales e instrucciones de debugging revisadas. No implementación, credenciales guardadas, conexiones SQL o cambios remotos en este corte.

## Resultado

La sesión local real quedó acreditada en el corte anterior, no se repitió login. Next local conserva listener 3000; API 3002 no está iniciada. Docker responde, pero no hay contenedor FCM existente: PostgreSQL 55432 pertenece a `xbf-desk-auth-local-v1`; otros servicios corresponden a Rateware/ERP. No se inspeccionaron filas ni se reutilizaron sus bases o credenciales; no hace falta reparar Docker para este bloqueo.

API local no tiene `.env`/`.env.local` con conexión, sólo ejemplo. El checkout base conserva entorno histórico Kinde/Neon; se inventariaron nombres, no se cargó. El worktree Supabase anterior no aporta una credencial limitada local. No se copian usuarios de staging a una base desechable para aparentar flujo real.

## Reutilización y comparación proporcional

1. **Reutilizar rol limitado del Preview**, preferido si existe su credencial válida fuera del deployment. [C1 ya documentó](../C1_PREVIEW_RELEASE_2026-09-29.md) el rol `fcm_c1_preview_20260929`, sólo inyectado por deployment; no nuevo proveedor, recurso o arquitectura. También documenta UPDATE de Organization: no equivale por sí solo a un runtime totalmente de sólo lectura. Deben mantenerse bloqueados los métodos con efectos y comprobar permisos efectivos antes de usarlo.
2. **Rol exclusivo SELECT para el API local sobre el Preview existente**, alternativa recomendada si la credencial anterior no puede recuperarse. Requiere nueva autorización para CREATE ROLE/GRANT; no está autorizada ni ejecutada en este corte. Sin rotar el rol activo, migrar, copiar datos, modificar Auth, publicar o tocar producción. Limitar runtime a rutas necesarias ya inspeccionadas y actores existentes, con rechazo de escrituras y comprobación de RLS/rol.
3. **Usar credencial propietaria histórica o PostgreSQL de otra aplicación**, rechazado: no acredita aislamiento/privilegios apropiados y diverge del alcance. Eliminar la autenticación o inventar identidad/datos tampoco es alternativa.

Fuente primaria de configuración: [Vercel environment variables](https://vercel.com/docs/environment-variables) y lecturas GET de metadatos/variable exacta, sin env pull masivo ni archivo de secretos. Investigación existente reutilizada y contrastada en vivo, sin nueva infraestructura.

## Evidencia comprobada en vivo

- Deployment API existente `dpl_Ac2WjNK3uxc5URtMhgTp2py3riVN`, URL freight-cost-aujrrwwwe-elandopando8892s-projects.vercel.app, proyecto `prj_mw1xLIqutlRSIG2F2BryfPqDvN2L`, equipo `team_KUG1PtOwoJ16eUqxiOJ330Os`, READY, SHA b83f2e24e16e5d0b13d75643c8179498a738bbdf. No es el HEAD local actual ni contiene el nuevo consumidor Google; no se adoptó como reemplazo transparente del backend local.
- GET de deployment expone nombres de variables, no la credencial limitada por deployment. No se consultaron archivos internos ni se intentó descifrar secretos de builds. No se concluye que sea irrecuperable por cualquier canal humano; este canal no la proporcionó.
- GET de entorno del proyecto identifica **una sola STAGING_DATABASE_URL**, ámbito exclusivamente `preview`, sin override de rama. Lectura del valor en memoria confirma host ep-autumn-thunder-av6e9bsh-pooler.c-11.us-east-1.aws.neon.tech, `/neondb`, usuario **neondb_owner**, no `fcm_c1_preview_20260929`. No se imprimió ni guardó contraseña/URL completa, no se abrió conexión PostgreSQL. No se afirma haber revalidado sus grants/RLS efectivos sólo por el nombre de usuario.
- `authenticate` normal llama `resolveUser`: puede vincular/crear usuario y ejecutar ensureActiveSet. Existe `FCM_PREVIEW_EXISTING_USERS_ONLY=true`, condicionada a VERCEL_ENV=preview: código y test existentes acreditan que omite provisioning y defaults. No se activó ni cambió Auth en este corte. `authenticateExisting` de preflight sólo consulta identidad, pero no gobierna las rutas normales de dashboard; cambiarlo globalmente no sería reutilización automática.
- Lecturas necesarias para dashboard identificadas: /org, /auth/me, /cost-bases, /market/fuel, /quotes, /onboarding/carrier. Source de GET org/onboarding/quotes/fuel inspeccionado; autenticación/provisioning es la frontera previa. No se ejecutó ninguna de esas rutas contra API remota para evitar una escritura implícita.

## Alcance de la próxima entrega y criterios de cierre

Objetivo sin nuevo sprint: panel autenticado actual → API loopback 3002 → lecturas reales de FCM Preview. Conservar UI/wireframe MARKSMAN existente; no diseño gráfico nuevo. Fuente de verdad de negocio sigue FCM Preview, identidad Supabase rateware-prod; no mezclar Service Desk o datos de Rateware.

Antes de arrancar: credencial limitada comprobada, target Preview verificado, no superusuario/CREATEDB/CREATEROLE/BYPASSRLS, no escrituras/provisioning ni métodos externos fuera de presupuesto. Cierre: /health y /ready, lecturas de identidad/organización/bases/cotizaciones autorizadas, panel y recarga con resultados reales, peticiones sin sesión y mutaciones rechazadas. Rol sales se debe observar, no cambiar a OPERATOR para satisfacer supuestos. Renovación por vencimiento, viewer/otro tenant y cálculo completo permanecen separados si no se verifican.

**Bloqueo actual:** falta credencial apropiada recuperable o autorización puntual para crear rol SELECT en Preview. No iniciar backend con owner, rotar la credencial de otro deployment o convertir este preflight en migración. Maps/Routes nuevas 0/0; presupuesto acotado previo aún no consumido. B2 parcial y MVP no cerrado.

Rollback de este corte: retirar sólo nota/referencias propias; no hay servidor API nuevo, conexión SQL, rol, grants, deployment o datos que revertir. Sin Auth, Neon write, SQL/migración, usuarios, infraestructura, operaciones de negocio o IA de aplicación. No suite/build repetidos porque no cambió implementación. Diff check realizado para documentación.

Modelo recomendado **GPT-6.1 Sol · medio** para inventario/metadatos; **alto** si se autoriza el siguiente cambio de privilegios y verificación de límites. No selector cambiado ni tokens/precios medidos. Debug guió la separación de servicio apagado, capacidad existente y autoridad para activar.

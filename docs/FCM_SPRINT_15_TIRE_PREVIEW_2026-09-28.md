# Sprint 15: ensayo de persistencia y preview aislado

Fecha: 2026-09-28. Esfuerzo recomendado: alto; modelo recomendado: GPT-6 Sol.

Autorización: el usuario respondió `adelante` a la propuesta explícita de crear/usar una base desechable, ejecutar migraciones aisladas y desplegar API/web del mismo commit exclusivamente a Preview.

## Evidencia local observada

- Base funcional: commit `b5acf44982da10be94272bc41b23d0628d1b997c`.
- Runner reutilizable: `apps/api/scripts/test-tire-preview-isolated.ps1`.
- PostgreSQL 17 efímero, puerto aleatorio sólo loopback, almacenamiento tmpfs.
- 44 migraciones aplicadas; replay sin pendientes; status al día.
- RLS/adaptador real y contrato: 13 pruebas aprobadas.
- Backup `pg_dump` y restauración `pg_restore --exit-on-error`: aprobados.
- Restauración comparada: 2 expedientes, 6 eventos, 2 paquetes, mismas huellas de paquetes y 5 tablas con RLS forzada.
- Rol de aplicación sin superusuario ni BYPASSRLS.
- El contenedor y todos sus datos sintéticos fueron eliminados al terminar.
- Esto no acredita login ni sesión real de Supabase.

## Destino remoto observado

- Equipo Vercel: `team_KUG1PtOwoJ16eUqxiOJ330Os`.
- API: `prj_mw1xLIqutlRSIG2F2BryfPqDvN2L`, raíz `apps/api`.
- Web: `prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV`, raíz `apps/web`.
- Ambos proyectos usan `elandopando8892/freight-cost-api`; producción sigue la rama `master`.
- Proyecto Neon existente de staging: `broad-art-99750179`.
- Endpoint verificado: `ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech`.
- La conexión heredada de staging usa `neondb_owner` con BYPASSRLS: no se utiliza como runtime del candidato.
- Base nueva exclusiva: `fcm_tire_s15_20260928`, creada vacía mediante `template0` dentro del proyecto de staging existente.
- Rol nuevo exclusivo: `fcm_tire_s15_app`, sin superusuario, CREATEDB, CREATEROLE, INHERIT ni BYPASSRLS.
- 44 migraciones aplicadas sólo en la base nueva; cinco tablas de llantas con RLS habilitada y forzada.
- Privilegios DML se limitan a las tablas de la base nueva; el runtime no recibe acceso a `_prisma_migrations`.
- No se cambiaron conexiones compartidas ni se copiaron usuarios o datos comerciales.

## Frontera de aceptación

El candidato mantiene `quoteEligible=false` y no habilita publicación de parámetros. La prueba autenticada todavía necesita un autor y dos ADMIN distintos de un mismo tenant, con login, recarga y renovación comprobados. No se promoverán cuentas existentes ni se crearán cuentas Auth para simular aceptación.

Los recursos de Preview se desplegarán desde un único commit limpio y recibirán la conexión exclusiva por deployment, sin modificar las variables compartidas del proyecto.

## Rollback concreto

1. Retirar exclusivamente los dos deployments de este sprint, identificados en la evidencia posterior.
2. Confirmar que ninguna conexión activa depende de `fcm_tire_s15_20260928`.
3. Retirar únicamente esa base desechable y después el rol `fcm_tire_s15_app` desde el proyecto de staging verificado.
4. Eliminar los archivos temporales de credenciales después de confirmar su almacenamiento en el deployment.

No ejecutar DROP contra `neondb`, ni cambiar `neondb_owner`, Auth, alias de producción o variables compartidas. La restauración ensayada es local; no se declara recuperación remota validada.

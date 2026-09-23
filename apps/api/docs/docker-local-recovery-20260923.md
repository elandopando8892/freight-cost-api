# Recuperación local de Docker para economía/persistencia

Autorización: el usuario pidió continuar economía/persistencia y reparar Docker si era necesario. Trabajo del repositorio en D:, rama `codex/quote-integrity-sprint`, HEAD base `10739caa77d14329a3c151a500cc87ea046bb587`; cambios locales previos conservados. Se usó engineering:debug para reproducir, aislar causa y verificar la recuperación, antes de instalar o cambiar configuración.

## Evidencia y corrección

Docker Desktop 4.86.0 / Engine 29.7.2, Windows/WSL2. El cliente estaba instalado pero no existía la conexión `dockerDesktopLinuxEngine`. El registro del backend mostró aborto en `Inference manager`, por un `dockerInference` inaccesible (error Windows1920); posteriormente apareció el mismo fallo en `Secrets Engine/engine.sock`. No era evidencia de corrupción de datos PostgreSQL ni de fallo del cálculo de FCM.

Se contrastó el síntoma con el [reporte de sockets AF_UNIX residuales en el repositorio Docker](https://github.com/docker/desktop-feedback/issues/460). Es un reporte de usuario, no una garantía de solución del fabricante. Se comprobó localmente que las carpetas involucradas contenían solamente sockets de ejecución y que no eran junctions.

Se detuvo Docker por su CLI, se comprobó ausencia de backend/GUI activos y se renombraron las carpetas temporales, conservando sus contenidos. El primer intento avanzó hasta el siguiente socket residual; su aborto volvió a dejar un socket de inferencia. El arranque exitoso se hizo después de comprobar que **ambas rutas originales estaban ausentes**. Quedaron estos respaldos, sin eliminarlos:

- `C:/Users/andre/AppData/Local/Docker/run.fcm-backup-20260923`
- `C:/Users/andre/AppData/Local/Docker/run.fcm-backup-20260923-0927`
- `C:/Users/andre/AppData/Local/docker-secrets-engine.fcm-backup-20260923`
- `C:/Users/andre/AppData/Local/docker-secrets-engine.fcm-backup-20260923-0926`

`docker desktop start` completó; `docker desktop status` confirmó running; `docker info` devolvió29.7.2 y `docker ps` respondió. Contenedores preexistentes se reanudaron por sus políticas de Docker; algunos Auth locales aparecieron reiniciando. No se cambiaron ni repararon esos proyectos. El runner FCM crea su propio PostgreSQL sin reutilizar sus bases.

## Alcance, reversibilidad y prevención

No hubo factory reset, desinstalación, actualización, cambio de settings, cambio de permisos, `wsl --unregister`, eliminación de VHDX, prune de imágenes/volúmenes ni reinicio de Windows. Se mantuvo el servicio de Docker con su configuración previa. No se enviaron diagnósticos manualmente a terceros; Docker puede generar su telemetría normal según sus preferencias existentes.

La recuperación despeja sockets; **no corrige permanentemente un posible defecto de Docker/Windows**. Preferir parada ordenada de Docker y evitar terminar sus procesos a la fuerza. Si reaparece, revisar el registro actual antes de actuar, detener Docker, verificar rutas/contenidos exactos y conservar cualquier carpeta apartada. No restaurar sockets corruptos para operación normal. Las carpetas respaldadas permiten inspección/rollback de nombres con Docker detenido, pero devolver esos sockets puede reproducir el fallo. Discos y datos originales no fueron movidos y no necesitan restauración.

La validación de negocio sigue separada: PostgreSQL desechable + identidad de test, no autenticación Supabase real ni aceptación de tarifas documentales. Ver [evidencia de persistencia](partner-cost-persistence.md).

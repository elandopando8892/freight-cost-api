# Diseño Fable5.1: recuperación aislada

Run7791f94b5f7049b8930f215a4ec2bca2, modelo solicitado/observado claude-fable-5-1. Esfuerzo solicitado high, observado desconocido según el kit. Diseño solo lectura; cierre comprobado. La declaración de esfuerzo en la respuesta no acredita nivel efectivo.

Revisión sin herramientas ni escritura: hallazgos sobre los dos archivos suministrados y, a continuación, el diseño solicitado.

## Hallazgos

Líneas relativas al bloque TypeScript de `docs/reviews/RECOVERY_TRANSPORT_SANITIZED_2026-10-09.md` (el derivado no numera; margen ±2).

| # | Línea | Sev. | Evidencia | Corrección sugerida |
|---|---|---|---|---|
| 1 | 85-86, 125-126 | Alta | `restoreEnv` apunta a `127.0.0.1:5432` dentro del mismo contenedor cliente que es el origen en `LOCAL_REHEARSAL` (línea 76 exige mismo puerto). No existe destino separado; la brecha del objetivo está aquí. | Añadir `destination` opcional (ver contrato). Si está presente, `pg_restore`/`psql`/`pg_dump --schema-only` del lado restaurado se ejecutan con `docker exec <destination.containerId>` y el archivo entra por `docker cp host→destino`. |
| 2 | 126 | Alta | `pg_restore` sin `--no-owner/--no-acl` y sin roles en destino: `ALTER OWNER`/`GRANT` a roles inexistentes abortan con `--exit-on-error`. Hoy funciona solo porque el destino comparte cluster. | Preparación controlada de roles NOLOGIN antes del restore, únicamente si el destino está limpio (criterio 3). |
| 3 | 98 | Alta | `relkind IN ('r','S')`: matviews (`m`), foreign tables (`f`), large objects y padres particionados (`p`) no entran en el hash; el dump custom sí incluye blobs y matviews, por lo que una divergencia pasaría inadvertida. | Puerta previa al dump: consulta a `pg_class` (`m`,`f`), `pg_largeobject_metadata`, `pg_foreign_server`, `pg_event_trigger`, `pg_publication`, `pg_subscription`; si hay filas, lanzar `BACKUP_UNSUPPORTED_OBJECTS` con solo los tipos, antes de `BACKUP_UNCERTAIN`. |
| 4 | 125 | Media | `CREATE DATABASE … TEMPLATE template0` hereda encoding/locale del destino; en cluster distinto puede diferir del origen y cambiar orden/igualdad sin alterar los hashes de datos. | Leer `encoding, datcollate, datctype, datlocprovider, daticulocale` del origen; crear con `ENCODING/LC_COLLATE/LC_CTYPE` explícitos; rechazar `datlocprovider='i'` en este bloque; verificar igualdad tras crear. |
| 5 | 73-75 | Media | `docker port` en Docker Desktop suele devolver dos líneas (`127.0.0.1:p` y `[::1]:p`); el regex sin flag `m` falla y bloquea con `BACKUP_LOOPBACK_REQUIRED` de forma espuria. | Dividir por líneas; exigir que todas sean loopback y el mismo puerto. |
| 6 | 69, 91 | Media | `owned()` comprueba ID por nombre, pero `exec` se lanza por nombre: ventana TOCTOU si el nombre se reasigna a otro contenedor. | Ejecutar `docker exec`/`cp` con `containerId`, no con el nombre, en origen y destino. |
| 7 | 137-141 | Media | El `catch` descarta el código interno; el diario registra `UNCERTAIN` sin motivo, lo que dificulta auditoría sin filtrar nada. | Registrar `code` solo si el mensaje cumple `/^BACKUP_[A-Z_]+$/`, si no `BACKUP_UNKNOWN`. |
| 8 | 135-136 | Baja | Si `record('VERIFIED')` lanza (disco lleno), el llamador recibe `BACKUP_STOPPED_REVIEW_JOURNAL` aunque la restauración está verificada; pérdida de acuse. | Documentar que el diario es la verdad; en tests, forzar fallo de `record` y comprobar que no hay segundo `VERIFIED`. |
| 9 | 54, 92, 114 | Baja | Timer externo 120 s / interno `timeout 110`; `docker cp` no tiene límite interno y un dump >110 s deja archivo parcial sin marcar. | Aceptable para el ensayo; declarar límite de tamaño y registrar `BACKUP_WINDOW_CLOSED` en diario con la fase. |
| 10 | 38 | Baja | `mode: 0o700` no aplica en Windows; la privacidad de la reserva depende de la ACL del directorio raíz. | Declararlo en el contrato; no certificar privacidad por este flag. |
| 11 | contexto | Info | "No certificar todo el cluster por comprobar dos flags": el resultado actual solo tiene flags booleanos de cluster. | Mantener los flags existentes sin cambiar su valor y añadir un objeto de alcance enumerado (abajo). |

## Diseño: recuperación aislada en segundo cluster (opción B)

**Decisiones.** Se elige un segundo contenedor PostgreSQL 16 propio, limpio y desechable, con la misma imagen ya disponible; sin dependencias ni servicios. La extensión es aditiva: si `destination` no se suministra, el comportamiento y los 81 tests actuales no cambian. Antes de `pg_dump` se rechazan tipos no cubiertos en vez de ampliar la comparación. Los roles necesarios se crean NOLOGIN, sin contraseña ni atributos peligrosos, y solo en un destino vacío. Las credenciales del destino son propias de él y nunca se reutilizan en remoto. Los flags de cluster existentes se conservan en `false`; lo verificado se expresa por objeto enumerado.

**Contrato mínimo (aditivo).**
```ts
destination?: {
  container: string            // /^fcm-recovery-target-[a-f0-9]{12}$/
  containerId: string          // /^[a-f0-9]{64}$/, distinto de options.containerId
  label: 'recovery-target-20261009'   // valor de fcm.disposable
  credentialEnvironment: NodeJS.ProcessEnv // solo PGPASSWORD del destino
}
// Resultado: campos actuales intactos, más
recovery?: {
  cluster: 'separate'
  rolesPrepared: string[]      // creados NOLOGIN, sin password
  databaseSettings: { encoding: string; collate: string; ctype: string; verified: true }
  roleSettings: 'none' | 'rejected'
  unsupported: []              // vacío por construcción
}
```
Errores nuevos: `BACKUP_DESTINATION_INVALID`, `BACKUP_DESTINATION_SAME_AS_SOURCE`, `BACKUP_DESTINATION_NOT_CLEAN`, `BACKUP_DESTINATION_OWNER_CHANGED`, `BACKUP_UNSUPPORTED_OBJECTS`, `BACKUP_SETTINGS_CHANGED`. Validaciones: endpoint npipe idéntico, puerto loopback propio y distinto del origen, ID inmutable comprobado antes de cada exec, destino sin bases fuera de `postgres/template0/template1` y sin roles con `oid >= 16384`. Preparación de roles: lista de `pg_roles` del origen referenciados como dueños o en ACL de esquemas de usuario; `CREATE ROLE x NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS` sin `PASSWORD`; membresías no se reconstruyen. Settings: encoding y locale libc copiados; `pg_db_role_setting` presente provoca `roleSettings:'rejected'` y bloqueo (no se afirma recuperación de settings no portables).

**Criterios de aceptación y test discriminante.**
1. Destino distinto: con `destination.containerId === options.containerId` falla `BACKUP_DESTINATION_SAME_AS_SOURCE`; con destino válido, todo `exec` de restauración lleva el ID del destino (aserción sobre argv de spawn). La implementación actual falla este test.
2. Destino no limpio: fixture con un rol extra o una base extra devuelve `BACKUP_DESTINATION_NOT_CLEAN` y no se emite ningún `CREATE ROLE`/`CREATE DATABASE`.
3. Roles NOLOGIN: fixture con objetos de `app_owner` y GRANT a `app_reader`; en destino `rolcanlogin=false`, `rolsuper=false`, `rolpassword IS NULL` para ambos; el mismo fixture sin preparación aborta en `pg_restore`.
4. Rechazo previo: fixture con matview o large object lanza `BACKUP_UNSUPPORTED_OBJECTS` sin que exista `pg_dump --format=custom` en spawn ni `BACKUP_UNCERTAIN` en el diario.
5. Encoding/locale: origen `LC_COLLATE 'C'` y destino por defecto UTF-8; `CREATE DATABASE` lleva `LC_COLLATE 'C'`; un destino que devuelve collate distinto produce `BACKUP_SETTINGS_CHANGED` y no `VERIFIED`.
6. Carrera/cancelación: abort entre `BACKUP_UNCERTAIN` y restore deja diario `UNCERTAIN` con `code`, sin `VERIFIED`; cambio de ID del destino tras la primera inspección produce `BACKUP_DESTINATION_OWNER_CHANGED` sin ningún exec posterior contra él.

**Límites.** Ensayo local de dos clusters; no hay mantenimiento durable ni migración remota. No se recuperan membresías de rol, tablespaces, event triggers, publicaciones, FDW ni extensiones con binarios (se rechazan o declaran). Locale ICU rechazada. Privacidad de la reserva no certificable por `0o700` en Windows. `clusterRolesVerified` y `databaseSettingsVerified` siguen en `false`.

**Ruta (máx. 3 archivos).**
1. Archivo actual del transporte `backupPostgresTransition` (nombre real no visible en el derivado): opción `destination`, puerta de tipos, errores nuevos, `code` en diario, exec por ID, `docker port` multilínea.
2. Nuevo módulo hermano de `postgres-transition-inspection`: validación de destino, comprobación de limpieza, consulta de roles/settings del origen y preparación NOLOGIN.
3. Suite de pruebas existente del transporte, extendida con los seis tests; sin modificar los 81 aprobados.

## Pendientes y checkpoint

- No se suministraron comandos PowerShell sellados (lista vacía) y no tengo herramientas: no se ejecutó ningún test ni se verificó el original de SHA256 `f71adc…`.
- Nombres reales de archivos y la fixture previa no son visibles; la ruta de implementación asume la estructura importada en el derivado.
- Sin cambios realizados ni reclamados. Checkpoint: diseño y 11 hallazgos entregados; siguiente paso del operador es integrar tras proceso cerrado.

Modelo observado: `claude-fable-5-1`. Esfuerzo solicitado: high. Esfuerzo observado: una sola pasada sin herramientas, dentro de los 3 pasos y 20 min del presupuesto.

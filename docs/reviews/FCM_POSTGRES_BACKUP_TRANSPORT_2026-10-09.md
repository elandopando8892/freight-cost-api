# Transporte de respaldo y recuperación PostgreSQL

## Alcance y decisión

Continuación local del 2026-10-09 desde `11cb1fa02b90073ca7528ba847f719e0d8d3846a`, rama `codex/cost-tires-release-s14`, worktree en D:. Se preservan los 45 archivos previamente no versionados. No se reutilizan ventanas remotas vencidas.

Benchmark reutilizado: [inspección PostgreSQL](FCM_POSTGRES_INSPECTION_2026-10-09.md), [ADR-012](../architecture/ADR-012-historical-transition-coordination.md) y ejecutor histórico local existente. La capacidad es estándar, no un nuevo motor propio. Frente a copiar JSON (pierde secuencias, índices y ACL) o añadir otro servicio de backups (nueva dependencia), se conserva el formato custom de pg_dump y pg_restore ya disponible en PostgreSQL 16. No se incorpora librería, instalación o costo recurrente. Referencias documentales previas: [pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html).

Objetivo: sacar un archivo recuperable del contenedor y comprobar restauración en una base nueva. No hay cambios de UI ni wireframes nuevos. Arquitectura: validación de destino existente → inspección de solo lectura → reserva local → respaldo → archivo persistente y hash → restauración nueva → comparación de tablas/secuencias/esquema. No se integra todavía como autoridad de escritura del supervisor.

## Implementado

- Cliente Docker explícitamente identificado por nombre, ID completo y etiqueta; endpoint local y puerto loopback. No adopta otros contenedores ni bases existentes.
- Directorio canónico bajo D:/andre/validation; reserva exclusiva por fingerprint de destino y diario con fsync. Un intento previo, incluso incierto, impide repetir la operación en esa raíz.
- Credenciales mediante entorno, nunca argumentos; errores del proveedor no se imprimen. Archivo exportado sincronizado y SHA-256 por streaming, contrastado con el original del contenedor.
- Restauración con CREATE DATABASE, sin DROP/IF NOT EXISTS, y pg_restore transaccional. Compara esquema, filas y secuencias antes/después y en recuperación; conserva propietarios y ACL de objetos.
- Tiempo finito, señal de cancelación y registro UNCERTAIN. Desconectar el cliente no demuestra cancelación del servidor: el timeout interno y los límites SQL acotan ejecución; ante incertidumbre se conservan activos y no se reintenta.

## Evidencia y límites

Ensayo exclusivamente sintético: usuario histórico, importe 75000, segunda schema, FK, índice, secuencia consumida y ACL. El primer ensayo detectó un falso negativo causado por el marcador aleatorio final de pg_dump; se corrigió su normalización y se repitió con otra fixture, conservando la evidencia previa.

La comprobación de datos abarca tablas ordinarias y secuencias; no certifica contenido de large objects, foreign tables o vistas materializadas. `databaseObjectsVerified` se refiere a esas comprobaciones y al esquema, no a recuperación integral del cluster. No certifica roles globales ni configuración de base (`clusterRolesVerified=false`, `databaseSettingsVerified=false`). El destino del ensayo comparte los roles del cluster local; esto no acredita recuperación en otro cluster.

No se invocó modo NEON, TLS remoto, respaldo de datos reales, mantenimiento, migraciones, Auth, promociones ni login real. `maintenanceEstablished=false`, `migrationAuthorized=false`. La reserva es cooperativa/local: otra raíz evade su exclusión; no es un bloqueo global. No hay endpoint productivo nuevo. La copia contiene datos sin cifrar: cualquier respaldo real requiere autorización vigente sobre destino, acceso, cifrado y retención. La ausencia puntual de escritores no establece mantenimiento durable.

## Responsable, modelo y cierre

Validación final: 81 pruebas aprobadas y 6 omitidas en 6 archivos, 61.07 s, exit 0. Las seis omitidas son las pruebas PostgreSQL opcionales de la suite anterior de inspección, no las del nuevo transporte: sus seis pruebas sí se ejecutaron, tres contra PostgreSQL real. TypeScript estricto de transporte, inspección y pruebas: exit 0. No se repitió la suite completa API/Web ni build/despliegue; no cambió el runtime de la app.

OpenAI/Codex nativo; recomendación Sol 6.1/high, sin cambio de modelo. Modelo/esfuerzo efectivos y consumo exacto no observables. Claude considerado pero innecesario para este ensayo verificable; sin llamadas, gasto adicional o reinicio de cupos. Presupuesto: 45 minutos, sin reintentos remotos. Skill engineering:testing-strategy aplicada a integridad, aislamiento, cancelación previa y recuperación sin duplicados. Revisión propia, no independiente.

Rollback: revertir exclusivamente los archivos de este bloque; no modificar cambios ajenos. Los contenedores propios se retiran sólo tras verificar ID/etiqueta; datos sintéticos recreables por las pruebas. Archivos y diarios en D:/andre/validation se conservan, incluidos fallos. Pendiente: recuperación aislada con roles/configuración, mantenimiento durable y ensamblaje del adaptador de migración; después aceptación real del par desplegado y permisos. Este bloque no declara producción lista.

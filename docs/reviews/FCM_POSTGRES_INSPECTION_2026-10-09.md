# Fuente inmutable e inspección PostgreSQL para la transición

## Resultado y alcance

Continuación local autorizada el 2026-10-09. Inicio en `591208001d0a89c2f3136b4ba87710b1dd752128`, rama `codex/cost-tires-release-s14`, worktree `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`. Sin cambios tracked previos; se conservan los 45 artefactos ajenos sin versionar. Las ventanas de ejecución remota anteriores no se reutilizan después de su vencimiento.

Se completan dos piezas que faltaban para conectar el adaptador: procedencia de las migraciones y lectura real de las condiciones de PostgreSQL. También se entrega una CLI que las usa juntas. **No es todavía el adaptador completo de respaldo/migración ni una ejecución productiva.**

## Benchmark y decisión

Se reutilizan [ADR-012](../architecture/ADR-012-historical-transition-coordination.md), el paquete histórico, Prisma 5.22 instalado, el inventario productivo de sólo lectura y los ensayos Docker anteriores. Se inspeccionaron Git, dependencias y comandos locales: Docker disponible; `psql`, `pg_dump` y `pg_restore` no estaban instalados como comandos del host. No se instala otra herramienta.

| Opción | Capacidad concreta y costo | Decisión |
| --- | --- | --- |
| Tomar SQL desde el worktree y asumir mantenimiento por un indicador | Rápido, pero mezcla fuentes editables y no comprueba conexiones | Descartada |
| Añadir otro cliente PostgreSQL/servicio de workflow | Duplica dependencias y no resuelve por sí solo mantenimiento/autoridad | Descartada en este bloque |
| Leer blobs del SHA exacto y consultar PostgreSQL mediante Prisma existente | Sin nuevas dependencias; verificable en PostgreSQL real; conserva el mecanismo de migración existente | Implementada |

Las referencias oficiales de [roles PostgreSQL 16](https://www.postgresql.org/docs/16/sql-createrole.html) y [CONNECT](https://www.postgresql.org/docs/16/ddl-priv.html) fundamentan la comprobación de logins y conexiones. NOLOGIN afecta nuevas conexiones; el ensayo comprueba que una conexión ya abierta sobrevive. [Prisma PostgreSQL](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql) documenta `sslmode=require` y `sslaccept=strict`, reutilizados sin cambiar SDK ni trasladar flags de Prisma 7/8. Estas capacidades son estándar.

## Implementación

- `readHistoricalSourceFromGit`: requiere SHA completo igual al HEAD al iniciar y terminar; lee schema, lock y SQL originales de Git. Rechaza entradas inesperadas y conserva checksums LF/CRLF explícitos. No checkout, cambios de rama, remote, materialización o ejecución. La fuente completa contiene 47 migraciones; la exclusión única del retiro sigue perteneciendo al empaquetador histórico existente.
- `inspectPostgresTransition`: destino y rol explícitos; modo remoto limitado a endpoint Neon directo, puerto 5432, TLS estricto. Rechaza parámetros que puedan redirigir host/socket, duplicados y uso del rol migrador como runtime. El fingerprint mantiene el formato histórico host+database; en modo remoto el puerto está fijado.
- Prisma usa una conexión, transacción RepeatableRead/READ ONLY, statement_timeout 10 s y transacción máxima 20 s. Consulta catálogos, sesiones, marcadores e inventario. No ejecuta ALTER ROLE, cierra sesiones, cambia permisos, migra o provisiona usuarios.
- Bloquea runtime con LOGIN, roles runtime inexistentes, otros logins con CONNECT, otras sesiones —incluidas sesiones cuyos detalles están ocultos— y marcadores de intento previo. Exige propietario/BYPASSRLS o superuser para evitar un inventario parcial por RLS. Si hay problemas de catálogos, no devuelve un inventario parcial como válido.
- Devuelve IDs/roles originales y hashes de correo/fila completa, con `writesPerformed=false`, `maintenanceEstablished=false`, `migrationAuthorized=false`. La lectura puntual **no establece exclusión durable**, no acredita la lista de runtime declarada ni demuestra que ninguna aplicación comparta la credencial del migrador.
- `inspect-transition-readiness.ts` conecta fuente e inspección en una CLI de sólo lectura. Recibe configuración no secreta y utiliza exclusivamente `FCM_TRANSITION_INSPECTION_DATABASE_URL` de la sesión; no usa fallback a DATABASE_URL ni carga .env. Imprime sólo referencias, conteos, resultado y códigos. Exit 0 significa que estas comprobaciones puntuales pasaron; no valida Auth, drift completo, historial de migraciones contra el esquema ni autoriza ejecutar.

Desde `apps/api`: `node --import tsx scripts/inspect-transition-readiness.ts <config.json>`. La configuración contiene `repository`, `releaseSha`, `mode` (`NEON` o `LOCAL_REHEARSAL`), `expectedTargetFingerprint`, `migrationRole` y `runtimeRoles`. Las credenciales no pertenecen al JSON, al repositorio o al chat. Este bloque sólo invocó LOCAL_REHEARSAL.

## Criterios y evidencia

Ensayo con PostgreSQL 16 propio y datos sintéticos: inventario completo y fila histórica con valor 75000 sin modificación; bloqueo de login activo sin sesiones; conexión de aplicación existente sigue viva tras NOLOGIN y es detectada sin terminarla; rol inexistente; cancelación previa; marcador retenido. La tabla de migraciones de esta fixture es sintética: acredita consultas, no migraciones nativas ni correspondencia de esquema. Esa evidencia nativa pertenece al ensayo anterior, no se declara repetida.

La prueba de fuente construye el paquete real de 48 archivos y 13 pendientes desde las 47 migraciones del commit; rechaza HEAD textual, SHA abreviado y revisión distinta. El ledger usado en ese test es sintético. La CLI se ejecuta como proceso real contra la fixture, con 47 archivos de fuente, un usuario y un registro sintético, sin imprimir identidad o contraseña.

Última ejecución: **85/85 pruebas en 6 archivos, exit 0, 123.78 s**: 11 de inspección/CLI con PostgreSQL real, 4 de fuente y 70 regresiones de coordinación, aceptación, paquete y plan histórico. TypeScript estricto de los cinco archivos nuevos: exit 0. No se volvió a ejecutar la suite API/Web completa porque no hay cambios al runtime, UI o motor económico. No hay wireframe nuevo al no cambiar UI. Las pruebas opcionales PostgreSQL se activaron expresamente con FCM_INSPECTION_TEST_CONTAINER; no se reportan como aprobadas por una ejecución que las omita.

## Modelo, presupuesto y límites

Responsable: sesión nativa OpenAI/Codex, recomendación Sol 6.1 / high, sin cambio por CLI; versión efectiva/esfuerzo no observables. Claude podría revisar el adaptador, pero añadiría otro encargo y contexto; este bloque es verificable con PostgreSQL y se mantiene el ejecutor actual. Sin subagentes, llamadas Claude, cambios al kit o reinicio de cupos. Tokens/cuota/cargos efectivos desconocidos. Presupuesto local máximo 45 minutos, sin reintentos externos. Trabajo acotado a fuente e inspección local; ninguna ejecución remota ni gasto activado.

La skill codebase-design orientó reutilizar los módulos existentes y comprobar el adaptador mediante una interfaz concreta; no se añadió infraestructura. Revisión propia, sin nueva revisión independiente.

## Recuperación y siguiente bloque

Rollback de código: revertir sólo este checkpoint conservando cambios ajenos. Los contenedores con label `adapter-inspection-20261009` contienen exclusivamente fixtures; se retiran tras verificar ID/label. Sus datos sintéticos se eliminan mediante --rm; las pruebas permiten recrearlos. Se conservan archivos de evidencia en D:/andre/validation.

Fixtures utilizadas: `fcm-adapter-inspection-202610090001` (ID 1634c9509f3e0d14d2dab8824071de40d9794412397f16b537a12b40829a7038) en el primer ensayo 14/14; una fixture nueva `fcm-adapter-inspection-202610090002` (ID 171826e3a332bc0f4a7554065a49226efb7c7de8df53d57e19616c8951203c1b) para el ensayo final tras añadir la CLI y probar la sesión NOLOGIN. No se adoptaron bases o contenedores existentes ni se reintentó una escritura remota incierta.

Pendiente para conectar escritura: comprobar la separación real de credenciales/runtime del entorno objetivo; establecer mantenimiento y reserva durable en destino; implementar transporte de respaldo/restauración y migración que respete cancelación/cierre de procesos; después promover el par del mismo commit y aceptar OAuth/permisos reales de sales/JG. El módulo actual no hace ni autoriza esas operaciones. No se cambió Neon, Supabase, Vercel, cuentas o valores económicos reales.

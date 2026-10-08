# Bloque de persistencia histórica y membresía: desarrollo local

Estado: contrato de autor histórico, migración adicional y preparación SQL de membresía desarrollados/probados localmente. **No aplicado a Neon/Auth ni desplegado. Revisión independiente bloqueada; no aceptación productiva.** Referencia humana: «continua con el siguiente bloque completo de desarrollo», continuación del alcance «solo son sales y jgonzalez». Roles/IDs/importes existentes no se modifican. JG se prepara como VIEWER según solicitud humana previa; no se crea una identidad Supabase.

## Benchmark y decisión

Se conservan Prisma5.22.0 y PostgreSQL17. No se actualizan dependencias ni se sustituye el stack. [Prisma documenta expand/contract](https://www.prisma.io/docs/guides/database/data-migration); se aplica el principio gradual, no se copian comandos de versiones nuevas. [PostgreSQL17 permite DROP NOT NULL](https://www.postgresql.org/docs/17/sql-altertable.html) conservando columna/índice/relaciones.

- Mantener User como autor histórico con vínculo Auth opcional: mínima extensión, conserva IDs y referencias. Elegida.
- Mover autores a otra tabla: exigiría cambiar numerosas referencias de auditoría, publicaciones y cotizaciones; descartada en este bloque.
- Borrar autores, inventar UUIDs o crearles cuentas: incompatible con el alcance y trazabilidad; descartada.

El login no depende de que la columna admita NULL: exige token verificado, el par correo/UUID aprobado y membresía vinculada. No hay reactivación de históricos ni cambio en Auth compartido.

## Implementación

1. User.supabaseId es String? único. Un autor sin login puede leerse a través de Prisma; los IDs, roles, tenants y FK existentes permanecen.
2. Migración `20261008052054_preserve_historical_authors` generada mediante Prisma migrate dev --create-only en Postgres propio, sin aplicar a remoto. El SQL incorporado sólo elimina NOT NULL. El generador también propuso un rename de FK de llantas preexistente: no se ejecutó; se explicitó su nombre actual con map en schema para evitar DDL ajeno.
3. Las46migraciones anteriores no se editaron. El verificador diferencia la extensión histórica actual del guard atómico legado de retiro, que sigue intacto. No se marcaron migraciones antiguas applied para eludir un guard.
4. `buildViewerMembershipBundle` prepara backupSql/applySql/rollbackSql, nunca ejecuta. Sólo VIEWER para JG y la organización original de sales, derivada del inventario; preserve el rol del propietario. Entradas verificadas, IDs sin colisiones, fingerprint de todas las filas, referencias humanas/de par publicado obligatorias para preparar. Esas referencias/hashes no prueban consentimiento ni publicación.
5. Respaldo privado de todas las filas, prueba de reconstrucción exacta y manifest. Aplicación atómica: guarda el vínculo del owner y crea una sola membresía, sin organizaciones, supuestos o importes. Conflictos y replay abortan sin duplicar. Sólo después de publicar el par Supabase validado, pues una fila nueva sin kindeId puede romper el cliente antiguo.
6. Rollback protege referencias de todas las FK a User, incluso compuestas y CASCADE, antes de retirar exclusivamente la membresía recién creada e intacta. Restaura vínculo previo y NOT NULL legado si lo tenía; mantiene el respaldo para evidencia. Si el nuevo miembro ya tiene actividad/referencias o cambió su fila, aborta y no borra datos.

## Pruebas reales locales

- Rojo observado: Prisma5.22 rechazó supabaseId NULL (P2032), aunque el autor y su referencia con importe sintético seguían en SQL. Verde: cliente regenerado leyó el histórico con ID/tenant/rol originales; índice único siguió rechazando sujeto duplicado. **2/2 casos** en base mínima sintética.
- SQL de membresía: **3/3 casos** sobre base con las47migraciones y datos sintéticos. Rechazó aplicación sin backup; restoreProbe exacto; owner vinculado, nuevo VIEWER en mismo org; referencia histórica e importe75000 permanecieron; replay no duplicó; rollback con referencia nueva CASCADE fue rechazado; sin esa referencia sintética se restauraron filas y restricción Kinde original.
- Subagente Sol6.1/high, sin edición ni cloud: fixture RLS focal **17/17**,47migraciones, replay/status,7tablas FORCE RLS, rol app no-superuser/no-bypass y pg_dump/restore PASS. Su wrapper exit1 por comparación estricta de variable ausente vs vacía en .NET10; diagnosticó sólo con variable sintética. No se afirma restauración byte-idéntica de entorno. Shell efímero cerrado, contenedor propio eliminado.
- Suite FULL_API de main en fixture propia: **3459aprobadas/34omitidas,230archivos aprobados/6omitidos**, exit0, con PostgresRLS/backup/restore PASS. Las34omisiones corresponden a fixtures opcionales no configuradas; los5casos nuevos de autor/membresía se probaron por separado en sus bases propias.
- Web: **264/264,29archivos**, ejecución nueva, sin replay Turbo. API build-only exit0 y scripts TypeScript estrictos; contrato/migraciones estáticos exit0. No equivale a OAuth real, pruebas cloud o CI íntegra.
- Invocación inicial con Windows PowerShell5 falló en la comprobación de Node por escape de comillas antes de crear contenedor. Se usó después la shell normal PowerShell7.6.5, sin alterar políticas persistentes ni repetir escrituras de aquella invocación fallida. No se cambió el runner ni se redujeron guards.

## Revisión Opus: intento único sin dictamen

Procedimiento OPERATING/P2 vigente, una llamada autorizada, max15min/24000bytes prompt/2MiB salida, cero herramientas/MCP/escrituras/red/reintentos/fallback. Contexto sellado sólo código y fixtures; ninguna snapshot de usuarios reales, credencial o historia privada. Solicitud/elección `explicit_user_instruction`, policy sprint-model-budget-v1 v3 hash f5e5f6f1a1e86eca50c515934491bd24d05e625d07a6cd19c22661cbfc07cff8 y autorización previa del mismo sprint; no nueva raíz ni reseteo s2.

Run `dfaa8d1211e74fe4a1608a6e01e43ab2`, sesión `7be98bd8-f293-4db5-9914-045d176e64ae`, contrato d4ac903d0068f2e1c0f7ffd91c88ccedd31b620ff651c4eaf5b049a649d148f2, choice12665e9c7fa44cc5a22240b23749f7da. Modelo solicitado/observado claude-opus-5-5; esfuerzo solicitado high, observado desconocido. CLI2.1.287, Max/firstParty; billing guard reutilizó la observación OFF ligada a la cuenta, no un supuesto sobre el interruptor en vivo.

Se abortó a201.375s por trama de65537caracteres frente al límite65536, sin resultado completo ni hallazgos adjudicables. No timeout ni agotamiento del límite global2MiB. Procesos/helper/job cerrados y lease liberado. Consumo tokens/cuota/cargos desconocidos, **no cero**. Ledger conserva Opus1/1, agregado1/1, problema1/1, reserva24000bytes prompt/2097152salida; reserva cerrada. No resume/retry/fallback ni cambios del kit. Result completo paginado en dos lecturas; no se aceptó ni reconstruyó la trama descartada.

Desarrollo/pruebas locales se conservan; la revisión necesaria para aceptar una ejecución productiva está pendiente. Continuarla exige decisión humana sobre nueva revisión y sus cupos/proveedor/alcance; esta documentación no la autoriza.

## Orden de salida y bloqueos restantes

La base nueva desechable aplica47migraciones en orden porque está vacía. Eso **no demuestra** que el mismo comando funcione en Neon existente: la finalización20260830000200 sigue bloqueando actores históricos sin Auth. No ejecutar migrate deploy genérico sobre producción, no inventar sujetos ni falsear applied. Se requiere un ejecutor de transición explícito que aplique sólo el tramo aditivo/contrato histórico bajo backup y conserve el retiro diferido, con gate estrecho de coexistencia. Ese ejecutor/promotion supervisor todavía no se implementó en este paquete.

Después: revisión independiente válida; refrescar inventario/identidades y verificar backup real; plan aditivo/coexistencia comprobado; publicar par frontend/API del mismo commit con política de los dos accesos; sólo entonces aplicar membresía preparada; aceptar login, intercambio, sesión, recarga/renovación y permisos de ambos. No crear Auth accounts ni tocar Site URL/otras apps. No usar la nullable como permiso para saltar el resto de verificaciones.

Contenedores main propios: fcm-actor-block-20261008 / c574a8b59a4c3ac9b18ac16b898584f470de94e9457a12fe72621a353655c0ee y fcm-actor-green-20261008 /355582ec770d0cd6a28850390ba375ddc55c5a86ad50df3341977445c028e53e. Etiqueta/IDs verificados antes de stop; se eliminaron con --rm al terminar, sólo datos sintéticos. Fixture full fcm-tire-s15-762f5868a5bc cerrada por finally; los contenedores de otras apps se preservaron. El rollback local es revertir sólo este commit, sin reset destructivo ni borrar evidencias ajenas. No rollback remoto requerido: no se escribió allí.

Skills aplicadas: Supabase, codebase-design, TDD, systematic-debugging y verification-before-completion. Sin UI nueva o modificación visual: no wireframes nuevos. Main y subagente: Sol6.1/high solicitado; modelo/esfuerzo nativo efectivo desconocidos si no expuestos. Un intento Opus5.5/high; no IA de negocio, consumo de APIs de rutas/peajes o importes adoptados.

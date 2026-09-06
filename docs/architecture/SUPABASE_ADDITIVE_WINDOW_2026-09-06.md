# Ventana aditiva autorizada — 2026-09-06

El usuario autorizó censo, respaldo, migración aditiva y enlace de la cuenta
existente después del diagnóstico de la columna faltante. La rama inicial fue
`codex/supabase-auth-slice`, HEAD `5cb1fe2c391ae9ee031005313493d58621af87a7`,
con worktree limpio en D:.

## Destino y respaldo

- API preview: `freight-cost-9agop9nax-elandopando8892s-projects.vercel.app`.
- Proyecto Vercel: `prj_mw1xLIqutlRSIG2F2BryfPqDvN2L`, root `apps/api`.
- Variable de runtime: `STAGING_DATABASE_URL`; conexión administrativa mediante
  `STAGING_DATABASE_URL_UNPOOLED`, verificando el mismo endpoint sin pooler.
- Proyecto Neon: `broad-art-99750179`.
- Endpoint: `ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech`, `neondb`.
- PostgreSQL remoto y herramientas pg_dump/pg_restore: 17.11.
- Respaldo completo custom: `D:\andre\backups\freight-cost-model\auth-additive-20260906\staging-1788682176972.dump`.
- Tamaño: 458706 bytes.
- SHA-256: `f8beb1e68b391385e2d7789a3c9477a3ef9776c5b1b9abd0436d71abf7502782`.
- pg_restore --list pasó y contiene datos de User. Se extrajeron en memoria
  los datos de User del respaldo para comparar identidad; no se realizó una
  restauración integral a otra base. El respaldo contiene datos privados y
  permanece fuera de Git.

## Aplicación y aceptación

Antes: 3 usuarios, 1 organización, 0 grupos de correos duplicados y 35
migraciones aplicadas. La cuenta autorizada existía con un assumption set activo.

Se aplicó exclusivamente `20260830000100_add_supabase_identity`: columna TEXT
nullable e índice único. DDL y registro Prisma se realizaron en una transacción
con lock_timeout de 5 segundos. Checksum del SQL aplicado:
`60d05d4a7effe1f66df1c1b934071dfe9ca4e04c1ccf59a7634df5a3ee022348`.
No se ejecutó migrate deploy ni la migración final que elimina kindeId.

Después: 36 migraciones, 3 usuarios, 1 cuenta enlazada a Supabase y 3 vínculos
Kinde preservados. La comparación contra el respaldo confirmó igualdad de
id, orgId, email, role y kindeId para los tres usuarios.

La sesión Web existente permitió acceder al panel y el API registró respuestas
200 para auth/me, org, cost-bases, quotes y market/fuel. La UI mostró la
organización y el rol ADMIN existentes y cargó datos del workspace. El probe
directo al JSON BFF fue bloqueado por el navegador, pero el API recibió auth/me
y respondió 200; la aceptación se fundamenta en panel y logs correlacionados.
Un log de conexión PostgreSQL cerrada apareció en la primera petición, que
terminó en 200; las siguientes consultas también finalizaron en 200.

La renovación por expiración sigue pendiente de prueba real. Persistencia de
sesión no se contabiliza como renovación. Los otros dos usuarios permanecen
sin enlace Supabase, por lo que el corte final continúa bloqueado.

No hubo nuevo deployment, cambio de Site URL, modificación de producción,
creación de usuarios, envío comercial ni consumo de IA durante esta ventana.

## Rollback

## Conciliación posterior autorizada

Con la continuación del usuario se consultaron únicamente las identidades Auth
correspondientes a las dos cuentas pendientes. Una coincidencia tenía correo
confirmado, no era anónima y no estaba eliminada. Se enlazó mediante actualización
condicionada a supabaseId NULL, id interno, correo exacto normalizado y rol
OPERATOR. No se creó una identidad Auth ni se cambió el rol.

Resultado: 2 de 3 usuarios enlazados; la cuenta restante no existe en Supabase
y requiere registro y verificación por su titular. Los identificadores internos,
organización, correos, roles y los tres vínculos Kinde se compararon nuevamente
contra el respaldo y permanecen iguales. La renovación real por expiración
continúa pendiente; este enlace administrativo no demuestra login del operador.

Rollback de este enlace: restaurar únicamente supabaseId=NULL para la fila
enlazada, previa comprobación del sujeto y ausencia de cambios posteriores,
en una ventana autorizada. No requiere borrar el usuario ni cambiar su rol.

## Procedimiento de rollback del esquema

El esquema aditivo conserva kindeId, por lo que el release Kinde anterior sigue
siendo compatible. Para rollback funcional, volver al frontend/API Kinde
anterior y conservar la columna opcional y el índice: no hace falta restaurar
datos ni eliminar enlaces. No ejecutar la migración final mientras existan
usuarios sin conciliar.

La eliminación física de columna/índice o una restauración completa requieren
una ventana separada: podrían descartar enlaces o cambios posteriores. El dump
anterior y su checksum constituyen el punto de recuperación de esta ventana.

## Modelo y esfuerzo

GPT-6: alto para identificación del destino, censo, respaldo, aplicación y
comparación de invariantes; medio para comprobaciones de panel y logs.

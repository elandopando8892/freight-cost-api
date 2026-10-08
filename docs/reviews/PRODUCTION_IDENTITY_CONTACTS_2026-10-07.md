# Recuperación acotada de contactos históricos

## Corrección de alcance posterior del usuario

La instrucción humana posterior «solo son sales y jgonzalez» sustituye el plan de invitar a los contactos históricos: los únicos accesos FCM incluidos son `sales@heymarksman.com` y `jgonzalez@xbfreight.com`. No enviar invitaciones a las cuentas fr8hub ni activar otras cuentas históricas. La solicitud de confirmación de esas invitaciones queda sin efecto aunque permanezca visible en el chat.

El inventario histórico se conserva como evidencia, no como lista de personas que deban tener acceso. No borrar, reasignar autores ni inventar sujetos Supabase para satisfacer el guard de finalización. El modelo actual exige `User.supabaseId` no nulo y la finalización anterior exige vincular cada fila: antes de ejecutarla, el plan deberá distinguir registros históricos preservados de identidades habilitadas para login. Esta nota corrige el alcance; **no implementa** baja de acceso, cambia roles, migra la base ni modifica Auth. Los roles de los dos accesos no se cambian por una instrucción que sólo delimita sus correos.

El resto del documento describe el intento previo, cancelado en su parte de invitaciones; no concede autoridad vigente para enviarlas.

Estado: identidades identificadas; altas/invitaciones **no ejecutadas**, sprint productivo todavía abierto. La autorización humana «autorizo» de este corte responde a incorporar exclusivamente las dos cuentas históricas de FCM a Supabase, previa identificación y verificación de correo, conservando IDs, organizaciones y roles. No autoriza marcar un correo verificado por conveniencia, copiar cuentas, dar acceso adicional a Rateware ni cambiar su Site URL.

## Desarrollo y evidencia

Checkout D: y rama `codex/cost-tires-release-s14`, baseline `9327e1a8879d821be142dcc90554f6aaad542683`; implementación local `dcad3531c98f0299fb8efbb08d39c948fada7415`.

- Lectura especial `identity-contacts` limitada a dos IDs, hashes de correo y fingerprints completos inspeccionados. Exige proyecto API productivo y fingerprint exacto del Neon previamente leído. No imprime kindeId, contraseña, tokens ni filas ajenas; no cambia la base.
- Export nuevo producido desde blobs Git en una sola lectura batch, 1,591 archivos byte-exactos verificados antes de lanzar. Escaneo de secretos aprobado, sin debilitar reglas ni incluir archivos ajenos sin seguimiento. No reutilizó el export con fines de línea diferentes del corte anterior.
- Inspección `dpl_HK8TeKWtt35G5YNxxo8eBC7JD6wp`, `--prod --skip-domain`, SHA dcad353; cierre preventivo ERROR por `CUTOVER_INVENTORY_ONLY_NO_PUBLICATION`, sin publicar ni asignar dominios. Fragmento único completo con hash `f96ad2c0c819c8a2e381b3f9421ba9aca59c7787c710cf696d6ff18ac0093f91`.
- Resultado íntegro en `D:/andre/validation/fcm-production-cutover-20261007/identity-contacts.json`, fuera del paquete Claude. Los dos contactos profesionales del inventario original se comunicaron directamente al usuario; no se enviaron a modelos externos.
- Supabase `rateware-prod` contiene el trigger `assign_team_workspace_membership`: al verificar correo puede asignar organización/permisos Rateware según dominio. Se inspeccionó el trigger y su función; la consulta limitada al dominio de los dos contactos devolvió cero reglas. No se alteraron trigger, dominios, metadata ni permisos.
- Readback Auth limitado a ambos hashes: cero cuentas todavía. No se acepta el registro legado en FCM como prueba de propiedad del correo.

## Pruebas y límites

TDD observado: siete pruebas fallaron contra el stub; tras implementación pasaron. Suite focal de contacto/evidencia/gate de esquema: 18/18. Última verificación de seis archivos del corte: **71/71**, exit0 (plan35, SQL16, esquema10, contacto7, builder2 y evidencia1). TypeScript scripts en modo ESNext/Bundler estricto: exit0. El primer comando de TypeScript usó por error NodeNext/CommonJS, incompatible con el import.meta preexistente; no se presenta ese fallo de invocación como defecto arreglado ni se cambió el runtime.

`npm test` completo se lanzó: web 29 archivos / 264 casos aprobados; API no completó. `tire-calibration-rls-postgres.test.ts` reportó cero casos/error en colección y su contrato exige el par de URLs de Postgres desechable loopback; no se declara probado RLS. El runner global se interrumpió al alcanzar el checkpoint humano, exit1; no hay resultado global PASS ni aceptación de release.

Sesión real de preview b30lfgc3i: Configuración mostró sales@heymarksman.com ADMIN, HeyMarksman, tres miembros vinculados. No se editaron roles/invitaciones de FCM ni se hicieron cotizaciones/envíos. El preview muestra un inventario distinto al productivo y no se usará para sobreescribirlo. Se intentó recarga, pero la automatización agotó dos tiempos de espera, por lo que **recarga, renovación, intercambio de código y nueva autenticación no están acreditados** en este corte.

## Checkpoint y siguiente acción

Dashboard correcto de Supabase abierto y formulario de la primera invitación preparado; no se pulsó Invite user. Se solicitó confirmación concreta para enviar las dos invitaciones a los contactos históricos, conservando permisos existentes. La vía de navegador quedó detenida tras el segundo timeout; no se repetirán envíos ante un resultado incierto. Después de un envío, comprobar Auth antes de intentar cualquier otra escritura; aceptación/verificación sólo por el propietario del correo o por evidencia verificable del proveedor OAuth, nunca por el agente en su nombre.

No hubo inferencia Opus (la llamada única sigue no ejecutada), nuevas claves, cambios en Auth ni migraciones/backup SQL. Sol6.1/high es el ejecutor solicitado; modelo servido/esfuerzo efectivo desconocidos cuando el host no los expone. Se aplicaron las skills Supabase, test-driven-development, deployments-cicd y verification-before-completion al procedimiento, pruebas y límites de publicación.

Producción a 2026-10-07T23:18:26Z / 17:18:26 Ciudad de México: API health200/release `3414f95f5ec377d077b5f0b876a993b63c581cb0`, web login200 con marcado Kinde. No rollback SQL necesario: no se modificó esquema ni identidad. No se promocionó ningún candidato; conservar registros/evidencia. El retiro de kindeId permanece bloqueado hasta conciliación completa, respaldo recuperable, prueba autenticada real y publicación validada del mismo commit Web/API.

Fuentes verificadas el 2026-10-07: [migración OAuth oficial](https://supabase.com/docs/guides/platform/migrating-to-supabase/auth0), [createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [inviteUserByEmail](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), changelog oficial consultado como Markdown. La alta admin no prueba verificación; la invitación requiere intervención del destinatario. No se añadieron librerías, infraestructura ni rutas de precio.

# Invitaciones de organización y tenant piloto

El flujo permite que un ADMIN registre identidades que deben incorporarse a su
organización en el primer login con Kinde. No crea cuentas en Kinde, no envía
correos y no acepta sujetos de identidad proporcionados manualmente.

## Contrato seguro

1. `POST /org/invitations/preview` normaliza el email, busca conflictos sin
   revelar otro tenant y no escribe.
2. El preview devuelve `INVITE_MEMBER:<orgId>:<email>`.
3. `POST /org/invitations` exige esa confirmación exacta y registra una
   invitación `PENDING` durante siete días.
4. En el primer login, el backend obtiene el email directamente del perfil
   Kinde y consume la invitación dentro de una transacción.
5. La identidad se crea dentro del tenant invitante con el rol aprobado y la
   invitación pasa a `ACCEPTED`.

Un email ya asociado con cualquier usuario no puede invitarse. Si pertenece a
otro tenant, la API responde únicamente `EMAIL_UNAVAILABLE`. Una identidad ya
vinculada a otro `kindeId` nunca se reasigna.

## Operación del piloto

El tenant operativo actual utiliza un único ADMIN. Esa identidad registra el
smoke, el recorrido humano y la aprobación GO, siempre sobre el mismo
`RELEASE_SHA`. La API exige evidencia vigente y confirmación explícita del SHA.
Si el tenant incorpora un segundo ADMIN, la política cambia automáticamente a
doble aprobación y separa verificadores de aprobadores.

La revocación sólo cambia invitaciones `PENDING` del tenant del administrador.
No elimina usuarios ni cuentas Kinde. El envío de correo se incorporará después
como acción separada, auditable y explícita.

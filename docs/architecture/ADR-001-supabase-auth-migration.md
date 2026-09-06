# ADR-001: migrar la identidad de Kinde a Supabase Auth

- Estado: slice y preview verificados; artefacto local de corte final implementado con gate de conciliación; aplicación a Neon, retiro remoto de rollback, Rateware y aceptación móvil pendientes
- Fecha: 2026-08-30
- Alcance: Freight Cost Model Web/API; Neon/Prisma sigue siendo el sistema de registro de organizaciones, roles y datos operativos

## Resultado de producto

La pantalla de acceso, alta, confirmación de correo, recuperación de contraseña,
Google OAuth, sesión SSR y cierre de sesión pasan a Supabase Auth sin cambiar el
`User.id`, la organización ni el rol que Freight Cost Model ya asignó. Ninguna
cuenta, dato o configuración remota se migra por el solo hecho de integrar el
código.

## Reuse sweep

| Candidato | Licencia y estado observado | Decisión |
| --- | --- | --- |
| Ejemplo Next.js de `supabase/supabase` | Apache-2.0, mantenido y alineado con `@supabase/ssr` | **Adaptar** el patrón de cookies, proxy y callback; no adoptar el monorepo. |
| Ejemplo `with-supabase` de `vercel/next.js` | MIT, oficial y compatible con App Router | **Adaptar** la composición de cliente servidor/proxy y conservar la UI propia. |
| `@supabase/server` | Abstracción adicional sobre un API Fastify que ya tiene BFF y verificación JWT | **Rechazar por ahora**; aumenta superficie sin mejorar el resultado visible. |

Se fijan `@supabase/ssr@0.12.5` y `@supabase/supabase-js@2.112.4`. Esta versión
de `supabase-js` requiere Node.js 22 o superior, por lo que API, Web, CI y Vercel
deben usar el mismo rango.

## Decisión técnica

1. Next.js usa `@supabase/ssr`; el proxy refresca cookies y valida claims antes
   de proteger rutas. El BFF obtiene la sesión sólo después de validar claims y
   reenvía el access token al API.
2. Fastify valida firma, issuer, audience y expiración contra el JWKS de un
   proyecto Supabase fijado. También exige `role=authenticated`, email y
   `session_id`, y rechaza identidades anónimas.
3. Los permisos siguen viniendo de Prisma. `user_metadata` nunca decide tenant,
   rol o autorización.
4. La fase aditiva añade `User.supabaseId` sin eliminar `kindeId`. En el primer acceso, el API
   consulta al Auth server con la llave publicable y sólo enlaza un email confirmado
   si sujeto, email y token coinciden y no existe conflicto;
   se preservan el identificador interno, organización y rol.
5. Las invitaciones pendientes se consumen antes de crear una organización
   nueva. Un usuario nuevo sin invitación conserva el onboarding existente.
6. `SUPABASE_URL` debe ser HTTPS fuera de loopback y Web/API deben apuntar al
   mismo proyecto. `SUPABASE_JWT_AUDIENCE` permanece en `authenticated`.

## Secuencia de migración y gates

1. **Código local:** compilar API/Web, validar Prisma y pruebas de token,
   resolución de identidad, invitaciones, BFF y release gates.
2. **Auth compartido sin proyecto adicional:** usar `rateware-prod`
   (`alqjqzqagdmcywpjtnnr`) para FCM y Rateware, configurar redirects/CORS,
   claves publicables y llaves asimétricas. Los datos operativos FCM permanecen
   en Neon/Prisma; sólo se comparte identidad y emisor JWT.
3. **Usuarios de prueba:** probar contraseña, Google, confirmación, recuperación,
   logout, tenant y rol con cuentas desechables; luego habilitar MFA y demostrar
   el recorrido requerido antes del corte productivo.
4. **Integraciones:** Rateware debe aceptar y verificar el mismo JWT Supabase en
   su receptor de RateBooks y broker Gmail antes de activar esas entregas.
5. **Corte autorizado:** respaldar Neon, aplicar la migración aditiva, importar o
   invitar usuarios, verificar el enlace por email y cambiar variables en una
   ventana con rollback. El proveedor anterior permanece disponible hasta cerrar
   la conciliación.
6. **Retiro posterior:** `20260830000200_finalize_supabase_identity` aborta si
   existe cualquier usuario sin `supabaseId`; sólo entonces vuelve el identificador
   obligatorio y elimina el índice y la columna heredados. Aplicarla a Neon y
   retirar variables remotas exige una ventana de cambio autorizada.

## Rollback

La migración de base es aditiva. Antes de retirar Kinde, el rollback consiste en
restaurar el release y variables anteriores; no se reasignan tenants ni roles.
Un conflicto de email o sujeto bloquea el acceso y requiere conciliación humana.
No hay reintentos automáticos de Gmail, Rateware ni otras acciones externas.

## Límite de costo

La organización `MARKSMAN XBF` fue verificada en plan Pro y `rateware-prod` ya
existe, por lo que este diseño no crea otro proyecto ni otro compute. Auth usa la
cuota MAU compartida del plan; un sobreconsumo puede facturarse. Google OAuth,
email/password y TOTP no requieren activar el add-on MFA Phone. MFA por teléfono,
SMS/WhatsApp y un proveedor SMTP productivo quedan fuera del alcance sin
autorización expresa. El SMTP incluido de Supabase sólo se considera para
desarrollo por sus restricciones.

## Estado externo

El 2026-08-30 se añadieron de forma aditiva al allowlist de Auth de
`rateware-prod` el callback productivo
`https://freight-cost-web.vercel.app/auth/callback` y el callback exacto del
preview vigente. Se conservaron el `Site URL` y las ocho rutas existentes de
Rateware. Email/password permanece habilitado con confirmación de correo.

Google OAuth quedó habilitado con un cliente web dedicado, `Rateware Supabase
Auth`, cuyo único redirect autorizado es
`https://alqjqzqagdmcywpjtnnr.supabase.co/auth/v1/callback`. La cuenta
`sales@heymarksman.com` quedó incluida como usuario de prueba mientras el
consentimiento de Google continúa en modo Testing. La prueba desde el preview
completó el retorno OAuth y vinculó la identidad `google` al usuario Supabase
existente, que conserva también su identidad `email`; no creó otro usuario.

Tampoco existe SMTP personalizado; no se activaron SMS, MFA Phone ni otro
servicio pagado. Los proyectos Vercel `freight-cost-api` y `freight-cost-web`
recibieron sólo en Preview la URL, referencia, audience y llave publicable
necesarias; Web también apunta al API preview. Las siete variables Kinde que
quedaban en `freight-cost-web` para `Preview (staging)` se retiraron después de
comprobar que no existe consumo en runtime. Producción y el proyecto API no se
modificaron; el código y los ejemplos de configuración ya no dependen de Kinde.

No se creó proyecto Supabase adicional, no se aplicó la migración a Neon, no se
importaron usuarios y no se desplegó producción. Los previews verificados son:

- API: `https://freight-cost-9agop9nax-elandopando8892s-projects.vercel.app`
- Web inicial: `https://freight-cost-750by6gk5-elandopando8892s-projects.vercel.app`
- Web MARKSMAN vigente: `https://freight-cost-qcpvt06i8-elandopando8892s-projects.vercel.app`

La comprobación externa dio HTTP 200 para `/login` y `/health`; el BFF Web
rechazó `/api/v1/auth/me` sin sesión con HTTP 401. Posteriormente, el botón
`Continuar con Google` completó el login autenticado en el preview y abrió la
torre de control con el usuario existente. La verificación administrativa
confirmó Google habilitado, client ID y secret configurados, y ambos callbacks
FCM todavía presentes en el allowlist.

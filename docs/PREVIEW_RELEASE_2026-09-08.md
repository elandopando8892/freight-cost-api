# Preview alineado y validación de lectura

## Entrega

Autorización puntual del usuario: frontend/API del mismo commit sólo en preview,
sin producción, migraciones, bases de datos ni cambios de Auth.
Se desplegó `7a3d92d872308826e94fd7ba916df31c722481a4`, rama
`codex/supabase-auth-slice`, desde el worktree verificado y limpio en D:.

- Web: https://freight-cost-7xpqa49bc-elandopando8892s-projects.vercel.app
- API: https://freight-cost-f9a008ivm-elandopando8892s-projects.vercel.app
- Ambos READY, target null (preview), alias vacío según Vercel.
- IDs y proyectos en `docs/evidence/preview-release-7a3d92d.json`.

## Procedencia y límites de despliegue

Se exportó el commit con `git archive`, no se subió el worktree con sus archivos
locales. SHA-256 del ZIP: `8D5E103C40D2BB43332F2C28FD1D17F8BAE008C2788FC4E8FACD653EE94EF856`.
El escaneo de secretos de los 423 archivos versionados pasó. La identidad Git
de los deployments corresponde a esa exportación, sin cambios de fuente.

La CLI usó `--target preview` y proyectos explícitos. En el build API se fijaron
`FCM_STAGING_MIGRATION_CONFIRMATION=DISABLED` y la rama no-staging. Log de Vercel:
16:34:05 UTC, generación de Prisma Client seguida de
`Production migrations skipped outside Vercel Production.` No se ejecutó migrate
ni seed. RELEASE_SHA del API se fijó al commit aprobado.

En el deployment web se fijó API_URL al nuevo API tanto en build como runtime.
Se reutilizaron URL y clave pública existentes del proyecto Supabase aprobado;
se verificó que la clave fuera pública. No se cambiaron variables compartidas,
usuarios, permisos, Site URL, allowlist, proveedor Auth ni dominios productivos.
No hubo push, envío de correos, publicación comercial ni consumo de IA de la app.

## Evidencia del 2026-09-08, desde 16:35 UTC

| Comprobación | Resultado y alcance |
|---|---|
| API /health | 200; release exacto 7a3d92d completo |
| API /ready | 200; database connected; sólo comprobación de disponibilidad |
| API /auth/me sin sesión | 401 |
| Web /login | 200, no-store |
| Web / sin sesión | 307 a login |
| Callback sin código | 307 a error de login en el mismo origen |
| BFF /api/v1/auth/me sin sesión | 401 |
| Google OAuth real | Cuenta existente ADMIN volvió al panel del nuevo origen sin code/error visible |
| Recarga real | Conservó sesión/organización/rol y cargó el panel |
| Historial y detalle | Lecturas exitosas de registros existentes; sin guardar ni confirmar |
| Revisar propuesta en DRAFT | Deshabilitado con motivo visible; no se confirmó la cotización |

Chrome: navegación mediante la extensión, con cuenta existente; no se creó cuenta
de prueba. La UI mostró el estado autenticado y los datos del panel tras recargar.
Los logs del nuevo API registraron /auth/me, /org, /quotes, /cost-bases y /market/fuel.
La navegación directa a /api/v1/health fue bloqueada por el cliente del navegador;
se conserva esa limitación, no se presenta como lectura visual exitosa. Vercel
registró esa ruta BFF con 200 y la llamada adicional /health en el API nuevo.
Esto, junto a la URL de upstream fijada, aporta evidencia de enrutamiento; no
se extrajeron cookies, códigos OAuth ni tokens del navegador.

La cuenta probada fue ADMIN: no convierte en PASS los casos OPERATOR/VIEWER.
No se probó renovación por expiración ni envío del formulario comercial completo.
La cotización examinada requiere confirmación humana; no se alteró para desbloquear
la prueba. AUTH-11 necesita una fuente sintética ya confirmada y autorizada.
No se repitió la validación responsive completa en este despliegue.

## Reproducir el gate de metadatos

```powershell
npm run verify:preview-revisions -- --evidence=docs/evidence/preview-release-7a3d92d.json --sha=7a3d92d872308826e94fd7ba916df31c722481a4
```

PASS de metadatos no sustituye las pruebas anteriores. La evidencia caduca después
de 24 horas: obtener nuevas lecturas de Vercel, no cambiar el timestamp del archivo.
El callback de esta URL funcionó realmente; no se afirma una nueva auditoría
completa de la allowlist compartida para todas las URLs posibles.

## Intentos fallidos conservados

- `--skip-domain` fue rechazado antes de crear el primer deployment porque sólo
  admite producción. Se retiró; no se cambió el target para eludir el rechazo.
- La lectura general de variables con decrypt devolvió valores cifrados y aviso
  de API obsoleta, no una prueba de sus valores efectivos. No se basó el enrutamiento
  en ese resultado: el deployment web recibió su upstream explícitamente.
- El bloqueo de navegación JSON del navegador está registrado arriba.

## Rollback y siguiente paso

Los previews previos se conservaron, sin alias productivos modificados. Si esta
revisión falla, dejar de usar las nuevas URLs y conservar los previews anteriores;
no migrar ni cambiar Auth para arreglarla. El frontend anterior conocido es
`dpl_Hc4UxVh7ijRva53vsNcTTLqKK9H1` y el API anterior
`dpl_G9jC2FdAUDWT91GbGza4JU3Aro3X`: son fallback histórico, no pareja alineada.
No se borró ningún deployment. Esta documentación se versiona después del release;
su commit no debe confundirse con el SHA desplegado.

Siguiente: prueba comercial completa con cotización sintética confirmada y roles
de prueba existentes; no crear registros ni cambiar permisos sin autorización.

Guía deploy-checklist aplicada: separación de preview/producción, control de build,
smoke y rollback. Ejecución en Codex sin delegación; modelo/selector efectivos no
verificados. Recomendación: GPT-5.6 Sol medio para despliegue y evidencia; alto para
validación de límites OAuth y sesión. No hay cambios visuales en esta entrega;
se conservan los wireframes versionados del recorrido comercial.

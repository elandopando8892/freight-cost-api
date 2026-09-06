# Freight Cost Model OAuth preview coverage audit — 2026-09-06

## Resultado y alcance

El riesgo existe, pero no se reprodujo un fallo de login. El corte Supabase vive
únicamente en previews manuales de la rama de trabajo; producción y el alias
estable de `staging` siguen desplegando Kinde desde Git. No se cambió Auth,
`Site URL`, Neon, usuarios, bases de datos, infraestructura ni producción.

## Identidad verificada

| Superficie | Evidencia verificada |
| --- | --- |
| Checkout | `D:\andre\worktrees\freight-cost-model\supabase-auth-migration-20260830` |
| Rama / HEAD | `codex/supabase-auth-slice` / `f6e0d645c9515736c81a1da25a4c496f7a81bafd` |
| Repositorio | `elandopando8892/freight-cost-api` |
| Vercel | `freight-cost-web`, project `prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV`, team `team_KUG1PtOwoJ16eUqxiOJ330Os`, root `apps/web` |
| Supabase | `rateware-prod`, ref `alqjqzqagdmcywpjtnnr`, `ACTIVE_HEALTHY` |
| Producción | `freight-cost-web.vercel.app`, Git `master` `5065f877...`, Kinde |
| Staging estable | `freight-cost-web-git-staging-elandopando8892s-projects.vercel.app`, Git `staging` `f6e0d645...`, Kinde |
| Previews Supabase | `freight-cost-750by6gk5-...` y `freight-cost-qcpvt06i8-...` |

`C:\Users\andre\.codex\AGENTS.md` no existía durante esta ejecución. Se
aplicaron las instrucciones globales `AGENTS.md` entregadas al agente y se leyó
el `apps/web/AGENTS.md` del checkout antes de revisar el frontend. La carpeta
`C:\Users\andre\Freight Cost Model` tampoco era un repositorio Git, por lo que
no se editó y todo el trabajo quedó en el worktree de D: indicado arriba.

## Hallazgo

`loginWithGoogle()` construye `redirectTo` como el origen actual más
`/auth/callback`. En un preview, `appOrigin()` toma `VERCEL_URL`, por lo que cada
deployment genera un callback distinto. El callback intercambia el código con
`exchangeCodeForSession`; `@supabase/ssr` conserva el verificador PKCE en cookies
del mismo origen y el proxy propaga cookies renovadas tanto al request como al
response después de `getClaims()`.

Al inicio de la auditoría, la allow-list de `rateware-prod` contenía producción
y sólo dos URLs exactas de previews. Una tercera URL recién generada no
coincidía. Como el
verificador PKCE pertenece al origen del preview, caer en el `Site URL`
compartido no constituye una cobertura válida del flujo.

## Solución mínima aplicada

Con autorización puntual del usuario, el 2026-09-06 a las 01:15 -06:00 se agregó
una sola entrada, sin quitar las exactas existentes:

```text
https://freight-cost-*-elandopando8892s-projects.vercel.app/auth/callback
```

El patrón fija HTTPS, el prefijo observado del proyecto, el equipo Vercel
verificado y la ruta exacta `/auth/callback`. No autoriza `*.vercel.app`, no usa
`/**` y no cambia `https://rates.heymarksman.com/` como `Site URL` compartido.

Recibo posterior: `uri_allow_list` pasó de 31 a 32 entradas; el patrón quedó una
sola vez; faltantes de la lista anterior: 0; `Site URL`, Google OAuth y rotación
de refresh tokens permanecieron sin cambios.

Alternativa posterior: cuando el corte Supabase llegue a una rama Git estable,
autorizar sólo su alias estable de revisión. Hoy no se recomienda usar el alias
de `staging` para esto porque ese deployment continúa en Kinde.

## Evidencia de prueba

- Producción y `staging`: respuesta anónima 200 y UI Kinde; no se intentó login.
- Preview `qcp...`: Google OAuth llegó al panel autenticado.
- Vercel registró `GET /auth/callback` con respuesta 307.
- La recarga conservó la sesión y permaneció en el panel.
- Rotación de refresh tokens: habilitada en Supabase; proxy SSR revisado contra
  la guía vigente y propaga cookies renovadas. No se esperó la expiración ni se
  extrajo/forzó un refresh token, así que la renovación real por expiración queda
  como prueba autenticada pendiente y no se declara aprobada.
- Pruebas focalizadas iniciales: 10/10; typecheck API y scan de secretos: PASS.
- Gate vivo posterior: el preview `qcp...` pasó por su URL exacta y una nueva
  URL candidata del proyecto/equipo pasó por el patrón limitado. No se creó un
  deployment nuevo porque la infraestructura quedó fuera del alcance.
- El primer prototipo del gate usó `await` de nivel superior y falló bajo el
  Node 20.14 disponible en el host; se encapsuló en `main()` y el ensayo vivo
  pasó. Una invocación de Vitest con rutas relativas al monorepo no encontró
  archivos desde el workspace API; la repetición con rutas del workspace pasó.

## Cierre reproducible del preview — 2026-09-06

- El worktree quedó consolidado en la rama `codex/supabase-auth-slice`, commit
  `b4bdd4dba227ab27c863e2b8dcf1cea049aa9a9e`.
- Vercel creó el deployment preview `dpl_Hc4UxVh7ijRva53vsNcTTLqKK9H1` en estado
  `READY`: `https://freight-cost-5mavzkc8d-elandopando8892s-projects.vercel.app`.
- El gate remoto de sólo lectura devolvió `PASS`: el callback de ese deployment
  está cubierto por el patrón limitado al proyecto/equipo; `rateware-prod`
  devolvió `ACTIVE_HEALTHY`; no cambió el `Site URL` ni se ejecutó otra mutación.
- Probes anónimos: `/login` 200, `/` 307 a login, callback sin código 307 a error
  no-cache y `/api/v1/auth/me` 401 JSON no-store.
- Prueba autenticada real del preview nuevo: Vercel registró `POST /login`,
  `GET /auth/callback` y `GET /`; el panel mostró la cuenta Supabase existente.
  Abrir nuevamente la raíz en el mismo origen conservó la sesión.
- El login móvil se revisó en un viewport real 390 x 844: `innerWidth=390` y
  `scrollWidth=375`, sin desbordamiento horizontal visible.
- Gate local completo: 51 archivos de prueba y 436 pruebas PASS, typecheck y
  build API/Web PASS, 37 migraciones verificadas estáticamente, y audit de
  dependencias de producción con 0 vulnerabilidades. Fastify quedó fijado en
  5.12.3 para retirar el advisory de la versión anterior.

### No-go de integración API

Actualización posterior: la ventana aditiva autorizada resolvió el error de
columna faltante; API y panel quedaron comprobados con la cuenta existente.
Véase `SUPABASE_ADDITIVE_WINDOW_2026-09-06.md` para censo, respaldo, invariantes,
rollback y límites de aceptación. El texto siguiente conserva el diagnóstico
previo a esa ventana.

El login Web, el intercambio de código y la persistencia de sesión sí están
probados. La integración BFF/API no: los logs del API preview muestran que la
consulta falla porque `User.supabaseId` todavía no existe en la base conectada,
y el API responde 401. Esto es evidencia esperada del gate de migración, no un
fallo de cobertura OAuth. No se aplicó ninguna migración, no se desplegó un API
nuevo y no se modificaron usuarios o datos.

La renovación real por expiración tampoco se fuerza ni se declara aprobada.
Permanece cubierta sólo por revisión de configuración/código hasta que exista
una ventana autenticada autorizada con el esquema aditivo aplicado.

## Gate de release

Después de crear cualquier preview Supabase y antes de abrir Google OAuth:

```powershell
$env:SUPABASE_ACCESS_TOKEN = [Environment]::GetEnvironmentVariable('SUPABASE_ACCESS_TOKEN','User')
npm run verify:oauth-preview -- --preview-url=https://freight-cost-<deployment>-elandopando8892s-projects.vercel.app
Remove-Item Env:SUPABASE_ACCESS_TOKEN
```

El comando verifica el vínculo local al project/team de Vercel, lee en vivo y
sin mutar la allow-list de `rateware-prod`, exige el callback de mismo origen y
bloquea una URL no cubierta. Nunca debe guardarse el PAT en Vercel ni en Git.

## Rollback

Si el patrón autorizado se revoca después, eliminar exclusivamente la entrada
exacta anterior de `uri_allow_list`; conservar el `Site URL` y las URLs de otras
aplicaciones. Los dos callbacks exactos existentes pueden mantenerse durante la
transición. Para revertir sólo los controles locales, retirar los archivos
`oauth-preview-coverage*`, este documento y el script `verify:oauth-preview` del
`package.json`; no hay datos que restaurar.

## Modelo y esfuerzo

| Actividad | Modelo | Esfuerzo |
| --- | --- | --- |
| Conciliación Git, Vercel y proveedores | Codex / GPT-5 | Alto |
| Revisión redirect, callback, PKCE y refresh | Codex / GPT-5 | Alto |
| Prueba autenticada del preview existente | Codex / GPT-5 | Medio |
| Gate, tests, evidencia y rollback | Codex / GPT-5 | Alto |
| Consolidación, CI y diagnóstico BFF | Codex / GPT-5 | Alto |
| QA visual 390 x 844 | Codex / GPT-5 | Medio |

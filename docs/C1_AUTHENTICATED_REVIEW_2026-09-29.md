# C1 — revisión autenticada del Preview

Fecha: 2026-09-29 UTC. Candidato Web `https://freight-cost-1lqzynk34-elandopando8892s-projects.vercel.app`, API `https://freight-cost-aujrrwwwe-elandopando8892s-projects.vercel.app`, SHA `b83f2e24e16e5d0b13d75643c8179498a738bbdf`. Fuente local al comenzar: rama `codex/cost-tires-release-s14`, HEAD documental `8319855e5a1203bfaa7ad64c8ebf50e7651136e9`, worktree limpio en D:.

## Resultado observado

Se abrió `/login` sin sesión en el origen nuevo, se pulsó «Continuar con Google», se eligió cada cuenta existente en el selector de Google y se observó el retorno al panel del mismo origen. Entre identidades se cerró sesión desde la aplicación. No se copiaron cookies, códigos ni tokens.

| Cuenta existente | Rol observado | Google → panel del Preview | Recarga autenticada | Comprobación funcional |
| --- | --- | --- | --- | --- |
| jgonzalez@xbfreight.com | VIEWER | PASS | PASS, `/settings` | `/quote` muestra «SOLO LECTURA», sin formulario de cálculo; controles de cambio de rol deshabilitados |
| andresmclovin@gmail.com | OPERATOR | PASS | PASS, `/` | `/quote` muestra formulario de ruta/equipo y alerta de falta de base gobernada |
| sales@heymarksman.com | ADMIN | PASS | PASS, `/` | Panel e historial resumido accesibles; sesión final conservada en el Preview nuevo |

Las tres identidades pertenecen a HeyMarksman. La configuración observada tiene sales como ADMIN y andresmclovin como OPERATOR; no se cambiaron roles para hacer coincidir supuestos históricos. Google mostró el retorno solicitado a `/auth/callback` del Preview nuevo y el callback del proyecto Supabase verificado. El retorno autenticado respalda funcionalmente el intercambio: el código desplegado en `apps/web/app/auth/callback/route.ts` sólo redirige al destino tras `exchangeCodeForSession` sin error. No se capturó el intercambio HTTP ni sus secretos.

La lectura del equipo, las cotizaciones históricas resumidas y el formulario confirma lectura autenticada a través de la aplicación, adicional al smoke anónimo del corte anterior. No se pulsó Calcular, Guardar, Publicar, Enviar ni editar permisos. La base XBF-XB-PILOT v1 continúa requiriendo perfil de aplicabilidad; no se cambió su estado ni sus 210 parámetros.

## Límites y trabajo pendiente

- A1: Google, retorno, identidad y recarga **PASS para tres roles**. Renovación tras expiración **PENDIENTE**; recargar inmediatamente no la demuestra. No se alteraron relojes, cookies ni duración de sesiones para simularla.
- A2 UI: restricción VIEWER y acceso al formulario OPERATOR **PASS**. Las denegaciones HTTP remotas 403 en rutas de cálculo y 404 uniforme por ID ajeno/inexistente siguen pendientes. Una navegación directa al BFF con un ID sintético inexistente fue bloqueada por el navegador con `ERR_BLOCKED_BY_CLIENT`; no hubo respuesta API verificable y no se contabiliza como prueba de permisos. No se intentó evadir ese bloqueo.
- A2 tenant: las tres cuentas observadas comparten HeyMarksman; no acreditan aislamiento entre organizaciones. No se usó la cuenta adicional de carriers para crear un usuario o tenant.
- A3: **BLOQUEADO por perfil económico ausente**. El siguiente trabajo de producto es preparar el perfil y la evidencia de la base operativa, manteniendo la activación como decisión separada; el login ya no es el bloqueo para consultar el candidato.

No hubo cambios de código funcional, infraestructura, Auth ni datos de negocio. No se repitieron suites locales porque este corte añadió evidencia de navegador y documentación, no implementación. Modelo recomendado: GPT-6 Astra, esfuerzo alto para identidad/permisos; GPT-6 Sol, esfuerzo medio para el registro documental. No se afirma un selector de modelo distinto del configurado por el usuario.

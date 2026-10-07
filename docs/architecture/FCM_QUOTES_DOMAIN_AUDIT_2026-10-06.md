# Dominio FCM · quotes.heymarksman.com

## Decisión de producto y evidencia actual

Observación humana6oct2026: `quotes.heymarksman.com` debería ser la URL de FCM en Vercel. Se registra como dominio canónico **deseado**; no autorización implícita de DNS, asignación productiva, promoción, Auth compartido o contratación. `rates.heymarksman.com` pertenece al recorrido Rateware observado y no debe convertirse por defecto en el retorno de FCM.

Auditoría read-only14:43–14:49 Ciudad de México, misma rama codex/cost-tires-release-s14/HEAD4f5fc2de0c3d178dace917231e1092040dec21fd en checkout D:. Skills Vercel CLI y Supabase separan target, DNS, dominio, origen de aplicación y retornos; comparación antes de cambios: asignar dominio al deploy actual es rápido pero conserva Kinde; cambiar SiteURL compartido puede afectar otras apps; preparar/promover candidato FCM con Supabase y asignación puntual del dominio es el camino recomendado, bajo gates/autoridad de release existentes. Sin otra migración de Auth propuesta ni reimplementación del proveedor.

| Capa | Evidencia verificada | Alcance |
|---|---|---|
| Link local `.vercel/project.json` | prj_mw1xLIqutlRSIG2F2BryfPqDvN2L, freight-cost-api, team_KUG1PtOwoJ16eUqxiOJ330Os | El link raíz es API, no WEB. CLI project inspect confirmó apps/api. No se relinkó. |
| WEB Vercel | freight-cost-web / prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV / mismo equipo / root apps/web | CLI project inspect explícito confirmó target; luego API GET porque CLI no mostraba campos de asignación/Git requeridos. |
| Dominios WEB | Únicamente freight-cost-web.vercel.app, verified:true, sin redirect/branch override | GET project/domains; quotes **no está asignado a este proyecto**. No se afirma disponibilidad absoluta en toda cuenta ajena. |
| Dominio padre | heymarksman.com encontrado bajo el equipo; registrar externo, NS ns12/ns13.wixdns.net | CLI domains inspect quotes devolvió propietario/config del padre, no vinculación de quotes al WEB. No cambiar nameservers globales. |
| DNS quotes | A76.76.21.21, CNAME ENODATA | Resolución nativa; apunta a dirección Vercel, pero DNS no asigna por sí solo un proyecto/deployment. |
| Alias/deployment quotes | CLI inspect no encontró deployment en el equipo; fetch HTTPS TypeError y web open inaccesible | No prueba HTTP404, TLS correcto, login o aceptación pública. No hay site funcional quotes confirmado. |
| Producción WEB | dpl_CXv4JSVEwZKefByqWZRqbUWYyiKK / freight-cost-a0ebp2kw8-elandopando8892s-projects.vercel.app | Target production obtenido de metadata Vercel, no del HEAD local o preview reciente. |
| Proveniencia producción | GitHub elandopando8892/freight-cost-api, master, SHA3414f95f5ec377d077b5f0b876a993b63c581cb0 | El código productivo no es el árbol local con cambios pendientes. |
| Auth publicado | GET freight-cost-web.vercel.app/login200; texto Kinde y hrefs /api/auth/login? /api/auth/register? | Git show del SHA productivo/login/page.tsx importa LoginLink/RegisterLink de @kinde-oss. Los archivos Supabase actions.ts/site-url.ts no existen en ese SHA. **Producción sigue sirviendo el frontend Kinde**; no se inició login productivo ni se probó su sesión. |
| Origen público configurado | Metadata WEB production no contiene NEXT_PUBLIC_SITE_URL | Lectura filtrada en memoria, sin decrypt/env pull/secretos impresos. No defecto automáticamente atribuible a una versión que todavía usa Kinde. |

La afirmación histórica «ya usamos sólo Supabase» describe el objetivo/recorrido local y previews trabajados, **no debe sobreponerse a esta evidencia de producción**. No se migra nada por esta auditoría; tampoco se reactiva Kinde ni se declara que una sesión productiva funcione por renderizar un formulario.

Contraste adicional del mismo SHA productivo: `apps/web/app/api/auth/[kindeAuth]/route.ts` importa handleAuth de @kinde-oss/kinde-auth-nextjs/server y exporta GET=handleAuth(). Confirma el handler al que apuntan los links publicados; no se ejecutó un login/registro/logout productivo. Checkpoint14:51CDMX: branch/HEAD intactos, diff-check de estado sin errores (avisoLF→CRLF), sólo listenerlocal3001/PID39904, no3002. No promoción/alias/DNS/Auth externos ejecutados.

## Cambio mínimo recomendado, aún no ejecutado

1. Seleccionar un candidato/release FCM ya implementado con Supabase y comprobar su frontend/API/proveniencia y gates B4. La asignación de dominio por sí sola publicaría el target antiguo, no los avances locales/untracked. No promover un árbol incompleto para resolver un nombre de host.
2. Con autorización productiva puntual, asociar `quotes.heymarksman.com` al **WEB verificado**, no al link API raíz. Revisar la recomendación DNS específica de Vercel antes de tocar A/CNAME; el A actual puede bastar. No cambiar NS de heymarksman.com ni otras apps.
3. Configurar en ese WEB `NEXT_PUBLIC_SITE_URL=https://quotes.heymarksman.com` para producción; previews conservan su origen y desarrollo localhost3001. No desplegar automáticamente por esta propuesta.
4. Verificar/agregar sólo el retorno exacto `https://quotes.heymarksman.com/auth/callback` en Supabase rateware-prod con permiso Auth puntual; mantener el SiteURL compartido y retornos de otras apps. El [redirectTo debe corresponder a una URL permitida](https://supabase.com/docs/guides/auth/redirect-urls). No autorizar todo *.vercel.app ni sustituir /auth/callback por la raíz. No se inspeccionó la allowlist viva en este corte, por lo que no se afirma que ese retorno falte actualmente.
5. Comprobar DNS/TLS, callback en el mismo origen, intercambio PKCE, sesión/recarga/renovación y permisos contra el candidato autorizado. Configuración cubierta, endpoint200 y prueba autenticada son evidencias diferentes.

El callback de Google hacia Supabase y la credencial Google no deben cambiar automáticamente por un nuevo dominio de aplicación. Cualquier necesidad adicional se verifica antes de ampliar el alcance.

## Local solicitado y límites

El usuario autorizó reinicio del frontend únicamente, otros20min. Supervisor temporal execsession48756/NextPID19684, inicio2026-10-06T20:44:03.243Z, cierre automático21:04:03.243Z (**15:04:03 Ciudad de México**). Login local HTTP200; API aislada a loopback puerto1, sin credenciales DB/secret/IA ni rol QA activado. Configuración Supabase pública existente sólo memoria. Sin código persistido, implementación nueva, suite/build o SQL en este corte.

La selección automatizada de la pestaña local fue **rechazada por la política de seguridad del navegador**. Se detuvo esa vía; no reintento por ID, CDP, otro navegador automatizado ni superficie alternativa. El acceso manual humano al frontend disponible es el handoff seguro. No login local ni sesión renovada confirmados; QA anterior permanece cerrado/consumido.

Modelo recomendado/solicitado GPT-6.1 Sol/alto, efectivos/cuota/consumo/cargos desconocidos; Codex único, Claude anterior1/1 cerrado, sin nueva llamada/modelo/IA de negocio. Ventana de investigación local20min ligada al frontend, un arranque, consultas read-only finitas/sin cambios de trust/permisos o infraestructura. Skills usadas determinaron qué verificar y evitaron confundir DNS con alias o cambiar SiteURL compartido.

Rollback de este corte: retirar sólo este informe/entrada de estado si se solicita; detener sólo el frontend propio por stdin stop o temporizador. No DNS/alias/env/Auth remotos que revertir. Cambios ajenos y todos los recibos anteriores preservados; una limpieza documental no cambia autoridad ni reabre QA.

## Continuación local · regresión del candidato, 6 oct 2026

Solicitud humana «continu»: preparación local, sin promoción ni cambios remotos. Rama/HEAD anteriores revalidados; árbol inicial392 entradas sin consolidar. No hay AGENTS en la raíz física; instrucciones humanas/central vigentes y AGENTS Web leídos. Responsable Codex único. GPT-6.1 Sol/alto recomendado y elección histórica, modelo/esfuerzo efectivos/cuota/cargos desconocidos; presupuesto de este corte20min, cero llamadas Claude o IA del producto, una corrección de compatibilidad de tests y una de tipos, ninguna repetición de login/SQL ni reactivación de ventanas cerradas.

### Benchmark proporcional y elección

Se reutiliza la auditoría anterior y el código local: appOrigin ya prioriza VERCEL_URL en preview y NEXT_PUBLIC_SITE_URL en producción; la acción Google usa /auth/callback y el handler intercambia el código antes del retorno seguro. La [documentación vigente de redirects](https://supabase.com/docs/guides/auth/redirect-urls) confirma coincidencia de redirectTo con allowlist y recomienda ruta exacta productiva. El [flujo SSR/PKCE](https://supabase.com/docs/guides/auth/server-side/advanced-guide) requiere almacenamiento/intercambio de sesión, no sólo URL correcta. Changelog consultado por HTTP tras rechazo del tipo markdown por web: cambio Auth self-hosted API_EXTERNAL_URL no aplica a este proyecto hospedado; cambios de base no requieren aquí migración. Guías instaladas Next16.3.3 de variables y Route Handlers leídas completas: NEXT_PUBLIC_* se incorpora al build; no basta modificar variables después de construir un candidato.

| Alternativa | Resultado/costo/mantenimiento | Elección |
|---|---|---|
| Asignar quotes al target actual | Rápido pero publica el frontend Kinde anterior, sin promover los cambios locales | Rechazada para este corte |
| Cambiar provider/callback o crear otra infraestructura | Amplía riesgo/costo y duplica Auth ya implementado | Rechazada |
| Reutilizar appOrigin/acción/callback y añadir regresión de dominio | Sin dependencia nueva, sin coste recurrente añadido, prueba local dentro de npm test existente | Aplicada sólo en tests |

### Entrega y evidencia

Nuevo `apps/web/tests/oauth-domain-release.test.tsx`: **11 casos sintéticos**, incluidos Google redirectTo exacto quotes/auth/callback, preview con origen propio aunque exista configuración productiva, localhost, producción sin URL/HTTP rechazados, intercambio único, rechazo de retorno a Rateware, error/sin código y fallo de inicio OAuth. SDK y redirect de Next simulados: cero solicitudes a Google/Supabase. Correcciones del propio test: matcher no disponible en Vitest1.6.1 reemplazado por once+with; afterEach devuelve void para tipos. No cambios en implementación Auth ni UI; no procede wireframe nuevo, se conserva diseño existente.

- Verificación final después de la última modificación: **26/26 Web** en cuatro archivos, **12/12 API** de preflight/cobertura OAuth, typecheck Web y lint del nuevo archivo sin errores. No suite/build global/CI remota nuevos.
- SHA256 del nuevo test: `332A69720A3A136D951D255FA842F5B1D780FA28C42FA7884BDC3D069AE59FC8`.
- Pack económico SHA256 `D1235CA788312CB5F0DD7B82A8354809AB93756E57BF5385483E52F0026D7DF0` conservado; no importes, fórmulas ni adopción modificados.
- `npm run preflight:release -- --json` ejecutado en API21:02:20Z: **ready:false,9BLOCK/1WARN**, exit1 esperado. Árbol393 archivos, RELEASE_SHA sin configurar y entorno local sin configuración de despliegue; artefactos de10migraciones presentes. Esto **no inspecciona las variables remotas ni prueba que falten en producción**. Presencia de migraciones no acredita su aplicación; no se aplicó ninguna.
- El gate genérico del piloto incluye AI_KEY/Rateware: su falta local **no autoriza instalar claves/activar IA ni amplía el MVP a esas operaciones**. Ninguna credencial/env persistida o descifrada; no se relajó el gate para aparentar release listo.

### Cola finita hacia el objetivo

1. **Sesión y aceptación SaaS auténticas pendientes**: confirmar cuenta/origen local con intervención humana donde la política del navegador lo exige; luego autorizar sólo el recorrido QA de guardado/recarga/replay ya delimitado. Este corte no reabre la ventana family consumida ni resetea contadores.
2. **Candidato reproducible pendiente**: seleccionar/consolidar únicamente cambios FCM revisados, preservando los393 archivos sin reset/stage masivo; fijar un SHA y verificar par frontend/API, pruebas y configuración del candidato. HEAD por sí solo no representa los avances sin consolidar. No commit ni deploy en este corte.
3. **Activación puntual pendiente**: con gates anteriores cerrados, autorización productiva para candidato, dominio WEB y callback exacto, manteniendo SiteURL Rateware y otras aplicaciones. DNS/TLS/login/recarga/refresh/permisos deben validarse realmente antes de cerrar B4.

Las pruebas nuevas quedan incluidas automáticamente por el glob existente de npm test/verify:ci; no crean otra pipeline ni sustituyen la aceptación humana/real. B4 y Sprint2 completo siguen abiertos. No browser workaround ni otro intento SQL.

Rollback local: retirar exclusivamente el nuevo test y esta sección/entrada de estado si se solicita, sin modificar archivos ajenos. No cambios remotos que revertir. Typecheck actualizó su caché tsbuildinfo generado; no es un artefacto de release ni cambio de código. Frontend Auth-only conserva su cierre automático original15:04:03CDMX; «continu» no amplía esa ventana.

Checkpoint15:04:44CDMX: supervisor frontend48756 terminóexit0/stopstatus0 (workerexit1 por cierre propio esperado); sin listeners3001/3002. Branch/HEAD intactos. Whitespacecheck de test/informe/estado sin errores, sólo avisosLF→CRLF. No frontend activo para solicitar un login ahora; nuevo arranque requiere ventana puntual, no extensión implícita.

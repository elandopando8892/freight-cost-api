# Equipo: error de carga y recuperación

Base `6850771`, rama `codex/supabase-auth-slice`, checkout en D: verificado limpio.
Incremento local posterior al preview `725646a` y al cambio autorizado de rol.

Configuración conserva el fallo de listado como null en vez de convertirlo en [].
Ese estado muestra Equipo sin contador, aviso legible y botón Reintentar. El botón
realiza GET /settings para solicitar los datos de nuevo; no reenvía cambios de rol.
La tabla y sus confirmaciones no se montan mientras no hay listado disponible.
Una respuesta vacía válida muestra Equipo (0) y una explicación en la tabla.

Wireframes desktop y móvil: `design/team-loading-wireframe.html`, reutilizando la
paleta y estructura MARKSMAN existentes. Aviso accesible con role=alert y control
de al menos 44 px. No cambia autorizaciones ni endpoint API.

Por indicación del usuario se evitó añadir suites de pruebas; la verificación se
limita a lint y build: ambos PASS. El build incluye TypeScript y emitió aviso de
deprecación del Node local para Supabase. No se presenta como prueba autenticada ni visual ejecutada.
Pendiente: publicar este incremento en una próxima pareja preview alineada.
Rollback: revertir el commit de este incremento; no hay cambios de datos asociados.

Preferencia del usuario: Astra con esfuerzo alto para desarrollo autónomo; el
selector no fue verificado por herramientas. No se solicitaron pruebas manuales.
El rol VIEWER real de jgonzalez permanece configurado; la aceptación de su sesión
sigue pendiente y no impide continuar mejoras de UI independientes.

## Publicado en preview · 2026-09-08

El pendiente de publicación anterior queda resuelto. Web/API READY y sin aliases
en el SHA `f739e83a7911cb153f8dbb54a7c18eb49900a2b8`; metadatos verificados con
get_deployment, evidencia en `evidence/preview-release-f739e83.json`.
Fuente exportada sólo desde archivos versionados con checkout limpio; gitDirty=0
en la evidencia describe esa verificación local (el proveedor no devolvió ese campo).
ZIP SHA-256: `6D819632EF7E23524CDFA30E8937AF5DA432CAFAA286587B8793064E2B2E351E`.

- Web: https://freight-cost-o1urzjuyh-elandopando8892s-projects.vercel.app
- API: https://freight-cost-7qbldfn0v-elandopando8892s-projects.vercel.app

API_URL se fijó a esta API en build y runtime del nuevo deployment web.
Build API confirmó migraciones omitidas; builds cloud completados. Health/ready
a las 18:01:31/32 UTC reportaron el SHA esperado y database connected.
Google login real ADMIN y Configuración mostraron tres integrantes, con sales
ADMIN y jgonzalez VIEWER. No se modificaron roles ni datos en este incremento.
No se provocó un fallo de la API: la rama de error publicada no fue ejercitada
en navegador. Las pruebas autenticadas VIEWER y renovación continúan pendientes.

Rollback de código: volver a la pareja `725646a` registrada en
`TEAM_ROSTER_COMPATIBILITY_2026-09-08.md`; no revierte ni necesita tocar permisos.
La guía deploy-checklist se reutilizó para comprobar mismo SHA, preview y rollback.
El install cloud conservó el aviso previo de 13 vulnerabilidades (1 crítica);
el despliegue no significa que estén resueltas. No se promovió producción.

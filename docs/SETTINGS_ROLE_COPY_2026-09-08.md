# Configuración: rol vigente e invitación histórica

Base `e93690a`, rama `codex/supabase-auth-slice`, checkout D: limpio al inicio.
Problema observado en preview: jgonzalez figuraba correctamente como Consulta en
Equipo y como ADMIN en una invitación aceptada; el encabezado genérico Rol no
explicaba que la invitación conserva la decisión original.

Se etiqueta Rol de invitación, se explica dónde consultar permisos actuales y se
traducen roles/estados también en la vista previa de invitación. Nombre de la
organización, Guardar, Guardando y confirmación se muestran en español.
Formulario apilado en móvil; tabla de invitaciones desplazable y enfocable con
teclado, con encabezados preservados. Wireframe desktop/móvil:
`design/team-invitations-wireframe.html`.

No cambia el rol inicial del formulario, los permisos, los contratos de API ni
los registros de invitación. No se enviaron ni revocaron invitaciones.
Modelo solicitado por el usuario: Astra, esfuerzo alto; selector no verificado.
Verificación limitada a lint y compilación, sin nuevas suites de pruebas.
Rollback: revertir sólo este incremento; no requiere revertir datos.

## Entrega en preview

Web/API READY, sin aliases, mismo SHA `f2870fe1235b50a7dce13acff6e75a9cef953914`.
Metadatos: `evidence/preview-release-f2870fe.json`; gitDirty=0 representa el checkout
limpio exportado, no un campo recibido del proveedor. ZIP SHA-256:
`68FE03520A7B7A98745173B59AC29C7DA810EDF8AFEBDED787EF6F10E83C6425`.

- Web: https://freight-cost-m49tmfg65-elandopando8892s-projects.vercel.app/settings
- API: https://freight-cost-j8v6aqzk7-elandopando8892s-projects.vercel.app

API_URL fijada a esta API en build/runtime web. Build API omitió migraciones;
health/ready 18:09:15 UTC reportaron el SHA y base conectada. Lint local y build
local/cloud PASS (sin suites nuevas). El ajuste final min-w-0 está incluido en el
build cloud. Persisten los avisos conocidos de dependencias del install.

Acceso Google completado; sesión ADMIN, tres miembros y nuevos textos observados
en Configuración: Nombre de la organización, Guardar, Rol de invitación, Aceptada
y explicación histórica. Jgonzalez conserva Consulta en Equipo. Sin guardar,
invitar, revocar o cambiar roles durante esta revisión. El rol inicial del
formulario permanece Administrador, igual que antes.

Verificación autenticada de escritorio, no validación visual móvil ni sesión
VIEWER. Rollback disponible: pareja previa `f739e83` documentada en
`TEAM_LOADING_UX_2026-09-08.md`. Documentación posterior no está en el SHA desplegado.
Se reutilizó deploy-checklist para alcance preview, mismo SHA y rollback.

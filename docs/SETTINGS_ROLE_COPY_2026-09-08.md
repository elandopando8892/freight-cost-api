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

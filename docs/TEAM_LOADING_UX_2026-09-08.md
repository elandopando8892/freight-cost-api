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

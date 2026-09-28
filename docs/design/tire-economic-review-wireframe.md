# COST_TIRES — revisión con un responsable

Decisión del usuario, 2026-09-28: no existe segundo revisor. Se añade la modalidad explícita ECONOMIC_ONLY, sin asignar una persona a dos funciones. Los expedientes históricos DUAL_REVIEW conservan su modalidad.

```text
CALIBRACIÓN DE LLANTAS                         Rol OPERATOR
[Expedientes / buscar] | Propuesta / fuente / historial
                      |
                      | Borrador reproducible          ✓
                      | Revisión económica             ○
                      | Modalidad: revisión individual
                      | No requiere segundo revisor.
                      |
                      | ASIGNAR REVISIÓN ECONÓMICA
                      | Responsable [ADMIN existente ▾]
                      | Fundamento  [                 ]
                      | [Enviar a revisión económica]
```

```text
RESPONSABLE ECONÓMICO (ADMIN asignado)
Propuesta + fuente + impacto + bitácora
Fundamento [________________________________________]
[Aprobar revisión económica] [Devolver con observaciones]

DESPUÉS DE APROBAR
[Revisión económica completa]                           ✓
Un responsable distinto del autor; sin dictamen independiente.
Bitácora: borrador → asignación → decisión económica.
Publicación de parámetros: acción separada, no disponible aquí.
```

En móvil se apilan inventario, detalle y acciones; botones de al menos 44 px. El formulario pertenece al expediente y se reinicia al cambiar de expediente o revisión. VIEWER y ADMIN no asignado conservan sólo consulta. Conflictos de fuente/revisión permiten actualizar; los retries del mismo comando conservan requestId. La pantalla no ofrece publicar ni activar bases.

La evidencia económica completa se conserva en el expediente y su bitácora; no se crea un paquete que afirme revisión independiente. No se inventan expedientes, precios ni parámetros para llenar la pantalla.

# Base sin perfil: wireframe de corrección

Conservar componentes y marca MARKSMAN. Desktop: formulario izquierdo y contexto derecho. Móvil: formulario, aviso y contexto apilados.

```text
Desktop
[Ruta / Equipo / Revisar     ] [Contexto: Revisar]
[Base XBF-XB-PILOT v1        ] [Base y versión   ]
[Revisión requerida: falta perfil]
[Sólo consulta histórica; preparar versión aprobada]
[Revisar cobertura de bases →]

Móvil
[Ruta / Equipo / Revisar]
[Base seleccionada]
[Revisión requerida]
[Falta perfil; sólo consulta histórica]
[Revisar cobertura de bases →]
[Contexto: Revisar]
```

El API confirmó el motivo en el aviso de error tras reintentar: Legacy cost-base versions without an applicability profile are restricted to historical snapshot replay. La UI anunciaba la base como gobernada por contar 210 parámetros publicados, omitiendo el perfil obligatorio.

La corrección local exige presencia del perfil para la etiqueta y selección automática de base gobernada. La ausencia muestra el motivo y no promete un cálculo permitido. No modifica ni publica datos de la base. Un perfil presente no garantiza por sí solo compatibilidad con todo equipo: el API mantiene esa validación.

Pendiente: comprobación visual en preview y mensaje persistente del error del API. El cálculo completo sigue pendiente de una versión con perfil aprobado. No se sortea el bloqueo usando una base sin linaje.

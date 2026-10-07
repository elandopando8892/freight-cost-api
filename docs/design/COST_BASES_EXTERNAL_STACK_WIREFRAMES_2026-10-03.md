# Gestión de bases: wireframes para el benchmark tecnológico

3 octubre 2026. Esquemas UI/UX, no capturas ni cambios implementados. Complementan el [benchmark externo](../research/EXTERNAL_STACK_CRUD_BENCHMARK_2026-10-03.md). La comparación de librerías debe usar el mismo recorrido y diseño para no atribuir a un framework una mejora visual independiente.

## Objetivo y dos composiciones

Llegar desde una base a sus supuestos, evidencia y estado de versión sin perder contexto. Conservar el shell y la separación Flota propia / Tarifas de socios. No añadir un menú ERP ni otro login.

A, recomendada: lista y detalle contextual, aprovechando el tablero existente.

```text
BASES DE COSTO                   Flota propia | Tarifas de socios
Cobertura por ámbito                         [Nueva base · ADMIN]

Buscar / ámbito             BASE SELECCIONADA · segmento / moneda
┌──────────────────────┐   ┌──────────────────────────────────────┐
│ Base A · activa      │   │ Versión vN · Borrador / Publicada    │
│ Base B · preparación │   │ Perfil operativo · alcance          │
│ Base C · archivada   │   │ [Revisar supuestos] [Ver evidencia] │
└──────────────────────┘   │ Faltantes y motivo · no sólo color   │
                           │ [Editar datos] [Nueva versión]      │
                           └──────────────────────────────────────┘

SUPUESTOS · base A / versión vN         [Volver a la base]
Sección / búsqueda     Campo | Unidad | Valor | Aplicabilidad
                      Fuente y estado de evidencia, si verificados
                      Falta evidencia ≠ valor cero
Resumen: cambios pendientes / advertencias / bloqueos
[Guardar borrador · ADMIN]                 [Revisar impacto]
```

Los vínculos a evidencia son propuestos: verificar su contrato/contexto antes de enlazar. El inspector B2 actual no equivale a un expediente completo de cada parámetro ni admite cualquier setId. No fabricar relaciones canónicas para llenar esta vista.

B: lista → ficha → editor en pantallas separadas con breadcrumb persistente. Es viable para formularios extensos, pero añade navegación; no elegirla por defecto sólo porque un scaffold CRUD la genere. Mantener el editor de secciones existente cuando su volumen lo requiera, con retorno explícito a la versión de origen.

En móvil A usa selector de base y bloques verticales; detalle antes de acciones. No comprimir 210 parámetros en una tabla horizontal. Cada fila se convierte en campo etiquetado con unidad y estado textual. La lista puede recuperarse con «Volver a bases» conservando selección; cambios sin guardar requieren decisión explícita antes de salir.

## Transiciones y confirmaciones

```text
Elegir versión
  ├─ Borrador + ADMIN → editar → guardar → respuesta del servidor
  │                                        ├─ error: conservar captura
  │                                        └─ éxito: filas + advertencias
  │                                                   ↓
  │                                        revisar impacto/faltantes
  │                                                   ↓
  │                                        confirmar publicación
  │                                                   ↓
  │                                        publicada (sólo lectura)
  │                                                   ↓
  │                                        activar (acción distinta)
  └─ Publicada / Archivada / sin permiso → revisar, sin edición
```

Publicar conserva nota y acknowledgement de impacto exigidos por API. El servidor vuelve a comprobar reglas; una tarjeta «listo» no autoriza una transición. Activar no modifica retrospectivamente snapshots de cotizaciones. Archivar tiene restricciones de uso y estado: no presentarlo como eliminar.

No implementar una operación de publicación sólo para probar la maqueta. El modelo de permisos de escritura sigue siendo ADMIN; otros roles tienen exclusivamente las capacidades de lectura que realmente permita su endpoint.

## Estados necesarios en el handoff

| Estado | Mensaje y comportamiento |
| --- | --- |
| Carga | Estado textual y controles ocupados; no mostrar valores anteriores de otra versión |
| Vacío | «No hay bases para este filtro»; crear sólo si el rol lo permite |
| Borrador modificado | Contador de cambios; guardar/deshacer captura explícitos; no guardar automáticamente |
| Guardado confirmado con warning | Reconciliar valores de servidor; advertencia visible, no convertirla en error ni ocultarla |
| 422 | Explicar campo/aplicabilidad rechazados; conservar captura y no presentar guardado exitoso |
| 409 | Explicar cambio de estado/revisión; obtener estado vigente sin sobrescribir captura silenciosamente |
| 403 | Lectura o acción denegada; nunca elevar permisos desde UI |
| 401 / cambio de cuenta | Limpiar datos de la cuenta anterior; recuperar sesión por el flujo existente |
| Timeout de comando | Resultado incierto; comprobar estado antes de permitir un nuevo envío, sin retry automático |
| Publicada / archivada | Motivo de sólo lectura; «Nueva versión» únicamente donde esté permitido |
| Evidencia pendiente | Mantener faltante explícito; no generar importes o aprobar fuente por apariencia |

## Branding y accesibilidad

Reutilizar [MARKSMAN_UI](MARKSMAN_UI.md) y componentes actuales: Charcoal `#1e1e1e`, Electric Orange `#ea5e27`, Industrial Grey `#484848`, Cloud Grey `#efefef`; logo oficial sin deformación. No se reinterpretó el manual ni se verificó visualmente una nueva pantalla en este corte. Tipografías oficiales y fallbacks conservan lo ya documentado; no afirmar disponibilidad de archivos tipográficos no incluidos.

Acción primaria pequeña: texto Charcoal sobre naranja, no blanco pequeño. Permisos/estado con etiqueta textual e icono cuando ayude, nunca sólo color. Controles táctiles mínimo 44 px; labels persistentes, unidad junto al campo, foco visible y teclado. Confirmaciones devuelven foco al disparador; alertas y estado de guardado deben ser anunciables. El error se vincula al campo y mantiene lo introducido.

## Cierre y límites

Este handoff especifica flujo, alternativas, móvil, permisos y errores; no es validación visual ni aceptación humana. Para cerrar una implementación: revisar desktop/móvil, guardar y recargar con datos de prueba, denegaciones y versión inmutable, cambio de cuenta, respuesta tardía y doble envío. Declarar por separado fixture, persistencia real y operación productiva.

La skill design:design-handoff orientó la definición de estados y accesibilidad. Responsable Codex/OpenAI `gpt-6.1-sol`, alto solicitado; runtime exacto desconocido. Parte del mismo corte documental de 60 minutos, sin otra inferencia, proveedor o instalación.

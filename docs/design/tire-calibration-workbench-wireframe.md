# COST_TIRES · workbench autenticado

Sprint 12 · 2026-09-27

## Objetivo de usuario

Dar a un usuario autenticado un punto de entrada real —no un harness— para consultar el estado de los expedientes de calibración de llantas, comprobar la fuente vigente de una cohorte y entender por qué un expediente todavía no puede alimentar CFU/CVU ni cotizaciones.

La primera entrega es intencionalmente de sólo lectura. No publica parámetros, no activa bases y no escribe en cotizaciones.

## Wireframe de escritorio

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ COST_TIRES / Calibración de llantas                         [Sólo consulta] │
│ Evidencia y revisión antes de incorporar parámetros al motor.               │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Flota propia] [Tarifas de socios] [Calibración de llantas]                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ SEGURIDAD                                                                   │
│ Este workbench no publica parámetros ni habilita cotizaciones.              │
│                                              0 listos para publicar          │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ EXPEDIENTES                   │ DETALLE DEL EXPEDIENTE                       │
│ Buscar por propuesta...       │ PROP-... · v1                [EN REVISIÓN]   │
│                               │ Revisión 3 · actualizado ...                 │
│ ┌───────────────────────────┐ │                                              │
│ │ PROP-001 · v1            │ │ Trazabilidad                                 │
│ │ Pendiente económico      │ │ Propuesta       abc123...                    │
│ │ revisión 2               │ │ Fuente          def456...                    │
│ └───────────────────────────┘ │ Snapshot        ...                          │
│ ┌───────────────────────────┐ │                                              │
│ │ PROP-002 · v2            │ │ Cadena de revisión                           │
│ │ Revisado                 │ │ 1 Borrador  2 Económica  3 Independiente     │
│ └───────────────────────────┘ │                                              │
│                               │ Bitácora                                     │
│                               │ #1 Borrador abierto · actor · fecha          │
│                               │ #2 Revisores asignados · actor · fecha       │
├───────────────────────────────┴──────────────────────────────────────────────┤
│ VERIFICAR FUENTE VIGENTE                                                    │
│ Cohorte [________________________________] [Verificar fuente]                │
│ Snapshot v4 · revisión 4 · huella def456...                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ SIGUIENTE PUERTA                                                            │
│ Fuente vigente → propuesta reproducible → doble aprobación → autorización   │
│ separada de publicación.                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Wireframe móvil

```text
┌──────────────────────────┐
│ Calibración de llantas   │
│ [Sólo consulta]          │
├──────────────────────────┤
│ Aviso de seguridad       │
├──────────────────────────┤
│ Expedientes              │
│ [Buscar...]              │
│ [PROP-001 · estado]      │
│ [PROP-002 · estado]      │
├──────────────────────────┤
│ Detalle seleccionado     │
│ Trazabilidad             │
│ Cadena de revisión       │
│ Bitácora                 │
├──────────────────────────┤
│ Verificar fuente         │
│ [cohorte] [Verificar]    │
├──────────────────────────┤
│ Siguiente puerta         │
└──────────────────────────┘
```

## Estados obligatorios

- Cargando detalle: conserva el contexto del expediente seleccionado.
- Inventario vacío: explica que no existen expedientes y evita inventar importes.
- Fuente no encontrada: distingue ausencia de evidencia de un error de sesión.
- Error de API: mantiene visible el inventario y permite reintentar.
- Expediente revisado: muestra el paquete de evidencia, pero conserva `quoteEligible = false`.

## Decisiones de seguridad

- Todas las lecturas conservan el mismo origen mediante `/api/v1/*`.
- El layout autenticado resuelve la sesión; no se guardan tokens en el cliente.
- La pantalla no presenta acciones de captura, aprobación ni publicación en este sprint.
- Una etiqueta visible recuerda que un paquete revisado sigue sin autorización de publicación.

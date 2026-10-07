# Panel · datos no disponibles

Estado sobre el layout y componentes MARKSMAN existentes; sin cambio de dirección visual ni navegación. Reutilizar cards, tipografía, colores y alertas. La fixture SSR sólo usa Arial de respaldo para evitar descargas de fuentes: no afirmar paridad del shell autenticado.

```text
TORRE DE CONTROL
Operación de costos                      [Quote Desk] [Nueva cotización]
┌ Activación operativa no disponible ──────────────────────────────────┐
│ Servicio de datos no disponible; no equivale a fallo de Google.       │
│ [Reintentar consulta] — sólo petición manual, sin reintento automático│
└─────────────────────────────────────────────────────────────────────┘
┌ Bases operativas ───┐ ┌ Diesel EE. UU. ────┐ ┌ Cotizaciones ─────────┐
│ Consulta no         │ │ Consulta no       │ │ Consulta no           │
│ disponible          │ │ disponible        │ │ disponible            │
│ Alerta + reintentar │ │ Alerta + reintentar│ │ Alerta + reintentar   │
└─────────────────────┘ └───────────────────┘ └───────────────────────┘
Actividad reciente
No se pudo consultar la actividad reciente. [Alerta + reintentar]
```

No reemplazar una consulta fallida por cero registros, onboarding inicial o tablas vacías. HTTP 401 conserva aviso de sesión expirada e inicio de sesión; HTTP 403 conserva falta de permiso. Fallo de conexión/502/503/504 ofrece reintento, no login. Éxito en otras secciones conserva sus datos. En móvil las cards mantienen la composición responsiva existente; este corte verifica SSR desktop/recarga, no certifica otra matriz visual completa.

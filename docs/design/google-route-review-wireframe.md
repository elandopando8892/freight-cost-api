# B2 · Revisión transitoria del tramo US

## Objetivo y benchmark previo (2026-09-30)

Operador/admin de FCM inspecciona el candidato Laredo → Fort Smith del corredor Mexico, DF → Fort Smith vía Nuevo Laredo/Laredo, antes de aprobar domicilios, trazado de camión y peajes. No optimización ni adopción de inputs. Google aporta cartografía; FCM conserva su metodología económica diferencial. Consulta sólo por acción explícita.

| Capacidad / alternativa | Decisión | Ajuste, mantenimiento, costo y límites |
| --- | --- | --- |
| Google Maps JS + cliente Routes existente | Adaptar (recomendado) | GeoJSON nativo, controles y atribución probados; sin SDK adicional. Clave web restringida distinta de clave servidor; mapa y consulta son eventos diferentes, saldo de cuenta desconocido. Dependencia y términos Google. |
| React wrapper de Google Maps | Diferir | Facilita componentes complejos, pero añade dependencia/licencia/versionado sin mejorar este único mapa; el loader oficial basta. |
| SVG/Leaflet sobre mapa alternativo | Rechazar para respuesta Google | No cumple mostrar Routes sobre Google Maps; reconstruir interacción no mejora el flujo. Un esquema sin geometría sí sirve para QA, no como ruta real. |

Fuentes vigentes: [loader oficial](https://developers.google.com/maps/documentation/javascript/load-maps-js-api), [Data GeoJSON](https://developers.google.com/maps/documentation/javascript/reference/data), [políticas Routes](https://developers.google.com/maps/documentation/routes/policies), [seguridad de claves](https://developers.google.com/maps/api-security-best-practices), [precio por evento](https://developers.google.com/maps/billing-and-pricing/pricing). Reutilización interna: cliente `google-basic-route.client.ts`, auth/requireRole, BFF no-store, Button/Input/tokens globals.css, harness Vite sin env/red. Historial revisado: 3910b60/e1d89ea, formularios y API stateless. Sin tecnología/infra nueva.

## Propuesta visual y wireframes

Se mantiene la dirección MARKSMAN elegida; no otra paleta. Dos estructuras evaluadas: formulario+mapa simultáneos (adoptada; contexto visible) y wizard formulario→mapa (diferida; escondería advertencias). Manual oficial inspeccionado: páginas 12/13, paleta #1e1e1e/#ea5e27/#484848/#efefef y familias New Black Typeface/Lenia Mono, con fallbacks existentes mientras faltan archivos licenciados. Reusar shell/logo oficial, no redibujarlo.

Desktop ≥ 768 px, max-w-6xl, padding 16/32 px, separación 24 px:

```text
← Volver al benchmark
REVISIÓN DE RUTA · SOLO CANDIDATO
Tramo US: Laredo → Fort Smith
Corredor completo: Mexico, DF → Nuevo Laredo/Laredo → Fort Smith
──────────────────────────────────────────────────────────────────
Origen US [Laredo, TX, USA]     │ MAPA GOOGLE (no cargado al entrar)
Destino [Fort Smith, AR 72916] │ Estado vacío / cargando / error
Intermedios (uno por línea)    │ Trazado transitorio al consultar
[ ] Entiendo mapa+consulta     │ Distancia · tiempo sin tráfico
[Consultar candidato]         │ Atribución Google Maps
[Borrar vista]                │ Peaje comercial: pendiente
Estado / error de permiso     │ Camión/domicilios: sin validar
──────────────────────────────────────────────────────────────────
No guarda ni alimenta CFU/CVU. Sin puente aprobado, ciclo o peaje.
```

Móvil < 768 px:

```text
← Volver
Tramo US (corredor completo debajo)
Origen · Destino · Intermedios
Consentimiento de consumo
[Consultar candidato]
[Borrar vista]
Estado / error
Mapa, mínimo 320 px de alto
Distancia y tiempo sin tráfico
Pendientes para cotizar
```

## Contrato e interacción

- Página `/scenarios/benchmark/route-review`, enlace en benchmark existente; sin menú global nuevo.
- GET config no consulta proveedor. POST mismo BFF, sesión verificada y org válida ADMIN/OPERATOR. No org/importe del navegador. Sólo desarrollo local explícito: prod bloqueada aunque haya clave. Registro API por módulo, no otro backend.
- Activación local `FCM_GOOGLE_ROUTE_REVIEW_ENABLED=true` y `GOOGLE_ROUTES_API_KEY` sólo proceso servidor. Nunca cargar automáticamente archivo privado al iniciar app ni enviar su clave al web.
- Una tentativa Routes por instancia API en el modo original, compartida entre organizaciones y consumida antes de await. La recuperación local autorizada añade presupuesto persistente de una carga Maps y una tentativa Routes, con marcadores exclusivos privados/ignorados en D: y vencimiento original; recarga o nuevo proceso no reponen cupos. No es cap mensual de la cuenta ni defensa frente a manipulación local. Sin retry/caché/ruta guardada; producción sigue deshabilitada hasta definir gobierno de cuenta.
- Mapas sólo carga tras consentimiento y pulsación, primero verificar config no billable, después SDK/mapa, después POST. En modo local con presupuesto persistente, config anuncia también cupo Maps y se reserva vía POST map-reservation antes del SDK; reserva ligada a cuenta/org, endpoints nominales Laredo→Fort Smith sin intermedios. Cupo cero impide SDK/proveedor y reinicio no recupera reserva. `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` únicamente clave web restringida; no fallback a servidor. SDK se carga una vez por documento; no mapa por render. No confirmar automáticamente clave/habilitación/costos.
- Inputs max 240 caracteres; intermedios max 10, sin repetidos. Labels visibles, controles 44 px, foco visible. Móvil apilado, sin truncar alertas ni importes; texto largo ajustable.
- Vacío: explica que no hay consulta automática. Loading bloquea doble clic de forma síncrona; error proveedor/cupo no reintenta. Borrar/cambiar inputs borra observaciones y geometría sin restaurar tentativa. Respuesta tardía no se muestra tras limpiar/salir.
- Sesión vencida, acceso denegado, navegación/unmount/pagehide limpian datos y mapa. No storage, React Query ni exportación. No persistir contenido Google en evidencia visual; screenshot QA únicamente synthetic/empty.
- Roles/cuenta se revalidan en cada solicitud BFF/API; pruebas mock no certifican login real/cambio de cuenta. No UI de aprobación ni handoff económico. Lat/lng sólo mapas, resultado limpio en memoria.
- Distancia/tiempo son observaciones, nunca cargados/vacíos o cycleDays. Toll null no significa cero. No proveedor de peaje nuevo.
- Sin animaciones, `aria-live` estado y `role=alert` errores. Orden foco: volver, origen, destino, intermedios, consentimiento, consultar, borrar, mapa; controles oficiales Google accesibles.

## Criterios de cierre de este corte

Wireframe + pantalla navegable + backend/consumidor conectados y probados sin red real; perfil fijo, permisos, presupuesto, duplicación, errores, limpieza y recarga simulados; typechecks y revisión visual desktop/móvil sin overflow. Integración real mapa+sesión pendiente de clave navegador/restricciones/habilitación y autorización de consumo; la prueba CLI anterior no la sustituye. No afirmar sprint económico completo.

Actualización de cierre local 2026-09-30: [sesión existente, mapa/candidato y límite real](../research/B2_LOCAL_RECOVERY_SCOPED_ROUTE_2026-09-30.md) comprobados con una carga Maps/una tentativa Routes; recarga sin contenido y bloqueo por presupuesto antes del proveedor. Wireframe y dirección gráfica conservados. No nueva certificación móvil, renovación por vencimiento, segundo tenant, truck restrictions o D2D completo; no cierre económico.

Modelo recomendado: GPT-6.1 Sol · alto (integración/seguridad); validación documental simple medio. Selector no cambiado, tokens/precio de modelo no medidos. Cero llamadas Google facturables en implementación/QA. Rollback: quitar sólo archivos de este corte y registros/enlaces añadidos, conservar cliente/evidencia/key previos y cambios ajenos.

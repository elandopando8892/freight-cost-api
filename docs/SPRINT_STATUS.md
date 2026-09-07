# Freight Cost Model · estado del MVP

Fecha de corte: 2026-09-07  
Checkout: `D:\\andre\\worktrees\\freight-cost-model\\supabase-auth-migration-20260830`  
Rama: `codex/supabase-auth-slice`  
HEAD: `e31c32d` antes de este incremento

## Lectura ejecutiva

El plan vigente del MVP comercial tiene cuatro sprints quincenales. Estamos cerrando
Sprint 1 y avanzando Sprint 2. El progreso ponderado es aproximadamente **28%**
(se comunica como 30% redondeado); esto es avance local/preview, no aceptación de
producción.

El documento `apps/web/UI_UX_CONVERGENCE.md` conserva el historial de siete
iteraciones visuales anteriores. No debe mezclarse con esta secuencia de MVP.

## Sprint 1 · navegación y wireframes — 80%

Completado:

- Wireframes desktop/mobile de tres direcciones en `docs/design/freight-cost-model-mvp-wireframes.html`.
- Dirección adoptada: Ruta directa.
- Navegación primaria reducida a Inicio, Cotizar, Mis cotizaciones y Mis costos.
- Herramientas secundarias agrupadas bajo “Más herramientas”.
- Acciones del wizard fijadas en móvil y contexto técnico priorizado en el flujo.

Pendiente de cierre:

- Capturas autenticadas en 1440 × 900, 1280 × 800 y 390 × 844.
- Comparación contra wireframe y aprobación visual humana.

## Sprint 2 · cotización end-to-end — 30%

Iniciado:

- Resultado de cotización muestra ruta, equipo, servicio, base y versión junto al precio.
- Guardado mantiene el linaje y ofrece abrir directamente el detalle o volver al historial.
- El detalle vuelve a `/quote?quoteId=...` y precarga ruta, operación, servicio, base y equipo;
  el original permanece intacto hasta que el usuario calcule y guarde una nueva cotización.
- Una reapertura fallida ya no cae silenciosamente en un formulario vacío: muestra el motivo,
  conserva el contexto de la acción y ofrece iniciar una cotización nueva.
- La carga de `/quote` conserva la composición final del flujo (encabezado, modos, formulario
  y revisión técnica) y expone un anuncio accesible mientras llegan los datos.
- Sin base gobernada, el aviso aparece al entrar a Cotizar y dirige a Mis costos; `VIEWER`
  recibe una vista de solo lectura que separa claramente lo permitido de lo que requiere operador.
- El filtro de alcance de estándares en Mis costos usa semántica de pestañas válida (`aria-selected`),
  foco único y navegación con flechas/Home/End para teclado y lectores de pantalla.
- La matriz de QA autenticada quedó preparada en `docs/QA_AUTHENTICATED_MVP_MATRIX.md`;
  permanece PENDIENTE hasta ejecutar con sesión Supabase real y evidencia redactada.
- En Mis costos, “Revisar bases” selecciona la primera base activa del alcance y lleva al
  panel de versiones; ya no obliga a encontrar manualmente la base después del salto.
- Al volver a cotizar, el nuevo resultado identifica la cotización de origen y propone una
  etiqueta `Reapertura · ...`; guardar crea un registro nuevo y conserva intacto el original.
- El resultado concentra precio sugerido, margen, utilidad y decisión en “Resumen para propuesta”,
  sin publicar tarifas ni enviar comunicaciones.
- La trazabilidad persistente `sourceQuoteId` quedó diseñada en `docs/architecture/ADR-002-quote-derivation-lineage.md`,
  pero permanece propuesta: no se modificó Prisma/Neon ni se aplicó migración.
- Se conserva el límite: guardar una cotización no publica tarifas ni envía comunicaciones.

Siguiente incremento:

- Validar el recorrido captura → cálculo → resultado → guardado → reapertura con datos sintéticos.
- Cubrir estados loading, error, sin base gobernada y VIEWER.
- Completar QA visual desktop/mobile del recorrido.

## Sprints siguientes

| Sprint | Objetivo | Gate de salida |
|---:|---|---|
| 3 | Mis costos, propuesta y duplicación/reapertura | Configurar costos y preparar una propuesta sin publicación automática |
| 4 | Piloto, permisos, estados y release readiness | Evidencia de sesión, aislamiento, errores y checklist humano de release |

## Modelo y esfuerzo

- GPT-5.6 Sol · esfuerzo medio: UX normal, documentación y pruebas focalizadas.
- GPT-5.6 Sol · esfuerzo alto: integración funcional, cotización y depuración.
- GPT-6 Astra · esfuerzo alto: sólo revisión crítica de Auth, seguridad, aislamiento o release.
- GPT-5.6 Luna · esfuerzo bajo: tareas mecánicas de bajo riesgo.

## Límites de esta fase

No se modifican producción, Auth compartido, Neon, usuarios, infraestructura,
permisos, migraciones destructivas ni comunicaciones externas. La validación
autenticada se reporta separada de la cobertura de configuración.

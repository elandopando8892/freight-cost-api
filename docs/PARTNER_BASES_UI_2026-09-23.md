# Editor de bases de socios — evidencia local

Worktree D:/andre/worktrees/freight-cost-model/supabase-auth-migration-20260830, rama codex/quote-integrity-sprint, HEAD base 419b10c202d396eed1801e5b3ce3e6393d4faf6e. Se preservaron cambios previos de API, esquema y evidencia. Sin commit, push o deploy en este incremento.

## Recorrido implementado

Bases de costo → Tarifas de socios → Nueva base → términos por ruta/equipo → Guardar borrador → Abrir base → Revisar/publicar (ADMIN) → abrir base actualizada → fecha/FX → calcular → guardar estimación → detalle con base, versión y huella de términos.

Revisar una base genera una nueva revisión desde la última; no sobreescribe términos. Se cargan versiones anteriores por páginas. OPERATOR calcula desde publicadas, VIEWER consulta. La API conserva la autoridad sobre permisos y organización; ocultar controles no sustituye esas comprobaciones.

Reuso: componentes de captura originales para tarifas MX/US y cargos; tokens actuales de marca; BFF autenticado existente, sin cambios de Auth. Las rutas V3 permanecen separadas. El contador de 210 parámetros no incluye tarifas de socios.

## Evidencia y límites

- Build Next 16.3.3 aprobado, ruta dinámica `/cost-bases/partners` incluida, comprobación TypeScript del build aprobada.
- 18 pruebas focalizadas iniciales aprobadas (editor, captura original e historial). Suite web final: **35/35 aprobadas**, incluyendo estado vacío, rechazo de editor a VIEWER y error de API no disfrazado de lista vacía. TypeScript independiente aprobado; lint focalizado final sin errores/advertencias tras retirar dos variables de omisión no utilizadas; diff-check sin errores.
- Browser: iframe CSS 390×844, documento clientWidth=371/scrollWidth=371; iframe 1280×800, clientWidth=1261/scrollWidth=1261. Sin overflow horizontal observado para editor vacío; móvil de base publicada también 371/371. Scrollbar explica diferencia con ancho CSS.
- Ejemplo sintético publicado: captura sólo fecha 2026-10-10, FX 17 con fuente/fecha; resultado 2,530 USD, procedencia versión 1. No se guardó ni publicó desde el browser: fixture bloquea esas operaciones con 403.
- Inspección visual parcial de captura y base publicada; tipografía del visor tiene fallback Arial. No prueba el shell autenticado, integración BFF/API/DB ni aceptación de marca completa.
- Estado VIEWER observado en navegador: campos de consulta, sin controles de calcular/publicar/revisar. Sigue siendo rol sintético del componente, no prueba de autorización real.
- Intento inicial de abrir visor falló porque el servidor estaba apagado; se inició el servidor loopback y se verificó después. Evaluación de contentDocument no disponible en navegador controlado; medición exitosa usando locator del documento dentro del iframe. Ninguno de esos intentos fallidos se cuenta como evidencia.
- Primer comando lint apuntó a node_modules no-hoisted incorrecto; se corrigió al ejecutable de la raíz. No es un defecto del código.

Visor reproducible: Node 24 `apps/web/tests/visual/server.mjs`; abrir `http://127.0.0.1:4317/tests/visual/viewports.html?page=partner-bases`. Sólo datos sintéticos, sin Auth/DB y sin passthrough de fetch. Servidor loopback dejado disponible para revisión; no es despliegue de aplicación.

## Pendiente antes de habilitar uso real

1. Retiro/archivo de bases y validación local del ciclo completo de vida.
2. Autorización puntual de migración nueva y preview frontend/API del mismo commit. No usar migrate deploy remoto: sigue pendiente la migración Auth excluida.
3. Recorrido autenticado con roles reales, recarga y persistencia, incluyendo respuesta perdida y versión activa concurrente.
4. Tarifas, fuentes y supuestos comerciales reales revisados. No se creó ni llenó una base de negocio en este incremento.

Rollback: retirar sólo los cambios UI/visor de este incremento y sus enlaces; conservar esquema, snapshots y cambios anteriores. No eliminar tablas ni datos. Sin cambios de producción, proveedores, Neon, usuarios ni consumo de IA del producto.

Modelo recomendado por actividad: Astra alto para integración; medio para pruebas y documentación. La guía de entrega de diseño determinó estados de error/reintento, tamaños de controles y relación entre wireframes e implementación.

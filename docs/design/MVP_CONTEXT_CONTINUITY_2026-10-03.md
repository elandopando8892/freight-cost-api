# MVP: continuidad de base y evidencia durante la captura

## Objetivo, benchmark y alcance

Evitar que revisar supuestos/evidencia obligue a buscar otra vez la base o perder inputs del caso. Reutilizar el [benchmark externo](../research/EXTERNAL_STACK_CRUD_BENCHMARK_2026-10-03.md), el tablero, editor e inspector existentes. Contratos y componentes inspeccionados de nuevo: el tablero inicializa la base predeterminada sin leer la URL; el editor no ofrece retorno contextual; B2 está en otra página.

Alternativas: A, selección en URL más inspector embebido (recomendada: sin dependencia ni almacenamiento nuevo); B, guardar automáticamente en navegador (rechazada por retención/mezcla entre cuentas); C, nuevo wizard con framework administrativo (rechazado para este alcance: reconstruye capacidades existentes). La revisión tecnológica sigue vigente para este cambio pequeño; no repetir una instalación o un A/B.

Arquitectura conservada: Next App Router, controles actuales y BFF. `?base=` selecciona exclusivamente entre bases ya autorizadas por API: no obtiene datos adicionales ni concede permisos. Supuestos retorna usando el costBaseId del set verificado, no un return URL proporcionado por el visitante. B2 conserva sus presets comparativos explícitos; no se vincula automáticamente a cualquier parámetro o ruta capturada.

## Wireframes e interacción

```text
BASES DE COSTO · /cost-bases?base=BASE_B
[Base A] [Base B seleccionada] [Base C]
BASE B · versiones → [Ver / Editar vN] → SUPUESTOS BASE B / vN
                                       [← Volver a esta base]
                                       conserva sólo selección;
                                       no guarda campos pendientes

CALCULADORA D2D
Ruta | Capital | Utilización · inputs actuales
[Consultar evidencia pública B2]   NO cambia de página
┌─ Evidencia pública B2 · sólo lectura ──────────────────┐
│ Perfil fijo México–Fort Smith; presets comparativos  │
│ No adopta valores ni enlaza la base capturada         │
│ Ciclo / capital → [Consultar expediente]              │
│ Lista / inspector existentes → fuentes y faltantes    │
└──────────────────────────────────────────────────────┘
[Ocultar evidencia B2]             inputs intactos
[Calcular escenarios] [Guardar expediente local] [Abrir]
Resultado y faltantes existentes; no cotización publicada
```

URL sin base: misma selección predeterminada anterior. Base ausente, vacía o parámetro duplicado: aviso «La base solicitada no está disponible» y acción para volver a las bases autorizadas; no mostrar otra base como si fuese la solicitada. Recarga/reapertura del enlace mantiene selección si todavía está autorizada. Archivar no elimina historial ni altera permisos.

Al abrir/cerrar B2 no consultar automáticamente API, modificar inputs ni calcular. Al cerrar, desmontar inspector para invalidar respuestas pendientes y borrar su lectura. Sesión vencida: limpiar inputs/resultados e inspector; no remontarlo hasta recuperar sesión por el flujo existente. No afirmar que su evidencia de octubre sea válida para septiembre ni aplicar comparadores al motor.

## Handoff visual

Conservar tokens de [MARKSMAN_UI](MARKSMAN_UI.md), logo y tipografía existentes; no nuevo shell. Contenedor del inspector `border/bg-card`, padding 4 y gap 3; botones mínimo 44px, texto que ajuste línea. Desktop usa inspector lista/detalle actual; bajo 700px se apila. Botón con `aria-expanded`/`aria-controls`; título embebido h2, no otro h1. Foco queda en el toggle al cerrar; abrir no roba foco. Alertas anunciables, labels persistentes y estados textuales. Sin animación nueva. URLs codificadas; no mostrar IDs ajenos en el aviso.

## Criterios de aceptación y presupuesto

- Seleccionar base, abrir su versión, volver y recargar selecciona la misma base autorizada. No hay escritura de negocio por navegar.
- Selección inválida/duplicada no revela datos ni sustituye silenciosamente otra base.
- Abrir, consultar y cerrar evidencia conserva los inputs/resultados; cambios comparativos no se adoptan en la captura.
- Lectura B2 mediante BFF existente; 401/403/409 y respuestas tardías mantienen controles existentes. Expiración limpia ambos componentes.
- Pruebas de componentes/contratos con fixtures y revisión visual desktop/móvil; declarar por separado Auth/DB real, que no se operan en este corte.

Responsable único Codex/OpenAI; `gpt-6.1-sol`, alto solicitado conservado. Claude considerado para UX y revisión; contexto vigente y pruebas locales suficientes, sin llamada auxiliar. Versión/esfuerzo efectivos, cuota y consumo atribuible no observables. Tope 60 minutos, dos correcciones diagnosticadas; cero instalaciones, inferencias auxiliares, llamadas pagadas y despliegues. User request: «bueeno pues continua con los desarrollos pendientes». No es autorización de producción ni nueva política de proveedor.

Estado de cierre: continuidad desarrollada y probada localmente. Skills architecture/design-handoff/testing-strategy orientaron opciones, estados y comprobaciones; no cambiaron permisos ni modelo. No desplegado ni utilizado con una sesión real.

## Entrega y evidencia del corte

Antes: volver a Bases de costo no identificaba la base original; B2 obligaba a abandonar la página de captura. Ahora: selección explícita en `?base=`, retorno desde el set a su base verificada e inspector existente embebido bajo demanda, con título h2 y desmontaje al cerrar. No vincula automáticamente B2 a la base ni rellena costos.

Archivos del producto: `cost-bases/cost-bases-board.tsx`, `assumptions/[setId]/page.tsx`, `scenarios/benchmark/benchmark-calculator.tsx`, `scenarios/benchmark/page.tsx`, `scenarios/benchmark/evidence/b2-evidence.tsx` y `lib/cost-base-navigation.ts`. Pruebas: `tests/cost-base-navigation.test.tsx`, tres casos añadidos al test de calculadora y cinco archivos nuevos `tests/visual/context-*`/`verify-context-continuity.mjs`. Se conservaron cambios previos, incluyendo toda la lógica de captura/archivo/cálculo ya existente. Mejora menor: tres enlaces del tablero declaran `nativeButton=false` para conservar semántica de anchor con Base UI.

- **48 tests PASS**: navegación 12, calculadora 16, inspector B2 12 y expediente local 8. Fixtures/mocks: no sesiones o escrituras reales. Última ejecución posterior a la última edición de componentes.
- **Typecheck web PASS**. Primer intento detectó un tipo demasiado amplio para el spy de History API del test; corregido sin tocar contratos de producto.
- **Lint focalizado: 0 errores, 2 advertencias previas** sobre el contador `generation.current` en cleanup de calculadora/inspector. Se conserva su invalidación intencional de respuestas tardías; no se afirma lint sin advertencias.
- **26 checks de navegador PASS**, dos tamaños 1440×1000 y 390×844, sin overflow horizontal, excepciones no capturadas ni intento HTTP externo. Comprueban selección, enlaces, falta de base, recuperación, captura intacta y lectura B2 denegada sin fallback. El primer script usó un nombre accesible incorrecto para un botón; se corrigió el selector y se repitió completo.
- Cuatro capturas finales inspeccionadas: [bases desktop](../../tmp/context-continuity-evidence/bases-1440.png), [bases móvil](../../tmp/context-continuity-evidence/bases-390.png), [evidencia desktop](../../tmp/context-continuity-evidence/inline-evidence-1440.png), [evidencia móvil](../../tmp/context-continuity-evidence/inline-evidence-390.png). [Resultados reproducibles](../../tmp/context-continuity-evidence/results.json). La fixture declara fallback Arial/Courier; no acredita tipografía licenciada, shell autenticado ni aceptación de marca completa.
- `git diff --check` focalizado sin errores. Ocho archivos pinneados del [benchmark previo](../research/EXTERNAL_STACK_CRUD_BENCHMARK_2026-10-03.md), excluyendo el tablero cambiado intencionalmente, mantienen SHA-256: lock, manifiestos web/API, rutas/servicios de bases, servicio de supuestos, motor y editor. No cambios de dependencias, API, fórmulas o datos.

La History API de Next se revisó en las guías incluidas en Next 16.3.3: permite `replaceState` sincronizado con `useSearchParams`; la página de bases ya es dinámica. **El navegador QA usa un shim de esa sincronización, no ejercita App Router real.** Los tests del editor comprueban render de la página con API simulada. No se afirma login OAuth, renovación, DB, aislamiento real entre cuentas, recarga autenticada o publicación. Tampoco se ejecutó build completo Next.

Reproducción: desde el checkout D, `node apps/web/tests/visual/context-continuity-server.mjs` (loopback 4330, sin cargar .env); luego `node apps/web/tests/visual/verify-context-continuity.mjs RUTA_AL_DIRECTORIO_NODE_MODULES_BUNDLED`. El test requiere Chrome headless y Playwright ya disponible; no instala nada. La fixture permite sólo formulario sintético y rechazo 403 de B2; cualquier otra solicitud falla. No es una página pública del producto ni un bypass de autenticación.

El servidor de QA propio se detuvo tras la verificación; no se alteraron procesos ajenos. Capturas y resultado permanecen en tmp. No se crearon preview Vercel, rama, PR ni commit. Documento abierto mediante Codex con resultado encolado, no confirmación de lectura humana.

Falta para el objetivo completo: recorrido autenticado en Next y evidencia/valores económicamente aplicables enlazados a parámetros versionados hasta CFU/CVU, sin considerar comparadores de octubre aprobados para septiembre. La proyección existente conserva `calibrated=false`, `quoteReady=false`, `adoptedValues=0` y outputs pendientes. No crear otra demo ni plataforma para ese siguiente trabajo. No se necesita una decisión humana adicional para este cierre local; escrituras o despliegues fuera del alcance siguen requiriendo autorización específica.

Rollback: revertir sólo los hunks de este corte y retirar sus archivos nuevos si no tienen cambios posteriores. Conservar toda edición previa de calculadora, páginas y tests. No resetear worktree ni sustituir archivos completos con HEAD.

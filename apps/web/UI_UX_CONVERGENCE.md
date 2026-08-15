# Freight Cost Model — contrato de convergencia UI/UX

Estado: Sprints 1–7 implementados localmente; cierre visual autenticado pendiente
Referencia visual: `freight-cost-model-wireframes.html`
Alcance: aplicación Web de Freight Cost Model; no altera contratos API ni datos.

## 1. Objetivo

La aplicación debe implementar el lenguaje visual y los flujos del wireframe de Freight Cost Model inspirado en Rateware CMS. No basta con que una función exista: en escritorio debe conservar el contexto de trabajo en una composición horizontal, compacta, tabular y orientada a decisiones.

Principios no negociables:

1. Desktop es un workspace horizontal; móvil se adapta sin definir la arquitectura principal.
2. La base y su versión permanecen visibles durante supuestos, producción, cálculo y publicación.
3. `CostBase`, `AssumptionSet`, `ProductionRoute`, `Quote` y `RateBook` son objetos distintos y se representan como tales.
4. Una operación crítica propone o prepara un borrador; el usuario confirma publicación, entrega o envío.
5. La UI prioriza información operativa y tablas compactas sobre mosaicos de tarjetas grandes.
6. Una pantalla no está terminada sin comparación visual en las resoluciones de referencia.

## 2. Resoluciones de referencia

| Clase | Viewport | Uso |
|---|---:|---|
| Desktop principal | 1440 × 900 | Referencia de fidelidad y densidad |
| Laptop | 1280 × 800 | Validación de espacio útil y scroll |
| Móvil | 390 × 844 | Adaptación, navegación y acciones críticas |

La captura de escritorio es la referencia primaria. Una implementación que convierta el workspace en una columna a 1280 o 1440 no cumple el contrato.

## 3. Geometría y sistema visual

| Elemento | Contrato del wireframe | Estado actual | Acción |
|---|---|---|---|
| Shell | Sidebar de 196 px + contenido flexible | Sidebar de 248 px y topbar de 64 px | Reducir sidebar y simplificar topbar |
| Contenido | Densidad alta, gaps de 8–14 px | Contenedores de hasta 6xl y gaps amplios | Crear escala compacta común |
| Encabezado | Título de 24 px, descripción breve, acciones a la derecha | Variantes distintas por ruta | Unificar con `WorkspaceHeader` |
| Navegación | Grupos compactos, activo con barra izquierda | Estructura aproximada, más ancha | Conservar grupos y ajustar proporciones |
| Cards | Superficies compactas para métricas/contexto | Tarjetas grandes como arquitectura principal | Usarlas como resumen, no como navegación |
| Tablas | Instrumento principal de revisión | Uso irregular y encabezados heterogéneos | Crear tabla compacta compartida |
| Color | Fondo gris frío, superficie blanca, índigo y estados discretos | Paleta cercana en OKLCH | Ajustar tokens contra la referencia |
| Responsive | Shell horizontal en desktop; navegación horizontal/colapsada en móvil | Sidebar desktop + menú móvil | Mantener, corrigiendo breakpoints y densidad |

## 4. Matriz pantalla → implementación → brecha

| Panel del wireframe | Ruta real | Componentes principales | Brecha crítica | Sprint |
|---|---|---|---|---:|
| Home / Costing workspace | `/` | `app/(app)/page.tsx`, `quotes-chart.tsx` | KPIs cercanos, pero jerarquía y densidad no son fieles | 1 |
| Configuración guiada | `/onboarding` | `carrier-onboarding-board.tsx` | Falta composición captura + resumen visible | 1 y 7 |
| Supuestos por base | `/assumptions`, `/assumptions/[setId]` | `assumptions-list.tsx`, `editor.tsx` | Falta workspace maestro-detalle, herencia y overrides simultáneos | 3 |
| Matriz de producción | `/production` | `production-routes-board.tsx`, `production-matrix.tsx` | Rutas gobernadas y tramos técnicos aparecen apilados y compiten | 4 |
| Nueva cotización | `/quote` | `quote-modes.tsx`, `quote-wizard.tsx`, `quote-form.tsx` | Flujo funcional, pero no conserva revisión lateral y base visible | 4 y 5 |
| Resultado técnico | `/quote`, `/quotes/[id]` | `quote-shared.tsx`, página de detalle | Falta convertir el resultado en superficie visual propia y accionable | 4 |
| Historial | `/quotes` | `quotes-list.tsx` | Es funcional; requiere densidad, lineage y filtros alineados | 5 |
| Quote Desk | `/quote-desk` | `quote-desk.tsx` | No estaba en el wireframe inicial; debe heredar el mismo lenguaje | 5 |
| Bases tarifarias | `/cost-bases` | `cost-bases-board.tsx` | Grid de tarjetas en vez de selector + versiones + gobierno | 2 |
| RateBook control | `/ratebooks`, `/ratebooks/regenerate` | `ratebooks-board.tsx`, `regeneration-board.tsx` | Funcionalidad fuerte, arquitectura visual todavía genérica | 6 |

## 5. Contrato por workspace

### 5.1 Bases tarifarias

Desktop:

```text
┌─ Bases (190–220 px) ─┬─ Resumen de base seleccionada ───────────┐
│ Intra-Mex             │ KPIs: rutas · vigente · borrador         │
│ Cross-border          ├──────────────────┬───────────────────────┤
│ Drayage               │ Versiones        │ Gobierno              │
│ Local                 │ v4 borrador      │ ámbito / equipo        │
│ Intra-US              │ v3 publicada     │ moneda / supuestos     │
└───────────────────────┴──────────────────┴───────────────────────┘
```

Criterios:

- Seleccionar una base actualiza el panel derecho sin perder contexto.
- Las métricas representan la base seleccionada, no agregados ambiguos.
- Crear, comparar, publicar, activar y archivar viven en el contexto de la versión.
- El impacto previo no reemplaza la página: aparece como panel o diálogo contextual.

### 5.2 Supuestos multibase

Desktop:

```text
┌─ Capas de supuestos ──┬─ Intra-Mex · v3 ────────────────────────┐
│ Empresa v4            │ Empresa v4 → Intra-Mex v3 → Ruta        │
│ Intra-Mex v3          ├─────────────────────────────────────────┤
│ Cross-border v4       │ Parámetro | Empresa | Override | Efectivo│
│ Drayage v2            │ ...                                     │
│ Local v2              │                                         │
│ Intra-US v2           │ Historial                  Nuevo borrador │
└───────────────────────┴─────────────────────────────────────────┘
```

Criterios:

- Modos visibles: valores efectivos, sólo diferencias y comparar bases.
- Cada fila distingue heredado, sobrescrito y excepción.
- La UI muestra cuántas rutas futuras utilizarán los valores.
- Publicar una versión no recalcula silenciosamente rutas o cotizaciones históricas.

### 5.3 Producción y cálculo

Desktop:

```text
┌─ Captura de ruta ───────────────┬─ Revisión técnica ─────────────┐
│ origen / destino                │ base sugerida y versión        │
│ operación / servicio / equipo   │ regla de selección             │
│ base tarifaria seleccionable    │ rendimiento / ciclo / fuentes  │
└─────────────────────────────────┴─────────────────────────────────┘
```

Criterios:

- Base y versión permanecen visibles antes y después de calcular.
- La sugerencia automática explica la regla; el usuario puede cambiarla.
- El resultado técnico ofrece `Guardar escenario` y `Guardar ruta en <base>`.
- La ruta guardada congela la base y versión utilizadas.

### 5.4 Quote Desk y RateBook

Criterios:

- Quote Desk usa la misma tabla, estados, toolbar y panel de revisión.
- Gmail permanece como acción revisable con preview; no existe envío automático.
- RateBook presenta selector, KPIs, versiones y gobierno de la base seleccionada.
- La regeneración sólo crea borradores y nunca publica ni entrega por sí misma.
- La entrega a Rateware muestra el identificador estable de base, versión, ruta y RateBook.

## 6. Componentes visuales compartidos

| Componente propuesto | Responsabilidad |
|---|---|
| `WorkspaceShell` | Geometría sidebar + contenido y breakpoints |
| `WorkspaceHeader` | Eyebrow, título, descripción, estado y acciones |
| `MasterDetailWorkspace` | Selector izquierdo y detalle derecho |
| `CompactMetricStrip` | KPIs contextuales en una fila |
| `ActionToolbar` | Segmentos, filtros, búsqueda y acciones |
| `OperationalTable` | Tabla compacta, sticky header y estados |
| `LifecycleBadge` | Borrador, publicada, activa y archivada |
| `LineageStrip` | Empresa → base → ruta/quote/ratebook |
| `ReviewPanel` | Resumen técnico y confirmación humana |
| `EmptyOperationalState` | Próximo paso accionable sin card decorativa |

Los nombres son contratos conceptuales; no obligan a crear abstracciones antes de que dos pantallas compartan el patrón.

## 7. Orden de implementación

| Sprint | Alcance | Avance acumulado |
|---:|---|---:|
| 0 | Contrato, inventario y baseline | 8% |
| 1 | Sistema visual y shell | 22% |
| 2 | Bases tarifarias | 38% |
| 3 | Supuestos multibase | 56% |
| 4 | Producción y resultado técnico | 72% |
| 5 | Cotización, Quote Desk e historial | 84% |
| 6 | RateBook y gobierno | 94% |
| 7 | Responsive, accesibilidad y QA visual | 100% |

## 8. Definition of Done visual

Cada pantalla debe entregar:

- [ ] Captura 1440 × 900.
- [ ] Captura 1280 × 800.
- [ ] Captura 390 × 844.
- [ ] Comparación contra el panel correspondiente del wireframe.
- [ ] Base y versión visibles cuando sean parte de la decisión.
- [ ] Estados vacío, loading, error y sin permisos.
- [ ] Navegación por teclado y nombres accesibles.
- [ ] Sin scroll horizontal de página en las tres resoluciones.
- [ ] Lint, typecheck y build local exitosos.
- [ ] Aprobación visual humana antes de considerar el sprint cerrado.

## 9. Baseline pendiente para cerrar Sprint 0

El inventario y el contrato están documentados. Faltan las capturas autenticadas de la UI actual en las tres resoluciones y su hoja de comparación visual. Este pendiente no autoriza un deploy ni cambios de datos; requiere una sesión local o de staging autenticada disponible para inspección.

## 10. Registro de convergencia

### Sprint 1 — implementación local

- Shell desktop ajustado a sidebar de 196 px y topbar de 48 px.
- Navegación compactada a 12 px, con separadores de grupo y barra activa izquierda.
- Organización y rol del usuario incorporados al contexto global con carga paralela y fallback seguro.
- Tokens light/dark alineados a la paleta del wireframe.
- Radio, padding, tipografía y borde de `Card` ajustados a la densidad de Rateware.
- Lint, typecheck y `diff --check` Web local exitosos; build diferido durante el desarrollo continuo.

Pendiente para cierre visual:

- Capturas autenticadas en 1440 × 900, 1280 × 800 y 390 × 844.
- Verificación de densidad real en Dashboard, Settings, Quote Desk y tablas extensas.
- Ajustes derivados de la comparación lado a lado.

### Sprint 2 — implementación local

- Sustituido el grid de bases independientes por un workspace maestro-detalle.
- Selector izquierdo persistente con alcance, versión vigente y número de rutas.
- La base predeterminada activa se selecciona primero; una base recién creada pasa a ser el contexto visible.
- Panel derecho con versión vigente, siguiente borrador, rutas y cotizaciones.
- Versiones concentradas en una lista compacta con impacto, edición, publicación, activación y archivo.
- Gobierno de la base visible junto a las versiones: ámbito, moneda, modelo, supuestos, rutas y estado.
- Se preservaron los diálogos de impacto y transición; ninguna acción se volvió automática.
- Lint, typecheck y build Web local exitosos.

Pendiente para cierre visual:

- Comparación autenticada contra el panel `Bases tarifarias` del wireframe.
- Validación de scroll y densidad con una organización que tenga múltiples bases y versiones.
- Ajustes responsive derivados de las capturas de referencia.

### Sprint 3 — implementación local avanzada

- Sustituido el mosaico de assumption sets por un workspace maestro-detalle agrupado por base de costo.
- Selector lateral con base, versión, conteo de parámetros, estado y selección para comparar.
- Toolbar con valores efectivos, sólo diferencias y comparación de dos versiones.
- Panel de contexto con estado, base vinculada, parámetros y actualización.
- Linaje limitado a evidencia persistida: versión fuente o catálogo canónico → base → rutas futuras.
- Activar una versión ahora actualiza visualmente sólo las versiones de la misma base; no apaga versiones activas de otras bases.
- Eliminación limitada visualmente a borradores no activos, en línea con el contrato del API.
- Editor de parámetros convertido de tarjetas repetitivas a tabla compacta por sección, con búsqueda, valor actual, recomendado, rango, estado y acción.
- Barra de cambios fija bajo el encabezado del shell, navegación lateral por sección y controles del editor traducidos a español.
- Encabezado del editor ahora muestra la base vinculada, alcance, versión, estado y conteos sin confundir la base con su versión de supuestos.
- La tabla conserva desplazamiento horizontal interno en pantallas estrechas para no romper el shell de la aplicación.
- Lint, typecheck y `diff --check` Web local exitosos; build diferido durante el desarrollo continuo.

Pendiente funcional para completar el diseño de herencia del wireframe:

- El modelo actual guarda 210 valores completos por versión; no persiste una `Base común de empresa` separada de la cual las bases hereden overrides.
- Hasta definir y migrar esa relación no se deben etiquetar parámetros como `Heredado` o `Sobrescribe`.
- Falta comparación visual autenticada en las tres resoluciones.

### Sprint 4 — implementación local

- Producción ahora separa `Rutas gobernadas` y `Tramos técnicos` en pestañas del mismo workspace; ya no compiten como secciones apiladas.
- Franja compacta de métricas con rutas en producción, borradores, pendientes de revisión y bases activas.
- La captura guiada de cotización adopta composición horizontal: pasos y formulario a la izquierda, contexto del cálculo persistente a la derecha.
- Base, versión activa, operación, ruta y equipo permanecen visibles durante la captura.
- El resultado técnico muestra etiquetas en español y la versión de negocio, no un fragmento del identificador interno.
- La ausencia de una base gobernada se comunica como propuesta sujeta a revisión; guardar no publica ninguna tarifa.
- Los modos guiado y rápido comparten el mismo panel persistente de base, versión, operación, ruta y equipo.
- Resultado técnico compactado como superficie de decisión: decisión, tarifa base, linaje, métricas, tramos y niveles comerciales.
- Estados vacío, calculando y error son explícitos; un error conserva la captura y permite reintentar.
- ESLint focal, typecheck Web y `diff --check` exitosos; build diferido durante el desarrollo continuo.

Pendiente para cierre visual de Sprint 4:

- Comparación visual autenticada en 1440 × 900, 1280 × 800 y 390 × 844.
- Ajustes de densidad o responsive derivados de esa comparación.

### Sprint 5 — implementación local

- Historial de cotizaciones traducido a español y compactado como tabla operativa horizontal.
- Búsqueda, filtros de operación/fecha, comparación de dos cotizaciones y exportación CSV conservan el linaje base/versión.
- Encabezados, estados vacíos, confirmación de eliminación y paginación alineados al lenguaje del producto.
- Quote Desk incorpora métricas por estado, búsqueda por folio/cliente/correo/ruta y filtro de ciclo de vida.
- Tabla de propuestas compactada sin alterar el preview sandbox ni el flujo `PREPARED` de Gmail/Rateware.
- La previsualización se convierte en panel lateral sticky en escritorio y conserva `sandbox=""`.
- Captura de propuesta con labels visibles, resumen persistente de cliente/vigencia/rutas y aviso de que guardar no envía correo.
- Detalle de cotización traducido y compactado con base, versión, política, decisión humana, evidencia y desglose técnico.
- Comparador traducido y enriquecido con base, versión y política de cada cotización antes de presentar diferencias.
- ESLint focal, typecheck Web y `diff --check` exitosos; build diferido durante el desarrollo continuo.

Pendiente para cierre visual de Sprint 5:

- Comparación visual autenticada en las tres resoluciones.
- Ajustes responsive derivados de la comparación y prueba humana del preview Gmail.

### Sprint 6 — implementación local

- RateBook adopta un workspace horizontal por base: selector lateral, contexto tarifario, métricas y versiones en una sola superficie.
- Las métricas representan únicamente la base seleccionada: RateBooks, publicados, borradores y rutas congeladas.
- La tabla de versiones se compactó y conserva vigencia, AssumptionSet, estado, rutas y acceso al detalle gobernado.
- Crear un RateBook exige base activa, versión publicada y fecha civil válida; el resultado permanece como borrador.
- El detalle mantiene separados los snapshots de rutas, la publicación y la trazabilidad operativa.
- Publicar continúa siendo una acción explícita de ADMIN; OPERATOR sólo puede solicitar aprobación.
- La entrega a Rateware continúa requiriendo una solicitud explícita y la vista de linaje permanece de sólo lectura.
- La regeneración conserva el contrato de crear una nueva versión en borrador; no publica ni entrega automáticamente.
- ESLint focal, typecheck Web y `diff --check` exitosos; build diferido durante el desarrollo continuo.

Pendiente para cierre visual de Sprint 6:

- Comparación autenticada contra el workspace RateBook del wireframe en 1440 × 900, 1280 × 800 y 390 × 844.
- Validación visual con múltiples bases, varias versiones y entregas históricas a Rateware.
- Ajustes responsive derivados de la comparación antes del cierre humano.

### Sprint 7 — implementación local

- Se añadió un salto de teclado al contenido principal y un destino de foco estable dentro del shell autenticado.
- Los workspaces convergidos usan ancho compacto común de 1440 px, padding móvil reducido y scroll horizontal interno en tablas extensas.
- Formularios, toolbars y acciones de Quote Desk y RateBook eliminan anchos rígidos en móvil y permiten reflujo sin romper la página.
- Las pestañas de Producción vinculan cada control con su panel mediante nombres e identificadores accesibles.
- Inputs críticos de publicación y aprobación de RateBook cuentan con nombres accesibles sin cambiar su contrato operativo.
- Se completó la localización al español de diálogos y mensajes residuales en Supuestos, Producción y detalle de Cotización.
- ESLint global del Web, typecheck Web y `diff --check` son el gate estático de esta fase; build permanece diferido por instrucción durante el desarrollo.

Pendiente para cierre humano al 100%:

- Ejecutar la comparación visual autenticada en 1440 × 900, 1280 × 800 y 390 × 844.
- Revisar estados con datos reales: múltiples bases, múltiples versiones, tablas largas, permisos y trazabilidad Rateware.
- Registrar aprobación visual humana; hasta entonces la implementación está completa localmente, pero no debe presentarse como QA visual cerrado.

### Hardening posterior a Sprint 7

- El estado global de carga replica el workspace horizontal con selector, métricas y tabla, en lugar de mostrar tarjetas genéricas.
- Se añadió una frontera de error común con reintento seguro, referencia técnica y regreso al inicio; comunica explícitamente que el fallo no modificó datos.
- Bases de costo y Supuestos consumen el rol autenticado en paralelo con sus datos.
- Sólo ADMIN puede crear, editar, publicar, activar o archivar bases y versiones, exactamente como lo exige el API.
- OPERATOR y VIEWER reciben modo consulta, mensajes vacíos coherentes y acceso de sólo lectura a parámetros y trazabilidad.
- Se completó la traducción de eliminación y confirmación en el detalle de cotización.
- Cotizar, Producción, Quote Desk y detalle de cotización consumen el rol autenticado en paralelo con sus datos.
- VIEWER conserva acceso a tablas, preview, historial y evidencia, pero no puede generar cálculos, modificar rutas, preparar Gmail/Rateware, confirmar ni eliminar.
- ADMIN y OPERATOR conservan las acciones operativas autorizadas por el API; el gobierno de bases y supuestos permanece exclusivo de ADMIN.
- Historial oculta creación y eliminación para VIEWER; Regeneración de RateBook permanece exclusiva de ADMIN.
- En organizaciones con un solo ADMIN, una solicitud propia puede decidirse únicamente con una segunda confirmación explícita ligada al identificador de la aprobación.
- La decisión de administrador único registra el token de confirmación en la evidencia; aprobar todavía no entrega a Rateware y la entrega exige una tercera acción deliberada.

### Sprint 8 — gobierno y entrega Gmail de Quote Desk

- Quote Desk implementa el ciclo real `Borrador -> En revisión -> Aprobada`; sólo ADMIN aprueba y VIEWER permanece en consulta.
- El panel lateral conserva estado comercial, preview sandbox, conexión Gmail, snapshots y evidencia sin perder el contexto horizontal.
- Un snapshot preparado no equivale a envío. La acción `Enviar por Gmail` sólo aparece para propuestas aprobadas y exige una confirmación individual.
- El transporte crea una clave de idempotencia estable, toma un claim exclusivo y conserva recibo, identificadores Gmail, actor y timestamps.
- Una respuesta ambigua queda `DELIVERY_UNKNOWN` y bloquea reintentos ciegos para evitar duplicados.
- El receptor `send_fcm_customer_quote_email` todavía debe implementarse y desplegarse en Rateware antes de habilitar producción.

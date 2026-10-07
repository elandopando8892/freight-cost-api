# Armado guiado de bases de costo · dirección aceptada

04/10/2026. Respuestas del usuario: **1A,2A,3A,4A,5A,6A**. Entrega de este corte: definición del producto, reglas de calibración/adopción y wireframe interactivo. La integración con API, persistencia real y publicación de bases sigue pendiente.

## Objetivo

Que un administrador construya una base comprensible para su segmento: elige referencias de mercado, reconoce las premisas que hacen aplicables esos valores, personaliza lo necesario y revisa una versión antes de activarla. Mantener visible la procedencia de cada decisión al editar, recargar o actualizar el benchmark.

El usuario ya definió el problema: inventario extenso y navegación difícil, con necesidad de justificar los parámetros que alimentan CFU/CVU. El wizard organiza conceptos económicos; no convierte los 210 campos en 210 pasos obligatorios.

## Decisiones aceptadas

| Decisión | Comportamiento |
| --- | --- |
|1A|Una card por concepto, agrupada por sección; inputs relacionados dentro de la card.|
|2A|Estándar MARKSMAN representa operación típica del segmento/perfil con fuentes comparables.|
|3A|Referencia provisional documentada cuando falte evidencia; el usuario puede aceptarla o sustituirla.|
|4A|Captura fuera del rango observado permitida con explicación y premisas por revisar.|
|5A|Guardar en borrador → revisar conjunto → activar versión por acción explícita.|
|6A|Benchmark nuevo propone cambios con impacto; el usuario elige qué incorporar.|

Respuestas definen el comportamiento del producto. No constituyen aceptación como costos reales de los proxies B2 ni activación de una base concreta.

## Benchmark previo y reutilización

Inspección actual: `CostBaseWizard` ya permite segmento, perfil, plantillas, captura manual y un consultor opcional; `cost-base-calibration.ts` registra revisión por siete grupos y una huella de valores/perfil; `cost-bases.service.ts` contiene versiones DRAFT/PUBLISHED, locks, revisión de impacto y publicación; supuestos admiten actualización por lotes. Se revisaron commits `0c7f3ac` (calibración versionada), `7efbc48` (segmento) y `9aa1720` (navegación por teclado).

Hay gaps concretos: el catálogo expone `low/high/defaultValue`, que son límites/recomendaciones FCM y no estadísticas observadas; las revisiones actuales son por grupo, sin decisión/procedencia por card; creación admite hasta 40 overrides, insuficiente como transporte de todo el wizard; el consultor existente puede llamar IA, innecesaria para las premisas repetibles de esta función. El recorrido nuevo reutiliza la creación de borrador y actualización posterior por lotes; no amplía ciegamente la entrada del consultor.

| Enfoque | Capacidad concreta y trade-off | Decisión |
| --- | --- | --- |
| Ampliar wizard FCM con RHF/Query/Base UI/Zod existentes | Conserva branding, catálogo, perfil, API y permisos; agrega presentación por concepto y trazabilidad de decisiones. Sin paquete/runtimes nuevos. | Recomendado. |
| [PatternFly Wizard](https://www.patternfly.org/components/wizard/design-guidelines/) | Referencia para navegación por pasos/subpasos, revisión final y accesibilidad; adoptar su librería requeriría integrar otra UI y retheming. | Tomar patrón, conservar componentes MARKSMAN. |
| [Refine useStepsForm](https://refine.dev/core/docs/ui-integrations/ant-design/hooks/use-steps-form/) | Aporta flujo de formulario por pasos y guardado; ejemplo verificado usa adapter Ant Design. Agregar Core+adapter/UI no resuelve nuestro benchmark ni metadata por concepto. | Sin ventaja demostrada para este corte. |

Fuentes oficiales consultadas 04/10. Complementa [benchmark tecnológico existente](../research/ECOSYSTEM_REUSE_BASELINE_2026-10-03.md). No nueva licencia/servicio activado; mantenimiento sigue en el stack existente. Diferencial específico: relacionar selección de nivel, premisas, evidencia y costo del modelo. Navegación/formulario/versionado son capacidades estándar reutilizables; no se declara innovador todo el stack.

## Flujo y wireframes

```text
Perfil operativo → Referencias → Cards por concepto → Revisión de versión → Activación
                                         ↑                 ↓
                                  volver y editar     resumen CFU/CVU
Benchmark actualizado → diferencias → selección de cambios → nuevo borrador → revisión
```

Primer perfil de referencia: D2D binacional, relevo propio MX/US, misma caja seca 53′. Conservar catálogo de segmentos actual y sus estados CONFIGURABLE/MODEL_PENDING; no ofrecer un estándar calibrado para segmentos aún sin soporte.

### A · Guiado por concepto (recomendado)

```text
MARKSMAN · Armar base                         Borrador · Guardar avance
Perfil › Referencias › Costos › Revisar › Activar
┌ Secciones ──────────┬ Concepto seleccionado ───────────────────────┐
│ Combustible   1/2   │ Mantenimiento US                 [CVU]       │
│ Activos       2/4   │ Equipo · país · moneda · periodo              │
│ Operadores    0/3   │ Mínimo     Promedio      Máximo               │
│ Empresa       1/3   │ [valor]    [valor]       [valor]              │
│ ...                 │ [Estándar MARKSMAN] [Captura manual]         │
│                     │ Mi selección: valor + unidad                 │
│                     │                                                │
│ Resumen de avances  │ Este nivel presupone...                      │
│ 1 provisional       │ [Me identifico] [En parte] [No me identifico]│
│ 2 propios           │ Mis condiciones / justificación editable    │
│                     │ Fuente y método · vigencia · límites         │
│                     │ [Ver inputs] [Ver evidencia]                 │
└─────────────────────┴──────────────────────────────────────────────┘
                     [Anterior] [Guardar card y continuar]
```

Una card enfocada reduce ruido; conserva lista de secciones y acceso a otras decisiones. En móvil la lista se contrae; concepto, selección, premisas y acciones se apilan. Las cifras y unidades permanecen juntas.

### B · Cards compactas por sección

```text
Costos › Combustible y mantenimiento          Resumen / pendientes
[Combustible · elección] [Mantenimiento · elección] [Llantas · elección]
                ↓ abrir card
Detalle con rangos, premisas, inputs y evidencia
```

Mismas reglas 1A–6A; cambia densidad visual, no política. Útil para usuarios expertos; más carga de comparación inicial. A es recomendación visual de este corte y el HTML permite compararlas. No hay elección humana previa entre estos dos layouts.

## Anatomía de la card y calibración

1. **Concepto/impacto:** nombre de negocio, CFU/CVU/financiamiento/margen según consumidor verificado. Derivados se muestran como resultados, no inputs editables.
2. **Contexto:** segmento, país, equipo, moneda, unidad, periodo y ámbito fiscal de referencia.
3. **Referencia:** mínimo observado, valor central con nombre de medida, máximo observado y tamaño/alcance de muestra. Las celdas sin evidencia muestran «Sin evidencia suficiente» y no un 0.
4. **Elección:** mínimo/central/máximo, Estándar MARKSMAN o manual. La selección puede ser provisional y lo conserva en su etiqueta.
5. **Premisas:** textos condicionales vinculados a referencia y elección; el usuario expresa identificación y agrega condiciones propias. Elegir «No me identifico» invita a reconsiderar o justificar, no cambia el valor silenciosamente.
6. **Inputs internos:** edición específica de los parámetros que integran el concepto. Modificar uno convierte la decisión en personalizada o mixta; «Usar estándar» no sobrescribe otros conceptos manuales.
7. **Evidencia:** enlaces/localizadores, fecha observada, fecha de revisión, método de normalización, límites y estado de compatibilidad.
8. **Impacto:** cambio calculado por backend existente cuando haya contexto suficiente; de lo contrario «Pendiente de completar el contexto». No calcular un segundo CFU/CVU en React.

### Mínimo, promedio y máximo

- Cohorte compatible: país, segmento, equipo, unidad, moneda/baseFX, periodo y alcance de costo/impuestos. Deduplicar una misma observación reproducida por varias fuentes.
- No mezclar salarios netos/brutos, seguro doméstico/transfronterizo, precio anual/mensual ni mantenimiento con/sin llantas para fabricar un rango.
- Promedio aritmético/ponderado sólo con denominador documentado; mediana se llama mediana; punto medio es hipótesis calculada. No reemplazar un promedio ausente con `(min+max)/2`.
- Una observación proporciona referencia puntual; dos extremos publicados no acreditan promedio. No sugerir que mínimos/máximos de una muestra son toda la industria.
- Evidencia más representativa del perfil prima sobre contar muchas fuentes incompatibles. No promediar una media industrial con varias ofertas individuales como si fueran observaciones homogéneas.
- Estándar MARKSMAN puede coincidir con un valor central sustentado o aplicar una selección justificada por perfil. Conserva versión, método y premisas; no es sinónimo de defaultV3.
- Si sólo hay proxy, se presenta como «Referencia provisional MARKSMAN» y se registra su aceptación. Puede ser aceptado para estimación sin cambiar su calidad a «observado/calibrado».
- Rangos económicos observados son distintos de restricciones matemáticas/de dominio. Fuera de rango observado requiere justificación; moneda/unidad incompatible, valor no finito o configuración inválida requiere corregirse.
- Combustibles/FX y demás fuentes cambian con su frecuencia propia. Una actualización crea propuesta fechada; las versiones ya adoptadas conservan el snapshot usado.

### Argumentos y edición

Motor de reglas/textos parametrizados desde el expediente. Cada argumento conserva `ruleId`, referencia, premisa y sentido de influencia. No necesita inferencia de IA por card. Ejemplo: «El nivel seleccionado presupone [condición de equipo] y [uso]. Si tu operación difiere, revisa [input].» El argumento se formula como condición, evitando afirmar que una relación costo/eficiencia es universal.

El usuario edita **sus condiciones y la decisión**, sin alterar el texto/valor original de una fuente pública. Ambas versiones de la explicación quedan asociadas. Cambiar la evidencia o los valores afectados invalida la revisión correspondiente; editar una nota sin efecto económico no debería invalidar otras secciones sin motivo.

## Guardado y adopción aceptados

| Momento | Resultado |
| --- | --- |
|Elegir nivel|Decisión pendiente con procedencia y premisas visibles.|
|Guardar card|Sólo borrador de una versión; valores y metadata deben guardarse juntos.|
|Recargar|Recupera servidor: organización, base, versión, perfil, selección, justificación y referencia fijada.|
|Revisar conjunto|Conceptos completos/pendientes/provisionales/propios, diferencias con versión activa, CFU/CVU e impacto cuando calculable.|
|Activar|Acción explícita sobre el mismo borrador revisado, con permisos y validaciones vigentes. No exige un segundo revisor humano añadido.|
|Editar activa|Crear/copiar un nuevo borrador conservando valores y decisiones; versión publicada permanece reproducible.|
|Actualizar benchmark|Ver diferencias y seleccionar; propuestas aceptadas van a nuevo borrador. Capturas manuales se preservan salvo sustitución solicitada explícitamente.|

La publicación actual requiere revisión vigente por segmento. El wizard no marca `CURRENT` enviando fuentes genéricas ni hace pasar aceptación de proxy por calibración demostrada. Una capacidad de adopción para estimación con proxies, si difiere de ese contrato, necesita un estado/criterio de revisión explícito y pruebas; no retirar silenciosamente la validación existente.

## Datos e integración propuesta

Fuente de verdad de valores: versión de supuestos FCM y catálogo canónico. Fuente de verdad de benchmark: expedientes/referencias fijados y sus revisiones. Decisiones de usuario pertenecen a organización/base/versión; son metadata, no otro catálogo de valores ni datos maestros centrales duplicados.

Contrato conceptual por card:

```text
contexto: org/base/version + segmento/perfil/equipo/país
identidad: conceptId + parameterKeys consumidos + schemaVersion
referencia: benchmarkRevision + observationIds + fuente/fecha/cohorte
estadísticas: mínimo/central/máximo nullable + medida/n/normalización
estándar: selección típica + rationale + versión + calidad de evidencia
decisión: modo + valores nativos/unidades + identificación de premisas
explicación propia: condiciones + motivo fuera de rango + aceptación provisional
revisión: huella de valores/perfil/evidencia/reglas + fecha/actor
```

Propuesta de API: extender o componer el recurso versionado de supuestos, evitando otra ruta de negocio paralela. La estructura persistida de metadata aún debe comprobarse contra Prisma antes de decidir campo JSON o recurso; este diseño no autoriza migración DB. Payload atómico de valores/decisión, control de versión concurrente y recibo de guardado. Evitar una PATCH de valores y otro guardado independiente que pueda dejar la explicación fuera de sincronía.

Mantener ADMIN para edición/calibración/publicación según rutas actuales; OPERATOR/VIEWER conservan permisos existentes. La UI recibe capacidades del servidor y no cambia roles mediante el wizard. Cambio de cuenta limpia estado y cache del contexto anterior. No inferir autorización por ID visible en navegador.

## Criterios de aceptación del MVP

- [ ] Perfil seleccionado determina conceptos y referencias compatibles; se conservan estados de segmentos sin modelo soportado.
- [ ] Cada concepto requerido tiene decisión explícita; campos que no aplican muestran razón y no cuentan como faltantes.
- [ ] Una fuente puntual o un rango sin promedio no produce tres estadísticas inventadas.
- [ ] Estándar típico usa fuente/método/perfil; provisional mantiene su etiqueta después de aceptar, guardar y activar.
- [ ] Un valor fuera del rango observado se guarda con motivo; inputs incompatibles de dominio/unidad son rechazados.
- [ ] Las premisas y condiciones personales se conservan; fuentes originales no se editan desde la card.
- [ ] Modificar un parámetro interno produce selección personalizada/mixta y revisión del impacto pertinente.
- [ ] Recarga, navegación atrás y reapertura conservan decisiones del borrador del usuario/organización correctos.
- [ ] Doble guardado/activación no crea otra versión accidental; conflicto concurrente muestra diferencias antes de sobrescribir.
- [ ] Publicación comprueba permisos, perfil, identidad, huella vigente y criterio de revisión del backend.
- [ ] Edición de una activa abre borrador; referencias nuevas se incorporan sólo por selección explícita.
- [ ] CFU/CVU se obtiene del compositor/kernel verificado; faltantes producen explicación y mantienen salida pendiente.
- [ ] Desktop 1280 y móvil 390 permiten leer valores/unidades, operar por teclado y corregir errores sin desplazamiento horizontal.

P1: comparación simultánea de cards, filtro por pendientes, exportar expediente. P2: asistentes IA optativos, nuevas especialidades/equipos y automatizaciones de actualización; requieren evidencia/costo propio. El MVP comienza por el segmento binacional ya definido.

Indicadores propuestos, todavía no medidos: completar el recorrido inicial sin perder decisiones ni asistencia;100% de decisiones conservan procedencia y premisas; 0 sobrescrituras automáticas de bases activas; medir tiempo/abandono por sección antes de fijar objetivos de reducción. Pruebas UX iniciales con tres conceptos, posteriormente recorrido completo aplicable.

## Cortes y modelos

| Corte | Entregable y cierre | Responsable/proveedor/modelo recomendado | Esfuerzo y tope |
| --- | --- | --- | --- |
|W0 · actual|Decisiones1A–6A documentadas; wireframes A/B e interacción local verificable.|Codex/OpenAI `gpt-6.1-sol`; continuidad del encargo.|Alto;60min, máximo2 reparaciones por causa,0inferencias auxiliares.|
|W1 · datos/decisiones|Referencias por concepto y metadatos trazables; aceptación/proxy/manual y guardado atómico local probados.|Codex/OpenAI `gpt-6.1-sol` recomendado.|Alto; un corte de hasta1día de trabajo local, sin migración/publicación inferida.|
|W2 · recorrido SaaS|Wizard integrado con borrador, revisión, reanudación y permisos existentes; wireframes acompañan la implementación.|Codex/OpenAI `gpt-6.1-sol` recomendado; Claude candidato para diseño/revisión si elegido.|Alto; hasta2días locales,2 reparaciones por causa.|
|W3 · adopción|Candidato concreto con evidencia, impacto, compatibilidad de contrato y rollback probado; activación según autoridad aplicable.|Codex/OpenAI `gpt-6.1-sol` recomendado.|Alto; hasta1día local,2 reparaciones por causa.|

Son cortes finitos de un flujo; no nuevos sprints por cada input. Recomendaciones no cambian el modelo nativo. Modelo/esfuerzo efectivos de la sesión y consumo atribuible desconocidos; cero llamadas a otros modelos. Claude considerado por su posible aporte UI/UX; continuidad y verificabilidad favorecen el ejecutor actual para este prototipo. Ninguna política automática de selección activada.

## Prototipo y límites comprobables

[Abrir wireframe interactivo](COST_BASE_WIZARD_2026-10-04.html). Paleta/logo de [MARKSMAN_UI](MARKSMAN_UI.md) y tokens actuales; SHA del logo coincide con el asset oficial Drive `16630778edf28961b158cb594fb8ceefe1b63e0c87e17e7f94ebc074d731faeb`. No archivos de las fuentes aprobadas disponibles en el checkout; se declaran familias oficiales y fallback Arial/Courier, como la UI actual.

El HTML es una demostración con cifras sintéticas rotuladas, tres conceptos y guardado local del navegador. Activación y actualización de benchmark son simuladas; no conecta API, motor, Auth ni DB. Especificación y glosario distinguen card/input, referencia/default, promedio/punto medio y adopción/calibración. No valida rangos reales de mercado ni adopta el escenario B2.

Escritor único D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd, cambios previos conservados. Rollback de este corte: retirar sólo glosario/prototipo/spec/captura nuevos y su entrada de estado, comprobando antes cambios posteriores. El prototipo permite restablecer únicamente su clave local `marksman-cost-base-wizard-demo-v1`. No hay API/producción que revertir.

### Verificación W0 realizada

- Navegador local `http://127.0.0.1:4721/`: perfil, referencias y navegación entre conceptos comprobados.
- Card incompleta: no avanza. Captura manual 35 frente al máximo sintético 30: exige explicación; con explicación guarda y conserva valor/nota al recargar.
- Estándar de mantenimiento seleccionado; referencia provisional de seguro sin estadísticas: opciones de rango deshabilitadas y guardado rechazado hasta reconocer su carácter provisional.
- Revisión de tres decisiones: activación deshabilitada antes de confirmar la revisión; simulación de v1 y recarga conservan estado adoptado y etiqueta Provisional.
- Propuesta de benchmark: incorporar sólo combustible abre borrador v2, conserva captura manual 35, no cambia mantenimiento 0.20, requiere volver a revisar premisas y conserva snapshot v1 con valores 35/0.20/750.
- Vistas A/B comprobadas. Ancho móvil CSS observado 390, alto 843; ancho del documento 371, sin overflow horizontal. La escala del host fue compensada en la capacidad de viewport y luego se restauró el tamaño habitual.
- Consola de la pestaña: sin errores registrados al cierre. Sintaxis del script verificada con `vm.Script`; `git diff --check` sin errores, con avisos de normalización CRLF preexistentes. Los archivos nuevos se comprueban además por separado.
- Dos reparaciones: guardar el paso posterior al avance; persistir el importe durante la entrada sin reemplazar el control enfocado. Revalidación funcional realizada después de ambas.
- [Captura del wireframe verificado](COST_BASE_WIZARD_VERIFIED_2026-10-04.jpg). Logo oficial sin alteraciones; tipografía con fallback, no validación de fuentes licenciadas.

No pruebas autenticadas, persistencia de servidor, cambio de cuenta, concurrencia real, integración CFU/CVU ni benchmark económico completo en W0. Los criterios del MVP siguen abiertos hasta W1–W3; los controles de esta demostración no prueban seguridad de la aplicación. Sin paquetes nuevos, llamadas facturables o inferencia por card.

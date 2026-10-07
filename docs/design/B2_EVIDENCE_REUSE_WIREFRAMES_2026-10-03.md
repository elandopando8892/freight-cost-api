# B2 — wireframes para comparar reutilización

## Extensión corte 3: expediente público real de sólo lectura

Se mantiene el wireframe A y los tokens oficiales. La lista ahora tiene dos conceptos combinados (pernocta MX y US), no cuatro cargos sintéticos. El inspector presenta fuentes pinneadas, precio aplicable pendiente, comparadores no adoptados y efecto en CVU sin total. Ciclo y capital son presets comparativos existentes, no una selección de financiación. No hay guardado de notas: el registro existente no encaja sin una cotización y modificaciones económicas. La captura visual local usa el componente del producto y el expediente real, pero declara transporte y Auth simulados.

```text
Caso / septiembre / ciclo / capital comparativo / Consultar
Aviso: lectura; octubre no equivale a septiembre; sin adopción
Lista MX/US + búsqueda/país | Fuente / inclusión / faltante / CVU pendiente
Faltantes 6 fijos + 7 variables / incompatibilidades / huella
```

3 octubre 2026. **Propuesta esquemática A/B para el corte2; sin implementación visual ni aprobación de diseño nuevo.** Comparación técnica: componentes actuales frente a Refine Core. Ambas implementaciones deben usar la misma dirección visual elegida para no confundir cambio de librería con cambio de UX.

## Objetivo y referencia

Localizar pernocta MX/US pendiente, revisar la evidencia aplicable a septiembre2026 y entender su efecto en CVU. Se conserva el shell de FCM y [MARKSMAN_UI](MARKSMAN_UI.md): logo oficial, Charcoal `#1e1e1e`, Electric Orange `#ea5e27`, Industrial Grey `#484848`, Cloud Grey `#efefef`. La prueba visual deberá reutilizar assets reales y documentar fallbacks de tipografía. No se ha leído/renderizado nuevamente el manual en este corte documental; la comprobación visual de marca corresponde a la demostración posterior.

No mostrar un nuevo flujo de login ni una administración global del ecosistema. Navegación propuesta dentro del contexto de la base: **Base → revisión de benchmark → concepto → evidencia e impacto**.

## Opción A — lista compacta e inspector en contexto (recomendada)

Desktop:

```text
┌ MARKSMAN · Bases de costo ───────────── Organización / cuenta ┐
│ Base binacional / Revisión del benchmark                    │
│ Septiembre2026 · Misma caja · Relevo propio MX/US            │
│ Ciclo [red / dedicado]     Compra [contado / financiado]    │
├───────────────────────┬────────────────────────────────────┤
│ Buscar concepto       │ Pernocta en viaje                  │
│ País [ambos]          │ México / Estados Unidos            │
│ Estado [pendientes]   │ Hotel de paso + pensión            │
│                       │                                    │
│ Pernocta MX    parcial│ Fuente · unidad · período · país   │
│ Pernocta US  pendiente│ Evidencia compatible / faltante    │
│ Bonos MX     pendiente│ Vínculo canónico: verificable o —  │
│ ...                   │                                    │
│                       │ Qué ya incluye el modelo           │
│                       │ Qué falta respaldar                │
│                       │                                    │
│                       │ Impacto CVU: pendiente             │
│                       │ Total del caso: pendiente          │
│                       │ [Ver fuente] [Ver explicación]     │
└───────────────────────┴────────────────────────────────────┘
```

Ventaja: selección, fuente e impacto comparten contexto. No obliga a operar una tabla con todas las dimensiones técnicas ni a abrir una nueva pantalla por cada campo. Riesgo: mantener la selección cuando filtros o escenario cambian exige estado bien definido.

Mobile: encabezado y selectores apilados; lista primero; elegir un concepto abre su detalle con una sola acción **Volver a pendientes**. La evidencia larga usa disclosure y texto ajustado, sin una tabla de ancho desktop.

## Opción B — tabla de conciliación con detalle desplegable

```text
┌ MARKSMAN · Bases de costo ───────────── Organización / cuenta ┐
│ Base binacional / Revisión del benchmark                    │
│ Septiembre2026 · Ciclo / compra · Buscar / país / estado     │
├ Concepto ─ País ─ Estado ─ Vigencia ─ Impacto ───────────────┤
│ Pernocta    MX    parcial    por revisar    CVU pendiente    │
│ Pernocta    US    pendiente  sin precio    CVU pendiente    │
│ ▾ Detalle: fuente, inclusiones, faltante y vínculo canónico │
│   [Ver fuente] [Ver explicación]                           │
│ Bonos       MX    pendiente  por revisar    CVU pendiente    │
└────────────────────────────────────────────────────────────┘
```

Ventaja: comparación rápida entre varias filas. Riesgo: más densidad y peor lectura de evidencias largas. Mobile cambia a tarjetas con detalle debajo, no a una tabla que impida leer el contenido.

Recomendación de prueba: A, por legibilidad del expediente y continuidad del caso. La dirección se compara visualmente antes de integrarla en el producto; aún no existe selección humana de un mock nuevo.

## Datos de la demostración y contrato propuesto

La prueba usa únicamente un snapshot sintético marcado **Demostración**. No contiene importes presentados como benchmark real ni contactos/clientes reales. Los nombres de conceptos y estados sirven para representar faltantes; el total continúa `null` mientras el caso esté incompleto.

Proyección propuesta de lectura, todavía no endpoint implementado:

```text
perfil + período + escenario + modo de compra + huella
  → concepto MX_TRAVEL_EXPENSES / US_DRIVER_TOTAL
  → fuente y localizador + período/territorio/unidad/impuesto
  → importe conocido / remanente / motivo de aplicabilidad
  → vínculo canónico verificado o SIN_VINCULO_CANONICO
  → efecto explicado en CVU; delta y total null si no sustentados
```

No inferir noches del tiempo del activo; no adoptar un mix50/50 ni otro hotel. Mantener el tratamiento previo de comidaUS y patio de base; una evidencia de estacionamiento no demuestra una habitación incluida. Un comparador fuera de período no se vuelve un precio deSept por cambiar su etiqueta.

Si se demuestra guardado de una nota en corte2, será estado sintético local identificado y separado de valores del motor. No se presentará como persistencia de API, revisión aceptada o adopción. En corte3 se deberá demostrar que el registro existente sirve para esa decisión o precisar qué contrato falta antes de escribir.

## Permisos y estados

El benchmark HTTP observado permite ADMIN/OPERATOR; editar supuestos y registrar calibración requieren ADMIN. Un selector sintético de rol sirve para revisar presentación, no autentica al usuario ni prueba seguridad server-side. La demostración no habilita VIEWER a un endpoint que actualmente lo rechaza.

Estados obligatorios: cargando, vacío, fuente incompleta, período incompatible, vínculo canónico ausente, revisión obsoleta, error de consulta y sesión vencida. Cambiar perfil/ciclo/cuenta invalida selecciones sensibles; un refresco del token del mismo usuario no debe perder el borrador sólo por crear un nuevo objeto de sesión.

## Criterios de comparación

1. Encontrar el mismo concepto mediante búsqueda/filtro y volver sin perder contexto.
2. Identificar fuente, unidad, período y falta de precio sin leer JSON crudo.
3. Distinguir subtotal conocido, remanente y total pendiente; nunca presentar null como cero.
4. Entender qué inclusión se preserva y qué dato faltante afecta CVU.
5. Usar teclado, foco visible y lectura desktop/mobile dentro de los tokens MARKSMAN.
6. Comparar código propio, dependencias, providers y mantenimiento con el mismo flujo y datos.
7. No atribuir mejora visual a Refine si ambos candidatos pueden usar el mismo diseño.

No hay métricas de ahorro ni pruebas de Refine aún. El corte2 deberá fijar una versión compatible antes de usar el paquete, verificar su licencia y conservar la variante ganadora; no mantener dos pantallas equivalentes en el producto.

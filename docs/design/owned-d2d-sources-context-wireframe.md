# Wireframe UI/UX · Fuentes y contexto compartido D2D

Objetivo: capturar una sola vez la fecha del servicio y la referencia del remolque; vincular cada supuesto a las fuentes del expediente que realmente lo soporta. Esta pantalla no valida la autenticidad de una fuente ni adopta un parámetro.

```text
┌─────────────────────────────────────────────────────────────┐
│ Fecha del servicio [AAAA-MM-DD]  Referencia remolque [     ] │
│ Se aplican a ambos tramos, capital y utilización.           │
└─────────────────────────────────────────────────────────────┘
[1 Ruta y tramos] [2 Capital y costos fijos] [3 Utilización]

┌ Fuentes documentales del expediente fijo (1) ───────────────┐
│ Fuente 1 ▾ ID [F-1] URL [HTTPS] página [ ] vigencia [ ]     │
│ [Quitar fila] [Agregar fuente]                               │
└─────────────────────────────────────────────────────────────┘
┌ Fuentes de asignación ───────────────────────────────────────┐
│ [ ] F-1 · Documento, sección 2                               │
│ [x] Fuente no disponible: F-2 [retirar referencia]           │
└─────────────────────────────────────────────────────────────┘
```

Usa `max-w-6xl`, `px-4`, `py-8`, `gap-4`, `rounded-lg`, `border`, `bg-card`, `text-primary` y las variantes actuales de `Button`. El bloque compartido tiene dos columnas desde `md` (768 px) y una debajo. Textos técnicos largos permiten corte; los campos y grupos usan ancho mínimo cero. A 390 px, el documento no debe desplazarse horizontalmente.

Interacción: al editar fecha, el formulario actualiza `route.serviceDate`, las fechas de parámetros MX/US y `fixed.capital.serviceDate`. La referencia actualiza `fixed.capital.assetReference` y `trailer.assetReference`. Esos duplicados se ocultan en los bloques para evitar ediciones contradictorias. Los importes y referencias documentales permanecen intactos. Las fechas de consulta/vigencia de las fuentes se capturan por separado.

Cada selector muestra solo los IDs del expediente apropiado: MX, US, capital, costos fijos o utilización. El ID más su localizador identifican la opción; un ID vacío no aparece. Al retirar o renombrar la fuente, la referencia existente se muestra como «Fuente no disponible» y puede desmarcarse. No se borra silenciosamente una vinculación. Sin fuentes, aparece una indicación para agregarlas. Cada casilla tiene nombre accesible que incluye la ruta del campo; teclado con Tab/Espacio. Grupos `details` abren con teclado. El botón de cálculo mantiene el estado de carga y los errores aparecen en la región de alerta existente.

Estados: vacío (sin fechas/importe), fuente disponible, sin fuentes, fuente retirada, sesión vencida, resultado invalidado tras edición, carga, contrato inválido, expediente incompleto y escenario calculado. Los campos compartidos no asignan costo cero ni copian fechas documentales. El servidor sigue siendo autoridad para vigencia, alcance, integridad y cálculo.

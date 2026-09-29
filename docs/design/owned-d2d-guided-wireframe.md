# Guided D2D capture — design handoff

Purpose: replace editing JSON with structured fields across the entire existing contract. Server publishes field metadata and canonical parameter keys/units only; no economic defaults. Reuse MARKSMAN tokens, existing Button and cards. No new design library.

```text
Escenarios D2D · Remolque propio compartido · No calibrado
[1 Ruta y tramos] [2 Capital y costos fijos] [3 Utilización]
┌ Ruta y tramos ─────────────────────────────────────┐
│ Sentido [Selecciona]   Fecha del servicio [vacío]   │
│ Puntos de ruta ▾ / Tramo México ▸ / Tramo EE.UU. ▸  │
│   Parámetros ▸ [clave/unidad; valor vacío; fuente]  │
│   Viaje ▸ [km cargados/vacíos; días; peajes]        │
│   Fuentes ▸ [Agregar: URL, vigencia, alcance]       │
└───────────────────────────────────────────────────┘
[Calcular escenarios] [Limpiar]
[Pendientes con ruta del campo / Resultado CFU-CVU]
```

Layout max-w-6xl, outer px-4 py-8. Sections gap-4; groups p-3 border rounded-lg; primitive fields gap-2 full-width. Buttons wrap on mobile. Amount/reference/derivation groups remain stacked to avoid squeezing long documentary content. Text wraps and URL fields min-w-0. Existing primary/background/card/border/destructive tokens; text-sm labels, font-mono amounts, heading text-2xl. Existing Button hover/focus states; no animation or gestures.

Modes: loading contract (no calculate), fetch error (retry), blank structured fields, expanded groups, add/remove list rows, pending calculation, validation error, incomplete evidence and computed result. No JSON required. Empty numeric input stays empty; explicit zero is distinct. No sample numeric defaults; metadata only seeds canonical parameter keys and units. Technical fixed declarations are visible, not concealed economic assumptions.

Each field uses a visible label and a unique full-path accessible label. Tab buttons expose aria-pressed. Native details/summary work with keyboard. Arrays bounded by metadata maximum. Results/errors use existing live regions. Changing any field clears/invalidate old results. Clear resets all blocks, never server data. Parameter row deletion still cannot bypass server completeness checks.

Blank fields produce a list of pending paths; server remains authority for dates, numeric ranges, evidence references and validity. This first guided version retains technical parameter keys/enum values alongside Spanish labels; relational evidence selectors and usability acceptance remain future work. No save/adopt/publish control.

# D2D server calculation: implementation handoff

Technical review increment, not the final guided economic-input form. Reuses MARKSMAN tokens already in globals.css; no new palette or assets.

```text
Scenario Lab ←
Escenarios D2D · cálculo desde inputs
[No calibrado · no guarda ni adopta bases]
Inputs originales (JSON avanzado)
[ route + fixed + trailer                         ]
[ Calcular escenarios ] [ Limpiar ]
[ Loading / accessible error / missing inputs ]
[ Scenario A: CFU / CVU / border / total calculated ]
[ Scenario B: CFU / CVU / border / total calculated ]
[ Sources disclosure per scenario                 ]
```

Container max-w-6xl, px-4, py-8; gap-4 (16px), card p-4, rounded-lg. Use background/card/border/primary/destructive tokens and existing font-mono for amounts. Heading text-2xl font-semibold. CTA uses existing Button default/outline variants, hover and focus states. No additional animation or gestures.

Below md (768px), cards stack; md and above two columns. Labels wrap; source URLs break-all. Input min-h-40, full width, limit 256,000 UTF-8 bytes before submitting. Keyboard: textarea -> calculate -> clear -> source disclosures; buttons retain built-in focus styles. Error role=alert; loading and results aria-live=polite.

Empty input disables calculate. Loading disables duplicate calculation and shows Calculando. Editing/clearing invalidates prior and pending results. Errors display no previous totals; 401 requests sign-in through existing session-expired handling, 403 states operator/admin required. Incomplete evidence shows issues, no totals. Success explicitly means arithmetic recomputed by server, NOT validated sources or economic calibration. No save/adopt/publish action. The existing offline reader remains available only in its test harness/code; product page uses original inputs.

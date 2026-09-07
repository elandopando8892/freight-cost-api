'use client'

import { useState } from 'react'
import { QuoteForm, type LaneHint } from './quote-form'
import { QuoteWizard } from './quote-wizard'
import type { CostBaseOption, ReopenQuote } from './quote-shared'

type Mode = 'guided' | 'fast'

export function QuoteModes({ recentLanes = [], costBases = [], initialQuote }: { recentLanes?: LaneHint[]; costBases?: CostBaseOption[]; initialQuote?: ReopenQuote }) {
  const [mode, setMode] = useState<Mode>('guided')
  return (
    <>
      {initialQuote && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-xs" role="status">
          <span><strong>Reabriendo cotización</strong>{initialQuote.label ? ` · ${initialQuote.label}` : ` · ${initialQuote.id.slice(0, 8)}`}</span>
          <span className="text-muted-foreground">Puedes ajustar los datos antes de recalcular.</span>
        </div>
      )}
      <div
        role="group"
        aria-label="Modo de cotización"
        className="mb-4 grid max-w-xl grid-cols-2 gap-1 rounded-md border bg-muted/30 p-1 text-sm"
      >
        <ModeTab active={mode === 'guided'} onClick={() => setMode('guided')} label="Guiado" description="Ruta, equipo y revisión" />
        <ModeTab active={mode === 'fast'} onClick={() => setMode('fast')} label="Rápido" description="Formulario para operación experta" />
      </div>
      {mode === 'guided' ? <QuoteWizard costBases={costBases} initialQuote={initialQuote} /> : <QuoteForm recentLanes={recentLanes} costBases={costBases} initialQuote={initialQuote} />}
    </>
  )
}

function ModeTab({ active, onClick, label, description }: { active: boolean; onClick: () => void; label: string; description: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded px-3 py-2 text-left transition-colors ${
        active ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
      }`}
    >
      <span className="block font-medium">{label}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
    </button>
  )
}

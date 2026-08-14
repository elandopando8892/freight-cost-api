'use client'

import { useState } from 'react'
import { QuoteForm, type LaneHint } from './quote-form'
import { QuoteWizard } from './quote-wizard'
import type { CostBaseOption } from './quote-shared'

type Mode = 'guided' | 'fast'

export function QuoteModes({ recentLanes = [], costBases = [] }: { recentLanes?: LaneHint[]; costBases?: CostBaseOption[] }) {
  const [mode, setMode] = useState<Mode>('guided')
  return (
    <>
      <div
        role="group"
        aria-label="Modo de cotización"
        className="mb-4 grid max-w-xl grid-cols-2 gap-1 rounded-md border bg-muted/30 p-1 text-sm"
      >
        <ModeTab active={mode === 'guided'} onClick={() => setMode('guided')} label="Guiado" description="Ruta, equipo y revisión" />
        <ModeTab active={mode === 'fast'} onClick={() => setMode('fast')} label="Rápido" description="Formulario para operación experta" />
      </div>
      {mode === 'guided' ? <QuoteWizard costBases={costBases} /> : <QuoteForm recentLanes={recentLanes} costBases={costBases} />}
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

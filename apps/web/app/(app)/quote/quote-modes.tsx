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
      <div className="mb-6 inline-flex rounded-md border bg-muted/40 p-0.5 text-sm">
        <ModeTab active={mode === 'guided'} onClick={() => setMode('guided')} label="Guiado" hint="Step-by-step wizard" />
        <ModeTab active={mode === 'fast'} onClick={() => setMode('fast')} label="Rápido" hint="Single dense form (expert)" />
      </div>
      {mode === 'guided' ? <QuoteWizard costBases={costBases} /> : <QuoteForm recentLanes={recentLanes} costBases={costBases} />}
    </>
  )
}

function ModeTab({ active, onClick, label, hint }: { active: boolean; onClick: () => void; label: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className={`rounded px-3 py-1.5 font-medium transition-colors ${
        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  )
}

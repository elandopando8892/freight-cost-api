'use client'

import { useState } from 'react'
import Link from 'next/link'
import { QuoteForm, type LaneHint } from './quote-form'
import { QuoteWizard } from './quote-wizard'
import { preferredGovernedBase, type CostBaseOption, type ReopenQuote } from './quote-shared'
import { useQuoteDraft } from './use-quote-draft'

type Mode = 'guided' | 'fast'

export function QuoteModes({ recentLanes = [], costBases = [], initialQuote, reopenError }: { recentLanes?: LaneHint[]; costBases?: CostBaseOption[]; initialQuote?: ReopenQuote; reopenError?: string | null }) {
  const [mode, setMode] = useState<Mode>('guided')
  const draft = useQuoteDraft(costBases, initialQuote)
  const hasInitialGovernedBase = Boolean(preferredGovernedBase(costBases, 'D2D Import'))
  return (
    <>
      {initialQuote && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-xs" role="status">
          <span><strong>Reabriendo cotización</strong>{initialQuote.label ? ` · ${initialQuote.label}` : ` · ${initialQuote.id.slice(0, 8)}`}</span>
          <span className="text-muted-foreground">Puedes ajustar los datos antes de recalcular.</span>
        </div>
      )}
      {reopenError && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs" role="alert">
          <span><strong>No se pudo reabrir</strong> · {reopenError}</span>
          <Link href="/quote" className="font-medium text-primary underline underline-offset-2">Iniciar cotización nueva</Link>
        </div>
      )}
      {!hasInitialGovernedBase && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-200" role="status">
          <span><strong>Revisa la base de costo</strong> · No se encontró una base gobernada para la operación inicial. Comprueba la versión y su perfil antes de calcular.</span>
          <Link href="/cost-bases" className="font-medium underline underline-offset-2">Revisar Mis costos →</Link>
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
      {mode === 'guided' ? <QuoteWizard draft={draft} costBases={costBases} initialQuote={initialQuote} /> : <QuoteForm draft={draft} recentLanes={recentLanes} costBases={costBases} initialQuote={initialQuote} />}
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

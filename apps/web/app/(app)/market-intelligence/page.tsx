import type { Metadata } from 'next'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Inteligencia de mercado' }

type Severity = 'INFO' | 'WATCH' | 'ALERT'
type Signal = {
  key: string
  severity: Severity
  title: string
  summary: string
  evidence: Record<string, unknown>
  affectedScopes: string[]
  reviewPath: string
  reviewLabel: string
}
type Intelligence = {
  generatedAt: string
  policy: string
  coverage: { dieselObservations: number; fxObservations: number; publishedRateBooks: number; expiringRateBooks: number; staleLineageRateBooks: number }
  signals: Signal[]
}

const severityStyle: Record<Severity, string> = {
  INFO: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  WATCH: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  ALERT: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

function displayEvidence(signal: Signal) {
  const current = signal.evidence.current
  const previous = signal.evidence.previous
  const unit = signal.evidence.unit
  const delta = signal.evidence.deltaPercent
  if (typeof current === 'number' && typeof previous === 'number') {
    return <p className="mt-3 text-xs text-muted-foreground">Actual: {current.toFixed(3)} {typeof unit === 'string' ? unit : ''} · anterior: {previous.toFixed(3)} {typeof unit === 'string' ? unit : ''}{typeof delta === 'number' ? ` · variación: ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%` : ''}</p>
  }
  if (typeof signal.evidence.observations === 'number') return <p className="mt-3 text-xs text-muted-foreground">Observaciones disponibles: {signal.evidence.observations}</p>
  if (typeof signal.evidence.count === 'number') return <p className="mt-3 text-xs text-muted-foreground">Elementos detectados: {signal.evidence.count}</p>
  return null
}

export default async function MarketIntelligencePage() {
  const intelligence = await api<Intelligence>('/market/intelligence')
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inteligencia de mercado</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Señales explicables para priorizar revisión humana por base tarifaria y alcance operativo.</p>
        </div>
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Solo lectura · ninguna tarifa, supuesto o RateBook se modifica automáticamente.</p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Cobertura de datos">
        {[
          ['Diésel histórico', intelligence.coverage.dieselObservations],
          ['Observaciones FX', intelligence.coverage.fxObservations],
          ['RateBooks publicados', intelligence.coverage.publishedRateBooks],
          ['Próximos a vencer', intelligence.coverage.expiringRateBooks],
          ['Linaje por revisar', intelligence.coverage.staleLineageRateBooks],
        ].map(([label, value]) => <Card key={label as string} size="sm"><CardContent className="pt-1"><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></CardContent></Card>)}
      </section>

      <section className="grid gap-4" aria-label="Señales de mercado">
        {intelligence.signals.map((signal) => (
          <Card key={signal.key}>
            <CardHeader>
              <div className="flex items-center gap-2"><CardTitle>{signal.title}</CardTitle><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityStyle[signal.severity]}`}>{signal.severity === 'INFO' ? 'Informativo' : signal.severity === 'WATCH' ? 'Revisar' : 'Atención'}</span></div>
              <CardDescription>{signal.summary}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Aplica a: {signal.affectedScopes.join(' · ')}</p>
              {displayEvidence(signal)}
              <Link href={signal.reviewPath} className="mt-4 inline-block text-sm font-medium underline underline-offset-4">{signal.reviewLabel}</Link>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  )
}

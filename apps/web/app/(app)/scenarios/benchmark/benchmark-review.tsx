'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { parseReview, type ReviewResult } from './review-contract'

const usd = (n: number) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
export function ReviewResults({ result, calculated = false }: { result: ReviewResult | null; calculated?: boolean }) {
  if (!result) return <p className="rounded-lg border bg-card p-4">Sin resultados cargados. No hay importes adoptados desde esta pantalla.</p>
  if (result.status === 'INCOMPLETE') return <section className="rounded-lg border bg-card p-4"><h2 className="font-semibold">Datos pendientes · sin total</h2><ul className="mt-3 grid gap-2">{result.issues.map((issue, i) => <li key={i} className="break-words text-sm">{issue.field}: {issue.code}</li>)}</ul></section>
  return <div className="grid gap-4 md:grid-cols-2">{result.scenarios!.map(s => <article key={s.id} className="min-w-0 rounded-lg border bg-card p-4">
    <h2 className="break-words font-semibold">Escenario {s.id}</h2>
    <dl className="mt-4 grid gap-2 text-sm">{([['CFU', s.result.costs.cfuUsd], ['CVU', s.result.costs.cvuUsd], ['Frontera', s.result.costs.borderServicesUsd], [calculated ? 'Total calculado' : 'Total declarado', s.result.costs.productionCostUsd]] as const).map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd className="font-mono">{usd(value)} USD</dd></div>)}</dl>
    <details className="mt-4 border-t pt-3"><summary className="cursor-pointer py-2 focus-visible:outline-2">Fuentes del remolque ({s.result.sharedTrailer.lineage.evidence.length})</summary><ul className="grid gap-3">{s.result.sharedTrailer.lineage.evidence.map((e, i) => <li key={i} className="break-words text-sm"><a className="break-all text-primary underline" href={e.url} target="_blank" rel="noopener noreferrer">{e.id} ↗</a><p>{e.locator}</p></li>)}</ul></details>
  </article>)}</div>
}

export function BenchmarkReview() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [error, setError] = useState('')
  function review() {
    setResult(null); setError('')
    try { setResult(parseReview(text)) } catch { setError('JSON incompatible o demasiado grande. Usa la salida de calculateOwnedD2DScenarios, hasta 1 millón de caracteres. No se cargó ningún resultado.') }
  }
  return <div className="grid gap-4">
    <header><p className="font-mono text-xs uppercase tracking-widest text-primary">Revisión de benchmark</p><h1 className="mt-2 text-2xl font-semibold">Escenarios D2D</h1><p className="mt-2 text-sm text-muted-foreground">Remolque propio compartido · Solo lectura · No calibrado</p></header>
    <p className="rounded-lg border bg-card p-4 text-sm">Resultado pegado localmente: no recalculado ni autenticado. Las cifras declaradas en el JSON no son una cotización ni prueba de suficiencia de fuentes. No se envían ni guardan datos.</p>
    <label className="grid gap-2 text-sm font-medium">Resultado JSON del calculador<textarea className="min-h-40 w-full rounded-md border bg-background p-3 font-mono text-xs focus-visible:outline-2 focus-visible:outline-primary" value={text} maxLength={1_000_000} onChange={e => { setText(e.target.value); setResult(null); setError('') }} spellCheck={false} /></label>
    <div className="flex flex-wrap gap-3"><Button onClick={review} disabled={!text.trim()}>Revisar resultado</Button><Button variant="outline" onClick={() => { setText(''); setResult(null); setError('') }}>Limpiar</Button></div>
    {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
    <div aria-live="polite"><ReviewResults result={result} /></div>
    <aside className="rounded-lg border p-4 text-sm"><h2 className="font-semibold">Antes de adoptar una base</h2><p className="mt-2 text-muted-foreground">Pendiente: verificar fuentes, asignación por activo, utilización y calibración económica. Esta vista no publica ni modifica supuestos.</p></aside>
  </div>
}

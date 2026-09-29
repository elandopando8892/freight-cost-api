'use client'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ClientApiError, fetcher, sessionExpiredEvent } from '@/lib/fetcher'
import { ReviewResults } from './benchmark-review'
import { parseReview, type ReviewResult } from './review-contract'

export function BenchmarkCalculator() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const generation = useRef(0)
  useEffect(() => {
    const clear = () => { generation.current++; setText(''); setResult(null); setPending(false) }
    window.addEventListener(sessionExpiredEvent, clear)
    return () => { generation.current++; window.removeEventListener(sessionExpiredEvent, clear) }
  }, [])
  function change(value: string) {
    generation.current++; setText(value); setResult(null); setError(''); setPending(false)
  }
  async function calculate() {
    const current = ++generation.current
    setResult(null); setError('')
    let input: unknown
    try {
      if (new TextEncoder().encode(text).length > 256_000) throw new Error()
      input = JSON.parse(text)
    } catch { setError('Introduce un JSON de inputs válido, hasta 256 KB. No pegues totales calculados.'); return }
    setPending(true)
    try {
      const response = await fetcher<unknown>('/api/v1/engine/benchmark-owned-d2d', { method: 'POST', json: input, silent: true })
      if (current !== generation.current) return
      setResult(parseReview(JSON.stringify(response)))
    } catch (e) {
      if (current !== generation.current) return
      setError(e instanceof ClientApiError && e.status === 403 ? 'Se requiere un usuario administrador u operador con organización válida.'
        : e instanceof ClientApiError && e.status === 400 ? 'Los inputs no cumplen el contrato route, fixed y trailer. Revisa campos, unidades y evidencias; no se generaron totales.'
        : 'No se pudo calcular. Verifica tu sesión, los inputs y la conexión; no se adoptó ningún importe.')
    } finally { if (current === generation.current) setPending(false) }
  }
  return <div className="grid gap-4">
    <header><p className="font-mono text-xs uppercase tracking-widest text-primary">Benchmark operativo</p><h1 className="mt-2 text-2xl font-semibold">Escenarios D2D</h1><p className="mt-2 text-sm text-muted-foreground">Remolque propio compartido · Cálculo desde inputs · No calibrado</p></header>
    <p className="rounded-lg border bg-card p-4 text-sm">El servidor recalcula CFU y CVU desde los inputs enviados con tu sesión. No guarda ni adopta bases. Las fuentes siguen pendientes de validación económica; el resultado no es una tarifa de compra o venta.</p>
    <label className="grid gap-2 text-sm font-medium">Inputs originales (JSON avanzado)<textarea className="min-h-40 w-full rounded-md border bg-background p-3 font-mono text-xs focus-visible:outline-2 focus-visible:outline-primary" value={text} onChange={e => change(e.target.value)} maxLength={256_000} spellCheck={false} /></label>
    <p className="text-sm text-muted-foreground">Incluye route, fixed y trailer con unidades y referencias documentales. No se precargan importes de ejemplo.</p>
    <div className="flex flex-wrap gap-3"><Button disabled={pending || !text.trim()} onClick={calculate}>{pending ? 'Calculando…' : 'Calcular escenarios'}</Button><Button variant="outline" onClick={() => change('')}>Limpiar</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div aria-live="polite" aria-busy={pending}>{pending ? <p>Calculando sin guardar datos…</p> : <ReviewResults result={result} calculated />}</div>
  </div>
}

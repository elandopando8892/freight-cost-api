'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Bot, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetcher } from '@/lib/fetcher'

type Focus = 'GENERAL' | 'QUOTE' | 'RATEBOOK' | 'MARKET' | 'ONBOARDING' | 'PILOT' | 'RATEWARE'
type Advice = { answer: string; model: string; mode: 'SUPERVISED_READ_ONLY'; requiresHumanReview: true; dataPolicy: 'STORE_FALSE_NO_TOOLS' }
type Usage = { policy: 'METADATA_ONLY_NO_PROMPTS_OR_OUTPUTS'; quota: { limit: number; used: number; remaining: number; allowed: boolean; windowMinutes: number }; events: Array<{ id: string; focus: string; model: string | null; inputChars: number; outputChars: number | null; latencyMs: number | null; status: 'STARTED' | 'COMPLETED' | 'FAILED' | 'REJECTED'; failureCode: string | null; createdAt: string }> }

const focuses: Array<{ value: Focus; label: string }> = [
  { value: 'GENERAL', label: 'Operación general' },
  { value: 'QUOTE', label: 'Cotización' },
  { value: 'RATEBOOK', label: 'RateBook' },
  { value: 'MARKET', label: 'Mercado y combustible' },
  { value: 'ONBOARDING', label: 'Onboarding carrier' },
  { value: 'PILOT', label: 'Piloto' },
  { value: 'RATEWARE', label: 'Integración Rateware' },
]

export function SupervisedAssistant() {
  const [focus, setFocus] = useState<Focus>('GENERAL')
  const [question, setQuestion] = useState('')
  const [advice, setAdvice] = useState<Advice | null>(null)
  const usage = useQuery({ queryKey: ['assistant-usage'], queryFn: () => fetcher<Usage>('/api/v1/assistant/usage', { silent: true }) })
  const ask = useMutation({
    mutationFn: () => fetcher<Advice>('/api/v1/assistant/advice', { method: 'POST', json: { focus, question } }),
    onSuccess: (result) => { setAdvice(result); void usage.refetch() },
  })

  return <div className="grid gap-6">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><Bot className="size-6 text-primary" /><h1 className="text-2xl font-semibold">Asistente supervisado</h1></div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Aclara el siguiente paso, pero no ejecuta operaciones. La persona responsable conserva la decisión y la acción.</p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300"><ShieldCheck className="size-4" />Solo lectura supervisada</span>
    </header>

    <Card>
      <CardHeader><CardTitle>Consulta operativa</CardTitle><CardDescription>No incluyas secretos ni datos confidenciales de clientes. El asistente no consulta tu base de datos y no modifica registros.</CardDescription></CardHeader>
      <CardContent className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium"><span>Enfoque</span><select value={focus} onChange={(event) => setFocus(event.target.value as Focus)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">{focuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-medium"><span>Qué necesitas revisar</span><textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1800} rows={6} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Ejemplo: tengo un RateBook con una versión de supuestos más reciente. ¿Qué evidencia debo revisar antes de solicitar aprobación?" /></label>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{question.length}/1800 caracteres · Solicitud sin estado (`store: false`). {usage.data ? `${usage.data.quota.remaining} de ${usage.data.quota.limit} consultas disponibles esta hora.` : 'Verificando cuota…'}</p><Button disabled={question.trim().length < 12 || ask.isPending || usage.data?.quota.allowed === false} onClick={() => ask.mutate()}>{ask.isPending ? 'Analizando…' : 'Pedir recomendación'}</Button></div>
      </CardContent>
    </Card>

    {advice && <Card aria-live="polite"><CardHeader><CardTitle>Recomendación para revisar</CardTitle><CardDescription>Modelo: {advice.model} · no se ejecutó ningún cambio.</CardDescription></CardHeader><CardContent><div className="whitespace-pre-wrap text-sm leading-6">{advice.answer}</div><p className="mt-5 border-t pt-3 text-xs text-muted-foreground">Confirma las fuentes, los supuestos y la autorización aplicable antes de publicar, enviar o entregar cualquier resultado.</p></CardContent></Card>}
    <Card><CardHeader><CardTitle>Uso y evidencia</CardTitle><CardDescription>Se registran resultado, latencia y tamaño. Nunca la pregunta ni la respuesta.</CardDescription></CardHeader><CardContent>{usage.isLoading ? <p className="text-sm text-muted-foreground">Cargando bitácora…</p> : usage.data ? <div className="grid gap-2">{usage.data.events.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay solicitudes registradas.</p> : usage.data.events.slice(0, 6).map((event) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs"><span className="font-medium">{event.focus}</span><span className="text-muted-foreground">{event.status === 'COMPLETED' ? 'Completada' : event.status === 'FAILED' ? 'No disponible' : 'En proceso'}{event.latencyMs !== null ? ` · ${event.latencyMs} ms` : ''}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No se pudo cargar la bitácora.</p>}</CardContent></Card>
  </div>
}

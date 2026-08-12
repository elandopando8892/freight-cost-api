'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, FlaskConical, Send, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { fetcher } from '@/lib/fetcher'

type Quote = { id: string; label: string | null; operation: string; service: string; freightBaselineUsd: number; lane?: { origin?: string | null; destination?: string | null } | null }
type Change = { key: string; value: number }
type Field = { key: string; section: string; label: string; unit: string; low: number | null; high: number | null; costBehavior: string; currentValue: number }
type Context = { quoteId: string; policy: 'READ_ONLY_SCENARIO_NO_PERSISTENCE'; fields: Field[] }
type Summary = { freightBaselineUsd: number; requiredTariffUsd: number; costFloorUsd: number; recommendedSellUsd: number; grossMarginPct: number }
type Delta = { absolute: number; percent: number | null }
type Scenario = { policy: 'READ_ONLY_SCENARIO_NO_PERSISTENCE'; quoteId: string; sourceChecksum: string; changes: Array<Change & { label: string; unit: string }>; baseline: Summary; proposed: Summary; delta: { requiredTariffUsd: Delta; freightBaselineUsd: Delta; costFloorUsd: Delta; recommendedSellUsd: Delta } }
type ScenarioReview = { id: string; quoteId: string; sourceChecksum: string; changes: Change[]; note: string | null; status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED'; createdAt: string; decisionNote: string | null; createdBy: { email: string }; derivedAssumptionSet: { id: string; version: number; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' } | null }
type CreateReviewResponse = { policy: 'HUMAN_REVIEW_ONLY_NO_AUTOMATIC_APPLY'; review: ScenarioReview }
type ReviewContext = { policy: 'HUMAN_REVIEW_ONLY_NO_AUTOMATIC_APPLY'; role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }

const quickFields = ['FUEL__Diesel MX', 'FUEL__Diesel US Border', 'FINANCE__Tipo de Cambio', 'TECHNICAL_MARGIN__Target Gross Margin']
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const emptyFields: Field[] = []

export function ScenarioLab({ quotes }: { quotes: Quote[] }) {
  const queryClient = useQueryClient()
  const [quoteId, setQuoteId] = useState(quotes[0]?.id ?? '')
  const [quickValues, setQuickValues] = useState<Record<string, string>>({})
  const [extraKey, setExtraKey] = useState('')
  const [extraValue, setExtraValue] = useState('')
  const [extraChanges, setExtraChanges] = useState<Change[]>([])
  const [result, setResult] = useState<Scenario | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [decisionNote, setDecisionNote] = useState('')
  const context = useQuery({ queryKey: ['scenario-context', quoteId], enabled: Boolean(quoteId), queryFn: () => fetcher<Context>(`/api/v1/scenarios/quotes/${quoteId}/context`, { silent: true }) })
  const reviews = useQuery({ queryKey: ['scenario-reviews', quoteId], enabled: Boolean(quoteId), queryFn: () => fetcher<ScenarioReview[]>(`/api/v1/scenario-reviews?quoteId=${encodeURIComponent(quoteId)}`, { silent: true }) })
  const reviewContext = useQuery({ queryKey: ['scenario-reviews-context'], queryFn: () => fetcher<ReviewContext>('/api/v1/scenario-reviews/context', { silent: true }) })
  const fields = context.data?.fields ?? emptyFields
  const fieldsByKey = useMemo(() => new Map(fields.map((field) => [field.key, field])), [fields])
  const selected = quotes.find((quote) => quote.id === quoteId)
  const quick = quickFields.map((key) => fieldsByKey.get(key)).filter((field): field is Field => Boolean(field))
  const changes = useMemo(() => {
    const fromQuick = quick.flatMap((field) => {
      const value = Number(quickValues[field.key])
      return Number.isFinite(value) && quickValues[field.key] !== '' ? [{ key: field.key, value }] : []
    })
    return [...fromQuick, ...extraChanges.filter((change) => !fromQuick.some((item) => item.key === change.key))]
  }, [extraChanges, quick, quickValues])
  const run = useMutation({ mutationFn: () => fetcher<Scenario>(`/api/v1/scenarios/quotes/${quoteId}`, { method: 'POST', json: { changes } }), onSuccess: setResult })
  const createReview = useMutation({
    mutationFn: () => fetcher<CreateReviewResponse>('/api/v1/scenario-reviews', { method: 'POST', json: { quoteId, changes: result?.changes.map(({ key, value }) => ({ key, value })) ?? [], note: reviewNote.trim() || undefined } }),
    onSuccess: () => { setReviewNote(''); void queryClient.invalidateQueries({ queryKey: ['scenario-reviews', quoteId] }) },
  })
  const submitReview = useMutation({
    mutationFn: (id: string) => fetcher<ScenarioReview>(`/api/v1/scenario-reviews/${id}/submit`, { method: 'POST' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['scenario-reviews', quoteId] }),
  })
  const decideReview = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) => fetcher<ScenarioReview>(`/api/v1/scenario-reviews/${id}/${action}`, { method: 'POST', json: { note: decisionNote.trim() } }),
    onSuccess: () => { setDecisionNote(''); void queryClient.invalidateQueries({ queryKey: ['scenario-reviews', quoteId] }) },
  })
  const createAssumptionDraft = useMutation({
    mutationFn: (id: string) => fetcher<{ version: { id: string; version: number; status: 'DRAFT' } }>(`/api/v1/scenario-reviews/${id}/assumption-version`, { method: 'POST', json: {} }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['scenario-reviews', quoteId] }),
  })
  const addExtra = () => {
    const value = Number(extraValue)
    if (!extraKey || !Number.isFinite(value)) return
    setExtraChanges((current) => [...current.filter((change) => change.key !== extraKey), { key: extraKey, value }])
    setExtraKey('')
    setExtraValue('')
  }
  const changeQuote = (id: string) => { setQuoteId(id); setQuickValues({}); setExtraChanges([]); setExtraKey(''); setExtraValue(''); setResult(null); setReviewNote(''); setDecisionNote('') }

  return <div className="grid gap-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2"><FlaskConical className="size-6 text-primary" /><h1 className="text-2xl font-semibold">Scenario Lab</h1></div><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Compara un what-if contra una cotización con snapshot reproducible antes de cambiar supuestos o publicar un RateBook.</p></div><span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300"><ShieldCheck className="size-4" />Sin persistencia</span></header>
    <Card><CardHeader><CardTitle>Escenario propuesto</CardTitle><CardDescription>La cotización original, sus supuestos y su RateBook no cambian. Solo se calcula una alternativa en memoria usando sus propios parámetros snapshot.</CardDescription></CardHeader><CardContent className="grid gap-4">
      <label className="grid gap-1.5 text-sm font-medium"><span>Cotización origen</span><select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={quoteId} onChange={(event) => changeQuote(event.target.value)}><option value="">Selecciona una cotización</option>{quotes.map((quote) => <option key={quote.id} value={quote.id}>{quote.label ?? quote.id.slice(0, 8)} · {quote.lane?.origin ?? 'Origen'} → {quote.lane?.destination ?? 'Destino'} · {usd.format(quote.freightBaselineUsd)}</option>)}</select></label>
      {selected && <p className="text-xs text-muted-foreground">{selected.operation} · {selected.service} · baseline guardado: {usd.format(selected.freightBaselineUsd)}</p>}
      {context.isLoading ? <p className="text-sm text-muted-foreground">Cargando parámetros del snapshot…</p> : context.data ? <><div className="grid gap-3 sm:grid-cols-2">{quick.map((field) => <FieldInput key={field.key} field={field} value={quickValues[field.key] ?? ''} onChange={(value) => setQuickValues((current) => ({ ...current, [field.key]: value }))} />)}</div><div className="rounded-md border p-3"><p className="text-sm font-medium">Agregar cualquier parámetro del snapshot</p><p className="mt-1 text-xs text-muted-foreground">Disponibles: {fields.length}. Solo se aceptan variables que existían en esta cotización, con su valor original y unidad visibles.</p><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_160px_auto]"><select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={extraKey} onChange={(event) => setExtraKey(event.target.value)}><option value="">Selecciona un parámetro</option>{Object.entries(groupBySection(fields)).map(([section, items]) => <optgroup key={section} label={section}>{items.map((field) => <option key={field.key} value={field.key}>{field.label} · actual {field.currentValue} {field.unit}</option>)}</optgroup>)}</select><Input type="number" step="any" value={extraValue} onChange={(event) => setExtraValue(event.target.value)} placeholder={extraKey ? String(fieldsByKey.get(extraKey)?.currentValue ?? '') : 'Nuevo valor'} /><Button variant="outline" disabled={!extraKey || extraValue === ''} onClick={addExtra}>Agregar</Button></div>{extraChanges.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{extraChanges.map((change) => { const field = fieldsByKey.get(change.key); return <span key={change.key} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">{field?.label ?? change.key}: {change.value} {field?.unit}<button type="button" aria-label={`Quitar ${field?.label ?? change.key}`} onClick={() => setExtraChanges((current) => current.filter((item) => item.key !== change.key))}><X className="size-3" /></button></span> })}</div>}</div></> : <p className="text-sm text-destructive">La cotización no tiene un snapshot reproducible para simular.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{changes.length} cambio(s) propuesto(s) · requiere decisión humana para convertirlos en cambio real.</p><Button disabled={!quoteId || changes.length === 0 || run.isPending || !context.data} onClick={() => run.mutate()}>{run.isPending ? 'Calculando…' : 'Comparar escenario'}</Button></div>
    </CardContent></Card>
    {result && <Card aria-live="polite"><CardHeader><CardTitle>Impacto estimado</CardTitle><CardDescription>Resultado de simulación; no es una nueva cotización ni una autorización de publicación.</CardDescription></CardHeader><CardContent className="grid gap-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Tarifa requerida" baseline={result.baseline.requiredTariffUsd} proposed={result.proposed.requiredTariffUsd} delta={result.delta.requiredTariffUsd} /><Metric label="Costo piso" baseline={result.baseline.costFloorUsd} proposed={result.proposed.costFloorUsd} delta={result.delta.costFloorUsd} /><Metric label="Venta recomendada" baseline={result.baseline.recommendedSellUsd} proposed={result.proposed.recommendedSellUsd} delta={result.delta.recommendedSellUsd} /><Metric label="Baseline" baseline={result.baseline.freightBaselineUsd} proposed={result.proposed.freightBaselineUsd} delta={result.delta.freightBaselineUsd} /></div><div className="rounded-md border border-primary/20 bg-primary/5 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium">Convertir en paquete de revisión</p><p className="mt-1 max-w-2xl text-xs text-muted-foreground">Guarda comparación, variables y checksum como evidencia. No modifica supuestos, cotización ni RateBook.</p></div><ClipboardCheck className="size-5 text-primary" /></div><Input className="mt-3" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Nota para el revisor (opcional)" maxLength={2000} /><div className="mt-3 flex justify-end"><Button variant="outline" disabled={createReview.isPending} onClick={() => createReview.mutate()}>{createReview.isPending ? 'Guardando…' : 'Crear paquete DRAFT'}</Button></div></div></CardContent></Card>}
    <Card><CardHeader><CardTitle>Paquetes de revisión</CardTitle><CardDescription>Una aprobación documenta una decisión humana; todavía no aplica cambios ni publica un tarifario.</CardDescription></CardHeader><CardContent className="grid gap-3">{reviews.isLoading ? <p className="text-sm text-muted-foreground">Cargando paquetes…</p> : reviews.data?.length ? reviews.data.map((review) => <div key={review.id} className="rounded-md border p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="text-sm font-medium">{review.status.replace('_', ' ')}</span><span className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleString()}</span></div><p className="mt-1 text-xs text-muted-foreground">{review.changes.length} variable(s) · checksum {review.sourceChecksum.slice(0, 12)}… · solicitado por {review.createdBy.email}</p>{review.note && <p className="mt-2 text-sm">{review.note}</p>}{review.decisionNote && <p className="mt-2 text-sm text-muted-foreground">Decisión: {review.decisionNote}</p>}</div>{review.status === 'DRAFT' && <Button size="sm" variant="outline" disabled={submitReview.isPending} onClick={() => submitReview.mutate(review.id)}><Send className="mr-1 size-3.5" />Enviar a revisión</Button>}</div>{review.status === 'UNDER_REVIEW' && reviewContext.data?.role === 'ADMIN' && <div className="mt-3 flex flex-wrap gap-2 border-t pt-3"><Input className="max-w-md" value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Motivo de decisión (mín. 3 caracteres)" maxLength={2000} /><Button size="sm" disabled={decisionNote.trim().length < 3 || decideReview.isPending} onClick={() => decideReview.mutate({ id: review.id, action: 'approve' })}>Aprobar revisión</Button><Button size="sm" variant="outline" disabled={decisionNote.trim().length < 3 || decideReview.isPending} onClick={() => decideReview.mutate({ id: review.id, action: 'reject' })}>Rechazar</Button></div>}{review.status === 'APPROVED' && <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">{review.derivedAssumptionSet ? <Link className="text-sm font-medium text-primary underline underline-offset-2" href={`/assumptions/${review.derivedAssumptionSet.id}`}>Abrir versión DRAFT v{review.derivedAssumptionSet.version}</Link> : reviewContext.data?.role === 'ADMIN' ? <Button size="sm" disabled={createAssumptionDraft.isPending} onClick={() => createAssumptionDraft.mutate(review.id)}>Crear versión DRAFT de supuestos</Button> : <span className="text-xs text-muted-foreground">Un administrador debe crear la versión DRAFT.</span>}<span className="text-xs text-muted-foreground">No se publica ni activa automáticamente.</span></div>}</div>) : <p className="text-sm text-muted-foreground">Aún no hay paquetes para esta cotización.</p>}</CardContent></Card>
  </div>
}

function FieldInput({ field, value, onChange }: { field: Field; value: string; onChange: (value: string) => void }) { return <label className="grid gap-1.5 text-sm font-medium"><span>{field.label}</span><Input type="number" step="any" value={value} onChange={(event) => onChange(event.target.value)} placeholder={String(field.currentValue)} /><span className="text-xs font-normal text-muted-foreground">Actual: {field.currentValue} {field.unit} · deja vacío para conservar el snapshot</span></label> }
function groupBySection(fields: Field[]) { return fields.reduce<Record<string, Field[]>>((groups, field) => { (groups[field.section] ??= []).push(field); return groups }, {}) }
function Metric({ label, baseline, proposed, delta }: { label: string; baseline: number; proposed: number; delta: Delta }) { return <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{usd.format(proposed)}</p><p className="mt-1 text-xs text-muted-foreground">Antes: {usd.format(baseline)} · <span className={delta.absolute > 0 ? 'text-rose-600' : delta.absolute < 0 ? 'text-emerald-600' : ''}>{delta.absolute >= 0 ? '+' : ''}{usd.format(delta.absolute)}{delta.percent === null ? '' : ` (${delta.percent >= 0 ? '+' : ''}${delta.percent.toFixed(1)}%)`}</span></p></div> }

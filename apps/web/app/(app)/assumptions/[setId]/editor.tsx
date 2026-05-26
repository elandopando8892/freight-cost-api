'use client'

import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export interface Param {
  id: string
  section: string
  field: string
  value: number
  unit: string
  low: number | null
  high: number | null
  recommended: number | null
  recommendedLow: number | null
  recommendedHigh: number | null
  outOfRange: boolean
}
export type Grouped = Record<string, Param[]>

interface Warning { section: string; field: string; value: number; low: number | null; high: number | null; message: string }

const key = (p: { section: string; field: string }) => `${p.section}__${p.field}`
const fmt = (n: number) => Number.isInteger(n) ? String(n) : String(+n.toFixed(6))

export function Editor({ setId, initial, sections }: { setId: string; initial: Grouped; sections: string[] }) {
  const [data, setData] = useState<Grouped>(initial)
  const [pending, setPending] = useState<Record<string, number>>({})
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [error, setError] = useState<string | null>(null)

  const pendingCount = Object.keys(pending).length

  const save = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(pending).map(([k, value]) => {
        const [section, ...rest] = k.split('__')
        return { section, field: rest.join('__'), value }
      })
      const res = await fetch(`/api/v1/assumptions/sets/${setId}/params`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? `Save failed (${res.status})`)
      return (await res.json()) as { params: Grouped; warnings: Warning[] }
    },
    onSuccess: (result) => {
      setData(result.params)
      setPending({})
      setWarnings(result.warnings ?? [])
      setError(null)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Save failed'),
  })

  const resetAll = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/assumptions/sets/${setId}/params/reset`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error(`Reset failed (${res.status})`)
      return (await res.json()) as Grouped
    },
    onSuccess: (result) => { setData(result); setPending({}); setWarnings([]); setError(null) },
    onError: (e) => setError(e instanceof Error ? e.message : 'Reset failed'),
  })

  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur">
        <div className="text-sm">
          {pendingCount === 0 ? (
            <span className="text-muted-foreground">No pending changes.</span>
          ) : (
            <span className="font-medium">{pendingCount} pending change{pendingCount === 1 ? '' : 's'}</span>
          )}
          {error && <span className="ml-3 text-destructive">· {error}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPending({})} disabled={pendingCount === 0 || save.isPending}>
            Discard
          </Button>
          <Button variant="outline" size="sm" onClick={() => { if (confirm('Reset ALL params to recommended values?')) resetAll.mutate() }} disabled={resetAll.isPending || save.isPending}>
            {resetAll.isPending ? 'Resetting…' : 'Reset all to recommended'}
          </Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={pendingCount === 0 || save.isPending}>
            {save.isPending ? 'Saving…' : `Save ${pendingCount || ''}`.trim()}
          </Button>
        </div>
      </div>

      {warnings.length > 0 && (
        <Card className="mb-4 border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{warnings.length} value{warnings.length === 1 ? '' : 's'} outside recommended range</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm text-muted-foreground">
            {warnings.map((w) => (
              <div key={`${w.section}__${w.field}`}>
                <span className="font-medium text-foreground">{w.section} · {w.field}</span> → {w.value}: {w.message}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {sections.map((section) => {
          const rows = data[section] ?? []
          if (rows.length === 0) return null
          return (
            <SectionCard
              key={section}
              section={section}
              rows={rows}
              pending={pending}
              onChange={(k, v) => setPending((p) => ({ ...p, [k]: v }))}
              onReset={(k, recommended) => setPending((p) => ({ ...p, [k]: recommended }))}
              onUndo={(k) => setPending((p) => { const { [k]: _, ...rest } = p; return rest })}
            />
          )
        })}
      </div>
    </>
  )
}

function SectionCard({
  section, rows, pending, onChange, onReset, onUndo,
}: {
  section: string
  rows: Param[]
  pending: Record<string, number>
  onChange: (key: string, value: number) => void
  onReset: (key: string, recommended: number) => void
  onUndo: (key: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{section}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {rows.map((p) => <Row key={p.id} p={p} pending={pending} onChange={onChange} onReset={onReset} onUndo={onUndo} />)}
      </CardContent>
    </Card>
  )
}

function Row({
  p, pending, onChange, onReset, onUndo,
}: {
  p: Param
  pending: Record<string, number>
  onChange: (key: string, value: number) => void
  onReset: (key: string, recommended: number) => void
  onUndo: (key: string) => void
}) {
  const k = key(p)
  const displayValue = useMemo(() => (k in pending ? pending[k] : p.value), [k, pending, p.value])
  const modified = k in pending
  const lo = p.recommendedLow ?? p.low
  const hi = p.recommendedHigh ?? p.high
  const out = isOutOfRange(displayValue, lo, hi)

  return (
    <div className={`grid grid-cols-[1fr_180px_220px_90px] items-center gap-3 rounded-md border px-3 py-2 text-sm ${modified ? 'border-blue-500/40 bg-blue-50/30 dark:bg-blue-950/20' : ''}`}>
      <div className="min-w-0">
        <div className="truncate font-medium">{p.field}</div>
        <div className="truncate text-xs text-muted-foreground">{p.unit}</div>
      </div>
      <Input
        type="number" step="any"
        value={Number.isFinite(displayValue) ? displayValue : ''}
        onChange={(e) => onChange(k, e.target.value === '' ? NaN : Number(e.target.value))}
        className={out ? 'border-amber-500/60' : ''}
      />
      <div className="text-xs text-muted-foreground">
        <div>
          recommended <span className="font-medium text-foreground">{p.recommended != null ? fmt(p.recommended) : '—'}</span>
          {out && <span className="ml-2 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">out of range</span>}
        </div>
        <div>range {lo ?? '—'} … {hi ?? '—'}</div>
      </div>
      <div className="flex justify-end gap-1">
        {modified && (
          <button type="button" onClick={() => onUndo(k)} className="text-xs text-muted-foreground hover:text-foreground">undo</button>
        )}
        {p.recommended != null && (
          <button
            type="button"
            onClick={() => onReset(k, p.recommended as number)}
            className="text-xs text-muted-foreground hover:text-foreground"
            title="Reset to recommended"
          >
            reset
          </button>
        )}
      </div>
    </div>
  )
}

function isOutOfRange(v: number, lo: number | null, hi: number | null): boolean {
  if (!Number.isFinite(v)) return false
  if (lo != null && v < lo) return true
  if (hi != null && v > hi) return true
  return false
}

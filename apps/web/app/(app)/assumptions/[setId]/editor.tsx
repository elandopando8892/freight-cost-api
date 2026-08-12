'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { fetcher } from '@/lib/fetcher'

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

export function Editor({ setId, initial, sections, readOnly = false }: { setId: string; initial: Grouped; sections: string[]; readOnly?: boolean }) {
  const [data, setData] = useState<Grouped>(initial)
  const [pending, setPending] = useState<Record<string, number>>({})
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [search, setSearch] = useState('')

  const pendingCount = Object.keys(pending).length
  const q = search.trim().toLowerCase()
  const matches = (p: Param) =>
    q === '' || p.field.toLowerCase().includes(q) || p.unit.toLowerCase().includes(q)

  // Warn before closing tab / refresh when there are pending edits. (In-app navigation
  // can't be intercepted in App Router without custom Link wrappers — covered by
  // the sticky Save bar + the pendingCount badge.)
  useEffect(() => {
    if (pendingCount === 0) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = '' // required for the native prompt in some browsers
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [pendingCount])

  const save = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(pending).map(([k, value]) => {
        const [section, ...rest] = k.split('__')
        return { section, field: rest.join('__'), value }
      })
      return fetcher<{ params: Grouped; warnings: Warning[] }>(`/api/v1/assumptions/sets/${setId}/params`, {
        method: 'PATCH', json: updates,
      })
    },
    onSuccess: (result) => {
      const n = Object.keys(pending).length
      setData(result.params)
      setPending({})
      setWarnings(result.warnings ?? [])
      if ((result.warnings ?? []).length > 0) {
        toast.warning(`Saved ${n} change${n === 1 ? '' : 's'} — ${result.warnings.length} value${result.warnings.length === 1 ? '' : 's'} outside recommended range`)
      } else {
        toast.success(`Saved ${n} change${n === 1 ? '' : 's'}`)
      }
    },
  })

  const resetAll = useMutation({
    mutationFn: () => fetcher<Grouped>(`/api/v1/assumptions/sets/${setId}/params/reset`, { method: 'POST', json: {} }),
    onSuccess: (result) => { setData(result); setPending({}); setWarnings([]); toast.success('All params reset to recommended values') },
  })

  // Cmd/Ctrl+S saves pending edits. (Declared after `save` so it's in scope.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!readOnly && pendingCount > 0 && !save.isPending) save.mutate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingCount, readOnly, save])

  // Per-section counts for the side nav: pending edits + out-of-range params + matches.
  const sectionStats = useMemo(() => {
    const out: Record<string, { rows: number; pending: number; outOfRange: number; matched: number }> = {}
    for (const s of sections) {
      const rows = data[s] ?? []
      out[s] = {
        rows: rows.length,
        pending: Object.keys(pending).filter((k) => k.startsWith(`${s}__`)).length,
        outOfRange: rows.filter((p) => p.outOfRange).length,
        matched: q === '' ? rows.length : rows.filter(matches).length,
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, data, pending, q])

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-start">
      {/* Side nav — desktop only */}
      <aside className="hidden lg:sticky lg:top-4 lg:block lg:self-start">
        <nav className="grid gap-0.5 rounded-md border bg-card p-2 text-sm">
          <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sections
          </div>
          {sections.map((s) => {
            const st = sectionStats[s]
            if (!st || st.rows === 0) return null
            const hidden = q !== '' && st.matched === 0
            return (
              <a
                key={s} href={`#${s}`}
                aria-disabled={hidden || undefined}
                className={`group flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-accent ${hidden ? 'opacity-40' : ''}`}
              >
                <span className="truncate">{s}</span>
                <span className="flex shrink-0 items-center gap-1 text-[10px]">
                  {st.pending > 0 && (
                    <span
                      className="rounded-full bg-blue-500/15 px-1.5 py-0.5 font-medium text-blue-700 dark:text-blue-400"
                      title={`${st.pending} pending edit${st.pending === 1 ? '' : 's'}`}
                    >
                      {st.pending}
                    </span>
                  )}
                  {st.outOfRange > 0 && (
                    <span
                      className="rounded-full bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-700 dark:text-amber-400"
                      title={`${st.outOfRange} out-of-range param${st.outOfRange === 1 ? '' : 's'}`}
                    >
                      {st.outOfRange}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {q !== '' ? `${st.matched}/${st.rows}` : st.rows}
                  </span>
                </span>
              </a>
            )
          })}
        </nav>
      </aside>

      <div>
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3 text-sm">
          {readOnly ? (
            <span className="font-medium text-muted-foreground">Read-only published version.</span>
          ) : pendingCount === 0 ? (
            <span className="text-muted-foreground">No pending changes.</span>
          ) : (
            <span className="font-medium">{pendingCount} pending change{pendingCount === 1 ? '' : 's'}</span>
          )}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter params…"
            className="h-8 w-48"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPending({})} disabled={readOnly || pendingCount === 0 || save.isPending}>
            Discard
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="outline" size="sm" disabled={readOnly || resetAll.isPending || save.isPending}>
                  {resetAll.isPending ? 'Resetting…' : 'Reset all to recommended'}
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset every param to recommended?</AlertDialogTitle>
                <AlertDialogDescription>
                  This overwrites every value in this assumption set with the V3.0 recommended default. Other carriers
                  &lsquo; sets are not affected, but this set&rsquo;s edits will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => resetAll.mutate()}>Reset all</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" onClick={() => save.mutate()} disabled={readOnly || pendingCount === 0 || save.isPending} title="Save (⌘S / Ctrl+S)">
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
        {q !== '' && (
          <div className="text-xs text-muted-foreground">
            Filtering by &ldquo;{search}&rdquo; — showing matching params only.
            {' '}
            <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => setSearch('')}>
              clear
            </button>
          </div>
        )}
        {sections.map((section) => {
          const rows = (data[section] ?? []).filter(matches)
          if (rows.length === 0) return null
          return (
            <SectionCard
              key={section}
              section={section}
              rows={rows}
              pending={pending}
              onChange={(k, v) => setPending((p) => ({ ...p, [k]: v }))}
              onReset={(k, recommended) => setPending((p) => ({ ...p, [k]: recommended }))}
              onUndo={(k) => setPending((p) => Object.fromEntries(Object.entries(p).filter(([entryKey]) => entryKey !== k)))}
              readOnly={readOnly}
            />
          )
        })}
      </div>
      </div>
    </div>
  )
}

function SectionCard({
  section, rows, pending, onChange, onReset, onUndo, readOnly,
}: {
  section: string
  rows: Param[]
  pending: Record<string, number>
  onChange: (key: string, value: number) => void
  onReset: (key: string, recommended: number) => void
  onUndo: (key: string) => void
  readOnly: boolean
}) {
  return (
    <Card id={section} className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="text-base">{section}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {rows.map((p) => <Row key={p.id} p={p} pending={pending} onChange={onChange} onReset={onReset} onUndo={onUndo} readOnly={readOnly} />)}
      </CardContent>
    </Card>
  )
}

function Row({
  p, pending, onChange, onReset, onUndo, readOnly,
}: {
  p: Param
  pending: Record<string, number>
  onChange: (key: string, value: number) => void
  onReset: (key: string, recommended: number) => void
  onUndo: (key: string) => void
  readOnly: boolean
}) {
  const k = key(p)
  const displayValue = useMemo(() => (k in pending ? pending[k] : p.value), [k, pending, p.value])
  const modified = k in pending
  const lo = p.recommendedLow ?? p.low
  const hi = p.recommendedHigh ?? p.high
  const out = isOutOfRange(displayValue, lo, hi)

  return (
    <div className={`grid grid-cols-1 gap-2 rounded-md border px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)_auto] sm:items-center sm:gap-3 ${modified ? 'border-blue-500/40 bg-blue-50/30 dark:bg-blue-950/20' : ''}`}>
      <div className="min-w-0">
        <div className="truncate font-medium">{p.field}</div>
        <div className="truncate text-xs text-muted-foreground">{p.unit}</div>
      </div>
      <Input
        type="number" step="any"
        value={Number.isFinite(displayValue) ? displayValue : ''}
        onChange={(e) => onChange(k, e.target.value === '' ? NaN : Number(e.target.value))}
        className={out ? 'border-amber-500/60' : ''}
        disabled={readOnly}
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
        {!readOnly && p.recommended != null && (
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

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
  const invalidPendingCount = Object.values(pending).filter((value) => !Number.isFinite(value)).length
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
        toast.warning(`Se guardaron ${n} cambios · ${result.warnings.length} valores fuera del rango recomendado`)
      } else {
        toast.success(`Se guardaron ${n} cambios`)
      }
    },
  })

  const resetAll = useMutation({
    mutationFn: () => fetcher<Grouped>(`/api/v1/assumptions/sets/${setId}/params/reset`, { method: 'POST', json: {} }),
    onSuccess: (result) => { setData(result); setPending({}); setWarnings([]); toast.success('Todos los parámetros volvieron al valor recomendado') },
  })

  // Cmd/Ctrl+S saves pending edits. (Declared after `save` so it's in scope.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!readOnly && pendingCount > 0 && invalidPendingCount === 0 && !save.isPending) save.mutate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [invalidPendingCount, pendingCount, readOnly, save])

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
    <div className="grid gap-3 lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start">
      {/* Side nav — desktop only */}
      <aside className="hidden lg:sticky lg:top-16 lg:block lg:self-start">
        <nav aria-label="Secciones de parámetros" className="grid gap-0.5 rounded-md border bg-card p-2 text-xs">
          <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Secciones
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
                      title={`${st.pending} cambios pendientes`}
                    >
                      {st.pending}
                    </span>
                  )}
                  {st.outOfRange > 0 && (
                    <span
                      className="rounded-full bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-700 dark:text-amber-400"
                      title={`${st.outOfRange} parámetros fuera de rango`}
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

      <div className="min-w-0">
      <div className="sticky top-12 z-10 -mx-2 mb-3 flex flex-wrap items-center justify-between gap-2 border-b bg-background/90 px-2 py-2 backdrop-blur">
        <div className="flex items-center gap-3 text-sm" aria-live="polite">
          {readOnly ? (
            <span className="font-medium text-muted-foreground">Versión publicada de solo lectura.</span>
          ) : invalidPendingCount > 0 ? (
            <span className="font-medium text-destructive">Completa {invalidPendingCount} {invalidPendingCount === 1 ? 'valor requerido' : 'valores requeridos'}.</span>
          ) : pendingCount === 0 ? (
            <span className="text-muted-foreground">Sin cambios pendientes.</span>
          ) : (
            <span className="font-medium">{pendingCount} {pendingCount === 1 ? 'cambio pendiente' : 'cambios pendientes'}</span>
          )}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar parámetro…"
            aria-label="Buscar parámetros"
            className="h-8 w-44"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPending({})} disabled={readOnly || pendingCount === 0 || save.isPending}>
            Descartar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="outline" size="sm" disabled={readOnly || resetAll.isPending || save.isPending}>
                  {resetAll.isPending ? 'Restableciendo…' : 'Usar recomendados'}
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Restablecer todos los parámetros?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esto reemplazará cada valor de esta versión por el recomendado del catálogo V3.0. No afectará otras
                  bases, pero se perderán los cambios de esta versión.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => resetAll.mutate()}>Restablecer todo</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" onClick={() => save.mutate()} disabled={readOnly || pendingCount === 0 || invalidPendingCount > 0 || save.isPending} title="Guardar (⌘S / Ctrl+S)">
            {save.isPending ? 'Guardando…' : `Guardar ${pendingCount || ''}`.trim()}
          </Button>
        </div>
      </div>

      {warnings.length > 0 && (
        <Card className="mb-4 border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{warnings.length} {warnings.length === 1 ? 'valor fuera' : 'valores fuera'} del rango recomendado</CardTitle>
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

      <div className="grid gap-3">
        {q !== '' && (
          <div className="text-xs text-muted-foreground">
            Filtrando por &ldquo;{search}&rdquo; · sólo se muestran coincidencias.
            {' '}
            <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => setSearch('')}>
              Limpiar
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
    <Card id={section} className="scroll-mt-28 overflow-hidden">
      <CardHeader className="flex-row items-center justify-between border-b px-3 py-2">
        <CardTitle className="text-sm">{section}</CardTitle>
        <span className="text-[11px] text-muted-foreground">{rows.length} parámetros</span>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[740px] table-fixed text-left text-xs">
          <thead className="bg-muted/45 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="w-[29%] px-3 py-2 font-medium">Parámetro</th>
              <th scope="col" className="w-[18%] px-3 py-2 font-medium">Valor actual</th>
              <th scope="col" className="w-[16%] px-3 py-2 font-medium">Recomendado</th>
              <th scope="col" className="w-[18%] px-3 py-2 font-medium">Rango</th>
              <th scope="col" className="w-[11%] px-3 py-2 font-medium">Estado</th>
              <th scope="col" className="w-[8%] px-3 py-2 text-right font-medium">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => <Row key={p.id} p={p} pending={pending} onChange={onChange} onReset={onReset} onUndo={onUndo} readOnly={readOnly} />)}
          </tbody>
        </table>
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
  const displayValue = k in pending ? pending[k] : p.value
  const modified = k in pending
  const lo = p.recommendedLow ?? p.low
  const hi = p.recommendedHigh ?? p.high
  const invalid = modified && !Number.isFinite(displayValue)
  const out = isOutOfRange(displayValue, lo, hi)

  return (
    <tr className={modified ? 'bg-blue-50/55 dark:bg-blue-950/20' : 'hover:bg-muted/20'}>
      <th scope="row" className="px-3 py-2 font-medium">
        <span className="block truncate" title={p.field}>{p.field}</span>
        <span className="block truncate text-[11px] font-normal text-muted-foreground">{p.unit}</span>
      </th>
      <td className="px-3 py-1.5">
        <Input
          type="number"
          step="any"
          value={Number.isFinite(displayValue) ? displayValue : ''}
          onChange={(e) => onChange(k, e.target.value === '' ? NaN : Number(e.target.value))}
          aria-label={`${p.field} (${p.unit})`}
          aria-invalid={invalid || undefined}
          className={`h-8 w-full font-mono text-xs ${invalid ? 'border-destructive' : out ? 'border-amber-500/60' : ''}`}
          disabled={readOnly}
        />
      </td>
      <td className="px-3 py-2 font-mono text-foreground">{p.recommended != null ? fmt(p.recommended) : '—'}</td>
      <td className="px-3 py-2 font-mono text-muted-foreground">{formatRange(lo, hi)}</td>
      <td className="px-3 py-2">
        {invalid ? (
          <span className="rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive">Requerido</span>
        ) : out ? (
          <span className="rounded-full bg-amber-500/12 px-2 py-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">Fuera de rango</span>
        ) : modified ? (
          <span className="rounded-full bg-blue-500/12 px-2 py-1 text-[10px] font-medium text-blue-700 dark:text-blue-400">Modificado</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">En rango</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {modified ? (
          <button type="button" onClick={() => onUndo(k)} className="text-[11px] font-medium text-muted-foreground hover:text-foreground">
            Deshacer
          </button>
        ) : !readOnly && p.recommended != null ? (
          <button
            type="button"
            onClick={() => onReset(k, p.recommended as number)}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
            title="Usar valor recomendado"
          >
            Usar
          </button>
        ) : null}
      </td>
    </tr>
  )
}

function formatRange(lo: number | null, hi: number | null): string {
  if (lo == null && hi == null) return 'Sin rango'
  if (lo == null) return `≤ ${fmt(hi as number)}`
  if (hi == null) return `≥ ${fmt(lo)}`
  return `${fmt(lo)} – ${fmt(hi)}`
}

function isOutOfRange(v: number, lo: number | null, hi: number | null): boolean {
  if (!Number.isFinite(v)) return false
  if (lo != null && v < lo) return true
  if (hi != null && v > hi) return true
  return false
}

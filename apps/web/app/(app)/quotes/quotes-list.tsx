'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { RelativeTime } from '@/components/relative-time'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { fetcher } from '@/lib/fetcher'

export interface SavedQuote {
  id: string
  label: string | null
  operation: string
  service: string
  freightBaselineUsd: number
  requiredTariffUsd: number
  requiredTariffMxn: number
  fxRateUsed: number
  calculationPolicy: 'LEGACY_UNSPECIFIED' | 'OPERATIONAL_V3' | 'WORKBOOK_V3'
  createdAt: string
  lane?: { origin?: string | null; destination?: string | null } | null
  set?: { id: string; name: string; version: number } | null
  costBase?: { id: string; code: string; name: string; scope: string } | null
}

type SortKey = 'createdAt' | 'freightBaselineUsd' | 'requiredTariffMxn'
type SortDir = 'asc' | 'desc'
type DatePreset = 'all' | '7' | '30' | '90'

const PAGE = 25
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const mxn = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const selectCls =
  'h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function CellLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <td className="p-0">
      <Link href={href} className={`block px-4 py-3 ${className ?? ''}`}>{children}</Link>
    </td>
  )
}

function laneStr(q: SavedQuote): string {
  const o = q.lane?.origin, d = q.lane?.destination
  if (!o && !d) return ''
  return `${o ?? '—'} → ${d ?? '—'}`
}

function matchesQuery(q: SavedQuote, needle: string): boolean {
  if (!needle) return true
  const hay = [q.label ?? '', q.operation, q.service, q.lane?.origin ?? '', q.lane?.destination ?? '', q.costBase?.code ?? '', q.costBase?.name ?? '', q.id.slice(0, 8)]
    .join(' ').toLowerCase()
  return hay.includes(needle)
}

function compareQuotes(a: SavedQuote, b: SavedQuote, key: SortKey, dir: SortDir): number {
  let av: number, bv: number
  if (key === 'createdAt') { av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime() }
  else { av = a[key]; bv = b[key] }
  const cmp = av < bv ? -1 : av > bv ? 1 : 0
  return dir === 'asc' ? cmp : -cmp
}

function toCsv(rows: SavedQuote[]): string {
  const header = ['When', 'Label', 'Operation', 'Service', 'Origin', 'Destination', 'Cost Base', 'Base Scope', 'Policy', 'Baseline USD', 'Required USD', 'Required MXN', 'FX', 'Set', 'Id']
  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = rows.map((q) => [
    new Date(q.createdAt).toISOString(), q.label ?? '', q.operation, q.service,
    q.lane?.origin ?? '', q.lane?.destination ?? '', q.costBase?.code ?? '', q.costBase?.scope ?? '', q.calculationPolicy,
    q.freightBaselineUsd, q.requiredTariffUsd, q.requiredTariffMxn, q.fxRateUsed,
    q.set ? `${q.set.name} v${q.set.version}` : '', q.id,
  ].map(esc).join(','))
  return [header.join(','), ...lines].join('\n')
}

function downloadCsv(rows: SavedQuote[]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `quotes-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function SortHeader({ label, sortKey, current, dir, onChange, align = 'left' }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onChange: (k: SortKey) => void; align?: 'left' | 'right'
}) {
  const active = current === sortKey
  const arrow = active ? (dir === 'asc' ? '↑' : '↓') : ''
  return (
    <th className={`px-4 py-2 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button type="button" onClick={() => onChange(sortKey)}
        className={`inline-flex items-center gap-1 transition-colors ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
        <span>{label}</span>
        <span aria-hidden className="w-2 text-xs">{arrow}</span>
      </button>
    </th>
  )
}

export function QuotesList({ initial }: { initial: SavedQuote[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [search, setSearch] = useState('')
  const [opFilter, setOpFilter] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [visible, setVisible] = useState(PAGE)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // Date threshold derived once when the user picks a preset (Date.now() in an
  // event handler keeps render pure and avoids setState-in-effect).
  const [sinceMs, setSinceMs] = useState(0)

  const operations = useMemo(() => [...new Set(items.map((q) => q.operation))].sort(), [items])
  const needle = search.trim().toLowerCase()

  const sorted = useMemo(() => {
    return items
      .filter((q) => matchesQuery(q, needle)
        && (opFilter === '' || q.operation === opFilter)
        && (sinceMs === 0 || new Date(q.createdAt).getTime() >= sinceMs))
      .sort((a, b) => compareQuotes(a, b, sortKey, sortDir))
  }, [items, needle, opFilter, sinceMs, sortKey, sortDir])

  const onDatePreset = (preset: DatePreset) => {
    setDatePreset(preset)
    setSinceMs(preset === 'all' ? 0 : Date.now() - Number(preset) * 86_400_000)
  }

  const shown = sorted.slice(0, visible)
  const filtering = needle !== '' || opFilter !== '' || datePreset !== 'all'

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir('desc') }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); return next }
      if (next.size >= 2) { toast.error('Select up to 2 quotes to compare'); return prev }
      next.add(id)
      return next
    })
  }

  const remove = useMutation({
    mutationFn: async (id: string) => { await fetcher<null>(`/api/v1/quotes/${id}`, { method: 'DELETE' }); return id },
    onSuccess: (id) => {
      setItems((prev) => prev.filter((q) => q.id !== id))
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n })
      toast.success('Quote deleted')
    },
  })

  return (
    <div className="grid gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search label, lane, operation, id…" className="h-9 w-full sm:max-w-xs" />
        <select className={selectCls} value={opFilter} onChange={(e) => setOpFilter(e.target.value)} aria-label="Filter by operation">
          <option value="">All operations</option>
          {operations.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className={selectCls} value={datePreset} onChange={(e) => onDatePreset(e.target.value as DatePreset)} aria-label="Filter by date">
          <option value="all">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {filtering ? `${sorted.length} of ${items.length}` : `${items.length} total`}
          </span>
          <Button variant="outline" size="sm" onClick={() => downloadCsv(sorted)} disabled={sorted.length === 0}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Compare bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{selected.size} selected {selected.size === 1 ? '— pick one more to compare' : ''}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
            <Button size="sm" disabled={selected.size !== 2}
              onClick={() => router.push(`/quotes/compare?ids=${[...selected].join(',')}`)}>
              Compare
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase tracking-wide">
                <tr>
                  <th className="w-8 px-2 py-2" aria-label="Select"></th>
                  <SortHeader label="When" sortKey="createdAt" current={sortKey} dir={sortDir} onChange={toggleSort} />
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Label</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Lane</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Operation</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Cost base</th>
                  <SortHeader label="Baseline" sortKey="freightBaselineUsd" current={sortKey} dir={sortDir} onChange={toggleSort} align="right" />
                  <SortHeader label="Required (MXN)" sortKey="requiredTariffMxn" current={sortKey} dir={sortDir} onChange={toggleSort} align="right" />
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">FX</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {filtering ? (
                        <>No quotes match your filters.{' '}
                          <button type="button" onClick={() => { setSearch(''); setOpFilter(''); onDatePreset('all') }}
                            className="underline underline-offset-2">Clear filters</button>
                        </>
                      ) : 'No quotes saved yet.'}
                    </td>
                  </tr>
                ) : (
                  shown.map((q) => {
                    const href = `/quotes/${q.id}`
                    const lane = laneStr(q)
                    return (
                      <tr key={q.id} className="border-b last:border-b-0 hover:bg-muted/40">
                        <td className="px-2 py-3 text-center">
                          <input type="checkbox" className="h-4 w-4 cursor-pointer align-middle accent-primary"
                            checked={selected.has(q.id)} onChange={() => toggleSelect(q.id)}
                            aria-label={`Select quote ${q.id.slice(0, 8)}`} />
                        </td>
                        <CellLink href={href} className="whitespace-nowrap text-muted-foreground">
                          <RelativeTime iso={q.createdAt} />
                        </CellLink>
                        <CellLink href={href}>
                          <div className="font-medium">{q.label ?? <span className="text-muted-foreground">— untitled</span>}</div>
                          <div className="text-xs text-muted-foreground">{q.id.slice(0, 8)}</div>
                        </CellLink>
                        <CellLink href={href} className="whitespace-nowrap">
                          {lane || <span className="text-muted-foreground">—</span>}
                        </CellLink>
                        <CellLink href={href} className="whitespace-nowrap">
                          <div>{q.operation}</div>
                          <div className="text-xs text-muted-foreground">{q.service}</div>
                        </CellLink>
                        <CellLink href={href} className="whitespace-nowrap">
                          <div>{q.costBase?.code ?? <span className="text-muted-foreground">Legacy</span>}</div>
                          <div className="text-xs text-muted-foreground">
                            {q.set ? `v${q.set.version}` : 'no version'} · {q.calculationPolicy === 'WORKBOOK_V3' ? 'Workbook' : q.calculationPolicy === 'OPERATIONAL_V3' ? 'Operational' : 'unspecified'}
                          </div>
                        </CellLink>
                        <CellLink href={href} className="whitespace-nowrap text-right font-medium">
                          {usd.format(q.freightBaselineUsd)}
                        </CellLink>
                        <CellLink href={href} className="whitespace-nowrap text-right">
                          {mxn.format(q.requiredTariffMxn)}
                        </CellLink>
                        <CellLink href={href} className="whitespace-nowrap text-right text-muted-foreground">
                          {q.fxRateUsed.toFixed(2)}
                        </CellLink>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <AlertDialog>
                            <AlertDialogTrigger render={<Button variant="ghost" size="sm" disabled={remove.isPending}>Delete</Button>} />
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this quote?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {q.label ?? 'Untitled quote'} · {q.operation} · {usd.format(q.freightBaselineUsd)}. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => remove.mutate(q.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {shown.length < sorted.length && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + PAGE)}>
            Load more ({sorted.length - shown.length} remaining)
          </Button>
        </div>
      )}
    </div>
  )
}

'use client'

import Link from 'next/link'
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
  createdAt: string
  lane?: { origin?: string | null; destination?: string | null } | null
  set?: { id: string; name: string; version: number } | null
}

type SortKey = 'createdAt' | 'freightBaselineUsd' | 'requiredTariffMxn'
type SortDir = 'asc' | 'desc'

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const mxn = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

function CellLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <td className="p-0">
      <Link href={href} className={`block px-4 py-3 ${className ?? ''}`}>
        {children}
      </Link>
    </td>
  )
}

function matchesQuery(q: SavedQuote, needle: string): boolean {
  if (!needle) return true
  const hay = [
    q.label ?? '',
    q.operation,
    q.service,
    q.lane?.origin ?? '',
    q.lane?.destination ?? '',
    q.id.slice(0, 8),
  ].join(' ').toLowerCase()
  return hay.includes(needle)
}

function compare(a: SavedQuote, b: SavedQuote, key: SortKey, dir: SortDir): number {
  let av: number, bv: number
  if (key === 'createdAt') {
    av = new Date(a.createdAt).getTime()
    bv = new Date(b.createdAt).getTime()
  } else {
    av = a[key]
    bv = b[key]
  }
  const cmp = av < bv ? -1 : av > bv ? 1 : 0
  return dir === 'asc' ? cmp : -cmp
}

function SortHeader({
  label, sortKey, current, dir, onChange, align = 'left',
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onChange: (k: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = current === sortKey
  const arrow = active ? (dir === 'asc' ? '↑' : '↓') : ''
  return (
    <th className={`px-4 py-2 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onChange(sortKey)}
        className={`inline-flex items-center gap-1 transition-colors ${
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <span>{label}</span>
        <span aria-hidden className="w-2 text-xs">{arrow}</span>
      </button>
    </th>
  )
}

export function QuotesList({ initial }: { initial: SavedQuote[] }) {
  const [items, setItems] = useState(initial)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const needle = search.trim().toLowerCase()
  const filtered = useMemo(() => items.filter((q) => matchesQuery(q, needle)), [items, needle])
  const sorted = useMemo(() => [...filtered].sort((a, b) => compare(a, b, sortKey, sortDir)), [filtered, sortKey, sortDir])

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(k)
      setSortDir(k === 'createdAt' ? 'desc' : 'desc')
    }
  }

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await fetcher<null>(`/api/v1/quotes/${id}`, { method: 'DELETE' })
      return id
    },
    onSuccess: (id) => {
      setItems((prev) => prev.filter((q) => q.id !== id))
      toast.success('Quote deleted')
    },
  })

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search label, lane, operation, id…"
          className="max-w-md"
        />
        <div className="whitespace-nowrap text-xs text-muted-foreground">
          {needle ? `${sorted.length} of ${items.length}` : `${items.length} total`}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase tracking-wide">
                <tr>
                  <SortHeader label="When" sortKey="createdAt" current={sortKey} dir={sortDir} onChange={toggleSort} />
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Label</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Operation</th>
                  <SortHeader label="Baseline" sortKey="freightBaselineUsd" current={sortKey} dir={sortDir} onChange={toggleSort} align="right" />
                  <SortHeader label="Required (MXN)" sortKey="requiredTariffMxn" current={sortKey} dir={sortDir} onChange={toggleSort} align="right" />
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">FX</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {needle ? (
                        <>
                          No quotes match <span className="font-medium text-foreground">&ldquo;{search}&rdquo;</span>.{' '}
                          <button type="button" onClick={() => setSearch('')} className="underline underline-offset-2">
                            Clear search
                          </button>
                        </>
                      ) : (
                        'No quotes saved yet.'
                      )}
                    </td>
                  </tr>
                ) : (
                  sorted.map((q) => {
                    const href = `/quotes/${q.id}`
                    return (
                      <tr key={q.id} className="border-b last:border-b-0 hover:bg-muted/40">
                        <CellLink href={href} className="whitespace-nowrap text-muted-foreground">
                          <RelativeTime iso={q.createdAt} />
                        </CellLink>
                        <CellLink href={href}>
                          <div className="font-medium">{q.label ?? <span className="text-muted-foreground">— untitled</span>}</div>
                          <div className="text-xs text-muted-foreground">{q.id.slice(0, 8)}</div>
                        </CellLink>
                        <CellLink href={href} className="whitespace-nowrap">
                          <div>{q.operation}</div>
                          <div className="text-xs text-muted-foreground">{q.service}</div>
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
                            <AlertDialogTrigger
                              render={
                                <Button variant="ghost" size="sm" disabled={remove.isPending}>Delete</Button>
                              }
                            />
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this quote?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {q.label ?? 'Untitled quote'} · {q.operation} · {usd.format(q.freightBaselineUsd)}.
                                  This cannot be undone.
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
    </div>
  )
}

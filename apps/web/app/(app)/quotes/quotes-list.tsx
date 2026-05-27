'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

export function QuotesList({ initial }: { initial: SavedQuote[] }) {
  const [items, setItems] = useState(initial)

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
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">When</th>
                <th className="px-4 py-2 text-left font-medium">Label</th>
                <th className="px-4 py-2 text-left font-medium">Operation</th>
                <th className="px-4 py-2 text-right font-medium">Baseline</th>
                <th className="px-4 py-2 text-right font-medium">Required (MXN)</th>
                <th className="px-4 py-2 text-right font-medium">FX</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => {
                const d = new Date(q.createdAt)
                const when = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                const href = `/quotes/${q.id}`
                return (
                  <tr key={q.id} className="border-b last:border-b-0 hover:bg-muted/40">
                    <CellLink href={href} className="whitespace-nowrap text-muted-foreground">
                      {when}
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
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

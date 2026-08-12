'use client'

import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { fetcher } from '@/lib/fetcher'

type ReplayResult = { reproducible: boolean; checksumMatches: boolean; outputMatches: boolean; differences: { field: string; expected: number | null; actual: number | null }[] }

export function SnapshotVerifier({ quoteId, checksum }: { quoteId: string; checksum: string }) {
  const verify = useMutation({ mutationFn: () => fetcher<ReplayResult>(`/api/v1/quotes/${quoteId}/replay`, { method: 'POST' }) })
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <code className="rounded bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">SHA-256 {checksum.slice(0, 12)}...</code>
      <Button size="sm" variant="outline" onClick={() => verify.mutate()} disabled={verify.isPending}>{verify.isPending ? 'Verificando...' : 'Verificar snapshot'}</Button>
      {verify.data && <span className={verify.data.reproducible ? 'text-emerald-700' : 'text-rose-700'}>{verify.data.reproducible ? 'Reproducible: coincide exactamente.' : `No coincide${verify.data.differences.length ? `: ${verify.data.differences.map((item) => item.field).join(', ')}` : '.'}`}</span>}
      {verify.error && <span className="text-rose-700">No se pudo verificar este snapshot.</span>}
    </div>
  )
}

import Link from 'next/link'
import type { Metadata } from 'next'
import { api, ApiError } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Comparar versiones de supuestos' }

interface SetParam { section: string; field: string; value: number; unit: string }
interface SetDetail { id: string; name: string; version: number; params: SetParam[] }

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(6)))
const pkey = (p: { section: string; field: string }) => `${p.section}__${p.field}`

export default async function DiffPage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { a: aId, b: bId } = await searchParams

  if (!aId || !bId || aId === bId) {
    return (
      <Shell>
        <Card><CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
          Select two different sets from <Link href="/assumptions" className="underline underline-offset-2">Assumptions</Link> to compare.
        </CardContent></Card>
      </Shell>
    )
  }

  let a: SetDetail, b: SetDetail
  try {
    [a, b] = await Promise.all([api<SetDetail>(`/assumptions/sets/${aId}`), api<SetDetail>(`/assumptions/sets/${bId}`)])
  } catch (err) {
    const nf = err instanceof ApiError && err.status === 404
    return (
      <Shell>
        <Card><CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
          {nf ? 'One of the sets no longer exists.' : 'Could not load the sets.'}{' '}
          <Link href="/assumptions" className="underline underline-offset-2">Back</Link>
        </CardContent></Card>
      </Shell>
    )
  }

  const aMap = new Map(a.params.map((p) => [pkey(p), p]))
  const bMap = new Map(b.params.map((p) => [pkey(p), p]))
  const keys = [...new Set([...aMap.keys(), ...bMap.keys()])]

  const diffs = keys
    .map((k) => ({ pa: aMap.get(k), pb: bMap.get(k) }))
    .filter(({ pa, pb }) => (pa?.value ?? null) !== (pb?.value ?? null))

  // group by section
  const bySection = new Map<string, { field: string; unit: string; av: number | null; bv: number | null }[]>()
  for (const { pa, pb } of diffs) {
    const section = pa?.section ?? pb?.section ?? '—'
    const row = { field: pa?.field ?? pb?.field ?? '', unit: pa?.unit ?? pb?.unit ?? '', av: pa?.value ?? null, bv: pb?.value ?? null }
    const arr = bySection.get(section) ?? []
    arr.push(row)
    bySection.set(section, arr)
  }
  const sections = [...bySection.keys()].sort()

  return (
    <Shell>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Compare assumption sets</h1>
        <span className="text-sm text-muted-foreground">
          {diffs.length === 0 ? 'No differences' : `${diffs.length} difference${diffs.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Field</th>
                  <th className="px-4 py-3 text-right">
                    <Link href={`/assumptions/${a.id}`} className="font-semibold hover:underline">{a.name}</Link>
                    <div className="text-xs font-normal text-muted-foreground">v{a.version} (A)</div>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <Link href={`/assumptions/${b.id}`} className="font-semibold hover:underline">{b.name}</Link>
                    <div className="text-xs font-normal text-muted-foreground">v{b.version} (B)</div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Δ (B−A)</th>
                </tr>
              </thead>
              <tbody>
                {diffs.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    These two sets have identical parameter values.
                  </td></tr>
                ) : (
                  sections.map((section) => (
                    <SectionRows key={section} section={section} rows={bySection.get(section)!} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-3 text-xs text-muted-foreground">
        <Link href="/assumptions" className="hover:text-foreground">Assumptions</Link>
        <span className="mx-1">/</span>
        <span>Compare</span>
      </div>
      {children}
    </main>
  )
}

function SectionRows({ section, rows }: { section: string; rows: { field: string; unit: string; av: number | null; bv: number | null }[] }) {
  return (
    <>
      <tr className="border-b bg-muted/30">
        <td colSpan={4} className="px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{section}</td>
      </tr>
      {rows.map((r) => {
        const d = r.av != null && r.bv != null ? r.bv - r.av : null
        return (
          <tr key={r.field} className="border-b last:border-b-0">
            <td className="px-4 py-2">
              <div>{r.field}</div>
              {r.unit && <div className="text-xs text-muted-foreground">{r.unit}</div>}
            </td>
            <td className="px-4 py-2 text-right tabular-nums">{r.av != null ? fmt(r.av) : '—'}</td>
            <td className="px-4 py-2 text-right tabular-nums font-medium">{r.bv != null ? fmt(r.bv) : '—'}</td>
            <td className="px-4 py-2 text-right text-xs tabular-nums text-muted-foreground">
              {d == null || d === 0 ? '' : `${d > 0 ? '+' : ''}${fmt(d)}`}
            </td>
          </tr>
        )
      })}
    </>
  )
}

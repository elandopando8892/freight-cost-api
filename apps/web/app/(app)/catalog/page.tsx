import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { CoverageCatalog, type CoverageResponse } from './coverage-catalog'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Parameter coverage' }

export default async function ParameterCoveragePage({ searchParams }: { searchParams: Promise<{ base?: string }> }) {
  const { base } = await searchParams
  const coverage = await api<CoverageResponse>('/catalog/coverage')
  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-8">
      <CoverageCatalog initial={coverage} initialBaseId={base} />
    </main>
  )
}

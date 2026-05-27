import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { AssumptionsList, type AssumptionSet } from './assumptions-list'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Assumptions' }

export default async function AssumptionsListPage() {
  const sets = await api<AssumptionSet[]>('/assumptions/sets')
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <AssumptionsList initial={sets} />
    </main>
  )
}

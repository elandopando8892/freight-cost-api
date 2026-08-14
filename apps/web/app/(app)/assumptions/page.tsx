import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { AssumptionsList, type AssumptionSet } from './assumptions-list'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Supuestos por base' }

export default async function AssumptionsListPage() {
  const [sets, user] = await Promise.all([
    api<AssumptionSet[]>('/assumptions/sets'),
    api<{ role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }>('/auth/me'),
  ])
  return (
    <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4">
      <AssumptionsList initial={sets} canEdit={user.role === 'ADMIN'} />
    </main>
  )
}

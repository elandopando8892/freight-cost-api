import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { CostBasesBoard, type CostBase } from './cost-bases-board'
import type { OperationalSegmentOption } from './cost-base-wizard'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Bases de costo' }

export default async function CostBasesPage() {
  const [bases, user, segments] = await Promise.all([
    api<CostBase[]>('/cost-bases'),
    api<{ role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }>('/auth/me'),
    api<OperationalSegmentOption[]>('/cost-bases/operational-segments'),
  ])
  return (
    <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4">
      <CostBasesBoard initial={bases} segments={segments} canEdit={user.role === 'ADMIN'} />
    </main>
  )
}

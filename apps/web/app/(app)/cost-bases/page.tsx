import type { Metadata } from 'next'
import Link from 'next/link'
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
      <nav aria-label="Modelo de bases" className="mb-5 flex flex-wrap gap-3 border-b pb-3">
        <Link aria-current="page" className="min-h-11 rounded bg-primary px-4 py-2 text-primary-foreground" href="/cost-bases">Flota propia</Link>
        <Link className="min-h-11 rounded border px-4 py-2" href="/cost-bases/partners">Tarifas de socios</Link>
        <Link className="min-h-11 rounded border px-4 py-2" href="/cost-bases/tires">Calibración de llantas</Link>
      </nav>
      <CostBasesBoard initial={bases} segments={segments} canEdit={user.role === 'ADMIN'} />
    </main>
  )
}

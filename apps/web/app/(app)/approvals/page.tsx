import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { ApprovalsBoard, type Approval } from './approvals-board'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Aprobaciones' }

export default async function ApprovalsPage() {
  const [approvals, context] = await Promise.all([
    api<Approval[]>('/approvals'),
    api<{ role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }>('/approvals/context'),
  ])
  return <main className="mx-auto w-full max-w-6xl px-4 py-8"><ApprovalsBoard initial={approvals} role={context.role} /></main>
}

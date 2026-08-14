import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { ApprovalsBoard, type Approval } from './approvals-board'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Aprobaciones' }

export default async function ApprovalsPage() {
  const [approvals, context] = await Promise.all([
    api<Approval[]>('/approvals'),
    api<{ role: 'ADMIN' | 'OPERATOR' | 'VIEWER'; userId: string; adminCount: number; singleAdminMode: boolean }>('/approvals/context'),
  ])
  return <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4"><ApprovalsBoard initial={approvals} role={context.role} currentUserId={context.userId} singleAdminMode={context.singleAdminMode} /></main>
}

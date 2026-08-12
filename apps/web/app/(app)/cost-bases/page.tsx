import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { CostBasesBoard, type CostBase } from './cost-bases-board'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Cost bases' }

export default async function CostBasesPage() {
  const bases = await api<CostBase[]>('/cost-bases')
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <CostBasesBoard initial={bases} />
    </main>
  )
}

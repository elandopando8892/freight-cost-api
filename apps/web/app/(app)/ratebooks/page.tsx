import type { Metadata } from 'next'
import Link from 'next/link'
import { api } from '@/lib/api'
import { RateBooksBoard, type CostBaseOption, type RateBook } from './ratebooks-board'
import { RateBookExports } from './ratebook-exports'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'RateBook' }

export default async function RateBooksPage() {
  const [books, bases, approvalContext] = await Promise.all([
    api<RateBook[]>('/ratebooks'),
    api<CostBaseOption[]>('/cost-bases'),
    api<{ role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }>('/approvals/context'),
  ])
  return <main className="mx-auto w-full max-w-6xl px-4 py-8"><div className="mb-4 text-right text-sm"><Link className="font-medium underline underline-offset-2" href="/ratebooks/regenerate">Revisar regeneraciones</Link></div><RateBookExports role={approvalContext.role} books={books.filter((book) => book.status === 'PUBLISHED').map((book) => ({ id: book.id, code: book.code, name: book.name }))} /><RateBooksBoard initial={books} bases={bases} role={approvalContext.role} /></main>
}

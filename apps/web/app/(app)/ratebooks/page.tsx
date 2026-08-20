import type { Metadata } from 'next'
import Link from 'next/link'
import { api } from '@/lib/api'
import { dateKeyInTimeZone } from '@/lib/civil-date'
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
  return (
    <main className="mx-auto min-w-0 w-full max-w-[1440px] px-3 py-4 sm:px-4">
      <RateBooksBoard
        initial={books}
        bases={bases}
        role={approvalContext.role}
        defaultEffectiveFrom={dateKeyInTimeZone(new Date())}
        headerActions={
          approvalContext.role === 'ADMIN' ? <Link className="rounded-md border bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent" href="/ratebooks/regenerate">
            Revisar regeneraciones
          </Link> : null
        }
      >
        <RateBookExports role={approvalContext.role} books={books.filter((book) => book.status === 'PUBLISHED').map((book) => ({ id: book.id, code: book.code, name: book.name }))} />
      </RateBooksBoard>
    </main>
  )
}

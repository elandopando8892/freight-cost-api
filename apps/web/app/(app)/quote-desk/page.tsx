import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { QuoteDesk, type CustomerQuote, type CustomerQuoteTemplate } from './quote-desk'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Quote Desk' }
export default async function QuoteDeskPage() {
  const [quotes, templates, user] = await Promise.all([
    api<CustomerQuote[]>('/customer-quotes'),
    api<CustomerQuoteTemplate[]>('/customer-quote-templates'),
    api<{ role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }>('/auth/me'),
  ])
  return <main className="mx-auto min-w-0 w-full max-w-[1440px] px-3 py-4 sm:px-4"><QuoteDesk initial={quotes} initialTemplates={templates} role={user.role} /></main>
}

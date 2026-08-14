import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { QuoteDesk, type CustomerQuote, type CustomerQuoteTemplate } from './quote-desk'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Quote Desk' }
export default async function QuoteDeskPage() {
  const [quotes, templates] = await Promise.all([
    api<CustomerQuote[]>('/customer-quotes'),
    api<CustomerQuoteTemplate[]>('/customer-quote-templates'),
  ])
  return <main className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8"><QuoteDesk initial={quotes} initialTemplates={templates} /></main>
}

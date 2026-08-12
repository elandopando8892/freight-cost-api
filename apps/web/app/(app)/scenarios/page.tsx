import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { ScenarioLab } from './scenario-lab'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Scenario Lab' }

type Quote = { id: string; label: string | null; operation: string; service: string; freightBaselineUsd: number; lane?: { origin?: string | null; destination?: string | null } | null }

export default async function ScenariosPage() {
  const quotes = await api<Quote[]>('/quotes')
  return <main className="mx-auto w-full max-w-6xl px-4 py-8"><ScenarioLab quotes={quotes} /></main>
}

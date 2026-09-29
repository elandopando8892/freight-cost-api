import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { ScenarioLab } from './scenario-lab'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Scenario Lab' }

type Quote = { id: string; label: string | null; operation: string; service: string; freightBaselineUsd: number; lane?: { origin?: string | null; destination?: string | null } | null }

export default async function ScenariosPage() {
  const quotes = await api<Quote[]>('/quotes')
  return <main className="mx-auto w-full max-w-6xl px-4 py-8"><Link className="mb-4 inline-flex min-h-11 items-center text-sm text-primary underline" href="/scenarios/benchmark">Revisar benchmark D2D · sin modificar cotizaciones →</Link><ScenarioLab quotes={quotes} /></main>
}

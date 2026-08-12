import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { CarrierOnboardingBoard, type CarrierOnboarding } from './carrier-onboarding-board'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Onboarding carrier' }

export default async function CarrierOnboardingPage() {
  const [onboarding, context] = await Promise.all([
    api<CarrierOnboarding>('/onboarding/carrier'),
    api<{ role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }>('/approvals/context'),
  ])
  return <main className="mx-auto w-full max-w-6xl px-4 py-8"><CarrierOnboardingBoard initial={onboarding} canEdit={context.role !== 'VIEWER'} /></main>
}

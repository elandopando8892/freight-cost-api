import type { Metadata } from 'next'
import Link from 'next/link'
import { api } from '@/lib/api'
import {
  TireCalibrationWorkbench,
  type TireCalibrationSummary,
} from './tire-calibration-workbench'
import type { TireReviewer } from './tire-review-actions'
import { TirePublicResearch } from './tire-public-research'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Calibración de llantas' }

export default async function TireCalibrationPage() {
  const [dossiers, user, reviewers] = await Promise.all([
    api<TireCalibrationSummary[]>('/cost-bases/tire-calibrations'),
    api<{ id: string; role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }>('/auth/me'),
    api<TireReviewer[]>('/cost-bases/tire-calibration-reviewers'),
  ])

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-3 py-4 sm:px-4">
      <nav aria-label="Modelo de bases" className="flex flex-wrap gap-3 border-b pb-3">
        <Link className="min-h-11 rounded border px-4 py-2" href="/cost-bases">Flota propia</Link>
        <Link className="min-h-11 rounded border px-4 py-2" href="/cost-bases/partners">Tarifas de socios</Link>
        <Link aria-current="page" className="min-h-11 rounded bg-primary px-4 py-2 text-primary-foreground" href="/cost-bases/tires">
          Calibración de llantas
        </Link>
      </nav>
      <TireCalibrationWorkbench initialDossiers={dossiers} role={user.role} currentUserId={user.id} reviewers={reviewers} researchPanel={<TirePublicResearch />} />
    </main>
  )
}

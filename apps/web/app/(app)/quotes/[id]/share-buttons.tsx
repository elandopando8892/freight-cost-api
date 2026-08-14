'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface MexLegSummary {
  requiredTariffUsd: number
  totalKm: number
  cycleDays: number
  rpm: number
}
interface UsaLegSummary {
  flatUsd: number
  loadedMiles: number
  rpm: number
}
interface CommercialSummary {
  costFloorUsd: number
  minSellUsd: number
  targetSellUsd: number
  premiumSellUsd: number
  recommendedSellUsd: number
  grossProfitUsd: number
  grossMarginPct: number
}

export interface QuoteSummaryProps {
  id: string
  label: string | null
  operation: string
  service: string
  createdAt: string
  freightBaselineUsd: number
  requiredTariffUsd: number
  requiredTariffMxn: number
  fxRateUsed: number
  lane: { origin: string | null; destination: string | null } | null
  set: { name: string; version: number } | null
  mexLeg: MexLegSummary | null
  usaLeg: UsaLegSummary | null
  commercial: CommercialSummary | null
}

const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const mxn0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const pct1 = (n: number) => `${(n * 100).toFixed(1)}%`

function buildSummary(q: QuoteSummaryProps, url: string): string {
  const lines: string[] = []
  lines.push(q.label ?? `Quote ${q.id.slice(0, 8)}`)
  const meta: string[] = [q.operation]
  if (q.service) meta.push(q.service)
  meta.push(`saved ${new Date(q.createdAt).toLocaleString()}`)
  lines.push(meta.join(' · '))
  if (q.lane && (q.lane.origin || q.lane.destination)) {
    lines.push(`Lane: ${q.lane.origin ?? '—'} → ${q.lane.destination ?? '—'}`)
  }
  if (q.set) lines.push(`Assumption set: ${q.set.name} (v${q.set.version})`)
  lines.push('')
  lines.push(`Freight Baseline: ${usd0.format(q.freightBaselineUsd)}`)
  lines.push(`Required (USD):   ${usd0.format(q.requiredTariffUsd)}`)
  lines.push(`Required (MXN):   ${mxn0.format(q.requiredTariffMxn)}`)
  lines.push(`FX:               ${q.fxRateUsed.toFixed(2)}`)
  if (q.commercial) lines.push(`Margin:           ${pct1(q.commercial.grossMarginPct)}`)
  lines.push('')
  if (q.mexLeg) {
    lines.push(
      `MEX leg: ${usd0.format(q.mexLeg.requiredTariffUsd)} · ${Math.round(q.mexLeg.totalKm)} km · ${q.mexLeg.cycleDays.toFixed(2)} days · RPM ${q.mexLeg.rpm.toFixed(2)}`,
    )
  }
  if (q.usaLeg) {
    lines.push(
      `USA leg: ${usd0.format(q.usaLeg.flatUsd)} · ${Math.round(q.usaLeg.loadedMiles)} mi · RPM ${q.usaLeg.rpm.toFixed(2)}`,
    )
  }
  if (q.commercial) {
    lines.push('')
    lines.push('Commercial:')
    lines.push(`  Cost floor:    ${usd0.format(q.commercial.costFloorUsd)}`)
    lines.push(`  Min (12%):     ${usd0.format(q.commercial.minSellUsd)}`)
    lines.push(`  Target (18%):  ${usd0.format(q.commercial.targetSellUsd)}`)
    lines.push(`  Premium (25%): ${usd0.format(q.commercial.premiumSellUsd)}`)
    lines.push(
      `  Recommended:   ${usd0.format(q.commercial.recommendedSellUsd)} (GP ${usd0.format(q.commercial.grossProfitUsd)}, ${pct1(q.commercial.grossMarginPct)})`,
    )
  }
  lines.push('')
  lines.push(`— ${url}`)
  return lines.join('\n')
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function ShareButtons({ quote }: { quote: QuoteSummaryProps }) {
  const [busy, setBusy] = useState<'link' | 'summary' | null>(null)

  const copyLink = async () => {
    setBusy('link')
    const url = window.location.href
    const ok = await copy(url)
    setBusy(null)
    if (ok) toast.success('Enlace copiado')
    else toast.error('No se pudo copiar el enlace')
  }

  const copySummary = async () => {
    setBusy('summary')
    const text = buildSummary(quote, window.location.href)
    const ok = await copy(text)
    setBusy(null)
    if (ok) toast.success('Resumen copiado al portapapeles')
    else toast.error('No se pudo copiar el resumen')
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={copyLink} disabled={busy !== null}>
        {busy === 'link' ? 'Copying…' : 'Copy link'}
      </Button>
      <Button variant="outline" size="sm" onClick={copySummary} disabled={busy !== null}>
        {busy === 'summary' ? 'Copying…' : 'Copy summary'}
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()} disabled={busy !== null}>
        Print / PDF
      </Button>
    </>
  )
}

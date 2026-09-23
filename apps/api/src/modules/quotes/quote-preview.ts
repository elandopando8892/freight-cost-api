import { createHash } from 'node:crypto'
import type { EngineOutput, EquipmentSpec } from '../engine/engine.types.js'
import { isQuoteCalculationSnapshot, SNAPSHOT_NUMERIC_TOLERANCE, verifyQuoteCalculationSnapshot } from './quote-snapshot.js'

export type PreviewCapture = {
  origin: string
  destination: string
  mexBorder: string
  usBorder: string
  route: string
  operation: string
  service: string
  equipment: EquipmentSpec
  fxRate: number | null
}

export type PreviewLineage = {
  costBase: { id: string; code: string; name: string; scope: string; status: string } | null
  set: { id: string; name: string; version: number; status: string; isActive: boolean } | null
  policy: string
  readiness: 'GOVERNED' | 'IN_PREPARATION' | 'LEGACY'
}

export type PreviewResult = EngineOutput & { warnings: string[] }

export function previewSaveIntentHash(previewId: string, label: string | null): string {
  return createHash('sha256').update(JSON.stringify({ previewId, label })).digest('hex')
}

export function verifiedPreviewData(preview: { capture: unknown; lineage: unknown; snapshot: unknown; result: unknown }) {
  let reproducible = false
  try {
    reproducible = isQuoteCalculationSnapshot(preview.snapshot) && verifyQuoteCalculationSnapshot(preview.snapshot).reproducible
  } catch {
    reproducible = false
  }
  if (!reproducible || !isQuoteCalculationSnapshot(preview.snapshot)) {
    throw Object.assign(new Error('La vista previa no conserva una reproducción válida. Calcula de nuevo.'), { statusCode: 409 })
  }
  const capture = preview.capture as PreviewCapture
  const lineage = preview.lineage as PreviewLineage
  const result = preview.result as PreviewResult
  const equal = (a: unknown, b: number) => typeof a === 'number' && Number.isFinite(a) && Math.abs(a - b) <= SNAPSHOT_NUMERIC_TOLERANCE
  if (!capture || !lineage || !result || result.operation !== preview.snapshot.input.operation
    || result.policy !== preview.snapshot.input.policy
    || !equal(result.freightBaselineUsd, preview.snapshot.output.freightBaselineUsd)
    || !equal(result.requiredTariffUsd, preview.snapshot.output.requiredTariffUsd)
    || !equal(result.fxRateUsed, preview.snapshot.output.fxRateUsed)
    || !equal(result.commercial?.costFloorUsd, preview.snapshot.output.costFloorUsd)
    || !equal(result.commercial?.recommendedSellUsd, preview.snapshot.output.recommendedSellUsd)
    || capture.operation !== result.operation || capture.service !== preview.snapshot.input.service) {
    throw Object.assign(new Error('La vista previa y su cálculo no coinciden. Calcula de nuevo.'), { statusCode: 409 })
  }
  return { capture, lineage, snapshot: preview.snapshot, result }
}

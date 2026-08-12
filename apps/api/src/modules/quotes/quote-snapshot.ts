import { createHash } from 'node:crypto'
import { calculate } from '../engine/engine.calculator.js'
import type { EngineInput, EngineOutput } from '../engine/engine.types.js'

export type QuoteCalculationSnapshot = {
  format: 'fcm.calculation-snapshot.v1'
  engineVersion: 'fcm-v3'
  input: Required<Pick<EngineInput, 'operation' | 'service' | 'equipment' | 'params'>> & Pick<EngineInput, 'policy' | 'fxRate' | 'mexLeg' | 'usaLeg' | 'drayageLeg'>
  output: {
    freightBaselineUsd: number
    requiredTariffUsd: number
    fxRateUsed: number
    mexTariffUsd: number | null
    usaFlatUsd: number | null
    costFloorUsd: number
    recommendedSellUsd: number
  }
  checksum: string
}

type SnapshotPayload = Omit<QuoteCalculationSnapshot, 'checksum'>

function stableParams(params: Record<string, number>) {
  return Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)))
}

function payloadFor(input: EngineInput, result: EngineOutput): SnapshotPayload {
  return {
    format: 'fcm.calculation-snapshot.v1',
    engineVersion: 'fcm-v3',
    input: {
      policy: result.policy,
      operation: input.operation,
      service: input.service,
      equipment: input.equipment,
      params: stableParams(input.params),
      ...(input.fxRate == null ? {} : { fxRate: input.fxRate }),
      ...(input.mexLeg ? { mexLeg: input.mexLeg } : {}),
      ...(input.usaLeg ? { usaLeg: input.usaLeg } : {}),
      ...(input.drayageLeg ? { drayageLeg: input.drayageLeg } : {}),
    },
    output: {
      freightBaselineUsd: result.freightBaselineUsd,
      requiredTariffUsd: result.requiredTariffUsd,
      fxRateUsed: result.fxRateUsed,
      mexTariffUsd: result.mexLeg?.requiredTariffUsd ?? null,
      usaFlatUsd: result.usaLeg?.flatUsd ?? null,
      costFloorUsd: result.commercial.costFloorUsd,
      recommendedSellUsd: result.commercial.recommendedSellUsd,
    },
  }
}

function checksum(payload: SnapshotPayload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

export function buildQuoteCalculationSnapshot(input: EngineInput, result: EngineOutput): QuoteCalculationSnapshot {
  const payload = payloadFor(input, result)
  return { ...payload, checksum: checksum(payload) }
}

export function verifyQuoteCalculationSnapshot(snapshot: QuoteCalculationSnapshot) {
  const { checksum: storedChecksum, ...payload } = snapshot
  const checksumMatches = checksum(payload) === storedChecksum
  const replay = calculate(snapshot.input)
  const expected = snapshot.output
  const actual = payloadFor(snapshot.input, replay).output
  const differences = Object.entries(expected).flatMap(([field, value]) => (
    actual[field as keyof typeof actual] === value ? [] : [{ field, expected: value, actual: actual[field as keyof typeof actual] }]
  ))
  return {
    reproducible: checksumMatches && differences.length === 0,
    checksumMatches,
    outputMatches: differences.length === 0,
    differences,
  }
}

export function isQuoteCalculationSnapshot(value: unknown): value is QuoteCalculationSnapshot {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<QuoteCalculationSnapshot>
  return candidate.format === 'fcm.calculation-snapshot.v1' && candidate.engineVersion === 'fcm-v3' && typeof candidate.checksum === 'string' && Boolean(candidate.input) && Boolean(candidate.output)
}

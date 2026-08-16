import { createHash } from 'node:crypto'
import { calculate } from '../engine/engine.calculator.js'
import type { EngineInput, EngineOutput } from '../engine/engine.types.js'

export type QuoteCalculationSnapshot = {
  format: 'fcm.calculation-snapshot.v1'
  engineVersion: 'fcm-v3' | 'fcm-v3.1-profiled'
  input: Required<Pick<EngineInput, 'operation' | 'service' | 'equipment' | 'params'>> & Pick<EngineInput, 'policy' | 'applicabilityProfile' | 'fxRate' | 'mexLeg' | 'usaLeg' | 'drayageLeg'>
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
export const CURRENT_QUOTE_ENGINE_VERSION = 'fcm-v3.1-profiled' as const
type SnapshotOutput = QuoteCalculationSnapshot['output']

export const SNAPSHOT_NUMERIC_TOLERANCE = 1e-9

function stableParams(params: Record<string, number>) {
  return Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)))
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value)
}

function stableNumber(value: number) {
  return Number(value.toFixed(9))
}

export function snapshotOutputDifferences(expected: SnapshotOutput, actual: SnapshotOutput) {
  return Object.entries(expected).flatMap(([field, expectedValue]) => {
    const actualValue = actual[field as keyof SnapshotOutput]
    if (expectedValue === null || actualValue === null) {
      return expectedValue === actualValue ? [] : [{ field, expected: expectedValue, actual: actualValue }]
    }
    return Math.abs(expectedValue - actualValue) <= SNAPSHOT_NUMERIC_TOLERANCE
      ? []
      : [{ field, expected: expectedValue, actual: actualValue }]
  })
}

function payloadFor(input: EngineInput, result: EngineOutput): SnapshotPayload {
  return {
    format: 'fcm.calculation-snapshot.v1',
    engineVersion: CURRENT_QUOTE_ENGINE_VERSION,
    input: {
      policy: result.policy,
      ...(input.applicabilityProfile ? { applicabilityProfile: input.applicabilityProfile } : {}),
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
      freightBaselineUsd: stableNumber(result.freightBaselineUsd),
      requiredTariffUsd: stableNumber(result.requiredTariffUsd),
      fxRateUsed: stableNumber(result.fxRateUsed),
      mexTariffUsd: result.mexLeg ? stableNumber(result.mexLeg.requiredTariffUsd) : null,
      usaFlatUsd: result.usaLeg ? stableNumber(result.usaLeg.flatUsd) : null,
      costFloorUsd: stableNumber(result.commercial.costFloorUsd),
      recommendedSellUsd: stableNumber(result.commercial.recommendedSellUsd),
    },
  }
}

function checksum(payload: SnapshotPayload) {
  return createHash('sha256').update(canonicalJson(payload)).digest('hex')
}

export function buildQuoteCalculationSnapshot(input: EngineInput, result: EngineOutput): QuoteCalculationSnapshot {
  const payload = payloadFor(input, result)
  return { ...payload, checksum: checksum(payload) }
}

/** Replays quote evidence with the semantics frozen by its engine version. */
export function calculateForQuoteSnapshot(
  snapshot: Pick<QuoteCalculationSnapshot, 'engineVersion' | 'input'>,
  input: EngineInput = snapshot.input,
): EngineOutput {
  const versionedInput: EngineInput = { ...input }
  delete versionedInput.compatibilityMode
  if (snapshot.engineVersion === 'fcm-v3' && (versionedInput.policy ?? 'OPERATIONAL_V3') === 'OPERATIONAL_V3') {
    versionedInput.compatibilityMode = 'LEGACY_FCM_V3'
  }
  return calculate(versionedInput)
}

export function verifyQuoteCalculationSnapshot(snapshot: QuoteCalculationSnapshot) {
  const { checksum: storedChecksum, ...payload } = snapshot
  const checksumMatches = checksum(payload) === storedChecksum
  const replay = calculateForQuoteSnapshot(snapshot)
  const expected = snapshot.output
  const actual = payloadFor(snapshot.input, replay).output
  const differences = snapshotOutputDifferences(expected, actual)
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
  return candidate.format === 'fcm.calculation-snapshot.v1'
    && (candidate.engineVersion === 'fcm-v3' || candidate.engineVersion === CURRENT_QUOTE_ENGINE_VERSION)
    && typeof candidate.checksum === 'string'
    && Boolean(candidate.input)
    && Boolean(candidate.output)
}

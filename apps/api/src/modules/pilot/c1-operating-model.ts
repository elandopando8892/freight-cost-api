import { z } from 'zod'
import { evaluateC1QuoteReadiness, type C1ReadinessBase } from './c1-quote-readiness.js'

export const C1PurposeSchema = z.enum(['FLEET_COST', 'THIRD_PARTY_PURCHASE', 'THIRD_PARTY_BENCHMARK'])
export type C1Purpose = z.infer<typeof C1PurposeSchema>

/** Model fit is separate from profile completeness and economic calibration. */
export function evaluateC1OperatingModel(rawPurpose: unknown, bases: C1ReadinessBase[]) {
  const purpose = C1PurposeSchema.parse(rawPurpose)
  const fleet = evaluateC1QuoteReadiness(bases)
  const modelMatchesPurpose = purpose === 'FLEET_COST'
  return {
    purpose,
    inspectedModel: 'FCM_OWN_FLEET_V3',
    modelMatchesPurpose,
    structuralCandidateForRequestedPurpose: modelMatchesPurpose && fleet.targetCandidateForNewCalculation,
    economicCalibrationVerified: false,
    blockers: [
      ...fleet.blockers,
      ...(!modelMatchesPurpose ? ['OPERATING_MODEL_MISMATCH'] : []),
      ...(purpose === 'THIRD_PARTY_BENCHMARK' ? ['THIRD_PARTY_BENCHMARK_ADAPTER_NOT_IMPLEMENTED'] : []),
    ],
    existingAlternative: purpose === 'THIRD_PARTY_PURCHASE' ? {
      model: 'FCM_THIRD_PARTY_FLAT_V1',
      entryPoint: '/cost-bases/partners',
      readiness: 'NOT_ASSESSED',
      requires: 'Versioned carrier purchase terms, inclusions, validity and trip FX',
    } : null,
    nextAction: purpose === 'THIRD_PARTY_BENCHMARK'
      ? 'Define carrier operating assumptions and source-backed CFU/CVU by leg, then implement an explicit benchmark adapter; do not relabel the historical fleet base or substitute purchase quotes.'
      : purpose === 'THIRD_PARTY_PURCHASE'
        ? 'Inspect the separate partner tariff base and its purchase evidence; a fleet applicability profile cannot substitute for it.'
        : 'Review fleet profile, parameter economics and trip compatibility before governed publication.',
  }
}

import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { composePublicPilotCost, PublicPilotCostOptionsSchema } from './compose-public-pilot-cost.js'
import { consolidateBinationalReferenceBudget } from './consolidate-binational-reference-budget.js'
import { reconcileEconomicModelInventory, CURRENT_REGISTER } from './reconcile-economic-model-inventory.js'
import { readLocalDocument } from './assemble-economic-reference-cards.js'
import { preparePilotCostResolution, resolvePilotCostRemainders, PilotCostResolutionSchema } from './lib/pilot-cost-resolution.js'
import { applyB2OperatingProfile, readB2OperatingProfile, B2_OPERATING_PROFILE_PIN } from './lib/b2-operating-profile.js'

const requestSchema = z.object({ options: PublicPilotCostOptionsSchema,
  operatingProfileId: z.literal('B2_USER_SCOPE_20261003').nullable().default(null),
  resolutions: z.array(z.object({ cycleId: z.enum(['NETWORK_EXPECTED_EMPTY_PROXY', 'DEDICATED_EMPTY_SAME_BOX_RETURN']),
    resolution: PilotCostResolutionSchema }).strict()).max(2).default([]) }).strict()

/** Current local closeout, not another copy of the historical135-row ledger.
 * Prices and scope are explicit. Parsing a resolution is not source approval. */
export function prepareB2Closeout(rawRequest: unknown) {
  const request = requestSchema.parse(rawRequest)
  if (new Set(request.resolutions.map(r => r.cycleId)).size !== request.resolutions.length) throw new Error('B2_DUPLICATE_CYCLE_RESOLUTION')
  const research = consolidateBinationalReferenceBudget(undefined, undefined, 'POSTAL_REFERENCE', request.options.borderLinkBasis, request.options.bobtailWearBasis)
  const inventory = reconcileEconomicModelInventory(readLocalDocument(CURRENT_REGISTER), research)
  const pilot = composePublicPilotCost(research, request.options)
  const operatingProfile = request.operatingProfileId ? readB2OperatingProfile() : null
  const cases = pilot.cases.map(c => {
    const profileApplication = operatingProfile ? applyB2OperatingProfile(c.projection.lineage, operatingProfile, {
      fxObservationDate: research.supportingPilotVariableEconomics.fx.observationDate,
      usMieEffectiveFrom: c.usDriverPlanning?.sourcePeriods.mieEffectiveFrom ?? null,
      mxWorkRiskBasis: research.supportingPilotOrdinaryDuty.driver.riskPolicy,
      foreignLiabilityAlternativeId: request.options.monthlyBudget.foreignLiabilityAlternativeId ?? null,
    }) : null
    const baseline = profileApplication?.historicalScopeProjection ?? c.projection
    const resolution = request.resolutions.find(r => r.cycleId === c.cycleId)
    const resolved = resolution ? resolvePilotCostRemainders(baseline.lineage, resolution.resolution) : null
    const current = resolved?.result ?? baseline
    const userOutputs = profileApplication ? { ...current.outputs, matchedMonthlySubtotalUsd: null,
      ...profileApplication.userCostCase.outputs } : current.outputs
    return { cycleId: c.cycleId, fundingMode: current.fundingMode, evidenceScope: current.evidenceScope,
      originalGapCounts: pilot.modelSectionClosure.scenarios.find(s => s.cycleId === c.cycleId)!.gapCounts,
      currentIssues: current.issues, outputs: userOutputs, resources: profileApplication ? null : current.resources,
      profileApplication,
      historicalReferenceComparison: profileApplication ? { referencePeriod: current.lineage.budget.referencePeriod,
        outputs: current.outputs, resources: current.resources, arithmeticComplete: current.outputs.productiveCostUsd !== null,
        acceptedForUserReferencePeriod: false } : null,
      knownPublicComponentsBeforeResolutionUsd: c.knownCostComponentsUsd,
      resolution: resolved, requiredInputs: preparePilotCostResolution(current.lineage),
      requiredInputsReferencePeriod: current.lineage.budget.referencePeriod,
      arithmeticComplete: !profileApplication && current.outputs.productiveCostUsd !== null }
  })
  const arithmeticComplete = cases.every(c => c.arithmeticComplete)
  return { model: 'FCM_B2_LOCAL_CLOSEOUT_V1',
    status: operatingProfile ? 'CONFIRMED_PROFILE_REVALUATION_PENDING'
      : arithmeticComplete ? 'ARITHMETIC_COMPLETE_ECONOMIC_ACCEPTANCE_PENDING' : 'INCOMPLETE_PUBLIC_COST',
    options: request.options, operatingProfile, inventory: { catalog: inventory.completeCatalog.counts, sectionCoverage: inventory.completeCatalog.sectionCoverage,
      parameterMatrix: inventory.completeCatalog.keys, registerSha256: inventory.registerSha256,
      fixedMaintenanceFormulaVerification: inventory.fixedMaintenanceFormulaVerification,
      tireFormulaVerification: inventory.tireFormulaVerification, fuelRateVerification: inventory.fuelRateVerification },
    sourcePins: [...pilot.sourcePins, ...(operatingProfile ? [B2_OPERATING_PROFILE_PIN] : [])], cases, arithmeticComplete,
    economicEvidenceAccepted: false, allCanonicalInputsCalibrated: false, b2Complete: false,
    calibrated: false, quoteReady: false, adoptedValues: 0, externalWrites: false,
    boundaries: { exactTollCoverageRequiredForFormulaValidation: false, completeTripInputsRequiredForCompleteEstimate: true,
      privateXbfRecordsRequiredByThisTool: false, syntheticPriceInputsAreNotPublicBenchmark: true,
      purchaseAndSaleInferred: false, riskAndMarginOutsideProductiveCost: true } }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node --import tsx apps/api/scripts/prepare-b2-closeout.ts JSON_REQUEST')
    console.log(JSON.stringify(prepareB2Closeout(JSON.parse(process.argv[2])), null, 2))
    process.exitCode = 2 // Complete arithmetic alone never claims economic acceptance.
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'B2 closeout failed')
    process.exitCode = 1
  }
}

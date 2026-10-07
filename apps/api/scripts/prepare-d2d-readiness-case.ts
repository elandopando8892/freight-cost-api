import { createHash } from 'node:crypto'
import { z } from 'zod'
import { consolidateFixedExposureTrailer } from './consolidate-fixed-exposure-trailer.js'
import { BenchmarkD2DReadinessSchema, reviewBenchmarkD2DReadiness } from '../src/modules/engine/benchmark-d2d-readiness.js'
import { reviewD2DRouteEvidenceLink } from '../src/modules/routing/d2d-route-evidence-link.js'
import { reviewMxTollReconciliation } from '../src/modules/routing/mx-toll-reconciliation.js'
import { reviewD2DBorderEvidence } from './review-d2d-border-evidence.js'
import { BinationalFixedBudgetSchema, reconcileBinationalFixedBudget } from '../src/modules/engine/benchmark-binational-budget.js'

const consolidationFile = 'docs/research/B2_FIXED_EXPOSURE_TRAILER_CONSOLIDATION_2026-09-30.json'
export const D2DCaseManifestSchema = z.object({
  artifact: z.literal('FCM_B2_D2D_PUBLIC_REFERENCE_READINESS_CASE'),
  cutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), baseHead: z.string().regex(/^[a-f0-9]{40}$/),
  caseReference: z.string().trim().min(1).max(1000),
  direction: BenchmarkD2DReadinessSchema.shape.direction,
  route: BenchmarkD2DReadinessSchema.shape.route.unwrap(),
  routeSelectionSource: z.literal('USER_CONFIRMED_CORRIDOR_NOT_CALCULATED_ITINERARY'),
  mode: z.literal('LOCAL_DRAFT_NO_ADOPTION_OR_PERSISTENCE'),
  consolidation: z.object({ file: z.literal(consolidationFile), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
}).strict()

export const BinationalBudgetManifestSchema = z.object({
  artifact: z.literal('FCM_B2_BINATIONAL_BUDGET_WORKSHEET'),
  casePin: z.object({ file: z.literal('docs/research/B2_D2D_READINESS_CASE_2026-09-30.json'), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  selectionPin: z.object({ file: z.literal('docs/research/B2_BINATIONAL_OWN_RELAY_SELECTED.json'), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  budget: BinationalFixedBudgetSchema,
}).strict()

/** Public dossiers are reference provenance, NOT numeric canonical parameters.
 * Confirmed endpoints are not route geometry, time, toll or interchange evidence. */
export function prepareD2DReadinessCase(raw: unknown, readSource: (file: string) => string, rawRouteLink?: unknown,
  rawTollManifest?: unknown, readBinarySource?: (file: string) => Buffer, rawBorderManifest?: unknown, rawBudgetManifest?: unknown) {
  const input = D2DCaseManifestSchema.parse(raw)
  if (rawBorderManifest !== undefined && !readBinarySource) throw new Error('BORDER_BYTE_READER_REQUIRED')
  const supportingBorderEvidence = rawBorderManifest === undefined ? undefined
    : reviewD2DBorderEvidence(rawBorderManifest, input, readBinarySource!)
  const supportingFixedBudget = rawBudgetManifest === undefined ? undefined : (() => {
    if (!supportingBorderEvidence?.confirmations.referenceVariant) throw new Error('BUDGET_SELECTED_RELAY_REQUIRED')
    const manifest = BinationalBudgetManifestSchema.parse(rawBudgetManifest)
    for (const [pin, supplied] of [[manifest.casePin, raw], [manifest.selectionPin, rawBorderManifest]] as const) {
      const content = readSource(pin.file)
      if (createHash('sha256').update(content).digest('hex') !== pin.sha256) throw new Error('BUDGET_PIN_HASH_MISMATCH')
      if (JSON.stringify(JSON.parse(content)) !== JSON.stringify(supplied)) throw new Error('BUDGET_CASE_OR_SELECTION_MISMATCH')
    }
    return { ...reconcileBinationalFixedBudget(manifest.budget), pinsVerified: 2,
      casePin: manifest.casePin, selectionPin: manifest.selectionPin, canonicalRatesCreated: false }
  })()
  const supportingRouteEvidence = rawRouteLink === undefined ? undefined : reviewD2DRouteEvidenceLink(rawRouteLink, input, readSource)
  if (rawTollManifest !== undefined && (!supportingRouteEvidence || !readBinarySource)) throw new Error('TOLL_ROUTE_AND_BYTE_READER_REQUIRED')
  const supportingMxTollEvidence = rawTollManifest === undefined ? undefined : reviewMxTollReconciliation(rawTollManifest, input, readBinarySource!)
  if (supportingMxTollEvidence && JSON.stringify(supportingMxTollEvidence.routePins) !== JSON.stringify(supportingRouteEvidence!.pins)) throw new Error('TOLL_ROUTE_BINDING_MISMATCH')
  const content = readSource(input.consolidation.file)
  if (createHash('sha256').update(content).digest('hex') !== input.consolidation.sha256) throw new Error('CONSOLIDATION_HASH_MISMATCH')
  const fixed = consolidateFixedExposureTrailer(JSON.parse(content), readSource)
  if (fixed.baseHead !== input.baseHead) throw new Error('BASE_HEAD_MISMATCH')
  if (fixed.cutDate > input.cutDate) throw new Error('SOURCE_DATE_AFTER_CUT')
  const emptyLeg = () => ({ parameters: null,
    trip: { loadedKm: null, emptyKm: null, cycleDays: null, tollsUsd: null } })
  const draft = BenchmarkD2DReadinessSchema.parse({ model: 'FCM_D2D_READINESS_V1',
    caseReference: input.caseReference, direction: input.direction, serviceDate: null,
    route: input.route, allocationRationale: null, mx: emptyLeg(), us: emptyLeg(),
    sharedTrailer: null, borderCharges: null })
  const readiness = reviewBenchmarkD2DReadiness(draft)
  const bindings = fixed.countries.map(card => ({ country: card.country,
    proposedProfileId: card.profileId, activeBaseRevision: null,
    historicalBaseRevisionLabel: card.baseRevision, historicalCohortLabel: card.cohortId,
    canonicalParametersCreated: false, scopeRequiredByCase: 'TRACTOR_ONLY',
    sourceProfileEquipment: card.equipment,
    rateRequirements: readiness.nationalRequirements.find(row => row.country === card.country)!.requirements,
    economicOutputs: card.outputs, fixedAndFinance: card.fixedAndFinanceSections,
    exposure: card.exposureSections, driver: card.driver,
    fuel: card.fuel, maintenanceAndTires: card.maintenanceAndTires,
    compatibility: 'NO_IMPLICIT_COMPOSITE_TO_TRACTOR_ONLY_CONVERSION',
  }))
  return { artifact: input.artifact, cutDate: input.cutDate, baseHead: input.baseHead,
    mode: input.mode, referenceSourceCount: fixed.sources.length,
    consolidationPin: input.consolidation, referenceSources: fixed.sources,
    routeSelectionSource: input.routeSelectionSource,
    bindings, sharedTrailerReference: fixed.sharedTrailer,
    additionalEconomicConditions: fixed.handoff.missingPackages.map(item => item.id === 'TRIP_BORDER'
      ? { ...item, needs: supportingBorderEvidence
        ? 'Corridor and World Trade Bridge are user-confirmed; binational company is a scenario assumption. Validate actual tractor/trailer allocation, loaded/empty itinerary, cycle, incremental border inclusions and validity.'
        : 'Named corridor is user-confirmed; document selected itinerary and bridge, loaded/empty distances, cycle times, tolls/border inclusions and validity.' }
      : item),
    readiness: { ...readiness, ...(supportingRouteEvidence ? { supportingRouteEvidence } : {}),
      ...(supportingMxTollEvidence ? { supportingMxTollEvidence } : {}),
      ...(supportingFixedBudget ? { supportingFixedBudget } : {}),
      ...(supportingBorderEvidence ? { supportingBorderEvidence } : {}) },
    decision: { caseIntegrationComplete: true, economicCaseComplete: false,
      B1: 'OPEN', B2: 'PARTIAL', businessGatesClosed: 0, businessGatesTotal: 4,
      ...(supportingFixedBudget ? { budgetWorksheetConnected: true, budgetScenarioComplete: supportingFixedBudget.status === 'BUDGET_SCENARIO_ONLY' } : {}),
      next: supportingBorderEvidence ? 'COMPLETE_BINATIONAL_CYCLE_COST_ALLOCATION_AND_VALIDITY_THEN_SAAS_WIREFRAME'
        : supportingRouteEvidence ? 'COMPLETE_US_ROUTE_BORDER_CYCLE_AND_COMPATIBLE_RATES_THEN_SAAS_WIREFRAME'
        : 'DOCUMENT_SELECTED_ITINERARY_AND_COMPLETE_COMPATIBLE_RATES_THEN_SAAS_WIREFRAME',
      requiresRouteChoice: false, namedCorridorConfirmed: true,
      requiresDetailedItinerary: true, requiresBridgeSelection: !supportingBorderEvidence,
      ...(supportingBorderEvidence ? { operationalScenario: supportingBorderEvidence.confirmations.operatingScenario,
        scenarioBasis: supportingBorderEvidence.confirmations.scenarioBasis,
        requiresPhysicalVariantSelection: !supportingBorderEvidence.confirmations.referenceVariant,
        ...(supportingBorderEvidence.confirmations.referenceVariant
          ? {referenceVariant:supportingBorderEvidence.confirmations.referenceVariant} : {}),
        requiresBinationalProfileValidation: true } : {}),
      itineraryValidated: false, sourceResearchReopened: false,
      businessPersisted: false, database: false, auth: false, deployment: false,
      businessOperations: false, applicationAi: false } }
}


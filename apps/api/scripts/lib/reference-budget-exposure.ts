import { z } from 'zod'
import { BINATIONAL_RESOURCES, BinationalFixedBudgetSchema, reconcileBinationalFixedBudget } from '../../src/modules/engine/benchmark-binational-budget.js'
import { BenchmarkLegSchema } from '../../src/modules/engine/benchmark-leg.js'
import { TrailerAttachmentSchema, reviewTrailerAttachment } from '../../src/modules/engine/benchmark-trailer-attachment.js'
import { allocateFixedCost } from '../../src/modules/engine/fixed-cost-allocation.js'
import { compareReferenceAssetTaxBases } from './reference-asset-tax-contrast.js'

const text = z.string().trim().min(1).max(2000)
const period = BinationalFixedBudgetSchema.shape.referencePeriod.unwrap()
const date = BenchmarkLegSchema.shape.serviceDate
const resourceId = z.enum(BINATIONAL_RESOURCES)

const boxProjectionSchema = z.object({
  resourceId: z.literal('SHARED_TRAILER'), physicalBoxCount: z.literal(1),
  physicalScope: z.literal('OWN_MX_US_RELAY_SAME_TRAILER'), currency: z.literal('MXN'),
  capacityBasis: z.literal('EXPLICIT_HISTORICAL_TRACTOR_TO_ONE_BOX_CAPACITY_SENSITIVITY_NOT_OBSERVED'),
  capacitySourceId: z.literal('IMT_PT260_CASE'),
  monthlyKm: z.number().finite().positive().max(1e6), monthlyAssetDays: z.number().finite().positive().max(31),
  scope: z.literal('FORWARD_MOVEMENT_ONLY_NOT_RESOURCE_CYCLE'),
  mxDistanceKm: z.number().finite().positive().max(1e6),
  mxMovementElapsedHours: z.number().finite().positive().max(8760),
  usDistanceKm: z.number().finite().nonnegative().max(1e6).nullable(),
  usMovementElapsedHours: z.number().finite().nonnegative().max(8760).nullable(),
  borderDetachedHours: z.number().finite().nonnegative().max(8760).nullable(),
}).strict()

/** A single physical box / one MAX operation over serial movement phases.
 * This is asking-price/tax and historical-capacity sensitivity, NOT complete
 * capital, a productive denominator, or an accepted pilot CFU. Missing later
 * phases never become zero; reporting phase amounts must not be added. */
export function projectSharedTrailerReference(raw: unknown,
  rawTax: Parameters<typeof compareReferenceAssetTaxBases>[0]) {
  const input = boxProjectionSchema.parse(raw)
  const tax = compareReferenceAssetTaxBases(rawTax)
  const monthlyReference = tax.monthlyEquivalentOfContrast
  if (monthlyReference < 0) throw new Error('BOX_NEGATIVE_PRICE_GAP_REFERENCE')
  const perKm = monthlyReference / input.monthlyKm
  const perDay = monthlyReference / input.monthlyAssetDays
  const project = (km: number, days: number) => {
    const byDistanceMxn = perKm * km
    const byTimeMxn = perDay * days
    return { distanceKm: km, elapsedMovementDays: days, byDistanceMxn, byTimeMxn,
      conditionalReferenceMxn: allocateFixedCost(byDistanceMxn, byTimeMxn) }
  }
  const mxPrefix = project(input.mxDistanceKm, input.mxMovementElapsedHours / 24)
  const phasesAvailable = input.usDistanceKm !== null && input.usMovementElapsedHours !== null && input.borderDetachedHours !== null
  const serialMovement = phasesAvailable ? project(input.mxDistanceKm + input.usDistanceKm!,
    (input.mxMovementElapsedHours + input.usMovementElapsedHours! + input.borderDetachedHours!) / 24) : null
  if ([perKm, perDay, mxPrefix.conditionalReferenceMxn, serialMovement?.conditionalReferenceMxn ?? 0].some(n => !Number.isFinite(n))) {
    throw new Error('BOX_REFERENCE_ARITHMETIC_RANGE_EXCEEDED')
  }
  return { input, tax, monthlyAskingTaxContrastMxn: monthlyReference,
    contrastMxnPerSensitivityKm: perKm, contrastMxnPerSensitivityAssetDay: perDay,
    mxPrefix, serialMovement, completeForwardMovementReferenceMxn: serialMovement?.conditionalReferenceMxn ?? null,
    allocationRule: 'ONE_BOX_ONE_MAX_AFTER_SERIAL_PHASE_COMPOSITION',
    classification: 'CROSS_SOURCE_PLANNING_SENSITIVITY_NOT_CFU',
    mxPrefixIsMinimumCfu: false, phaseAllocationsAdditive: false, duplicateBoxChargeAdded: false,
    usOrBorderMissingSetToZero: false, unknownCapitalAdjustmentsSetToZero: false,
    tractorReturnsInherited: false, monthlyReferenceIsCompleteCapital: false,
    productiveBoxCapacityObserved: false, currentCarrierFleetQuantityInferred: false,
    includesEmptyReturn: false, completeBoxCycleDays: null, completeMonthlyCapitalMxn: null,
    completeBoxCfuMxn: null, selected: false, eligibleForBudget: false, quoteReady: false, adoptedValues: 0 }
}
const datum = (unit: string, integer = false) => z.object({
  value: integer ? z.number().int().positive().max(1e6) : z.number().finite().positive().max(1e12),
  unit: z.literal(unit), evidenceIds: z.array(text).min(1), derivation: text,
}).strict().nullable()

export const ReferenceBudgetExposureSchema = z.object({
  model: z.literal('FCM_RESOURCE_FLEET_BUDGET_EXPOSURE_V1'), groupReference: text,
  referencePeriod: period.nullable(), serviceDate: date.nullable(),
  budgetScope: z.literal('RESOURCE_COHORT_FLEET_MONTH').nullable(),
  exposureBasis: z.literal('CALENDAR_MONTH_COMPATIBLE_ELAPSED_ASSET_DAYS').nullable(),
  resources: z.array(z.object({ resourceId, assetReference: text, profileReference: text.nullable(),
    assetQuantity: datum('assets/resource-fleet', true), totalKmPerMonth: datum('km/resource-fleet-month'),
    productiveAssetDaysPerMonth: datum('asset-days/resource-fleet-month'),
    cycleTotalKm: datum('km/resource-cycle'), cycleLoadedKm: datum('km/resource-cycle'),
    cycleDays: datum('days/resource-cycle'),
  }).strict()).length(3),
  evidence: z.array(BinationalFixedBudgetSchema.shape.evidence.element.extend({
    validFrom: date, validUntil: date,
  }).strict()),
  trailerAttachment: TrailerAttachmentSchema.nullable(),
}).strict()

/** Offline integration of EXISTING budget reconciliation, physical attachment
 * review and MAX allocation. Not an importer, new pricing engine or acceptance.
 * Resource fleet cost and BOTH denominators must represent the same cohort. */
export function reconcileReferenceBudgetExposure(rawBudget: unknown, rawExposure: unknown) {
  const budget = reconcileBinationalFixedBudget(rawBudget)
  const input = ReferenceBudgetExposureSchema.parse(rawExposure)
  const issues = budget.issues.map(i => ({ field: `budget.${i.field}`, code: i.code }))
  const add = (field: string, code: string) => issues.push({ field, code })
  if (!input.referencePeriod) add('referencePeriod', 'MISSING_EXPOSURE_PERIOD')
  if (input.referencePeriod !== budget.lineage.referencePeriod) add('referencePeriod', 'BUDGET_EXPOSURE_PERIOD_MISMATCH')
  if (input.groupReference !== budget.lineage.groupReference) add('groupReference', 'BUDGET_EXPOSURE_GROUP_MISMATCH')
  if (!input.serviceDate) add('serviceDate', 'MISSING_SERVICE_DATE')
  if (!input.budgetScope) add('budgetScope', 'MISSING_RESOURCE_FLEET_BUDGET_SCOPE')
  if (!input.exposureBasis) add('exposureBasis', 'MISSING_COMPATIBLE_ELAPSED_ASSET_DAYS')
  const sources = new Map(input.evidence.map(s => [s.id, s]))
  if (sources.size !== input.evidence.length) add('evidence', 'DUPLICATE_EXPOSURE_SOURCE')
  for (const source of input.evidence) {
    if (source.validFrom > source.validUntil || (input.serviceDate && (source.observedAt > input.serviceDate ||
      source.validFrom > input.serviceDate || source.validUntil < input.serviceDate))) add(`evidence.${source.id}`, 'EXPOSURE_SOURCE_OUTSIDE_VALIDITY')
  }
  const checkRefs = (field: string, ids: string[], resources: typeof BINATIONAL_RESOURCES[number][]) => {
    if (new Set(ids).size !== ids.length) add(field, 'DUPLICATE_EXPOSURE_REFERENCE')
    for (const id of ids) {
      const source = sources.get(id)
      if (!source) { add(field, 'MISSING_EXPOSURE_EVIDENCE'); continue }
      if (source.kind === 'CONTEXT_ONLY') add(field, 'EXPOSURE_CONTEXT_NOT_COMPATIBLE_INPUT')
      if (source.groupReference !== input.groupReference || source.referencePeriod !== input.referencePeriod) add(field, 'EXPOSURE_EVIDENCE_SCOPE_MISMATCH')
      if (new Set(source.resourceIds).size !== source.resourceIds.length) add(field, 'DUPLICATE_EXPOSURE_EVIDENCE_RESOURCE')
      for (const resource of resources) {
        const matches = source.profileReferences.filter(p => p.resourceId === resource)
        if (!source.resourceIds.includes(resource) || matches.length !== 1 ||
          matches[0].profileReference !== input.resources.find(r => r.resourceId === resource)?.profileReference) add(field, 'EXPOSURE_EVIDENCE_PROFILE_MISMATCH')
      }
    }
  }
  const calendar = input.referencePeriod ? new Date(`${input.referencePeriod}-01T00:00:00Z`) : null
  if (calendar) calendar.setUTCMonth(calendar.getUTCMonth() + 1, 0)
  const monthDays = calendar?.getUTCDate() ?? null
  if (new Set(input.resources.map(r => r.assetReference)).size !== 3) add('resources', 'PHYSICAL_RESOURCE_IDENTITY_COLLISION')
  for (const id of BINATIONAL_RESOURCES) {
    const rows = input.resources.filter(r => r.resourceId === id)
    if (rows.length !== 1) { add(id, 'REQUIRE_ONE_EXPOSURE_RESOURCE'); continue }
    const row = rows[0]
    if (!row.profileReference || row.profileReference !== budget.lineage.resources.find(r => r.resourceId === id)?.profileReference) add(id, 'BUDGET_EXPOSURE_PROFILE_MISMATCH')
    for (const key of ['assetQuantity', 'totalKmPerMonth', 'productiveAssetDaysPerMonth', 'cycleTotalKm', 'cycleLoadedKm', 'cycleDays'] as const) {
      if (!row[key]) add(`${id}.${key}`, 'MISSING_RESOURCE_EXPOSURE_INPUT')
      else checkRefs(`${id}.${key}`, row[key]!.evidenceIds, [id])
    }
    if (row.assetQuantity && row.productiveAssetDaysPerMonth && monthDays &&
      row.productiveAssetDaysPerMonth.value > row.assetQuantity.value * monthDays) add(id, 'EXCEEDS_RESOURCE_CALENDAR_CAPACITY')
    if (row.cycleTotalKm && row.cycleLoadedKm && row.cycleTotalKm.value < row.cycleLoadedKm.value) add(id, 'CYCLE_BELOW_LOADED_DISTANCE')
  }
  const mx = input.resources.find(r => r.resourceId === 'MX_TRACTOR')
  const us = input.resources.find(r => r.resourceId === 'US_TRACTOR')
  const box = input.resources.find(r => r.resourceId === 'SHARED_TRAILER')
  if (box?.cycleTotalKm && mx?.cycleLoadedKm && us?.cycleLoadedKm &&
    box.cycleTotalKm.value < mx.cycleLoadedKm.value + us.cycleLoadedKm.value) add('SHARED_TRAILER', 'BOX_BELOW_COMBINED_LOADED_DISTANCE')
  if (box?.cycleLoadedKm && mx?.cycleLoadedKm && us?.cycleLoadedKm &&
    box.cycleLoadedKm.value < mx.cycleLoadedKm.value + us.cycleLoadedKm.value) add('SHARED_TRAILER', 'BOX_LOADED_DISTANCE_BELOW_NATIONAL_PHASES')
  let attachment: ReturnType<typeof reviewTrailerAttachment> | null = null
  if (!input.trailerAttachment) add('trailerAttachment', 'MISSING_SERIAL_BOX_CYCLE')
  else if (mx && us && box) {
    attachment = reviewTrailerAttachment(input.trailerAttachment, box.assetReference,
      { mx: mx.cycleDays?.value ?? null, us: us.cycleDays?.value ?? null }, [...sources.keys()])
    issues.push(...attachment.issues.map(i => ({ field: `trailerAttachment.${i.field}`, code: i.code })))
    if (input.trailerAttachment.mxTractorReference !== mx.assetReference || input.trailerAttachment.usTractorReference !== us.assetReference) add('trailerAttachment', 'ATTACHMENT_RESOURCE_MISMATCH')
    checkRefs('trailerAttachment.declaration', input.trailerAttachment.evidenceIds, [...BINATIONAL_RESOURCES])
    checkRefs('trailerAttachment.mxAttachedDays', input.trailerAttachment.mxAttachedDays.evidenceIds, ['MX_TRACTOR', 'SHARED_TRAILER'])
    checkRefs('trailerAttachment.borderDetachedDays', input.trailerAttachment.borderDetachedDays.evidenceIds, ['SHARED_TRAILER'])
    checkRefs('trailerAttachment.usAttachedDays', input.trailerAttachment.usAttachedDays.evidenceIds, ['US_TRACTOR', 'SHARED_TRAILER'])
    if (box.cycleDays && box.cycleDays.value < attachment.minimumTrailerDays) add('SHARED_TRAILER', 'BOX_BELOW_SERIAL_ATTACHMENT_DAYS')
  }
  const envelope = { budget, lineage: input, issues, calendarDaysInReferenceMonth: monthDays, attachment,
    calibrated: false as const, quoteReady: false as const, adoptedValues: 0,
    sourceStatus: 'DOCUMENTED_SCENARIO_NOT_OPERATING_ACCEPTANCE',
    cvuUsd: null, purchaseUsd: null, sellUsd: null, activeEngineInvoked: false }
  if (issues.length || !budget.monthlyFixedUsdByResource) return { ...envelope, status: 'INCOMPLETE', resources: null, fixedAllocationUsd: null }
  const resources = BINATIONAL_RESOURCES.map(id => {
    const r = input.resources.find(r => r.resourceId === id)!
    const fleetFixedUsd = budget.monthlyFixedUsdByResource![id]
    const count = r.assetQuantity!.value
    const fleetKm = r.totalKmPerMonth!.value
    const fleetDays = r.productiveAssetDaysPerMonth!.value
    const byDistanceUsd = fleetFixedUsd * r.cycleTotalKm!.value / fleetKm
    const byTimeUsd = fleetFixedUsd * r.cycleDays!.value / fleetDays
    return { resourceId: id, fleetFixedUsd, assetQuantity: count,
      fixedUsdPerAssetMonth: fleetFixedUsd / count, kmPerAssetMonth: fleetKm / count, productiveDaysPerAssetMonth: fleetDays / count,
      fixedUsdPerKm: fleetFixedUsd / fleetKm, fixedUsdPerAssetDay: fleetFixedUsd / fleetDays,
      byDistanceUsd, byTimeUsd, fixedAllocationUsd: allocateFixedCost(byDistanceUsd, byTimeUsd),
      allocationBasis: 'SAME_COHORT_FLEET_MONTH_MAX_DISTANCE_TIME', trailerChargedPerLeg: false }
  })
  const total = resources.reduce((sum, r) => sum + r.fixedAllocationUsd, 0)
  if (!Number.isFinite(total) || resources.some(r => Object.values(r).some(v => typeof v === 'number' && !Number.isFinite(v)))) {
    add('resources', 'EXPOSURE_ARITHMETIC_RANGE_EXCEEDED')
    return { ...envelope, status: 'INCOMPLETE', resources: null, fixedAllocationUsd: null }
  }
  return { ...envelope, status: 'BUDGET_EXPOSURE_SCENARIO_ONLY', resources, fixedAllocationUsd: total }
}

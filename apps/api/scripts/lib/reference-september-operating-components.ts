import { z } from 'zod'
import type { consolidateBinationalReferenceBudget } from '../consolidate-binational-reference-budget.js'

type Research = ReturnType<typeof consolidateBinationalReferenceBudget>
export const SeptemberReferenceFxSchema = z.union([
  z.object({ date: z.literal('2026-09-28'), mxnPerUsd: z.literal(17.8413) }).strict(),
  z.object({ date: z.literal('2026-09-29'), mxnPerUsd: z.literal(18.0710) }).strict(),
  z.object({ date: z.literal('2026-09-30'), mxnPerUsd: z.literal(18.0692) }).strict(),
])
const maintenanceSchema = z.object({
  model: z.literal('FCM_US_ATRI2024_MAINTENANCE_PLANNING_V1'), operationsYear: z.literal(2024),
  maintenanceUsdPerInternationalMile: z.literal(.198), internationalMileKm: z.literal(1.609344),
  scope: z.literal('ATTACHED_TRACTOR_TRAILER_COMPOSITE'), replacesTtiAggregate: z.literal(true),
  extraLubricantsAdded: z.literal(false), tiresOrDefIncluded: z.literal(false),
  routineLubricationTreatment: z.literal('DECLARED_ALL_MAINTENANCE_PLANNING_INFERENCE_NOT_EXPLICIT_SURVEY_MICRODATA'),
}).passthrough()
const close = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-7
const MILE_KM = 1.609344, GALLON_LITERS = 3.785411784
const defSchema = z.object({ volumeFraction: z.literal(.04), sourceLow: z.literal(.03), sourceHigh: z.literal(.05),
  basis: z.literal('CUMMINS_X15_RANGE_MIDPOINT_TRANSFER_TO_DD15_NOT_MEASURED'),
  scrEquipment: z.literal('DECLARED_SCR_REFERENCE_ON_BOTH_TRACTORS_NOT_LISTING_OR_VIN_VERIFIED'),
  mxPackageLiters: z.literal(20), mxPackageNetMxn: z.literal(472.2), mxShippingPerPackageNetMxn: z.literal(314.65), mxVatRate: z.literal(.16),
  usPackageGallons: z.literal(2.5), usPackageNetUsd: z.literal(9.88), usPurchaseTaxRate: z.literal(.0825),
  inventory: z.literal('EXACT_CONSUMED_VOLUME_NO_FULL_CONTAINER_CASH_ADDED_AGAIN'),
}).passthrough()

/** Caller supplies the pinned, recalculated consolidated research, not a price
 * injection. Rebuild quantity × native rate; never carry an October USD sum or
 * its fixed allocations. Source periods remain historical where applicable. */
export function rebuildSeptemberOperatingComponents(r: Research, rawFx: unknown, rawMaintenance: unknown) {
  const fx = SeptemberReferenceFxSchema.parse(rawFx), maintenance = maintenanceSchema.parse(rawMaintenance)
  const prior = r.supportingPilotVariableEconomics
  if (prior.fx.observationDate !== '2026-10-01' || prior.fx.mxnPerUsd !== 18.3688 ||
    r.bobtailWearBasis !== 'IMT_C3_NON_ARTICULATED_PROXY' || r.borderLinkBasis !== 'PUBLIC_LINK_FORECAST') {
    throw new Error('B2_SEPTEMBER_NATIVE_REFERENCE_MISMATCH')
  }
  const ids = ['MX_FUEL', 'MX_MAINT', 'MX_LUBE', 'MX_TIRES', 'MX_DRIVER_PAY', 'US_FUEL', 'US_MAINT', 'US_TIRES', 'US_DRIVER_PAY']
  if (prior.scenarios.length !== 2 || new Set(prior.scenarios.map(s => s.cycleScenarioId)).size !== 2) throw new Error('B2_SEPTEMBER_CYCLE_IDENTITY')
  return prior.scenarios.map(s => {
    if (s.rows.length !== 9 || new Set(s.rows.map(v => v.id)).size !== 9 || ids.some(id => !s.rows.some(v => v.id === id))) {
      throw new Error('B2_SEPTEMBER_VARIABLE_IDENTITY')
    }
    const physical = r.supportingPilotCycleExposure.scenarios.find(c => c.id === s.cycleScenarioId)!
    const mx = physical.allocationResources.find(v => v.resourceId === 'MX_TRACTOR')!
    const us = physical.allocationResources.find(v => v.resourceId === 'US_TRACTOR')!
    if (!close(s.mxAttachedKm + s.mxBobtailKm, mx.totalCycleKm) || !close(s.usAttachedKm, us.totalCycleKm)) {
      throw new Error('B2_SEPTEMBER_DISTANCE_PARTITION')
    }
    const nativeRates: Record<string, number> = { MX_FUEL: .48392 * 27, MX_MAINT: 5.61754,
      MX_LUBE: .27967, MX_TIRES: .96996, MX_DRIVER_PAY: 2.1,
      US_FUEL: 5.955 / 7.9 / MILE_KM, US_MAINT: .212 / MILE_KM, US_TIRES: .048 / MILE_KM, US_DRIVER_PAY: .817 / MILE_KM }
    for (const v of s.rows) {
      const country = v.id.startsWith('MX_') ? 'MX' : 'US'
      const km = country === 'US' ? s.usAttachedKm : ['MX_FUEL', 'MX_DRIVER_PAY'].includes(v.id) ? mx.totalCycleKm : s.mxAttachedKm
      if (v.country !== country || v.nativeCurrency !== (country === 'MX' ? 'MXN' : 'USD') ||
        !close(v.km, km) || !close(v.nativePerKm, nativeRates[v.id]) || !close(v.amountNative, km * nativeRates[v.id]) ||
        !close(v.amountUsd, v.amountNative / (country === 'MX' ? prior.fx.mxnPerUsd : 1))) throw new Error('B2_SEPTEMBER_NATIVE_ROW_MISMATCH')
    }
    if (!close(s.conditionalRoadFuelQuantity.mxLiters, mx.totalCycleKm * .48392) ||
      !close(s.conditionalRoadFuelQuantity.usGallons, us.totalCycleKm / MILE_KM / 7.9)) throw new Error('B2_SEPTEMBER_FUEL_QUANTITY')
    const rows: { id: string; resourceId: 'MX_TRACTOR' | 'US_TRACTOR'; quantity: number; unit: string;
      nativeUnitPrice: number; nativeCurrency: 'MXN' | 'USD'; amountNative: number; amountUsd: number;
      sourcePeriod: string; sourceIds: string[]; scope: string }[] = []
    const add = (id: string, resourceId: 'MX_TRACTOR' | 'US_TRACTOR', quantity: number, unit: string,
      nativeUnitPrice: number, sourcePeriod: string, sourceIds: string[], scope: string,
      nativeCurrency: 'MXN' | 'USD' = resourceId === 'MX_TRACTOR' ? 'MXN' : 'USD') => {
      if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(nativeUnitPrice) || nativeUnitPrice <= 0) throw new Error('B2_SEPTEMBER_NONPOSITIVE_COMPONENT')
      const amountNative = quantity * nativeUnitPrice
      rows.push({ id, resourceId, quantity, unit, nativeUnitPrice, nativeCurrency, amountNative,
        amountUsd: amountNative / (nativeCurrency === 'MXN' ? fx.mxnPerUsd : 1), sourcePeriod, sourceIds, scope })
    }
    add('MX_ROAD_FUEL', 'MX_TRACTOR', s.conditionalRoadFuelQuantity.mxLiters, 'liter', 27, '2026-09-25',
      ['PROFECO_20260928', 'IMT_TABLE4_2_FUEL'], 'NATIONAL_INDEXED_PRICE_AND_DECLARED_CONSTANT_CONSUMPTION_NOT_CARRIER_OBSERVATION')
    add('US_ROAD_FUEL', 'US_TRACTOR', s.conditionalRoadFuelQuantity.usGallons, 'US-gallon', 5.955, '2026-09-28',
      ['EIA_PADD3_20260928', 'US_ORNL_HEAVY_BIN'], 'GULF_COAST_RETAIL_AND_HISTORICAL_HEAVY_BIN_NOT_MATCHED_LOADED_EMPTY_PAIR')
    for (const id of ['MX_MAINT', 'MX_LUBE', 'MX_TIRES', 'US_TIRES']) {
      const v = s.rows.find(v => v.id === id)!
      add(id, v.country === 'MX' ? 'MX_TRACTOR' : 'US_TRACTOR', v.km, 'attached-vehicle-km', v.nativePerKm,
        v.country === 'MX' ? '2025_NET_MODEL' : '2024_TTI_ESTIMATE', v.sourceIds, 'ATTACHED_TRACTOR_BOX_COMPOSITE_UNSPLIT_NO_SEPARATE_BOX_CHARGE')
    }
    add('US_MAINT', 'US_TRACTOR', s.usAttachedKm / maintenance.internationalMileKm, 'attached-vehicle-mile',
      maintenance.maintenanceUsdPerInternationalMile, '2024_ATRI_ALL_REPAIR_MAINTENANCE', ['ATRI2025_MAINTENANCE_ORIGINAL'],
      'REPLACES_TTI_ONCE_LUBE_DECLARED_INCLUDED_NOT_EXPLICIT_MICRODATA_TIRES_AND_DEF_SEPARATE')
    const bobtail = r.supportingMxBobtailWearReference.scenarios.find(v => v.cycleScenarioId === s.cycleScenarioId)!
    const rates = r.supportingMxBobtailWearReference.printedCostsMxnPer1000VehicleKm
    if (!close(bobtail.mxBobtailKm, s.mxBobtailKm) || s.mxBobtailKm <= 0 ||
      rates.maintenanceLabor !== 820.06 || rates.maintenanceParts !== 1696.51 || rates.lubricants !== 172.97 || rates.tires !== 690.69) throw new Error('B2_SEPTEMBER_BOBTAIL_SOURCE_MISMATCH')
    for (const [id, rate] of Object.entries(rates)) add(`MX_BOBTAIL_${id}`, 'MX_TRACTOR', s.mxBobtailKm,
      'bobtail-vehicle-km', rate / 1000, '2025_IMT_C3_UNMATCHED_MODEL', ['IMT_PT881_C3'],
      'DECLARED_C3_SENSITIVITY_NOT_MATCHED_CASCADIA_TRACTOR_ONLY_RATE_NO_ATTACHED_OR_BOX_OVERLAP')
    const duty = r.supportingPilotOrdinaryDuty.scenarios.find(v => v.id === s.cycleScenarioId)!
    const idle = r.supportingOperatingFluids.idle
    if (idle.annualReferenceHours !== 1830 || idle.productiveElapsedDaysPerMonth !== 24 || idle.gallonsPerHour !== .8) throw new Error('B2_SEPTEMBER_IDLE_POLICY')
    for (const country of ['MX', 'US'] as const) {
      const days = country === 'MX' ? duty.knownMxElapsedClockDays : duty.knownUsElapsedClockDays
      if (!Number.isFinite(days) || days <= 0 || days > 24) throw new Error('B2_SEPTEMBER_IDLE_EXPOSURE')
      const gallons = idle.annualReferenceHours / 12 * days / idle.productiveElapsedDaysPerMonth * idle.gallonsPerHour
      add(`${country}_IDLE_FUEL`, country === 'MX' ? 'MX_TRACTOR' : 'US_TRACTOR', country === 'MX' ? gallons * GALLON_LITERS : gallons,
        country === 'MX' ? 'liter' : 'US-gallon', country === 'MX' ? 27 : 5.955, country === 'MX' ? '2026-09-25' : '2026-09-28',
        ['DOE_IDLE_METHOD', country === 'MX' ? 'PROFECO_20260928' : 'EIA_PADD3_20260928'],
        'ANNUAL_CAPACITY_NORMALIZED_IDLE_RESERVE_NOT_EVENT_TRACE_ROAD_FUEL_EXCLUDES_IDLE')
    }
    // Only DEF is new here: the old fluids subtotal also contains idle diesel,
    // already reconstructed above. Package equivalents are consumption, not purchases.
    const fluids = r.supportingOperatingFluids, def = defSchema.parse(fluids.def)
    const mxDiesel = s.conditionalRoadFuelQuantity.mxLiters + rows.find(v => v.id === 'MX_IDLE_FUEL')!.quantity
    const usDiesel = s.conditionalRoadFuelQuantity.usGallons + rows.find(v => v.id === 'US_IDLE_FUEL')!.quantity
    const mxDefUnitMxn = (def.mxPackageNetMxn + def.mxShippingPerPackageNetMxn) * (1 + def.mxVatRate) / def.mxPackageLiters
    const usDefUnitUsd = def.usPackageNetUsd * (1 + def.usPurchaseTaxRate) / def.usPackageGallons
    const oldFluids = fluids.scenarios.filter(v => v.cycleScenarioId === s.cycleScenarioId)
    if (oldFluids.length !== 1 || !close(fluids.mxDefUnitMxn, mxDefUnitMxn) || !close(fluids.usDefUnitUsd, usDefUnitUsd) ||
      !close(oldFluids[0].mxTotalDieselLiters, mxDiesel) || !close(oldFluids[0].usTotalDieselGallons, usDiesel)) throw new Error('B2_SEPTEMBER_DEF_NATIVE_LINEAGE')
    for (const [index, fraction] of [def.volumeFraction, def.sourceLow, def.sourceHigh].entries()) {
      const old = index === 0 ? oldFluids[0].reference : oldFluids[0].sensitivity[index - 1]
      if (!old || old.fraction !== fraction || old.lines.length !== 4 || new Set(old.lines.map(v => v.id)).size !== 4) throw new Error('B2_SEPTEMBER_DEF_REFERENCE_IDENTITY')
      for (const id of ['MX_DEF', 'US_DEF', 'MX_IDLE_DIESEL_RESERVE', 'US_IDLE_DIESEL_RESERVE']) {
        const line = old.lines.find(v => v.id === id), mxCountry = id.startsWith('MX_'), isDef = id.endsWith('_DEF')
        const quantity = isDef ? (mxCountry ? mxDiesel : usDiesel) * fraction : rows.find(v => v.id === (mxCountry ? 'MX_IDLE_FUEL' : 'US_IDLE_FUEL'))!.quantity
        const rate = isDef ? (mxCountry ? mxDefUnitMxn : usDefUnitUsd) : (mxCountry ? 27 : 5.955)
        if (!line || line.currency !== (mxCountry ? 'MXN' : 'USD') || line.resourceId !== (mxCountry ? 'MX_TRACTOR' : 'US_TRACTOR') ||
          line.unit !== (mxCountry ? 'liter' : 'US-gallon') || !close(line.quantity, quantity) || !close(line.unitNative, rate) ||
          !close(line.amountUsd, quantity * rate / (mxCountry ? prior.fx.mxnPerUsd : 1))) throw new Error('B2_SEPTEMBER_DEF_NATIVE_LINEAGE')
      }
    }
    const defSourcePeriod = 'PUBLIC_PRICES_CAPTURED_2026-10-02_NOT_SEPTEMBER_OBSERVATIONS'
    add('MX_DEF', 'MX_TRACTOR', mxDiesel * def.volumeFraction, 'liter', mxDefUnitMxn, defSourcePeriod,
      ['CUMMINS_ONHIGHWAY_DEF', 'AMSA_FLEETRITE_DEF'], 'ROAD_PLUS_IDLE_DIESEL_ONCE_PARCEL_DELIVERY_AND_VAT_CONSUMED_VOLUME_NOT_BULK_OR_DD15_CALIBRATION')
    add('US_DEF', 'US_TRACTOR', usDiesel * def.volumeFraction, 'US-gallon', usDefUnitUsd, defSourcePeriod,
      ['CUMMINS_ONHIGHWAY_DEF', 'WALMART_SUPERTECH_DEF', 'TEXAS_LAREDO_DEVICE_TAX'], 'ROAD_PLUS_IDLE_DIESEL_ONCE_SACRAMENTO_PRICE_TRANSFER_AND_LAREDO_TAX_HYPOTHESIS_NOT_STORE_QUOTE')
    const knownDefComponentsUsd = mxDiesel * def.volumeFraction * mxDefUnitMxn / fx.mxnPerUsd + usDiesel * def.volumeFraction * usDefUnitUsd

    // Reuse the aggregate already researched. Never charge the provider's 4770
    // alongside the reconciled 4751, another Jorobas span or a box crossing fee.
    const roads = r.supportingPilotRoadBorderEconomics, coverage = r.supportingMxTollCoverage
    const selectedTotal = roads.selections.reduce((sum, v) => sum + v.amountMxn, 0)
    if (roads.selections.length !== 13 || new Set(roads.selections.map(v => v.segmentIndex)).size !== 13 ||
      new Set(roads.selections.map(v => v.coverageGroup)).size !== 13 || selectedTotal !== 4751 ||
      roads.knownForwardRoadComponentsMxn !== selectedTotal || roads.providerOriginalTotalMxn !== 4770 ||
      roads.selections.some(v => v.segmentIndex === 43 || !Number.isFinite(v.amountMxn) || v.amountMxn <= 0 || (v.effectiveFrom !== null && v.effectiveFrom > fx.date)) ||
      roads.selections.find(v => v.segmentIndex === 16)?.amountMxn !== 642 || coverage.knownForwardRoadComponentsMxn !== 4751 ||
      coverage.jorobas.additionalAutomaticChargeMxn !== 0 || coverage.carbonera.currentC5Mxn !== null || coverage.carbonera.exemptionVerified !== false) {
      throw new Error('B2_SEPTEMBER_ROAD_COVERAGE')
    }
    const roadCases = roads.scenarios.filter(v => v.cycleScenarioId === s.cycleScenarioId)
    const dedicated = s.cycleScenarioId === 'DEDICATED_EMPTY_SAME_BOX_RETURN', multiplicity = dedicated ? 2 : 1
    if (roadCases.length !== 1 || roadCases[0].attachedMxRoadMultiplicity !== multiplicity ||
      roadCases[0].knownRoadComponentsMxn !== selectedTotal * multiplicity ||
      !close(roadCases[0].knownRoadComponentsUsd, selectedTotal * multiplicity / prior.fx.mxnPerUsd)) throw new Error('B2_SEPTEMBER_ROAD_NATIVE_LINEAGE')
    const road = roadCases[0], expectedCrossings = ['MX_LOADED_NORTH', 'MX_BOBTAIL_SOUTH', ...(dedicated ? ['MX_BOBTAIL_NORTH', 'MX_ATTACHED_EMPTY_SOUTH'] : [])]
    if (JSON.stringify(road.crossings.map(v => v.id)) !== JSON.stringify(expectedCrossings)) throw new Error('B2_SEPTEMBER_BRIDGE_TIMELINE')
    add('MX_ROAD_TOLLS_KNOWN_AGGREGATE', 'MX_TRACTOR', multiplicity, 'selected-C5-movement-set', selectedTotal,
      '2026_TARIFF_REFERENCES_WITH_UNDATED_MOVEMENTS_CAPTURED_BY_2026-10-02', [...new Set(roads.selections.map(v => v.sourceId))],
      'KNOWN_AGGREGATE_NOT_COMPLETE_ITINERARY_RETURN_IS_HYPOTHESIS_NO_BOBTAIL_DISTANCE_PRORATING')
    for (const crossing of road.crossings) {
      const north = crossing.id.endsWith('NORTH'), bobtail = crossing.id.includes('BOBTAIL'), axles = bobtail ? 3 : 5
      const currency = north ? 'MXN' : 'USD', rate = north ? (bobtail ? 65 : 144) : axles * 4.75
      if (crossing.resourceId !== 'MX_TRACTOR' || crossing.axles !== axles || crossing.currency !== currency ||
        crossing.physicalBoxOnTractor !== !bobtail || crossing.direction !== (north ? 'MX_TO_US' : 'US_TO_MX') ||
        crossing.sourceId !== (north ? 'SICT_BRIDGE_III' : 'LAREDO_2026_O_114') || crossing.directionTariffVerified !== !north ||
        crossing.actualCrossingObserved !== false || crossing.amountNative !== rate ||
        !close(crossing.amountUsd, rate / (north ? prior.fx.mxnPerUsd : 1))) throw new Error('B2_SEPTEMBER_BRIDGE_NATIVE_LINEAGE')
      add(`BRIDGE_${crossing.id}`, 'MX_TRACTOR', 1, `${axles}-axle-crossing`, rate,
        north ? '2026_PUBLIC_REFERENCE_DIRECTION_APPLICATION_UNVERIFIED' : '2026_LAREDO_O114_NEXT_ADJUSTMENT_2027-01-01', [crossing.sourceId],
        north ? 'MX_NORTH_DIRECTION_APPLICATION_PENDING_NO_EXTRA_BOX_FEE' : 'US_SOUTH_USD_PER_AXLE_ON_MX_TRACTOR_NO_EXTRA_BOX_FEE', currency)
    }
    const knownNonLaborVariableComponentsUsd = rows.reduce((sum, row) => sum + row.amountUsd, 0)
    if (new Set(rows.map(v => v.id)).size !== rows.length) throw new Error('B2_SEPTEMBER_COMPONENT_DUPLICATE')
    const defSensitivity = [def.sourceLow, def.sourceHigh].map(fraction => {
      const mxDefLiters = mxDiesel * fraction, usDefGallons = usDiesel * fraction
      const knownDefAlternativeUsd = mxDefLiters * mxDefUnitMxn / fx.mxnPerUsd + usDefGallons * usDefUnitUsd
      const deltaUsdVsReference = knownDefAlternativeUsd - knownDefComponentsUsd
      return { fraction, mxDefLiters, usDefGallons, knownDefComponentsUsd: knownDefAlternativeUsd, deltaUsdVsReference,
        knownNonLaborAlternativeSubtotalUsd: knownNonLaborVariableComponentsUsd + deltaUsdVsReference,
        replacesReferenceDefOnly: true, addedToReferenceAgain: false, selectedByUser: false, isFullCostBound: false }
    })
    return { cycleId: s.cycleScenarioId, referencePeriod: '2026-09', fx, rows,
      knownNonLaborVariableComponentsUsd, defSensitivity,
      defReference: { fraction: def.volumeFraction, knownDefComponentsUsd, mxDefUnitMxn, usDefUnitUsd,
        dieselInputs: ['MX_ROAD_FUEL', 'MX_IDLE_FUEL', 'US_ROAD_FUEL', 'US_IDLE_FUEL'],
        selectedByUser: false, actualScrVerified: false, manufacturerMatchedCalibration: false,
        idleFuelAddedAgain: false, fullContainerPurchaseAddedAgain: false, sourceReviewedAt: fluids.reviewedAt,
        manufacturerSourceCapture: fluids.sources.find(v => v.id === 'CUMMINS_ONHIGHWAY_DEF')!.capture },
      roadCoverage: { knownForwardAggregateMxn: selectedTotal, providerOriginalTotalMxn: roads.providerOriginalTotalMxn,
        attachedMultiplicity: multiplicity, extraJorobasChargeAdded: false, carboneraCurrentMxn: null,
        networkBobtailRoadMxn: null, usInlandTollsUsd: null, handoffServicesUsd: null,
        mxNorthDirectionApplicationVerified: false, reverseRoadMovementsObserved: false, truckRouteValidated: false,
        sourcesReviewedAt: roads.reviewedAt, undatedTariffMovementCount: roads.selections.filter(v => v.effectiveFrom === null).length },
      sourceDatesPreserved: true, historicalSourceTransfer: 'DECLARED_UNCHANGED_RATE_NO_INFLATION_OR_VAT_ESCALATION',
      historicalSeptemberPricesVerified: false,
      oldDriverRowsExcluded: true, octoberFixedAllocationsTransferred: false, octoberUsdSubtotalsTransferred: false,
      extraBoxVariableChargeAdded: false, extraUsLubricantChargeAdded: false,
      homogeneousTaxBasis: false, matchedCarrierCohort: false, isLowerBound: false,
      unreconstructedConcepts: ['MX_ROAD_TOLL_REMAINDER', 'US_ROAD_TOLLS', 'BRIDGE_DIRECTION_AND_APPLICATION', 'HANDOFF_INCREMENTAL_SERVICES'],
      completeCvuUsd: null, completeCfuUsd: null, completeTripCostUsd: null, quoteReady: false, adoptedValues: 0 }
  })
}

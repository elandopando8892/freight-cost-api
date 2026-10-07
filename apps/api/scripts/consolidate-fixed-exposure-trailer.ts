import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { assembleEconomicCards, EconomicCardsSchema, readLocalDocument } from './assemble-economic-reference-cards.js'
import { FuelResearchSchema } from './review-fuel-reference.js'
import { MaintenanceResearchSchema } from './review-maintenance-tires-reference.js'

/** Consolidates the unresolved research snapshot, not a new economic model.
 * No arithmetic, defaults, route selection, engine execution or external writes. */
const files = {
  assembly: 'docs/research/B2_ECONOMIC_REFERENCE_CARDS_2026-09-30.json',
  fuel: 'docs/research/B2_FUEL_PRICE_PERFORMANCE_REFERENCE_2026-09-30.json',
  maintenance: 'docs/research/B2_MAINTENANCE_TIRES_REFERENCE_2026-09-30.json',
} as const
const country = z.enum(['MX', 'US'])
const pending = { calibrated: z.literal(false), quoteReady: z.literal(false), adoptedValues: z.literal(0) }
const hash = (content: string) => createHash('sha256').update(content).digest('hex')
export const ConsolidationSchema = z.object({
  artifact: z.literal('FCM_B2_FIXED_EXPOSURE_TRAILER_CONSOLIDATION'),
  cutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  baseHead: z.string().regex(/^[a-f0-9]{40}$/),
  mode: z.literal('LOCAL_RESEARCH_HANDOFF_ONLY'), ...pending,
  sources: z.array(z.object({ id: z.enum(['assembly', 'fuel', 'maintenance']),
    file: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict()).length(3),
  nextCut: z.literal('D2D_CASE_READINESS_AND_HANDOFF'),
}).strict()

// Nulls are intentional pending snapshot assertions, never a zero-cost assumption.
const ProfileSchema = z.object({ ...pending,
  profiles: z.array(z.object({ country, id: z.string(), proposedEquipment: z.string(),
    profileBasis: z.literal('PLANNING_DESIGN_NOT_OBSERVED_CARRIER'),
    sourceMatchesTargetProfile: z.literal(false), actualFleetTractors: z.null(),
    actualTrailerStockRatio: z.null(), emptyKmShare: z.null(), economicAmounts: z.null(),
    exposureScenarioSourceId: z.string() }).passthrough()).length(2),
  method: z.object({ normalizationUnit: z.literal('ONE_TRACTOR_EQUIVALENT_NOT_CARRIER_FLEET_SIZE'),
    calendarReferencePeriod: z.null(), transferToGovernedContract: z.literal(false) }).passthrough(),
  sharedTrailer: z.object({ economicCostBearer: z.null(), allocationBetweenCarriers: z.null(),
    knownZeroCost: z.literal(false), costIncludedInProfiles: z.literal(false) }).passthrough(),
}).passthrough()
const CoreSchema = z.object({ adopted: z.literal(false), quoteReady: z.literal(false),
  contracts: z.array(z.object({ country, cohortId: z.string(), referencePeriod: z.literal('UNRESOLVED'),
    baseRevision: z.literal('UNRESOLVED'), assetCostScope: z.null(),
    exposure: z.object({ fleetTractors: z.null(), totalKmPerFleetMonth: z.null(),
      productiveVehicleDaysPerFleetMonth: z.null() }).strict(),
    administration: z.object({ method: z.null(), combinedOverhead: z.null() }).passthrough(),
  }).passthrough()).length(2),
}).passthrough()
const ResidualSchema = z.object({ ...pending,
  sharedTrailer: z.object({ chosenEconomicOwner: z.null(), chosenCostBearer: z.null(),
    chosenSettlementShares: z.null(), countryOfEconomicBase: z.null(), knownZeroCost: z.literal(false),
    costIncludedInTractorOnlyLegs: z.literal(false),
    responsibilityOptions: z.array(z.object({ id: z.string(), kind: z.literal('UNSELECTED_ACCOUNTABILITY_POLICY'),
      actualOwnershipEstablished: z.literal(false) }).passthrough()).length(3),
  }).passthrough(),
}).passthrough()
const InsuranceSchema = z.object({ ...pending,
  pilotCards: z.array(z.object({ country, monthlyInsuranceFleetUsd: z.null(),
    policyTermMonths: z.null(), termPremiumUsd: z.null(), assetAndCustodyAllocation: z.null() }).passthrough()).length(2),
  canonicalBridge: z.object({ periodNormalizationImplemented: z.literal(false),
    activeFormulaChanged: z.literal(false), risk: z.string() }).passthrough(),
}).passthrough()
const CapitalSchema = z.object({ ...pending,
  acquisitionCards: z.array(z.object({ country, capitalizableAcquisitionCost: z.null(),
    remainingHorizonMonths: z.null(), netResidualAtEnd: z.null(), monthlyInterestExpense: z.null(),
    monthlyDepreciation: z.null() }).passthrough()).length(2),
}).passthrough()
function pair<T extends { country: 'MX' | 'US' }>(rows: T[]) {
  if (rows.length !== 2 || new Set(rows.map(row => row.country)).size !== 2) throw new Error('COUNTRY_COVERAGE_MISMATCH')
  return (key: 'MX' | 'US') => rows.find(row => row.country === key)!
}

export function consolidateFixedExposureTrailer(raw: unknown, readSource: (file: string) => string) {
  const input = ConsolidationSchema.parse(raw)
  if (new Set(input.sources.map(source => source.id)).size !== 3) throw new Error('DUPLICATE_SOURCE_ID')
  const cache = new Map<string, string>()
  const pins = new Map<string, string>()
  const read = (file: string) => {
    if (!cache.has(file)) cache.set(file, readSource(file))
    return cache.get(file)!
  }
  const pin = (file: string, sha256: string) => {
    if (hash(read(file)) !== sha256) throw new Error(`SOURCE_HASH_MISMATCH:${file}`)
    if (pins.has(file) && pins.get(file) !== sha256) throw new Error('CONFLICTING_SOURCE_PIN')
    pins.set(file, sha256)
  }
  for (const source of input.sources) {
    if (source.file !== files[source.id]) throw new Error('SOURCE_ID_FILE_MISMATCH')
    pin(source.file, source.sha256)
  }
  const assembly = EconomicCardsSchema.parse(JSON.parse(read(files.assembly)))
  const assembled = assembleEconomicCards(assembly, read)
  for (const source of assembly.sources) pin(source.file, source.sha256)
  const fuel = FuelResearchSchema.parse(JSON.parse(read(files.fuel)))
  const maintenance = MaintenanceResearchSchema.parse(JSON.parse(read(files.maintenance)))
  for (const document of [assembly, fuel, maintenance]) {
    if (document.baseHead !== input.baseHead) throw new Error('BASE_HEAD_MISMATCH')
    if (document.cutDate > input.cutDate) throw new Error('SOURCE_DATE_AFTER_CUT')
  }
  for (const source of [...fuel.unchangedFiles, ...maintenance.unchangedFiles]) pin(source.file, source.sha256)
  const document = (id: string): unknown => {
    const source = assembly.sources.find(source => source.id === id)
    if (!source) throw new Error(`SOURCE_REF_MISSING:${id}`)
    return JSON.parse(read(source.file))
  }
  const profile = ProfileSchema.parse(document('profile'))
  const core = CoreSchema.parse(document('core'))
  const residual = ResidualSchema.parse(document('residual'))
  const insurance = InsuranceSchema.parse(document('insurance'))
  const capital = CapitalSchema.parse(document('acquisition'))
  const byProfile = pair(profile.profiles), byContract = pair(core.contracts)
  const byInsurance = pair(insurance.pilotCards), byCapital = pair(capital.acquisitionCards)
  const byFuel = pair(fuel.countryCards), byMaintenance = pair(maintenance.countryCards)
  const byCard = pair(assembled.cards)
  const countries = (['MX', 'US'] as const).map(key => {
    const card = byCard(key), reference = byProfile(key), contract = byContract(key)
    return { country: key, profileId: reference.id, equipment: reference.proposedEquipment,
      profileStatus: reference.profileBasis, observedCarrierFleet: false,
      cohortId: contract.cohortId, baseRevision: contract.baseRevision,
      referencePeriod: contract.referencePeriod, exposure: contract.exposure,
      historicalExposureSourceId: reference.exposureScenarioSourceId,
      historicalExposureAcceptedForPilot: reference.sourceMatchesTargetProfile,
      fixedAndFinanceSections: card.sections.filter(row =>
        ['COST_CAPITAL', 'COST_INSURANCE', 'COST_PAYROLL', 'COST_COMPANY', 'FINANCE'].includes(row.section)),
      exposureSections: card.sections.filter(row => ['GENERAL_BASE', 'UTILIZATION'].includes(row.section)),
      capital: { acquisitionCost: byCapital(key).capitalizableAcquisitionCost,
        remainingHorizonMonths: byCapital(key).remainingHorizonMonths,
        netResidual: byCapital(key).netResidualAtEnd, monthlyInterest: byCapital(key).monthlyInterestExpense },
      insurance: { monthlyFleetUsd: byInsurance(key).monthlyInsuranceFleetUsd,
        policyTermMonths: byInsurance(key).policyTermMonths, coverageAllocation: byInsurance(key).assetAndCustodyAllocation },
      administration: { selectedMethod: contract.administration.method, combinedOverhead: contract.administration.combinedOverhead },
      driver: card.sections.find(row => row.section === 'LABOR')!,
      fuel: byFuel(key), maintenanceAndTires: byMaintenance(key), outputs: card.outputs,
    }
  })
  return { artifact: input.artifact, cutDate: input.cutDate, baseHead: input.baseHead,
    status: 'NO_GO_ECONOMIC_HANDOFF', consolidationComplete: true,
    calibrated: false, quoteReady: false, adoptedValues: 0,
    sources: [...pins].map(([file, sha256]) => ({ file, sha256, externallyRefreshedThisCut: false })),
    sourceIntegrity: 'PINNED_LOCAL_DOCUMENTS_MATCH_NOT_EXTERNAL_FRESHNESS',
    existingAudit: { status: assembled.existingAuditStatus, issues: assembled.existingIssueCount },
    countries, sharedTrailer: { rule: assembled.sharedTrailer.rule,
      costIncludedInCountryTractorCards: false, selectedOwner: residual.sharedTrailer.chosenEconomicOwner,
      costBearer: residual.sharedTrailer.chosenCostBearer, settlementShares: residual.sharedTrailer.chosenSettlementShares,
      countryOfEconomicBase: residual.sharedTrailer.countryOfEconomicBase,
      availableUnselectedPolicies: residual.sharedTrailer.responsibilityOptions.map(option => option.id),
      monthlyFixedUsd: null, cfuUsd: null, cvuUsd: null, knownZeroCost: false,
      syntheticStressImported: false, compositeCountryRatesAddable: false, defaultHalfSplit: false },
    safeguards: { exposureNormalization: profile.method.normalizationUnit,
      inferredFleetSize: null, allocation: 'MAX_DISTANCE_TIME_NOT_SUM',
      adminAndCombinedOverheadAddable: false, employerTotalPlusBenefitsAddable: false,
      annualInsuranceTermNormalizationImplemented: insurance.canonicalBridge.periodNormalizationImplemented,
      insuranceTermRisk: insurance.canonicalBridge.risk,
      activeEngineChanged: false, formulasEvaluated: false },
    trip: assembled.trip,
    handoff: { B1: 'OPEN', B2: 'PARTIAL', economicClose: false, businessGatesClosed: 0,
      businessGatesTotal: 4, nextCut: input.nextCut,
      acceptance: 'One D2D readiness case using these country-bound cards; calculate only after compatible rates, trailer and trip evidence exist.',
      missingPackages: [
        { id: 'PROFILE_FIXED_EXPOSURE', needs: 'Same country/cohort/asset scope/period and currency for fixed budget, fleet km and productive days; no fleet-size-one inference.' },
        { id: 'TRACTOR_CAPITAL_FINANCE', needs: 'Capitalizable cost, net residual, remaining planned use, tenancy/financing inclusions per national used-tractor profile.' },
        { id: 'ADMIN_OVERHEAD', needs: 'Supported role/FTE method OR supported combined overhead, with employer benefits and corporate exclusions; never both for the same expenses.' },
        { id: 'INSURANCE', needs: 'Public reference package with territory, custody, limits, term premium and normalized monthly treatment; legacy annual/term ambiguity resolved before adoption.' },
        { id: 'SHARED_TRAILER', needs: 'Economic owner/bearer, own budget/exposure, whole physical cycle including dwell/empty, documented reporting shares; allocate once.' },
        { id: 'DRIVER_FUEL_MAINT_TIRES', needs: 'Applicable driver employer cost, dated fuel/FX, compatible loaded-empty performance, exclusive tractor/trailer maintenance and tire boundaries.' },
        { id: 'TRIP_BORDER', needs: 'Named route, interchange, loaded/empty distances and cycle times per leg and trailer; tolls/border inclusions and valid evidence.' },
      ],
      inferredPurchaseOrSellPrice: false, routeReverseSwapsNationalBases: false },
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    if (args.length !== 1) throw new Error('Usage: tsx consolidate-fixed-exposure-trailer.ts <docs/research/manifest.json>')
    const root = fileURLToPath(new URL('../../../', import.meta.url))
    const target = realpathSync(resolve(args[0]))
    if (dirname(target) !== realpathSync(resolve(root, 'docs/research'))) throw new Error('MANIFEST_OUTSIDE_RESEARCH')
    console.log(JSON.stringify(consolidateFixedExposureTrailer(JSON.parse(readLocalDocument(`docs/research/${target.split(/[\\/]/).pop()}`)), readLocalDocument), null, 2))
    process.exitCode = 2 // Expected NO-GO; exit 0 would falsely suggest economic acceptance.
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Consolidation failed')
    process.exitCode = 1
  }
}

import { createHash } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

/** Offline dimensional/exclusivity review; no engine execution, network or base adoption. */
export const KM_PER_MILE = 1.609344
const text = z.string().min(1)
const texts = z.array(text).min(1)
const positive = z.number().finite().positive().max(Number.MAX_SAFE_INTEGER / 10000)
const country = z.enum(['MX', 'US'])
const sha = z.string().regex(/^[a-f0-9]{64}$/)
const kind = z.enum(['MAINT_LABOR', 'MAINT_PARTS', 'LUBRICANTS', 'TIRES', 'MAINT_AGGREGATE'])
const unit = z.enum(['MXN/1000vehicle-km', 'USD/vehicle-mile'])
const path = z.string().regex(/^docs\/(?:research\/(?:sources\/)?)?[A-Za-z0-9_-]+\.(pdf|json|md)$/)
const row = z.object({ id: text, country, sourceId: text, kind, value: positive, unit,
  referencePeriod: text, assetScope: z.literal('TRACTOR_AND_TRAILER_COMPOSITE_UNSPLIT'),
  use: z.literal('PUBLIC_CONTRAST_NOT_BASE_INPUT'), includes: texts, excludes: texts }).strict()
const card = z.object({ country, maintenanceUsdPerKm: z.null(), tiresUsdPerKm: z.null(),
  pilotCvuUsd: z.null(), fxMxnPerUsd: z.null(), tractorOnlyRate: z.null(), trailerOnlyRate: z.null(),
  allocationShares: z.null(), status: z.literal('NO_GO_TARGET_PROFILE_AND_ALLOCATION'), blockingItems: texts }).strict()
export const MaintenanceResearchSchema = z.object({
  artifact: z.literal('FCM_B2_MAINTENANCE_TIRES_RESEARCH'), cutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  baseHead: z.string().regex(/^[a-f0-9]{40}$/), status: z.literal('PARTIAL_CONTRAST_NO_GO_TARGET_ALLOCATION'),
  calibrated: z.literal(false), quoteReady: z.literal(false), adoptedValues: z.literal(0),
  units: z.object({ kmPerInternationalMile: z.literal(KM_PER_MILE), analysisOnly: z.literal(true) }).strict(),
  sources: z.array(z.object({ id: text, country, file: path, sha256: sha, url: z.string().url(),
    referencePeriod: text, locator: text, kind: z.enum(['OFFICIAL_TECHNICAL_MODEL', 'RESEARCH_AGGREGATE_ESTIMATE', 'METHOD_ONLY_NO_PRICES']),
    limitations: texts }).strict()).length(3),
  records: z.array(row).length(6),
  groups: z.array(z.object({ id: text, country, sourceId: text, recordIds: texts,
    costScope: z.literal('COMPOSITE_COMBO_NOT_D2D_SUM'), countryComparisonAllowed: z.literal(false),
    targetMatched: z.literal(false) }).strict()).length(2),
  printedPrecision: z.object({ mx: z.object({
    lubricantsLitersPer1000Km: positive, lubricantsMxnPerLiter: positive, laborHoursPer1000Km: positive,
    laborMxnPerHour: positive, partsPercentOfVehicleRounded: positive, vehiclePriceMxn: positive,
    tireEquivalentNewPer1000KmRounded: positive, newTireMxn: positive,
    rule: z.literal('PRESERVE_PRINTED_COSTS_NOT_ROUNDED_RECONSTRUCTION') }).strict() }).strict(),
  methodBoundary: z.object({ surveySourceId: text, rmIncludes: texts, rmExcludes: texts,
    tiresInclude: texts, denominator: z.literal('TOTAL_COST_BEARING_VEHICLE_MILES_WITH_MATCHED_COST_POPULATION'),
    ttiExactSameBoundaryVerified: z.literal(false) }).strict(),
  engineBridge: z.object({ maintenanceSection: z.literal('COST_MAINT'), tiresSection: z.literal('COST_TIRES'),
    maintenanceKeys: z.literal(31), tireKeys: z.literal(12), maintenanceFormula: text, tiresFormula: text,
    legacyRisk: text, existingLifecycleModule: text, existingBoundaryModule: text, integrated: z.literal(false),
    parameterExpansionAllowed: z.literal(false), impliedInstalledPricesAllowed: z.literal(false),
    defaultsAdopted: z.literal(false) }).strict(),
  countryCards: z.array(card).length(2),
  sharedTrailer: z.object({ rule: z.literal('ONE_PHYSICAL_CYCLE_THEN_ALLOCATE'),
    comboRatesAddableAcrossCountries: z.literal(false), arbitraryHalfSplitAllowed: z.literal(false),
    costBearer: z.null(), settlementShares: z.null() }).strict(),
  decision: z.object({ researchCutClosed: z.literal(true), economicFamilyClosed: z.literal(false),
    B1: z.literal('OPEN'), B2: z.literal('PARTIAL'), businessGatesClosed: z.literal(0),
    businessGatesTotal: z.literal(4), nextCut: z.literal('FIXED_EXPOSURE_TRAILER_CONSOLIDATION'), reopenOnlyWith: text }).strict(),
  unchangedFiles: z.array(z.object({ file: path, sha256: sha }).strict()).length(7),
  externalChanges: z.object({ database: z.literal(false), auth: z.literal(false), users: z.literal(false),
    infrastructure: z.literal(false), deployment: z.literal(false), businessOperations: z.literal(false), applicationAi: z.literal(false) }).strict(),
}).strict()

export function costPerVehicleKm(value: number, inputUnit: z.infer<typeof unit>) {
  positive.parse(value); unit.parse(inputUnit)
  return inputUnit === 'MXN/1000vehicle-km' ? value / 1000 : value / KM_PER_MILE
}

/** Does not synthesize granular Qty/PU/Life/PM intervals or use a missing FX. */
export function reviewMaintenanceTires(raw: unknown) {
  const data = MaintenanceResearchSchema.parse(raw)
  for (const items of [data.sources, data.records, data.groups]) {
    if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('DUPLICATE_RECORD_ID')
  }
  if (new Set(data.groups.map(g => g.country)).size !== 2 ||
      new Set(data.countryCards.map(g => g.country)).size !== 2) throw new Error('COUNTRY_COVERAGE_MISMATCH')
  const method = data.sources.find(s => s.id === data.methodBoundary.surveySourceId)
  if (!method || method.kind !== 'METHOD_ONLY_NO_PRICES') throw new Error('METHOD_SOURCE_MISMATCH')
  if (!data.methodBoundary.rmExcludes.includes('TIRES') || !data.methodBoundary.rmExcludes.includes('TOWS') ||
      !data.methodBoundary.rmIncludes.includes('MAINT_LABOR') ||
      !data.methodBoundary.tiresInclude.includes('RETREAD')) throw new Error('INCLUSION_BOUNDARY_INCOMPLETE')
  for (const record of data.records) {
    const source = data.sources.find(s => s.id === record.sourceId)
    if (!source || source.country !== record.country) throw new Error('SOURCE_COUNTRY_MISMATCH')
    if (source.kind === 'METHOD_ONLY_NO_PRICES') throw new Error('METHOD_FORM_IS_NOT_A_PRICE')
    if (record.referencePeriod !== source.referencePeriod) throw new Error('REFERENCE_PERIOD_MISMATCH')
    if (!/^\d{4}$/.test(source.referencePeriod) || source.referencePeriod > data.cutDate.slice(0, 4)) throw new Error('INVALID_REFERENCE_PERIOD')
    if ((record.country === 'MX') !== (record.unit === 'MXN/1000vehicle-km')) throw new Error('UNIT_COUNTRY_MISMATCH')
    if (new Set(record.includes).size !== record.includes.length ||
        record.includes.some(item => record.excludes.includes(item))) throw new Error('INCLUSION_BOUNDARY_OVERLAP')
    if (record.kind !== 'TIRES' && !record.excludes.includes('TIRES')) throw new Error('MAINTENANCE_MUST_EXCLUDE_TIRES')
    if (record.kind === 'TIRES' && record.includes.some(item => item.startsWith('MAINT'))) throw new Error('TIRES_MUST_EXCLUDE_MAINTENANCE')
  }
  const assigned: string[] = []
  const contrasts = data.groups.map(group => {
    const selected = group.recordIds.map(id => {
      const record = data.records.find(r => r.id === id)
      if (!record) throw new Error('MISSING_RECORD_REFERENCE')
      if (record.country !== group.country || record.sourceId !== group.sourceId) throw new Error('GROUP_SCOPE_MISMATCH')
      return record
    })
    assigned.push(...group.recordIds)
    const included = selected.flatMap(r => r.includes)
    if (new Set(included).size !== included.length) throw new Error('DOUBLE_COUNTED_ITEM')
    if (new Set(selected.map(r => r.kind)).size !== selected.length) throw new Error('DOUBLE_COUNTED_KIND')
    const expectedKinds = group.country === 'MX'
      ? ['MAINT_LABOR', 'MAINT_PARTS', 'LUBRICANTS', 'TIRES'] : ['MAINT_AGGREGATE', 'TIRES']
    if (selected.length !== expectedKinds.length || expectedKinds.some(k => !selected.some(r => r.kind === k))) throw new Error('GROUP_COMPONENT_COVERAGE_MISMATCH')
    const normalized = selected.map(r => ({ ...r, nativeCostPerVehicleKm: costPerVehicleKm(r.value, r.unit) }))
    const sum = (kinds: string[]) => normalized.filter(r => kinds.includes(r.kind)).reduce((a, r) => a + r.nativeCostPerVehicleKm, 0)
    const maintenancePublishedComponentsWithoutTires = sum(['MAINT_LABOR', 'MAINT_PARTS', 'MAINT_AGGREGATE'])
    const separateLubricants = group.country === 'MX' ? sum(['LUBRICANTS']) : null
    const tires = sum(['TIRES'])
    return { id: group.id, country: group.country, currency: group.country === 'MX' ? 'MXN' : 'USD',
      purpose: 'PUBLIC_MODEL_CONTRAST_NOT_PILOT_RATE', referencePeriod: selected[0].referencePeriod,
      sourceId: group.sourceId, maintenancePublishedComponentsWithoutTires, separateLubricants, tires,
      sourceSelectedSubtotalPerVehicleKm: maintenancePublishedComponentsWithoutTires + (separateLubricants ?? 0) + tires,
      lubricantsBreakdownEstablished: group.country === 'MX',
      subtotalNotCompleteCvu: true, tractorOnlyRate: null, trailerOnlyRate: null, normalized }
  })
  if (assigned.length !== data.records.length || new Set(assigned).size !== data.records.length) throw new Error('RECORD_ASSIGNMENT_MISMATCH')
  return { status: data.status, contrasts, countryCards: data.countryCards, sharedTrailer: data.sharedTrailer,
    decision: data.decision, calibrated: false, quoteReady: false, adoptedValues: 0 }
}

export function verifyMaintenanceFiles(raw: unknown, readBytes: (file: string) => Buffer) {
  const data = MaintenanceResearchSchema.parse(raw)
  const pins = [...data.unchangedFiles, ...data.sources]
  if (new Set(pins.map(p => p.file)).size !== pins.length) throw new Error('DUPLICATE_PINNED_FILE')
  for (const pin of pins) if (createHash('sha256').update(readBytes(pin.file)).digest('hex') !== pin.sha256) {
    throw new Error('SOURCE_HASH_MISMATCH:' + pin.file)
  }
  return pins.length
}

/** Scoped local binary reader rejects symlink escapes; no writes or fetches. */
export function readScopedMaintenanceFile(root: string, file: string) {
  path.parse(file)
  const docs = realpathSync(resolve(root, 'docs'))
  const target = realpathSync(resolve(root, file))
  const rel = relative(docs, target)
  if (isAbsolute(rel) || rel === '..' || rel.startsWith('..' + sep) || resolve(docs, rel) !== target) throw new Error('SOURCE_PATH_ESCAPE')
  return readFileSync(target)
}

const entry = fileURLToPath(import.meta.url)
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(entry)) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: tsx review-maintenance-tires-reference.ts <docs/research/manifest.json>')
    const root = resolve(dirname(entry), '../../..')
    const allowedDir = realpathSync(resolve(root, 'docs/research'))
    const manifest = realpathSync(resolve(root, process.argv[2]))
    if (dirname(manifest) !== allowedDir || !manifest.endsWith('.json')) throw new Error('MANIFEST_PATH_ESCAPE')
    const data: unknown = JSON.parse(readFileSync(manifest, 'utf8'))
    const pinnedFilesMatched = verifyMaintenanceFiles(data, file => readScopedMaintenanceFile(root, file))
    console.log(JSON.stringify({ ...reviewMaintenanceTires(data), pinnedFilesMatched }, null, 2))
    process.exitCode = 2 // Expected economic NO-GO, not an adopted rate.
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Research review failed')
    process.exitCode = 1
  }
}


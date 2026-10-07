import { createHash } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { readLocalDocument } from './assemble-economic-reference-cards.js'

/** Offline public contrasts only. No quote-engine import, network, adoption or persistence. */
export const LITERS_PER_US_GALLON = 3.785411784
export const KM_PER_INTERNATIONAL_MILE = 1.609344
const country = z.enum(['MX', 'US'])
const positive = z.number().finite().positive()
const text = z.string().min(1)
const source = z.object({ id: text, url: z.string().url(), country,
  capture: z.enum(['PRIMARY_OFFICIAL_INDEXED_EXCERPT_ONLY', 'DIRECT_PUBLIC_WEB_TABLE', 'DIRECT_PDF_TEXT_AND_VISUAL']),
  publishedDate: text, locator: text,
  file: z.string().regex(/^docs\/research\/sources\/[A-Za-z0-9_-]+\.pdf$/).nullable(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(), limitations: z.array(text).min(1),
}).strict()
const price = z.object({ id: text, sourceId: text, country, value: positive,
  unit: z.enum(['MXN/liter', 'USD/US-gallon']), observationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  geography: text, product: text, taxBasis: text,
  verification: z.enum(['PRIMARY_INDEXED_EXCERPT_ONLY', 'DIRECT_PAGE_READ']),
  use: z.literal('PUBLIC_CONTRAST_NOT_CARRIER_PRICE'),
}).strict()
const performance = z.object({ id: text, sourceId: text, country, value: positive,
  unit: z.enum(['km/liter', 'mile/US-gallon']),
  loadStatus: z.enum(['ROUNDTRIP_LOAD_DECLARED_SPLIT_UNRESOLVED', 'TOTAL_WEIGHT_BIN_NOT_EMPTY_CERTIFIED']),
  route: text.nullable(), modelYear: z.number().int(), payloadTonnes: positive.nullable(), speedKmh: positive,
  weightBinLb: z.tuple([positive, positive]).nullable(), averageWeightLb: positive.nullable(),
  sourceDistanceMiles: positive.nullable(), sourceFuelUsGallons: positive.nullable(),
  observationPeriod: text, conditions: text, emptyConfirmed: z.literal(false), targetProfileMatched: z.literal(false),
}).strict()
const card = z.object({ country, loadedKmPerLiter: z.null(), emptyKmPerLiter: z.null(), dieselUsdPerLiter: z.null(),
  pilotFuelUsdPerKm: z.null(), pilotFuelTripUsd: z.null(), fxMxnPerUsd: z.null(), routeSelected: z.literal(false),
  status: z.literal('NO_GO_MATCHED_LOADED_EMPTY_PAIR'), blockingItems: z.array(text).min(1) }).strict()
export const FuelResearchSchema = z.object({ artifact: z.literal('FCM_B2_FUEL_REFERENCE_RESEARCH'), cutDate: text,
  baseHead: z.string().regex(/^[a-f0-9]{40}$/), status: z.literal('PARTIAL_CONTRAST_NO_GO_PILOT_PAIR'),
  calibrated: z.literal(false), quoteReady: z.literal(false), adoptedValues: z.literal(0),
  units: z.object({ litersPerUsGallon: z.literal(LITERS_PER_US_GALLON), kmPerInternationalMile: z.literal(KM_PER_INTERNATIONAL_MILE),
    analysisOnlyNotEngineChange: z.literal(true), reference: z.string().url() }).strict(),
  sources: z.array(source).length(4), prices: z.array(price).length(2), performance: z.array(performance).length(4),
  countryCards: z.array(card).length(2),
  engineBridge: z.object({ fuelPriceMXKey: text, fuelPriceUSKey: text, fxKey: text, loadedKey: text, emptyKey: text,
    usInputUnit: z.literal('USD/L'), performanceInputUnit: z.literal('km/L'), formula: text,
    integrated: z.literal(false), adoptionPerformed: z.literal(false), inclusionPolicy: text }).strict(),
  decision: z.object({ B1: z.literal('OPEN'), B2: z.literal('PARTIAL'), businessGatesClosed: z.literal(0), businessGatesTotal: z.literal(4),
    researchCutClosed: z.literal(true), economicFamilyClosed: z.literal(false),
    nextCut: z.literal('MAINTENANCE_TIRES_EXCLUSIVE_COST_PER_KM'), reopenFuelOnlyWith: text }).strict(),
  unchangedFiles: z.array(z.object({ file: z.string().regex(/^docs\/(?:research\/)?[A-Za-z0-9_-]+\.(json|md)$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict()).length(4),
  externalChanges: z.object({ database: z.literal(false), auth: z.literal(false), users: z.literal(false),
    infrastructure: z.literal(false), deployment: z.literal(false), businessOperations: z.literal(false), applicationAi: z.literal(false) }).strict(),
}).strict()

export function pricePerLiter(value: number, unit: 'MXN/liter' | 'USD/US-gallon') {
  positive.parse(value)
  z.enum(['MXN/liter', 'USD/US-gallon']).parse(unit)
  return unit === 'USD/US-gallon' ? value / LITERS_PER_US_GALLON : value
}
export function performanceKmPerLiter(value: number, unit: 'km/liter' | 'mile/US-gallon') {
  positive.parse(value)
  z.enum(['km/liter', 'mile/US-gallon']).parse(unit)
  return unit === 'mile/US-gallon' ? value * KM_PER_INTERNATIONAL_MILE / LITERS_PER_US_GALLON : value
}

export function reviewFuelReference(raw: unknown) {
  const input = FuelResearchSchema.parse(raw)
  for (const rows of [input.sources, input.prices, input.performance]) {
    if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('DUPLICATE_RECORD_ID')
  }
  if (new Set(input.countryCards.map(row => row.country)).size !== 2 ||
      new Set(input.prices.map(row => row.country)).size !== 2) throw new Error('COUNTRY_COVERAGE_MISMATCH')
  for (const row of [...input.prices, ...input.performance]) {
    const owner = input.sources.find(source => source.id === row.sourceId)
    if (!owner || owner.country !== row.country) throw new Error('SOURCE_COUNTRY_MISMATCH')
  }
  for (const observation of input.prices) {
    if ((observation.country === 'MX') !== (observation.unit === 'MXN/liter')) throw new Error('PRICE_UNIT_COUNTRY_MISMATCH')
    const capture = input.sources.find(source => source.id === observation.sourceId)!.capture
    if ((observation.verification === 'PRIMARY_INDEXED_EXCERPT_ONLY') !== (capture === 'PRIMARY_OFFICIAL_INDEXED_EXCERPT_ONLY')) {
      throw new Error('PRICE_VERIFICATION_MISMATCH')
    }
    if (observation.observationDate > input.cutDate) throw new Error('FUTURE_PRICE_OBSERVATION')
  }
  for (const observation of input.performance) {
    if ((observation.country === 'MX') !== (observation.unit === 'km/liter')) throw new Error('PERFORMANCE_UNIT_COUNTRY_MISMATCH')
    if (observation.country === 'MX' && observation.loadStatus !== 'ROUNDTRIP_LOAD_DECLARED_SPLIT_UNRESOLVED') throw new Error('LOAD_SCOPE_MISMATCH')
    if (observation.country === 'US' && observation.loadStatus !== 'TOTAL_WEIGHT_BIN_NOT_EMPTY_CERTIFIED') throw new Error('LOAD_SCOPE_MISMATCH')
    if (observation.weightBinLb && (observation.weightBinLb[0] >= observation.weightBinLb[1] ||
        observation.averageWeightLb === null || observation.averageWeightLb < observation.weightBinLb[0] ||
        observation.averageWeightLb > observation.weightBinLb[1])) throw new Error('WEIGHT_BIN_MISMATCH')
  }
  const contrasts = input.performance.map(observation => {
    const nationalPrice = input.prices.find(price => price.country === observation.country)!
    const perLiter = pricePerLiter(nationalPrice.value, nationalPrice.unit)
    const kmPerLiter = performanceKmPerLiter(observation.value, observation.unit)
    return { id: observation.id, country: observation.country,
      purpose: 'CROSS_PERIOD_PUBLIC_SENSITIVITY_NOT_BASE_INPUT',
      currency: observation.country === 'MX' ? 'MXN' : 'USD',
      nativePricePerLiter: perLiter, kmPerLiter,
      litersPer100Km: 100 / kmPerLiter,
      nativeCostPerKm: perLiter / kmPerLiter, nativeCostPer100Km: 100 * perLiter / kmPerLiter,
      priceObservationDate: nationalPrice.observationDate, performancePeriod: observation.observationPeriod,
      priceVerification: nationalPrice.verification, emptyConfirmed: false, targetProfileMatched: false,
    }
  })
  return { status: input.status, contrasts, countryCards: input.countryCards, decision: input.decision,
    calibrated: false, quoteReady: false, adoptedValues: 0 }
}

/** Verify archived PDFs and older dossiers without modifying or fetching anything. */
export function verifyFuelFiles(raw: unknown, readBytes: (file: string) => Buffer) {
  const input = FuelResearchSchema.parse(raw)
  const files = [...input.unchangedFiles, ...input.sources.filter(source => source.file !== null)
    .map(source => ({ file: source.file!, sha256: source.sha256 }))]
  if (input.sources.some(source => (source.file === null) !== (source.sha256 === null))) throw new Error('ARCHIVE_METADATA_MISMATCH')
  for (const file of files) {
    if (!file.sha256 || createHash('sha256').update(readBytes(file.file)).digest('hex') !== file.sha256) {
      throw new Error(`SOURCE_HASH_MISMATCH:${file.file}`)
    }
  }
  return files.length
}

const root = fileURLToPath(new URL('../../../', import.meta.url))
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: tsx scripts/review-fuel-reference.ts <docs/research/fuel.json>')
    const file = realpathSync(resolve(process.argv[2]))
    if (dirname(file) !== realpathSync(resolve(root, 'docs/research'))) throw new Error('MANIFEST_OUTSIDE_RESEARCH')
    const data = JSON.parse(readFileSync(file, 'utf8'))
    const pinnedFilesMatched = verifyFuelFiles(data, path => path.endsWith('.pdf')
      ? Buffer.from(readFileSync(resolve(root, path))) : Buffer.from(readLocalDocument(path)))
    console.log(JSON.stringify({ ...reviewFuelReference(data), pinnedFilesMatched }, null, 2))
    process.exitCode = 2 // Honest incomplete pilot pair, not a numerical quote.
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Fuel review failed')
    process.exitCode = 1
  }
}

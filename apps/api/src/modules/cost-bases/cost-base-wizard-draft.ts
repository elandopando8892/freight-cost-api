import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { z } from 'zod'
import { PARAMETER_DEFINITIONS, parameterKey } from '../../data/parameter-catalog.js'
import { assertAssumptionValueDomain } from '../assumptions/assumption-domain.js'

// W1: decisions and staged native inputs travel together. No DB, publication,
// calculations, AI or filesystem access in this module.
export const WIZARD_SOURCE_PINS = {
  fuel: { file: 'docs/research/B2_FUEL_PRICE_PERFORMANCE_REFERENCE_2026-09-30.json',
    sha256: '8824dcdb1180e28c9b7950bb4b77155b94edce78410f6a392a3cdaecc8c80be1' },
  maintenance: { file: 'docs/research/B2_US_MAINTENANCE_PLANNING_2026-10-03.json',
    sha256: '0eab0a22dbf81f074080f305ae44afbe9a1c14f106b920e2544c9e4c637306a1' },
} as const
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const priceSchema = z.object({ id: z.string(), sourceId: z.string(), value: z.number().finite().positive(),
  unit: z.string(), observationDate: z.string(), geography: z.string(), taxBasis: z.string() }).passthrough()
const sourceSchema = z.object({ id: z.string(), url: z.string().url(), locator: z.string(),
  publishedDate: z.string(), capture: z.string(), limitations: z.array(z.string()) }).passthrough()
const fuelSchema = z.object({ prices: z.array(priceSchema), sources: z.array(sourceSchema),
  units: z.object({ litersPerUsGallon: z.literal(3.785411784) }).passthrough() }).passthrough()
const maintenanceSchema = z.object({ maintenanceUsdPerInternationalMile: z.number().finite().positive(),
  operationsYear: z.number().int(), scope: z.literal('ATTACHED_TRACTOR_TRAILER_COMPOSITE'),
  limitations: z.array(z.string()), sources: z.array(z.object({ id: z.string(), url: z.string().url(),
    locator: z.string(), archive: z.object({ file: z.string(), sha256: z.string() }) }).passthrough()) }).passthrough()

export class WizardDraftError extends Error {
  constructor(message: string, readonly statusCode = 422) { super(message) }
}
function pinnedJson(body: string, expected: string) {
  if (createHash('sha256').update(body.replace(/\r\n/g, '\n')).digest('hex') !== expected)
    throw new WizardDraftError('SOURCE_HASH_MISMATCH')
  return JSON.parse(body)
}

export function buildWizardReferenceCatalog(documents: { fuel: string; maintenance: string }) {
  const fuel = fuelSchema.parse(pinnedJson(documents.fuel, WIZARD_SOURCE_PINS.fuel.sha256))
  const maintenance = maintenanceSchema.parse(pinnedJson(documents.maintenance, WIZARD_SOURCE_PINS.maintenance.sha256))
  const profile = { id: 'D2D_BINATIONAL_OWN_DRY_VAN_53_RELAY_SEP2026', segment: 'D2D_BINATIONAL_OWN',
    equipment: 'DRY_VAN_53', tractorPolicy: 'OWN_MX_US_RELAY_SAME_TRAILER', period: '2026-09' } as const
  const fuelCards = [
    { id: 'diesel-mx', priceId: 'MX_NATIONAL_REPORTED', field: 'Diesel MX', label: 'Precio de diésel · México', country: 'MX', unit: 'MXN/L' },
    { id: 'diesel-us', priceId: 'US_PADD3_RETAIL', field: 'Diesel US Border', label: 'Precio de diésel · EE. UU.', country: 'US', unit: 'USD/L' },
  ].map(config => {
    const price = fuel.prices.find(p => p.id === config.priceId)!
    const source = fuel.sources.find(s => s.id === price?.sourceId)!
    if (!price || !source) throw new WizardDraftError('SOURCE_ROW_MISSING')
    const divisor = config.country === 'US' ? fuel.units.litersPerUsGallon : 1
    if (price.unit !== (config.country === 'US' ? 'USD/US-gallon' : 'MXN/liter')) throw new WizardDraftError('SOURCE_UNIT_MISMATCH')
    const native = PARAMETER_DEFINITIONS.find(p => p.key === parameterKey('FUEL', config.field))!
    if (!native || native.unit !== config.unit) throw new WizardDraftError('CANONICAL_UNIT_MISMATCH')
    return { id: config.id, label: config.label, section: 'FUEL', country: config.country, unit: config.unit,
      effect: 'CVU', native: { key: native.key, section: native.section, field: native.field, unit: native.unit },
      statistics: { minimum: null, central: price.value / divisor, maximum: null,
        measure: 'PUBLISHED_AGGREGATE_MEAN', sampleSize: null },
      standard: { value: price.value / divisor, status: 'PROVISIONAL_PROFILE_REFERENCE' },
      premises: ['Compra en el ámbito y periodo de la fuente; no acredita un convenio o costo real del carrier.',
        config.country === 'MX' ? 'La media nacional no demuestra el precio del corredor.' : 'PADD3 no es una media observada de Laredo ni del corredor completo.',
        'Revisar impuestos, recuperación fiscal y condiciones de abastecimiento.'],
      evidence: { ...source, observationDate: price.observationDate, geography: price.geography,
        taxBasis: price.taxBasis, sourceValue: price.value, sourceUnit: price.unit,
        normalization: divisor === 1 ? 'IDENTITY' : 'USD_PER_US_GALLON / 3.785411784',
        file: WIZARD_SOURCE_PINS.fuel.file, pointer: `/prices/${fuel.prices.indexOf(price)}`,
        sha256: WIZARD_SOURCE_PINS.fuel.sha256 },
      limitations: [...source.limitations], mappingStatus: 'STAGED_NATIVE_INPUT' }
  })
  const original = maintenance.sources[0]
  if (!original) throw new WizardDraftError('MAINTENANCE_SOURCE_MISSING')
  const cards = [...fuelCards, { id: 'maintenance-us', label: 'Mantenimiento · EE. UU.', section: 'COST_MAINT', country: 'US',
    unit: 'USD/milla', effect: 'CVU', native: null,
    statistics: { minimum: null, central: maintenance.maintenanceUsdPerInternationalMile, maximum: null,
      measure: 'PUBLISHED_AGGREGATE_MEAN', sampleSize: null },
    standard: { value: maintenance.maintenanceUsdPerInternationalMile, status: 'PROVISIONAL_PROFILE_REFERENCE' },
    premises: ['Promedio de operaciones 2024, no costo observado del carrier en septiembre de 2026.',
      'Compuesto tractor y remolque; excluye llantas. No añadir otra partida de lubricación sobre el mismo total.',
      'El agregado por milla no determina cantidades y precios de cada servicio PM del catálogo canónico.'],
    evidence: { id: original.id, url: original.url, locator: original.locator, publishedDate: '2025',
      observationDate: String(maintenance.operationsYear), geography: 'US_INDUSTRY_AGGREGATE',
      capture: 'ARCHIVED_ORIGINAL_REPORT', taxBasis: 'NOT_HOMOGENIZED', sourceValue: maintenance.maintenanceUsdPerInternationalMile,
      sourceUnit: 'USD/international-mile', normalization: 'REFERENCE_ONLY_NO_PM_BACKSOLVE',
      file: WIZARD_SOURCE_PINS.maintenance.file, pointer: '/maintenanceUsdPerInternationalMile',
      sha256: WIZARD_SOURCE_PINS.maintenance.sha256, archive: original.archive, limitations: maintenance.limitations },
    limitations: [...maintenance.limitations], mappingStatus: 'REFERENCE_ONLY_COMPONENT_MAPPING_REQUIRED' }]
  return { schema: 'FCM_WIZARD_REFERENCE_V1', profile, cards,
    revision: hash({ profile, cards }), externallyRefreshedThisCut: false,
    statisticsFromCatalogDefaults: false, calibrated: false, quoteReady: false } as const
}
export type WizardCatalog = ReturnType<typeof buildWizardReferenceCatalog>
const contextSchema = z.object({ orgId: z.string().min(1).max(120), baseId: z.string().min(1).max(120),
  versionId: z.string().min(1).max(120) }).strict()
export type WizardContext = z.infer<typeof contextSchema>
const decisionSchema = z.object({ conceptId: z.string().min(1), referenceRevision: z.string().length(64),
  mode: z.enum(['LOW', 'CENTRAL', 'HIGH', 'MARKSMAN', 'MANUAL']), value: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
  identification: z.enum(['YES', 'PARTIAL', 'NO']), justification: z.string().trim().max(1000),
  provisionalAccepted: z.boolean() }).strict()
export type WizardDecision = z.infer<typeof decisionSchema>
export const WizardSaveSchema = z.object({ context: contextSchema, expectedRevision: z.number().int().nonnegative(),
  requestId: z.string().uuid(), decisions: z.array(decisionSchema).min(1).max(3) }).strict()
type StoredDecision = WizardDecision & { evidenceQuality: 'PROVISIONAL_PROFILE_REFERENCE' }
type NativeValue = { key: string; section: string; field: string; unit: string; value: number; conceptId: string }
export type WizardDraft = { schema: 'FCM_WIZARD_LOCAL_DRAFT_V1'; context: WizardContext; referenceRevision: string;
  profileId: string; revision: number; status: 'DRAFT'; decisions: StoredDecision[]; nativeValues: NativeValue[];
  references: WizardCatalog['cards']; receipts: { requestId: string; commandHash: string; revision: number }[];
  calibrated: false; quoteReady: false; productiveAdoptions: 0 }

export function createWizardDraft(context: WizardContext, catalog: WizardCatalog): WizardDraft {
  return { schema: 'FCM_WIZARD_LOCAL_DRAFT_V1', context: contextSchema.parse(context), referenceRevision: catalog.revision,
    profileId: catalog.profile.id, revision: 0, status: 'DRAFT', decisions: [], nativeValues: [],
    references: structuredClone(catalog.cards), receipts: [], calibrated: false, quoteReady: false, productiveAdoptions: 0 }
}
function validateDecision(d: WizardDecision, catalog: WizardCatalog): StoredDecision {
  const card = catalog.cards.find(c => c.id === d.conceptId)
  if (!card) throw new WizardDraftError('UNKNOWN_CONCEPT')
  if (d.referenceRevision !== catalog.revision) throw new WizardDraftError('STALE_REFERENCE', 409)
  const values = { LOW: card.statistics.minimum, CENTRAL: card.statistics.central,
    HIGH: card.statistics.maximum, MARKSMAN: card.standard.value }
  if (d.mode !== 'MANUAL') {
    const value = values[d.mode]
    if (value === null) throw new WizardDraftError('STATISTIC_NOT_AVAILABLE')
    if (d.value !== value) throw new WizardDraftError('REFERENCE_VALUE_MISMATCH')
    if (!d.provisionalAccepted) throw new WizardDraftError('PROVISIONAL_ACCEPTANCE_REQUIRED')
  }
  const { minimum, maximum } = card.statistics as { minimum: number | null; maximum: number | null }
  const outside = (minimum !== null && d.value < minimum) || (maximum !== null && d.value > maximum)
  if ((outside || d.identification === 'NO' || (d.mode === 'MANUAL' && d.value === 0)) && d.justification.length < 8)
    throw new WizardDraftError('JUSTIFICATION_REQUIRED')
  if (card.native) assertAssumptionValueDomain({ section: card.native.section, field: card.native.field, value: d.value })
  return { ...d, evidenceQuality: 'PROVISIONAL_PROFILE_REFERENCE' }
}

/** Optimistic revision + durable request receipt. Same request is never applied
 * twice; preset amounts are checked against server references, not client labels. */
export function saveWizardDraft(current: WizardDraft, raw: unknown, catalog: WizardCatalog) {
  const command = WizardSaveSchema.parse(raw)
  if (hash(command.context) !== hash(current.context)) throw new WizardDraftError('DRAFT_CONTEXT_MISMATCH', 403)
  if (current.status !== 'DRAFT') throw new WizardDraftError('VERSION_NOT_EDITABLE', 409)
  if (current.referenceRevision !== catalog.revision || current.profileId !== catalog.profile.id)
    throw new WizardDraftError('STALE_REFERENCE', 409)
  const ids = command.decisions.map(d => d.conceptId)
  if (new Set(ids).size !== ids.length) throw new WizardDraftError('DUPLICATE_CONCEPT')
  const fingerprint = hash({ ...command, decisions: [...command.decisions].sort((a, b) => a.conceptId.localeCompare(b.conceptId)) })
  const receipt = current.receipts.find(r => r.requestId === command.requestId)
  if (receipt) {
    if (receipt.commandHash !== fingerprint) throw new WizardDraftError('REQUEST_ID_REUSED', 409)
    return { draft: structuredClone(current), receipt, replayed: true }
  }
  if (current.revision !== command.expectedRevision) throw new WizardDraftError('DRAFT_REVISION_CONFLICT', 409)
  if (current.receipts.length >= 128) throw new WizardDraftError('LOCAL_CUT_REQUEST_LIMIT', 409)
  const merged = new Map(current.decisions.map(d => [d.conceptId, d]))
  for (const decision of command.decisions) merged.set(decision.conceptId, validateDecision(decision, catalog))
  const decisions = catalog.cards.flatMap(card => merged.has(card.id) ? [merged.get(card.id)!] : [])
  const nativeValues = decisions.flatMap(d => {
    const native = catalog.cards.find(c => c.id === d.conceptId)!.native
    return native ? [{ ...native, value: d.value, conceptId: d.conceptId }] : []
  })
  const nextReceipt = { requestId: command.requestId, commandHash: fingerprint, revision: current.revision + 1 }
  const draft: WizardDraft = { ...structuredClone(current), revision: nextReceipt.revision, decisions, nativeValues,
    receipts: [...current.receipts, nextReceipt] }
  return { draft, receipt: nextReceipt, replayed: false }
}

export function restoreWizardDraft(raw: unknown, context: WizardContext, catalog: WizardCatalog): WizardDraft {
  // Validate persisted values by rebuilding through the same seam. Never trust a
  // browser/local JSON declaration of calibration, adoption or mapped outputs.
  const base = createWizardDraft(context, catalog)
  const parsed = z.object({ schema: z.literal(base.schema), context: contextSchema,
    referenceRevision: z.literal(catalog.revision), profileId: z.literal(catalog.profile.id),
    revision: z.number().int().nonnegative().max(128), status: z.literal('DRAFT'),
    decisions: z.array(decisionSchema.extend({ evidenceQuality: z.literal('PROVISIONAL_PROFILE_REFERENCE') })).max(3),
    nativeValues: z.array(z.object({ key: z.string(), section: z.string(), field: z.string(), unit: z.string(),
      value: z.number().finite(), conceptId: z.string() }).strict()).max(2),
    references: z.unknown(), receipts: z.array(z.object({ requestId: z.string().uuid(), commandHash: z.string().length(64),
      revision: z.number().int().positive().max(128) }).strict()).max(128),
    calibrated: z.literal(false), quoteReady: z.literal(false), productiveAdoptions: z.literal(0) }).strict().parse(raw)
  // PostgreSQL jsonb can reorder object keys. Compare reference data rather than
  // insertion order, while retaining exact values, fields and array ordering.
  // Keep catalog revisions and existing receipt hashes unchanged.
  if (hash(parsed.context) !== hash(base.context) || !isDeepStrictEqual(parsed.references, base.references))
    throw new WizardDraftError('STORED_CONTEXT_OR_REFERENCE_MISMATCH')
  if (new Set(parsed.decisions.map(d => d.conceptId)).size !== parsed.decisions.length ||
      new Set(parsed.receipts.map(r => r.requestId)).size !== parsed.receipts.length ||
      parsed.receipts.length !== parsed.revision || parsed.receipts.some((r, i) => r.revision !== i + 1))
    throw new WizardDraftError('STORED_REVISION_INVALID')
  const decisions = parsed.decisions.map(({ evidenceQuality: _, ...decision }) => validateDecision(decision, catalog))
  const nativeValues = decisions.flatMap(d => {
    const native = catalog.cards.find(c => c.id === d.conceptId)!.native
    return native ? [{ ...native, value: d.value, conceptId: d.conceptId }] : []
  })
  if (hash(nativeValues) !== hash(parsed.nativeValues)) throw new WizardDraftError('STORED_NATIVE_VALUE_MISMATCH')
  return { ...base, revision: parsed.revision, decisions, nativeValues, receipts: parsed.receipts }
}

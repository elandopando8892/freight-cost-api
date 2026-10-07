import { readFileSync, realpathSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { PublicReferenceLedgerSchema, combinePublicReferenceLedger,
  auditD2DPublicReferenceComponents } from '../src/modules/engine/benchmark-public-reference-components.js'

/** Review-only assembly. Formulas are explanatory text, never evaluated.
 * Reuses the existing economic auditor; no new rate model, network or persistence. */
export const SECTIONS = ['GENERAL_BASE', 'COST_CAPITAL', 'COST_INSURANCE', 'COST_PAYROLL',
  'COST_COMPANY', 'UTILIZATION', 'LABOR', 'FUEL', 'COST_MAINT', 'COST_TIRES',
  'FINANCE', 'RISK', 'TECHNICAL_MARGIN'] as const
const destinations = ['EXPOSURE', 'CFU', 'CFU', 'CFU', 'CFU', 'EXPOSURE', 'CVU', 'CVU', 'CVU', 'CVU',
  'FINANCE', 'RISK_SEPARATE', 'OUTSIDE_PRODUCTIVE_COST'] as const
const ref = z.object({ sourceId: z.string().min(1), pointer: z.string().nullable() }).strict()
const textList = z.array(z.string().min(1)).min(1)
const row = z.object({ section: z.enum(SECTIONS),
  destination: z.enum(['EXPOSURE', 'CFU', 'CVU', 'FINANCE', 'RISK_SEPARATE', 'OUTSIDE_PRODUCTIVE_COST']),
  refs: z.array(ref).min(1), referenceSummary: z.string().min(1), countryReading: z.string().min(1), assumptions: textList,
  exclusions: textList, missing: textList, formula: z.string().min(1),
  status: z.enum(['PARTIAL', 'EXCLUDED_FROM_PRODUCTIVE_COST_PENDING_POLICY']),
  economicAmount: z.null(), subtotalEligible: z.literal(false),
}).strict()
const output = z.object({ monthlyFixedUsd: z.null(), cfuUsd: z.null(), cvuUsd: z.null(),
  productiveCostUsd: z.null(), purchaseCostUsd: z.null(), sellPriceUsd: z.null() }).strict()
export const EconomicCardsSchema = z.object({ artifact: z.literal('FCM_B2_ECONOMIC_REFERENCE_CARDS_ASSEMBLY'),
  cutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), baseHead: z.string().regex(/^[a-f0-9]{40}$/),
  mode: z.literal('RESEARCH_ASSEMBLY_ONLY'), calibrated: z.literal(false), quoteReady: z.literal(false),
  adoptedValues: z.literal(0),
  sources: z.array(z.object({ id: z.string().min(1), file: z.string().regex(/^docs\/(?:research\/)?[A-Za-z0-9_-]+\.(json|md)$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/), evidenceDate: z.string(),
    refreshedExternallyThisCut: z.literal(false) }).strict()).min(1),
  cards: z.array(z.object({ country: z.enum(['MX', 'US']), profileRef: ref,
    profileStatus: z.literal('PROPOSED_NOT_OBSERVED_OR_ADOPTED'), sectionRows: z.array(row).length(13), outputs: output }).strict()).length(2),
  sharedTrailer: z.object({ refs: z.array(ref).min(1), rule: z.literal('ONE_PHYSICAL_CYCLE_THEN_ALLOCATE'),
    costIncludedInCountryTractorCards: z.literal(false), costBearer: z.null(), settlementShares: z.null(), cfuUsd: z.null() }).strict(),
  trip: z.object({ refs: z.array(ref).min(1), origin: z.null(), destination: z.null(), interchangePoint: z.null(),
    routeSelected: z.literal(false), tollsUsd: z.null(), borderChargesUsd: z.null() }).strict(),
  decision: z.object({ B1: z.literal('OPEN'), B2: z.literal('PARTIAL'), businessGatesClosed: z.literal(0),
    businessGatesTotal: z.literal(4), nextCut: z.literal('FUEL_PRICE_AND_LOADED_EMPTY_PERFORMANCE'),
    nextDeliverable: z.string().min(1), completionQueue: z.array(z.object({ order: z.number().int().positive(),
      id: z.string().min(1), acceptance: z.string().min(1) }).strict()).length(5) }).strict(),
  externalChanges: z.object({ database: z.literal(false), auth: z.literal(false), users: z.literal(false),
    infrastructure: z.literal(false), deployment: z.literal(false), businessOperations: z.literal(false), applicationAi: z.literal(false) }).strict(),
}).strict()

export function pointerExists(document: unknown, pointer: string): boolean {
  if (pointer === '') return true
  if (!pointer.startsWith('/') || /~(?![01])/.test(pointer)) return false
  let value: unknown = document
  for (const raw of pointer.slice(1).split('/')) {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~')
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) return false
    value = (value as Record<string, unknown>)[key]
  }
  return true // A documented null is a valid reference, never a known-zero cost.
}

export function assembleEconomicCards(raw: unknown, readSource: (file: string) => string) {
  const input = EconomicCardsSchema.parse(raw)
  if (new Set(input.cards.map(card => card.country)).size !== 2) throw new Error('COUNTRY_COVERAGE_MISMATCH')
  if (new Set(input.sources.map(source => source.id)).size !== input.sources.length) throw new Error('DUPLICATE_SOURCE_ID')
  const documents = new Map<string, unknown>()
  for (const source of input.sources) {
    const content = readSource(source.file)
    if (createHash('sha256').update(content).digest('hex') !== source.sha256) throw new Error(`SOURCE_HASH_MISMATCH:${source.id}`)
    documents.set(source.id, source.file.endsWith('.json') ? JSON.parse(content) : content)
  }
  const refs = [...input.cards.flatMap(card => [card.profileRef, ...card.sectionRows.flatMap(section => section.refs)]),
    ...input.sharedTrailer.refs, ...input.trip.refs]
  for (const reference of refs) {
    if (!documents.has(reference.sourceId)) throw new Error(`SOURCE_REF_MISSING:${reference.sourceId}`)
    if (reference.pointer !== null && !pointerExists(documents.get(reference.sourceId), reference.pointer)) {
      throw new Error(`SOURCE_POINTER_MISSING:${reference.sourceId}:${reference.pointer}`)
    }
  }
  for (const card of input.cards) {
    if (new Set(card.sectionRows.map(section => section.section)).size !== SECTIONS.length) throw new Error('SECTION_COVERAGE_MISMATCH')
    for (const section of card.sectionRows) {
      if (section.destination !== destinations[SECTIONS.indexOf(section.section)]) throw new Error('DESTINATION_SCOPE_MISMATCH')
      if (section.section !== 'TECHNICAL_MARGIN' && section.status !== 'PARTIAL') throw new Error('SECTION_STATUS_MISMATCH')
    }
    const margin = card.sectionRows.find(section => section.section === 'TECHNICAL_MARGIN')!
    if (margin.destination !== 'OUTSIDE_PRODUCTIVE_COST' || margin.status !== 'EXCLUDED_FROM_PRODUCTIVE_COST_PENDING_POLICY') throw new Error('MARGIN_SCOPE_MISMATCH')
    if (card.sectionRows.find(section => section.section === 'RISK')!.destination !== 'RISK_SEPARATE') throw new Error('RISK_SCOPE_MISMATCH')
    const profile = documents.get(card.profileRef.sourceId)
    const pointer = card.profileRef.pointer
    if (!pointer || !pointerExists(profile, `${pointer}/country`)) throw new Error('PROFILE_COUNTRY_MISSING')
    const actual = pointer.slice(1).split('/').reduce((value: any, key) => value[key], profile)
    if (actual.country !== card.country) throw new Error('PROFILE_COUNTRY_MISMATCH')
  }
  const ledger = PublicReferenceLedgerSchema.parse(documents.get('ledger'))
  const coreSource = input.sources.find(source => source.id === 'core')
  if (!coreSource || coreSource.sha256 !== ledger.coreTemplateSha256 ||
      coreSource.file !== `docs/research/${ledger.coreTemplateFile}`) throw new Error('CORE_LINEAGE_MISMATCH')
  const audit = auditD2DPublicReferenceComponents(combinePublicReferenceLedger(ledger, documents.get('core')))
  return { artifact: input.artifact, cutDate: input.cutDate, status: 'PARTIAL_NOT_ECONOMICALLY_COMPATIBLE',
    sourceCount: input.sources.length, sourceIntegrity: 'PINNED_LOCAL_FILES_MATCH',
    calibrated: false, quoteReady: false, adoptedValues: 0,
    existingAuditStatus: audit.status, existingIssueCount: audit.issues.length,
    cards: input.cards.map(card => ({ country: card.country, sectionsDocumented: card.sectionRows.length,
      eligibleNumericSubtotals: 0, outputs: card.outputs,
      sections: card.sectionRows.map(section => ({ section: section.section, destination: section.destination,
        status: section.status, countryReading: section.countryReading, missing: section.missing, formula: section.formula })) })),
    sharedTrailer: input.sharedTrailer, trip: input.trip, decision: input.decision,
  }
}

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
export function readLocalDocumentBytes(file: string) {
  const docsRoot = realpathSync(resolve(repositoryRoot, 'docs'))
  const target = realpathSync(resolve(repositoryRoot, file))
  const scoped = relative(docsRoot, target)
  if (isAbsolute(scoped) || scoped === '..' || scoped.startsWith(`..${sep}`) || resolve(docsRoot, scoped) !== target) throw new Error('SOURCE_OUTSIDE_DOCS')
  return readFileSync(target)
}

export function readLocalDocument(file: string) {
  return readLocalDocumentBytes(file).toString('utf8')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    if (args.length !== 1) throw new Error('Usage: tsx scripts/assemble-economic-reference-cards.ts <docs/research/cards.json>')
    const manifest = realpathSync(resolve(args[0]))
    if (dirname(manifest) !== realpathSync(resolve(repositoryRoot, 'docs/research'))) throw new Error('MANIFEST_OUTSIDE_RESEARCH')
    console.log(JSON.stringify(assembleEconomicCards(JSON.parse(readFileSync(manifest, 'utf8')), readLocalDocument), null, 2))
    process.exitCode = 2 // Intentional review-only incomplete result, not an adopted economic output.
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Assembly failed')
    process.exitCode = 1
  }
}

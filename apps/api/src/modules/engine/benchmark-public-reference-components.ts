import { z } from 'zod'
import { PayrollCapitalContractSchema, auditD2DPayrollCapitalContracts,
  auditPayrollCapitalContract } from './benchmark-payroll-capital-contract.js'

const text = z.string().trim().min(1).max(2000)
export const PUBLIC_COMPONENT_KINDS = ['INSURANCE', 'COMPANY', 'MAINTENANCE', 'TIRES',
  'FUEL_PRICE', 'LOADED_PERFORMANCE', 'EMPTY_PERFORMANCE', 'WORKING_CAPITAL'] as const
const definitions = {
  INSURANCE: { family: 'INSURANCE', unit: 'USD/fleet-month', positive: false },
  COMPANY: { family: 'COMPANY', unit: 'USD/fleet-month', positive: false },
  MAINTENANCE: { family: 'MAINTENANCE', unit: 'USD/km', positive: false },
  TIRES: { family: 'TIRES', unit: 'USD/km', positive: false },
  FUEL_PRICE: { family: 'FUEL', unit: 'USD/liter', positive: true },
  LOADED_PERFORMANCE: { family: 'FUEL', unit: 'km/liter', positive: true },
  EMPTY_PERFORMANCE: { family: 'FUEL', unit: 'km/liter', positive: true },
  WORKING_CAPITAL: { family: 'WORKING_CAPITAL', unit: 'USD/fleet-month', positive: false },
} as const
const family = PayrollCapitalContractSchema.shape.separateCostFamilies.element

/** Research input only. There is deliberately no client-supplied approval state. */
export const PublicReferenceComponentsSchema = z.object({
  methodId: z.literal('FCM_PUBLIC_REFERENCE_COMPONENTS_V1'),
  core: PayrollCapitalContractSchema,
  components: z.array(z.object({
    id: text, kind: z.enum(PUBLIC_COMPONENT_KINDS),
    disposition: z.enum(['MODELED', 'MISSING', 'OUTSIDE_SCOPE']),
    costBearer: z.enum(['CARRIER', 'XBF', 'OTHER']).nullable(),
    quantity: z.object({ min: z.number().finite().nonnegative(),
      max: z.number().finite().nonnegative(), unit: text }).strict().nullable(),
    evidenceIds: z.array(text), derivation: text.nullable(),
    includedItems: z.array(text), excludedFamilies: z.array(family),
    zeroRationale: text.nullable(), scopeRationale: text.nullable(),
  }).strict()).max(30),
  evidence: z.array(PayrollCapitalContractSchema.shape.evidence.element.extend({
    snapshotSha256: z.string().regex(/^[a-fA-F0-9]{64}$/).nullable(),
    originalUnit: text, originalCurrency: z.enum(['USD', 'MXN', 'NOT_MONETARY']),
  }).strict()).max(100),
  policies: z.object({
    risk: z.object({ treatment: z.literal('SEPARATE_NOT_PRICED'), rationale: text }).strict().nullable(),
    margin: z.object({ treatment: z.literal('OUTSIDE_PRODUCTIVE_COST'), rationale: text }).strict().nullable(),
  }).strict(),
}).strict()

export type PublicReferenceComponentsInput = z.infer<typeof PublicReferenceComponentsSchema>
type Issue = { field: string; code: string }

/** Coverage is structural, not economic review. No values are converted or adopted. */
export function auditPublicReferenceComponents(raw: unknown) {
  const input = PublicReferenceComponentsSchema.parse(raw)
  const issues: Issue[] = []
  const add = (field: string, code: string) => issues.push({ field, code })
  const sources = new Map(input.evidence.map(source => [source.id, source]))
  if (sources.size !== input.evidence.length) add('evidence', 'DUPLICATE_EVIDENCE')
  if (new Set(input.components.map(row => row.id)).size !== input.components.length) add('components', 'DUPLICATE_COMPONENT_ID')
  if (new Set(input.components.map(row => row.kind)).size !== input.components.length) add('components', 'DUPLICATE_COMPONENT_KIND')
  const separateFamilies = [...new Set(input.components.filter(row =>
    row.disposition === 'MODELED' && row.quantity !== null).map(row => definitions[row.kind].family))]
  // Recompute the side-cost boundary; a caller cannot hide an overlap from the core auditor.
  if (new Set(input.core.separateCostFamilies).size !== input.core.separateCostFamilies.length ||
      input.core.separateCostFamilies.length !== separateFamilies.length ||
      separateFamilies.some(key => !input.core.separateCostFamilies.includes(key))) {
    add('core.separateCostFamilies', 'COMPONENT_BOUNDARY_MISMATCH')
  }
  const core = auditPayrollCapitalContract({ ...input.core, separateCostFamilies: separateFamilies })
  issues.push(...core.issues.map(issue => ({ ...issue, field: `core.${issue.field}` })))
  // Rental coverage is allowed only for a compatible capital representation.
  const rentFamilies = new Set(input.core.assets.filter(asset => asset.tenure === 'RENTED')
    .flatMap(asset => asset.rentCoveredFamilies))
  for (const key of rentFamilies) if (!['CAPITAL', 'INSURANCE', 'MAINTENANCE', 'TIRES'].includes(key)) {
    add('core.assets', 'UNSUPPORTED_RENT_COMPONENT_COVERAGE')
  }
  const coverage = PUBLIC_COMPONENT_KINDS.map(kind => {
    const row = input.components.find(component => component.kind === kind)
    const field = `components.${kind}`
    const rule = definitions[kind]
    if (row?.disposition === 'MISSING' && (row.quantity || row.evidenceIds.length || row.derivation)) {
      add(field, 'MISSING_COMPONENT_HAS_VALUE_OR_REFERENCES')
    }
    if (kind === 'COMPANY' && input.core.administration.method === 'COMBINED_OVERHEAD') {
      if (row && row.disposition !== 'MISSING') add(field, 'CORE_FAMILY_ALREADY_COVERED')
      return { kind, family: rule.family, status: 'CORE_UNVERIFIED' as const }
    }
    if (rentFamilies.has(rule.family)) {
      if (row && row.disposition !== 'MISSING') add(field, 'RENT_FAMILY_ALREADY_COVERED')
      return { kind, family: rule.family, status: 'RENT_UNVERIFIED' as const }
    }
    if (!row || row.disposition === 'MISSING') {
      add(field, 'MISSING_COMPONENT')
      return { kind, family: rule.family, status: 'MISSING' as const }
    }
    const start = issues.length
    if (new Set(row.evidenceIds).size !== row.evidenceIds.length) add(field, 'DUPLICATE_REFERENCE')
    if (!row.evidenceIds.length) add(field, 'MISSING_EVIDENCE')
    for (const id of row.evidenceIds) {
      const source = sources.get(id)
      if (!source) { add(field, 'MISSING_EVIDENCE'); continue }
      if (source.country !== input.core.country || source.equipment !== input.core.equipment ||
          source.cohortId !== input.core.cohortId) add(field, 'EVIDENCE_SCOPE_MISMATCH')
      if (source.referencePeriod !== input.core.referencePeriod) add(field, 'REFERENCE_PERIOD_MISMATCH')
      if (source.validFrom > source.validUntil || source.observedAt > input.core.serviceDate ||
          source.validFrom > input.core.serviceDate || source.validUntil < input.core.serviceDate) add(field, 'EVIDENCE_OUTSIDE_VALIDITY')
      if (!source.snapshotSha256) add(field, 'MISSING_SOURCE_SNAPSHOT_HASH')
      if (source.sourceKind === 'PUBLIC_CONTRAST' || source.sourceKind === 'TAX_RULE') add(field, 'CONTEXT_ONLY_SOURCE')
    }
    if (row.disposition === 'OUTSIDE_SCOPE') {
      if (kind !== 'WORKING_CAPITAL' || row.costBearer !== 'XBF' || !row.scopeRationale || row.quantity !== null || row.derivation !== null) {
        add(field, 'INVALID_SCOPE_EXCLUSION')
      }
    } else {
      if (row.costBearer !== 'CARRIER') add(field, 'NON_CARRIER_COST')
      if (!row.quantity) add(field, 'MISSING_COMPONENT_VALUE')
      else {
        if (row.quantity.unit !== rule.unit) add(field, 'UNIT_MISMATCH')
        if (row.quantity.min > row.quantity.max) add(field, 'INVALID_RANGE_ORDER')
        if (row.quantity.max > Number.MAX_SAFE_INTEGER / 100) add(field, 'NUMERIC_RANGE_EXCEEDED')
        if (rule.positive && row.quantity.min <= 0) add(field, 'NON_POSITIVE_COMPONENT')
        if (!rule.positive && row.quantity.min === 0 && !row.zeroRationale) add(field, 'ZERO_REQUIRES_RATIONALE')
      }
      if (!row.derivation) add(field, 'MISSING_DERIVATION')
      if (!row.includedItems.length) add(field, 'MISSING_INCLUSION_BOUNDARY')
      const exclusions = ['CAPITAL', 'ADMIN_PAYROLL', 'COMPANY', 'DRIVER', 'INSURANCE',
        'MAINTENANCE', 'TIRES', 'FUEL', 'TOLLS', 'WORKING_CAPITAL'].filter(key => key !== rule.family)
      if (new Set(row.excludedFamilies).size !== row.excludedFamilies.length ||
          row.excludedFamilies.includes(rule.family) || exclusions.some(key => !row.excludedFamilies.includes(key as z.infer<typeof family>))) {
        add(field, 'COMPONENT_EXCLUSIONS_INCOMPLETE')
      }
    }
    return { kind, family: rule.family, status: issues.length > start ? 'INCOMPLETE' as const :
      row.disposition === 'OUTSIDE_SCOPE' ? 'OUTSIDE_SCOPE_UNVERIFIED' as const : 'DOCUMENTED_UNVERIFIED' as const }
  })
  if (!input.policies.risk) add('policies.risk', 'MISSING_RISK_POLICY')
  if (!input.policies.margin) add('policies.margin', 'MISSING_MARGIN_POLICY')
  return { methodId: input.methodId, status: issues.length ? 'INCOMPLETE' as const : 'COMPONENTS_COMPATIBLE_UNVERIFIED' as const,
    issues, coverage, core, calibrated: false as const, quoteReady: false as const, adoptedValues: 0,
    rates: null, cfuUsd: null, cvuUsd: null, purchaseCostUsd: null, sellPriceUsd: null,
    pendingOperationalCoverage: ['Route and cycle', 'Tolls by route', 'Border/interchange', 'Shared-trailer allocation'],
    lineage: input }
}

/** Reuses core D2D identity/date/asset checks. No route, persistence or pricing execution. */
export function auditD2DPublicReferenceComponents(raw: { mx: unknown; us: unknown }) {
  const mx = auditPublicReferenceComponents(raw.mx)
  const us = auditPublicReferenceComponents(raw.us)
  const d2d = auditD2DPayrollCapitalContracts({ mx: mx.core.lineage, us: us.core.lineage })
  const issues = [...mx.issues.map(issue => ({ ...issue, field: `mx.${issue.field}` })),
    ...us.issues.map(issue => ({ ...issue, field: `us.${issue.field}` })),
    ...d2d.issues.filter(issue => !issue.field.startsWith('mx.') && !issue.field.startsWith('us.'))]
  return { methodId: 'FCM_PUBLIC_REFERENCE_COMPONENTS_V1',
    status: issues.length ? 'INCOMPLETE' as const : 'COMPONENTS_COMPATIBLE_UNVERIFIED' as const,
    issues, mx, us, calibrated: false as const, quoteReady: false as const, adoptedValues: 0,
    rates: null, cfuUsd: null, cvuUsd: null, purchaseCostUsd: null, sellPriceUsd: null }
}

/** A file ledger references the existing core template instead of duplicating its values. */
export const PublicReferenceLedgerSchema = z.object({
  artifact: z.literal('FCM_B2_PUBLIC_REFERENCE_RESEARCH_LEDGER'), createdDate: PayrollCapitalContractSchema.shape.serviceDate,
  state: z.literal('DRAFT_INCOMPLETE'),
  coreTemplateFile: z.string().regex(/^[A-Za-z0-9_-]+\.json$/),
  coreTemplateSha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
  profiles: z.array(PublicReferenceComponentsSchema.omit({ methodId: true, core: true })
    .extend({ country: PayrollCapitalContractSchema.shape.country }).strict()).length(2),
}).strict()

export function combinePublicReferenceLedger(rawLedger: unknown, rawCore: unknown) {
  const ledger = PublicReferenceLedgerSchema.parse(rawLedger)
  const core = z.object({ contracts: z.array(PayrollCapitalContractSchema).length(2) }).passthrough().parse(rawCore)
  if (new Set(ledger.profiles.map(profile => profile.country)).size !== 2 ||
      new Set(core.contracts.map(contract => contract.country)).size !== 2) throw new Error('Expected exactly one MX and one US profile')
  const inputs = ledger.profiles.map(({ country, ...profile }) => ({ methodId: 'FCM_PUBLIC_REFERENCE_COMPONENTS_V1' as const,
    core: core.contracts.find(contract => contract.country === country)!, ...profile }))
  return { mx: inputs.find(input => input.core.country === 'MX')!, us: inputs.find(input => input.core.country === 'US')! }
}

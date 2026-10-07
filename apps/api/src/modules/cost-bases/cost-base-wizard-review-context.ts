import { createHash } from 'node:crypto'
import { z } from 'zod'
import { WizardDraftError, type WizardCatalog, type WizardContext } from './cost-base-wizard-draft.js'

export const WIZARD_REVIEW_BINDING_KIND = 'FCM_WIZARD_REVIEW_BINDING_V1' as const
export const WIZARD_REVIEW_METADATA_KIND = 'FCM_WIZARD_REVIEW_DRAFT_V1' as const
const sha = z.string().regex(/^[a-f0-9]{64}$/)
const scopeSchema = z.object({ orgId: z.string().min(1), baseId: z.string().min(1), versionId: z.string().min(1) }).strict()
const profileSchema = z.object({ id: z.literal('D2D_BINATIONAL_OWN_DRY_VAN_53_RELAY_SEP2026'),
  segment: z.literal('D2D_BINATIONAL_OWN'), equipment: z.literal('DRY_VAN_53'),
  tractorPolicy: z.literal('OWN_MX_US_RELAY_SAME_TRAILER'), period: z.literal('2026-09') }).strict()
export const WizardReviewBindingSchema = z.object({ kind: z.literal(WIZARD_REVIEW_BINDING_KIND),
  context: scopeSchema, versionId: z.string().min(1), referenceRevision: sha, profile: profileSchema,
  sourceVersionFingerprint: sha, commercial: z.literal(false), appliedToParams: z.literal(false),
  economicProfileChanged: z.literal(false) }).strict()
export type WizardReviewBinding = z.infer<typeof WizardReviewBindingSchema>
type SourceVersion = { id: string; status: string; isActive: boolean; updatedAt: Date;
  applicabilityContext: unknown; params: { section: string; field: string; value: number; unit: string | null }[];
  costBase: { id: string; name: string; status: string; scope: string; operationalSegment: string | null } }
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

/** Raw source economics: do not parse/default a V3 profile to manufacture relay support. */
export function wizardReviewSourceFingerprint(version: SourceVersion) {
  const { id, name, status, scope, operationalSegment } = version.costBase
  return digest({ base: { id, name, status, scope, operationalSegment }, id: version.id, status: version.status, isActive: version.isActive,
    updatedAt: version.updatedAt, applicabilityContext: version.applicabilityContext,
    params: version.params.map(({ section, field, value, unit }) => ({ section, field, value, unit }))
      .sort((a, b) => `${a.section}:${a.field}`.localeCompare(`${b.section}:${b.field}`)) })
}
function assertReviewTarget(context: WizardContext, version: SourceVersion) {
  if (context.baseId !== version.costBase.id || context.versionId !== version.id)
    throw new WizardDraftError('WIZARD_REVIEW_CONTEXT_MISMATCH', 403)
  if (version.status !== 'DRAFT' || version.isActive || version.costBase.status !== 'DRAFT' || version.costBase.scope !== 'CROSS_BORDER')
    throw new WizardDraftError('WIZARD_REVIEW_TARGET_NOT_EDITABLE', 409)
}

/** Preparation only: no persistence or authority. No HTTP route accepts this payload.
 * An administrative gate must explicitly authorize and audit any real binding creation. */
export function buildWizardReviewBinding(context: WizardContext, version: SourceVersion, catalog: WizardCatalog): WizardReviewBinding {
  assertReviewTarget(context, version)
  return WizardReviewBindingSchema.parse({ kind: WIZARD_REVIEW_BINDING_KIND, context, versionId: version.id,
    referenceRevision: catalog.revision, profile: catalog.profile,
    sourceVersionFingerprint: wizardReviewSourceFingerprint(version), commercial: false,
    appliedToParams: false, economicProfileChanged: false })
}

/** Only consume metadata fetched under the server-verified organization/base/version. */
export function resolveWizardReviewBinding(raw: unknown, context: WizardContext, version: SourceVersion, catalog: WizardCatalog) {
  const result = WizardReviewBindingSchema.safeParse(raw)
  if (!result.success) throw new WizardDraftError('WIZARD_REVIEW_BINDING_INVALID', 409)
  const binding = result.data
  assertReviewTarget(context, version)
  if (digest(binding.context) !== digest(context) || binding.versionId !== context.versionId)
    throw new WizardDraftError('WIZARD_REVIEW_CONTEXT_MISMATCH', 403)
  if (binding.referenceRevision !== catalog.revision || digest(binding.profile) !== digest(catalog.profile))
    throw new WizardDraftError('WIZARD_REVIEW_REFERENCE_CHANGED', 409)
  if (binding.sourceVersionFingerprint !== wizardReviewSourceFingerprint(version))
    throw new WizardDraftError('WIZARD_REVIEW_SOURCE_CHANGED', 409)
  const bindingSha256 = digest(binding)
  return { kind: 'NONCOMMERCIAL_B2_REVIEW' as const, profile: binding.profile, bindingSha256,
    sourceVersionFingerprint: binding.sourceVersionFingerprint, economicProfileChanged: false as const,
    commercial: false as const, appliedToParams: false as const, quoteReady: false as const }
}

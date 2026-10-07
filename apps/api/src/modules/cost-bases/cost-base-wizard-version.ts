import { createHash } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { lockAssumptionVersion, lockOrganizationLifecycle } from '../assumptions/assumption-version-lock.js'
import { parseCostBaseProfile } from './cost-base-profile.js'
import { WIZARD_REVIEW_BINDING_KIND, WIZARD_REVIEW_METADATA_KIND, resolveWizardReviewBinding } from './cost-base-wizard-review-context.js'
import {
  createWizardDraft, restoreWizardDraft, saveWizardDraft, WizardDraftError, WizardSaveSchema,
  type WizardCatalog, type WizardContext,
} from './cost-base-wizard-draft.js'

export const WIZARD_VERSION_METADATA_KIND = 'FCM_WIZARD_VERSION_DRAFT_V1' as const
export const SaveVersionWizardSchema = WizardSaveSchema.extend({ expectedVersionFingerprint: z.string().regex(/^[a-f0-9]{64}$/) })
const metadataSchema = z.object({ kind: z.literal(WIZARD_VERSION_METADATA_KIND), versionId: z.string(),
  versionFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  reviewFingerprints: z.record(z.string().regex(/^[a-f0-9]{64}$/)), draft: z.unknown() }).strict()
const reviewMetadataSchema = metadataSchema.extend({ kind: z.literal(WIZARD_REVIEW_METADATA_KIND),
  reviewBindingSha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict()
type Transaction = <T>(work: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>
type Actor = { orgId: string; sub: string; role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

/** Version-owned proposals. This module never updates parameters, calibration,
 * publication, active defaults, quotes or production routes. */
export function createVersionWizard(transaction: Transaction, catalog: WizardCatalog) {
  async function load(tx: Prisma.TransactionClient, context: WizardContext) {
    const version = await tx.assumptionSet.findFirst({
      where: { id: context.versionId, orgId: context.orgId, costBaseId: context.baseId },
      select: { id: true, name: true, version: true, status: true, isActive: true, updatedAt: true,
        applicabilityContext: true, params: { select: { section: true, field: true, value: true, unit: true } },
        costBase: { select: { id: true, name: true, status: true, scope: true, operationalSegment: true } } },
    })
    if (!version?.costBase) throw new WizardDraftError('WIZARD_VERSION_NOT_FOUND', 404)
    const base = version.costBase
    // One bounded snapshot for binding + proposals. A valid history contains at
    // most 1 binding and 128 proposals; row 130 necessarily exceeds a limit.
    // Keep the original per-kind guards and strict payload validation below.
    const history = await tx.costBaseAuditEvent.findMany({
      where: { orgId: context.orgId, costBaseId: context.baseId, action: 'METADATA_UPDATED', AND: [
        { OR: [WIZARD_REVIEW_BINDING_KIND, WIZARD_VERSION_METADATA_KIND, WIZARD_REVIEW_METADATA_KIND]
          .map(kind => ({ payload: { path: ['kind'], equals: kind } })) },
        { payload: { path: ['versionId'], equals: context.versionId } },
      ] }, select: { payload: true }, take: 130,
    })
    const bindings = history.filter(event => (event.payload as { kind?: unknown })?.kind === WIZARD_REVIEW_BINDING_KIND)
    const events = history.filter(event => (event.payload as { kind?: unknown })?.kind !== WIZARD_REVIEW_BINDING_KIND)
    if (bindings.length > 1) throw new WizardDraftError('WIZARD_REVIEW_BINDING_AMBIGUOUS', 409)
    if (events.length > 128) throw new WizardDraftError('WIZARD_METADATA_LIMIT', 409)
    const reviewContext = bindings.length ? resolveWizardReviewBinding(bindings[0].payload, context, { ...version, costBase: base }, catalog) : null
    let versionFingerprint: string
    if (reviewContext) {
      versionFingerprint = digest({ reviewBindingSha256: reviewContext.bindingSha256,
        sourceVersionFingerprint: reviewContext.sourceVersionFingerprint })
    } else {
      // Preserve historical validation and fingerprint. Never infer a review binding.
      if (base.scope !== 'CROSS_BORDER' || base.operationalSegment !== catalog.profile.segment || !version.applicabilityContext)
        throw new WizardDraftError('WIZARD_PROFILE_NOT_SUPPORTED')
      const profile = parseCostBaseProfile(base.scope, version.applicabilityContext)
      if (profile.calculationPolicy !== 'OPERATIONAL_V3' || !['MX','US'].every(c => profile.countries.includes(c as 'MX' | 'US'))
        || !profile.trailerTypes.includes('Dry Van') || !profile.truckTypes.includes('Truck Trailer')
        || !profile.configurations.includes('Single') || !profile.ownershipModels.includes('OWNED_FINANCED'))
        throw new WizardDraftError('WIZARD_PROFILE_NOT_SUPPORTED')
      versionFingerprint = digest({ base, id: version.id, status: version.status, isActive: version.isActive,
        updatedAt: version.updatedAt, profile,
        params: [...version.params].sort((a,b) => `${a.section}:${a.field}`.localeCompare(`${b.section}:${b.field}`)) })
    }
    let draft = createWizardDraft(context, catalog), reviewFingerprints: Record<string, string> = {}
    const revisions = new Set<number>()
    for (const event of events) {
      const parsed = (reviewContext ? reviewMetadataSchema : metadataSchema).safeParse(event.payload)
      if (!parsed.success) throw new WizardDraftError('WIZARD_REVIEW_HISTORY_CONFLICT', 409)
      const payload = parsed.data
      if (reviewContext && (!('reviewBindingSha256' in payload) || payload.reviewBindingSha256 !== reviewContext.bindingSha256))
        throw new WizardDraftError('WIZARD_REVIEW_HISTORY_CONFLICT', 409)
      if (payload.versionId !== context.versionId) throw new WizardDraftError('WIZARD_METADATA_INVALID', 409)
      const restored = restoreWizardDraft(payload.draft, context, catalog)
      if (restored.revision < 1 || revisions.has(restored.revision)) throw new WizardDraftError('WIZARD_METADATA_INVALID', 409)
      revisions.add(restored.revision)
      if (restored.revision > draft.revision) { draft = restored; reviewFingerprints = payload.reviewFingerprints }
    }
    if (events.length !== draft.revision) throw new WizardDraftError('WIZARD_METADATA_INVALID', 409)
    return { catalog, draft, versionFingerprint, reviewFingerprints, reviewContext,
      staleForVersion: draft.decisions.some(d => reviewFingerprints[d.conceptId] !== versionFingerprint),
      version: { id: version.id, name: version.name, number: version.version, status: version.status, isActive: version.isActive, base },
      persistence: 'VERSION_AUDIT_METADATA' as const, appliedToParams: false as const }
  }
  return {
    read(actor: Actor, baseId: string, versionId: string) {
      return transaction(tx => load(tx, { orgId: actor.orgId, baseId, versionId }))
    },
    async save(actor: Actor, baseId: string, versionId: string, raw: unknown) {
      if (actor.role !== 'ADMIN') throw new WizardDraftError('Forbidden', 403)
      const { expectedVersionFingerprint, ...command } = SaveVersionWizardSchema.parse(raw)
      const context = { orgId: actor.orgId, baseId, versionId }
      if (digest(command.context) !== digest(context)) throw new WizardDraftError('DRAFT_CONTEXT_MISMATCH', 403)
      return transaction(async tx => {
        await lockOrganizationLifecycle(tx, actor.orgId)
        await lockAssumptionVersion(tx, actor.orgId, versionId)
        const view = await load(tx, context)
        if (view.version.status !== 'DRAFT' || view.version.isActive || view.version.base.status === 'ARCHIVED')
          throw new WizardDraftError('VERSION_NOT_EDITABLE', 409)
        if (expectedVersionFingerprint !== view.versionFingerprint) throw new WizardDraftError('WIZARD_VERSION_CHANGED', 409)
        const result = saveWizardDraft(view.draft, command, catalog)
        const reviewFingerprints = { ...view.reviewFingerprints }
        if (!result.replayed) for (const decision of command.decisions) reviewFingerprints[decision.conceptId] = view.versionFingerprint
        if (!result.replayed) {
          await tx.costBaseAuditEvent.create({ data: {
            orgId: actor.orgId, costBaseId: baseId, actorId: actor.sub, action: 'METADATA_UPDATED',
            note: `Wizard proposals for version ${versionId}; revision ${result.draft.revision}. Parameters/calibration unchanged.`,
            payload: JSON.parse(JSON.stringify({ kind: view.reviewContext ? WIZARD_REVIEW_METADATA_KIND : WIZARD_VERSION_METADATA_KIND, versionId,
              ...(view.reviewContext ? { reviewBindingSha256: view.reviewContext.bindingSha256 } : {}),
              versionFingerprint: view.versionFingerprint, reviewFingerprints, draft: result.draft })) as Prisma.InputJsonValue,
          } })
        }
        return { ...view, draft: result.draft, reviewFingerprints,
          staleForVersion: result.draft.decisions.some(d => reviewFingerprints[d.conceptId] !== view.versionFingerprint),
          receipt: result.receipt, replayed: result.replayed }
      })
    },
  }
}
export type VersionWizardView = Awaited<ReturnType<ReturnType<typeof createVersionWizard>['read']>>
export type VersionWizardSave = z.infer<typeof SaveVersionWizardSchema>

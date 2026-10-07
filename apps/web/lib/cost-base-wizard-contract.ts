// Type-only imports: no Prisma, filesystem, source loading or Node crypto in the client.
import type { VersionWizardView, VersionWizardSave } from '../../api/src/modules/cost-bases/cost-base-wizard-version'
import type { WizardDecision } from '../../api/src/modules/cost-bases/cost-base-wizard-draft'
export type { VersionWizardView, VersionWizardSave, WizardDecision }
export const versionWizardPath = (baseId: string, versionId: string) =>
  `/cost-bases/${encodeURIComponent(baseId)}/versions/${encodeURIComponent(versionId)}/wizard`
export const versionWizardHref = (baseId: string, versionId: string) =>
  `/cost-bases/${encodeURIComponent(baseId)}/versions/${encodeURIComponent(versionId)}/build`
export function sameWizardContext(a: VersionWizardView, b: VersionWizardView) {
  return a.draft.context.orgId === b.draft.context.orgId && a.draft.context.baseId === b.draft.context.baseId
    && a.draft.context.versionId === b.draft.context.versionId
    && (a.reviewContext?.bindingSha256 ?? null) === (b.reviewContext?.bindingSha256 ?? null)
    && a.catalog.revision === b.catalog.revision && a.draft.profileId === b.draft.profileId
}

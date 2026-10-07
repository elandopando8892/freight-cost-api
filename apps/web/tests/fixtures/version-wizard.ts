import type { VersionWizardView } from '../../lib/cost-base-wizard-contract'
import snapshot from '../../../api/src/modules/cost-bases/cost-base-wizard.catalog.json'

/** Public reference catalog, synthetic ownership and version. Never real DB state. */
export function wizardFixture(): VersionWizardView {
  const catalog = structuredClone(snapshot) as unknown as VersionWizardView['catalog']
  return {
    catalog, versionFingerprint:'a'.repeat(64), reviewFingerprints:{}, staleForVersion:false, reviewContext:null,
    persistence:'VERSION_AUDIT_METADATA',appliedToParams:false,
    version:{id:'qa-version-A',name:'Borrador sintético',number:2,status:'DRAFT',isActive:false,
      base:{id:'qa-base-A',name:'Base QA binacional',scope:'CROSS_BORDER',operationalSegment:'D2D_BINATIONAL_OWN',status:'DRAFT'}},
    draft:{schema:'FCM_WIZARD_LOCAL_DRAFT_V1',context:{orgId:'qa-org-A',baseId:'qa-base-A',versionId:'qa-version-A'},
      referenceRevision:catalog.revision,profileId:catalog.profile.id,revision:0,status:'DRAFT',decisions:[],nativeValues:[],
      references:catalog.cards,receipts:[],calibrated:false,quoteReady:false,productiveAdoptions:0},
  }
}

/** Synthetic binding for UI only: not a server audit event or real access. */
export function wizardReviewFixture(): VersionWizardView {
  const view = wizardFixture()
  view.version.base.operationalSegment = null
  view.reviewContext = { kind:'NONCOMMERCIAL_B2_REVIEW', profile:view.catalog.profile,
    bindingSha256:'b'.repeat(64), sourceVersionFingerprint:'c'.repeat(64),
    economicProfileChanged:false, commercial:false, appliedToParams:false, quoteReady:false }
  return view
}

import type { AssumptionVersionStatus, CostBaseScope, CostBaseStatus } from '@prisma/client'
import { PARAMETER_CATALOG_TOTAL } from '../../data/parameter-catalog.js'
import { parseCostBaseProfile } from '../cost-bases/cost-base-profile.js'

export type C1ReadinessBase = {
  code: string
  scope: CostBaseScope
  status: CostBaseStatus
  isDefault: boolean
  versions: {
    version: number
    status: AssumptionVersionStatus
    isActive: boolean
    applicabilityContext: unknown
    parameterCount: number
  }[]
}

/** A fail-closed inventory gate, not an economic approval or a route calculation. */
export function evaluateC1QuoteReadiness(bases: C1ReadinessBase[]) {
  const blockers: string[] = []
  if (bases.length !== 1) {
    blockers.push(bases.length === 0 ? 'TARGET_BASE_MISSING' : 'TARGET_CODE_AMBIGUOUS_ACROSS_ORGS')
    return { targetBaseFound: bases.length > 0, targetCandidateForNewCalculation: false, blockers }
  }

  const base = bases[0]
  if (base.status !== 'ACTIVE') blockers.push('BASE_NOT_ACTIVE')
  const activeVersions = base.versions.filter(version => version.isActive)
  if (activeVersions.length !== 1) blockers.push('ACTIVE_VERSION_COUNT_INVALID')
  if (activeVersions.length === 1) {
    const version = activeVersions[0]
    if (version.status !== 'PUBLISHED') blockers.push('ACTIVE_VERSION_NOT_PUBLISHED')
    if (version.parameterCount !== PARAMETER_CATALOG_TOTAL) blockers.push('CANONICAL_PARAMETERS_INCOMPLETE')
    if (version.applicabilityContext == null) blockers.push('APPLICABILITY_PROFILE_MISSING')
    else {
      try { parseCostBaseProfile(base.scope, version.applicabilityContext) }
      catch { blockers.push('APPLICABILITY_PROFILE_INVALID') }
    }
  }
  return { targetBaseFound: true, targetCandidateForNewCalculation: blockers.length === 0, blockers }
}

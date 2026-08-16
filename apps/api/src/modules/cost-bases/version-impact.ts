export interface ImpactParam {
  section: string
  field: string
  value: number
  unit: string
}

export interface ImpactVersion {
  id: string
  version: number
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  isActive: boolean
  params: ImpactParam[]
  applicabilityContext?: unknown
}

export interface VersionImpactCounts {
  productionRoutes: { frozenOnActive: number; alreadyOnCandidate: number; other: number }
  quotes: { savedOnActive: number; savedOnCandidate: number; other: number }
}

const keyFor = (param: Pick<ImpactParam, 'section' | 'field'>) => `${param.section}::${param.field}`

function canonicalProfile(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalProfile).sort().join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalProfile(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

/**
 * Computes a read-only release preview. It deliberately describes the
 * historical records that remain frozen instead of proposing implicit
 * recalculation or reassignment when a version is activated.
 */
export function buildVersionImpact(
  candidate: ImpactVersion,
  active: ImpactVersion | null,
  counts: VersionImpactCounts,
) {
  const activeParams = new Map((active?.params ?? []).map((param) => [keyFor(param), param]))
  const candidateParams = new Map(candidate.params.map((param) => [keyFor(param), param]))
  const keys = [...new Set([...activeParams.keys(), ...candidateParams.keys()])].sort()
  const changes = keys.flatMap((key) => {
    const from = activeParams.get(key)
    const to = candidateParams.get(key)
    if ((from?.value ?? null) === (to?.value ?? null) && from?.unit === to?.unit) return []
    return [{
      section: from?.section ?? to?.section ?? 'UNKNOWN',
      field: from?.field ?? to?.field ?? key,
      unit: to?.unit ?? from?.unit ?? '',
      fromValue: from?.value ?? null,
      toValue: to?.value ?? null,
      delta: from && to ? to.value - from.value : null,
    }]
  })
  const applicabilityProfileChanged = canonicalProfile(active?.applicabilityContext ?? null) !==
    canonicalProfile(candidate.applicabilityContext ?? null)

  return {
    candidate: { id: candidate.id, version: candidate.version, status: candidate.status, isActive: candidate.isActive },
    active: active ? { id: active.id, version: active.version, status: active.status, isActive: active.isActive } : null,
    comparison: {
      referenceAvailable: active !== null,
      changedParameterCount: changes.length,
      applicabilityProfileChanged,
      changes,
    },
    records: counts,
    activation: {
      canActivate: candidate.status === 'PUBLISHED',
      isAlreadyActive: candidate.isActive,
      existingProductionRoutesRemainFrozen: true,
      existingQuotesRemainFrozen: true,
      requiresHumanRouteReview: !candidate.isActive && counts.productionRoutes.frozenOnActive > 0,
    },
  }
}

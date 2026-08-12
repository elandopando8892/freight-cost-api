import { AssumptionVersionStatus, CalculationPolicy, CostBaseScope, Section, type AssumptionParam } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { DEFAULT_ASSUMPTIONS } from '../../data/default-assumptions.js'
import { getActiveSet } from '../assumptions/assumptions.service.js'
import type { EnginePolicy } from '../engine/engine.types.js'
import type {
  ArchiveCostBaseVersionInput, CreateCostBaseInput, CreateCostBaseVersionInput,
  PublishCostBaseVersionInput, UpdateCostBaseInput,
} from './cost-bases.schema.js'
import { PARAMETER_CATALOG_TOTAL } from '../../data/parameter-catalog.js'
import { buildVersionImpact } from './version-impact.js'

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode })
}

export function scenarioReviewPublishBlocker(sourceReviewStatus: string | undefined, impactAcknowledged: boolean) {
  if (sourceReviewStatus !== undefined && sourceReviewStatus !== 'APPROVED') return 'The scenario review that originated this draft is no longer approved.'
  if (sourceReviewStatus === 'APPROVED' && !impactAcknowledged) return 'Explicit impact acknowledgement is required before publishing a scenario-derived draft.'
  return null
}

export function scopeForOperation(operation: string): CostBaseScope | null {
  switch (operation) {
    case 'D2D Export':
    case 'D2D Import': return 'CROSS_BORDER'
    case 'Drayage': return 'DRAYAGE'
    case 'Local': return 'LOCAL'
    case 'Intra-Mex':
    case 'MX Northbound':
    case 'MX Southbound': return 'INTRA_MEX'
    case 'Intra-US':
    case 'US Northbound':
    case 'US Southbound': return 'INTRA_US'
    default: return null
  }
}

export function assertScopeCompatible(scope: CostBaseScope, operation: string) {
  const expected = scopeForOperation(operation)
  if (expected && scope !== expected) {
    throw httpError(`Cost base scope ${scope} is not compatible with operation ${operation}; expected ${expected}.`, 422)
  }
}

const defaultParamData = () => DEFAULT_ASSUMPTIONS.map((param) => ({
  section: param.section as Section,
  field: param.field,
  value: param.value,
  unit: param.unit,
  low: param.low ?? null,
  high: param.high ?? null,
  updateFrequency: param.updateFrequency,
  costBehavior: param.costBehavior,
  activation: param.activation,
}))

type CloneableParam = Pick<AssumptionParam,
  'definitionId' | 'section' | 'field' | 'value' | 'unit' | 'low' | 'high' |
  'updateFrequency' | 'costBehavior' | 'activation' | 'purpose' | 'notes'
>

const clonedParamData = (params: readonly CloneableParam[]) => params.map((param) => ({
  definitionId: param.definitionId,
  section: param.section,
  field: param.field,
  value: param.value,
  unit: param.unit,
  low: param.low,
  high: param.high,
  updateFrequency: param.updateFrequency,
  costBehavior: param.costBehavior,
  activation: param.activation,
  purpose: param.purpose,
  notes: param.notes,
}))

export async function listCostBases(orgId: string) {
  return prisma.costBase.findMany({
    where: { orgId },
    include: {
      versions: {
        select: {
          id: true, name: true, version: true, isActive: true, status: true, notes: true,
          sourceVersionId: true, publishedAt: true, createdAt: true, updatedAt: true,
          scenarioReviewSource: { select: { id: true, status: true, sourceChecksum: true, quoteId: true } },
          publishedBy: { select: { email: true } },
          auditEvents: { select: { id: true, action: true, fromStatus: true, toStatus: true, note: true, createdAt: true, actor: { select: { email: true } } }, orderBy: { createdAt: 'desc' } },
          _count: { select: { params: true } },
        },
        orderBy: { version: 'desc' },
      },
      _count: { select: { lanes: true, quotes: true } },
    },
    orderBy: [{ status: 'asc' }, { scope: 'asc' }, { name: 'asc' }],
  })
}

export async function getCostBase(orgId: string, id: string) {
  return prisma.costBase.findFirstOrThrow({
    where: { id, orgId },
    include: {
      versions: {
        include: {
          _count: { select: { params: true } },
          scenarioReviewSource: { select: { id: true, status: true, sourceChecksum: true, quoteId: true } },
          publishedBy: { select: { email: true } },
          auditEvents: { include: { actor: { select: { email: true } } }, orderBy: { createdAt: 'desc' } },
        },
        orderBy: { version: 'desc' },
      },
      _count: { select: { lanes: true, quotes: true } },
    },
  })
}

export async function createCostBase(orgId: string, input: CreateCostBaseInput, actorId?: string) {
  const source = input.cloneFromSetId
    ? await prisma.assumptionSet.findFirstOrThrow({ where: { id: input.cloneFromSetId, orgId }, include: { params: true } })
    : null
  const params = source ? clonedParamData(source.params) : defaultParamData()

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.costBase.updateMany({ where: { orgId, scope: input.scope, isDefault: true }, data: { isDefault: false } })
    }
    return tx.costBase.create({
      data: {
        orgId,
        code: input.code,
        name: input.name,
        description: input.description,
        scope: input.scope,
        status: input.isDefault ? 'ACTIVE' : 'DRAFT',
        defaultPolicy: input.defaultPolicy,
        currency: input.currency,
        isDefault: input.isDefault,
        versions: {
          create: {
            orgId,
            name: input.name,
            version: 1,
            isActive: true,
            status: AssumptionVersionStatus.DRAFT,
            notes: source ? `Initial version cloned from ${source.name} v${source.version}` : 'Initial canonical parameter version',
            auditEvents: { create: { orgId, actorId, action: 'DRAFT_CREATED', toStatus: 'DRAFT', note: 'Initial draft version created' } },
            params: { create: params },
          },
        },
      },
      include: {
        versions: {
          include: {
            _count: { select: { params: true } },
            publishedBy: { select: { email: true } },
            auditEvents: { select: { id: true, action: true, fromStatus: true, toStatus: true, note: true, createdAt: true, actor: { select: { email: true } } }, orderBy: { createdAt: 'desc' } },
          },
        },
        _count: { select: { lanes: true, quotes: true } },
      },
    })
  })
}

export async function updateCostBase(orgId: string, id: string, input: UpdateCostBaseInput) {
  const base = await prisma.costBase.findFirstOrThrow({ where: { id, orgId } })
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.costBase.updateMany({ where: { orgId, scope: base.scope, isDefault: true, id: { not: id } }, data: { isDefault: false } })
    }
    return tx.costBase.update({
      where: { id },
      data: {
        ...input,
        ...(input.isDefault ? { status: 'ACTIVE' as const } : {}),
        ...(input.status === 'ARCHIVED' ? { isDefault: false } : {}),
      },
    })
  })
}

export async function createCostBaseVersion(orgId: string, costBaseId: string, input: CreateCostBaseVersionInput, actorId?: string) {
  const base = await prisma.costBase.findFirstOrThrow({
    where: { id: costBaseId, orgId },
    include: { versions: { include: { params: true }, orderBy: { version: 'desc' } } },
  })
  if (base.status === 'ARCHIVED') throw httpError('Archived cost bases cannot receive new versions.', 409)

  const source = input.cloneFromSetId
    ? base.versions.find((version) => version.id === input.cloneFromSetId)
    : base.versions.find((version) => version.isActive) ?? base.versions[0]
  if (!source) throw httpError('A source version is required to create the next version.', 409)

  return prisma.assumptionSet.create({
    data: {
      orgId,
      costBaseId,
      name: base.name,
      version: (base.versions[0]?.version ?? 0) + 1,
      isActive: false,
      status: AssumptionVersionStatus.DRAFT,
      sourceVersionId: source.id,
      notes: input.notes ?? `Cloned from version ${source.version}`,
      auditEvents: { create: { orgId, actorId, action: 'DRAFT_CREATED', toStatus: 'DRAFT', note: input.notes ?? `Draft cloned from version ${source.version}` } },
      params: { create: clonedParamData(source.params) },
    },
    include: {
      _count: { select: { params: true } },
      publishedBy: { select: { email: true } },
      auditEvents: { select: { id: true, action: true, fromStatus: true, toStatus: true, note: true, createdAt: true, actor: { select: { email: true } } }, orderBy: { createdAt: 'desc' } },
    },
  })
}

export async function activateCostBaseVersion(orgId: string, costBaseId: string, versionId: string) {
  const version = await prisma.assumptionSet.findFirstOrThrow({ where: { id: versionId, orgId, costBaseId } })
  if (version.status != null && version.status !== AssumptionVersionStatus.PUBLISHED) {
    throw httpError('Publish a draft version before making it active.', 409)
  }
  await prisma.$transaction([
    prisma.assumptionSet.updateMany({ where: { orgId, costBaseId, isActive: true }, data: { isActive: false } }),
    prisma.assumptionSet.update({ where: { id: version.id }, data: { isActive: true } }),
    prisma.costBase.update({ where: { id: costBaseId }, data: { status: 'ACTIVE' } }),
  ])
  return getCostBase(orgId, costBaseId)
}

export async function publishCostBaseVersion(
  orgId: string,
  costBaseId: string,
  versionId: string,
  actorId: string,
  input: PublishCostBaseVersionInput,
) {
  const version = await prisma.assumptionSet.findFirstOrThrow({
    where: { id: versionId, orgId, costBaseId },
    include: { _count: { select: { params: true } }, scenarioReviewSource: { select: { id: true, status: true } } },
  })
  if (version.status === AssumptionVersionStatus.PUBLISHED) throw httpError('This version is already published.', 409)
  if (version.status === AssumptionVersionStatus.ARCHIVED) throw httpError('Archived versions cannot be published.', 409)
  if (version._count.params !== PARAMETER_CATALOG_TOTAL) {
    throw httpError(`A version must contain all ${PARAMETER_CATALOG_TOTAL} canonical parameters before publication.`, 422)
  }
  const reviewBlocker = scenarioReviewPublishBlocker(version.scenarioReviewSource?.status, input.impactAcknowledged)
  if (reviewBlocker) throw httpError(reviewBlocker, version.scenarioReviewSource?.status === 'APPROVED' ? 422 : 409)
  const releaseImpact = version.scenarioReviewSource ? await getCostBaseVersionImpact(orgId, costBaseId, versionId) : null
  const releaseNote = releaseImpact && version.scenarioReviewSource
    ? `${input.note}\nScenario review ${version.scenarioReviewSource.id} acknowledged; release impact recomputed: ${releaseImpact.comparison.changedParameterCount} parameter change(s), ${releaseImpact.records.productionRoutes.frozenOnActive} production route(s) remain frozen, ${releaseImpact.records.quotes.savedOnActive} saved quote(s) remain on the active version.`
    : input.note

  await prisma.$transaction([
    prisma.assumptionSet.update({
      where: { id: version.id },
      data: { status: AssumptionVersionStatus.PUBLISHED, publishedAt: new Date(), publishedById: actorId },
    }),
    prisma.assumptionVersionAudit.create({
      data: {
        orgId, setId: version.id, actorId, action: 'PUBLISHED',
        fromStatus: AssumptionVersionStatus.DRAFT, toStatus: AssumptionVersionStatus.PUBLISHED, note: releaseNote,
      },
    }),
  ])
  return getCostBase(orgId, costBaseId)
}

export async function archiveCostBaseVersion(
  orgId: string,
  costBaseId: string,
  versionId: string,
  actorId: string,
  input: ArchiveCostBaseVersionInput,
) {
  const version = await prisma.assumptionSet.findFirstOrThrow({ where: { id: versionId, orgId, costBaseId } })
  if (version.isActive) throw httpError('Activate another published version before archiving this one.', 409)
  if (version.status !== AssumptionVersionStatus.PUBLISHED) throw httpError('Only published versions can be archived.', 409)
  const productionRouteCount = await prisma.productionRoute.count({
    where: { orgId, confirmedAssumptionSetId: version.id, status: 'PRODUCTION' },
  })
  if (productionRouteCount > 0) {
    throw httpError('This published version is still governing routes in production. Archive or replace those routes first.', 409)
  }

  await prisma.$transaction([
    prisma.assumptionSet.update({ where: { id: version.id }, data: { status: AssumptionVersionStatus.ARCHIVED } }),
    prisma.assumptionVersionAudit.create({
      data: {
        orgId, setId: version.id, actorId, action: 'ARCHIVED',
        fromStatus: AssumptionVersionStatus.PUBLISHED, toStatus: AssumptionVersionStatus.ARCHIVED, note: input.note,
      },
    }),
  ])
  return getCostBase(orgId, costBaseId)
}

/**
 * Release preview for an explicit candidate version. This endpoint is
 * intentionally read-only: activating a version changes the default for
 * future work only; production routes and saved quotes retain their governed
 * version/snapshot until a person replaces or re-quotes them.
 */
export async function getCostBaseVersionImpact(orgId: string, costBaseId: string, versionId: string) {
  const base = await prisma.costBase.findFirstOrThrow({
    where: { id: costBaseId, orgId },
    include: {
      versions: {
        select: {
          id: true, version: true, status: true, isActive: true,
          params: { select: { section: true, field: true, value: true, unit: true } },
        },
      },
    },
  })
  const candidate = base.versions.find((version) => version.id === versionId)
  if (!candidate) throw httpError('Version does not belong to this cost base.', 404)
  const active = base.versions.find((version) => version.isActive) ?? null

  const versionWhere = (id: string) => ({ orgId, costBaseId, assumptionSetId: id })
  const productionScope = { orgId, confirmedCostBaseId: costBaseId, status: 'PRODUCTION' as const }
  const quoteScope = { orgId, costBaseId }
  const candidateIsActive = candidate.id === active?.id
  const [routesOnActive, routesOnCandidateRaw, routesTotal, quotesOnActive, quotesOnCandidateRaw, quotesTotal] = await prisma.$transaction([
    prisma.productionRoute.count({ where: active ? { ...productionScope, confirmedAssumptionSetId: active.id } : { ...productionScope, id: '__no-active-version__' } }),
    prisma.productionRoute.count({ where: { ...productionScope, confirmedAssumptionSetId: candidate.id } }),
    prisma.productionRoute.count({ where: productionScope }),
    prisma.quote.count({ where: active ? versionWhere(active.id) : { ...quoteScope, id: '__no-active-version__' } }),
    prisma.quote.count({ where: versionWhere(candidate.id) }),
    prisma.quote.count({ where: quoteScope }),
  ])

  return {
    base: { id: base.id, code: base.code, name: base.name, scope: base.scope },
    ...buildVersionImpact(candidate, active, {
      productionRoutes: {
        frozenOnActive: routesOnActive,
        alreadyOnCandidate: candidateIsActive ? 0 : routesOnCandidateRaw,
        other: Math.max(0, routesTotal - routesOnActive - (candidateIsActive ? 0 : routesOnCandidateRaw)),
      },
      quotes: {
        savedOnActive: quotesOnActive,
        savedOnCandidate: candidateIsActive ? 0 : quotesOnCandidateRaw,
        other: Math.max(0, quotesTotal - quotesOnActive - (candidateIsActive ? 0 : quotesOnCandidateRaw)),
      },
    }),
  }
}

export async function resolveCalculationContext(
  orgId: string,
  input: { costBaseId?: string; assumptionSetId?: string; operation: string },
) {
  let costBase = input.costBaseId
    ? await prisma.costBase.findFirstOrThrow({ where: { id: input.costBaseId, orgId } })
    : null
  if (costBase?.status === 'ARCHIVED') throw httpError('Archived cost bases cannot be used for new calculations.', 409)
  if (costBase) assertScopeCompatible(costBase.scope, input.operation)

  const set = input.assumptionSetId
    ? await prisma.assumptionSet.findFirst({
        where: { id: input.assumptionSetId, orgId, ...(costBase ? { costBaseId: costBase.id } : {}) },
        include: { params: true },
      })
    : costBase
      ? await prisma.assumptionSet.findFirst({ where: { orgId, costBaseId: costBase.id, isActive: true }, include: { params: true } })
      : await getActiveSet(orgId)

  if (input.assumptionSetId && !set) throw httpError('Assumption version does not belong to the selected cost base.', 422)
  if (costBase && !set) throw httpError('The selected cost base has no active assumption version.', 409)
  if (set?.status === AssumptionVersionStatus.ARCHIVED) throw httpError('Archived assumption versions cannot be used for new calculations.', 409)

  // A directly selected version carries its base automatically, so callers
  // cannot accidentally calculate a linked version while losing base lineage.
  if (!costBase && set?.costBaseId) {
    costBase = await prisma.costBase.findFirstOrThrow({ where: { id: set.costBaseId, orgId } })
    if (costBase.status === 'ARCHIVED') throw httpError('Archived cost bases cannot be used for new calculations.', 409)
    assertScopeCompatible(costBase.scope, input.operation)
  }

  const storedPolicy = costBase?.defaultPolicy
  const defaultPolicy: EnginePolicy = storedPolicy === CalculationPolicy.WORKBOOK_V3 ? 'WORKBOOK_V3' : 'OPERATIONAL_V3'
  return { costBase, set, defaultPolicy }
}

import { AssumptionVersionStatus, CalculationPolicy, CostBaseScope, Prisma, Section, type AssumptionParam } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { DEFAULT_ASSUMPTIONS } from '../../data/default-assumptions.js'
import { getActiveSet } from '../assumptions/assumptions.service.js'
import type { EnginePolicy, EquipmentSpec } from '../engine/engine.types.js'
import type {
  ArchiveCostBaseInput, ArchiveCostBaseVersionInput, CreateCostBaseInput, CreateCostBaseVersionInput,
  PublishCostBaseVersionInput, UpdateCostBaseInput, UpdateCostBaseVersionProfileInput,
} from './cost-bases.schema.js'
import { PARAMETER_CATALOG_TOTAL, PARAMETER_DEFINITIONS } from '../../data/parameter-catalog.js'
import { buildVersionImpact } from './version-impact.js'
import { isParameterApplicable, parameterApplicability } from './cost-base-applicability.js'
import { listRecommendedCostBasePresets } from './recommended-cost-base-presets.js'
import { defaultCostBaseProfile, parseCostBaseProfile, profileConsistencyIssues, type CostBaseProfile } from './cost-base-profile.js'
import {
  assertAssumptionSetDomain,
  assertAssumptionValueDomain,
  assertCanonicalAssumptionIdentity,
} from '../assumptions/assumption-domain.js'
import { lockAssumptionVersion, lockCostBaseLifecycle, lockOrganizationLifecycle } from '../assumptions/assumption-version-lock.js'

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode })
}

const overrideDefinitionByKey = new Map(PARAMETER_DEFINITIONS.map((definition) => [
  `${definition.section}__${definition.field}`,
  definition,
]))

/** Per-calculation overrides are strict because they have no separate approval workflow. */
export function assertCalculationOverrides(
  scope: CostBaseScope | null,
  overrides: Record<string, number> | undefined,
  profile?: CostBaseProfile | null,
) {
  if (!overrides) return
  for (const [key, value] of Object.entries(overrides)) {
    const definition = overrideDefinitionByKey.get(key)
    if (!definition) throw httpError(`Override ${key} is not part of the canonical parameter catalog.`, 422)
    if (!Number.isFinite(value) || value < definition.low || value > definition.high) {
      throw httpError(
        `Override ${key} must be between ${definition.low} and ${definition.high} ${definition.unit}.`,
        422,
      )
    }
    if (scope) {
      const decision = parameterApplicability(
        scope,
        definition,
        profile ?? defaultCostBaseProfile(scope),
      )
      if (decision.applicability === 'NOT_APPLICABLE' || decision.applicability === 'NOT_IMPLEMENTED') {
        throw httpError(`Override ${key} cannot be used for this cost-base profile: ${decision.reason}`, 422)
      }
    }
  }
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

export function assertCostBaseMetadataUpdate(input: UpdateCostBaseInput): void {
  const candidate = input as UpdateCostBaseInput & { status?: unknown; isDefault?: unknown; defaultPolicy?: unknown }
  if (
    Object.prototype.hasOwnProperty.call(candidate, 'status') ||
    Object.prototype.hasOwnProperty.call(candidate, 'isDefault') ||
    Object.prototype.hasOwnProperty.call(candidate, 'defaultPolicy')
  ) {
    throw httpError(
      'Cost-base lifecycle, default effectiveness, and calculation policy are version-governed. Create a separate cost base for a different policy.',
      409,
    )
  }
}

type CalculationApplicabilityInput = {
  operation: string
  service: string
  equipment: Pick<EquipmentSpec, 'truckType' | 'trailer' | 'config' | 'driver'>
}

export function assertCalculationSupportedByProfile(
  profile: CostBaseProfile,
  input: CalculationApplicabilityInput,
  requestedPolicy?: EnginePolicy,
) {
  if (requestedPolicy && requestedPolicy !== profile.calculationPolicy) {
    throw httpError(`Policy ${requestedPolicy} does not match the governed policy ${profile.calculationPolicy} of the selected assumption version.`, 422)
  }
  if (!profile.operations.some((operation) => operation === input.operation)) {
    throw httpError(`Operation ${input.operation} is not enabled in the selected assumption version.`, 422)
  }
  if (!profile.services.some((service) => service === input.service)) {
    throw httpError(`Service ${input.service} is not enabled in the selected assumption version.`, 422)
  }
  if (!profile.truckTypes.some((truckType) => truckType === input.equipment.truckType)) {
    throw httpError(`Truck type ${input.equipment.truckType} is not enabled in the selected assumption version.`, 422)
  }
  if (!profile.trailerTypes.some((trailer) => trailer === input.equipment.trailer)) {
    throw httpError(`Trailer ${input.equipment.trailer} is not enabled in the selected assumption version.`, 422)
  }
  if (!profile.configurations.some((config) => config === input.equipment.config)) {
    throw httpError(`Configuration ${input.equipment.config} is not enabled in the selected assumption version.`, 422)
  }
  if (!profile.driverTypes.some((driver) => driver === input.equipment.driver)) {
    throw httpError(`Driver type ${input.equipment.driver} is not enabled in the selected assumption version.`, 422)
  }
}

/**
 * Resolves and enforces the versioned applicability contract before any
 * calculation runs. A missing context is treated as a legacy version and gets
 * the deterministic default for its scope; malformed stored JSON is never
 * silently replaced.
 */
export function calculationApplicabilityProfile(
  scope: CostBaseScope,
  storedContext: unknown,
  fallbackPolicy: CalculationPolicy,
  input: CalculationApplicabilityInput,
  requestedPolicy?: EnginePolicy,
): CostBaseProfile {
  let profile: CostBaseProfile
  try {
    // A stored profile is version-owned: its policy must not be reinterpreted
    // through the mutable CostBase default. Only legacy null contexts inherit
    // the base default.
    profile = parseCostBaseProfile(scope, storedContext, storedContext == null ? fallbackPolicy : undefined)
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : ''
    throw httpError(`The selected assumption version has an invalid applicability profile.${detail}`, 422)
  }

  assertCalculationSupportedByProfile(profile, input, requestedPolicy)
  return profile
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

function applyCreateOverrides(
  scope: CostBaseScope,
  applicabilityProfile: unknown,
  params: ReturnType<typeof defaultParamData> | ReturnType<typeof clonedParamData>,
  overrides: CreateCostBaseInput['assumptionOverrides'],
) {
  if (overrides.length === 0) return params
  const definitions = new Map(PARAMETER_DEFINITIONS.map((definition) => [
    `${definition.section}__${definition.field}`,
    definition,
  ]))
  const values = new Map<string, number>()
  for (const override of overrides) {
    const key = `${override.section}__${override.field}`
    const definition = definitions.get(key)
    if (!definition) throw httpError(`Unknown canonical assumption ${override.section} / ${override.field}.`, 422)
    assertAssumptionValueDomain(override)
    if (!isParameterApplicable(scope, definition, applicabilityProfile)) {
      throw httpError(`${override.field} does not apply to cost-base scope ${scope}.`, 422)
    }
    values.set(key, override.value)
  }
  return params.map((param) => ({
    ...param,
    value: values.get(`${param.section}__${param.field}`) ?? param.value,
  }))
}

export async function listCostBases(orgId: string) {
  return prisma.costBase.findMany({
    where: { orgId },
    include: {
      versions: {
        select: {
          id: true, name: true, version: true, isActive: true, status: true, notes: true,
          sourceVersionId: true, applicabilityContext: true, publishedAt: true, createdAt: true, updatedAt: true,
          scenarioReviewSource: { select: { id: true, status: true, sourceChecksum: true, quoteId: true } },
          publishedBy: { select: { email: true } },
          auditEvents: { select: { id: true, action: true, fromStatus: true, toStatus: true, note: true, createdAt: true, actor: { select: { email: true } } }, orderBy: { createdAt: 'desc' } },
          _count: { select: { params: true } },
        },
        orderBy: { version: 'desc' },
      },
      auditEvents: {
        select: { id: true, action: true, fromStatus: true, toStatus: true, note: true, payload: true, createdAt: true, actor: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
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
      auditEvents: {
        include: { actor: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { lanes: true, quotes: true } },
    },
  })
}

export async function createCostBase(orgId: string, input: CreateCostBaseInput, actorId?: string) {
  const preset = input.setupMode === 'RECOMMENDED_TEMPLATE'
    ? listRecommendedCostBasePresets().find((candidate) => candidate.id === input.presetId)
    : null
  if (input.setupMode === 'RECOMMENDED_TEMPLATE' && !preset) {
    throw httpError(`Unknown recommended cost-base preset ${input.presetId}.`, 422)
  }
  if (preset && preset.scope !== input.scope) {
    throw httpError(`Recommended preset ${preset.id} is not compatible with cost-base scope ${input.scope}.`, 422)
  }
  if (preset && input.cloneFromSetId) {
    throw httpError('A recommended template cannot clone another assumption set; its baseline must remain canonical.', 422)
  }
  const defaultPolicy = input.defaultPolicy ?? preset?.defaultPolicy ?? CalculationPolicy.OPERATIONAL_V3
  const currency = input.currency ?? preset?.currency ?? 'USD'
  const isDefault = input.isDefault ?? preset?.isDefault ?? false
  const applicabilityProfile = input.applicabilityProfile
    ?? preset?.applicabilityProfile
    ?? defaultCostBaseProfile(input.scope, defaultPolicy)
  const profileIssues = profileConsistencyIssues(input.scope, applicabilityProfile, defaultPolicy)
  if (profileIssues.length > 0) throw httpError(`Invalid cost-base applicability profile: ${profileIssues.join(' ')}`, 422)
  const source = input.cloneFromSetId
    ? await prisma.assumptionSet.findFirstOrThrow({ where: { id: input.cloneFromSetId, orgId }, include: { params: true } })
    : null
  const params = applyCreateOverrides(
    input.scope,
    applicabilityProfile,
    source ? clonedParamData(source.params) : defaultParamData(),
    input.assumptionOverrides,
  )
  assertCanonicalAssumptionIdentity(params)
  assertAssumptionSetDomain(params, input.scope)
  const presetDeviations = preset ? [
    defaultPolicy !== preset.defaultPolicy ? `policy ${defaultPolicy}` : null,
    currency !== preset.currency ? `currency ${currency}` : null,
    isDefault !== preset.isDefault ? `default flag ${isDefault}` : null,
    JSON.stringify(applicabilityProfile) !== JSON.stringify(preset.applicabilityProfile) ? 'adapted applicability profile' : null,
    input.assumptionOverrides.length > 0 ? `${input.assumptionOverrides.length} confirmed parameter override(s)` : null,
  ].filter((item): item is string => item !== null) : []
  const presetEvidence = preset
    ? `Recommended preset ${preset.id}@${preset.version} supplied the canonical baseline; deviations: ${presetDeviations.length > 0 ? presetDeviations.join(', ') : 'none'}.`
    : null
  const creationNote = input.setupMode === 'RECOMMENDED_TEMPLATE'
    ? presetEvidence ?? 'Cost base created from a recommended preset.'
    : input.setupMode === 'CONSULTANT_WIZARD'
      ? 'Cost base created through the consultant wizard.'
      : source
        ? `Cost base created by cloning assumption version ${source.id}.`
        : 'Cost base created manually.'

  return prisma.costBase.create({
      data: {
        orgId,
        code: input.code,
        name: input.name,
        description: input.description,
        scope: input.scope,
        status: 'DRAFT',
        defaultPolicy,
        currency,
        isDefault,
        auditEvents: {
          create: {
            orgId,
            actorId,
            action: 'CREATED',
            toStatus: 'DRAFT',
            note: creationNote,
            payload: {
              setupMode: input.setupMode,
              presetId: preset?.id ?? null,
              presetVersion: preset?.version ?? null,
              sourceVersionId: source?.id ?? null,
              defaultPolicy,
              currency,
              isDefault,
            },
          },
        },
        versions: {
          create: {
            orgId,
            name: input.name,
            version: 1,
            // A default selection is only a preference until this draft is
            // published and activated through the governed transition.
            isActive: false,
            status: AssumptionVersionStatus.DRAFT,
            sourceVersionId: source?.id,
            applicabilityContext: applicabilityProfile as unknown as Prisma.InputJsonValue,
            notes: source
              ? `Initial version cloned from ${source.name} v${source.version}`
              : input.setupMode === 'RECOMMENDED_TEMPLATE'
                ? presetEvidence ?? 'Initial canonical parameter version configured from a recommended preset'
              : input.setupMode === 'CONSULTANT_WIZARD'
                ? 'Initial canonical parameter version configured through the consultant wizard'
                : 'Initial canonical parameter version',
            auditEvents: {
              create: {
                orgId,
                actorId,
                action: 'DRAFT_CREATED',
                toStatus: 'DRAFT',
                note: input.setupMode === 'RECOMMENDED_TEMPLATE'
                  ? presetEvidence ?? 'Initial draft created from a recommended preset'
                  : input.setupMode === 'CONSULTANT_WIZARD'
                    ? `Initial draft created through consultant wizard with ${input.assumptionOverrides.length} confirmed override(s)`
                    : 'Initial draft version created',
              },
            },
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
        auditEvents: {
          select: { id: true, action: true, fromStatus: true, toStatus: true, note: true, payload: true, createdAt: true, actor: { select: { email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { lanes: true, quotes: true } },
      },
  })
}

export async function updateCostBase(orgId: string, id: string, input: UpdateCostBaseInput, actorId?: string) {
  assertCostBaseMetadataUpdate(input)
  await prisma.$transaction(async (tx) => {
    await lockCostBaseLifecycle(tx, orgId, id)
    const before = await tx.costBase.findFirstOrThrow({
      where: { id, orgId },
      select: {
        id: true,
        status: true,
        name: true,
        description: true,
        currency: true,
        versions: { where: { status: AssumptionVersionStatus.PUBLISHED }, take: 1, select: { id: true } },
      },
    })
    if (before.status === 'ARCHIVED') throw httpError('Archived cost bases cannot be edited.', 409)
    const changedFields = (['name', 'description', 'currency'] as const).filter((field) => (
      Object.prototype.hasOwnProperty.call(input, field) && input[field] !== before[field]
    ))
    if (changedFields.length === 0) return
    if (changedFields.includes('currency') && (before.status !== 'DRAFT' || before.versions.length > 0)) {
      throw httpError('Currency is frozen after the first version is published or the cost base leaves DRAFT. Create a separate governed base for another currency.', 409)
    }
    const transition = await tx.costBase.updateMany({
      where: { id, orgId, status: { not: 'ARCHIVED' } },
      data: input,
    })
    if (transition.count !== 1) throw httpError('The cost base is no longer editable.', 409)
    const after = {
      name: input.name ?? before.name,
      description: Object.prototype.hasOwnProperty.call(input, 'description') ? input.description ?? null : before.description,
      currency: input.currency ?? before.currency,
    }
    await tx.costBaseAuditEvent.create({
      data: {
        orgId,
        costBaseId: id,
        actorId,
        action: 'METADATA_UPDATED',
        fromStatus: before.status,
        toStatus: before.status,
        note: `Updated metadata: ${changedFields.join(', ')}.`,
        payload: {
          changedFields,
          before: { name: before.name, description: before.description, currency: before.currency },
          after,
        },
      },
    })
  })
  return getCostBase(orgId, id)
}

export async function archiveCostBase(orgId: string, costBaseId: string, actorId?: string, input: ArchiveCostBaseInput = {}) {
  await prisma.$transaction(async (tx) => {
    await lockCostBaseLifecycle(tx, orgId, costBaseId)
    const base = await tx.costBase.findFirstOrThrow({
      where: { id: costBaseId, orgId },
      select: {
        id: true,
        status: true,
        isDefault: true,
        versions: { where: { isActive: true }, select: { id: true } },
      },
    })
    if (base.status === 'ARCHIVED') throw httpError('This cost base is already archived.', 409)
    const productionRouteCount = await tx.productionRoute.count({
      where: { orgId, confirmedCostBaseId: costBaseId, status: 'PRODUCTION' },
    })
    if (productionRouteCount > 0) {
      throw httpError('This cost base still governs routes in production. Archive or replace those routes first.', 409)
    }
    await tx.assumptionSet.updateMany({
      where: { orgId, costBaseId, isActive: true },
      data: { isActive: false },
    })
    const transition = await tx.costBase.updateMany({
      where: { id: costBaseId, orgId, status: { not: 'ARCHIVED' } },
      data: { status: 'ARCHIVED', isDefault: false },
    })
    if (transition.count !== 1) throw httpError('The cost base is no longer archivable.', 409)
    await tx.costBaseAuditEvent.create({
      data: {
        orgId,
        costBaseId,
        actorId,
        action: 'ARCHIVED',
        fromStatus: base.status,
        toStatus: 'ARCHIVED',
        note: input.note ?? 'Archived by an administrator.',
        payload: {
          wasDefault: base.isDefault,
          deactivatedVersionIds: base.versions.map((version) => version.id),
        },
      },
    })
  })
  return getCostBase(orgId, costBaseId)
}

export async function createCostBaseVersion(orgId: string, costBaseId: string, input: CreateCostBaseVersionInput, actorId?: string) {
  return prisma.$transaction(async (tx) => {
    await lockCostBaseLifecycle(tx, orgId, costBaseId)
    const base = await tx.costBase.findFirstOrThrow({
      where: { id: costBaseId, orgId },
      include: { versions: { include: { params: true }, orderBy: { version: 'desc' } } },
    })
    if (base.status === 'ARCHIVED') throw httpError('Archived cost bases cannot receive new versions.', 409)

    const source = input.cloneFromSetId
      ? base.versions.find((version) => version.id === input.cloneFromSetId)
      : base.versions.find((version) => version.isActive) ?? base.versions[0]
    if (!source) throw httpError('A source version is required to create the next version.', 409)

    return tx.assumptionSet.create({
      data: {
        orgId,
        costBaseId,
        name: base.name,
        version: (base.versions[0]?.version ?? 0) + 1,
        isActive: false,
        status: AssumptionVersionStatus.DRAFT,
        applicabilityContext: source.applicabilityContext == null
          ? Prisma.DbNull
          : source.applicabilityContext as Prisma.InputJsonValue,
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
  })
}

export async function updateCostBaseVersionProfile(
  orgId: string,
  costBaseId: string,
  versionId: string,
  input: UpdateCostBaseVersionProfileInput,
  actorId?: string,
) {
  return prisma.$transaction(async (tx) => {
    await lockOrganizationLifecycle(tx, orgId)
    await lockAssumptionVersion(tx, orgId, versionId)
    const version = await tx.assumptionSet.findFirstOrThrow({
      where: { id: versionId, orgId, costBaseId },
      include: { costBase: { select: { scope: true, status: true, defaultPolicy: true } } },
    })
    if (!version.costBase) throw httpError('The assumption version is not linked to the selected cost base.', 422)
    if (version.costBase.status === 'ARCHIVED') throw httpError('An archived cost base cannot change version profiles.', 409)
    if (version.status !== AssumptionVersionStatus.DRAFT) {
      throw httpError('Only a DRAFT assumption version can change its applicability profile.', 409)
    }
    let governedPolicy = version.costBase.defaultPolicy
    if (version.applicabilityContext != null) {
      try {
        governedPolicy = parseCostBaseProfile(version.costBase.scope, version.applicabilityContext).calculationPolicy
      } catch {
        // A malformed stored profile remains repairable, but cannot use repair as
        // an implicit policy migration. The base default is the safe boundary.
      }
    }
    const issues = profileConsistencyIssues(
      version.costBase.scope,
      input.applicabilityProfile,
      governedPolicy,
    )
    if (issues.length > 0) throw httpError(`Invalid applicability profile: ${issues.join(' ')}`, 422)

    const updated = await tx.assumptionSet.updateMany({
      where: { id: version.id, orgId, costBaseId, status: AssumptionVersionStatus.DRAFT },
      data: { applicabilityContext: input.applicabilityProfile as unknown as Prisma.InputJsonValue },
    })
    if (updated.count !== 1) throw httpError('The assumption version is no longer editable.', 409)
    await tx.assumptionVersionAudit.create({
      data: {
        orgId,
        setId: version.id,
        actorId,
        action: 'PROFILE_UPDATED',
        fromStatus: AssumptionVersionStatus.DRAFT,
        toStatus: AssumptionVersionStatus.DRAFT,
        note: input.note ?? 'Applicability profile updated; all canonical parameter values were preserved.',
      },
    })
    return tx.assumptionSet.findUniqueOrThrow({
      where: { id: version.id },
      include: {
        _count: { select: { params: true } },
        publishedBy: { select: { email: true } },
        auditEvents: {
          select: { id: true, action: true, fromStatus: true, toStatus: true, note: true, createdAt: true, actor: { select: { email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  })
}

export async function activateCostBaseVersion(orgId: string, costBaseId: string, versionId: string, actorId?: string) {
  await prisma.$transaction(async (tx) => {
    await lockCostBaseLifecycle(tx, orgId, costBaseId)
    await lockAssumptionVersion(tx, orgId, versionId)
    const version = await tx.assumptionSet.findFirstOrThrow({
      where: { id: versionId, orgId, costBaseId },
      include: { costBase: { select: { scope: true, status: true, isDefault: true } } },
    })
    if (version.costBase?.status === 'ARCHIVED') {
      throw httpError('An archived cost base cannot activate a version.', 409)
    }
    if (version.status !== AssumptionVersionStatus.PUBLISHED) {
      throw httpError('Publish a draft version before making it active.', 409)
    }
    if (version.applicabilityContext == null || !version.costBase) {
      throw httpError('A governed applicability profile is required before activation.', 422)
    }
    const activatedProfile = parseCostBaseProfile(version.costBase.scope, version.applicabilityContext)
    const replacedDefaults = version.costBase.isDefault
      ? (await tx.costBase.findMany({
          where: { orgId, scope: version.costBase.scope, isDefault: true, id: { not: costBaseId } },
          select: { id: true, status: true },
        })).filter((base) => base.id !== costBaseId)
      : []
    if (version.costBase.isDefault) {
      await tx.costBase.updateMany({
        where: { orgId, scope: version.costBase.scope, isDefault: true, id: { not: costBaseId } },
        data: { isDefault: false },
      })
    }
    await tx.assumptionSet.updateMany({ where: { orgId, costBaseId, isActive: true }, data: { isActive: false } })
    await tx.assumptionSet.update({ where: { id: version.id }, data: { isActive: true } })
    await tx.costBase.update({
      where: { id: costBaseId },
      data: {
        status: 'ACTIVE',
        defaultPolicy: activatedProfile.calculationPolicy,
      },
    })
    await tx.costBaseAuditEvent.create({
      data: {
        orgId,
        costBaseId,
        actorId,
        action: 'VERSION_ACTIVATED',
        fromStatus: version.costBase.status,
        toStatus: 'ACTIVE',
        note: `Published assumption version ${version.version} activated.`,
        payload: {
          versionId: version.id,
          version: version.version,
          calculationPolicy: activatedProfile.calculationPolicy,
          preferredDefault: version.costBase.isDefault,
        },
      },
    })
    if (replacedDefaults.length > 0) {
      await tx.costBaseAuditEvent.createMany({
        data: replacedDefaults.map((base) => ({
          orgId,
          costBaseId: base.id,
          actorId,
          action: 'DEFAULT_REPLACED' as const,
          fromStatus: base.status,
          toStatus: base.status,
          note: 'Default preference replaced by an activated cost base in the same scope.',
          payload: {
            replacementCostBaseId: costBaseId,
            activatedVersionId: version.id,
          },
        })),
      })
    }
  })
  return getCostBase(orgId, costBaseId)
}

export async function publishCostBaseVersion(
  orgId: string,
  costBaseId: string,
  versionId: string,
  actorId: string,
  input: PublishCostBaseVersionInput,
) {
  await prisma.$transaction(async (tx) => {
    await lockOrganizationLifecycle(tx, orgId)
    await lockAssumptionVersion(tx, orgId, versionId)
    const version = await tx.assumptionSet.findFirstOrThrow({
      where: { id: versionId, orgId, costBaseId },
      include: {
        costBase: { select: { scope: true, status: true } },
        params: { select: { section: true, field: true, value: true } },
        _count: { select: { params: true } },
        scenarioReviewSource: { select: { id: true, status: true } },
      },
    })
    if (version.costBase?.status === 'ARCHIVED') throw httpError('An archived cost base cannot publish versions.', 409)
    if (version.status === AssumptionVersionStatus.PUBLISHED) throw httpError('This version is already published.', 409)
    if (version.status === AssumptionVersionStatus.ARCHIVED) throw httpError('Archived versions cannot be published.', 409)
    if (version._count.params !== PARAMETER_CATALOG_TOTAL) {
      throw httpError(`A version must contain all ${PARAMETER_CATALOG_TOTAL} canonical parameters before publication.`, 422)
    }
    if (version.applicabilityContext == null) {
      throw httpError('Define and save the applicability profile before publishing this version.', 422)
    }
    if (version.costBase) {
      try {
        parseCostBaseProfile(version.costBase.scope, version.applicabilityContext)
      } catch (error) {
        const detail = error instanceof Error ? ` ${error.message}` : ''
        throw httpError(`The applicability profile must be corrected before publication.${detail}`, 422)
      }
    }
    assertCanonicalAssumptionIdentity(version.params)
    assertAssumptionSetDomain(version.params, version.costBase?.scope)
    const reviewBlocker = scenarioReviewPublishBlocker(version.scenarioReviewSource?.status, input.impactAcknowledged)
    if (reviewBlocker) throw httpError(reviewBlocker, version.scenarioReviewSource?.status === 'APPROVED' ? 422 : 409)
    const releaseImpact = version.scenarioReviewSource ? await getCostBaseVersionImpact(orgId, costBaseId, versionId) : null
    const releaseNote = releaseImpact && version.scenarioReviewSource
      ? `${input.note}\nScenario review ${version.scenarioReviewSource.id} acknowledged; release impact recomputed: ${releaseImpact.comparison.changedParameterCount} parameter change(s), applicability profile ${releaseImpact.comparison.applicabilityProfileChanged ? 'changed' : 'unchanged'}, ${releaseImpact.records.productionRoutes.frozenOnActive} production route(s) remain frozen, ${releaseImpact.records.quotes.savedOnActive} saved quote(s) remain on the active version.`
      : input.note

    const transition = await tx.assumptionSet.updateMany({
      where: { id: version.id, orgId, costBaseId, status: AssumptionVersionStatus.DRAFT },
      data: { status: AssumptionVersionStatus.PUBLISHED, publishedAt: new Date(), publishedById: actorId },
    })
    if (transition.count !== 1) throw httpError('The assumption version is no longer publishable.', 409)
    await tx.assumptionVersionAudit.create({
      data: {
        orgId, setId: version.id, actorId, action: 'PUBLISHED',
        fromStatus: AssumptionVersionStatus.DRAFT, toStatus: AssumptionVersionStatus.PUBLISHED, note: releaseNote,
      },
    })
  })
  return getCostBase(orgId, costBaseId)
}

export async function archiveCostBaseVersion(
  orgId: string,
  costBaseId: string,
  versionId: string,
  actorId: string,
  input: ArchiveCostBaseVersionInput,
) {
  await prisma.$transaction(async (tx) => {
    await lockCostBaseLifecycle(tx, orgId, costBaseId)
    await lockAssumptionVersion(tx, orgId, versionId)
    const version = await tx.assumptionSet.findFirstOrThrow({ where: { id: versionId, orgId, costBaseId } })
    if (version.isActive) throw httpError('Activate another published version before archiving this one.', 409)
    if (version.status !== AssumptionVersionStatus.PUBLISHED) throw httpError('Only published versions can be archived.', 409)
    const productionRouteCount = await tx.productionRoute.count({
      where: { orgId, confirmedAssumptionSetId: version.id, status: 'PRODUCTION' },
    })
    if (productionRouteCount > 0) {
      throw httpError('This published version is still governing routes in production. Archive or replace those routes first.', 409)
    }

    const transition = await tx.assumptionSet.updateMany({
      where: { id: version.id, orgId, costBaseId, status: AssumptionVersionStatus.PUBLISHED, isActive: false },
      data: { status: AssumptionVersionStatus.ARCHIVED },
    })
    if (transition.count !== 1) throw httpError('The assumption version is no longer archivable.', 409)
    await tx.assumptionVersionAudit.create({
      data: {
        orgId, setId: version.id, actorId, action: 'ARCHIVED',
        fromStatus: AssumptionVersionStatus.PUBLISHED, toStatus: AssumptionVersionStatus.ARCHIVED, note: input.note,
      },
    })
  })
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
          applicabilityContext: true,
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
  input: {
    costBaseId?: string
    assumptionSetId?: string
    operation: string
    service: string
    policy?: EnginePolicy
    equipment: Pick<EquipmentSpec, 'truckType' | 'trailer' | 'config' | 'driver'>
  },
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

  if (costBase && set) {
    if (set.status !== AssumptionVersionStatus.PUBLISHED) {
      throw httpError('Only published cost-base versions can be used for new calculations.', 409)
    }
    if (set.applicabilityContext == null) {
      throw httpError('Legacy cost-base versions without an applicability profile are restricted to historical snapshot replay.', 409)
    }
  }

  const storedPolicy = costBase?.defaultPolicy
  let defaultPolicy: EnginePolicy = storedPolicy === CalculationPolicy.WORKBOOK_V3 ? 'WORKBOOK_V3' : 'OPERATIONAL_V3'
  let applicabilityProfile: CostBaseProfile | null = null
  if (costBase && set) {
    applicabilityProfile = calculationApplicabilityProfile(
      costBase.scope,
      set.applicabilityContext,
      costBase.defaultPolicy,
      { operation: input.operation, service: input.service, equipment: input.equipment },
      input.policy,
    )
    // For a versioned profile its policy is the effective default. A later
    // edit to CostBase.defaultPolicy must not reinterpret historical versions.
    defaultPolicy = applicabilityProfile.calculationPolicy
  }
  return { costBase, set, defaultPolicy, applicabilityProfile }
}

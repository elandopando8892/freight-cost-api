import { Prisma, Section } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import type { CreateSetInput, UpdateSetInput, BulkUpdateInput, ResetParamsInput } from './assumptions.schema.js'
import { DEFAULT_ASSUMPTIONS } from '../../data/default-assumptions.js'
import { parameterApplicability, type ParameterApplicability } from '../cost-bases/cost-base-applicability.js'
import { parseCostBaseProfile } from '../cost-bases/cost-base-profile.js'
import { assertAssumptionValueDomain } from './assumption-domain.js'
import { lockAssumptionVersion, lockOrganizationLifecycle } from './assumption-version-lock.js'

// V3.0 recommended defaults, keyed "section__field" — powers reset-to-recommended,
// range warnings, and the `recommended`/`outOfRange` fields on params.
type DefaultParam = (typeof DEFAULT_ASSUMPTIONS)[number]
const DEFAULTS = new Map<string, DefaultParam>(
  DEFAULT_ASSUMPTIONS.map((a) => [`${a.section}__${a.field}`, a]),
)

export interface RangeWarning {
  section: string
  field: string
  value: number
  low: number | null
  high: number | null
  message: string
}

/** Out-of-recommended-range warning for a single edited value (null if in range). */
function rangeWarning(section: string, field: string, value: number): RangeWarning | null {
  const def = DEFAULTS.get(`${section}__${field}`)
  if (!def) return null
  const low = def.low ?? null
  const high = def.high ?? null
  if (low != null && value < low) {
    return { section, field, value, low, high, message: `below recommended minimum (${low})` }
  }
  if (high != null && value > high) {
    return { section, field, value, low, high, message: `above recommended maximum (${high})` }
  }
  return null
}

function versionLocked(status: string | undefined) {
  return status === 'PUBLISHED' || status === 'ARCHIVED'
}

type AssumptionDatabase = typeof prisma | Prisma.TransactionClient

async function assertEditableSet(orgId: string, setId: string, db: AssumptionDatabase = prisma) {
  const set = await db.assumptionSet.findFirstOrThrow({
    where: { id: setId, orgId },
    select: {
      status: true,
      costBaseId: true,
      applicabilityContext: true,
      costBase: { select: { scope: true, status: true, defaultPolicy: true } },
    },
  })
  if (set.costBase?.status === 'ARCHIVED') {
    const err = new Error('This cost base is archived and its versions cannot be modified.') as Error & { statusCode: number }
    err.statusCode = 409
    throw err
  }
  if (versionLocked(set.status)) {
    const err = new Error(`This assumption version is ${set.status.toLowerCase()} and cannot be modified. Create a new draft version first.`) as Error & { statusCode: number }
    err.statusCode = 409
    throw err
  }
  return set
}

export async function listSets(orgId: string) {
  return prisma.assumptionSet.findMany({
    where: { orgId },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true, name: true, version: true, isActive: true, notes: true,
      status: true, sourceVersionId: true, publishedAt: true,
      createdAt: true, updatedAt: true,
      applicabilityContext: true,
      costBase: { select: { id: true, code: true, name: true, scope: true, status: true, defaultPolicy: true } },
      _count: { select: { params: true } },
    },
  })
}

export async function createSet(orgId: string, input: CreateSetInput) {
  if (input.cloneFromId) {
    const source = await prisma.assumptionSet.findFirstOrThrow({
      where: { id: input.cloneFromId, orgId },
      include: { params: true },
    })
    if (source.costBaseId) {
      const err = new Error('A cost-base version cannot be cloned into a legacy assumption set. Create a new version from its cost base instead.') as Error & { statusCode: number }
      err.statusCode = 409
      throw err
    }

    const newSet = await prisma.assumptionSet.create({
      data: {
        orgId,
        name: input.name,
        notes: input.notes,
        version: 1,
        params: {
          create: source.params.map((p) => ({
            section: p.section,
            field: p.field,
            value: p.value,
            unit: p.unit,
            low: p.low,
            high: p.high,
            updateFrequency: p.updateFrequency,
            costBehavior: p.costBehavior,
            activation: p.activation,
            purpose: p.purpose,
            notes: p.notes,
          })),
        },
      },
      include: { params: true },
    })
    return newSet
  }

  // New set without clone — auto-seed with default params
  return prisma.assumptionSet.create({
    data: {
      orgId,
      name: input.name,
      notes: input.notes,
      params: {
        create: DEFAULT_ASSUMPTIONS.map((a) => ({
          section: a.section as Section,
          field: a.field,
          value: a.value,
          unit: a.unit,
          low: a.low ?? null,
          high: a.high ?? null,
          updateFrequency: a.updateFrequency,
          costBehavior: a.costBehavior,
          activation: a.activation,
        })),
      },
    },
    include: { params: true },
  })
}

export async function getSet(orgId: string, id: string) {
  return prisma.assumptionSet.findFirstOrThrow({
    where: { id, orgId },
    include: { params: { orderBy: [{ section: 'asc' }, { field: 'asc' }] } },
  })
}

export async function updateSet(orgId: string, id: string, input: UpdateSetInput) {
  const set = await assertEditableSet(orgId, id)
  if (set.costBaseId) {
    const err = new Error('Cost-base versions must be managed through the governed cost-base lifecycle.') as Error & { statusCode: number }
    err.statusCode = 409
    throw err
  }
  return prisma.assumptionSet.update({ where: { id }, data: input })
}

export async function deleteSet(orgId: string, id: string) {
  const set = await prisma.assumptionSet.findFirstOrThrow({ where: { id, orgId } })
  if (set.costBaseId) {
    const err = new Error('Cost-base versions cannot be deleted through the legacy assumption-set endpoint.') as Error & { statusCode: number }
    err.statusCode = 409
    throw err
  }
  if (set.isActive) {
    const err = new Error('Cannot delete the active assumption set') as Error & { statusCode: number }
    err.statusCode = 409
    throw err
  }
  if (versionLocked(set.status)) {
    const err = new Error('Cannot delete a published or archived assumption version') as Error & { statusCode: number }
    err.statusCode = 409
    throw err
  }
  return prisma.assumptionSet.delete({ where: { id } })
}

export async function activateSet(orgId: string, id: string) {
  const target = await prisma.assumptionSet.findFirstOrThrow({
    where: { id, orgId },
    select: { costBaseId: true },
  })
  if (target.costBaseId) {
    const err = new Error('Las versiones vinculadas a una base deben publicarse y activarse desde Bases de costo.') as Error & { statusCode: number }
    err.statusCode = 409
    throw err
  }
  await prisma.$transaction([
    prisma.assumptionSet.updateMany({ where: { orgId, costBaseId: target.costBaseId, isActive: true }, data: { isActive: false } }),
    prisma.assumptionSet.update({ where: { id }, data: { isActive: true } }),
  ])
  return prisma.assumptionSet.findUnique({ where: { id } })
}

export async function getParams(orgId: string, setId: string) {
  const set = await prisma.assumptionSet.findFirstOrThrow({
    where: { id: setId, orgId },
    select: { applicabilityContext: true, costBase: { select: { scope: true, defaultPolicy: true } } },
  })
  const params = await prisma.assumptionParam.findMany({
    where: { setId },
    orderBy: [{ section: 'asc' }, { field: 'asc' }],
  })

  // Enrich each param with its V3.0 recommended value + range bounds, and a flag
  // for "edited outside the recommended range" (drives the UI's reset + warnings).
  type Enriched = (typeof params)[number] & {
    recommended: number | null
    recommendedLow: number | null
    recommendedHigh: number | null
    outOfRange: boolean
    applicability: ParameterApplicability
    applicabilityReason: string
    applicabilityCondition: string | null
  }
  const grouped: Record<string, Enriched[]> = {}
  const applicabilityProfile = set.costBase
    ? parseCostBaseProfile(
        set.costBase.scope,
        set.applicabilityContext,
        set.applicabilityContext == null ? set.costBase.defaultPolicy : undefined,
      )
    : null
  for (const p of params) {
    const def = DEFAULTS.get(`${p.section}__${p.field}`)
    const low = p.low ?? def?.low ?? null
    const high = p.high ?? def?.high ?? null
    const outOfRange = (low != null && p.value < low) || (high != null && p.value > high)
    const applicability = parameterApplicability(set.costBase?.scope, p, applicabilityProfile)
    const enriched: Enriched = {
      ...p,
      recommended: def ? def.value : null,
      recommendedLow: def?.low ?? null,
      recommendedHigh: def?.high ?? null,
      outOfRange,
      applicability: applicability.applicability,
      applicabilityReason: applicability.reason,
      applicabilityCondition: applicability.condition,
    }
    if (!grouped[p.section]) grouped[p.section] = []
    grouped[p.section].push(enriched)
  }
  return grouped
}

export async function bulkUpdateParams(orgId: string, setId: string, updates: BulkUpdateInput) {
  await prisma.$transaction(async (tx) => {
    await lockOrganizationLifecycle(tx, orgId)
    await lockAssumptionVersion(tx, orgId, setId)
    const set = await assertEditableSet(orgId, setId, tx)
    const applicabilityProfile = set.costBase
      ? parseCostBaseProfile(
          set.costBase.scope,
          set.applicabilityContext,
          set.applicabilityContext == null ? set.costBase.defaultPolicy : undefined,
        )
      : null
    for (const update of updates) {
      if (!DEFAULTS.has(`${update.section}__${update.field}`)) {
        const err = new Error(`${update.field} no pertenece al catálogo canónico y no puede guardarse.`) as Error & { statusCode: number }
        err.statusCode = 422
        throw err
      }
      assertAssumptionValueDomain(update)
      const applicability = parameterApplicability(set.costBase?.scope, update, applicabilityProfile)
      if (applicability.applicability === 'NOT_APPLICABLE') {
        const err = new Error(`${update.field} no aplica para el alcance de esta base y no puede editarse.`) as Error & { statusCode: number }
        err.statusCode = 422
        throw err
      }
    }

    for (const u of updates) {
      const def = DEFAULTS.get(`${u.section}__${u.field}`)
      await tx.assumptionParam.upsert({
        where: { setId_section_field: { setId, section: u.section as Section, field: u.field } },
        // On create, carry the V3.0 metadata so a new param isn't bounds-less.
        create: {
          setId, section: u.section as Section, field: u.field, value: u.value,
          unit: def?.unit ?? '', low: def?.low ?? null, high: def?.high ?? null,
          updateFrequency: def?.updateFrequency, costBehavior: def?.costBehavior, activation: def?.activation,
        },
        update: { value: u.value },
      })
    }
  })

  // Non-blocking: edits are saved, but we report any that left the recommended range.
  const warnings = updates
    .map((u) => rangeWarning(u.section, u.field, u.value))
    .filter((w): w is RangeWarning => w !== null)

  const params = await getParams(orgId, setId)
  return { params, warnings }
}

/** Reset params to their V3.0 recommended values (all, or only the given fields). */
export async function resetParams(orgId: string, setId: string, fields?: ResetParamsInput['fields']) {
  const targets: DefaultParam[] =
    fields && fields.length > 0
      ? fields
          .map((f) => DEFAULTS.get(`${f.section}__${f.field}`))
          .filter((d): d is DefaultParam => d !== undefined)
      : DEFAULT_ASSUMPTIONS

  await prisma.$transaction(async (tx) => {
    await lockOrganizationLifecycle(tx, orgId)
    await lockAssumptionVersion(tx, orgId, setId)
    await assertEditableSet(orgId, setId, tx)
    for (const a of targets) {
      await tx.assumptionParam.upsert({
        where: { setId_section_field: { setId, section: a.section as Section, field: a.field } },
        create: {
          setId, section: a.section as Section, field: a.field, value: a.value,
          unit: a.unit, low: a.low ?? null, high: a.high ?? null,
          updateFrequency: a.updateFrequency, costBehavior: a.costBehavior, activation: a.activation,
        },
        update: { value: a.value, low: a.low ?? null, high: a.high ?? null },
      })
    }
  })

  return getParams(orgId, setId)
}

export async function getActiveSet(orgId: string) {
  return prisma.assumptionSet.findFirst({
    // Cost-base versions have their own active flag. A calculation that did
    // not select a base may only inherit the explicitly legacy/common set;
    // otherwise the first active version from an unrelated modality wins.
    where: { orgId, isActive: true, costBaseId: null },
    include: { params: true },
  })
}

export type ParamMap = Record<string, number>

export function buildParamMap(params: { section: string; field: string; value: number }[]): ParamMap {
  const map: ParamMap = {}
  for (const p of params) {
    map[`${p.section}__${p.field}`] = p.value
  }
  return map
}

export function getParam(map: ParamMap, section: string, field: string, fallback = 0): number {
  return map[`${section}__${field}`] ?? fallback
}

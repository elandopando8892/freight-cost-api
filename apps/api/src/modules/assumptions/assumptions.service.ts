import { Section } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import type { CreateSetInput, UpdateSetInput, BulkUpdateInput, ResetParamsInput } from './assumptions.schema.js'
import { DEFAULT_ASSUMPTIONS } from '../../data/default-assumptions.js'

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

export async function listSets(orgId: string) {
  return prisma.assumptionSet.findMany({
    where: { orgId },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true, name: true, version: true, isActive: true, notes: true,
      createdAt: true, updatedAt: true,
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
          low: a.low || null,
          high: a.high || null,
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
  await prisma.assumptionSet.findFirstOrThrow({ where: { id, orgId } })
  return prisma.assumptionSet.update({ where: { id }, data: input })
}

export async function deleteSet(orgId: string, id: string) {
  const set = await prisma.assumptionSet.findFirstOrThrow({ where: { id, orgId } })
  if (set.isActive) {
    const err = new Error('Cannot delete the active assumption set') as Error & { statusCode: number }
    err.statusCode = 409
    throw err
  }
  return prisma.assumptionSet.delete({ where: { id } })
}

export async function activateSet(orgId: string, id: string) {
  await prisma.assumptionSet.findFirstOrThrow({ where: { id, orgId } })
  await prisma.$transaction([
    prisma.assumptionSet.updateMany({ where: { orgId, isActive: true }, data: { isActive: false } }),
    prisma.assumptionSet.update({ where: { id }, data: { isActive: true } }),
  ])
  return prisma.assumptionSet.findUnique({ where: { id } })
}

export async function getParams(orgId: string, setId: string) {
  await prisma.assumptionSet.findFirstOrThrow({ where: { id: setId, orgId } })
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
  }
  const grouped: Record<string, Enriched[]> = {}
  for (const p of params) {
    const def = DEFAULTS.get(`${p.section}__${p.field}`)
    const low = p.low ?? def?.low ?? null
    const high = p.high ?? def?.high ?? null
    const outOfRange = (low != null && p.value < low) || (high != null && p.value > high)
    const enriched: Enriched = {
      ...p,
      recommended: def ? def.value : null,
      recommendedLow: def?.low ?? null,
      recommendedHigh: def?.high ?? null,
      outOfRange,
    }
    if (!grouped[p.section]) grouped[p.section] = []
    grouped[p.section].push(enriched)
  }
  return grouped
}

export async function bulkUpdateParams(orgId: string, setId: string, updates: BulkUpdateInput) {
  await prisma.assumptionSet.findFirstOrThrow({ where: { id: setId, orgId } })

  await prisma.$transaction(
    updates.map((u) => {
      const def = DEFAULTS.get(`${u.section}__${u.field}`)
      return prisma.assumptionParam.upsert({
        where: { setId_section_field: { setId, section: u.section as Section, field: u.field } },
        // On create, carry the V3.0 metadata so a new param isn't bounds-less.
        create: {
          setId, section: u.section as Section, field: u.field, value: u.value,
          unit: def?.unit ?? '', low: def?.low ?? null, high: def?.high ?? null,
          updateFrequency: def?.updateFrequency, costBehavior: def?.costBehavior, activation: def?.activation,
        },
        update: { value: u.value },
      })
    }),
  )

  // Non-blocking: edits are saved, but we report any that left the recommended range.
  const warnings = updates
    .map((u) => rangeWarning(u.section, u.field, u.value))
    .filter((w): w is RangeWarning => w !== null)

  const params = await getParams(orgId, setId)
  return { params, warnings }
}

/** Reset params to their V3.0 recommended values (all, or only the given fields). */
export async function resetParams(orgId: string, setId: string, fields?: ResetParamsInput['fields']) {
  await prisma.assumptionSet.findFirstOrThrow({ where: { id: setId, orgId } })

  const targets: DefaultParam[] =
    fields && fields.length > 0
      ? fields
          .map((f) => DEFAULTS.get(`${f.section}__${f.field}`))
          .filter((d): d is DefaultParam => d !== undefined)
      : DEFAULT_ASSUMPTIONS

  await prisma.$transaction(
    targets.map((a) =>
      prisma.assumptionParam.upsert({
        where: { setId_section_field: { setId, section: a.section as Section, field: a.field } },
        create: {
          setId, section: a.section as Section, field: a.field, value: a.value,
          unit: a.unit, low: a.low || null, high: a.high || null,
          updateFrequency: a.updateFrequency, costBehavior: a.costBehavior, activation: a.activation,
        },
        update: { value: a.value, low: a.low || null, high: a.high || null },
      }),
    ),
  )

  return getParams(orgId, setId)
}

export async function getActiveSet(orgId: string) {
  return prisma.assumptionSet.findFirst({
    where: { orgId, isActive: true },
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

import { Section } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import type { CreateSetInput, UpdateSetInput, BulkUpdateInput } from './assumptions.schema.js'
import { DEFAULT_ASSUMPTIONS } from '../../data/default-assumptions.js'

export async function listSets(orgId: string) {
  return prisma.assumptionSet.findMany({
    where: { orgId },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    select: { id: true, name: true, version: true, isActive: true, notes: true, createdAt: true },
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

  // Group by section for convenience
  const grouped: Record<string, typeof params> = {}
  for (const p of params) {
    if (!grouped[p.section]) grouped[p.section] = []
    grouped[p.section].push(p)
  }
  return grouped
}

export async function bulkUpdateParams(orgId: string, setId: string, updates: BulkUpdateInput) {
  await prisma.assumptionSet.findFirstOrThrow({ where: { id: setId, orgId } })

  await prisma.$transaction(
    updates.map((u) =>
      prisma.assumptionParam.upsert({
        where: { setId_section_field: { setId, section: u.section as Section, field: u.field } },
        create: { setId, section: u.section as Section, field: u.field, value: u.value, unit: '' },
        update: { value: u.value },
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

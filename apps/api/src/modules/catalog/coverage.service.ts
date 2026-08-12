import { prisma } from '../../config/prisma.js'
import { PARAMETER_DEFINITIONS, type ParameterDefinition } from '../../data/parameter-catalog.js'

export type CoverageStatus = 'INHERITED' | 'SPECIFIC' | 'MISSING' | 'OUT_OF_RANGE'

type ParamValue = {
  id: string
  section: string
  field: string
  value: number
  low: number | null
  high: number | null
  updatedAt: Date
}

export function classifyCoverage(
  definition: Pick<ParameterDefinition, 'defaultValue' | 'low' | 'high'>,
  param?: Pick<ParamValue, 'value' | 'low' | 'high'>,
): CoverageStatus {
  if (!param || !Number.isFinite(param.value)) return 'MISSING'
  const low = param.low ?? definition.low
  const high = param.high ?? definition.high
  if ((low != null && param.value < low) || (high != null && param.value > high)) return 'OUT_OF_RANGE'
  const tolerance = Math.max(1, Math.abs(definition.defaultValue)) * 1e-9
  return Math.abs(param.value - definition.defaultValue) <= tolerance ? 'INHERITED' : 'SPECIFIC'
}

const emptyCounts = () => ({ inherited: 0, specific: 0, missing: 0, outOfRange: 0, total: 0 })

function addStatus(counts: ReturnType<typeof emptyCounts>, status: CoverageStatus) {
  counts.total += 1
  if (status === 'INHERITED') counts.inherited += 1
  if (status === 'SPECIFIC') counts.specific += 1
  if (status === 'MISSING') counts.missing += 1
  if (status === 'OUT_OF_RANGE') counts.outOfRange += 1
}

export async function getCostBaseCoverage(orgId: string) {
  const bases = await prisma.costBase.findMany({
    where: { orgId, status: { not: 'ARCHIVED' } },
    include: {
      versions: {
        where: { isActive: true },
        take: 1,
        orderBy: { version: 'desc' },
        include: { params: true },
      },
    },
    orderBy: [{ scope: 'asc' }, { name: 'asc' }],
  })

  const sectionOrder = [...new Set(PARAMETER_DEFINITIONS.map((definition) => definition.section))]
  const sectionTotals = Object.fromEntries(sectionOrder.map((section) => [
    section,
    PARAMETER_DEFINITIONS.filter((definition) => definition.section === section).length,
  ]))

  const coverage = bases.map((base) => {
    const version = base.versions[0] ?? null
    const byKey = new Map((version?.params ?? []).map((param) => [`${param.section}__${param.field}`, param]))
    const counts = emptyCounts()
    const sections = Object.fromEntries(sectionOrder.map((section) => [section, emptyCounts()]))

    const parameters = PARAMETER_DEFINITIONS.map((definition) => {
      const param = byKey.get(`${definition.section}__${definition.field}`)
      const status = classifyCoverage(definition, param)
      addStatus(counts, status)
      addStatus(sections[definition.section], status)
      return {
        key: definition.key,
        section: definition.section,
        label: definition.label,
        kind: definition.kind,
        unit: definition.unit,
        recommended: definition.defaultValue,
        low: param?.low ?? definition.low,
        high: param?.high ?? definition.high,
        updateFrequency: definition.updateFrequency,
        costBehavior: definition.costBehavior,
        activation: definition.activation,
        sourceSheet: definition.sourceSheet,
        value: param?.value ?? null,
        paramId: param?.id ?? null,
        updatedAt: param?.updatedAt ?? null,
        status,
      }
    })

    return {
      id: base.id,
      code: base.code,
      name: base.name,
      scope: base.scope,
      status: base.status,
      isDefault: base.isDefault,
      version: version ? { id: version.id, version: version.version, updatedAt: version.updatedAt } : null,
      counts,
      sections,
      parameters,
    }
  })

  return {
    catalogTotal: PARAMETER_DEFINITIONS.length,
    sections: sectionOrder.map((section) => ({ section, total: sectionTotals[section] })),
    bases: coverage,
  }
}

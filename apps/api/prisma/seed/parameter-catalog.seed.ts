import { PrismaClient, Section } from '@prisma/client'
import { PARAMETER_DEFINITIONS } from '../../src/data/parameter-catalog.js'

/** Persists the source-controlled catalog without changing carrier values. */
export async function syncParameterCatalog(prisma: PrismaClient) {
  const definitions = await Promise.all(PARAMETER_DEFINITIONS.map((definition) => prisma.parameterDefinition.upsert({
    where: { key: definition.key },
    create: { ...definition, section: definition.section as Section },
    update: {
      section: definition.section as Section, field: definition.field, label: definition.label,
      kind: definition.kind, defaultValue: definition.defaultValue, unit: definition.unit,
      low: definition.low, high: definition.high, updateFrequency: definition.updateFrequency,
      costBehavior: definition.costBehavior, activation: definition.activation,
      sourceSheet: definition.sourceSheet, sourceVersion: definition.sourceVersion,
      displayOrder: definition.displayOrder, isActive: true,
    },
  })))

  let paramsLinked = 0
  for (const definition of definitions) {
    const result = await prisma.assumptionParam.updateMany({
      where: { section: definition.section, field: definition.field, definitionId: null },
      data: { definitionId: definition.id },
    })
    paramsLinked += result.count
  }
  return { definitions: definitions.length, paramsLinked }
}

import { PrismaClient, Section } from '@prisma/client'
import { DEFAULT_ASSUMPTIONS } from './assumptions.seed.js'
import { EQUIPMENT_CATALOG } from './equipment.seed.js'
import { CITIES_MX } from './cities-mx.seed.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Equipment catalog
  console.log('  → Equipment catalog...')
  for (const eq of EQUIPMENT_CATALOG) {
    await prisma.equipmentConfig.upsert({
      where: {
        truckType_trailerType_config_operationType_serviceType_driverType: {
          truckType: eq.truckType,
          trailerType: eq.trailerType,
          config: eq.config,
          operationType: eq.operationType,
          serviceType: eq.serviceType,
          driverType: eq.driverType,
        },
      },
      create: eq,
      update: eq,
    })
  }
  console.log(`     ✓ ${EQUIPMENT_CATALOG.length} equipment configs`)

  // Mexican cities
  console.log('  → Mexican cities...')
  for (const city of CITIES_MX) {
    await prisma.cityMX.upsert({
      where: { production: city.production },
      create: city,
      update: city,
    })
  }
  console.log(`     ✓ ${CITIES_MX.length} cities`)

  // Default assumption set (global template — not tied to any org)
  // This creates a "SYSTEM" org that serves as the template source for cloning
  console.log('  → Default assumption set...')
  let systemOrg = await prisma.organization.findFirst({ where: { name: '__SYSTEM__' } })
  if (!systemOrg) {
    systemOrg = await prisma.organization.create({ data: { name: '__SYSTEM__', country: 'MX' } })
  }

  const existingSet = await prisma.assumptionSet.findFirst({
    where: { orgId: systemOrg.id, name: 'Default — D2D Base' },
  })

  if (!existingSet) {
    await prisma.assumptionSet.create({
      data: {
        orgId: systemOrg.id,
        name: 'Default — D2D Base',
        version: 1,
        isActive: true,
        notes: 'Valores base extraídos del Freight Cost Model Sheet v1',
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
    })
    console.log(`     ✓ ${DEFAULT_ASSUMPTIONS.length} assumption params`)
  } else {
    console.log('     ✓ Default set already exists — skipped')
  }

  console.log('\n✅ Seed complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

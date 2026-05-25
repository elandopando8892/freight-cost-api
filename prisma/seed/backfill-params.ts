/**
 * Backfill newly-added default assumption params into EXISTING sets.
 *
 * Create-missing-only: for every assumption set, inserts any DEFAULT_ASSUMPTIONS
 * (section, field) it doesn't already have, with the V3.0 neutral default value.
 * It NEVER updates an existing param, so carrier edits are preserved.
 *
 * Safe to re-run (idempotent). The engine already falls back to these defaults
 * via getParam(), so this only makes the new inputs visible/editable per set.
 *
 * Run: npx tsx prisma/seed/backfill-params.ts
 */
import { PrismaClient, Section } from '@prisma/client'
import { DEFAULT_ASSUMPTIONS } from './assumptions.seed.js'

const prisma = new PrismaClient()

async function backfill() {
  const sets = await prisma.assumptionSet.findMany({ select: { id: true, name: true } })
  console.log(`Backfilling ${DEFAULT_ASSUMPTIONS.length} default params across ${sets.length} set(s)…`)

  let totalCreated = 0
  for (const set of sets) {
    const existing = await prisma.assumptionParam.findMany({
      where: { setId: set.id },
      select: { section: true, field: true },
    })
    const have = new Set(existing.map((p) => `${p.section}__${p.field}`))
    const missing = DEFAULT_ASSUMPTIONS.filter((a) => !have.has(`${a.section}__${a.field}`))

    if (missing.length === 0) {
      console.log(`  ${set.name}: up to date`)
      continue
    }
    await prisma.assumptionParam.createMany({
      data: missing.map((a) => ({
        setId: set.id,
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
      skipDuplicates: true,
    })
    totalCreated += missing.length
    console.log(`  ${set.name}: +${missing.length} params`)
  }
  console.log(`Done — ${totalCreated} param(s) created.`)
}

backfill()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

/**
 * Seed the engine's reference lookup tables from the spreadsheet extracts.
 * Idempotent: uses createMany({ skipDuplicates }) so re-runs are safe.
 *
 * Run: npx tsx prisma/seed/reference.seed.ts
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const prisma = new PrismaClient()

const load = <T>(file: string): T[] =>
  JSON.parse(readFileSync(join(__dirname, 'data', file), 'utf8')) as T[]

async function chunked<T>(
  label: string,
  rows: T[],
  create: (batch: T[]) => Promise<{ count: number }>,
  size = 1000,
) {
  let inserted = 0
  for (let i = 0; i < rows.length; i += size) {
    const res = await create(rows.slice(i, i + size))
    inserted += res.count
  }
  console.log(`  ${label}: ${inserted}/${rows.length} inserted (rest already present)`)
}

export async function seedReferenceTables() {
  console.log('Seeding engine reference tables…')

  await chunked('mexLaneExpense', load('mex-lane-expenses.json'), (data) =>
    prisma.mexLaneExpense.createMany({ data: data as never, skipDuplicates: true }),
  )
  await chunked('usaLaneData', load('usa-lane-data.json'), (data) =>
    prisma.usaLaneData.createMany({ data: data as never, skipDuplicates: true }),
  )
  await chunked('usaLaneMktPrice', load('usa-lane-mkt-price.json'), (data) =>
    prisma.usaLaneMktPrice.createMany({ data: data as never, skipDuplicates: true }),
  )
  await chunked('usaMktCondition', load('usa-mkt-condition.json'), (data) =>
    prisma.usaMktCondition.createMany({ data: data as never, skipDuplicates: true }),
  )
  await chunked('usaFuel', load('usa-fuel.json'), (data) =>
    prisma.usaFuel.createMany({ data: data as never, skipDuplicates: true }),
  )
  await chunked('zipMarket', load('zip-markets.json'), (data) =>
    prisma.zipMarket.createMany({ data: data as never, skipDuplicates: true }),
  )

  console.log('Reference tables seeded.')
}

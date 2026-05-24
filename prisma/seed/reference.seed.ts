/**
 * Seed the engine's reference lookup tables from the Freight Cost Model V3.0 extracts.
 * Upsert-based so re-runs UPDATE existing rows to current values (idempotent).
 *
 * Run: npx tsx prisma/seed/run-reference.ts
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const prisma = new PrismaClient()

const load = <T>(file: string): T[] =>
  JSON.parse(readFileSync(join(__dirname, 'data', file), 'utf8')) as T[]

// Upsert rows in concurrent batches (keeps Neon round-trips reasonable).
async function upsertAll<T>(
  label: string,
  rows: T[],
  upsert: (row: T) => Promise<unknown>,
  batch = 50,
) {
  for (let i = 0; i < rows.length; i += batch) {
    await Promise.all(rows.slice(i, i + batch).map(upsert))
  }
  console.log(`  ${label}: ${rows.length} upserted`)
}

type MexRow = { laneKey: string; laneKeyNorm: string; km: number; tolls: number; driverExpenses: number; pension: number; sumaViaje: number; diasViaje: number; horasRuta: number }
type UsaRow = { laneKey: string; outState: string; miles: number; truckDays: number; routeExpenses: number }
type FuelRow = { state: string; region: string | null; pricePerGallon: number; fsc: number }
type CondRow = { market: string; dryVanCond: string; flatbedCond: string; reeferCond: string; region: string | null }
type MktRow = { laneKey: string; laneKeyNorm: string; rpm: number }
type ZipRow = { zipCode: string; metroZip: string; metroCity: string; market: string }
type DatRow = {
  laneKey: string; laneKeyNorm: string; miles: number; avgRpm: number; lowRpm: number; highRpm: number
  rpm: number; fsc: number; allInUsd: number; companies: number; reports: number; stdDev: number
  equipment: string; origin: string; dest: string
}

export async function seedReferenceTables() {
  console.log('Seeding engine reference tables from Freight Cost Model V3.0…')

  await upsertAll('mexLaneExpense', load<MexRow>('mex-lane-expenses.json'), (r) =>
    prisma.mexLaneExpense.upsert({ where: { laneKeyNorm: r.laneKeyNorm }, create: r, update: r }),
  )
  await upsertAll('usaLaneData', load<UsaRow>('usa-lane-data.json'), (r) =>
    prisma.usaLaneData.upsert({ where: { laneKey: r.laneKey }, create: r, update: r }),
  )
  await upsertAll('usaLaneMktPrice', load<MktRow>('usa-lane-mkt-price.json'), (r) =>
    prisma.usaLaneMktPrice.upsert({ where: { laneKeyNorm: r.laneKeyNorm }, create: r, update: r }),
  )
  await upsertAll('usaMktCondition', load<CondRow>('usa-mkt-condition.json'), (r) =>
    prisma.usaMktCondition.upsert({ where: { market: r.market }, create: r, update: r }),
  )
  await upsertAll('usaFuel', load<FuelRow>('usa-fuel.json'), (r) =>
    prisma.usaFuel.upsert({ where: { state: r.state }, create: r, update: r }),
  )
  await upsertAll('zipMarket', load<ZipRow>('zip-markets.json'), (r) =>
    prisma.zipMarket.upsert({ where: { zipCode: r.zipCode }, create: r, update: r }),
  )
  await upsertAll('usaDatBenchmark', load<DatRow>('usa-dat-benchmark.json'), (r) =>
    prisma.usaDatBenchmark.upsert({ where: { laneKeyNorm: r.laneKeyNorm }, create: r, update: r }),
  )

  console.log('Reference tables seeded (V3.0).')
}

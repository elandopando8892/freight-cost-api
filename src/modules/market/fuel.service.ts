/**
 * Fuel surcharge pipeline — Freight Cost Model V3.0 (usaFuelcurrent + usaFSCindex).
 *
 *   region diesel ($/gal, RegionDiesel)  →  FSC schedule (FscIndex)  →  state FSC
 *
 * UsaFuel is a derived cache. When region diesel changes, refreshFuelSurcharge()
 * recomputes every state's diesel + FSC so quotes reflect current fuel.
 */
import { prisma } from '../../config/prisma.js'
import { round4 } from '../../utils/currency.js'

/** Truckload FSC ($/mile) for a diesel price via the V3.0 step schedule. */
export async function fscForDiesel(dieselUsdGal: number): Promise<number> {
  const bracket = await prisma.fscIndex.findFirst({
    where: { fromDiesel: { lte: dieselUsdGal } },
    orderBy: { fromDiesel: 'desc' },
  })
  return bracket?.truckloadFscPerMile ?? 0
}

/** Recompute UsaFuel (state diesel + FSC) from current RegionDiesel + FscIndex. */
export async function refreshFuelSurcharge(): Promise<{ updated: number; sample: unknown }> {
  const [regions, brackets, states] = await Promise.all([
    prisma.regionDiesel.findMany(),
    prisma.fscIndex.findMany({ orderBy: { fromDiesel: 'asc' } }),
    prisma.usaFuel.findMany(),
  ])
  const dieselByRegion = new Map(regions.map((r) => [r.region, r.dieselUsdGal]))
  const fscFor = (d: number) => {
    let fsc = 0
    for (const b of brackets) { if (d >= b.fromDiesel) fsc = b.truckloadFscPerMile; else break }
    return fsc
  }

  let updated = 0
  for (const s of states) {
    const diesel = s.region ? dieselByRegion.get(s.region) ?? s.pricePerGallon : s.pricePerGallon
    const fsc = round4(fscFor(diesel))
    if (diesel !== s.pricePerGallon || fsc !== s.fsc) {
      await prisma.usaFuel.update({ where: { id: s.id }, data: { pricePerGallon: diesel, fsc } })
      updated++
    }
  }
  const sample = await prisma.usaFuel.findUnique({ where: { state: 'TX' } })
  return { updated, sample }
}

export async function getFuelStatus() {
  const [regions, brackets, tx] = await Promise.all([
    prisma.regionDiesel.findMany({ orderBy: { region: 'asc' } }),
    prisma.fscIndex.count(),
    prisma.usaFuel.findUnique({ where: { state: 'TX' } }),
  ])
  return { regions, fscBrackets: brackets, sampleState: tx }
}

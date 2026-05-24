/**
 * Fuel surcharge pipeline — Freight Cost Model V3.0 (usaFuelcurrent + usaFSCindex).
 *
 *   region diesel ($/gal, RegionDiesel)  →  FSC schedule (FscIndex)  →  state FSC
 *
 * UsaFuel is a derived cache. When region diesel changes, refreshFuelSurcharge()
 * recomputes every state's diesel + FSC so quotes reflect current fuel.
 */
import { Section } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { round4 } from '../../utils/currency.js'

const GAL_TO_L = 3.785411784

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

/** Current US border diesel in USD/L (from the EIA "U.S." region $/gal). */
export async function currentUsBorderDieselUsdL(): Promise<number | null> {
  const us = await prisma.regionDiesel.findUnique({ where: { region: 'U.S.' } })
  return us ? round4(us.dieselUsdGal / GAL_TO_L) : null
}

/**
 * Sync the org's active assumption set "Diesel US Border" (USD/L) to current
 * market, so the MX leg's blended diesel tracks the same EIA fuel as the USA leg.
 */
export async function syncSetDieselUsBorder(
  orgId: string,
): Promise<{ setId: string; dieselUsBorderUsdL: number } | null> {
  const usdL = await currentUsBorderDieselUsdL()
  if (usdL == null) return null
  const set = await prisma.assumptionSet.findFirst({ where: { orgId, isActive: true } })
  if (!set) return null
  await prisma.assumptionParam.upsert({
    where: { setId_section_field: { setId: set.id, section: Section.FUEL, field: 'Diesel US Border' } },
    create: { setId: set.id, section: Section.FUEL, field: 'Diesel US Border', value: usdL, unit: 'USD/L' },
    update: { value: usdL },
  })
  return { setId: set.id, dieselUsBorderUsdL: usdL }
}

export async function getFuelStatus() {
  const [regions, brackets, tx, usBorderUsdL] = await Promise.all([
    prisma.regionDiesel.findMany({ orderBy: { region: 'asc' } }),
    prisma.fscIndex.count(),
    prisma.usaFuel.findUnique({ where: { state: 'TX' } }),
    currentUsBorderDieselUsdL(),
  ])
  return { regions, fscBrackets: brackets, sampleState: tx, usBorderDieselUsdL: usBorderUsdL }
}

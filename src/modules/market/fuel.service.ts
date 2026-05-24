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

const EIA_REGIONS = [
  'U.S.', 'East Coast', 'New England', 'Central Atlantic', 'Lower Atlantic', 'Midwest',
  'Gulf Coast', 'Rocky Mountain', 'West Coast', 'West Coast less California', 'California',
]
const EIA_DIESEL_RSS = 'https://www.eia.gov/petroleum/gasdiesel/includes/gas_diesel_rss.xml'

/**
 * Parse the EIA diesel RSS "On-Highway Diesel Fuel Retail Price" section into
 * region → $/gal. Mirrors the spreadsheet's fetchFuelData() Apps Script:
 * for each region, take the max numeric price across matching lines (handles
 * the "West Coast" / "West Coast less California" / "California" substring overlap).
 */
export function parseDieselRss(xml: string): Record<string, number> {
  const idx = xml.indexOf('On-Highway Diesel Fuel Retail Price')
  const section = idx >= 0 ? xml.slice(idx) : xml
  const lines = section.split(/<br\s*\/?>/i)
  const prices: Record<string, number> = {}
  for (const line of lines.map((l) => l.trim())) {
    for (const region of EIA_REGIONS) {
      if (line.includes(region)) {
        const price = parseFloat(line.replace(region, '').replace(/[^0-9.]/g, ''))
        if (!isNaN(price)) prices[region] = Math.max(prices[region] ?? -Infinity, price)
      }
    }
  }
  return prices
}

/** Fetch live EIA diesel-by-region and upsert RegionDiesel (no API key needed). */
export async function fetchEiaCurrentDiesel(): Promise<{ updated: number; regions: { region: string; dieselUsdGal: number }[] }> {
  const res = await fetch(EIA_DIESEL_RSS)
  if (!res.ok) throw new Error(`EIA RSS fetch failed: ${res.status}`)
  const prices = parseDieselRss(await res.text())
  const regions = Object.entries(prices).map(([region, dieselUsdGal]) => ({ region, dieselUsdGal: round4(dieselUsdGal) }))
  if (regions.length === 0) throw new Error('EIA RSS: no diesel prices parsed')
  for (const r of regions) {
    await prisma.regionDiesel.upsert({
      where: { region: r.region },
      create: { region: r.region, dieselUsdGal: r.dieselUsdGal },
      update: { dieselUsdGal: r.dieselUsdGal },
    })
  }
  return { updated: regions.length, regions }
}

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

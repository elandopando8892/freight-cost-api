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
import { env } from '../../config/env.js'
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
 * Legacy compatibility only: sync the org's editable common DRAFT set.
 * Governed cost-base versions are immutable once published and market refreshes
 * must never choose one arbitrary active modality or rewrite its evidence.
 */
export function writableFuelAssumptionSetWhere(orgId: string) {
  return { orgId, isActive: true, costBaseId: null, status: 'DRAFT' as const }
}

export async function syncSetDieselUsBorder(
  orgId: string,
): Promise<{ setId: string; dieselUsBorderUsdL: number } | null> {
  const usdL = await currentUsBorderDieselUsdL()
  if (usdL == null) return null
  const set = await prisma.assumptionSet.findFirst({ where: writableFuelAssumptionSetWhere(orgId) })
  if (!set) return null
  await prisma.assumptionParam.upsert({
    where: { setId_section_field: { setId: set.id, section: Section.FUEL, field: 'Diesel US Border' } },
    create: { setId: set.id, section: Section.FUEL, field: 'Diesel US Border', value: usdL, unit: 'USD/L' },
    update: { value: usdL },
  })
  return { setId: set.id, dieselUsBorderUsdL: usdL }
}

// ── EIA historical diesel (API v2, EPD2D monthly) → DieselHistory ──────────
interface EiaRow { period: string; duoarea: string; 'area-name': string; value: number | string | null; units: string }

/** Pull monthly diesel history from EIA API v2 and upsert DieselHistory. Needs EIA_API_KEY. */
export async function fetchEiaHistory(start = '2020-01'): Promise<{ upserted: number; from: string; to: string }> {
  const key = env.EIA_API_KEY
  if (!key) throw new Error('EIA_API_KEY not configured (set it in env / Vercel)')
  const url =
    `https://api.eia.gov/v2/petroleum/pri/gnd/data/?frequency=monthly&data[0]=value` +
    `&facets[product][]=EPD2D&start=${start}` +
    `&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5000&api_key=${key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`EIA API v2 failed: ${res.status}`)
  const json = (await res.json()) as { response?: { data?: EiaRow[] } }
  const rows = (json.response?.data ?? []).filter((r) => r.value != null && r.value !== '')
  if (rows.length === 0) throw new Error('EIA API v2: no rows returned')

  let upserted = 0
  const size = 50
  const mapped = rows.map((r) => ({
    period: String(r.period),
    duoarea: String(r.duoarea),
    areaName: String(r['area-name']),
    value: Number(r.value),
    units: String(r.units || '$/GAL'),
  }))
  for (let i = 0; i < mapped.length; i += size) {
    await Promise.all(
      mapped.slice(i, i + size).map((m) =>
        prisma.dieselHistory.upsert({
          where: { duoarea_period: { duoarea: m.duoarea, period: m.period } },
          create: m,
          update: { value: m.value, areaName: m.areaName, units: m.units },
        }),
      ),
    )
    upserted += Math.min(size, mapped.length - i)
  }
  const periods = mapped.map((m) => m.period).sort()
  return { upserted, from: periods[0], to: periods[periods.length - 1] }
}

/** Diesel + derived FSC trend for an area (default U.S.), most-recent first. */
export async function getDieselTrend(areaName = 'U.S.', months = 24) {
  const rows = await prisma.dieselHistory.findMany({
    where: { areaName },
    orderBy: { period: 'desc' },
    take: months,
  })
  const brackets = await prisma.fscIndex.findMany({ orderBy: { fromDiesel: 'asc' } })
  const fscFor = (d: number) => {
    let fsc = 0
    for (const b of brackets) { if (d >= b.fromDiesel) fsc = b.truckloadFscPerMile; else break }
    return fsc
  }
  return rows.map((r) => ({ period: r.period, areaName: r.areaName, diesel: r.value, fsc: round4(fscFor(r.value)) }))
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

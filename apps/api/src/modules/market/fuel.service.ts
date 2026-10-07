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
 * region → $/gal. Match complete region names: a substring match or maximum
 * across different regions is not a valid geographical price observation.
 * Missing diesel is not permission to substitute the gasoline section.
 */
export function parseDieselRss(xml: string): Record<string, number> {
  const idx = xml.indexOf('On-Highway Diesel Fuel Retail Price')
  if (idx < 0) return {}
  // End at the containing RSS description; never read a later item's prices.
  const section = xml.slice(idx).split(/\]\]>|<\/description>/i)[0]
  const lines = section.split(/<br\s*\/?>/i)
  const prices: Record<string, number> = {}
  for (const line of lines.map((l) => l.trim())) {
    const match = /^(\d+(?:\.\d+)?)\s+\.{2,}\s+(.+?)\s*$/.exec(line)
    if (!match || !EIA_REGIONS.includes(match[2])) continue
    const price = Number(match[1]), region = match[2]
    if (!Number.isFinite(price) || price <= 0) continue
    if (prices[region] !== undefined && prices[region] !== price)
      throw new Error(`EIA_RSS_CONFLICTING_REGION:${region}`)
    prices[region] = price
  }
  return prices
}

/** Strict reader for EIA's current single-item RSS contract, not a general XML
 * parser. Keep dates and prices in the SAME item. Never equate publication,
 * observation and cache update dates, or manufacture validity from any of them.
 */
export function parseDieselRssObservation(xml: string) {
  const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)]
  if (items.length !== 1) throw new Error('EIA_RSS_SINGLE_OBSERVATION_REQUIRED')
  const item = items[0][1]
  const titles = [...item.matchAll(/<title>([\s\S]*?)<\/title>/gi)]
  const date = titles.length === 1
    ? /^Data For (\d{2})\/(\d{2})\/(\d{4}|\d{2})$/.exec(titles[0][1].trim()) : null
  if (!date) throw new Error('EIA_RSS_OBSERVATION_DATE_REQUIRED')
  const year = date[3].length === 2 ? `20${date[3]}` : date[3]
  const observationDate = `${year}-${date[1]}-${date[2]}`
  const parsed = new Date(`${observationDate}T00:00:00Z`)
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== observationDate)
    throw new Error('EIA_RSS_OBSERVATION_DATE_REQUIRED')
  const descriptions = [...item.matchAll(/<description>([\s\S]*?)<\/description>/gi)]
  if (descriptions.length !== 1 || !descriptions[0][1].includes('On-Highway Diesel Fuel Retail Price'))
    throw new Error('EIA_RSS_DIESEL_SECTION_REQUIRED')
  if (!/On-Highway Diesel Fuel Retail Price\s*<br\s*\/?\s*>\s*\(Dollars\s+per\s+Gallon\)/i.test(descriptions[0][1]))
    throw new Error('EIA_RSS_DIESEL_UNIT_REQUIRED')
  const publications = [...item.matchAll(/<pubDate>([\s\S]*?)<\/pubDate>/gi)]
  if (publications.length > 1) throw new Error('EIA_RSS_AMBIGUOUS_PUBLICATION_DATE')
  return { observationDate, publicationDate: publications[0]?.[1].trim() || null,
    sourceUrl: EIA_DIESEL_RSS, unit: 'USD/US_GALLON' as const,
    prices: parseDieselRss(descriptions[0][1]) }
}

/** Fetch live EIA diesel-by-region and upsert RegionDiesel (no API key needed). */
export async function fetchEiaCurrentDiesel(): Promise<{ updated: number; regions: { region: string; dieselUsdGal: number }[];
  observation: Omit<ReturnType<typeof parseDieselRssObservation>, 'prices'>; observationDatePersisted: false }> {
  const res = await fetch(EIA_DIESEL_RSS)
  if (!res.ok) throw new Error(`EIA RSS fetch failed: ${res.status}`)
  const { prices, ...observation } = parseDieselRssObservation(await res.text())
  if (observation.observationDate > new Date().toISOString().slice(0, 10))
    throw new Error('EIA_RSS_FUTURE_OBSERVATION')
  // Validate the full published cohort before the first write. An upstream
  // format change must not silently combine new and stale regional values.
  if (EIA_REGIONS.some(region => prices[region] === undefined))
    throw new Error('EIA_RSS_INCOMPLETE_DIESEL_REGIONS')
  const regions = Object.entries(prices).map(([region, dieselUsdGal]) => ({ region, dieselUsdGal: round4(dieselUsdGal) }))
  if (regions.length === 0) throw new Error('EIA RSS: no diesel prices parsed')
  for (const r of regions) {
    await prisma.regionDiesel.upsert({
      where: { region: r.region },
      create: { region: r.region, dieselUsdGal: r.dieselUsdGal },
      update: { dieselUsdGal: r.dieselUsdGal },
    })
  }
  // RegionDiesel has no observation-date column. Expose the limitation rather
  // than labelling updatedAt as a source date or silently changing the schema.
  return { updated: regions.length, regions, observation, observationDatePersisted: false }
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

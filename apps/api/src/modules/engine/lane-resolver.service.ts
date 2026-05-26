/**
 * Lane resolver (Freight Cost Model V3.0) — maps a route by name to the
 * engine's MexLegInput / UsaLegInput via the reference tables:
 *
 *   MEX leg key  : "{Origin} - {Border} {TruckType}"        → mexLaneExpense.km
 *   USA leg key  : "{US Border} - {Dest} {TruckType}"(upper) → usaLaneData (miles/state)
 *   FSC/diesel   : usaFuel by out-state
 *   conditions   : usaMktCondition by origin/dest market (cusCatalog) and trailer
 *
 *   D2D Export:  MEX = origin→mexBorder ;  USA = usBorder→dest
 *   D2D Import:  USA = origin→usBorder  ;  MEX = mexBorder→dest
 *   Drayage   :  USA = origin→dest
 *   MX-only   :  MEX = origin→dest
 */
import { prisma } from '../../config/prisma.js'
import type { EquipmentSpec, MexLegInput, UsaLegInput, MarketCondition } from './engine.types.js'

export interface ResolveInput {
  outboundLocation: string
  inboundLocation: string
  mexBorder: string
  usBorder: string
  equipment: EquipmentSpec
  operation: string
  service: string
  route?: string
}

export interface ResolvedRoute {
  mexLeg?: MexLegInput
  usaLeg?: UsaLegInput
  warnings: string[]
}

interface UsMetro { metroCity: string; market: string }

/** Extract a 3-digit ZIP prefix from a free-text US location (e.g. "Augusta, GA 30901" → "309"), or null. */
export function usZipPrefix(input: string): string | null {
  const digits = (input ?? '').match(/\d{3,}/)?.[0]
  return digits ? digits.slice(0, 3) : null
}

/**
 * Resolve a US shipper/consignee location to its metro market (cusCatalog/ZipMarket).
 * Accepts a metro city directly, OR a ZIP (5- or 3-digit) → 3-digit prefix → metro.
 * The V3.0 catalog is keyed by ZIP prefix, not arbitrary city names — so e.g.
 * "Augusta, GA" only resolves via its ZIP (309xx → Greenville, SC metro).
 */
async function resolveUsMetro(input: string, warnings: string[]): Promise<UsMetro | null> {
  const raw = (input ?? '').trim()
  if (!raw) return null
  // 1) already a metro city (case-insensitive)
  const byCity = await prisma.zipMarket.findFirst({ where: { metroCity: { equals: raw, mode: 'insensitive' } } })
  if (byCity) return { metroCity: byCity.metroCity, market: byCity.market }
  // 2) ZIP → 3-digit prefix → metro
  const prefix = usZipPrefix(raw)
  if (prefix) {
    const byZip = await prisma.zipMarket.findFirst({ where: { zipCode: prefix } })
    if (byZip) {
      warnings.push(`Resolved "${raw}" → ${byZip.metroCity} via ZIP ${prefix} (${byZip.market})`)
      return { metroCity: byZip.metroCity, market: byZip.market }
    }
  }
  return null
}

function conditionByTrailer(
  cond: { dryVanCond: string; flatbedCond: string; reeferCond: string },
  trailer: string,
): MarketCondition {
  if (trailer === 'Flatbed') return cond.flatbedCond as MarketCondition
  if (trailer === 'Reefer') return cond.reeferCond as MarketCondition
  return cond.dryVanCond as MarketCondition
}

async function conditionFromMarket(
  market: string | null, label: string, trailer: string, warnings: string[],
): Promise<MarketCondition> {
  // Missing market/condition → 'Neutral' (0 reposition), matching the V3.0 sheet's
  // blank-condition behavior (INDEX/MATCH miss → 0 deadhead, flagged).
  if (!market) { warnings.push(`No market for "${label}" (condition→Neutral, 0 reposition)`); return 'Neutral' }
  const cond = await prisma.usaMktCondition.findUnique({ where: { market } })
  if (!cond) { warnings.push(`No condition for "${market}" (→Neutral, 0 reposition)`); return 'Neutral' }
  return conditionByTrailer(cond, trailer)
}

async function resolveMexLeg(
  origin: string, dest: string, eq: EquipmentSpec, operation: string, service: string, route: string, warnings: string[],
): Promise<MexLegInput | undefined> {
  const key = `${origin} - ${dest} ${eq.truckType}`
  const row = await prisma.mexLaneExpense.findFirst({ where: { laneKeyNorm: key.toUpperCase() } })
  if (!row) { warnings.push(`MEX lane not found: "${key}"`); return undefined }
  return {
    baseKm: row.km,
    routeExpensesMxn: 0,   // V3.0 mexLaneProd uses km only (route-expense refs are #REF→0)
    baseHours: 0,
    operation, service, route, equipment: eq,
    origin, dest,          // full MX names (engine homologates for the ReferenceKey)
  }
}

async function resolveUsaLeg(
  originIn: string, destIn: string, eq: EquipmentSpec, operation: string, service: string, warnings: string[],
): Promise<UsaLegInput | undefined> {
  // Resolve shipper/consignee (ZIP or metro) → metro city used by the reference lanes.
  const o = await resolveUsMetro(originIn, warnings)
  const d = await resolveUsMetro(destIn, warnings)
  if (!o) warnings.push(`Could not resolve US origin "${originIn}" to a metro (use a ZIP or metro city)`)
  if (!d) warnings.push(`Could not resolve US dest "${destIn}" to a metro (use a ZIP or metro city)`)
  const origin = o?.metroCity ?? originIn.trim()
  const dest = d?.metroCity ?? destIn.trim()

  const key = `${origin} - ${dest} ${eq.truckType}`.toUpperCase()
  const row = await prisma.usaLaneData.findFirst({ where: { laneKey: key } })
  if (!row) { warnings.push(`USA lane not found: "${key}"`); return undefined }
  const fuel = await prisma.usaFuel.findUnique({ where: { state: row.outState } })
  if (!fuel) warnings.push(`No fuel/FSC for state "${row.outState}" (→0)`)
  const originCondition = await conditionFromMarket(o?.market ?? null, origin, eq.trailer, warnings)
  const destCondition = await conditionFromMarket(d?.market ?? null, dest, eq.trailer, warnings)
  // DAT market benchmark: "{Origin} - {Dest} {TruckType} {Trailer}"
  const datKey = `${origin} - ${dest} ${eq.truckType} ${eq.trailer}`.toUpperCase()
  const dat = await prisma.usaDatBenchmark.findFirst({ where: { laneKeyNorm: datKey } })
  if (!dat) warnings.push(`No DAT benchmark for "${datKey}" (market reference uses cost proxy)`)
  return {
    loadedMiles: row.miles,
    transitDaysRaw: row.truckDays,
    driverExpenses: row.routeExpenses,
    outState: row.outState,
    dieselUsdGal: fuel?.pricePerGallon ?? 0,
    fscUsdMile: fuel?.fsc ?? 0,
    originCondition, destCondition,
    marketRpm: dat?.rpm ?? 0,
    operation, service, equipment: eq,
    origin, dest,          // resolved metro names for the ReferenceKey
  }
}

export async function resolveRoute(input: ResolveInput): Promise<ResolvedRoute> {
  const { outboundLocation, inboundLocation, mexBorder, usBorder, equipment, operation, service } = input
  const route = input.route ?? 'Straight & Danger'
  const warnings: string[] = []

  switch (operation) {
    case 'D2D Export': {
      const mexLeg = await resolveMexLeg(outboundLocation, mexBorder, equipment, operation, service, route, warnings)
      const usaLeg = await resolveUsaLeg(usBorder, inboundLocation, equipment, operation, service, warnings)
      return { mexLeg, usaLeg, warnings }
    }
    case 'D2D Import': {
      const usaLeg = await resolveUsaLeg(outboundLocation, usBorder, equipment, operation, service, warnings)
      const mexLeg = await resolveMexLeg(mexBorder, inboundLocation, equipment, operation, service, route, warnings)
      return { mexLeg, usaLeg, warnings }
    }
    case 'Drayage': {
      const usaLeg = await resolveUsaLeg(outboundLocation, inboundLocation, equipment, operation, service, warnings)
      return { usaLeg, warnings }
    }
    default: {
      const mexLeg = await resolveMexLeg(outboundLocation, inboundLocation, equipment, operation, service, route, warnings)
      return { mexLeg, warnings }
    }
  }
}

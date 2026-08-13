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
  orgId: string
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

export type RequiredPricingLeg = 'MEX' | 'USA'

/** Canonical lookup form for user-entered lane names and seeded reference keys. */
export function normalizeLaneLookup(value: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

/** Return every pricing leg that an operation requires but the resolver did not find. */
export function missingRequiredPricingLegs(
  operation: string,
  resolved: { mexLeg?: unknown; usaLeg?: unknown },
): RequiredPricingLeg[] {
  const missing: RequiredPricingLeg[] = []
  if (operation === 'D2D Export' || operation === 'D2D Import') {
    if (!resolved.mexLeg) missing.push('MEX')
    if (!resolved.usaLeg) missing.push('USA')
    return missing
  }
  if (operation === 'Drayage' || operation === 'Intra-US' || operation === 'US Northbound' || operation === 'US Southbound') {
    if (!resolved.usaLeg) missing.push('USA')
    return missing
  }
  if (!resolved.mexLeg) missing.push('MEX')
  return missing
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

/** Map an abbreviated homologation ("Manzanillo, CL") to the full production
 *  name ("Manzanillo, Colima") that mexLaneExpense is keyed by; passthrough if
 *  it's already a production name (or unknown). */
async function mxToProduction(loc: string): Promise<string> {
  const raw = (loc ?? '').trim()
  if (!raw) return raw
  const hit = await prisma.cityMX.findFirst({
    where: { homologation: { equals: raw, mode: 'insensitive' } },
    select: { production: true },
  })
  return hit?.production ?? raw
}

async function resolveMexLeg(
  orgId: string, origin: string, dest: string, eq: EquipmentSpec, operation: string, service: string, route: string, warnings: string[],
): Promise<MexLegInput | undefined> {
  // 1) Carrier's OWN production matrix (truck-agnostic), raw or homologation-normalized.
  const carrier = await findCarrierMexLane(orgId, origin, dest)
  if (carrier) {
    warnings.push(`MEX lane from your production matrix: "${carrier.origin} - ${carrier.destination}" (${carrier.km} km)`)
    return {
      baseKm: carrier.km,
      routeExpensesMxn: 0, baseHours: 0,
      operation, service, route, equipment: eq,
      origin: carrier.origin, dest: carrier.destination,
    }
  }

  // 2) Global reference table (truck-specific), with homologation → production retry.
  let o = origin, d = dest
  let key = `${o} - ${d} ${eq.truckType}`
  let row = await prisma.mexLaneExpense.findFirst({ where: { laneKeyNorm: normalizeLaneLookup(key) } })
  if (!row) {
    const [o2, d2] = await Promise.all([mxToProduction(origin), mxToProduction(dest)])
    if (o2 !== o || d2 !== d) {
      o = o2; d = d2
      key = `${o} - ${d} ${eq.truckType}`
      row = await prisma.mexLaneExpense.findFirst({ where: { laneKeyNorm: normalizeLaneLookup(key) } })
    }
  }
  if (!row) { warnings.push(`MEX lane not found: "${key}" (add it to your production matrix to quote it)`); return undefined }
  return {
    baseKm: row.km,
    routeExpensesMxn: 0,   // V3.0 mexLaneProd uses km only (route-expense refs are #REF→0)
    baseHours: 0,
    operation, service, route, equipment: eq,
    origin: o, dest: d,    // full MX names (engine homologates for the ReferenceKey)
  }
}

/** Look up an org's custom MEX lane by origin→dest, trying raw + homologation-normalized keys. */
async function findCarrierMexLane(orgId: string, origin: string, dest: string) {
  const rawInput = `${origin} - ${dest}`.trim().toUpperCase()
  const raw = normalizeLaneLookup(rawInput)
  let hit = await prisma.carrierMexLane.findUnique({ where: { orgId_laneKeyNorm: { orgId, laneKeyNorm: raw } } })
  if (!hit && rawInput !== raw) hit = await prisma.carrierMexLane.findUnique({ where: { orgId_laneKeyNorm: { orgId, laneKeyNorm: rawInput } } })
  if (hit) return hit
  const [o2, d2] = await Promise.all([mxToProduction(origin), mxToProduction(dest)])
  const norm = normalizeLaneLookup(`${o2} - ${d2}`)
  if (norm !== raw) hit = await prisma.carrierMexLane.findUnique({ where: { orgId_laneKeyNorm: { orgId, laneKeyNorm: norm } } })
  return hit
}

async function resolveUsaLeg(
  orgId: string, originIn: string, destIn: string, eq: EquipmentSpec, operation: string, service: string, warnings: string[],
): Promise<UsaLegInput | undefined> {
  // 1) Carrier's OWN production matrix first (by the raw origin→dest they entered).
  const carrierKey = normalizeLaneLookup(`${originIn} - ${destIn}`)
  const carrier = await prisma.carrierUsaLane.findUnique({ where: { orgId_laneKeyNorm: { orgId, laneKeyNorm: carrierKey } } })
  if (carrier) {
    warnings.push(`USA lane from your production matrix: "${carrier.origin} - ${carrier.destination}" (${carrier.miles} mi)`)
    const fuel = await prisma.usaFuel.findUnique({ where: { state: carrier.outState } })
    if (!fuel) warnings.push(`No fuel/FSC for state "${carrier.outState}" (→0)`)
    return {
      loadedMiles: carrier.miles,
      transitDaysRaw: carrier.truckDays,
      driverExpenses: carrier.routeExpenses,
      outState: carrier.outState,
      dieselUsdGal: fuel?.pricePerGallon ?? 0,
      fscUsdMile: fuel?.fsc ?? 0,
      originCondition: 'Balanced', destCondition: 'Balanced',
      marketRpm: 0,
      operation, service, equipment: eq,
      origin: carrier.origin, dest: carrier.destination,
    }
  }

  // 2) Global reference: resolve shipper/consignee (ZIP or metro) → metro city.
  const o = await resolveUsMetro(originIn, warnings)
  const d = await resolveUsMetro(destIn, warnings)
  if (!o) warnings.push(`Could not resolve US origin "${originIn}" to a metro (use a ZIP or metro city)`)
  if (!d) warnings.push(`Could not resolve US dest "${destIn}" to a metro (use a ZIP or metro city)`)
  const origin = o?.metroCity ?? originIn.trim()
  const dest = d?.metroCity ?? destIn.trim()

  const key = normalizeLaneLookup(`${origin} - ${dest} ${eq.truckType}`)
  const row = await prisma.usaLaneData.findFirst({ where: { laneKey: key } })
  if (!row) { warnings.push(`USA lane not found: "${key}"`); return undefined }
  const fuel = await prisma.usaFuel.findUnique({ where: { state: row.outState } })
  if (!fuel) warnings.push(`No fuel/FSC for state "${row.outState}" (→0)`)
  const originCondition = await conditionFromMarket(o?.market ?? null, origin, eq.trailer, warnings)
  const destCondition = await conditionFromMarket(d?.market ?? null, dest, eq.trailer, warnings)
  // DAT market benchmark: "{Origin} - {Dest} {TruckType} {Trailer}"
  const datKey = normalizeLaneLookup(`${origin} - ${dest} ${eq.truckType} ${eq.trailer}`)
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
  const { orgId, outboundLocation, inboundLocation, mexBorder, usBorder, equipment, operation, service } = input
  const route = input.route ?? 'Straight & Danger'
  const warnings: string[] = []

  switch (operation) {
    case 'D2D Export': {
      const mexLeg = await resolveMexLeg(orgId, outboundLocation, mexBorder, equipment, operation, service, route, warnings)
      const usaLeg = await resolveUsaLeg(orgId, usBorder, inboundLocation, equipment, operation, service, warnings)
      return { mexLeg, usaLeg, warnings }
    }
    case 'D2D Import': {
      const usaLeg = await resolveUsaLeg(orgId, outboundLocation, usBorder, equipment, operation, service, warnings)
      const mexLeg = await resolveMexLeg(orgId, mexBorder, inboundLocation, equipment, operation, service, route, warnings)
      return { mexLeg, usaLeg, warnings }
    }
    case 'Drayage':
    case 'Intra-US':
    case 'US Northbound':
    case 'US Southbound': {
      const usaLeg = await resolveUsaLeg(orgId, outboundLocation, inboundLocation, equipment, operation, service, warnings)
      return { usaLeg, warnings }
    }
    default: {
      const mexLeg = await resolveMexLeg(orgId, outboundLocation, inboundLocation, equipment, operation, service, route, warnings)
      return { mexLeg, warnings }
    }
  }
}

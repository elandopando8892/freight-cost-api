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

async function marketOf(location: string): Promise<string | null> {
  const z = await prisma.zipMarket.findFirst({ where: { metroCity: location } })
  return z?.market ?? null
}

function conditionByTrailer(
  cond: { dryVanCond: string; flatbedCond: string; reeferCond: string },
  trailer: string,
): MarketCondition {
  if (trailer === 'Flatbed') return cond.flatbedCond as MarketCondition
  if (trailer === 'Reefer') return cond.reeferCond as MarketCondition
  return cond.dryVanCond as MarketCondition
}

async function conditionOf(location: string, trailer: string, warnings: string[]): Promise<MarketCondition> {
  const market = await marketOf(location)
  if (!market) { warnings.push(`No market for "${location}" (condition→Balanced)`); return 'Balanced' }
  const cond = await prisma.usaMktCondition.findUnique({ where: { market } })
  if (!cond) { warnings.push(`No condition for "${market}" (→Balanced)`); return 'Balanced' }
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
  }
}

async function resolveUsaLeg(
  origin: string, dest: string, eq: EquipmentSpec, operation: string, service: string, warnings: string[],
): Promise<UsaLegInput | undefined> {
  const key = `${origin} - ${dest} ${eq.truckType}`.toUpperCase()
  const row = await prisma.usaLaneData.findFirst({ where: { laneKey: key } })
  if (!row) { warnings.push(`USA lane not found: "${key}"`); return undefined }
  const fuel = await prisma.usaFuel.findUnique({ where: { state: row.outState } })
  if (!fuel) warnings.push(`No fuel/FSC for state "${row.outState}" (→0)`)
  const originCondition = await conditionOf(origin, eq.trailer, warnings)
  const destCondition = await conditionOf(dest, eq.trailer, warnings)
  return {
    loadedMiles: row.miles,
    transitDaysRaw: row.truckDays,
    driverExpenses: row.routeExpenses,
    outState: row.outState,
    dieselUsdGal: fuel?.pricePerGallon ?? 0,
    fscUsdMile: fuel?.fsc ?? 0,
    originCondition, destCondition,
    operation, service, equipment: eq,
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

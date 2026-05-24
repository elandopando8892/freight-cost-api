/**
 * Lane resolver — turns human route inputs (origin/destination/border/equipment)
 * into the engine's MexLaneData / UsaLaneData by looking up the reference tables,
 * exactly the way the spreadsheet's VLOOKUPs do.
 *
 *   D2D Export:  MEX leg = outbound → mexBorder ;  USA leg = usBorder → inbound
 *   D2D Import:  USA leg = outbound → usBorder  ;  MEX leg = mexBorder → inbound
 *   Drayage   :  USA leg = outbound → inbound
 *   MX-only   :  MEX leg = outbound → inbound
 */
import { prisma } from '../../config/prisma.js'
import type { EquipmentSpec, MexLaneData, UsaLaneData, MarketCondition } from './engine.types.js'

export interface ResolveInput {
  outboundLocation: string
  inboundLocation: string
  mexBorder: string
  usBorder: string
  equipment: EquipmentSpec
  operationType: string
  serviceType: string
}

export interface ResolvedRoute {
  mexLane?: MexLaneData
  usaLane?: UsaLaneData
  warnings: string[]
}

const stateOf = (loc: string): string => loc.trim().slice(-2).toUpperCase()

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
  return cond.dryVanCond as MarketCondition // Dry Van and all others
}

async function fscOf(state: string): Promise<number> {
  const f = await prisma.usaFuel.findUnique({ where: { state } })
  return f?.fsc ?? 0
}

async function resolveMexLeg(
  origin: string, dest: string, truckType: string, warnings: string[],
): Promise<MexLaneData | undefined> {
  const key = `${origin} - ${dest} ${truckType}`
  const row = await prisma.mexLaneExpense.findFirst({ where: { laneKeyNorm: key.toUpperCase() } })
  if (!row) {
    warnings.push(`MEX lane not found: "${key}"`)
    return undefined
  }
  return {
    km: row.km,
    transitHrs: row.horasRuta,
    driverExpenses: row.driverExpenses,
    routeType: 'Straight & Danger',
  }
}

async function resolveUsaLeg(
  origin: string, dest: string, equipment: EquipmentSpec,
  operationType: string, serviceType: string, outboundLoc: string, warnings: string[],
): Promise<UsaLaneData | undefined> {
  const dataKey = `${origin} - ${dest} ${equipment.truckType}`.toUpperCase()
  const data = await prisma.usaLaneData.findFirst({ where: { laneKey: dataKey } })
  if (!data) {
    warnings.push(`USA lane data not found: "${dataKey}"`)
    return undefined
  }

  const rpmKey = `${origin} - ${dest} ${equipment.truckType} ${equipment.trailerType} ${equipment.config} ${operationType} ${serviceType} ${equipment.driverType}`
  const mkt = await prisma.usaLaneMktPrice.findFirst({ where: { laneKeyNorm: rpmKey.toUpperCase() } })
  if (!mkt) warnings.push(`USA market RPM not found: "${rpmKey}" (DAT reference will be 0)`)

  let outboundCondition: MarketCondition = 'Neutral'
  const outMarket = await marketOf(outboundLoc)
  if (outMarket) {
    const cond = await prisma.usaMktCondition.findUnique({ where: { market: outMarket } })
    if (cond) outboundCondition = conditionByTrailer(cond, equipment.trailerType)
    else warnings.push(`Market condition not found for "${outMarket}" (deadhead uses Neutral)`)
  } else {
    warnings.push(`No market mapping for "${outboundLoc}" (deadhead uses Neutral)`)
  }

  return {
    miles: data.miles,
    routeExpenses: data.routeExpenses,
    marketRpm: mkt?.rpm ?? 0,
    outboundCondition,
    fscOriginUsdMile: await fscOf(stateOf(origin)),
    fscDestUsdMile: await fscOf(stateOf(dest)),
  }
}

export async function resolveRoute(input: ResolveInput): Promise<ResolvedRoute> {
  const { outboundLocation, inboundLocation, mexBorder, usBorder, equipment, operationType, serviceType } = input
  const warnings: string[] = []

  switch (operationType) {
    case 'D2D Export': {
      const mexLane = await resolveMexLeg(outboundLocation, mexBorder, equipment.truckType, warnings)
      const usaLane = await resolveUsaLeg(usBorder, inboundLocation, equipment, operationType, serviceType, usBorder, warnings)
      return { mexLane, usaLane, warnings }
    }
    case 'D2D Import': {
      const usaLane = await resolveUsaLeg(outboundLocation, usBorder, equipment, operationType, serviceType, outboundLocation, warnings)
      const mexLane = await resolveMexLeg(mexBorder, inboundLocation, equipment.truckType, warnings)
      return { mexLane, usaLane, warnings }
    }
    case 'Drayage': {
      const usaLane = await resolveUsaLeg(outboundLocation, inboundLocation, equipment, operationType, serviceType, outboundLocation, warnings)
      return { usaLane, warnings }
    }
    default: {
      // Intra-Mex / MX Northbound / MX Southbound / Local
      const mexLane = await resolveMexLeg(outboundLocation, inboundLocation, equipment.truckType, warnings)
      return { mexLane, warnings }
    }
  }
}

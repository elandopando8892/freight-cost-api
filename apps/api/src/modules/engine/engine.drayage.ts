/**
 * Drayage Cycle Engine (Freight Cost Model V3.0 finding #4 + #5).
 *
 * Drayage is NOT "FTL + a chassis surcharge". It's a physical cycle:
 *
 *   yard ──(port pickup, deadhead)──▶ port terminal ──(dwell, grab box)──▶
 *   ──(loaded linehaul)──▶ delivery ──(service, unload)──▶
 *   ──(empty return: to port OR interior drop-off OR none)──▶
 *   ──(final reposition, deadhead)──▶ yard
 *
 * The cost sums real legs (loaded + all deadheads), billable cycle time (which
 * drives CFU-by-time + chassis/day), and conditional container return — instead
 * of pricing a single origin→dest loaded linehaul.
 *
 * Output shape is UsaLegOutput (drayage fills the USA-side slot in a quote) plus
 * a `drayageCycle` breakdown for transparency. Non-applicable USA fields
 * (marketRpm, serviceRisk) are zeroed.
 */
import { getParam, type ParamMap } from '../assumptions/assumptions.service.js'
import {
  trailerFactor, operationFactor, driverFactor, equipmentFactors,
} from './engine.factors.js'
import { deriveMonthlyFixedCost, deriveMaintTiresPerMile } from './engine.outputs.js'
import { buildReferenceKey } from './reference-key.js'
import type { DrayageLegInput, DrayageReturnMode, UsaLegOutput } from './engine.types.js'

const KML_TO_MPG = 2.3521458
const mround = (x: number, m: number) => Math.round(x / m) * m

export function calculateDrayageLeg(lane: DrayageLegInput, params: ParamMap): UsaLegOutput {
  const { equipment } = lane
  const P = lane.loadedMiles                       // loaded linehaul (port → delivery)

  // Assumptions
  const rendCargado = getParam(params, 'FUEL', 'Rendimiento Cargado', 2.8)
  const rendVacio = getParam(params, 'FUEL', 'Rendimiento Vacío', 3.2)
  const tarifaUs = getParam(params, 'LABOR', 'Tarifa Operador US', 0.6)
  const maintTiresPerMile = deriveMaintTiresPerMile(params)
  const monthlyFixedCost = deriveMonthlyFixedCost(params)
  const flota = getParam(params, 'GENERAL_BASE', 'Tamaño de Flota', 50)
  const periodo = getParam(params, 'GENERAL_BASE', 'Periodo de Operación', 26)
  const kmPerOperator = getParam(params, 'GENERAL_BASE', 'Kilómetros promedio x operador', 22000)
  // Drayage cycle params
  const pickupFactor = getParam(params, 'CONFIG', 'Drayage Port Pickup Factor', 0.2)
  const repositionFactor = getParam(params, 'CONFIG', 'Drayage Final Reposition Factor', 0.1)
  const dropOffFactor = getParam(params, 'CONFIG', 'Drayage Drop-Off Factor', 0.4)
  const chassisDayCost = getParam(params, 'CONFIG', 'Chassis Day Cost USD', 25)
  const portDwellHours = lane.portDwellHours ?? getParam(params, 'UTILIZATION', 'Port Dwell Hours', 2)
  const deliveryServiceHours = lane.deliveryServiceHours ?? getParam(params, 'UTILIZATION', 'Delivery Service Hours', 2)
  const billableFloor = getParam(params, 'UTILIZATION', 'Billable Day Floor Drayage', 1.0)

  const eq = equipmentFactors(equipment.truckType)

  // ── Physical legs (miles) ────────────────────────────────────────────
  const portPickupMiles = lane.portPickupMiles ?? P * pickupFactor
  const finalRepositionMiles = lane.finalRepositionMiles ?? P * repositionFactor

  // Conditional container return (finding #5): port / interior drop-off / none.
  let emptyReturnMiles: number
  let returnMode: DrayageReturnMode
  if (lane.emptyReturnRequired === false) {
    emptyReturnMiles = 0
    returnMode = 'none'
  } else if (lane.dropOff) {
    emptyReturnMiles = lane.emptyReturnMiles ?? P * dropOffFactor
    returnMode = 'drop-off'
  } else if (lane.emptyReturnRequired === true) {
    emptyReturnMiles = lane.emptyReturnMiles ?? P   // back to port ≈ loaded distance
    returnMode = 'port'
  } else {
    // Unspecified → conservative: assume return to port at loaded distance (flagged upstream).
    emptyReturnMiles = lane.emptyReturnMiles ?? P
    returnMode = 'assumed-port'
  }

  const loadedMiles = P
  const emptyMiles = portPickupMiles + emptyReturnMiles + finalRepositionMiles
  const totalOperationalMiles = loadedMiles + emptyMiles

  // ── Fuel / driver / maint (same drivers as USA leg) ──────────────────
  const loadedMpg = rendCargado * KML_TO_MPG * eq.fuel
  const emptyMpg = rendVacio * KML_TO_MPG * eq.fuel
  const fuelGallons = (loadedMpg > 0 ? loadedMiles / loadedMpg : 0) + (emptyMpg > 0 ? emptyMiles / emptyMpg : 0)
  const fuelCostUsd = fuelGallons * lane.dieselUsdGal
  const driverCostUsd = totalOperationalMiles * tarifaUs * driverFactor(equipment.driver, params) * eq.driver + (lane.driverExpenses ?? 0)
  const maintTiresUsd = totalOperationalMiles * maintTiresPerMile * eq.maint

  // ── Billable cycle time → CFU-by-time + chassis/day ──────────────────
  const transitDaysRaw = lane.transitDaysRaw ?? 0
  const serviceDays = (portDwellHours + deliveryServiceHours) / 24
  const transitDays = P > 0 ? transitDaysRaw * (totalOperationalMiles / P) : transitDaysRaw
  const cycleDays = Math.max(transitDays + serviceDays, billableFloor)
  // Chassis committed for the whole cycle; extra day if the chassis must return too.
  const chassisDays = cycleDays + (lane.chassisReturnRequired ? 0.5 : 0)
  const chassisCostUsd = chassisDayCost * chassisDays
  const returnTollUsd = lane.returnTollUsd ?? 0

  // ── CVU / CFU ────────────────────────────────────────────────────────
  const cvuExFuelUsd = driverCostUsd + maintTiresUsd + chassisCostUsd + returnTollUsd
  const cvuInclFuelUsd = cvuExFuelUsd + fuelCostUsd
  const fixedPerDay = monthlyFixedCost / (periodo * flota)
  const fixedPerMile = fixedPerDay / kmPerOperator * 1.60934
  const cfuByDistanceUsd = totalOperationalMiles * fixedPerMile * eq.fixed
  const cfuByTimeUsd = cycleDays * fixedPerDay * eq.fixed
  const cfuUsd = Math.max(cfuByDistanceUsd, cfuByTimeUsd)

  // ── Technical tariff (drayage priced One Way; margin, not markup) ────
  const utRate = getParam(params, 'TECHNICAL_MARGIN', 'UT Rate One Way', 0.3)
  const technicalTariffExFuelUsd = (cvuExFuelUsd + cfuUsd) / (1 - utRate)
  const technicalTariffInclFuelUsd = (cvuInclFuelUsd + cfuUsd) / (1 - utRate)

  // ── Risk: chassis trailer factor + drayage operation factor ──────────
  const trailerFac = trailerFactor(equipment.trailer, params)
  const trailerRiskUsd = Math.max(trailerFac - 1, 0) * (cvuInclFuelUsd + cfuUsd)
  const opFactor = operationFactor(lane.operation, params)
  const operationRiskUsd = Math.max(opFactor - 1, 0) * (cvuInclFuelUsd + cfuUsd)
  const totalRiskAdjUsd = trailerRiskUsd + operationRiskUsd

  // ── Required tariff ──────────────────────────────────────────────────
  const requiredTariffExFuelUsd = technicalTariffExFuelUsd + totalRiskAdjUsd
  const requiredTariffUsd = mround(technicalTariffInclFuelUsd + totalRiskAdjUsd, 50)
  const rpm = P > 0 ? requiredTariffExFuelUsd / P : 0
  const fsc = lane.fscUsdMile
  const flatUsd = P * (rpm + fsc)

  const referenceKey = buildReferenceKey(lane.origin, lane.dest, equipment, lane.operation, lane.service)

  return {
    loadedMiles, emptyMiles, totalOperationalMiles,
    loadedMpg, emptyMpg, fuelGallons, fuelCostUsd, driverCostUsd, maintTiresUsd,
    cvuExFuelUsd, cvuInclFuelUsd, cycleDays,
    cfuByDistanceUsd, cfuByTimeUsd, cfuUsd,
    utRate, technicalTariffExFuelUsd, technicalTariffInclFuelUsd,
    trailerFactor: trailerFac, trailerRiskUsd, operationRiskUsd, serviceRiskUsd: 0, totalRiskAdjUsd,
    requiredTariffExFuelUsd, requiredTariffUsd, rpm, fsc, flatUsd,
    marketRpm: lane.marketRpm ?? 0,
    marketRateUsd: (lane.marketRpm ?? 0) > 0 ? P * ((lane.marketRpm ?? 0) + fsc) : 0,
    referenceKey,
    drayageCycle: {
      portPickupMiles, loadedLinehaulMiles: loadedMiles, emptyReturnMiles, finalRepositionMiles,
      portDwellHours, deliveryServiceHours, chassisCostUsd, returnTollUsd, returnMode,
    },
  }
}

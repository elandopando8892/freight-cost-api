import { missingRequiredPricingLegs } from './lane-resolver.service.js'

type DistanceLeg = { loadedMiles: number }
type MexDistanceLeg = { baseKm: number }

export type RawPricingLegs = {
  mex?: MexDistanceLeg
  usa?: DistanceLeg
  drayage?: DistanceLeg
}

/**
 * Validates the physical minimum needed to price an operation. The calculator
 * intentionally remains a pure workbook-compatible function; HTTP boundaries
 * use this guard so a partial or zero-distance calculation cannot be saved as
 * a valid quote.
 */
export function pricingInputIssues(operation: string, legs: RawPricingLegs): string[] {
  const effectiveUsa = operation === 'Drayage' ? legs.drayage ?? legs.usa : legs.usa
  const missing = missingRequiredPricingLegs(operation, {
    mexLeg: legs.mex,
    usaLeg: effectiveUsa,
  })
  const issues = missing.map((leg) => `Falta la pierna ${leg} requerida para ${operation}.`)

  if (legs.mex && legs.mex.baseKm <= 0) {
    issues.push('La distancia de la pierna MEX debe ser mayor que cero.')
  }
  if (effectiveUsa && effectiveUsa.loadedMiles <= 0) {
    issues.push(operation === 'Drayage'
      ? 'La distancia cargada del ciclo Drayage debe ser mayor que cero.'
      : 'La distancia de la pierna USA debe ser mayor que cero.')
  }
  return issues
}

import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { ResolveInput } from './lane-resolver.service.js'
import type { UsaLegInput } from './engine.types.js'

export const TripDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}, 'Fecha inválida')

export const TripFuelSelectionSchema = z.discriminatedUnion('mode', [
  z.object({ contextHash: z.string().length(64), mode: z.literal('REFERENCE'), provisionalAccepted: z.literal(true) }).strict(),
  z.object({ contextHash: z.string().length(64), mode: z.literal('MANUAL'),
    priceUsdGal: z.number().finite().positive(), observationDate: TripDateSchema,
    sourceReference: z.string().trim().min(4).max(240),
  }).strict(),
])
export type TripFuelSelection = z.infer<typeof TripFuelSelectionSchema>
export type TripFuelReview = {
  contextHash: string
  serviceDate: string
  origin: string
  destination: string
  outState: string
  region: string | null
  referencePriceUsdGal: number | null
  observationDate: null
  source: 'USA_FUEL_CACHE'
  fscUsdMile: number
  warning: string
}
export type TripFuelSnapshot = {
  contextHash: string
  serviceDate: string
  mode: 'REFERENCE' | 'MANUAL'
  priceUsdGal: number
  observationDate: string | null
  sourceReference: string
  outState: string
  region: string | null
  provisional: boolean
}
function fail(message: string, statusCode = 422): never { throw Object.assign(new Error(message), { statusCode }) }

/** No database or provider access. A fingerprint is a change detector, not a signature. */
export function tripFuelReview(input: ResolveInput & { serviceDate?: string; costBaseId?: string; assumptionSetId?: string }, leg: UsaLegInput): TripFuelReview {
  if (!input.serviceDate) fail('Captura la fecha del servicio para revisar el diésel USA.')
  const serviceDate = TripDateSchema.parse(input.serviceDate)
  const referencePriceUsdGal = Number.isFinite(leg.dieselUsdGal) && leg.dieselUsdGal > 0 ? leg.dieselUsdGal : null
  const context = {
    orgId: input.orgId, costBaseId: input.costBaseId ?? null, assumptionSetId: input.assumptionSetId ?? null,
    origin: input.outboundLocation.trim(), destination: input.inboundLocation.trim(),
    mexBorder: input.mexBorder, usBorder: input.usBorder, operation: input.operation, service: input.service,
    route: input.route ?? 'Straight & Danger', serviceDate,
    equipment: [input.equipment.truckType, input.equipment.trailer, input.equipment.config, input.equipment.driver],
    resolvedOrigin: leg.origin ?? null, resolvedDestination: leg.dest ?? null,
    loadedMiles: leg.loadedMiles, outState: leg.outState, region: leg.fuelRegion ?? null,
    referencePriceUsdGal, fscUsdMile: leg.fscUsdMile,
  }
  return {
    contextHash: createHash('sha256').update(JSON.stringify(context)).digest('hex'), serviceDate,
    origin: leg.origin ?? input.outboundLocation.trim(), destination: leg.dest ?? input.inboundLocation.trim(),
    outState: leg.outState, region: leg.fuelRegion ?? null, referencePriceUsdGal,
    observationDate: null, source: 'USA_FUEL_CACHE', fscUsdMile: leg.fscUsdMile,
    warning: 'Referencia de caché por estado de salida, no por todas las compras del corredor. Fecha de observación desconocida: no acredita la semana del servicio. El FSC comercial se conserva separado.',
  }
}

/** Returns a new leg; never modifies base parameters, the cache, or the original leg. */
export function applyTripFuel(review: TripFuelReview, leg: UsaLegInput, raw: unknown): UsaLegInput {
  if (!raw) fail('Revisa y confirma el diésel USA de este viaje antes de calcular.')
  const choice = TripFuelSelectionSchema.parse(raw)
  if (choice.contextHash !== review.contextHash) fail('La ruta, fecha o referencia de combustible cambió. Revisa los inputs de nuevo.', 409)
  const price = choice.mode === 'REFERENCE' ? review.referencePriceUsdGal : choice.priceUsdGal
  if (price == null) fail('No hay precio de diésel USA válido. Introduce un precio propio sustentado.')
  if (choice.mode === 'MANUAL' && (choice.observationDate > review.serviceDate || choice.observationDate > new Date().toISOString().slice(0, 10))) {
    fail('La observación no puede ser futura ni posterior al servicio.')
  }
  return { ...leg, dieselUsdGal: price, fuelReview: {
    contextHash: review.contextHash, serviceDate: review.serviceDate, mode: choice.mode,
    priceUsdGal: price, observationDate: choice.mode === 'MANUAL' ? choice.observationDate : null,
    sourceReference: choice.mode === 'MANUAL' ? choice.sourceReference : 'USA_FUEL_CACHE: fecha de observación desconocida',
    outState: review.outState, region: review.region, provisional: choice.mode === 'REFERENCE',
  } }
}

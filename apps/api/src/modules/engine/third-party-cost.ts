import { z } from 'zod'

const text = z.string().trim().min(2).max(240)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}, 'Fecha inválida')
const amount = z.number().finite().nonnegative().max(100_000_000)
  .refine(value => Number(value.toFixed(2)) === value, 'Usa hasta dos decimales')
const currency = z.enum(['MXN', 'USD'])
const extra = z.object({ mode: z.literal('EXTRA'), amount }).strict()
const term = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('UNKNOWN') }).strict(),
  z.object({ mode: z.literal('INCLUDED') }).strict(), extra,
])
const quote = z.object({
  carrier: text, reference: text, validFrom: date, validUntil: date,
  currency, linehaul: amount.refine(value => value > 0, 'La tarifa debe ser positiva'),
  fuel: term, tolls: term,
  conditions: z.string().trim().min(10).max(1500),
}).strict()
const borderTerm = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('UNKNOWN') }).strict(),
  z.object({ mode: z.literal('INCLUDED_MX') }).strict(),
  z.object({ mode: z.literal('INCLUDED_US') }).strict(),
  z.object({ mode: z.literal('EXTRA'), amount, currency, provider: text, reference: text,
    validFrom: date, validUntil: date }).strict(),
])

export const ThirdPartyCostSchema = z.object({
  segment: z.enum(['D2D_MX_US_PARTNER', 'D2D_US_MX_PARTNER']),
  direction: z.enum(['MX_TO_US', 'US_TO_MX']),
  service: z.literal('ONE_WAY'),
  serviceDate: date,
  origin: text, destination: text, equipment: text,
  mxInterchange: text, usInterchange: text,
  assumptions: z.string().trim().min(10).max(1500),
  mex: quote, usa: quote,
  crossing: borderTerm, interchange: borderTerm,
  fx: z.object({ mxnPerUsd: z.number().finite().min(0.01).max(1000)
    .refine(value => Number(value.toFixed(6)) === value, 'Usa hasta seis decimales para FX'),
    source: text, asOf: date }).strict().optional(),
}).strict()
export type ThirdPartyCostInput = z.infer<typeof ThirdPartyCostSchema>

type CostLine = { id: string; label: string; provider: string; reference: string; amount: number;
  currency: 'MXN' | 'USD'; usd: number | null }

function mxnToUsdCents(value: number, rate: number) {
  // Prices have at most 2 decimals and FX at most 6. Integer arithmetic makes
  // half-cent rounding deterministic (2.01 MXN / 2 must yield 1.01 USD).
  const numerator = BigInt(Math.round(value * 100)) * BigInt(1_000_000)
  const denominator = BigInt(Math.round(rate * 1_000_000))
  return Number((numerator + denominator / BigInt(2)) / denominator) / 100
}

/** Known transport purchase cost only. No fleet assumptions, sell margin or persistence. */
export function calculateThirdPartyCost(raw: unknown) {
  const input = ThirdPartyCostSchema.parse(raw)
  const issues: { field: string; message: string }[] = []
  const lines: CostLine[] = []
  const inclusions: { label: string; includedIn: string }[] = []
  const addIssue = (field: string, message: string) => issues.push({ field, message })
  const valid = (field: 'mex' | 'usa' | 'crossing' | 'interchange', value: { validFrom: string; validUntil: string }) => {
    if (value.validFrom > value.validUntil || input.serviceDate < value.validFrom || input.serviceDate > value.validUntil) {
      const label = { mex: 'Línea MX', usa: 'Línea US', crossing: 'Cruce', interchange: 'Intercambio' }[field]
      addIssue(field, `${label}: la vigencia debe cubrir la fecha del viaje.`)
    }
  }
  const line = (id: string, label: string, provider: string, reference: string, value: number, unit: 'MXN' | 'USD') => {
    lines.push({ id, label, provider, reference, amount: value, currency: unit,
      usd: unit === 'USD' ? value : input.fx ? mxnToUsdCents(value, input.fx.mxnPerUsd) : null })
  }
  for (const [key, label] of [['mex', 'MX'], ['usa', 'US']] as const) {
    const q = input[key]
    valid(key, q)
    line(`${key}.linehaul`, `Tarifa ${label}`, q.carrier, q.reference, q.linehaul, q.currency)
    for (const [item, name] of [['fuel', 'Combustible'], ['tolls', 'Peajes']] as const) {
      const cost = q[item]
      if (cost.mode === 'UNKNOWN') addIssue(`${key}.${item}`, `Confirma ${name.toLowerCase()} de la línea ${label}.`)
      else if (cost.mode === 'EXTRA') line(`${key}.${item}`, `${name} ${label}`, q.carrier, q.reference, cost.amount, q.currency)
      else inclusions.push({ label: `${name} ${label}`, includedIn: `Tarifa ${label}` })
    }
  }
  for (const [key, label] of [['crossing', 'Cruce'], ['interchange', 'Intercambio']] as const) {
    const cost = input[key]
    if (cost.mode === 'UNKNOWN') addIssue(key, `Confirma quién incluye o cobra ${label.toLowerCase()}.`)
    else if (cost.mode === 'EXTRA') {
      valid(key, cost)
      line(key, label, cost.provider, cost.reference, cost.amount, cost.currency)
    } else inclusions.push({ label, includedIn: cost.mode === 'INCLUDED_MX' ? 'Tarifa MX' : 'Tarifa US' })
  }
  if (lines.some(item => item.currency === 'MXN') && !input.fx) addIssue('fx', 'Captura MXN por USD, fuente y fecha del tipo de cambio.')
  if (input.fx && input.fx.asOf > input.serviceDate) addIssue('fx.asOf', 'La fecha del tipo de cambio no puede ser posterior al viaje.')
  const knownSubtotalUsd = lines.every(item => item.usd !== null)
    ? lines.reduce((sum, item) => sum + Math.round(item.usd! * 100), 0) / 100 : null
  return {
    modelVersion: 'FCM_THIRD_PARTY_FLAT_V1', status: issues.length ? 'INCOMPLETE' : 'ESTIMATE',
    input, lines, inclusions, issues,
    knownSubtotalUsd,
    purchaseCostUsd: issues.length ? null : knownSubtotalUsd,
    exclusions: ['Impuestos', 'Demoras, almacenaje y contingencias no incluidos en las tarifas capturadas'],
    sourceStatus: 'USER_SUPPLIED_UNVERIFIED',
  }
}

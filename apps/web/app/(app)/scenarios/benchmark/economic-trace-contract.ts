import { z } from 'zod'

const text = z.string().trim().min(1).max(2000)
const number = z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER / 100)
const url = z.string().max(4000).url().refine(s => new URL(s).protocol === 'https:')
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => {
  const d = new Date(`${s}T00:00:00Z`)
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s
})
const datum = z.object({ value: number, unit: text, derivation: text, evidenceIds: z.array(text).min(1).max(1000) })
const input = datum.extend({ key: text, label: text, section: text }).strict()
const rate = datum.extend({ key: text, inputKeys: z.array(text).min(1).max(210) }).strict()
const source = z.object({ id: text, url, locator: text, country: z.enum(['MX', 'US']),
  equipment: z.literal('TRACTOR_DRY_VAN_SINGLE'), observedAt: date, validFrom: date, validUntil: date, limitations: text }).strict()
const resourceCosts = z.object({ cfuUsd: number, cvuUsd: number, productionCostUsd: number,
  cfuByDistanceUsd: number, cfuByTimeUsd: number, maintenanceUsd: number, tiresUsd: number,
  fuelUsd: number.optional(), driverUsd: number.optional(), tollsUsd: number.optional(),
  totalKm: number.optional(), cycleDays: number.optional() }).strict()
export const economicResourceSchema = z.object({ id: z.enum(['mx', 'us', 'trailer']),
  scope: z.enum(['TRACTOR_ONLY', 'SHARED_TRAILER_ONCE']), revision: text, serviceDate: date,
  inputs: z.array(input).min(1).max(210), rates: z.array(rate).min(1).max(9),
  trip: z.array(input).min(1).max(4), evidence: z.array(source).min(1).max(1000), costs: resourceCosts }).strict()
const border = z.object({ id: text, covers: z.array(z.enum(['CROSSING', 'INTERCHANGE'])).min(1).max(2),
  amountUsd: number, provider: text, derivation: text, sourceUrl: url, locator: text,
  observedAt: date, validFrom: date, validUntil: date }).strict()
export const cents = (n: number) => Math.round(n * 100)
const unique = (items: string[]) => new Set(items).size === items.length

/** Structural/coherence checks only: imported JSON and source authenticity remain unverified. */
export const economicTraceSchema = z.object({ version: z.literal('FCM_ECONOMIC_TRACE_V1'),
  resources: z.array(economicResourceSchema).length(3), borderCharges: z.array(border).max(2) }).strict().superRefine((trace, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message })
  if (!unique(trace.resources.map(r => r.id))) fail('Duplicate resource')
  if (!unique(trace.borderCharges.map(r => r.id)) || !unique(trace.borderCharges.flatMap(r => r.covers))) fail('Duplicate border charge')
  const dates = new Set(trace.resources.map(r => r.serviceDate))
  if (dates.size !== 1) fail('Inconsistent service dates')
  for (const r of trace.resources) {
    if (r.scope !== (r.id === 'trailer' ? 'SHARED_TRAILER_ONCE' : 'TRACTOR_ONLY')) fail('Resource scope mismatch')
    for (const rows of [r.inputs, r.rates, r.trip, r.evidence]) if (!unique(rows.map(row => 'key' in row ? row.key : row.id))) fail('Duplicate trace key')
    const sources = new Map(r.evidence.map(e => [e.id, e]))
    const inputs = new Set(r.inputs.map(p => p.key))
    for (const d of [...r.inputs, ...r.rates, ...r.trip]) {
      if (!unique(d.evidenceIds)) fail('Duplicate source reference')
      for (const id of d.evidenceIds) {
        const e = sources.get(id)
        if (!e) { fail('Unknown source reference'); continue }
        if (r.id !== 'trailer' && e.country !== r.id.toUpperCase()) fail('Source country mismatch')
        if (e.observedAt > r.serviceDate || e.validFrom > r.serviceDate || e.validUntil < r.serviceDate || e.validFrom > e.validUntil) fail('Source outside validity')
      }
    }
    for (const rate of r.rates) if (!unique(rate.inputKeys) || rate.inputKeys.some(key => !inputs.has(key))) fail('Unknown/duplicate input dependency')
    const c = r.costs
    const variables = r.id === 'trailer' ? [c.maintenanceUsd, c.tiresUsd] : [c.fuelUsd, c.maintenanceUsd, c.tiresUsd, c.driverUsd, c.tollsUsd]
    if (variables.some(n => n === undefined) || variables.reduce<number>((sum, n) => sum + cents(n ?? 0), 0) !== cents(c.cvuUsd)) fail('Variable components mismatch')
    if (cents(c.cfuUsd) !== Math.max(cents(c.cfuByDistanceUsd), cents(c.cfuByTimeUsd)) || cents(c.productionCostUsd) !== cents(c.cfuUsd) + cents(c.cvuUsd)) fail('Resource totals mismatch')
  }
  for (const b of trace.borderCharges) {
    const serviceDate = trace.resources[0].serviceDate
    if (b.observedAt > serviceDate || b.validFrom > serviceDate || b.validUntil < serviceDate || b.validFrom > b.validUntil) fail('Border source outside validity')
  }
})
export type EconomicTrace = z.infer<typeof economicTraceSchema>

import { z } from 'zod'
import { economicTraceSchema, economicResourceSchema, cents } from './economic-trace-contract'
const text = z.string().max(2000)
const money = z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER / 100)
const costs = z.object({ cfuUsd: money, cvuUsd: money, borderServicesUsd: money, productionCostUsd: money })
const schema = z.object({
  calibrated: z.literal(false), sourceStatus: z.literal('DOCUMENTED_UNVERIFIED'),
  status: z.enum(['SCENARIO_ONLY', 'INCOMPLETE']),
  issues: z.array(z.object({ field: text, code: text })).max(1000),
  scenarios: z.array(z.object({ id: text, result: z.object({
    calibrated: z.literal(false), costs,
    trace: economicTraceSchema.optional(),
    sharedTrailer: z.object({ lineage: z.object({ evidence: z.array(z.object({
      id: text, url: z.string().url().refine(s => new URL(s).protocol === 'https:'), locator: text,
    })).max(1000) }) }),
  }) })).max(20).nullable(),
}).superRefine((data, ctx) => {
  if (data.status === 'INCOMPLETE' ? data.scenarios !== null || data.issues.length === 0 : !data.scenarios?.length || data.issues.length > 0) {
    ctx.addIssue({ code: 'custom', message: 'Inconsistent status' })
  }
  if (data.scenarios && new Set(data.scenarios.map(s => s.id)).size !== data.scenarios.length) ctx.addIssue({ code: 'custom', message: 'Duplicate scenarios' })
  for (const s of data.scenarios ?? []) {
    const trace = s.result.trace
    if (!trace) continue // Explicit legacy state; never invent missing lineage.
    const sums = {
      cfuUsd: trace.resources.reduce((sum, r) => sum + cents(r.costs.cfuUsd), 0),
      cvuUsd: trace.resources.reduce((sum, r) => sum + cents(r.costs.cvuUsd), 0),
      borderServicesUsd: trace.borderCharges.reduce((sum, r) => sum + cents(r.amountUsd), 0),
    }
    const expected = { ...sums, productionCostUsd: sums.cfuUsd + sums.cvuUsd + sums.borderServicesUsd }
    if (Object.entries(expected).some(([key, value]) => !Number.isSafeInteger(value) || value !== cents(s.result.costs[key as keyof typeof expected]))) {
      ctx.addIssue({ code: 'custom', message: 'Trace/scenario totals mismatch' })
    }
  }
})
export type ReviewResult = z.infer<typeof schema>
export function parseReview(text: string): ReviewResult {
  if (text.length > 1_000_000) throw new Error('Result too large')
  const raw: unknown = JSON.parse(text)
  if (typeof raw === 'object' && raw !== null && 'sharedTractorResources' in raw) {
    // Expand only validated wire resources, not formulas. The full schema checks references and totals below.
    const wire = z.object({ sharedTractorResources: z.array(economicResourceSchema).length(2),
      scenarios: z.array(z.object({ result: z.object({ trace: z.object({
        resources: z.array(economicResourceSchema).length(1),
      }).passthrough() }).passthrough() }).passthrough()).min(1).max(20),
    }).passthrough().parse(raw)
    if (wire.sharedTractorResources.map(r => r.id).join(',') !== 'mx,us' || wire.scenarios.some(s => s.result.trace.resources[0].id !== 'trailer')) throw new Error('Invalid shared trace resources')
    return schema.parse({ ...wire, scenarios: wire.scenarios.map(s => ({ ...s, result: { ...s.result,
      trace: { ...s.result.trace, resources: [...wire.sharedTractorResources, ...s.result.trace.resources] },
    } })) })
  }
  return schema.parse(raw)
}

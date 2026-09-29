import { z } from 'zod'
const text = z.string().max(2000)
const money = z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER / 100)
const costs = z.object({ cfuUsd: money, cvuUsd: money, borderServicesUsd: money, productionCostUsd: money })
const schema = z.object({
  calibrated: z.literal(false), sourceStatus: z.literal('DOCUMENTED_UNVERIFIED'),
  status: z.enum(['SCENARIO_ONLY', 'INCOMPLETE']),
  issues: z.array(z.object({ field: text, code: text })).max(1000),
  scenarios: z.array(z.object({ id: text, result: z.object({
    calibrated: z.literal(false), costs,
    sharedTrailer: z.object({ lineage: z.object({ evidence: z.array(z.object({
      id: text, url: z.string().url().refine(s => new URL(s).protocol === 'https:'), locator: text,
    })).max(1000) }) }),
  }) })).max(20).nullable(),
}).superRefine((data, ctx) => {
  if (data.status === 'INCOMPLETE' ? data.scenarios !== null || data.issues.length === 0 : !data.scenarios?.length || data.issues.length > 0) {
    ctx.addIssue({ code: 'custom', message: 'Inconsistent status' })
  }
  if (data.scenarios && new Set(data.scenarios.map(s => s.id)).size !== data.scenarios.length) ctx.addIssue({ code: 'custom', message: 'Duplicate scenarios' })
})
export type ReviewResult = z.infer<typeof schema>
export function parseReview(text: string): ReviewResult {
  if (text.length > 1_000_000) throw new Error('Result too large')
  return schema.parse(JSON.parse(text))
}

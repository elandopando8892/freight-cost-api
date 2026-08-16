import { z } from 'zod'

// Must mirror the Prisma `Section` enum exactly — otherwise PATCH/reset reject
// edits to cost-card sections (COST_*), which is the whole point of carrier editing.
export const SectionEnum = z.enum([
  'GENERAL_BASE',
  'FUEL',
  'LABOR',
  'FINANCE',
  'UTILIZATION',
  'BORDER',
  'RISK',
  'CONFIG',
  'TECHNICAL_MARGIN',
  'FACTORS',
  'COST_MAINT',
  'COST_TIRES',
  'COST_INSURANCE',
  'COST_PAYROLL',
  'COST_COMPANY',
  'COST_CAPITAL',
  'COST_CROSSBORDER',
])

export const CreateSetSchema = z.object({
  name: z.string().min(1),
  notes: z.string().optional(),
  cloneFromId: z.string().cuid().optional(),
})

export const UpdateSetSchema = z.object({
  name: z.string().min(1).optional(),
  notes: z.string().optional(),
})

export const BulkUpdateParamsSchema = z.array(
  z.object({
    section: SectionEnum,
    field: z.string().min(1),
    value: z.number().finite(),
  }).strict(),
).superRefine((updates, context) => {
  const seen = new Set<string>()
  updates.forEach((update, index) => {
    const key = `${update.section}__${update.field}`
    if (seen.has(key)) {
      context.addIssue({
        code: 'custom',
        path: [index, 'field'],
        message: `${update.section} / ${update.field} is duplicated in this update.`,
      })
    }
    seen.add(key)
  })
})

// Reset to V3.0 recommended defaults. Empty/omitted `fields` → reset the whole set.
export const ResetParamsSchema = z.object({
  fields: z.array(z.object({ section: SectionEnum, field: z.string().min(1) })).optional(),
})

export type CreateSetInput = z.infer<typeof CreateSetSchema>
export type UpdateSetInput = z.infer<typeof UpdateSetSchema>
export type BulkUpdateInput = z.infer<typeof BulkUpdateParamsSchema>
export type ResetParamsInput = z.infer<typeof ResetParamsSchema>

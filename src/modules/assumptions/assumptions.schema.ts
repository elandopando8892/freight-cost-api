import { z } from 'zod'

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
    value: z.number(),
  }),
)

export type CreateSetInput = z.infer<typeof CreateSetSchema>
export type UpdateSetInput = z.infer<typeof UpdateSetSchema>
export type BulkUpdateInput = z.infer<typeof BulkUpdateParamsSchema>

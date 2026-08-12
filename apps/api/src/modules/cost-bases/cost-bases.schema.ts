import { z } from 'zod'

export const CostBaseScopeSchema = z.enum(['CROSS_BORDER', 'DRAYAGE', 'LOCAL', 'INTRA_MEX', 'INTRA_US'])
export const CostBaseStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED'])
export const CostBasePolicySchema = z.enum(['OPERATIONAL_V3', 'WORKBOOK_V3'])

export const CreateCostBaseSchema = z.object({
  code: z.string().min(2).max(32).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  scope: CostBaseScopeSchema,
  defaultPolicy: CostBasePolicySchema.default('OPERATIONAL_V3'),
  currency: z.string().length(3).transform((value) => value.toUpperCase()).default('USD'),
  isDefault: z.boolean().default(false),
  cloneFromSetId: z.string().min(1).optional(),
})

export const UpdateCostBaseSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  status: CostBaseStatusSchema.optional(),
  defaultPolicy: CostBasePolicySchema.optional(),
  currency: z.string().length(3).transform((value) => value.toUpperCase()).optional(),
  isDefault: z.boolean().optional(),
})

export const CreateCostBaseVersionSchema = z.object({
  cloneFromSetId: z.string().min(1).optional(),
  notes: z.string().max(500).optional(),
})

export const PublishCostBaseVersionSchema = z.object({
  note: z.string().trim().min(3).max(500),
  impactAcknowledged: z.boolean().default(false),
})

export const ArchiveCostBaseVersionSchema = z.object({
  note: z.string().trim().min(3).max(500),
})

export type CreateCostBaseInput = z.infer<typeof CreateCostBaseSchema>
export type UpdateCostBaseInput = z.infer<typeof UpdateCostBaseSchema>
export type CreateCostBaseVersionInput = z.infer<typeof CreateCostBaseVersionSchema>
export type PublishCostBaseVersionInput = z.infer<typeof PublishCostBaseVersionSchema>
export type ArchiveCostBaseVersionInput = z.infer<typeof ArchiveCostBaseVersionSchema>

import { z } from 'zod'
import { SectionEnum } from '../assumptions/assumptions.schema.js'
import { CostBaseProfileSchema, profileConsistencyIssues } from './cost-base-profile.js'

export const CostBaseScopeSchema = z.enum(['CROSS_BORDER', 'DRAYAGE', 'LOCAL', 'INTRA_MEX', 'INTRA_US'])
export const CostBaseStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED'])
export const CostBasePolicySchema = z.enum(['OPERATIONAL_V3', 'WORKBOOK_V3'])

export const CreateCostBaseSchema = z.object({
  code: z.string().min(2).max(32).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  scope: CostBaseScopeSchema,
  // Defaults are resolved in the service so a recommended preset can supply
  // its own values when these fields are omitted.
  defaultPolicy: CostBasePolicySchema.optional(),
  currency: z.string().length(3).transform((value) => value.toUpperCase()).optional(),
  isDefault: z.boolean().optional(),
  cloneFromSetId: z.string().min(1).optional(),
  setupMode: z.enum(['RECOMMENDED_TEMPLATE', 'CONSULTANT_WIZARD', 'MANUAL']).default('MANUAL'),
  presetId: z.string().trim().min(3).max(80).optional(),
  applicabilityProfile: CostBaseProfileSchema.optional(),
  assumptionOverrides: z.array(z.object({
    section: SectionEnum,
    field: z.string().trim().min(1).max(120),
    value: z.number().finite(),
  }).strict()).max(40).default([]),
}).superRefine((value, context) => {
  const overrideKeys = new Set<string>()
  value.assumptionOverrides.forEach((override, index) => {
    const key = `${override.section}__${override.field}`
    if (overrideKeys.has(key)) {
      context.addIssue({
        code: 'custom',
        path: ['assumptionOverrides', index, 'field'],
        message: `${override.section} / ${override.field} is duplicated in this base draft.`,
      })
    }
    overrideKeys.add(key)
  })
  if (value.setupMode === 'RECOMMENDED_TEMPLATE' && !value.presetId) {
    context.addIssue({ code: 'custom', path: ['presetId'], message: 'presetId is required for a recommended template.' })
  }
  if (value.setupMode !== 'RECOMMENDED_TEMPLATE' && value.presetId) {
    context.addIssue({ code: 'custom', path: ['presetId'], message: 'presetId is only valid for a recommended template.' })
  }
  if (value.setupMode === 'RECOMMENDED_TEMPLATE' && value.cloneFromSetId) {
    context.addIssue({
      code: 'custom',
      path: ['cloneFromSetId'],
      message: 'A recommended template must start from the canonical baseline, not from another assumption set.',
    })
  }
  if (value.applicabilityProfile) {
    for (const message of profileConsistencyIssues(value.scope, value.applicabilityProfile, value.defaultPolicy)) {
      context.addIssue({ code: 'custom', path: ['applicabilityProfile'], message })
    }
  }
})

export const CostBaseApplicabilityPreviewSchema = z.object({
  scope: CostBaseScopeSchema,
  applicabilityProfile: CostBaseProfileSchema,
}).strict().superRefine((value, context) => {
  for (const message of profileConsistencyIssues(value.scope, value.applicabilityProfile)) {
    context.addIssue({ code: 'custom', path: ['applicabilityProfile'], message })
  }
})

export const UpdateCostBaseSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  currency: z.string().length(3).transform((value) => value.toUpperCase()).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one metadata field is required.',
})

export const ArchiveCostBaseSchema = z.object({
  note: z.string().trim().min(3).max(500).optional(),
}).strict()

export const CreateCostBaseVersionSchema = z.object({
  cloneFromSetId: z.string().min(1).optional(),
  notes: z.string().max(500).optional(),
})

export const UpdateCostBaseVersionProfileSchema = z.object({
  applicabilityProfile: CostBaseProfileSchema,
  note: z.string().trim().min(3).max(500).optional(),
}).strict()

export const PublishCostBaseVersionSchema = z.object({
  note: z.string().trim().min(3).max(500),
  impactAcknowledged: z.boolean().default(false),
})

export const ArchiveCostBaseVersionSchema = z.object({
  note: z.string().trim().min(3).max(500),
})

export type CreateCostBaseInput = z.infer<typeof CreateCostBaseSchema>
export type UpdateCostBaseInput = z.infer<typeof UpdateCostBaseSchema>
export type ArchiveCostBaseInput = z.infer<typeof ArchiveCostBaseSchema>
export type CreateCostBaseVersionInput = z.infer<typeof CreateCostBaseVersionSchema>
export type UpdateCostBaseVersionProfileInput = z.infer<typeof UpdateCostBaseVersionProfileSchema>
export type PublishCostBaseVersionInput = z.infer<typeof PublishCostBaseVersionSchema>
export type ArchiveCostBaseVersionInput = z.infer<typeof ArchiveCostBaseVersionSchema>

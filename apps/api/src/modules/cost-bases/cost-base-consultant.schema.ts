import { z } from 'zod'
import { CostBasePolicySchema, CostBaseScopeSchema } from './cost-bases.schema.js'
import { SectionEnum } from '../assumptions/assumptions.schema.js'
import { CostBaseProfileSchema } from './cost-base-profile.js'

export const ConsultantOverrideSchema = z.object({
  section: SectionEnum,
  field: z.string().trim().min(1).max(120),
  value: z.number().finite(),
}).strict()

export const CostBaseConsultantDraftSchema = z.object({
  scope: CostBaseScopeSchema.nullable().default(null),
  code: z.string().trim().max(32).nullable().default(null),
  name: z.string().trim().max(120).nullable().default(null),
  description: z.string().trim().max(500).nullable().default(null),
  defaultPolicy: CostBasePolicySchema.default('OPERATIONAL_V3'),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('USD'),
  isDefault: z.boolean().default(true),
  applicabilityProfile: CostBaseProfileSchema.nullable().default(null),
  assumptionOverrides: z.array(ConsultantOverrideSchema).max(40).default([]),
}).strict()

export const CostBaseConsultantRequestSchema = z.object({
  message: z.string().trim().min(2).max(1_200),
  draft: CostBaseConsultantDraftSchema,
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(1_500),
  }).strict()).max(10).default([]),
}).strict()

export const ConsultantModelOutputSchema = z.object({
  reply: z.string().min(1).max(1_200),
  nextQuestion: z.string().min(1).max(500),
  patch: z.object({
    scope: CostBaseScopeSchema.nullable(),
    code: z.string().max(32).nullable(),
    name: z.string().max(120).nullable(),
    description: z.string().max(500).nullable(),
    defaultPolicy: CostBasePolicySchema.nullable(),
    currency: z.string().max(3).nullable(),
    isDefault: z.boolean().nullable(),
    applicabilityProfile: CostBaseProfileSchema.nullable(),
  }).strict(),
  assumptionOverrides: z.array(ConsultantOverrideSchema).max(20),
  concerns: z.array(z.string().min(1).max(300)).max(8),
}).strict()

export type CostBaseConsultantDraft = z.infer<typeof CostBaseConsultantDraftSchema>
export type CostBaseConsultantInput = z.infer<typeof CostBaseConsultantRequestSchema>
export type ConsultantModelOutput = z.infer<typeof ConsultantModelOutputSchema>

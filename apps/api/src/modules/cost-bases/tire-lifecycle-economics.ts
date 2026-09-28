import { z } from 'zod'

export const TirePhysicalPositionSchema = z.enum(['STEER', 'DRIVE', 'TRAILER'])

const EvidenceReferenceSchema = z.object({
  id: z.string().min(1),
  sourceUrl: z.string().url().refine(value => value.startsWith('https://')),
  observedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict()

const ExactTireIdentitySchema = z.object({
  manufacturer: z.string().min(1),
  model: z.string().min(1),
  size: z.string().min(1),
  loadRange: z.string().min(1),
  serviceDescription: z.string().min(1),
  application: z.string().min(1),
  fitmentStatus: z.literal('VERIFIED_EXACT'),
  evidence: z.array(EvidenceReferenceSchema).min(1),
}).strict()

const InstalledTireCycleSchema = z.object({
  installedCostMxn: z.number().finite().positive(),
  lifeKm: z.number().finite().positive(),
  costBasis: z.literal('DELIVERED_INSTALLED_WITH_DISPOSAL'),
  evidence: z.array(EvidenceReferenceSchema).min(1),
}).strict()

const RetreadStageSchema = InstalledTireCycleSchema.extend({
  stage: z.number().int().positive(),
  /** Cumulative probability that the original casing reaches this stage. */
  reachProbability: z.number().finite().gt(0).max(1),
}).strict()

export const CompleteTireLifecycleSchema = z.object({
  position: TirePhysicalPositionSchema,
  quantityOnVehicle: z.number().int().positive(),
  identity: ExactTireIdentitySchema,
  newTire: InstalledTireCycleSchema,
  retreadStages: z.array(RetreadStageSchema),
  /** Expected value, already probability weighted, recovered after the modeled cycle. */
  expectedTerminalCasingCreditMxn: z.number().finite().min(0),
  terminalCasingEvidence: z.array(EvidenceReferenceSchema).min(1),
  currency: z.literal('MXN'),
  evidenceStatus: z.literal('EVIDENCED_FOR_TARGET_FLEET'),
}).strict().superRefine((value, context) => {
  let previousProbability = 1
  value.retreadStages.forEach((stage, index) => {
    if (stage.stage !== index + 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['retreadStages', index, 'stage'],
        message: 'Retread stages must be consecutive and start at 1',
      })
    }
    if (stage.reachProbability > previousProbability) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['retreadStages', index, 'reachProbability'],
        message: 'Cumulative reach probability cannot increase between stages',
      })
    }
    previousProbability = stage.reachProbability
  })
})

/**
 * Research-only lifecycle economics for one physical wheel position.
 *
 * Retreads are sequential uses of the original casing, never additional wheel
 * positions. Public price observations alone cannot satisfy this contract.
 */
export function deriveTireLifecycleCandidate(input: unknown) {
  const source = CompleteTireLifecycleSchema.parse(input)
  const expectedRetreadCostMxn = source.retreadStages.reduce(
    (total, stage) => total + stage.reachProbability * stage.installedCostMxn,
    0,
  )
  const expectedRetreadKm = source.retreadStages.reduce(
    (total, stage) => total + stage.reachProbability * stage.lifeKm,
    0,
  )
  const expectedLifecycleCostMxn = source.newTire.installedCostMxn
    + expectedRetreadCostMxn
    - source.expectedTerminalCasingCreditMxn
  const expectedLifecycleKm = source.newTire.lifeKm + expectedRetreadKm

  if (expectedLifecycleCostMxn <= 0 || expectedLifecycleKm <= 0) {
    throw new Error('Tire lifecycle must retain positive expected cost and distance')
  }

  const costMxnPerPhysicalTireKm = expectedLifecycleCostMxn / expectedLifecycleKm
  return {
    source,
    expectedLifecycleCostMxn,
    expectedLifecycleKm,
    costMxnPerPhysicalTireKm,
    vehicleCostMxnPerKm: source.quantityOnVehicle * costMxnPerPhysicalTireKm,
    retreadIsPhysicalPosition: false as const,
    adoptionStatus: 'RESEARCH_CANDIDATE' as const,
    quoteEligible: false as const,
    databaseWriteAllowed: false as const,
    publicationRequiresExplicitApproval: true as const,
  }
}

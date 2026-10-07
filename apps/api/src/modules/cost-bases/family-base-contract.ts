import {z} from 'zod'
// Existing extensionless pure-contract pattern works in both CJS API and Turbopack.
import {PlanningViewSchema,PlanningSelection} from './version-planning-contract'
const sha=z.string().regex(/^[a-f0-9]{64}$/)
/** Browser-safe technical projection; no server store, kernel or source pack. */
export const FamilyProposalViewSchema=z.object({context:PlanningViewSchema.shape.context,scope:PlanningViewSchema.shape.scope,
  revision:z.number().int().min(0).max(128),status:z.enum(['NONE','CURRENT','STALE']),
  latest:z.object({fingerprint:sha,versionFingerprint:sha,bindingSha256:sha,sourceSnapshotSha256:sha,sourceScenarioSha256:sha,
    receipt:z.object({revision:z.number().int().positive(),requestId:z.string().uuid(),commandSha256:sha}).strict(),
    selection:PlanningSelection,referencePeriod:z.literal('2026-09'),fixedEntryCount:z.literal(32),
    policyReference:z.object({file:z.string().min(1),sha256:sha,
      scope:z.literal('PUBLIC_PLANNING_VALIDATION_ONLY_NOT_OPERATIONAL_CALIBRATION_OR_ADOPTION')}).strict(),
    calibrated:z.literal(false),published:z.literal(false),adoptedValues:z.literal(0)}).strict().nullable(),
  appliedToParams:z.literal(false),quoteReady:z.literal(false),replayed:z.boolean().optional()}).strict()
export type FamilyProposalView=z.infer<typeof FamilyProposalViewSchema>

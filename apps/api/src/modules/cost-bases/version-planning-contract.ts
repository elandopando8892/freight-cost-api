import { z } from 'zod'
// Shared with Next/Turbopack; use the existing extensionless pure-contract pattern.
import { RelayQuery, RelayResponse } from '../engine/b2-own-relay-contract'

export const PLANNING_KIND = 'FCM_VERSION_PLANNING_V1' as const
const sha = z.string().regex(/^[a-f0-9]{64}$/)
const context = z.object({ orgId: z.string().min(1), baseId: z.string().min(1), versionId: z.string().min(1) }).strict()
export const PlanningSelection = RelayQuery.omit({ expectedSnapshot: true })
export const PlanningSave = z.object({ context, selection: PlanningSelection,
  expectedRevision: z.number().int().min(0).max(128), expectedVersionFingerprint: sha, expectedSnapshot: sha,
  requestId: z.string().uuid(), planningAccepted: z.literal(true), note: z.string().max(2000) }).strict()
export const PlanningRecord = z.object({ kind: z.literal(PLANNING_KIND), versionId: z.string().min(1), context,
  revision: z.number().int().min(1).max(128), requestId: z.string().uuid(), commandSha256: sha,
  savedAt: z.string().datetime(), savedBy: z.string().min(1), versionFingerprint: sha, bindingSha256: sha,
  selection: PlanningSelection, note: z.string().max(2000), planningAccepted: z.literal(true),
  calculation: RelayResponse }).strict()
export const PlanningViewSchema = z.object({ context, scope: z.object({ orgId: z.string().min(1), sub: z.string().min(1) }).strict(),
  versionFingerprint: sha, bindingSha256: sha, revision: z.number().int().min(0).max(128),
  latest: PlanningRecord.nullable(), editable: z.boolean(), appliedToParams: z.literal(false),
  replayed: z.boolean().optional() }).strict()
export type PlanningView = z.infer<typeof PlanningViewSchema>
export type PlanningCommand = z.infer<typeof PlanningSave>

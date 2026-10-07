import { z } from 'zod'

const text = z.string().trim().min(1).max(1000)
const days = z.object({ value: z.number().finite().nonnegative().max(1e6), unit: z.literal('days'),
  evidenceIds: z.array(text).min(1), derivation: text }).strict()

/** Offline research opt-in, NOT part of the HTTP/form schemas.
 * Explicit serial partition: attached MX + detached border + attached US.
 * A binational corporate group is not evidence of a shared physical tractor. */
export const TrailerAttachmentSchema = z.object({
  model: z.literal('FCM_SERIAL_TRAILER_ATTACHMENT_V1'),
  timeBasis: z.literal('COMPATIBLE_ELAPSED_DAYS_NOT_DRIVING_HOURS'),
  scope: z.literal('SERIAL_PHASES_NO_OVERLAP_OR_DUPLICATED_BORDER_WAIT'),
  mxTractorReference: text, usTractorReference: text,
  mxAttachedDays: days, borderDetachedDays: days, usAttachedDays: days,
  evidenceIds: z.array(text).min(1), derivation: text,
}).strict()

export function reviewTrailerAttachment(raw: unknown, trailerReference: string,
  nationalCycleDays: { mx: number | null; us: number | null }, sourceIds: string[]) {
  const input = TrailerAttachmentSchema.parse(raw)
  const issues: { field: string; code: string }[] = []
  if (input.mxTractorReference === input.usTractorReference) {
    issues.push({ field:'tractorReferences', code:'ONE_TRACTOR_TWO_NATIONAL_BUDGETS_UNSUPPORTED' })
  }
  if ([input.mxTractorReference,input.usTractorReference].includes(trailerReference)) {
    issues.push({ field:'tractorReferences', code:'TRACTOR_TRAILER_IDENTITY_COLLISION' })
  }
  const refs = new Set(sourceIds)
  const evidenceCoverage: Record<string,string[]> = {}
  for (const [field, evidenceIds] of [
    ['declaration',input.evidenceIds], ['mxAttachedDays',input.mxAttachedDays.evidenceIds],
    ['borderDetachedDays',input.borderDetachedDays.evidenceIds], ['usAttachedDays',input.usAttachedDays.evidenceIds],
  ] as const) {
    evidenceCoverage[field] = [...evidenceIds]
    if (new Set(evidenceIds).size !== evidenceIds.length) issues.push({field,code:'DUPLICATE_EVIDENCE_REFERENCE'})
    if (evidenceIds.some(id => !refs.has(id))) issues.push({field,code:'UNKNOWN_EVIDENCE_REFERENCE'})
  }
  for (const country of ['mx','us'] as const) {
    const duration = input[`${country}AttachedDays`].value
    if (duration === 0) issues.push({field:`${country}AttachedDays`,code:'ZERO_LOADED_ATTACHMENT_TIME'})
    if (nationalCycleDays[country] === null) issues.push({field:`${country}AttachedDays`,code:'NATIONAL_CYCLE_MISSING'})
    else if (duration > nationalCycleDays[country]!) {
      issues.push({field:`${country}AttachedDays`,code:'ATTACHMENT_EXCEEDS_TRACTOR_CYCLE'})
    }
  }
  return { lineage:input, issues, evidenceCoverage,
    minimumTrailerDays: input.mxAttachedDays.value + input.borderDetachedDays.value + input.usAttachedDays.value,
    calibrated:false, sourceStatus:'DOCUMENTED_UNVERIFIED' as const,
    assumptionsVerified:false, // references/partition declaration do not prove observed physical phases
  }
}

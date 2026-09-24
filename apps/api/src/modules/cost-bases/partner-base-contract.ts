import { z } from 'zod'
import { ThirdPartyCostSchema, calculateThirdPartyCost } from '../engine/third-party-cost.js'
import { partnerHash } from '../engine/partner-cost-snapshot.js'

/** Reusable economics exclude trip date and FX, which belong to each calculation. */
export const PartnerBaseTermsSchema = ThirdPartyCostSchema.omit({ serviceDate: true, fx: true })
export const PartnerBaseTripSchema = ThirdPartyCostSchema.pick({ serviceDate: true, fx: true })
const id = z.string().trim().min(1).max(200)
export const PublishedPartnerBaseSchema = z.object({
  orgId: id, costBaseId: id, versionId: id, version: z.number().int().positive(),
  model: z.literal('FCM_THIRD_PARTY_FLAT_V1'),
  baseStatus: z.literal('ACTIVE'), status: z.literal('PUBLISHED'), isActive: z.literal(true),
  terms: PartnerBaseTermsSchema,
}).strict()

/** Internal adapter only: the version must be loaded by the server, never accepted from a request. */
export function calculatePublishedPartnerBase(orgId: string, persistedVersion: unknown, trip: unknown) {
  const version = PublishedPartnerBaseSchema.parse(persistedVersion)
  if (version.orgId !== orgId) throw new Error('Partner cost base is unavailable for this organization.')
  const capture = PartnerBaseTripSchema.parse(trip)
  const report = calculateThirdPartyCost({ ...version.terms, ...capture })
  return {
    ...report,
    baseLineage: {
      costBaseId: version.costBaseId, versionId: version.versionId, version: version.version,
      model: version.model,
      termsChecksum: partnerHash(version.terms),
    },
  }
}

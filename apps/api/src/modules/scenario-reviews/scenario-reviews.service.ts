import type { ScenarioChange } from '../scenarios/scenario.service.js'
import { AssumptionVersionStatus, Prisma, Section } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { isQuoteCalculationSnapshot, verifyQuoteCalculationSnapshot } from '../quotes/quote-snapshot.js'
import type { QuoteCalculationSnapshot } from '../quotes/quote-snapshot.js'
import { buildScenario, unknownScenarioKeys } from '../scenarios/scenario.service.js'
import { lockAssumptionVersion, lockCostBaseLifecycle } from '../assumptions/assumption-version-lock.js'

export const SCENARIO_REVIEW_POLICY = 'HUMAN_REVIEW_ONLY_NO_AUTOMATIC_APPLY' as const

export function scenarioReviewEvidence(input: {
  sourceChecksum: string
  scenario: {
    changes: unknown
    baseline: unknown
    proposed: unknown
    delta: unknown
  }
}): Prisma.InputJsonObject {
  // JSON fields must be plain immutable data. Serialising here makes the
  // stored packet an explicit evidence snapshot rather than a live reference.
  return JSON.parse(JSON.stringify({
    policy: SCENARIO_REVIEW_POLICY,
    sourceChecksum: input.sourceChecksum,
    changes: input.scenario.changes,
    baseline: input.scenario.baseline,
    proposed: input.scenario.proposed,
    delta: input.scenario.delta,
    generatedAt: new Date().toISOString(),
  })) as Prisma.InputJsonObject
}

export function reviewDecisionBlocker(input: { status: string; createdById: string; reviewerId: string }) {
  if (input.status !== 'UNDER_REVIEW') return 'Only a scenario review under review can be decided.'
  if (input.createdById === input.reviewerId) return 'The requester cannot approve or reject their own scenario review.'
  return null
}

export function scenarioReviewChanges(changes: ScenarioChange[]) {
  return changes.map((change) => ({ key: change.key, value: change.value }))
}

function httpError(message: string, statusCode: number) { return Object.assign(new Error(message), { statusCode }) }

type StoredChange = { key: string; value: number }

function parseStoredChanges(changes: unknown): StoredChange[] {
  if (!Array.isArray(changes) || changes.length === 0 || changes.some((change) => !change || typeof change !== 'object' || typeof (change as StoredChange).key !== 'string' || !Number.isFinite((change as StoredChange).value))) {
    throw httpError('The scenario review does not contain a valid immutable change set.', 409)
  }
  return changes as StoredChange[]
}

export function approvedScenarioDraftValues(snapshot: QuoteCalculationSnapshot, changes: StoredChange[]) {
  const unknownKeys = unknownScenarioKeys(snapshot, changes)
  if (unknownKeys.length) throw httpError(`The approved review contains fields not present in the source snapshot: ${unknownKeys.join(', ')}.`, 409)
  // Recalculate once more from immutable evidence before values are copied.
  buildScenario(snapshot, changes)
  return { ...snapshot.input.params, ...Object.fromEntries(changes.map((change) => [change.key, change.value])) }
}

/**
 * Creates the next, inactive assumption-version draft from approved scenario
 * evidence. It intentionally has no publish, activate, quote, RateBook, or
 * Rateware side effect.
 */
export async function createDraftFromApprovedScenarioReview(input: { orgId: string; reviewId: string; actorId: string; note?: string }) {
  return prisma.$transaction(async (tx) => {
    const initial = await tx.scenarioReview.findFirstOrThrow({
      where: { id: input.reviewId, orgId: input.orgId },
      select: { quote: { select: { costBaseId: true, assumptionSetId: true } } },
    })
    if (!initial.quote.costBaseId || !initial.quote.assumptionSetId) {
      throw httpError('The source quote is not governed by both a cost base and an assumption version.', 422)
    }
    await lockCostBaseLifecycle(tx, input.orgId, initial.quote.costBaseId)
    await lockAssumptionVersion(tx, input.orgId, initial.quote.assumptionSetId)

    // Re-read every governed input after the shared locks. A concurrent base
    // archive or a duplicate draft request must be observed before creation.
    const review = await tx.scenarioReview.findFirstOrThrow({
      where: { id: input.reviewId, orgId: input.orgId },
      include: {
        quote: { select: { id: true, costBaseId: true, assumptionSetId: true, explanation: true } },
        derivedAssumptionSet: { select: { id: true, version: true, status: true, costBaseId: true } },
      },
    })
    if (review.derivedAssumptionSet) throw httpError(`This review already created draft version ${review.derivedAssumptionSet.version}.`, 409)
    if (review.status !== 'APPROVED') throw httpError('Only an approved scenario review can create an assumption-version draft.', 409)
    if (!review.quote.costBaseId || !review.quote.assumptionSetId) throw httpError('The source quote is not governed by both a cost base and an assumption version.', 422)
    const snapshot = (review.quote.explanation as { snapshot?: unknown } | null)?.snapshot
    if (!isQuoteCalculationSnapshot(snapshot) || snapshot.checksum !== review.sourceChecksum) throw httpError('The source quote snapshot no longer matches this review packet.', 409)
    const verification = verifyQuoteCalculationSnapshot(snapshot)
    if (!verification.reproducible) throw httpError('The source quote snapshot cannot be reproduced reliably.', 409)
    const changes = parseStoredChanges(review.changes)
    const snapshotValues = approvedScenarioDraftValues(snapshot, changes)

    const [base, sourceSet, newest] = await Promise.all([
      tx.costBase.findFirstOrThrow({ where: { id: review.quote.costBaseId, orgId: input.orgId }, select: { id: true, name: true, status: true } }),
      tx.assumptionSet.findFirstOrThrow({ where: { id: review.quote.assumptionSetId, orgId: input.orgId, costBaseId: review.quote.costBaseId }, include: { params: true } }),
      tx.assumptionSet.findFirst({ where: { orgId: input.orgId, costBaseId: review.quote.costBaseId }, select: { version: true }, orderBy: { version: 'desc' } }),
    ])
    if (base.status === 'ARCHIVED') throw httpError('Archived cost bases cannot receive a new assumption-version draft.', 409)
    const sourceByKey = new Map(sourceSet.params.map((param) => [`${param.section}__${param.field}`, param]))
    const missingMetadata = Object.keys(snapshotValues).filter((key) => !sourceByKey.has(key))
    if (missingMetadata.length) throw httpError(`The governed source version is missing parameter metadata required by the snapshot: ${missingMetadata.join(', ')}.`, 409)
    const created = await tx.assumptionSet.create({
      data: {
        orgId: input.orgId,
        costBaseId: base.id,
        name: base.name,
        version: (newest?.version ?? 0) + 1,
        isActive: false,
        status: AssumptionVersionStatus.DRAFT,
        applicabilityContext: sourceSet.applicabilityContext == null
          ? Prisma.DbNull
          : sourceSet.applicabilityContext as Prisma.InputJsonValue,
        sourceVersionId: sourceSet.id,
        notes: input.note ?? `Draft from approved scenario review ${review.id}; source quote ${review.quote.id}; snapshot ${review.sourceChecksum}.`,
        auditEvents: { create: { orgId: input.orgId, actorId: input.actorId, action: 'DRAFT_CREATED', toStatus: 'DRAFT', note: `Created from approved scenario review ${review.id}.` } },
        // The parameter values come only from the quote snapshot plus the
        // approved overrides. Current source-version values are never reused.
        params: { create: Object.entries(snapshotValues).map(([key, value]) => {
          const param = sourceByKey.get(key)!
          return {
          definitionId: param.definitionId,
          section: param.section as Section,
          field: param.field,
          value,
          unit: param.unit,
          low: param.low,
          high: param.high,
          updateFrequency: param.updateFrequency,
          costBehavior: param.costBehavior,
          activation: param.activation,
          purpose: param.purpose,
          notes: param.notes,
          }
        }) },
      },
      include: { _count: { select: { params: true } }, auditEvents: { select: { id: true, action: true, note: true, createdAt: true } } },
    })
    await tx.scenarioReview.update({ where: { id: review.id }, data: { derivedAssumptionSetId: created.id } })
    return created
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

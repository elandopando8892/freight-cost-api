import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import type { Prisma } from '@prisma/client'
import { lockAssumptionVersion, lockOrganizationLifecycle } from '../assumptions/assumption-version-lock.js'
import { readOwnRelayReview } from '../engine/b2-own-relay-review.js'
import { createVersionWizard } from './cost-base-wizard-version.js'
import { WizardDraftError, type WizardCatalog } from './cost-base-wizard-draft.js'
import { PLANNING_KIND, PlanningRecord, PlanningSave, type PlanningView } from './version-planning-contract.js'
import { tracePlanningTransaction, type PlanningTraceObserver } from './planning-transaction-trace.js'
import { planningCalculationMatches } from './planning-calculation-recovery.js'

type Actor = { orgId: string; sub: string; role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }
type Transaction = <T>(work: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
  if (v && typeof v === 'object') return `{${Object.entries(v).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
  return JSON.stringify(v)
}
const digest = (v: unknown) => createHash('sha256').update(canonical(v)).digest('hex')
const fail = (code: string, status = 409): never => { throw new WizardDraftError(code, status) }

/** Version-bound planning snapshots. Existing B2 reader is the only economic producer. */
export function createVersionPlanning(transaction: Transaction, catalog: WizardCatalog, observer?: PlanningTraceObserver) {
  function authorize(actor: Actor) {
    if (!actor.sub || !actor.orgId || !['ADMIN','OPERATOR'].includes(actor.role)) fail('Forbidden',403)
  }
  async function load(tx: Prisma.TransactionClient, actor: Actor, baseId: string, versionId: string) {
    const wizard = await createVersionWizard(work => work(tx),catalog).read(actor,baseId,versionId)
    if (!wizard.reviewContext) fail('PLANNING_REVIEW_BINDING_REQUIRED',422)
    const context = { orgId: actor.orgId, baseId, versionId }
    const events = await tx.costBaseAuditEvent.findMany({ where: { orgId: actor.orgId, costBaseId: baseId,
      action: 'METADATA_UPDATED', AND: [{ payload: { path:['kind'],equals:PLANNING_KIND } },
        { payload: { path:['versionId'],equals:versionId } }] }, select:{ payload:true,actorId:true },take:129 })
    if (events.length > 128) fail('PLANNING_HISTORY_LIMIT')
    const records = events.map(e => {
      const p = PlanningRecord.safeParse(e.payload)
      const record = p.success ? p.data : fail('PLANNING_HISTORY_INVALID')
      if (!isDeepStrictEqual(record.context,context) || record.versionId !== versionId || record.savedBy !== e.actorId
        || record.bindingSha256 !== wizard.reviewContext!.bindingSha256) fail('PLANNING_HISTORY_INVALID')
      const originalCommand = {context:record.context,selection:record.selection,expectedRevision:record.revision-1,
        expectedVersionFingerprint:record.versionFingerprint,expectedSnapshot:record.calculation.sha256,
        requestId:record.requestId,planningAccepted:true,note:record.note}
      if (digest({command:originalCommand,actorId:record.savedBy}) !== record.commandSha256) fail('PLANNING_HISTORY_INVALID')
      const verified = readOwnRelayReview({ ...record.selection,expectedSnapshot:record.calculation.sha256 },
        { orgId:actor.orgId,sub:record.savedBy })
      if (!planningCalculationMatches(record.calculation,verified)) fail('PLANNING_RESULT_CORRUPTED')
      return {...record,calculation:verified}
    }).sort((a,b) => a.revision-b.revision)
    if (records.some((r,i) => r.revision !== i+1) || new Set(records.map(r=>r.requestId)).size !== records.length)
      fail('PLANNING_HISTORY_INVALID')
    const latest = records.at(-1) ?? null
    const editable = wizard.version.status === 'DRAFT' && !wizard.version.isActive && wizard.version.base.status !== 'ARCHIVED'
    const view: PlanningView = { context,scope:{orgId:actor.orgId,sub:actor.sub},
      versionFingerprint:wizard.versionFingerprint,bindingSha256:wizard.reviewContext!.bindingSha256,
      revision:records.length,latest,editable,appliedToParams:false }
    return { view,records }
  }
  return {
    read(actor: Actor, baseId: string, versionId: string) {
      authorize(actor); return transaction(async tx => (await load(tx,actor,baseId,versionId)).view)
    },
    save(actor: Actor, baseId: string, versionId: string, raw: unknown) {
      authorize(actor)
      const command = PlanningSave.parse(raw), context = {orgId:actor.orgId,baseId,versionId}
      if (!isDeepStrictEqual(command.context,context)) fail('PLANNING_CONTEXT_MISMATCH',403)
      // Actor is part of idempotency ownership; another account cannot replay its receipt.
      const commandSha256 = digest({command,actorId:actor.sub})
      return tracePlanningTransaction(transaction,observer,async (tx,step) => {
        await step('organization-lock',()=>lockOrganizationLifecycle(tx,actor.orgId))
        await step('version-lock',()=>lockAssumptionVersion(tx,actor.orgId,versionId))
        const { view,records } = await step('read',()=>load(tx,actor,baseId,versionId))
        const record = await step('validate',()=>{
          const existing = records.find(r=>r.requestId===command.requestId)
          if (existing) {
            if (existing.commandSha256 !== commandSha256) fail('PLANNING_REQUEST_ID_REUSED')
            return null
          }
          if (!view.editable) fail('VERSION_NOT_EDITABLE')
          if (view.versionFingerprint !== command.expectedVersionFingerprint) fail('WIZARD_VERSION_CHANGED')
          if (view.revision !== command.expectedRevision) fail('PLANNING_REVISION_CONFLICT')
          if (view.revision >= 128) fail('PLANNING_HISTORY_LIMIT')
          const calculation = readOwnRelayReview({...command.selection,expectedSnapshot:command.expectedSnapshot},view.scope)
          return PlanningRecord.parse({kind:PLANNING_KIND,versionId,context,revision:view.revision+1,
            requestId:command.requestId,commandSha256,savedAt:new Date().toISOString(),savedBy:actor.sub,
            versionFingerprint:view.versionFingerprint,bindingSha256:view.bindingSha256,
            selection:command.selection,note:command.note,planningAccepted:true,calculation})
        })
        if (!record) return {...view,replayed:true}
        await step('append',()=>tx.costBaseAuditEvent.create({data:{orgId:actor.orgId,costBaseId:baseId,actorId:actor.sub,
          action:'METADATA_UPDATED',note:`Planning calculation revision ${record.revision}; no parameter adoption.`,
          payload:JSON.parse(JSON.stringify(record)) as Prisma.InputJsonValue}}))
        return {...view,revision:record.revision,latest:record,replayed:false}
      })
    },
  }
}

import { createHash } from 'node:crypto'
import { Prisma, type AssumptionParam, type AssumptionSet, type CostBase } from '@prisma/client'
import { PARAMETER_DEFINITIONS } from '../../src/data/parameter-catalog.js'
import { assertAssumptionValueDomain } from '../../src/modules/assumptions/assumption-domain.js'
import { buildWizardReviewBinding } from '../../src/modules/cost-bases/cost-base-wizard-review-context.js'
import type { WizardCatalog } from '../../src/modules/cost-bases/cost-base-wizard-draft.js'
import { assertW2GateOpen, w2GateRoleSql } from '../../src/config/w2-local-gate.js'

export const W2_ORG = 'cmsqrb5ye0001q7mn6i4dbx2b'
export const W2_SOURCE = 'cmsqufvfh0004pn7gp3c35crj'
export const W2_SOURCE_BASE = 'cmsqufvfb0002pn7gxy5i7cke'
export const W2_REVIEW_CODE = 'W2-QA-BINATIONAL-20261004'
export const w2Digest = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex')
type Source = AssumptionSet & { params: AssumptionParam[] }

/** Explicit projection matches the application's existing clone fields.
 * No economic defaults, overrides, calibration or profile parsing. */
export function w2CloneParams(params: readonly AssumptionParam[]) {
  return params.map(({ definitionId, section, field, value, unit, low, high, updateFrequency, costBehavior, activation, purpose, notes }) =>
    ({ definitionId, section, field, value, unit, low, high, updateFrequency, costBehavior, activation, purpose, notes }))
    .sort((a,b) => `${a.section}:${a.field}`.localeCompare(`${b.section}:${b.field}`))
}
export function assertW2Source(source: Source, base: CostBase, expectedHash: string) {
  if (source.id !== W2_SOURCE || source.orgId !== W2_ORG || source.costBaseId !== W2_SOURCE_BASE
    || source.status !== 'PUBLISHED' || !source.isActive || w2Digest(source) !== expectedHash
    || base.id !== W2_SOURCE_BASE || base.orgId !== W2_ORG || base.status !== 'ACTIVE'
    || base.scope !== 'CROSS_BORDER' || base.operationalSegment !== null || source.applicabilityContext !== null)
    throw new Error('W2 source inventory changed')
  const expected = new Set(PARAMETER_DEFINITIONS.map(p => `${p.section}:${p.field}`))
  const actual = new Set(source.params.map(p => `${p.section}:${p.field}`))
  if (source.params.length !== 210 || actual.size !== 210 || expected.size !== 210 || [...expected].some(k=>!actual.has(k)))
    throw new Error('W2 source canonical inventory changed')
  for (const p of source.params) assertAssumptionValueDomain(p)
}

/** Only called inside the administrative child's one atomic transaction.
 * Not exported as an HTTP capability. Role/password never enter a web payload. */
export async function prepareW2Review(tx: Prisma.TransactionClient, input: {
  actorId: string; sourceHash: string; baseHash: string; catalog: WizardCatalog; password: string; expiresAt: string
}, observePhase?: (phase: import('./w2-safe-diagnostic.js').W2PreparationPhase) => void) {
  observePhase?.('source-check')
  assertW2GateOpen()
  await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"=${W2_ORG} FOR UPDATE`
  await tx.$queryRaw`SELECT "id" FROM "AssumptionSet" WHERE "id"=${W2_SOURCE} AND "orgId"=${W2_ORG} FOR UPDATE`
  const source = await tx.assumptionSet.findUniqueOrThrow({where:{id:W2_SOURCE},include:{params:{orderBy:{id:'asc'}}}})
  const base = await tx.costBase.findUniqueOrThrow({where:{id:W2_SOURCE_BASE}})
  assertW2Source(source,base,input.sourceHash)
  if (w2Digest(base)!==input.baseHash || await tx.costBase.count({where:{orgId:W2_ORG,code:W2_REVIEW_CODE}}))
    throw new Error('W2 base inventory changed')
  const actor = await tx.user.findFirst({where:{id:input.actorId,orgId:W2_ORG,role:'ADMIN'},select:{id:true,supabaseId:true}})
  if (!actor || !/^[a-f0-9-]{36}$/i.test(actor.supabaseId)) throw new Error('W2 linked admin required')
  if (w2Digest({profile:input.catalog.profile,cards:input.catalog.cards})!==input.catalog.revision)
    throw new Error('W2 catalog changed')
  const roleSql=w2GateRoleSql(input.password,input.expiresAt)
  observePhase?.('clone')
  const created=await tx.costBase.create({data:{orgId:W2_ORG,code:W2_REVIEW_CODE,
    name:'W2 QA Binacional - NO COMERCIAL',description:'Historical economic clone for bound B2 review only; not calibrated, activated or commercial.',
    scope:'CROSS_BORDER',status:'DRAFT',isDefault:false,operationalSegment:null,defaultPolicy:base.defaultPolicy,currency:base.currency,
    versions:{create:{orgId:W2_ORG,name:'W2 QA Binacional - NO COMERCIAL',version:1,status:'DRAFT',isActive:false,
      sourceVersionId:source.id,applicabilityContext:Prisma.DbNull,calibrationEvidence:Prisma.DbNull,
      notes:`Authorized W2 review clone of ${source.id}; raw economic context preserved; no adoption.`,
      params:{create:w2CloneParams(source.params)}}}},select:{id:true,versions:{select:{id:true}}}})
  const version=await tx.assumptionSet.findUniqueOrThrow({where:{id:created.versions[0].id},include:{params:true,costBase:true}})
  if (!version.costBase || w2Digest(w2CloneParams(version.params))!==w2Digest(w2CloneParams(source.params)))
    throw new Error('W2 clone economic mismatch')
  observePhase?.('binding')
  const binding=buildWizardReviewBinding({orgId:W2_ORG,baseId:created.id,versionId:version.id},version as typeof version & {costBase:CostBase},input.catalog)
  await tx.costBaseAuditEvent.create({data:{orgId:W2_ORG,costBaseId:created.id,actorId:actor.id,action:'METADATA_UPDATED',
    note:'Authorized W2 noncommercial review binding. Historical economics unchanged; not a calibrated carrier base.',
    payload:binding as unknown as Prisma.InputJsonValue}})
  assertW2GateOpen()
  observePhase?.('role')
  for (const sql of roleSql) { assertW2GateOpen(); await tx.$executeRawUnsafe(sql) }
  return {baseId:created.id,versionId:version.id,params:version.params.length,bindingSha256:w2Digest(binding)}
}

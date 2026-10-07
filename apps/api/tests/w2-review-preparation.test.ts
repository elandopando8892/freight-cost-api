import { afterEach, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'
import { DEFAULT_ASSUMPTIONS } from '../src/data/default-assumptions.js'
import snapshot from '../src/modules/cost-bases/cost-base-wizard.catalog.json'
import type { WizardCatalog } from '../src/modules/cost-bases/cost-base-wizard-draft.js'
import { W2_GATE_DEADLINE } from '../src/config/w2-local-gate.js'
import { assertW2Source, prepareW2Review, w2CloneParams, w2Digest, W2_SOURCE, W2_SOURCE_BASE, W2_ORG } from '../scripts/lib/w2-review-preparation.js'
const catalog=snapshot as unknown as WizardCatalog
afterEach(()=>vi.restoreAllMocks())
function fixture() {
  vi.spyOn(Date,'now').mockReturnValue(Date.parse(W2_GATE_DEADLINE)-30*60*1000)
  const params=DEFAULT_ASSUMPTIONS.map((p,i)=>({...p,id:`param-${i}`,setId:W2_SOURCE,definitionId:null,
    low:p.low??null,high:p.high??null,notes:null,purpose:null,updatedAt:new Date('2026-09-01T00:00:00Z')})) as any[]
  const source:any={id:W2_SOURCE,orgId:W2_ORG,costBaseId:W2_SOURCE_BASE,status:'PUBLISHED',isActive:true,applicabilityContext:null,params}
  const base:any={id:W2_SOURCE_BASE,orgId:W2_ORG,scope:'CROSS_BORDER',status:'ACTIVE',operationalSegment:null,defaultPolicy:'OPERATIONAL_V3',currency:'USD'}
  const clone:any={id:'clone-version',status:'DRAFT',isActive:false,updatedAt:new Date('2026-10-04T23:15:00Z'),applicabilityContext:null,
    params:structuredClone(params),costBase:{id:'clone-base',name:'W2 QA Binacional - NO COMERCIAL',scope:'CROSS_BORDER',status:'DRAFT',operationalSegment:null}}
  const tx:any={$queryRaw:vi.fn(async()=>[]),$executeRawUnsafe:vi.fn(async()=>0),
    assumptionSet:{findUniqueOrThrow:vi.fn(async({where}:any)=>where.id===W2_SOURCE?source:clone)},
    costBase:{findUniqueOrThrow:vi.fn(async()=>base),count:vi.fn(async()=>0),create:vi.fn(async()=>({id:'clone-base',versions:[{id:'clone-version'}]}))},
    user:{findFirst:vi.fn(async()=>({id:'admin',supabaseId:'11111111-1111-4111-8111-111111111111'}))},
    costBaseAuditEvent:{create:vi.fn(async({data}:any)=>data)}}
  const input={actorId:'admin',sourceHash:w2Digest(source),baseHash:w2Digest(base),catalog,password:'a'.repeat(64),expiresAt:'2026-10-05T23:15:00.000Z'}
  return {params,source,base,clone,tx,input}
}
it('creates an unclassified raw economic clone and only a separate bound review profile',async()=>{
  const f=fixture(),before=w2Digest(f.source)
  const result=await prepareW2Review(f.tx,f.input)
  expect(result).toMatchObject({baseId:'clone-base',versionId:'clone-version',params:210})
  const data=f.tx.costBase.create.mock.calls[0][0].data
  expect(data).toMatchObject({scope:'CROSS_BORDER',status:'DRAFT',isDefault:false,operationalSegment:null})
  expect(data.versions.create).toMatchObject({status:'DRAFT',isActive:false,sourceVersionId:W2_SOURCE})
  expect(data.versions.create.applicabilityContext).toBe(Prisma.DbNull)
  expect(data.versions.create.calibrationEvidence).toBe(Prisma.DbNull)
  expect(w2Digest(data.versions.create.params.create)).toBe(w2Digest(w2CloneParams(f.params)))
  const event=f.tx.costBaseAuditEvent.create.mock.calls[0][0].data
  expect(event.payload).toMatchObject({kind:'FCM_WIZARD_REVIEW_BINDING_V1',commercial:false,appliedToParams:false,economicProfileChanged:false,
    profile:{tractorPolicy:'OWN_MX_US_RELAY_SAME_TRAILER'},context:{orgId:W2_ORG,baseId:'clone-base',versionId:'clone-version'}})
  expect(f.tx.$executeRawUnsafe.mock.calls[0][0]).toContain('CREATE ROLE fcm_w2_local_20261004')
  expect(w2Digest(f.source)).toBe(before)
  expect(JSON.stringify(data)).not.toContain('THROUGH_TRACTOR')
})
it('preserves every cloned economic/metadata field, excluding identities and update timestamp',()=>{
  const f=fixture(), cloned=w2CloneParams(f.params)
  expect(cloned[0]).toHaveProperty('definitionId');expect(cloned[0]).toHaveProperty('purpose')
  expect(cloned[0]).not.toHaveProperty('id');expect(cloned[0]).not.toHaveProperty('setId');expect(cloned[0]).not.toHaveProperty('updatedAt')
  expect(w2CloneParams([...f.params].reverse())).toEqual(cloned)
})
it.each(['orgId','id','costBaseId','status','isActive','applicabilityContext'])('rejects changed source %s before creating anything',async key=>{
  const f=fixture();f.source[key]=key==='isActive'?false:'changed'
  await expect(prepareW2Review(f.tx,f.input)).rejects.toThrow()
  expect(f.tx.costBase.create).not.toHaveBeenCalled();expect(f.tx.$executeRawUnsafe).not.toHaveBeenCalled()
})
it('rejects wrong canonical inventory even when its new hash is supplied',()=>{
  const f=fixture();f.source.params[0].field='unknown'
  expect(()=>assertW2Source(f.source,f.base,w2Digest(f.source))).toThrow('canonical inventory')
})
it('rejects numerical source corruption instead of inserting fallback defaults',()=>{
  const f=fixture();f.source.params[0].value=NaN
  expect(()=>assertW2Source(f.source,f.base,w2Digest(f.source))).toThrow()
})
it('rejects changed base hash or existing target before mutation',async()=>{
  const f=fixture();f.input.baseHash='b'.repeat(64)
  await expect(prepareW2Review(f.tx,f.input)).rejects.toThrow('base inventory')
  expect(f.tx.costBase.create).not.toHaveBeenCalled()
  f.input.baseHash=w2Digest(f.base);f.tx.costBase.count.mockResolvedValue(1)
  await expect(prepareW2Review(f.tx,f.input)).rejects.toThrow('base inventory')
})
it('requires the existing linked ADMIN and valid catalog before mutation',async()=>{
  const f=fixture();f.tx.user.findFirst.mockResolvedValue(null)
  await expect(prepareW2Review(f.tx,f.input)).rejects.toThrow('linked admin')
  expect(f.tx.costBase.create).not.toHaveBeenCalled()
})
it('rejects corrupted catalog and unsafe role inputs before creating a clone',async()=>{
  const f=fixture();f.input.catalog={...catalog,revision:'a'.repeat(64)}
  await expect(prepareW2Review(f.tx,f.input)).rejects.toThrow('catalog changed')
  f.input.catalog=catalog;f.input.password="';bad"
  await expect(prepareW2Review(f.tx,f.input)).rejects.toThrow('Invalid role inputs')
  expect(f.tx.costBase.create).not.toHaveBeenCalled()
})
it('fails clone verification before binding or DDL so the outer transaction can roll back',async()=>{
  const f=fixture();f.clone.params[0].value+=1
  await expect(prepareW2Review(f.tx,f.input)).rejects.toThrow('economic mismatch')
  expect(f.tx.costBaseAuditEvent.create).not.toHaveBeenCalled();expect(f.tx.$executeRawUnsafe).not.toHaveBeenCalled()
})
it('denies an expired cut before reading or mutating',async()=>{
  const f=fixture();vi.mocked(Date.now).mockReturnValue(Date.parse(W2_GATE_DEADLINE))
  await expect(prepareW2Review(f.tx,f.input)).rejects.toThrow('authorized window')
  expect(f.tx.$queryRaw).not.toHaveBeenCalled();expect(f.tx.costBase.create).not.toHaveBeenCalled()
})

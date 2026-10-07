import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { buildWizardReferenceCatalog, type WizardCatalog, WIZARD_SOURCE_PINS } from '../src/modules/cost-bases/cost-base-wizard-draft.js'
import { createVersionWizard, WIZARD_VERSION_METADATA_KIND } from '../src/modules/cost-bases/cost-base-wizard-version.js'
import { defaultCostBaseProfile } from '../src/modules/cost-bases/cost-base-profile.js'
import snapshot from '../src/modules/cost-bases/cost-base-wizard.catalog.json'
import { WIZARD_REVIEW_BINDING_KIND } from '../src/modules/cost-bases/cost-base-wizard-review-context.js'

const catalog = snapshot as unknown as WizardCatalog
const admin = { orgId:'org-A',sub:'actor-A',role:'ADMIN' as const }
const version = () => ({ id:'version-A',orgId:'org-A',costBaseId:'base-A',name:'QA draft',version:2,status:'DRAFT',isActive:false,
  updatedAt:new Date('2026-10-04T00:00:00Z'),applicabilityContext:defaultCostBaseProfile('CROSS_BORDER'),
  params:[{section:'FUEL',field:'Diesel MX',value:28,unit:'MXN/L'}],
  costBase:{id:'base-A',name:'QA base',scope:'CROSS_BORDER',operationalSegment:'D2D_BINATIONAL_OWN',status:'DRAFT'} })
function fixture() {
  const row=version(), events:any[]=[]
  const tx={ $queryRaw:vi.fn(async()=>[]),
    assumptionSet:{findFirst:vi.fn(async({where}:any)=>where.id===row.id&&where.orgId===row.orgId&&where.costBaseId===row.costBaseId?structuredClone(row):null)},
    costBaseAuditEvent:{findMany:vi.fn(async({where,take}:any)=>events.filter(e=>e.orgId===where.orgId&&e.costBaseId===where.costBaseId
      &&(where.AND[0].OR ? where.AND[0].OR.some((rule:any)=>rule.payload.equals===e.payload.kind) : e.payload.kind===where.AND[0].payload.equals)
      &&e.payload.versionId===where.AND[1].payload.equals).slice(0,take).map(e=>({payload:structuredClone(e.payload)}))),
      create:vi.fn(async({data}:any)=>{events.push(structuredClone(data));return data})},
  }
  let queue=Promise.resolve()
  const transaction=<T>(work:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>=>{
    const result=queue.then(()=>work(tx as unknown as Prisma.TransactionClient));queue=result.then(()=>{},()=>{});return result
  }
  const module=createVersionWizard(transaction,catalog)
  const command=(view:Awaited<ReturnType<typeof module.read>>,id='diesel-mx')=>{
    const card=catalog.cards.find(c=>c.id===id)!
    return {context:view.draft.context,expectedRevision:view.draft.revision,expectedVersionFingerprint:view.versionFingerprint,
      requestId:randomUUID(),decisions:[{conceptId:id,referenceRevision:catalog.revision,mode:'MARKSMAN',value:card.standard.value,
        identification:'PARTIAL',justification:'QA only: reference not productive adoption.',provisionalAccepted:true}]}
  }
  return {module,row,events,tx,command}
}
describe('version wizard with simulated transactional persistence',()=>{
  it('loads wizard history in one bounded audit query',async()=>{
    const f=fixture();await f.module.read(admin,'base-A','version-A')
    expect(f.tx.costBaseAuditEvent.findMany).toHaveBeenCalledTimes(1)
    expect(f.tx.costBaseAuditEvent.findMany.mock.calls[0][0].take).toBe(130)
  })
  it('still rejects more than 128 proposals before restoring their payloads',async()=>{
    const f=fixture()
    for(let i=0;i<129;i++)f.events.push({orgId:admin.orgId,costBaseId:'base-A',payload:{kind:WIZARD_VERSION_METADATA_KIND,versionId:'version-A'}})
    await expect(f.module.read(admin,'base-A','version-A')).rejects.toThrow('WIZARD_METADATA_LIMIT')
    expect(f.tx.costBaseAuditEvent.create).not.toHaveBeenCalled()
  })
  it.each(['binding-first','binding-last'])('keeps mixed-history overflow fail-closed with %s',async order=>{
    const f=fixture()
    const event=(kind:string)=>({orgId:admin.orgId,costBaseId:'base-A',payload:{kind,versionId:'version-A'}})
    f.events.push(...Array.from({length:129},()=>event(WIZARD_VERSION_METADATA_KIND)))
    if(order==='binding-first')f.events.unshift(event(WIZARD_REVIEW_BINDING_KIND))
    else f.events.push(event(WIZARD_REVIEW_BINDING_KIND))
    await expect(f.module.read(admin,'base-A','version-A')).rejects.toThrow('WIZARD_METADATA_LIMIT')
    expect(f.tx.costBaseAuditEvent.create).not.toHaveBeenCalled()
  })
  it('rejects duplicate bindings even beside a full proposal history',async()=>{
    const f=fixture()
    for(const kind of [WIZARD_REVIEW_BINDING_KIND,WIZARD_REVIEW_BINDING_KIND,...Array(128).fill(WIZARD_VERSION_METADATA_KIND)])
      f.events.push({orgId:admin.orgId,costBaseId:'base-A',payload:{kind,versionId:'version-A'}})
    await expect(f.module.read(admin,'base-A','version-A')).rejects.toThrow('WIZARD_REVIEW_BINDING_AMBIGUOUS')
    expect(f.tx.costBaseAuditEvent.create).not.toHaveBeenCalled()
  })
  it('packaged catalog exactly matches pinned local evidence',()=>{
    const root=new URL('../../../',import.meta.url)
    expect(snapshot).toEqual(buildWizardReferenceCatalog({fuel:readFileSync(new URL(WIZARD_SOURCE_PINS.fuel.file,root),'utf8'),
      maintenance:readFileSync(new URL(WIZARD_SOURCE_PINS.maintenance.file,root),'utf8')}))
  })
  it('read is scoped to the requested org/base/version and writes nothing',async()=>{
    const f=fixture(),view=await f.module.read(admin,'base-A','version-A')
    expect(view.draft.revision).toBe(0);expect(view.appliedToParams).toBe(false);expect(f.events).toHaveLength(0)
    expect(f.tx.assumptionSet.findFirst).toHaveBeenCalledWith(expect.objectContaining({where:{id:'version-A',orgId:'org-A',costBaseId:'base-A'}}))
  })
  it.each([['org-B','base-A','version-A'],['org-A','base-B','version-A'],['org-A','base-A','version-B']])('cannot resolve %s/%s/%s',async(orgId,baseId,versionId)=>{
    const f=fixture();await expect(f.module.read({...admin,orgId},baseId,versionId)).rejects.toMatchObject({statusCode:404});expect(f.events).toHaveLength(0)
  })
  it('saves metadata atomically with actor attribution and unchanged canonical parameters',async()=>{
    const f=fixture(),before=structuredClone(f.row),view=await f.module.read(admin,'base-A','version-A')
    const result=await f.module.save(admin,'base-A','version-A',f.command(view))
    expect(result.draft.revision).toBe(1);expect(f.events).toHaveLength(1);expect(f.row).toEqual(before)
    expect(f.events[0]).toMatchObject({action:'METADATA_UPDATED',actorId:admin.sub,payload:{kind:WIZARD_VERSION_METADATA_KIND,versionId:'version-A'}})
    expect(f.tx.$queryRaw).toHaveBeenCalledTimes(2)
    expect((await f.module.read(admin,'base-A','version-A')).draft).toEqual(result.draft)
  })
  it.each(['OPERATOR','VIEWER'] as const)('does not let %s write or acquire writer locks',async role=>{
    const f=fixture(),view=await f.module.read(admin,'base-A','version-A')
    await expect(f.module.save({...admin,role},'base-A','version-A',f.command(view))).rejects.toMatchObject({statusCode:403})
    expect(f.events).toHaveLength(0);expect(f.tx.$queryRaw).not.toHaveBeenCalled()
  })
  it('rejects client-supplied ownership even for ADMIN',async()=>{
    const f=fixture(),view=await f.module.read(admin,'base-A','version-A'),command=f.command(view)
    command.context={...command.context,orgId:'org-B'}
    await expect(f.module.save(admin,'base-A','version-A',command)).rejects.toMatchObject({statusCode:403});expect(f.events).toHaveLength(0)
  })
  it.each(['PUBLISHED','ARCHIVED'])('keeps %s versions read-only',async status=>{
    const f=fixture();f.row.status=status;const view=await f.module.read(admin,'base-A','version-A')
    await expect(f.module.save(admin,'base-A','version-A',f.command(view))).rejects.toThrow('VERSION_NOT_EDITABLE');expect(f.events).toHaveLength(0)
  })
  it('rejects active drafts, archived bases and changed status after load',async()=>{
    for(const mutation of [(r:ReturnType<typeof version>)=>{r.isActive=true},(r:ReturnType<typeof version>)=>{r.costBase.status='ARCHIVED'},(r:ReturnType<typeof version>)=>{r.status='PUBLISHED'}]){
      const f=fixture(),view=await f.module.read(admin,'base-A','version-A');mutation(f.row)
      await expect(f.module.save(admin,'base-A','version-A',f.command(view))).rejects.toThrow('VERSION_NOT_EDITABLE');expect(f.events).toHaveLength(0)
    }
  })
  it('rejects parameter or profile edits that occurred outside the wizard',async()=>{
    for(const mutation of [(r:ReturnType<typeof version>)=>{r.params[0].value=30},(r:ReturnType<typeof version>)=>{r.applicabilityContext.services=['Roundtrip']}]){
      const f=fixture(),view=await f.module.read(admin,'base-A','version-A');mutation(f.row)
      await expect(f.module.save(admin,'base-A','version-A',f.command(view))).rejects.toThrow('WIZARD_VERSION_CHANGED');expect(f.events).toHaveLength(0)
    }
  })
  it('exact replay writes no new event and UUID content reuse fails',async()=>{
    const f=fixture(),command=f.command(await f.module.read(admin,'base-A','version-A'))
    await f.module.save(admin,'base-A','version-A',command)
    expect((await f.module.save(admin,'base-A','version-A',command)).replayed).toBe(true);expect(f.events).toHaveLength(1)
    command.decisions[0].justification='Different intent'
    await expect(f.module.save(admin,'base-A','version-A',command)).rejects.toThrow('REQUEST_ID_REUSED');expect(f.events).toHaveLength(1)
  })
  it('two same-revision writers have one winner and no lost update',async()=>{
    const f=fixture(),view=await f.module.read(admin,'base-A','version-A')
    const result=await Promise.allSettled([f.module.save(admin,'base-A','version-A',f.command(view)),f.module.save(admin,'base-A','version-A',f.command(view))])
    expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(f.events).toHaveLength(1)
  })
  it('latest revision is selected independent of timestamps/list order',async()=>{
    const f=fixture();await f.module.save(admin,'base-A','version-A',f.command(await f.module.read(admin,'base-A','version-A')))
    await f.module.save(admin,'base-A','version-A',f.command(await f.module.read(admin,'base-A','version-A'),'diesel-us'))
    f.events.reverse();expect((await f.module.read(admin,'base-A','version-A')).draft.decisions).toHaveLength(2)
  })
  it('partial rereview after external edit does not mark every decision current',async()=>{
    const f=fixture();await f.module.save(admin,'base-A','version-A',f.command(await f.module.read(admin,'base-A','version-A')))
    await f.module.save(admin,'base-A','version-A',f.command(await f.module.read(admin,'base-A','version-A'),'diesel-us'))
    f.row.params[0].value=31
    expect((await f.module.read(admin,'base-A','version-A')).staleForVersion).toBe(true)
    await f.module.save(admin,'base-A','version-A',f.command(await f.module.read(admin,'base-A','version-A')))
    expect((await f.module.read(admin,'base-A','version-A')).staleForVersion).toBe(true)
    await f.module.save(admin,'base-A','version-A',f.command(await f.module.read(admin,'base-A','version-A'),'diesel-us'))
    expect((await f.module.read(admin,'base-A','version-A')).staleForVersion).toBe(false)
  })
  it('metadata corruption fails closed without resetting or writing',async()=>{
    const f=fixture();await f.module.save(admin,'base-A','version-A',f.command(await f.module.read(admin,'base-A','version-A')))
    f.events[0].payload.draft.productiveAdoptions=1
    await expect(f.module.read(admin,'base-A','version-A')).rejects.toThrow();expect(f.events).toHaveLength(1)
  })
  it('unsupported or missing operating profile is not silently defaulted',async()=>{
    for(const mutation of [(r:ReturnType<typeof version>)=>{r.costBase.operationalSegment='INTRA_MEX'},(r:ReturnType<typeof version>)=>{r.applicabilityContext.trailerTypes=['Reefer']}]){
      const f=fixture();mutation(f.row);await expect(f.module.read(admin,'base-A','version-A')).rejects.toThrow('WIZARD_PROFILE_NOT_SUPPORTED');expect(f.events).toHaveLength(0)
    }
  })
})

import {randomUUID} from 'node:crypto'
import {PrismaClient,type Section,type Prisma} from '@prisma/client'
import {z} from 'zod'
import {beforeAll,afterAll,describe,expect,it,vi} from 'vitest'
import {createVersionPlanning} from '../src/modules/cost-bases/version-planning.js'
import {createFamilyBaseStore,FAMILY_BASE_RECORD_KIND,FamilyBaseSaveSchema} from '../src/modules/cost-bases/family-base-store.js'
import {buildWizardReviewBinding} from '../src/modules/cost-bases/cost-base-wizard-review-context.js'
import {WIZARD_TRANSACTION_OPTIONS} from '../src/modules/cost-bases/cost-base-wizard-transaction.js'
import catalog from '../src/modules/cost-bases/cost-base-wizard.catalog.json'
import type {WizardCatalog} from '../src/modules/cost-bases/cost-base-wizard-draft.js'
import {PARAMETER_DEFINITIONS} from '../src/data/parameter-catalog.js'
import {readOwnRelayReview} from '../src/modules/engine/b2-own-relay-review.js'
import Fastify from 'fastify'
import {registerFamilyBaseRoutes} from '../src/modules/cost-bases/family-base.routes.js'
import {errorHandler} from '../src/middleware/error-handler.js'
import {decodeFamilySource} from '../src/modules/cost-bases/family-base-source.js'
import packedSource from '../src/modules/cost-bases/b2-family-source.pack.json'
const adminUrl=process.env.FCM_FAMILY_TEST_ADMIN_URL,appUrl=process.env.FCM_FAMILY_TEST_APP_URL
if(Boolean(adminUrl)!==Boolean(appUrl))throw new Error('Both family test URLs required')
for(const value of [adminUrl,appUrl])if(value){const u=new URL(value);if(u.hostname!=='127.0.0.1'||u.pathname!=='/fcm_family_s2')throw new Error('Disposable loopback family database required')}
vi.setConfig({testTimeout:45000,hookTimeout:60000})
describe.skipIf(!adminUrl)('family bases: actual B3 reader and limited local PostgreSQL',()=>{
  let admin:PrismaClient,app:PrismaClient,store:ReturnType<typeof createFamilyBaseStore>,planning:ReturnType<typeof createVersionPlanning>
  let source:ReturnType<typeof decodeFamilySource>,command:z.infer<typeof FamilyBaseSaveSchema>
  const actor={orgId:`family-org-${randomUUID()}`,sub:`family-user-${randomUUID()}`,role:'ADMIN' as const,supabaseId:randomUUID()}
  const operator={...actor,sub:`family-operator-${randomUUID()}`,role:'OPERATOR' as const,supabaseId:randomUUID()}
  const context={orgId:actor.orgId,baseId:`family-base-${randomUUID()}`,versionId:`family-version-${randomUUID()}`}
  const scope={orgId:actor.orgId,sub:actor.sub},selection={cycleId:'NETWORK_EXPECTED_EMPTY_PROXY',fundingMode:'CASH',fxDate:'2026-09-30',restInterpretation:'RATE_EXCLUDES_WEEKLY_REST'} as const
  let baseline:string
  beforeAll(async()=>{
    admin=new PrismaClient({datasourceUrl:adminUrl!,log:[]});app=new PrismaClient({datasourceUrl:appUrl!,log:[]})
    const [role]=await app.$queryRaw<{name:string;super:boolean;bypass:boolean}[]>`SELECT current_user::text AS name,rolsuper AS super,rolbypassrls AS bypass FROM pg_roles WHERE rolname=current_user`
    expect(role).toEqual({name:'fcm_family_app',super:false,bypass:false})
    await admin.organization.create({data:{id:actor.orgId,name:'Synthetic family org'}})
    await admin.user.create({data:{id:actor.sub,orgId:actor.orgId,email:`${randomUUID()}@synthetic.invalid`,supabaseId:actor.supabaseId,role:'ADMIN'}})
    await admin.user.create({data:{id:operator.sub,orgId:actor.orgId,email:`${randomUUID()}@synthetic.invalid`,supabaseId:operator.supabaseId,role:'OPERATOR'}})
    await admin.costBase.create({data:{id:context.baseId,orgId:actor.orgId,code:'LOCAL-FAMILY',name:'Synthetic draft',scope:'CROSS_BORDER'}})
    await admin.assumptionSet.create({data:{id:context.versionId,orgId:actor.orgId,costBaseId:context.baseId,name:'Synthetic family version',version:1,
      params:{create:PARAMETER_DEFINITIONS.map(p=>({section:p.section as Section,field:p.field,value:p.defaultValue,unit:p.unit}))}}})
    const row=await admin.assumptionSet.findUniqueOrThrow({where:{id:context.versionId},include:{params:{orderBy:{id:'asc'}},costBase:true}})
    baseline=JSON.stringify(row)
    if(!row.costBase)throw new Error('Synthetic cost base missing')
    await admin.costBaseAuditEvent.create({data:{orgId:actor.orgId,costBaseId:context.baseId,actorId:actor.sub,action:'METADATA_UPDATED',
      payload:buildWizardReviewBinding(context,{...row,costBase:row.costBase},catalog as WizardCatalog)}})
    source=decodeFamilySource(packedSource)
    const transaction=<T>(work:(tx:Prisma.TransactionClient)=>Promise<T>)=>app.$transaction(work,WIZARD_TRANSACTION_OPTIONS)
    planning=createVersionPlanning(transaction,catalog as WizardCatalog)
    const initial=await planning.read(actor,context.baseId,context.versionId)
    await planning.save(actor,context.baseId,context.versionId,{context,selection,expectedRevision:0,expectedVersionFingerprint:initial.versionFingerprint,
      expectedSnapshot:readOwnRelayReview(selection,scope).sha256,requestId:randomUUID(),planningAccepted:true,note:'Synthetic local saved planning'})
    const view=await planning.read(actor,context.baseId,context.versionId)
    store=createFamilyBaseStore(transaction,source,catalog as WizardCatalog)
    command={context,expectedRevision:0,expectedVersionFingerprint:view.versionFingerprint,expectedPlanningRequestId:view.latest!.requestId,
      expectedPlanningRevision:1,expectedSnapshot:view.latest!.calculation.sha256,requestId:randomUUID()}
  })
  afterAll(async()=>{await app?.$disconnect();await admin?.$disconnect()})
  it('commits one proposal and preserves every numeric literal through JSONB and a new client',async()=>{
    const saved=await store.save(actor,context.baseId,context.versionId,command)
    expect(saved).toMatchObject({revision:1,status:'CURRENT',replayed:false})
    const row=await admin.costBaseAuditEvent.findFirstOrThrow({where:{costBaseId:context.baseId,payload:{path:['kind'],equals:FAMILY_BASE_RECORD_KIND}}})
    expect(typeof (row.payload as {proposalJson?:unknown}).proposalJson).toBe('string')
    expect((row.payload as {proposalJson:string}).proposalJson).not.toContain(actor.supabaseId)
    await app.$disconnect()
    app=new PrismaClient({datasourceUrl:appUrl!,log:[]})
    store=createFamilyBaseStore(work=>app.$transaction(work,WIZARD_TRANSACTION_OPTIONS),source,catalog as WizardCatalog)
    const recovered=await store.read(actor,context.baseId,context.versionId)
    expect(recovered.latest).toEqual(saved.latest)
    expect(recovered.latest!.familyInput.variableCosts[0].amountUsd).toBe(saved.latest!.familyInput.variableCosts[0].amountUsd)
    expect((await store.save(actor,context.baseId,context.versionId,command)).replayed).toBe(true)
    expect(await admin.costBaseAuditEvent.count({where:{costBaseId:context.baseId}})).toBe(3)
  })
  it('refuses duplicates, stale receipts, another org and VIEWER without writes',async()=>{
    const before=await admin.costBaseAuditEvent.count({where:{costBaseId:context.baseId}})
    for(const raw of [{...command,requestId:randomUUID()},{...command,expectedPlanningRevision:2},
      {...command,requestId:randomUUID(),expectedRevision:1}])await expect(store.save(actor,context.baseId,context.versionId,raw)).rejects.toThrow()
    for(const other of [{...actor,orgId:'other'},{...actor,role:'VIEWER' as const}])
      await expect(store.read(other,context.baseId,context.versionId)).rejects.toThrow()
    expect(await admin.costBaseAuditEvent.count({where:{costBaseId:context.baseId}})).toBe(before)
  })
  it('keeps params, profile, calibration, active/publication state and V3 base untouched',async()=>{
    const row=await admin.assumptionSet.findUniqueOrThrow({where:{id:context.versionId},include:{params:{orderBy:{id:'asc'}},costBase:true}})
    expect(JSON.stringify(row)).toBe(baseline);expect(row.params).toHaveLength(210)
    expect(row.status).toBe('DRAFT');expect(row.isActive).toBe(false);expect(row.calibrationEvidence).toBeNull()
    expect(row.costBase!.defaultPolicy).toBe('OPERATIONAL_V3')
  })
  it('serializes competing revisions with real row locks and preserves the older receipt',async()=>{
    planning=createVersionPlanning(work=>app.$transaction(work,WIZARD_TRANSACTION_OPTIONS),catalog as WizardCatalog)
    const old=await planning.read(actor,context.baseId,context.versionId)
    await planning.save(actor,context.baseId,context.versionId,{context,selection:{...selection,fundingMode:'FINANCED'},expectedRevision:1,
      expectedVersionFingerprint:old.versionFingerprint,expectedSnapshot:old.latest!.calculation.sha256,requestId:randomUUID(),planningAccepted:true,note:'Synthetic financing comparison'})
    const current=await planning.read(actor,context.baseId,context.versionId)
    expect((await store.read(actor,context.baseId,context.versionId)).status).toBe('STALE')
    const next={...command,expectedRevision:1,expectedPlanningRevision:2,expectedPlanningRequestId:current.latest!.requestId}
    const results=await Promise.allSettled([store.save(actor,context.baseId,context.versionId,{...next,requestId:randomUUID()}),
      store.save(operator,context.baseId,context.versionId,{...next,requestId:randomUUID()})])
    expect(results.map(r=>r.status).sort()).toEqual(['fulfilled','rejected'])
    expect(await admin.costBaseAuditEvent.count({where:{costBaseId:context.baseId}})).toBe(5)
    const recovered=await store.read(actor,context.baseId,context.versionId)
    expect(recovered).toMatchObject({revision:2,status:'CURRENT'})
    expect(recovered.latest!.selection.fundingMode).toBe('FINANCED')
    const unchanged=await admin.assumptionSet.findUniqueOrThrow({where:{id:context.versionId},include:{params:{orderBy:{id:'asc'}},costBase:true}})
    expect(JSON.stringify(unchanged)).toBe(baseline)
  })
  it('recovers and replays the real stored proposal over HTTP without exposing its full budget',async()=>{
    const http=Fastify();http.setErrorHandler(errorHandler)
    // Synthetic authenticated identity boundary; not a real Supabase JWT.
    http.addHook('preHandler',async req=>{req.user=req.headers.authorization==='operator'?operator:actor})
    registerFamilyBaseRoutes(http,store)
    try{
      const url=`/cost-bases/${context.baseId}/versions/${context.versionId}/family-proposal`
      const response=await http.inject({method:'GET',url})
      expect(response.statusCode).toBe(200);expect(response.headers['cache-control']).toBe('no-store')
      const summary=response.json()
      expect(summary).toMatchObject({revision:2,status:'CURRENT',appliedToParams:false,quoteReady:false})
      expect(summary.latest.fixedEntryCount).toBe(32);expect(summary.latest.familyInput).toBeUndefined()
      expect(response.body.length).toBeLessThan(5000)
      const events=await admin.costBaseAuditEvent.findMany({where:{costBaseId:context.baseId,payload:{path:['kind'],equals:FAMILY_BASE_RECORD_KIND}}})
      const lastEvent=events.find(e=>(e.payload as {revision?:number}).revision===2)!
      const last=lastEvent.payload as {requestId:string}
      const current=await planning.read(actor,context.baseId,context.versionId)
      const replay=await http.inject({method:'PUT',url,headers:{authorization:lastEvent.actorId===operator.sub?'operator':'admin'},payload:{...command,requestId:last.requestId,expectedRevision:1,
        expectedPlanningRevision:2,expectedPlanningRequestId:current.latest!.requestId}})
      expect(replay.statusCode).toBe(200);expect(replay.json().replayed).toBe(true)
      expect(await admin.costBaseAuditEvent.count({where:{costBaseId:context.baseId}})).toBe(5)
    }finally{await http.close()}
  })
  it('shares mixed-author history through HTTP and persists an operator proposal from admin planning without cross-actor replay',async()=>{
    const earlier=await admin.costBaseAuditEvent.findMany({where:{costBaseId:context.baseId},orderBy:{createdAt:'asc'}})
    const original=await store.read(actor,context.baseId,context.versionId)
    const shared=await store.read(operator,context.baseId,context.versionId)
    expect(shared.scope.sub).toBe(operator.sub);expect(shared.latest).toEqual(original.latest)
    await expect(store.save(operator,context.baseId,context.versionId,command)).rejects.toThrow('FAMILY_PROPOSAL_REQUEST_ID_REUSED')
    expect(await admin.costBaseAuditEvent.count({where:{costBaseId:context.baseId}})).toBe(5)
    const old=await planning.read(actor,context.baseId,context.versionId)
    await planning.save(actor,context.baseId,context.versionId,{context,selection,expectedRevision:2,
      expectedVersionFingerprint:old.versionFingerprint,expectedSnapshot:old.latest!.calculation.sha256,requestId:randomUUID(),planningAccepted:true,note:'Shared admin planning for operator'})
    const parent=await planning.read(operator,context.baseId,context.versionId)
    expect(parent.latest!.savedBy).toBe(actor.sub)
    const own={...command,expectedRevision:2,expectedPlanningRevision:3,expectedPlanningRequestId:parent.latest!.requestId,requestId:randomUUID()}
    const saved=await store.save(operator,context.baseId,context.versionId,own)
    expect(saved).toMatchObject({revision:3,status:'CURRENT',replayed:false})
    expect(saved.latest!.scope.sub).toBe(operator.sub)
    expect((await store.read(actor,context.baseId,context.versionId)).latest).toEqual(saved.latest)
    const http=Fastify();http.setErrorHandler(errorHandler)
    http.addHook('preHandler',async req=>{req.user=req.headers.authorization==='operator'?operator:actor})
    registerFamilyBaseRoutes(http,store)
    try{
      const url=`/cost-bases/${context.baseId}/versions/${context.versionId}/family-proposal`
      const get=await http.inject({method:'GET',url,headers:{authorization:'operator'}})
      expect(get.statusCode).toBe(200);expect(get.json().scope.sub).toBe(operator.sub)
      expect((await http.inject({method:'PUT',url,payload:own})).statusCode).toBe(409)
      const replay=await http.inject({method:'PUT',url,headers:{authorization:'operator'},payload:own})
      expect(replay.statusCode).toBe(200);expect(replay.json().replayed).toBe(true)
    }finally{await http.close()}
    expect(await admin.costBaseAuditEvent.count({where:{costBaseId:context.baseId}})).toBe(7)
    const after=await admin.costBaseAuditEvent.findMany({where:{costBaseId:context.baseId},orderBy:{createdAt:'asc'}})
    expect(after.slice(0,earlier.length)).toEqual(earlier)
    const row=await admin.assumptionSet.findUniqueOrThrow({where:{id:context.versionId},include:{params:{orderBy:{id:'asc'}},costBase:true}})
    expect(JSON.stringify(row)).toBe(baseline)
  })
})

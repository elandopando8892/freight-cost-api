import Fastify from 'fastify'
import {afterEach,expect,it,vi} from 'vitest'
import {registerFamilyBaseRoutes} from '../src/modules/cost-bases/family-base.routes.js'
import {errorHandler} from '../src/middleware/error-handler.js'
import {FamilyBaseSaveSchema} from '../src/modules/cost-bases/family-base-store.js'
const context={orgId:'org',baseId:'base',versionId:'version'}
const command={context,expectedRevision:0,expectedVersionFingerprint:'a'.repeat(64),
  expectedPlanningRequestId:'2d26f150-2bb4-4e7e-95f0-d098d2d4f274',expectedPlanningRevision:1,
  expectedSnapshot:'b'.repeat(64),requestId:'3d26f150-2bb4-4e7e-95f0-d098d2d4f274'}
const apps:ReturnType<typeof Fastify>[]=[]
afterEach(async()=>{await Promise.all(apps.splice(0).map(a=>a.close()))})
function fixture(){
  const app=Fastify();apps.push(app);app.setErrorHandler(errorHandler)
  app.addHook('preHandler',async(req,reply)=>{
    if(!req.headers.authorization)return reply.code(401).send({error:'unauthorized'})
    req.user={sub:'actor',orgId:'org',role:req.headers.authorization==='viewer'?'VIEWER':'OPERATOR'}
  })
  let revision=0
  const service={read:vi.fn(async()=>({context,scope:{orgId:'org',sub:'actor'},revision,status:'NONE',latest:null,appliedToParams:false,quoteReady:false})),
    save:vi.fn(async(_actor:unknown,_base:unknown,_version:unknown,body:unknown)=>{
      const c=FamilyBaseSaveSchema.parse(body)
      if(c.expectedRevision!==0)throw new Error('FAMILY_PROPOSAL_REVISION_CONFLICT')
      const replayed=revision===1;revision=1
      // Route transport test, not a substitute for the real store/DB tests.
      return {context,scope:{orgId:'org',sub:'actor'},revision,status:'NONE',latest:null,appliedToParams:false,quoteReady:false,replayed}
    })}
  registerFamilyBaseRoutes(app,service as never)
  return {app,service,path:'/cost-bases/base/versions/version/family-proposal'}
}
it('requires upstream identity and ADMIN/OPERATOR, and never caches family responses',async()=>{
  const f=fixture()
  for(const method of ['GET','PUT'] as const){
    expect((await f.app.inject({method,url:f.path,payload:method==='PUT'?command:undefined})).statusCode).toBe(401)
    expect((await f.app.inject({method,url:f.path,headers:{authorization:'viewer'},payload:method==='PUT'?command:undefined})).statusCode).toBe(403)
    const r=await f.app.inject({method,url:f.path,headers:{authorization:'operator'},payload:method==='PUT'?command:undefined})
    expect(r.statusCode).toBe(200);expect(r.headers['cache-control']).toBe('no-store')
    expect(r.json().appliedToParams).toBe(false)
  }
})
it('uses technical commands, reports conflict instead of 500 and preserves replay',async()=>{
  const f=fixture(),request=(payload:unknown)=>f.app.inject({method:'PUT',url:f.path,headers:{authorization:'operator'},payload:payload as object})
  expect((await request({...command,price:1})).statusCode).toBe(400)
  expect((await request({...command,context:{...context,orgId:'other'}})).statusCode).toBe(403)
  expect((await request({...command,expectedRevision:2})).statusCode).toBe(409)
  expect((await request(command)).json().replayed).toBe(false)
  expect((await request(command)).json().replayed).toBe(true)
  expect((await request({...command,note:'x'.repeat(20_000)})).statusCode).toBe(413)
})

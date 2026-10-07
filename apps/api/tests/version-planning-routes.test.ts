import Fastify from 'fastify'
import {expect,it,vi} from 'vitest'
import {registerVersionPlanningRoutes} from '../src/modules/cost-bases/version-planning.routes.js'
import {versionPlanning} from '../src/modules/cost-bases/version-planning.service.js'
vi.mock('../src/modules/cost-bases/version-planning.service.js',()=>({versionPlanning:{read:vi.fn(async()=>({revision:0})),save:vi.fn(async()=>({revision:1}))}}))
it('requires verified identity/role before planning reads/writes and returns no-store',async()=>{
  const app=Fastify()
  app.addHook('preHandler',async(req,reply)=>{
    if(!req.headers.authorization)return reply.code(401).send({error:'unauthorized'})
    req.user={sub:'verified-user',orgId:'verified-org',role:req.headers.authorization==='viewer'?'VIEWER':'OPERATOR'}
  })
  registerVersionPlanningRoutes(app)
  const path='/cost-bases/base-a/versions/version-a/planning'
  for(const method of ['GET','PUT'] as const){
    expect((await app.inject({method,url:path})).statusCode).toBe(401)
    expect((await app.inject({method,url:path,headers:{authorization:'viewer'}})).statusCode).toBe(403)
    const ok=await app.inject({method,url:path,headers:{authorization:'operator'},...(method==='PUT'?{payload:{selection:'fixture'}}:{})})
    expect(ok.statusCode).toBe(200);expect(ok.headers['cache-control']).toBe('no-store')
  }
  expect(versionPlanning.read).toHaveBeenCalledWith({sub:'verified-user',orgId:'verified-org',role:'OPERATOR'},'base-a','version-a')
  await app.close()
})

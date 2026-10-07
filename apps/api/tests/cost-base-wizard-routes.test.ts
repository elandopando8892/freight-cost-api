import Fastify from 'fastify'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({verify:vi.fn(),resolveUser:vi.fn(),read:vi.fn(),save:vi.fn()}))
vi.mock('../src/config/env.js',()=>({env:{NODE_ENV:'test',OPENAI_API_KEY:''}}))
vi.mock('../src/config/prisma.js',()=>({prisma:{}}))
vi.mock('../src/modules/auth/supabase.service.js',()=>({verifySupabaseToken:mocks.verify,resolveUser:mocks.resolveUser}))
vi.mock('../src/modules/cost-bases/cost-base-wizard-version.service.js',()=>({versionWizard:{read:mocks.read,save:mocks.save}}))
const {costBasesRoutes}=await import('../src/modules/cost-bases/cost-bases.routes.js')
let app:ReturnType<typeof Fastify>
const path='/cost-bases/base-A/versions/version-A/wizard'
beforeEach(async()=>{
  Object.values(mocks).forEach(mock=>mock.mockReset())
  mocks.verify.mockResolvedValue({sub:'synthetic-subject'});mocks.resolveUser.mockResolvedValue({id:'internal-A',orgId:'org-A',role:'ADMIN',supabaseId:'synthetic-subject'})
  mocks.read.mockResolvedValue({synthetic:true});mocks.save.mockResolvedValue({synthetic:true})
  app=Fastify();await app.register(costBasesRoutes);await app.ready()
})
afterEach(async()=>{await app.close()})
it.each(['GET','PUT'] as const)('requires authentication before %s handler',async method=>{
  const response=await app.inject({method,url:path,...(method==='PUT'?{payload:{}}:{})})
  expect(response.statusCode).toBe(401);expect(mocks.verify).not.toHaveBeenCalled();expect(mocks.read).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled()
})
it('rejects expired provider token without provisioning or writer call',async()=>{
  mocks.verify.mockRejectedValue(new Error('expired'))
  const response=await app.inject({method:'PUT',url:path,headers:{authorization:'Bearer synthetic-expired'},payload:{}})
  expect(response.statusCode).toBe(401);expect(mocks.resolveUser).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled()
})
it.each(['VIEWER','OPERATOR'])('allows %s reads but denies writes',async role=>{
  mocks.resolveUser.mockResolvedValue({id:'internal-A',orgId:'org-A',role,supabaseId:'synthetic-subject'})
  const headers={authorization:'Bearer synthetic'}
  expect((await app.inject({method:'GET',url:path,headers})).statusCode).toBe(200)
  expect((await app.inject({method:'PUT',url:path,headers,payload:{}})).statusCode).toBe(403)
  expect(mocks.save).not.toHaveBeenCalled()
  expect(mocks.read).toHaveBeenCalledWith(expect.objectContaining({sub:'internal-A',orgId:'org-A',role}),'base-A','version-A')
})
it('uses server-owned identity and no-store for both handlers',async()=>{
  for(const method of ['GET','PUT'] as const){
    const response=await app.inject({method,url:path,headers:{authorization:'Bearer synthetic'},...(method==='PUT'?{payload:{context:{orgId:'forged'}}}:{})})
    expect(response.statusCode).toBe(200);expect(response.headers['cache-control']).toBe('no-store')
  }
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({sub:'internal-A',orgId:'org-A',role:'ADMIN'}),'base-A','version-A',{context:{orgId:'forged'}})
  // The pure module tests prove the forwarded forged context is rejected, not trusted.
})
it('enforces bounded payload before invoking writer',async()=>{
  const response=await app.inject({method:'PUT',url:path,headers:{authorization:'Bearer synthetic'},payload:{note:'x'.repeat(66000)}})
  expect(response.statusCode).toBe(413);expect(mocks.save).not.toHaveBeenCalled()
})

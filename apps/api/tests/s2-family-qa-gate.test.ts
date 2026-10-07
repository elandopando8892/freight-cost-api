import {expect,it} from 'vitest'
import * as gates from '../scripts/lib/b3-saas-gate.js'
const g=gates as any
const actor={orgId:'org',sub:'admin',role:'ADMIN'}
const command={requestId:'one',expectedRevision:0,context:{orgId:'org',baseId:'base',versionId:'version'}}
it('the actor-fix validation has its own thirty minute window without extending prior authorities',()=>{
  expect(typeof g.createS2FamilyActorFixWindow).toBe('function')
  const start=Date.parse('2026-10-07T00:10:00.000Z'),w=g.createS2FamilyActorFixWindow(start)
  expect(w.deadline).toBe('2026-10-07T00:40:00.000Z')
  expect(()=>g.assertS2FamilyActorFixOpen(w,start)).not.toThrow()
  expect(()=>g.createS2FamilyAmendedWindow(start)).toThrow()
  for(const now of [NaN,start-1,Date.parse(w.deadline)])expect(()=>g.assertS2FamilyActorFixOpen(w,now)).toThrow()
  for(const now of [Date.parse('2026-10-06T23:57:14.999Z'),Date.parse('2026-10-07T00:57:15.000Z')])expect(()=>g.createS2FamilyActorFixWindow(now)).toThrow()
  expect(()=>g.assertS2FamilyActorFixOpen({...w,deadline:'2026-10-07T00:41:00.000Z'},start)).toThrow()
})
it('the actor-fix validation requires the exact consumed amendment closed and rejects self reuse',()=>{
  expect(typeof g.assertS2FamilyActorFixRole).toBe('function')
  const marker='FCM_S2_FAMILY_QA_AMENDMENT:2026-10-06T23:13:13.966Z:2026-10-06T23:58:13.966Z'
  expect(()=>g.assertS2FamilyActorFixRole({marker,login:false,sessions:0})).not.toThrow()
  for(const r of [{marker,login:true,sessions:0},{marker,login:false,sessions:1},{marker:g.S2_FAMILY_PRIOR_MARKER,login:false,sessions:0},
    {marker:'FCM_S2_FAMILY_QA_ACTOR_FIX:2026-10-07T00:10:00.000Z:2026-10-07T00:40:00.000Z',login:false,sessions:0}])expect(()=>g.assertS2FamilyActorFixRole(r)).toThrow()
})
it('the human amendment preserves old expiry and permits only a new finite window',()=>{
  expect(typeof g.createS2FamilyAmendedWindow).toBe('function')
  const start=Date.parse('2026-10-06T23:15:00.000Z'),w=g.createS2FamilyAmendedWindow(start)
  expect(w.deadline).toBe('2026-10-07T00:00:00.000Z')
  expect(()=>g.assertS2FamilyAmendedOpen(w,start)).not.toThrow()
  expect(()=>g.createS2FamilyWindow(start)).toThrow()
  for(const now of [NaN,start-1,Date.parse(w.deadline)])expect(()=>g.assertS2FamilyAmendedOpen(w,now)).toThrow()
  for(const now of [Date.parse('2026-10-06T23:04:58.999Z'),Date.parse('2026-10-07T00:04:59.000Z')])expect(()=>g.createS2FamilyAmendedWindow(now)).toThrow()
  expect(()=>g.assertS2FamilyAmendedOpen({...w,deadline:'2026-10-07T00:01:00.000Z'},start)).toThrow()
})
it('the amendment admits only the exact closed prior family marker and cannot reactivate itself',()=>{
  expect(typeof g.assertS2FamilyAmendedRole).toBe('function')
  const marker='FCM_S2_FAMILY_QA:2026-10-06T15:51:02.872Z:2026-10-06T16:36:02.872Z'
  expect(()=>g.assertS2FamilyAmendedRole({marker,login:false,sessions:0})).not.toThrow()
  for(const r of [{marker,login:true,sessions:0},{marker,login:false,sessions:1},{marker:gates.B3_RECOVERY_MARKER,login:false,sessions:0},
    {marker:'FCM_S2_FAMILY_QA_AMENDMENT:2026-10-06T23:15:00.000Z:2026-10-07T00:00:00.000Z',login:false,sessions:0}])expect(()=>g.assertS2FamilyAmendedRole(r)).toThrow()
})
it('starts at most one finite 45 minute window within the authorized launch period',()=>{
  expect(typeof g.createS2FamilyWindow).toBe('function')
  const start=Date.parse('2026-10-06T16:00:00.000Z'),w=g.createS2FamilyWindow(start)
  expect(w.deadline).toBe('2026-10-06T16:45:00.000Z')
  expect(()=>g.assertS2FamilyOpen(w,start)).not.toThrow()
  for(const now of [NaN,start-1,Date.parse(w.deadline)])expect(()=>g.assertS2FamilyOpen(w,now)).toThrow()
  for(const now of [NaN,Date.parse('2026-10-06T15:40:05.999Z'),Date.parse('2026-10-06T16:40:06.000Z')])expect(()=>g.createS2FamilyWindow(now)).toThrow()
  expect(()=>g.assertS2FamilyOpen({...w,deadline:'2026-10-06T16:46:00.000Z'},start)).toThrow()
})
it('requires the prior RECOVERY role closed, never accepts its own marker for reactivation',()=>{
  expect(typeof g.assertS2FamilyRole).toBe('function')
  expect(()=>g.assertS2FamilyRole({marker:gates.B3_RECOVERY_MARKER,login:false,sessions:0})).not.toThrow()
  for(const r of [{marker:'FCM_S2_FAMILY_QA:consumed',login:false,sessions:0},{marker:gates.B3_RECOVERY_MARKER,login:true,sessions:0},
    {marker:gates.B3_RECOVERY_MARKER,login:false,sessions:1}])expect(()=>g.assertS2FamilyRole(r)).toThrow()
})
it('allows only read paths for this version and the single family PUT, never planning or wizard writes',()=>{
  expect(typeof g.s2FamilyRequestAllowed).toBe('function')
  const root='/cost-bases/base/versions/version'
  expect(g.s2FamilyRequestAllowed('PUT',`${root}/family-proposal`,'base','version')).toBe(true)
  for(const path of ['/auth/me',`${root}/wizard`,`${root}/planning`,`${root}/family-proposal`])expect(g.s2FamilyRequestAllowed('GET',path,'base','version')).toBe(true)
  for(const [method,path] of [['PUT',`${root}/planning`],['PUT',`${root}/wizard`],['GET','/cost-bases/other/versions/version/family-proposal'],
    ['POST','/cost-bases'],['DELETE',`${root}/family-proposal`]])expect(g.s2FamilyRequestAllowed(method,path,'base','version')).toBe(false)
})
it('reserves before awaiting and permits only the successful same actor exact replay',async()=>{
  expect(typeof g.createS2FamilyAttempt).toBe('function')
  const a=g.createS2FamilyAttempt()
  a.begin(actor,command)
  expect(()=>a.begin(actor,command)).toThrow()
  a.completed(actor,command)
  expect(()=>a.begin(actor,structuredClone(command))).not.toThrow()
  for(const [who,body] of [[{...actor,sub:'operator'},command],[{...actor,orgId:'other'},command],[actor,{...command,requestId:'new'}],
    [actor,{...command,expectedRevision:1}],[actor,{...command,extra:true}]])expect(()=>a.begin(who,body)).toThrow()
})
it('a failed or unknown attempt cannot be retried or marked successful using a different receipt',()=>{
  expect(typeof g.createS2FamilyAttempt).toBe('function')
  const a=g.createS2FamilyAttempt();a.begin(actor,command)
  expect(()=>a.completed({...actor,sub:'other'},command)).toThrow()
  expect(()=>a.completed(actor,{...command,requestId:'other'})).toThrow()
  expect(()=>a.begin(actor,command)).toThrow()
})

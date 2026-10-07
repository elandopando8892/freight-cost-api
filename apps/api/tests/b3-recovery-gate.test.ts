import {expect,it} from 'vitest'
import * as gate from '../scripts/lib/b3-saas-gate.js'
it('admits recovery only inside the new finite window and after TRACE closure',()=>{
  const g=gate as any
  expect(typeof g.assertB3RecoveryOpen).toBe('function')
  expect(()=>g.assertB3RecoveryOpen(Date.parse('2026-10-06T01:41:29.343Z'))).not.toThrow()
  for(const now of [NaN,Date.parse('2026-10-06T01:41:29.342Z'),Date.parse('2026-10-06T02:26:29.343Z')])expect(()=>g.assertB3RecoveryOpen(now)).toThrow()
  expect(()=>g.assertB3Role({marker:gate.B3_TRACE_MARKER,login:false,sessions:0},'recovery-validation')).not.toThrow()
  for(const r of [{marker:g.B3_RECOVERY_MARKER,login:false,sessions:0},{marker:gate.B3_TRACE_MARKER,login:true,sessions:0},
    {marker:gate.B3_TRACE_MARKER,login:false,sessions:1}])expect(()=>g.assertB3Role(r,'recovery-validation')).toThrow()
})
it('allows only the exact persisted receipt and actor, not a new command',()=>{
  const g=gate as any,receipt={context:{orgId:'org-a'},requestId:'receipt-a',expectedRevision:0,note:'unchanged'},actor={orgId:'org-a',sub:'actor-a'}
  expect(typeof g.b3RecoveryReplayAllowed).toBe('function')
  expect(g.b3RecoveryReplayAllowed(actor,receipt,{actor,body:receipt})).toBe(true)
  for(const [who,body] of [[{...actor,sub:'other'},receipt],[actor,{...receipt,requestId:'new'}],[actor,{...receipt,note:'changed'}],
    [actor,{...receipt,extra:true}],[actor,{...receipt,expectedRevision:1}]])expect(g.b3RecoveryReplayAllowed(who,body,{actor,body:receipt})).toBe(false)
  expect(g.b3RecoveryReplayAllowed(actor,receipt,undefined)).toBe(false)
})

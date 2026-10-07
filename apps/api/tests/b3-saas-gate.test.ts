import {expect,it} from 'vitest'
import {assertB3Open,assertB3Role,assertB3FinalOpen,B3_START,B3_DEADLINE,B3_MARKER,B3_REPAIR_MARKER,B3_ROUTE_FIX_MARKER,B3_ROUTE_FIX_AUTHORITY,B3_FINAL_START,B3_FINAL_DEADLINE,B3_FINAL_MARKER,b3RequestAllowed} from '../scripts/lib/b3-saas-gate.js'
import {W2_CLOSEOUT_READBACK_MARKER} from '../scripts/lib/w2-closeout-gate.js'
import {B3_OPTIMIZED_START,B3_OPTIMIZED_DEADLINE,B3_OPTIMIZED_MARKER,assertB3OptimizedOpen} from '../scripts/lib/b3-saas-gate.js'
import {B3_TRACE_START,B3_TRACE_DEADLINE,B3_TRACE_MARKER,assertB3TraceOpen} from '../scripts/lib/b3-saas-gate.js'
it('admits one trace window only after closed OPTIMIZED without resetting its marker',()=>{
  expect(Date.parse(B3_TRACE_DEADLINE)-Date.parse(B3_TRACE_START)).toBe(45*60*1000)
  expect(()=>assertB3TraceOpen(Date.parse(B3_TRACE_START))).not.toThrow()
  for(const now of [NaN,Date.parse(B3_TRACE_START)-1,Date.parse(B3_TRACE_DEADLINE)])expect(()=>assertB3TraceOpen(now)).toThrow()
  expect(()=>assertB3Role({marker:B3_OPTIMIZED_MARKER,login:false,sessions:0},'trace-validation')).not.toThrow()
  for(const r of [{marker:B3_TRACE_MARKER,login:false,sessions:0},{marker:B3_FINAL_MARKER,login:false,sessions:0},
    {marker:B3_OPTIMIZED_MARKER,login:true,sessions:0},{marker:B3_OPTIMIZED_MARKER,login:false,sessions:1}])expect(()=>assertB3Role(r,'trace-validation')).toThrow()
})
it('allows the new finite amendment only after FINAL closure and never reuses it',()=>{
  expect(Date.parse(B3_OPTIMIZED_DEADLINE)-Date.parse(B3_OPTIMIZED_START)).toBe(45*60*1000)
  expect(()=>assertB3OptimizedOpen(Date.parse(B3_OPTIMIZED_START))).not.toThrow()
  for(const now of [NaN,Date.parse(B3_OPTIMIZED_START)-1,Date.parse(B3_OPTIMIZED_DEADLINE)])expect(()=>assertB3OptimizedOpen(now)).toThrow()
  expect(()=>assertB3Role({marker:B3_FINAL_MARKER,login:false,sessions:0},'optimized-validation')).not.toThrow()
  for(const role of [{marker:B3_OPTIMIZED_MARKER,login:false,sessions:0},{marker:B3_ROUTE_FIX_MARKER,login:false,sessions:0},
    {marker:B3_FINAL_MARKER,login:true,sessions:0},{marker:B3_FINAL_MARKER,login:false,sessions:1}])
    expect(()=>assertB3Role(role,'optimized-validation')).toThrow()
})
it('starts a separate finite B3 window without reopening W2 or allowing repeat activation',()=>{
  expect(()=>assertB3Open(Date.parse(B3_START))).not.toThrow()
  for(const now of [Date.parse(B3_START)-1,Date.parse(B3_DEADLINE),NaN])expect(()=>assertB3Open(now)).toThrow()
  expect(()=>assertB3Role({marker:W2_CLOSEOUT_READBACK_MARKER,login:false,sessions:0})).not.toThrow()
  for(const r of [undefined,{marker:B3_MARKER,login:false,sessions:0},{marker:W2_CLOSEOUT_READBACK_MARKER,login:true,sessions:0},{marker:W2_CLOSEOUT_READBACK_MARKER,login:false,sessions:1}])expect(()=>assertB3Role(r)).toThrow()
})
it('permits only one explicit diagnosed repair after confirmed closure, without extending time',()=>{
  expect(()=>assertB3Role({marker:B3_MARKER,login:false,sessions:0},true)).not.toThrow()
  for(const r of [{marker:B3_MARKER,login:true,sessions:0},{marker:B3_MARKER,login:false,sessions:1},
    {marker:B3_REPAIR_MARKER,login:false,sessions:0},{marker:W2_CLOSEOUT_READBACK_MARKER,login:false,sessions:0}])expect(()=>assertB3Role(r,true)).toThrow()
  expect(B3_REPAIR_MARKER.endsWith(B3_DEADLINE)).toBe(true)
})
it('only admits this version planning save and relevant reads',()=>{
  const p='/cost-bases/base-a/versions/version-a/'
  expect(b3RequestAllowed('PUT',p+'planning','base-a','version-a')).toBe(true)
  expect(b3RequestAllowed('GET',p+'wizard','base-a','version-a')).toBe(true)
  for(const [method,url] of [['PUT',p+'wizard'],['POST',p+'activate'],['DELETE',p+'planning'],['GET','/cost-bases/base-b/versions/version-a/planning']])expect(b3RequestAllowed(method,url,'base-a','version-a')).toBe(false)
})
it('human route-fix amendment admits only the closed REPAIR1 predecessor without resetting or extending the window',()=>{
  expect(()=>assertB3Role({marker:B3_REPAIR_MARKER,login:false,sessions:0},'route-fix')).not.toThrow()
  for(const marker of [B3_ROUTE_FIX_MARKER,B3_MARKER,W2_CLOSEOUT_READBACK_MARKER])expect(()=>assertB3Role({marker,login:false,sessions:0},'route-fix')).toThrow()
  expect(()=>assertB3Role({marker:B3_REPAIR_MARKER,login:true,sessions:0},'route-fix')).toThrow()
  expect(()=>assertB3Role({marker:B3_REPAIR_MARKER,login:false,sessions:1},'route-fix')).toThrow()
  expect(B3_ROUTE_FIX_MARKER.endsWith(B3_DEADLINE)).toBe(true)
  expect(B3_ROUTE_FIX_AUTHORITY.endsWith(B3_DEADLINE)).toBe(true)
})
it('last human execution is 30 minutes within original window and can never consume its own marker again',()=>{
  expect(Date.parse(B3_FINAL_DEADLINE)-Date.parse(B3_FINAL_START)).toBe(30*60*1000)
  expect(Date.parse(B3_FINAL_DEADLINE)).toBeLessThan(Date.parse(B3_DEADLINE))
  expect(()=>assertB3FinalOpen(Date.parse(B3_FINAL_START))).not.toThrow()
  for(const now of [Date.parse(B3_FINAL_START)-1,Date.parse(B3_FINAL_DEADLINE),NaN])expect(()=>assertB3FinalOpen(now)).toThrow()
  expect(()=>assertB3Role({marker:B3_ROUTE_FIX_MARKER,login:false,sessions:0},'final-validation')).not.toThrow()
  for(const marker of [B3_FINAL_MARKER,B3_REPAIR_MARKER,B3_MARKER])expect(()=>assertB3Role({marker,login:false,sessions:0},'final-validation')).toThrow()
  expect(()=>assertB3Role({marker:B3_ROUTE_FIX_MARKER,login:true,sessions:0},'final-validation')).toThrow()
  expect(()=>assertB3Role({marker:B3_ROUTE_FIX_MARKER,login:false,sessions:1},'final-validation')).toThrow()
})

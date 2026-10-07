import { expect,it } from 'vitest'
import { assertW2CloseoutOpen, assertW2CloseoutRole, W2_CLOSEOUT_START, W2_CLOSEOUT_DEADLINE, W2_CLOSEOUT_MARKER, W2_CLOSEOUT_READBACK_MARKER, W2_CLOSEOUT_PREVIOUS_MARKER } from '../scripts/lib/w2-closeout-gate.js'
it('keeps the closeout finite without renewing on restart',()=>{
  expect(()=>assertW2CloseoutOpen(Date.parse(W2_CLOSEOUT_START))).not.toThrow()
  for(const now of [Date.parse(W2_CLOSEOUT_START)-1,Date.parse(W2_CLOSEOUT_DEADLINE),NaN])expect(()=>assertW2CloseoutOpen(now)).toThrow()
})
it('resumes only the closed saved phase and cannot reset it to a new proposal',()=>{
  expect(()=>assertW2CloseoutRole({marker:W2_CLOSEOUT_MARKER,login:false,sessions:0},true)).not.toThrow()
  expect(()=>assertW2CloseoutRole({marker:W2_CLOSEOUT_MARKER,login:false,sessions:0})).toThrow()
  for(const marker of [W2_CLOSEOUT_PREVIOUS_MARKER,W2_CLOSEOUT_READBACK_MARKER,'foreign'])
    expect(()=>assertW2CloseoutRole({marker,login:false,sessions:0},true)).toThrow()
})
it('preserves the consumed previous gate and denies another reactivation of this one',()=>{
  expect(()=>assertW2CloseoutRole({marker:W2_CLOSEOUT_PREVIOUS_MARKER,login:false,sessions:0})).not.toThrow()
  for(const role of [undefined,{marker:W2_CLOSEOUT_MARKER,login:false,sessions:0},{marker:'foreign',login:false,sessions:0},{marker:W2_CLOSEOUT_PREVIOUS_MARKER,login:true,sessions:0},{marker:W2_CLOSEOUT_PREVIOUS_MARKER,login:false,sessions:1}])expect(()=>assertW2CloseoutRole(role)).toThrow()
})

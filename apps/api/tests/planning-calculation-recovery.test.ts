import {expect,it} from 'vitest'
import {planningCalculationMatches} from '../src/modules/cost-bases/planning-calculation-recovery.js'
import {readOwnRelayReview} from '../src/modules/engine/b2-own-relay-review.js'
const reference=()=>readOwnRelayReview({}, {orgId:'synthetic-org',sub:'synthetic-actor'})
function adjacent(value:number,steps:bigint){
  const v=new DataView(new ArrayBuffer(8));v.setFloat64(0,value);v.setBigUint64(0,v.getBigUint64(0)+steps);return v.getFloat64(0)
}
it.each([-3n,-2n,-1n,0n,1n,2n,3n])('accepts only bounded derived USD representation shift %s',steps=>{
  const expected=reference(),stored=structuredClone(expected)
  stored.case.outputs.cfuUsd=adjacent(expected.case.outputs.cfuUsd,steps)
  const before=structuredClone(stored)
  expect(planningCalculationMatches(stored,expected)).toBe(true);expect(stored).toEqual(before)
})
it.each([-4n,4n])('rejects four binary64 steps %s',steps=>{
  const expected=reference(),stored=structuredClone(expected)
  stored.case.outputs.cfuUsd=adjacent(expected.case.outputs.cfuUsd,steps)
  expect(planningCalculationMatches(stored,expected)).toBe(false)
})
it.each(['cent','fx','evidence','identity','count','null','order','negative-zero','large-amount'])('keeps %s alteration rejected',field=>{
  const expected=reference(),stored=structuredClone(expected)
  if(field==='cent')stored.case.outputs.cfuUsd+=0.01
  if(field==='fx')stored.case.mxnPerUsd=adjacent(expected.case.mxnPerUsd,1n)
  if(field==='evidence')stored.evidence[0].locator+='changed'
  if(field==='identity')stored.scope.sub='other'
  if(field==='count')stored.sourcePinCount++
  if(field==='null')stored.case.variableCosts[0].amountUsd=null
  if(field==='order')stored.case.resources.reverse()
  if(field==='negative-zero'){expected.case.outputs.cfuUsd=0;stored.case.outputs.cfuUsd=-0}
  if(field==='large-amount'){expected.case.outputs.cfuUsd=1e14;stored.case.outputs.cfuUsd=adjacent(1e14,1n)}
  expect(planningCalculationMatches(stored,expected)).toBe(false)
})

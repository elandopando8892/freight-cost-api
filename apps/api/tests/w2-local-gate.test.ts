import { expect, it } from 'vitest'
import { W2_GATE_ROLE, W2_GATE_MARKER, W2_GATE_DEADLINE, assertW2GateOpen, w2GatePath, w2GateRequestAllowed, w2GateRoleSql } from '../src/config/w2-local-gate.js'
import { CreateCostBaseSchema } from '../src/modules/cost-bases/cost-bases.schema.js'
import { defaultCostBaseProfile } from '../src/modules/cost-bases/cost-base-profile.js'
const base='base-A', version='version-A', path=w2GatePath(base,version)
it('allows only the exact scoped wizard and read-only health/identity',()=>{
  for(const p of ['/health','/ready','/auth/me',path]) expect(w2GateRequestAllowed('GET',p,base,version)).toBe(true)
  expect(w2GateRequestAllowed('PUT',path,base,version)).toBe(true)
})
it.each(['/org','/cost-bases','/cost-bases/base-A/versions/other/wizard',path+'/activate','/cost-bases/base-A/versions/version-A/%77izard','//auth/me'])('denies other paths %s',p=>{
  expect(w2GateRequestAllowed('GET',p,base,version)).toBe(false)
  expect(w2GateRequestAllowed('PUT',p,base,version)).toBe(false)
})
it.each(['POST','DELETE','PATCH','HEAD','OPTIONS'])('denies %s',method=>expect(w2GateRequestAllowed(method,path,base,version)).toBe(false))
it('handles query strings but rejects unsafe identifiers',()=>{
  expect(w2GateRequestAllowed('GET',path+'?x=1',base,version)).toBe(true)
  expect(()=>w2GatePath('../other',version)).toThrow()
})
it('limits grants to the approved columns and rejects SQL injection',()=>{
  const sql=w2GateRoleSql('a'.repeat(64),'2026-10-05T19:30:00.000Z').join('\n')
  expect(sql).toContain(`CONNECTION LIMIT 2`)
  expect(sql).toContain(`UPDATE ("id")`)
  expect(sql).toContain('NOBYPASSRLS')
  expect(sql).not.toMatch(/GRANT (?:DELETE|ALL)|ON ALL TABLES|ALTER ROLE fcm_(?:local_read|c1|tire)/)
  expect(sql).toContain(W2_GATE_ROLE)
  expect(sql).toContain(`COMMENT ON ROLE ${W2_GATE_ROLE} IS '${W2_GATE_MARKER}'`)
  expect(()=>w2GateRoleSql("'; DROP ROLE x; --",'2026-10-05T19:30:00.000Z')).toThrow()
  expect(()=>w2GateRoleSql('a'.repeat(64),"now'; --")).toThrow()
})
it('does not renew the authorized deadline on restart and rejects backward clock',()=>{
  expect(()=>assertW2GateOpen(Date.parse(W2_GATE_DEADLINE)-30*60*1000)).not.toThrow()
  expect(()=>assertW2GateOpen(Date.parse(W2_GATE_DEADLINE))).toThrow()
  expect(()=>assertW2GateOpen(Date.parse('2026-10-04T22:50:00Z'))).toThrow()
  expect(()=>assertW2GateOpen(NaN)).toThrow()
})
it('documents the real relay profile blocker without replacing it with through-tractor',()=>{
  const parsed=CreateCostBaseSchema.safeParse({code:'W2-QA-BINATIONAL-20261004',name:'W2 QA Binacional - NO COMERCIAL',
    scope:'CROSS_BORDER',operationalSegment:'D2D_BINATIONAL_OWN',defaultPolicy:'OPERATIONAL_V3',currency:'USD',isDefault:false,
    setupMode:'MANUAL',cloneFromSetId:'pilot',assumptionOverrides:[],
    applicabilityProfile:{...defaultCostBaseProfile('CROSS_BORDER'),borderProcess:'YARD_TRANSFER'}})
  expect(parsed.success).toBe(false)
  if(!parsed.success) expect(parsed.error.issues.some(i=>i.path.join('.')==='applicabilityProfile' && i.message.includes('THROUGH_TRACTOR'))).toBe(true)
})

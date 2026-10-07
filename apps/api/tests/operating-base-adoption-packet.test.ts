import {expect,it,vi} from 'vitest'
import * as inventory from '../scripts/reconcile-economic-model-inventory.js'
vi.mock('../src/config/prisma.js',()=>{throw new Error('DB forbidden in adoption preparation')})
type Packet={inventory: {keys:number;benchmark:number;outsideBenchmark:number;withoutLiteralReader:number},
  parameters:Array<{key:string;section:string;canonicalUnit:string;proposedCanonicalValue:null;state:string;alternatives:Array<{value:number;unit:string;period:string}>}>,
  segmentTemplates:Array<{id:string;modelStatus:string;readyForAdoption:boolean;applicabilityReference:string}>,
  pilot:{borderProcess:string;v3BorderProcess:string;methodBridgeRequired:boolean;caseCount:number},
  economicFamilies:Array<{section:string;formula:string}>,planningAssumptions:{authorization:{scope:string};operationalCalibrationComplete:false},
  adoptedValues:number;quoteReady:boolean;persistedBasesInspected:boolean}
let cached:Packet
function read(){
  const api=inventory as unknown as {prepareOperatingBaseAdoptionPacket:()=>Packet}
  expect(typeof api.prepareOperatingBaseAdoptionPacket).toBe('function')
  cached??=api.prepareOperatingBaseAdoptionPacket()
  return structuredClone(cached)
}
it('keeps all210 fields and135/75 scopes, without treating literal reads as calibration',()=>{
  const p=read()
  expect(p.inventory).toEqual({keys:210,benchmark:135,outsideBenchmark:75,withoutLiteralReader:17})
  expect(p.parameters).toHaveLength(210);expect(new Set(p.parameters.map(r=>r.key)).size).toBe(210)
  expect(new Set(p.parameters.map(r=>r.section)).size).toBe(16)
})
it('preserves dated unit-compatible alternatives without adopting their values',()=>{
  const p=read(),mx=p.parameters.find(r=>r.key==='fcm.v3.fuel.diesel-mx')!
  expect(mx.alternatives[0]).toMatchObject({value:27,unit:'MXN/L',period:'2026-09-25'})
  expect(mx.canonicalUnit).toBe('MXN/L');expect(mx.proposedCanonicalValue).toBeNull()
  expect(p.parameters.every(r=>r.proposedCanonicalValue===null)).toBe(true)
  expect(p.parameters.find(r=>r.key==='fcm.v3.cost-maint.250k-qty-frenos')!.alternatives).toEqual([])
})
it('does not silently certify other segments or treat templates as persisted bases',()=>{
  const p=read();expect(p.segmentTemplates).toHaveLength(9)
  expect(p.persistedBasesInspected).toBe(false)
  expect(p.segmentTemplates.every(r=>!r.readyForAdoption)).toBe(true)
  expect(p.segmentTemplates.find(r=>r.id==='MX_DRAYAGE')!.modelStatus).toBe('MODEL_PENDING')
  expect(p.segmentTemplates.every(r=>r.applicabilityReference==='DEFAULT_V3_TEMPLATE_NOT_OBSERVED_BASE')).toBe(true)
})
it('requires a method bridge for same-box own relay instead of publishing it as through-tractor V3',()=>{
  expect(read().pilot).toMatchObject({borderProcess:'OWN_RELAY_SAME_TRAILER',v3BorderProcess:'THROUGH_TRACTOR',methodBridgeRequired:true,caseCount:24})
})
it('leaves economic and human adoption gates closed even with complete planning arithmetic',()=>{
  expect(read()).toMatchObject({adoptedValues:0,quoteReady:false,persistedBasesInspected:false})
  expect(read().parameters.some(r=>r.state==='ADOPTED'||r.state==='CALIBRATED')).toBe(false)
})
it('ships explicit formula families and planning assumptions instead of only source counters',()=>{
  const p=read()
  expect(p.economicFamilies).toHaveLength(13)
  expect(p.economicFamilies.find(r=>r.section==='COST_TIRES')!.formula).toContain('vehicle-km')
  expect(p.planningAssumptions.authorization.scope).toBe('PUBLIC_PLANNING_VALIDATION_ONLY_NOT_OPERATIONAL_CALIBRATION_OR_ADOPTION')
  expect(p.planningAssumptions.operationalCalibrationComplete).toBe(false)
})

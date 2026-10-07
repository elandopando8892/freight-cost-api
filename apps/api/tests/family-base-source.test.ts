import {createHash} from 'node:crypto'
import {gzipSync,gunzipSync} from 'node:zlib'
import {beforeAll,expect,it} from 'vitest'
import {composeB2PlanningScenario} from '../scripts/compose-b2-planning-scenario.js'
import {packageFamilySource} from '../scripts/package-family-base-source.js'
import {decodeFamilySource} from '../src/modules/cost-bases/family-base-source.js'
let packed:ReturnType<typeof packageFamilySource>
beforeAll(()=>{packed=packageFamilySource()},20_000)

it('preserves all 24 case objects and their economic literals in an immutable runtime package',()=>{
  const source=composeB2PlanningScenario()
  expect(JSON.stringify(packed).length).toBeLessThan(2_000_000)
  expect(decodeFamilySource(packed)).toEqual(source)
})
it('rejects changed checksum, compressed content and oversized envelope without fallback',()=>{
  for(const changed of [{...packed,sha256:'0'.repeat(64)},{...packed,gzipBase64:'AAAA'},
    {...packed,bytes:20_000_000},{...packed,price:1}])expect(()=>decodeFamilySource(changed)).toThrow()
})
it('does not trust a rehashed package whose case economics differ from the B2 pin',()=>{
  const s=JSON.parse(gunzipSync(Buffer.from(packed.gzipBase64,'base64')).toString('utf8'))
  s.cases[0].lineage.variableCosts[0].amountUsd+=1
  const bytes=Buffer.from(JSON.stringify(s))
  expect(()=>decodeFamilySource({...packed,bytes:bytes.length,
    sha256:createHash('sha256').update(bytes).digest('hex'),gzipBase64:gzipSync(bytes).toString('base64')})).toThrow('FAMILY_BASE_SOURCE_DRIFT')
})

import {createHash} from 'node:crypto'
import {gzipSync,gunzipSync} from 'node:zlib'
import {expect,it} from 'vitest'
import packed from '../src/modules/cost-bases/b2-family-source.pack.json'
import snapshot from '../src/modules/engine/b2-own-relay.snapshot.json'
import {decodeFamilySource} from '../src/modules/cost-bases/family-base-source.js'

it('preserves all 24 case objects and their economic literals in an immutable runtime package',()=>{
  const source=decodeFamilySource(packed)
  expect(JSON.stringify(packed).length).toBeLessThan(2_000_000)
  expect(source.cases).toHaveLength(24)
  expect(createHash('sha256').update(JSON.stringify(source.cases)).digest('hex')).toBe(snapshot.payload.sourceScenarioSha256)
  expect(source.sourcePins).toEqual(snapshot.payload.sourcePins)
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

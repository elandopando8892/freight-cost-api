import {createHash} from 'node:crypto'
import {gzipSync} from 'node:zlib'
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {composeB2PlanningScenario} from './compose-b2-planning-scenario.js'
import {projectOwnRelayReview} from './project-b2-own-relay-review.js'
import {decodeFamilySource} from '../src/modules/cost-bases/family-base-source.js'
import snapshot from '../src/modules/engine/b2-own-relay.snapshot.json'

const destination=fileURLToPath(new URL('../src/modules/cost-bases/b2-family-source.pack.json',import.meta.url))
export function packageFamilySource(){
  if(JSON.stringify(projectOwnRelayReview())!==JSON.stringify(snapshot))throw new Error('RELAY_SNAPSHOT_STALE')
  const bytes=Buffer.from(JSON.stringify(composeB2PlanningScenario()))
  const packed={format:'FCM_B2_FAMILY_SOURCE_GZIP_V1' as const,bytes:bytes.length,
    sha256:createHash('sha256').update(bytes).digest('hex'),gzipBase64:gzipSync(bytes,{level:9}).toString('base64')}
  decodeFamilySource(packed)
  return packed
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==3||!['--create','--check'].includes(process.argv[2]))throw new Error('Use --create or --check')
  const packed=packageFamilySource()
  if(process.argv[2]==='--create')writeFileSync(destination,JSON.stringify(packed)+'\n',{flag:'wx'})
  else if(JSON.stringify(JSON.parse(readFileSync(destination,'utf8')))!==JSON.stringify(packed))throw new Error('FAMILY_SOURCE_PACKAGE_STALE')
  console.log(JSON.stringify({verified:true,mode:process.argv[2],bytes:packed.bytes,packageBytes:Buffer.byteLength(JSON.stringify(packed)),sha256:packed.sha256}))
}

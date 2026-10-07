import {createHash} from 'node:crypto'
import {gunzipSync} from 'node:zlib'
import {z} from 'zod'
import {createOwnRelayFamilyBridge} from './own-relay-family-base.js'

const PackageSchema=z.object({format:z.literal('FCM_B2_FAMILY_SOURCE_GZIP_V1'),
  bytes:z.number().int().positive().max(10_000_000),sha256:z.string().regex(/^[a-f0-9]{64}$/),
  gzipBase64:z.string().min(4).max(2_000_000).regex(/^[A-Za-z0-9+/]*={0,2}$/)}).strict()
/** Server-only immutable source. No research scripts, filesystem, network or
 * pricing refresh at runtime. The bridge also verifies B2 cases/pins identity. */
export function decodeFamilySource(raw:unknown):Parameters<typeof createOwnRelayFamilyBridge>[0]{
  const packed=PackageSchema.parse(raw)
  const compressed=Buffer.from(packed.gzipBase64,'base64')
  if(compressed.toString('base64')!==packed.gzipBase64)throw new Error('FAMILY_BASE_SOURCE_DRIFT')
  const bytes=gunzipSync(compressed,{maxOutputLength:10_000_000})
  if(bytes.length!==packed.bytes||createHash('sha256').update(bytes).digest('hex')!==packed.sha256)
    throw new Error('FAMILY_BASE_SOURCE_DRIFT')
  const source=JSON.parse(bytes.toString('utf8')) as Parameters<typeof createOwnRelayFamilyBridge>[0]
  createOwnRelayFamilyBridge(source,async()=>{throw new Error('Runtime packaging does not read planning')})
  return source
}

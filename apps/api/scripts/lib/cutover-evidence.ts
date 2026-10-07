import { createHash } from 'node:crypto'

/** Vercel truncates individual log messages. Bound each record and seal the
 * complete payload; a missing, reordered or clipped chunk cannot be accepted. */
export function encodeCutoverEvidence(payload: unknown): string[] {
  const body = Buffer.from(JSON.stringify(payload), 'utf8')
  const encoded = body.toString('base64')
  const sha256 = createHash('sha256').update(body).digest('hex')
  const total = Math.ceil(encoded.length / 1600)
  return Array.from({ length: total }, (_, index) => 'FCM_CUTOVER_EVIDENCE=' + JSON.stringify({
    schemaVersion: 1, sha256, index, total, chunk: encoded.slice(index * 1600, (index + 1) * 1600),
  }))
}

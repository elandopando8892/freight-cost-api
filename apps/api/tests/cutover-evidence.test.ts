import { expect, it } from 'vitest'
import { encodeCutoverEvidence } from '../scripts/lib/cutover-evidence.js'
import { createHash } from 'node:crypto'

it('keeps every deployment log record under 2000 bytes and reconstructs exact JSON', () => {
  const payload = { users: Array.from({ length: 100 }, (_, i) => ({ id: i, value: 'México' })) }
  const lines = encodeCutoverEvidence(payload)
  const records = lines.map(line => JSON.parse(line.slice('FCM_CUTOVER_EVIDENCE='.length)))
  expect(lines.every(line => Buffer.byteLength(line) < 2000)).toBe(true)
  expect(records.every((r, i) => r.index === i && r.total === lines.length)).toBe(true)
  const body = Buffer.from(records.map(r => r.chunk).join(''), 'base64')
  expect(JSON.parse(body.toString('utf8'))).toEqual(payload)
  expect(records.every(r => r.sha256 === createHash('sha256').update(body).digest('hex'))).toBe(true)
})

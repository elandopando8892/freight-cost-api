import { createHash } from 'node:crypto'
import { calculateThirdPartyCost } from './third-party-cost.js'

export function partnerHash(value: unknown): string {
  const canonical = (item: unknown): string => {
    if (Array.isArray(item)) return `[${item.map(canonical).join(',')}]`
    if (item && typeof item === 'object') return `{${Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, val]) => `${JSON.stringify(key)}:${canonical(val)}`).join(',')}}`
    return JSON.stringify(item)
  }
  return createHash('sha256').update(canonical(value)).digest('hex')
}

export function reviewedPartnerCost(input: unknown) {
  const report = calculateThirdPartyCost(input)
  return { ...report, reviewChecksum: partnerHash(report) }
}

export function frozenPartnerCost(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('Invalid partner snapshot')
  const { reviewChecksum, ...report } = snapshot as ReturnType<typeof reviewedPartnerCost>
  // Verify stored evidence, never silently run a newer engine on a historical record.
  if (typeof reviewChecksum !== 'string' || partnerHash(report) !== reviewChecksum) throw new Error('Partner snapshot integrity mismatch')
  return { ...report, reviewChecksum }
}

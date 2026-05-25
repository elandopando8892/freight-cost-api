import { describe, it, expect } from 'vitest'
import { usZipPrefix } from '../src/modules/engine/lane-resolver.service.js'

// ZIP → metro resolution: the cusCatalog is keyed by 3-digit ZIP prefix, so the
// resolver must extract that prefix from a shipper/consignee location string.
describe('lane-resolver — US ZIP prefix extraction', () => {
  it('extracts the 3-digit prefix from ZIPs and city+ZIP strings', () => {
    expect(usZipPrefix('30901')).toBe('309')        // 5-digit ZIP (Augusta, GA)
    expect(usZipPrefix('309')).toBe('309')          // already a 3-digit prefix
    expect(usZipPrefix('Augusta, GA 30901')).toBe('309') // city + ZIP
    expect(usZipPrefix('78040-1234')).toBe('780')   // ZIP+4
  })

  it('returns null when there is no ZIP (pure city name)', () => {
    expect(usZipPrefix('Augusta, GA')).toBeNull()
    expect(usZipPrefix('Greenville, SC')).toBeNull()
    expect(usZipPrefix('')).toBeNull()
  })
})

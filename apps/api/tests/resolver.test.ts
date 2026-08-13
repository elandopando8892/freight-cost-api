import { describe, it, expect } from 'vitest'
import { missingRequiredPricingLegs, normalizeLaneLookup, usZipPrefix } from '../src/modules/engine/lane-resolver.service.js'
import { homologateMx, buildReferenceKey } from '../src/modules/engine/reference-key.js'
import { defaultService } from '../src/modules/engine/engine.factors.js'

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

describe('lane-resolver — canonical lane lookup and required legs', () => {
  it('normalizes diacritics and whitespace to the seeded reference-key form', () => {
    expect(normalizeLaneLookup('  Monterrey, Nuevo León  -  Nuevo Laredo, Tamaulipas Truck Trailer '))
      .toBe('MONTERREY, NUEVO LEON - NUEVO LAREDO, TAMAULIPAS TRUCK TRAILER')
  })

  it('requires both legs for cross-border operations', () => {
    expect(missingRequiredPricingLegs('D2D Export', { usaLeg: {} })).toEqual(['MEX'])
    expect(missingRequiredPricingLegs('D2D Import', { mexLeg: {} })).toEqual(['USA'])
    expect(missingRequiredPricingLegs('D2D Export', { mexLeg: {}, usaLeg: {} })).toEqual([])
  })

  it('requires the correct single leg for US and MX operations', () => {
    expect(missingRequiredPricingLegs('Intra-US', { mexLeg: {} })).toEqual(['USA'])
    expect(missingRequiredPricingLegs('US Northbound', { usaLeg: {} })).toEqual([])
    expect(missingRequiredPricingLegs('Intra-Mex', { usaLeg: {} })).toEqual(['MEX'])
  })
})

describe('reference-key — MX homologation + key building', () => {
  it('homologates MX state to its 2-letter code', () => {
    expect(homologateMx('Monterrey, Nuevo Leon')).toBe('Monterrey, NL')
    expect(homologateMx('Queretaro, Queretaro')).toBe('Queretaro, QE')
    expect(homologateMx('Nuevo Laredo, Tamaulipas')).toBe('Nuevo Laredo, TM')
    expect(homologateMx('Laredo, TX')).toBe('Laredo, TX') // unknown state → identity
  })

  it('normalizes Backhaul → One Way in the key', () => {
    const eq = { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' }
    expect(buildReferenceKey('Brooklyn, NY', 'Laredo, TX', eq, 'D2D Import', 'Backhaul'))
      .toBe('BROOKLYN, NY - LAREDO, TX TRUCK TRAILER DRY VAN SINGLE D2D IMPORT ONE WAY B1')
    expect(buildReferenceKey(undefined, 'Laredo, TX', eq, 'D2D Import', 'One Way')).toBe('')
  })
})

describe('default service by operation (prevailing V3.0 logic; overridable)', () => {
  it('imports/southbound default to Backhaul, everything else One Way', () => {
    expect(defaultService('D2D Import')).toBe('Backhaul')
    expect(defaultService('MX Southbound')).toBe('Backhaul')
    expect(defaultService('US Southbound')).toBe('Backhaul')
    expect(defaultService('D2D Export')).toBe('One Way')
    expect(defaultService('MX Northbound')).toBe('One Way')
    expect(defaultService('Intra-Mex')).toBe('One Way')
    expect(defaultService('Drayage')).toBe('One Way')
  })
})

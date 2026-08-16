import { describe, expect, it } from 'vitest'
import { assessRatewareCandidate, assessRatewareReadiness } from '../src/modules/quotes/rateware-candidate.js'

const completeHandoff = {
  lane: {
    origin: 'Monterrey',
    destination: 'Dallas',
    operation: 'D2D Export',
    service: 'One Way',
    equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: 'B1' },
  },
  economics: { requiredTariffUsd: 2500, currency: { primary: 'USD' } },
}

describe('Rateware candidate preflight', () => {
  it('does not invent commercial enrichment fields', () => {
    const result = assessRatewareCandidate(completeHandoff)
    expect(result).toMatchObject({ structurallyReady: true, humanEnrichmentRequired: ['carrier', 'effectiveDate', 'rateOwner'], mapped: { allInUsd: 2500 } })
  })

  it('blocks missing endpoints and incomplete package fields', () => {
    const result = assessRatewareCandidate({
      lane: {
        origin: ' ',
        destination: null,
        operation: '',
        service: '',
        equipment: { truckType: 'Truck Trailer', trailer: 'Dry Van', config: 'Single', driver: '' },
      },
      economics: { requiredTariffUsd: 0, currency: { primary: '' } },
    })
    expect(result.structurallyReady).toBe(false)
    expect(result.blockers).toEqual(expect.arrayContaining([
      'Falta origen.',
      'Falta destino.',
      'Falta operación.',
      'Falta servicio.',
      'Falta configuración de equipo completa.',
      'La tarifa USD no es válida.',
      'Falta la moneda primaria del paquete.',
    ]))
  })

  it('requires confirmation, structural readiness, and human enrichment together', () => {
    const completeCandidate = assessRatewareCandidate(completeHandoff)
    expect(assessRatewareReadiness({
      confirmationEligibility: { eligible: true, reasons: [] },
      ratewareCandidate: completeCandidate,
      enrichmentReady: true,
    }).ready).toBe(true)

    expect(assessRatewareReadiness({
      confirmationEligibility: { eligible: false, reasons: ['Confirmation is not eligible.'] },
      ratewareCandidate: completeCandidate,
      enrichmentReady: true,
    }).ready).toBe(false)
    expect(assessRatewareReadiness({
      confirmationEligibility: { eligible: true, reasons: [] },
      ratewareCandidate: assessRatewareCandidate({ ...completeHandoff, lane: { ...completeHandoff.lane, origin: null } }),
      enrichmentReady: true,
    }).ready).toBe(false)
    expect(assessRatewareReadiness({
      confirmationEligibility: { eligible: true, reasons: [] },
      ratewareCandidate: completeCandidate,
      enrichmentReady: false,
      enrichmentBlockers: ['Falta enriquecimiento Rateware.'],
    })).toMatchObject({ ready: false, blockers: ['Falta enriquecimiento Rateware.'] })
    expect(assessRatewareReadiness({
      confirmationEligibility: { eligible: true, reasons: [] },
      ratewareCandidate: completeCandidate,
      enrichmentReady: true,
      packageBlockers: ['Quote economics requiredTariffUsd drifted from the verified calculation snapshot.'],
    })).toMatchObject({ ready: false })
  })
})

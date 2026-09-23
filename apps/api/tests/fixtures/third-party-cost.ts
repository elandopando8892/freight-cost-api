import type { ThirdPartyCostInput } from '../../src/modules/engine/third-party-cost.js'

/** Synthetic quote references and prices, never XBF business evidence. */
export function thirdPartyFixture(): ThirdPartyCostInput {
  return {
    segment: 'D2D_MX_US_PARTNER', direction: 'MX_TO_US', service: 'ONE_WAY', serviceDate: '2026-10-10',
    origin: 'Monterrey, NL', destination: 'Dallas, TX', equipment: 'Dry Van 53 / Single',
    mxInterchange: 'Nuevo Laredo, patio ficticio', usInterchange: 'Laredo, synthetic yard',
    assumptions: 'Synthetic: loaded one way, equipment interchange, no detention expected.',
    mex: { carrier: 'Synthetic MX', reference: 'QA-MX-001', validFrom: '2026-10-01', validUntil: '2026-10-31',
      currency: 'MXN', linehaul: 17000, fuel: { mode: 'EXTRA', amount: 1700 }, tolls: { mode: 'EXTRA', amount: 850 },
      conditions: 'Synthetic net quote. No taxes or detention; interchange included.' },
    usa: { carrier: 'Synthetic US', reference: 'QA-US-001', validFrom: '2026-10-01', validUntil: '2026-10-31',
      currency: 'USD', linehaul: 1200, fuel: { mode: 'INCLUDED' }, tolls: { mode: 'EXTRA', amount: 30 },
      conditions: 'Synthetic net quote. Fuel included. No detention or storage.' },
    crossing: { mode: 'EXTRA', provider: 'Synthetic crossing', reference: 'QA-X-001', currency: 'USD',
      amount: 150, validFrom: '2026-10-01', validUntil: '2026-10-31' },
    interchange: { mode: 'INCLUDED_MX' },
    fx: { mxnPerUsd: 17, source: 'Synthetic FX fixture', asOf: '2026-10-01' },
  }
}

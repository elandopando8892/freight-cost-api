import { describe, expect, it } from 'vitest'
import { buildVersionImpact } from '../src/modules/cost-bases/version-impact.js'

describe('version release impact', () => {
  const active = {
    id: 'v1', version: 1, status: 'PUBLISHED' as const, isActive: true,
    params: [
      { section: 'FUEL', field: 'dieselUsd', value: 4, unit: 'USD/gal' },
      { section: 'RISK', field: 'margin', value: 0.12, unit: '%' },
    ],
  }

  it('shows only changed parameters and leaves existing governed records frozen', () => {
    const impact = buildVersionImpact({
      id: 'v2', version: 2, status: 'PUBLISHED', isActive: false,
      params: [
        { section: 'FUEL', field: 'dieselUsd', value: 4.25, unit: 'USD/gal' },
        { section: 'RISK', field: 'margin', value: 0.12, unit: '%' },
      ],
    }, active, {
      productionRoutes: { frozenOnActive: 3, alreadyOnCandidate: 0, other: 1 },
      quotes: { savedOnActive: 8, savedOnCandidate: 0, other: 2 },
    })

    expect(impact.comparison.changedParameterCount).toBe(1)
    expect(impact.comparison.changes[0]).toMatchObject({ field: 'dieselUsd', fromValue: 4, toValue: 4.25, delta: 0.25 })
    expect(impact.activation).toMatchObject({ canActivate: true, existingProductionRoutesRemainFrozen: true, existingQuotesRemainFrozen: true, requiresHumanRouteReview: true })
  })

  it('does not mark an unpublished draft as activatable', () => {
    const impact = buildVersionImpact({ ...active, id: 'draft', version: 2, status: 'DRAFT', isActive: false }, active, {
      productionRoutes: { frozenOnActive: 0, alreadyOnCandidate: 0, other: 0 },
      quotes: { savedOnActive: 0, savedOnCandidate: 0, other: 0 },
    })
    expect(impact.activation.canActivate).toBe(false)
  })
})

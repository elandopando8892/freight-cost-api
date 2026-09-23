import { describe, expect, it } from 'vitest'
import { CreateCostBaseSchema } from '../src/modules/cost-bases/cost-bases.schema.js'
import { OPERATIONAL_SEGMENTS } from '../src/modules/cost-bases/operational-segments.js'
import { listRecommendedCostBasePresets } from '../src/modules/cost-bases/recommended-cost-base-presets.js'

const create = (operationalSegment: string, scope: string, presetId?: string) => CreateCostBaseSchema.safeParse({
  code: 'TEST-SEG', name: 'Synthetic segment', scope, operationalSegment,
  setupMode: presetId ? 'RECOMMENDED_TEMPLATE' : 'MANUAL', presetId,
})

describe('operational cost-base segments', () => {
  it('maps every configurable segment to one compatible existing preset', () => {
    const presets = listRecommendedCostBasePresets()
    expect(new Set(OPERATIONAL_SEGMENTS.map(segment => segment.id)).size).toBe(OPERATIONAL_SEGMENTS.length)
    for (const segment of OPERATIONAL_SEGMENTS) {
      if (segment.status === 'MODEL_PENDING') {
        expect(segment.presetId).toBeNull()
        expect(create(segment.id, segment.scope).success).toBe(false)
        continue
      }
      const preset = presets.find(item => item.id === segment.presetId)
      expect(preset?.scope).toBe(segment.scope)
      expect(create(segment.id, segment.scope, segment.presetId!).success).toBe(true)
    }
  })

  it('rejects a segment with a different scope or unrelated preset', () => {
    expect(create('MX_LOCAL', 'CROSS_BORDER').success).toBe(false)
    expect(create('D2D_BINATIONAL_OWN', 'CROSS_BORDER', 'std-local-mx-v1').success).toBe(false)
  })

  it('keeps the legacy create contract usable without inventing a segment', () => {
    const old = CreateCostBaseSchema.parse({ code: 'LEGACY', name: 'Legacy base', scope: 'INTRA_MEX' })
    expect(old.operationalSegment).toBeUndefined()
  })
})

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { TirePublicResearch } from '../app/(app)/cost-bases/tires/tire-public-research'
import imtReference from '../../../docs/FCM_TIRE_IMT_PT881_2025.json'
import segmentMapping from '../../../docs/FCM_TIRE_IMT_SEGMENT_MAPPING_2026-09-28.json'
import { OPERATIONAL_SEGMENTS } from '../../api/src/modules/cost-bases/operational-segments'

it('shows the official tire model as a non-adopted comparison with traceable units', () => {
  const html = renderToStaticMarkup(createElement(TirePublicResearch))

  expect(html).toContain('IMT · costos base 2025')
  expect(html).toContain('por 1,000 veh-km')
  expect(html).toContain('por veh-km')
  expect(html).toContain('Ninguna cifra se adopta en el motor')
  expect(html).toContain(imtReference.source.url)
  expect(html).toContain(imtReference.source.pdfSha256)
  for (const vehicle of imtReference.vehicleReferences) {
    expect(html).toContain(vehicle.configuration)
    expect(html).toContain(`tabla ${vehicle.table}`)
  }
  expect(imtReference.governance.adoptedParameterCount).toBe(0)
  expect(imtReference.governance.parameterWriteAllowed).toBe(false)
  expect(imtReference.governance.quoteEligible).toBe(false)
})

it('covers each governed segment once without promoting the IMT model into CVU or quotes', () => {
  const html = renderToStaticMarkup(createElement(TirePublicResearch))
  const mappedIds = segmentMapping.segments.map(item => item.id)
  expect(new Set(mappedIds).size).toBe(mappedIds.length)
  expect([...mappedIds].sort()).toEqual(OPERATIONAL_SEGMENTS.map(item => item.id).sort())
  expect(segmentMapping.segments.filter(item => item.mode === 'CONDITIONAL_MX_INTERURBAN')).toHaveLength(4)
  expect(segmentMapping.segments.filter(item => item.mode === 'NO_DIRECT_COMPARISON')).toHaveLength(5)
  expect(segmentMapping.requiredChecksEs).toHaveLength(6)
  for (const segment of segmentMapping.segments) {
    expect(html).toContain(`data-segment-id="${segment.id}"`)
    expect(html).toContain(segment.label)
  }
  expect(html).toContain('Ningún costo del IMT entra a CVU, CFU o cotización')
  expect(segmentMapping.adoptedParameterCount).toBe(0)
  expect(segmentMapping.quoteEligible).toBe(false)
})

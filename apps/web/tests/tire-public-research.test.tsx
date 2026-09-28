import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { TirePublicResearch } from '../app/(app)/cost-bases/tires/tire-public-research'
import imtReference from '../../../docs/FCM_TIRE_IMT_PT881_2025.json'

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

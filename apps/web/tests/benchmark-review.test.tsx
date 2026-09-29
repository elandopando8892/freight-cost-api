import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { BenchmarkReview, ReviewResults } from '../app/(app)/scenarios/benchmark/benchmark-review'
import { parseReview } from '../app/(app)/scenarios/benchmark/review-contract'

const fixture = () => ({ calibrated: false, sourceStatus: 'DOCUMENTED_UNVERIFIED', status: 'SCENARIO_ONLY', issues: [],
  scenarios: [{ id: 'Synthetic A', result: { calibrated: false, costs: { cfuUsd: 1, cvuUsd: 2, borderServicesUsd: 3, productionCostUsd: 6 },
    sharedTrailer: { lineage: { evidence: [{ id: 'test', url: 'https://example.org', locator: 'Synthetic only' }] } } } }] })
it('starts empty with no adopted or authenticated claims', () => {
  const html = renderToStaticMarkup(createElement(BenchmarkReview))
  expect(html).toContain('Sin resultados cargados')
  expect(html).toContain('no recalculado ni autenticado')
  expect(html).toContain('No se envían ni guardan datos')
})
it('renders declared values and source details safely', () => {
  const html = renderToStaticMarkup(createElement(ReviewResults, { result: parseReview(JSON.stringify(fixture())) }))
  expect(html).toContain('Total declarado'); expect(html).toContain('https://example.org')
  expect(html).toContain('noopener noreferrer'); expect(html).toContain('<details')
})
it('renders incomplete issues without totals', () => {
  const result = parseReview(JSON.stringify({ ...fixture(), status: 'INCOMPLETE', scenarios: null, issues: [{ field: 'capital', code: 'MISSING' }] }))
  const html = renderToStaticMarkup(createElement(ReviewResults, { result }))
  expect(html).toContain('capital: MISSING'); expect(html).not.toContain('Total declarado')
})
it('rejects invalid, oversized, contradictory, calibrated and unsafe-source results', () => {
  expect(() => parseReview('{')).toThrow()
  expect(() => parseReview(' '.repeat(1_000_001))).toThrow()
  expect(() => parseReview(JSON.stringify({ ...fixture(), calibrated: true }))).toThrow()
  expect(() => parseReview(JSON.stringify({ ...fixture(), status: 'INCOMPLETE' }))).toThrow()
  const input = fixture(); input.scenarios[0].result.sharedTrailer.lineage.evidence[0].url = 'javascript:alert(1)'
  expect(() => parseReview(JSON.stringify(input))).toThrow()
})

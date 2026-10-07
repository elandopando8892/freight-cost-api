import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import sample from './visual/economic-trace-sample.json'
import { parseReview } from '../app/(app)/scenarios/benchmark/review-contract'
import { ReviewResults } from '../app/(app)/scenarios/benchmark/benchmark-review'

const economicTraceFixture = () => {
  const result = parseReview(JSON.stringify(sample))
  return { ...result, scenarios: result.scenarios!.map(s => ({ ...s, result: { ...s.result, trace: s.result.trace! } })) }
}

it('renders real projection with all three resources, dependencies, dates and unverified limits', () => {
  const result = parseReview(JSON.stringify(economicTraceFixture()))
  const html = renderToStaticMarkup(createElement(ReviewResults, { result, calculated: true }))
  for (const text of ['Total calculado', 'Traza económica', 'Tractor MX', 'Tractor US', 'Caja compartida', 'Tasas y dependencias', 'Datos del viaje', 'Documentado, no verificado', 'capital:test', '2026-09-29', 'Sin evidencia económica', 'Frontera separada']) expect(html).toContain(text)
  expect(html).not.toContain(' open=')
  expect(html).toContain('noopener noreferrer')
  expect(result.scenarios![0].result.trace!.resources).toHaveLength(3)
})
it.each(['unknown-source', 'unknown-input', 'duplicate-resource', 'duplicate-input', 'unsafe-url', 'expired', 'scope', 'component', 'total', 'duplicate-border', 'nonfinite'] as const)('rejects malformed trace: %s', kind => {
  const input = economicTraceFixture(); const scenario = input.scenarios[0]; const trace = scenario.result.trace
  const mx = trace.resources[0]
  switch (kind) {
    case 'unknown-source': mx.inputs[0].evidenceIds = ['absent']; break
    case 'unknown-input': mx.rates[0].inputKeys = ['absent']; break
    case 'duplicate-resource': trace.resources[1] = mx; break
    case 'duplicate-input': mx.inputs.push(mx.inputs[0]); break
    case 'unsafe-url': mx.evidence[0].url = 'javascript:alert(1)'; break
    case 'expired': mx.evidence[0].validUntil = '2026-08-31'; break
    case 'scope': mx.scope = 'SHARED_TRAILER_ONCE'; break
    case 'component': mx.costs.maintenanceUsd += 1; break
    case 'total': scenario.result.costs!.cfuUsd += 1; break
    case 'duplicate-border': trace.borderCharges.push(trace.borderCharges[0]); break
    case 'nonfinite': mx.inputs[0].value = Infinity; break
  }
  expect(() => parseReview(JSON.stringify(input))).toThrow()
})
it('legacy projection remains readable without pretending missing lineage exists', () => {
  const original = economicTraceFixture()
  const source = original.scenarios[0].result
  const legacy = { calibrated: source.calibrated, costs: source.costs, sharedTrailer: source.sharedTrailer }
  const result = parseReview(JSON.stringify({ ...original, scenarios: [{ ...original.scenarios[0], result: legacy }] }))
  const html = renderToStaticMarkup(createElement(ReviewResults, { result }))
  expect(html).toContain('Traza económica no disponible')
  expect(html).toContain('Total declarado')
})
it('renders source and derivation strings as text, never executable markup', () => {
  const input = economicTraceFixture(); input.scenarios[0].result.trace.resources[0].inputs[0].derivation = '<script>alert(1)</script>'
  const html = renderToStaticMarkup(createElement(ReviewResults, { result: parseReview(JSON.stringify(input)) }))
  expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>')
})
it('expands the compact server wire contract and rejects ambiguous shared resources', () => {
  expect(parseReview(JSON.stringify(sample)).scenarios![0].result.trace!.resources.map(r => r.id)).toEqual(['mx', 'us', 'trailer'])
  const wrong = structuredClone(sample)
  wrong.sharedTractorResources.reverse()
  expect(() => parseReview(JSON.stringify(wrong))).toThrow()
  const duplicate = structuredClone(sample)
  duplicate.scenarios[0].result.trace.resources.push(duplicate.scenarios[0].result.trace.resources[0])
  expect(() => parseReview(JSON.stringify(duplicate))).toThrow()
})

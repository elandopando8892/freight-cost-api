import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { BenchmarkForm, emptyForm, FormField, setSharedContext, sourcesForPath, type FormNode, type FormValue } from '../app/(app)/scenarios/benchmark/benchmark-form'
import { fetcher } from '../lib/fetcher'
import type { FormCapture } from './fixtures/form-capture'
import schema from './visual/benchmark-form-schema.json'
vi.mock('../lib/fetcher', async original => ({ ...await original<typeof import('../lib/fetcher')>(), fetcher: vi.fn() }))

const blank = () => emptyForm(schema as FormNode) as Record<string, FormValue>
const at = (value: Record<string, FormValue>, path: string) => path.split('.').reduce((node, key) => (node as Record<string, FormValue>)[key], value as FormValue)

it('propagates the shared date and asset reference without assigning economics', () => {
  const original = blank()
  const dated = setSharedContext(original, 'serviceDate', '2026-09-29')
  const referenced = setSharedContext(dated, 'assetReference', 'TRAILER-01')
  for (const path of ['route.serviceDate', 'route.mx.parameters.serviceDate', 'route.us.parameters.serviceDate', 'fixed.capital.serviceDate']) {
    expect(at(referenced, path)).toBe('2026-09-29')
    expect(at(original, path)).toBe('')
  }
  expect(at(referenced, 'fixed.capital.assetReference')).toBe('TRAILER-01')
  expect(at(referenced, 'trailer.assetReference')).toBe('TRAILER-01')
  expect(at(referenced, 'fixed.capital.acquisitionCost.value')).toBe('')
})

it('offers only evidence from the matching dossier even when IDs coincide', () => {
  const value = blank() as FormCapture
  value.route.mx.parameters.evidence = [{ id: 'same', locator: 'MX', url: 'https://example.org/mx' }]
  value.route.us.parameters.evidence = [{ id: 'same', locator: 'US', url: 'https://example.org/us' }]
  value.fixed.capital.evidence = [{ id: 'same', locator: 'CAPITAL', url: 'https://example.org/capital' }]
  value.fixed.evidence = [{ id: 'same', locator: 'FIXED', url: 'https://example.org/fixed' }]
  value.trailer.evidence = [{ id: 'same', locator: 'TRAILER', url: 'https://example.org/trailer' }]
  expect(sourcesForPath(value, 'route.mx.trip.loadedKm.evidenceIds')[0].locator).toBe('MX')
  expect(sourcesForPath(value, 'route.us.parameters.parameters.0.evidenceIds')[0].locator).toBe('US')
  expect(sourcesForPath(value, 'fixed.capital.scenarios.0.horizon.evidenceIds')[0].locator).toBe('CAPITAL')
  expect(sourcesForPath(value, 'fixed.expenses.0.amount.evidenceIds')[0].locator).toBe('FIXED')
  expect(sourcesForPath(value, 'trailer.totalKm.evidenceIds')[0].locator).toBe('TRAILER')
})

let host: HTMLDivElement, root: Root
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); host = document.createElement('div'); document.body.append(host); root = createRoot(host) })
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals() })
it('replaces the failed panel with loading before starting a retry request', async () => {
  vi.mocked(fetcher).mockReset().mockRejectedValueOnce(new Error('offline'))
  await act(async () => root.render(createElement(BenchmarkForm, { onChange: () => {} })))
  expect(host.querySelector('[role=alert]')).not.toBeNull()
  let loadingAtRequestStart = false
  vi.mocked(fetcher).mockImplementation(() => {
    loadingAtRequestStart = host.querySelector('[role=alert]') === null && host.textContent!.includes('Cargando campos del motor…')
    return Promise.reject(new Error('still offline'))
  })
  await act(async () => host.querySelector('button')!.click())
  expect(loadingAtRequestStart).toBe(true)
  expect(host.querySelector('[role=alert]')).not.toBeNull()
})
it('shows removed source as unresolved and allows explicit deselection', async () => {
  const value = blank() as FormCapture
  value.trailer.evidence = [{ id: 'source-1', locator: 'Page 1', url: 'https://example.org' }]
  const node: FormNode = { kind: 'array', item: { kind: 'text' } }
  let selected: FormValue = ['source-1']
  const draw = async () => act(async () => root.render(createElement(FormField, { node, value: selected, path: 'trailer.totalKm.evidenceIds', name: 'evidenceIds', root: value, onChange: next => { selected = next } })))
  await draw()
  expect(host.textContent).toContain('Page 1')
  value.trailer.evidence = []
  await draw()
  expect(host.textContent).toContain('Fuente no disponible: source-1')
  await act(async () => host.querySelector('input[type="checkbox"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  expect(selected).toEqual([])
})

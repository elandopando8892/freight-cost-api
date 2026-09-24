import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { PartnerBaseEditor, PartnerBaseDetail, PartnerBaseCalculator, PartnerBaseLifecycle, type TariffBase } from '../app/(app)/cost-bases/partners/partner-base-editor'
import { thirdPartyFixture } from '../../api/tests/fixtures/third-party-cost'
import { calculateThirdPartyCost } from '../../api/src/modules/engine/third-party-cost'
import { ClientApiError } from '../lib/fetcher'

const http = vi.hoisted(() => ({ fetcher: vi.fn() }))
vi.mock('@/lib/fetcher', async original => ({ ...(await original<typeof import('@/lib/fetcher')>()), fetcher: http.fetcher }))
const { serviceDate, fx, ...terms } = thirdPartyFixture()
const base: TariffBase = { id: 'base-a', code: 'QA-BASE', name: 'Synthetic base', activeVersionId: 'version-a', archived: false, lifecycleRevision: 0, _count: { versions: 1 }, versions: [
  { id: 'version-a', version: 1, status: 'PUBLISHED', terms, termsChecksum: 'a'.repeat(64), publishedAt: '2026-09-23', publicationNote: 'Synthetic only' },
] }
const report = { ...calculateThirdPartyCost(thirdPartyFixture()), reviewChecksum: 'b'.repeat(64),
  baseLineage: { costBaseId: base.id, versionId: 'version-a', version: 1, termsChecksum: 'a'.repeat(64), model: 'FCM_THIRD_PARTY_FLAT_V1' } }
let host: HTMLDivElement
let root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); http.fetcher.mockReset()
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove() })
async function submit() { await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))) }
async function set(name: string, value: string) {
  const input = host.querySelector<HTMLInputElement>(`[name="${name}"]`)!
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })) })
}
async function click(label: string) { await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === label)!.click()) }

it('starts a new base with empty prices, without date/FX or synthetic defaults', async () => {
  await act(async () => root.render(createElement(PartnerBaseEditor)))
  expect((host.querySelector('[name="mex.linehaul"]') as HTMLInputElement).value).toBe('')
  expect(host.querySelector('[name="serviceDate"]')).toBeNull()
  expect(host.querySelector('[name="fx.mxnPerUsd"]')).toBeNull()
  expect(host.querySelector('form')!.checkValidity()).toBe(false)
})
it('keeps withdrawn terms readable but hides calculation, revisions and publication', async () => {
  await act(async () => root.render(createElement(PartnerBaseDetail, { base: { ...base, archived: true, lifecycleRevision: 1 }, role: 'ADMIN' })))
  expect(host.textContent).toContain('Base retirada')
  expect(host.textContent).not.toContain('Calcular costo de compra')
  expect(host.textContent).not.toContain('Preparar nueva revisión')
  expect(host.textContent).toContain('Ver tarifas, vigencias y supuestos')
  await click('Administrar disponibilidad')
  expect(host.textContent).toContain('Reactivar no renueva')
})
it('confirms lifecycle with expected state and reuses the exact uncertain request', async () => {
  await act(async () => root.render(createElement(PartnerBaseLifecycle, { base })))
  const form = host.querySelector('form')!
  expect(form.checkValidity()).toBe(false)
  form.querySelector('textarea')!.value = 'Retiro sintético de prueba'
  ;(form.querySelector('input') as HTMLInputElement).checked = true
  http.fetcher.mockRejectedValueOnce(new Error('Lost response')); await submit()
  const attempt = http.fetcher.mock.calls[0]
  expect(attempt[1].json).toEqual({ archived: true, expectedRevision: 0, expectedActiveVersionId: 'version-a', note: 'Retiro sintético de prueba' })
  expect(form.querySelector('fieldset')!.disabled).toBe(true)
  http.fetcher.mockResolvedValueOnce({ id: 'event', revision: 1, archived: true }); await submit()
  expect(http.fetcher.mock.calls[1]).toEqual(attempt)
  expect(host.textContent).toContain('Solicitud confirmada')
})
it('saves a terms-only revision and reuses the exact intent after uncertain delivery', async () => {
  await act(async () => root.render(createElement(PartnerBaseEditor, { base })))
  http.fetcher.mockRejectedValueOnce(new Error('Lost response'))
  await submit()
  const attempt = http.fetcher.mock.calls[0]
  expect(attempt[0]).toBe('/api/v1/partner-bases/base-a/versions')
  expect(attempt[1].json).toEqual({ terms, expectedLatestVersionId: 'version-a' })
  expect(host.querySelector('fieldset')!.disabled).toBe(true)
  http.fetcher.mockResolvedValueOnce({ id: 'version-b' })
  await submit()
  expect(http.fetcher.mock.calls[1]).toEqual(attempt)
  expect(host.textContent).toContain('Borrador guardado')
  expect(host.querySelector('a')!.getAttribute('href')).toBe('/cost-bases/partners?base=base-a')
})
it('lets an operator submit only trip date and FX, preserves lineage on save and retries safely', async () => {
  await act(async () => root.render(createElement(PartnerBaseCalculator, { baseId: base.id, version: base.versions[0] })))
  await set('serviceDate', serviceDate); await set('fx.mxnPerUsd', String(fx!.mxnPerUsd)); await set('fx.source', fx!.source); await set('fx.asOf', fx!.asOf)
  http.fetcher.mockResolvedValueOnce(report); await submit()
  expect(http.fetcher.mock.calls[0][1].json).toEqual({ serviceDate, fx })
  expect(host.querySelector('[name="mex.linehaul"]')).toBeNull()
  expect(host.textContent).toContain('2,530.00')
  http.fetcher.mockRejectedValueOnce(new Error('Lost save response')); await click('Guardar estimación')
  const attempted = http.fetcher.mock.calls[1]
  expect(attempted[1].json).toEqual({ trip: { serviceDate, fx }, reviewChecksum: report.reviewChecksum })
  http.fetcher.mockResolvedValueOnce({ id: 'saved' }); await click('Reintentar guardado sin duplicar')
  expect(http.fetcher.mock.calls[2]).toEqual(attempted)
  expect(host.querySelector('a[href="/quote/partners/saved/saved"]')).not.toBeNull()
})
it('clears a reviewed report on edit and on server conflict instead of saving stale terms', async () => {
  await act(async () => root.render(createElement(PartnerBaseCalculator, { baseId: base.id, version: base.versions[0] })))
  await set('serviceDate', serviceDate)
  http.fetcher.mockResolvedValueOnce(report); await submit()
  await set('serviceDate', '2026-10-11')
  expect(host.textContent).not.toContain('Guardar estimación')
  http.fetcher.mockResolvedValueOnce(report); await submit()
  http.fetcher.mockRejectedValueOnce(new ClientApiError(409, {}, 'La versión activa cambió.'))
  await click('Guardar estimación')
  expect(host.textContent).not.toContain('Costo conocido de compra')
  expect(host.textContent).toContain('La versión activa cambió')
})
it('restricts viewer to terms and history and removes manual capture mutation controls', async () => {
  await act(async () => root.render(createElement(PartnerBaseDetail, { base, role: 'VIEWER' })))
  expect(host.textContent).not.toContain('Publicar versión')
  expect(host.textContent).not.toContain('Preparar nueva revisión')
  expect(host.textContent).not.toContain('Calcular costo de compra')
  expect(host.querySelector('[name="serviceDate"]')).toBeNull()
})
it('requires publication confirmation and preserves the publication body on retry', async () => {
  const draft = { ...base, activeVersionId: null, versions: [{ ...base.versions[0], status: 'DRAFT', publishedAt: null }] }
  await act(async () => root.render(createElement(PartnerBaseDetail, { base: draft, role: 'ADMIN' })))
  const form = [...host.querySelectorAll('form')].find(item => item.querySelector('[name="note"]'))!
  expect(form.checkValidity()).toBe(false)
  const note = form.querySelector('textarea')!; note.value = 'Reviewed synthetic terms only'
  ;(form.querySelector('input[type="checkbox"]') as HTMLInputElement).checked = true
  expect(form.checkValidity()).toBe(true)
  http.fetcher.mockRejectedValueOnce(new Error('Lost publication response'))
  await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  const attempt = http.fetcher.mock.calls[0]
  expect(attempt[1].json).toEqual({ expectedActiveVersionId: null, note: 'Reviewed synthetic terms only' })
  http.fetcher.mockResolvedValueOnce({ id: 'version-a', status: 'PUBLISHED' })
  await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  expect(http.fetcher.mock.calls[1]).toEqual(attempt)
  expect(host.textContent).toContain('Versión publicada.')
})

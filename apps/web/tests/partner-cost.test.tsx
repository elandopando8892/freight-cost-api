import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PartnerCostForm, partnerCostPayload } from '../app/(app)/quote/partners/partner-cost-form'
import { thirdPartyFixture } from '../../api/tests/fixtures/third-party-cost'
import { calculateThirdPartyCost } from '../../api/src/modules/engine/third-party-cost'
import { ClientApiError } from '../lib/fetcher'

const http = vi.hoisted(() => ({ fetcher: vi.fn() }))
vi.mock('@/lib/fetcher', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/fetcher')>()), fetcher: http.fetcher,
}))
let root: Root
let host: HTMLDivElement
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  http.fetcher.mockReset()
  http.fetcher.mockImplementation(async (_path, init) => ({ ...calculateThirdPartyCost(init.json), reviewChecksum: 'a'.repeat(64) }))
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  await act(async () => root.render(createElement(PartnerCostForm)))
})
afterEach(async () => { await act(async () => root.unmount()); host.remove() })
async function set(name: string, value: string) {
  const field = host.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${name}"]`)!
  const proto = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(field, value)
    field.dispatchEvent(new Event('input', { bubbles: true })); field.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
async function fill(value: unknown, prefix = '') {
  for (const [key, item] of Object.entries(value as object)) {
    const name = prefix ? `${prefix}.${key}` : key
    if (item && typeof item === 'object') await fill(item, name)
    else if (name !== 'service') await set(name, String(item))
  }
}
async function submit() {
  await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
}

it('leaves prices empty and pending terms explicit instead of assuming zero', () => {
  const payload = partnerCostPayload(new FormData(host.querySelector('form')!))
  expect(payload.mex.linehaul).toBeNull()
  expect(payload.crossing.mode).toBe('UNKNOWN')
  expect(payload.fx).toBeUndefined()
  expect(host.querySelector('form')!.checkValidity()).toBe(false)
})
it('submits the actual form to the arithmetic contract and clears the old cost on edit', async () => {
  await fill(thirdPartyFixture())
  expect(host.querySelector('form')!.checkValidity()).toBe(true)
  await submit()
  expect(http.fetcher).toHaveBeenCalledWith('/api/v1/engine/third-party-cost', expect.objectContaining({ json: thirdPartyFixture() }))
  expect(host.textContent).toContain('2,530.00')
  await set('mex.linehaul', '20000')
  expect(host.textContent).not.toContain('Costo conocido de compra')
})
it('keeps an unknown charge incomplete with no complete purchase total', async () => {
  await fill(thirdPartyFixture()); await set('crossing.mode', 'UNKNOWN')
  await submit()
  expect(host.textContent).toContain('Completa los conceptos pendientes')
  expect(host.textContent).toContain('Confirma quién incluye o cobra cruce')
  expect(host.textContent).not.toContain('2,530.00')
  expect(host.textContent).not.toContain('Guardar estimación')
})

async function save() {
  const button = [...host.querySelectorAll('button')].find(item => /Guardar|Reintentar guardado/.test(item.textContent ?? ''))!
  await act(async () => button.click())
}
it('reconciles an uncertain save with the same key and reviewed input without duplicate intent', async () => {
  await fill(thirdPartyFixture()); await submit()
  http.fetcher.mockRejectedValueOnce(new Error('Timeout after commit'))
  await save()
  const attempted = http.fetcher.mock.calls.at(-1)!
  expect(attempted[0]).toBe('/api/v1/partner-cost-estimates')
  expect(attempted[1].json).toEqual({ input: thirdPartyFixture(), reviewChecksum: 'a'.repeat(64) })
  expect(host.querySelector('form fieldset')!.hasAttribute('disabled')).toBe(true)
  http.fetcher.mockResolvedValueOnce({ id: 'saved-id', version: 1 })
  await save()
  expect(http.fetcher.mock.calls.at(-1)).toEqual(attempted)
  expect(host.textContent).toContain('Versión 1 guardada')
  expect(host.querySelector('a')?.getAttribute('href')).toBe('/quote/partners/saved/saved-id')
})
it('reopens an exact capture and requires recalculation before saving a successor', async () => {
  await act(async () => root.render(createElement(PartnerCostForm, { key: 'reopen', initialInput: thirdPartyFixture(), previousId: 'parent-id' })))
  expect(partnerCostPayload(new FormData(host.querySelector('form')!))).toEqual(thirdPartyFixture())
  expect(host.textContent).not.toContain('Guardar nueva versión')
  await set('usa.linehaul', '1400'); await submit()
  expect(host.textContent).toContain('2,730.00')
  http.fetcher.mockResolvedValueOnce({ id: 'child-id', version: 2 })
  await save()
  expect(http.fetcher.mock.calls.at(-1)![1].json.previousId).toBe('parent-id')
})
it('does not display mutation controls to a read-only viewer', async () => {
  await act(async () => root.render(createElement(PartnerCostForm, { key: 'readonly', initialInput: thirdPartyFixture(), readOnly: true })))
  expect(host.querySelector('button')).toBeNull()
  await submit()
  expect(http.fetcher).not.toHaveBeenCalled()
})
it('invalidates reviewed economics after a server conflict', async () => {
  await fill(thirdPartyFixture()); await submit()
  http.fetcher.mockRejectedValueOnce(new ClientApiError(409, {}, 'Conflict'))
  await save()
  expect(host.textContent).toContain('Abre el historial')
  expect(host.textContent).not.toContain('Guardar estimación')
  expect(host.querySelector('form fieldset')!.hasAttribute('disabled')).toBe(false)
})

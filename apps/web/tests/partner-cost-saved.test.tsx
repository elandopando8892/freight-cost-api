import { act, createElement, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { thirdPartyFixture } from '../../api/tests/fixtures/third-party-cost'
import { calculateThirdPartyCost } from '../../api/src/modules/engine/third-party-cost'
import SavedPartnerCost from '../app/(app)/quote/partners/saved/[id]/page'
import SavedPartnerCosts from '../app/(app)/quote/partners/saved/page'
import SavedPartnerCostsError from '../app/(app)/quote/partners/saved/error'

const http = vi.hoisted(() => ({ api: vi.fn() }))
vi.mock('@/lib/api', () => ({ api: http.api, ApiError: class extends Error {} }))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('notFound') } }))
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: ComponentProps<'a'>) => createElement('a', { href, ...props }, children) }))
let host: HTMLDivElement
let root: Root
const report = { ...calculateThirdPartyCost(thirdPartyFixture()), reviewChecksum: 'a'.repeat(64) }
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  http.api.mockReset()
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove() })

it('renders the actual stored page for VIEWER without mutation controls', async () => {
  http.api.mockResolvedValueOnce({ id: 'saved', version: 1, snapshot: report, createdAt: '2026-09-23T00:00:00Z', actorId: 'actor', previousId: null, nextId: null }).mockResolvedValueOnce({ role: 'VIEWER' })
  const page = await SavedPartnerCost({ params: Promise.resolve({ id: 'saved' }) })
  await act(async () => root.render(page))
  expect(host.textContent).toContain('2,530.00 USD')
  expect(host.textContent).toContain('Evidencia histórica congelada')
  expect(host.textContent).not.toContain('Preparar nueva versión')
  expect(host.querySelector('button')).toBeNull()
  expect((host.querySelector('[name="fx.mxnPerUsd"]') as HTMLInputElement).value).toBe('17')
})
it('links successors instead of offering an edit of an old version', async () => {
  http.api.mockResolvedValueOnce({ id: 'saved', version: 2, snapshot: report, createdAt: '2026-09-23T00:00:00Z', actorId: 'actor', previousId: 'old', nextId: 'new' }).mockResolvedValueOnce({ role: 'OPERATOR' })
  const page = await SavedPartnerCost({ params: Promise.resolve({ id: 'saved' }) })
  await act(async () => root.render(page))
  expect(host.querySelector('a[href="/quote/partners/saved/old"]')).not.toBeNull()
  expect(host.querySelector('a[href="/quote/partners/saved/new"]')).not.toBeNull()
  expect(host.textContent).not.toContain('Preparar nueva versión')
})
it('shows base lineage and routes a new calculation through the base rather than stripping provenance', async () => {
  http.api.mockResolvedValueOnce({ id: 'saved', version: 1, snapshot: { ...report,
    baseLineage: { costBaseId: 'base-a', versionId: 'version-a', version: 3, termsChecksum: 'c'.repeat(64) } },
    createdAt: '2026-09-23T00:00:00Z', actorId: 'actor', nextId: null }).mockResolvedValueOnce({ role: 'OPERATOR' })
  await act(async () => root.render(await SavedPartnerCost({ params: Promise.resolve({ id: 'saved' }) })))
  expect(host.textContent).toContain('base publicada · v3')
  expect(host.textContent).not.toContain('Preparar nueva versión')
  expect(host.querySelector('a[href="/cost-bases/partners?base=base-a"]')).not.toBeNull()
})
it('renders paginated links and does not turn failed reads into an empty history', async () => {
  http.api.mockResolvedValueOnce({ items: [{ id: 'saved', version: 1, origin: 'Monterrey', destination: 'Dallas', serviceDate: '2026-10-10', purchaseCostUsd: 2530 }], nextCursor: 'next-page' })
  const page = await SavedPartnerCosts({ searchParams: Promise.resolve({}) })
  await act(async () => root.render(page))
  expect(host.textContent).toContain('Monterrey → Dallas')
  expect(host.querySelector('a[href="/quote/partners/saved?cursor=next-page"]')).not.toBeNull()
  http.api.mockRejectedValueOnce(new Error('DB unavailable'))
  await expect(SavedPartnerCosts({ searchParams: Promise.resolve({}) })).rejects.toThrow('DB unavailable')
})
it('retries a failed read without issuing a save', async () => {
  const retry = vi.fn()
  await act(async () => root.render(createElement(SavedPartnerCostsError, { retry, error: new Error('read failed') })))
  await act(async () => host.querySelector('button')!.click())
  expect(retry).toHaveBeenCalledOnce()
  expect(host.textContent).toContain('No vuelvas a guardar')
  expect(http.api).not.toHaveBeenCalled()
})

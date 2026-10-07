import { act, createElement, useSyncExternalStore, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { CostBasesBoard, type CostBase } from '../app/(app)/cost-bases/cost-bases-board'
import AssumptionsEditorPage from '../app/(app)/assumptions/[setId]/page'
import { api } from '../lib/api'
import { fetcher } from '../lib/fetcher'
import { costBasesHref, resolveCostBaseSelection } from '../lib/cost-base-navigation'
import { defaultProfile } from '../app/(app)/cost-bases/cost-base-profile'

vi.mock('next/navigation', () => ({
  useSearchParams: () => {
    const search = useSyncExternalStore(callback => { window.addEventListener('popstate', callback); return () => window.removeEventListener('popstate', callback) }, () => window.location.search)
    return new URLSearchParams(search)
  },
  notFound: () => { throw new Error('NOT_FOUND') },
}))
vi.mock('next/link', () => ({ default: ({ prefetch: _prefetch, ...props }: ComponentProps<'a'> & { prefetch?: boolean }) => createElement('a', props) }))
vi.mock('../lib/fetcher', () => ({ fetcher: vi.fn() }))
vi.mock('../lib/api', () => ({ api: vi.fn() }))
vi.mock('../app/(app)/assumptions/[setId]/editor', () => ({ Editor: () => createElement('p', {}, 'Editor fixture') }))

const makeBase = (id: string, isDefault = false): CostBase => ({
  id, code: id, name: `Base ${id}`, description: null, scope: 'CROSS_BORDER', operationalSegment: null,
  status: 'ACTIVE', defaultPolicy: 'OPERATIONAL_V3', currency: 'USD', isDefault, updatedAt: '2026-10-03T00:00:00Z',
  _count: { lanes: 0, quotes: 0 }, versions: [{ id: `set-${id}`, name: `Versión ${id}`, version: 1, isActive: true,
    status: 'PUBLISHED', notes: null, sourceVersionId: null, applicabilityContext: null, publishedAt: null,
    createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-03T00:00:00Z', _count: { params: 210 } }],
})
const bases = [makeBase('a', true), makeBase('b')]
let host: HTMLDivElement, root: Root, client: QueryClient
let replace: { mockRestore(): void }
async function mount() { await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(CostBasesBoard, { initial: bases, segments: [], canEdit: false })))) }
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  window.history.replaceState(null, '', '/cost-bases')
  const native = window.history.replaceState.bind(window.history)
  // Simulate Next's documented History API synchronization, not a live router.
  replace = vi.spyOn(window.history, 'replaceState').mockImplementation((...args) => { native(...args); window.dispatchEvent(new PopStateEvent('popstate')) })
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  vi.mocked(fetcher).mockReset(); vi.mocked(api).mockReset()
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); client.clear(); replace.mockRestore(); vi.unstubAllGlobals() })

it('uses the existing default only when no base was requested', () => {
  expect(resolveCostBaseSelection(bases, [])).toEqual({ selectedBaseId: 'a', unavailable: false })
  expect(resolveCostBaseSelection(bases, ['b'])).toEqual({ selectedBaseId: 'b', unavailable: false })
  expect(resolveCostBaseSelection([], [])).toEqual({ selectedBaseId: '', unavailable: false })
})
it('links the wizard to this exact version only for an explicit binational profile',async()=>{
  const eligible=makeBase('pilot');eligible.operationalSegment='D2D_BINATIONAL_OWN'
  eligible.versions[0].applicabilityContext=defaultProfile('CROSS_BORDER')
  await act(async()=>root.render(createElement(QueryClientProvider,{client},createElement(CostBasesBoard,{initial:[eligible],segments:[],canEdit:false}))))
  expect(host.querySelector('a[href="/cost-bases/pilot/versions/set-pilot/build"]')?.textContent).toBe('Armar supuestos')
  expect(fetcher).not.toHaveBeenCalled()
})
it.each([['foreign'], [''], ['a', 'b'], ['a', 'a']])('fails closed on unavailable or ambiguous selection %j', (...requested) => {
  expect(resolveCostBaseSelection(bases, requested)).toEqual({ selectedBaseId: '', unavailable: true })
})
it('builds only a local route with encoded ID, not a supplied return URL', () => {
  expect(costBasesHref('https://outside.invalid/?x=1')).toBe('/cost-bases?base=https%3A%2F%2Foutside.invalid%2F%3Fx%3D1')
  expect(costBasesHref(null)).toBe('/cost-bases')
})
it('selects an authorized deep link and retains it after remount without network writes', async () => {
  window.history.replaceState(null, '', costBasesHref('b')); await mount()
  expect(host.querySelector('button[aria-pressed=true]')?.textContent).toContain('Base b')
  expect(host.querySelector('a[href="/assumptions/set-b"]')).not.toBeNull()
  await act(async () => { root.unmount(); root = createRoot(host) }); await mount()
  expect(host.querySelector('button[aria-pressed=true]')?.textContent).toContain('Base b')
  expect(fetcher).not.toHaveBeenCalled()
})
it('selection updates the URL and responds to history navigation', async () => {
  await mount()
  await act(async () => { [...host.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].find(button => button.textContent?.includes('Base b'))!.click() })
  expect(window.location.search).toBe('?base=b')
  expect(host.querySelector('button[aria-pressed=true]')?.textContent).toContain('Base b')
  await act(async () => window.history.replaceState(null, '', costBasesHref('a')))
  expect(host.querySelector('button[aria-pressed=true]')?.textContent).toContain('Base a')
  expect(fetcher).not.toHaveBeenCalled()
})
it('unknown selection shows no substitute detail and can recover to authorized defaults', async () => {
  window.history.replaceState(null, '', costBasesHref('foreign')); await mount()
  expect(host.querySelector('[role=alert]')?.textContent).toContain('no está disponible')
  expect(host.querySelector('a[href^="/assumptions/"]')).toBeNull()
  expect(host.textContent).not.toContain('foreign')
  await act(async () => { [...host.querySelectorAll('button')].find(button => button.textContent === 'Ver bases disponibles')!.click() })
  expect(host.querySelector('[role=alert]')).toBeNull()
  expect(host.querySelector('button[aria-pressed=true]')?.textContent).toContain('Base a')
  expect(fetcher).not.toHaveBeenCalled()
})
it('does not resolve another organization or replace a requested unavailable base', () => {
  expect(resolveCostBaseSelection([makeBase('other')], ['b']).unavailable).toBe(true)
})
it.each(['ADMIN', 'VIEWER'])('editor returns to its verified base for %s, without changing immutability', async role => {
  vi.mocked(api).mockImplementation(async (path: string) => {
    if (path === '/auth/me') return { role } as never
    if (path === '/assumptions/sets') return [{ ...bases[1].versions[0], costBase: bases[1] }] as never
    if (path === '/assumptions/sets/set-b/params') return {} as never
    throw new Error('Unexpected API')
  })
  const page = await AssumptionsEditorPage({ params: Promise.resolve({ setId: 'set-b' }) })
  await act(async () => root.render(page))
  expect([...host.querySelectorAll('a')].find(a => a.textContent === '← Volver a esta base')?.getAttribute('href')).toBe(costBasesHref('b'))
  expect(host.textContent).toContain('Publicada · bloqueada')
  expect(fetcher).not.toHaveBeenCalled()
})

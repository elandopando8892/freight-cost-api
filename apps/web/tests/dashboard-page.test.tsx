import { act, createElement, isValidElement, type ComponentProps, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, expect, it, vi } from 'vitest'
import DashboardPage from '../app/(app)/page'

const http = vi.hoisted(() => ({ api: async (_path: string): Promise<unknown> => [], calls: [] as string[] }))
vi.mock('@/lib/api', () => ({ api: (path: string) => { http.calls.push(path); return http.api(path) } }))
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: ComponentProps<'a'>) => createElement('a', { href, ...props }, children) }))
vi.mock('../app/(app)/quotes-chart', () => ({ QuotesChart: () => createElement('div', null, 'Chart fixture') }))
beforeEach(() => { http.calls = []; http.api = async () => [] })

async function markup(node: ReactNode) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const host = document.createElement('div')
  const root = createRoot(host)
  try {
    await act(async () => root.render(node))
    return host.innerHTML
  } finally { await act(async () => root.unmount()) }
}

function failures(node: ReactNode): unknown[] {
  if (Array.isArray(node)) return node.flatMap(failures)
  if (!isValidElement<{ error?: unknown; children?: ReactNode }>(node)) return []
  return [...(node.props.error ? [node.props.error] : []), ...failures(node.props.children)]
}

it('passes five plain failure states into the actual dashboard component tree when all queries fail', async () => {
  http.api = async () => { throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } }) }
  const errors = failures(await DashboardPage())
  expect(errors).toHaveLength(5)
  expect(errors).toEqual(Array(5).fill({ status: null, kind: 'UNAVAILABLE' }))
  expect(JSON.stringify(errors)).not.toContain('fetch failed')
  expect(http.calls).toHaveLength(4)
})
it('preserves HTTP 401 as plain state rather than transporting the original Error into rendering', async () => {
  http.api = async () => { throw Object.assign(new Error('Unauthorized'), { status: 401 }) }
  expect(failures(await DashboardPage())).toEqual(Array(5).fill({ status: 401, kind: 'HTTP' }))
})
it('keeps successful sections visible when another fails', async () => {
  http.api = async (path: string) => {
    if (path === '/market/fuel') return Promise.reject(Object.assign(new Error('Unavailable'), { status: 503 }))
    if (path === '/onboarding/carrier') return Promise.resolve({ completed: 3, total: 3, ready: true })
    return Promise.resolve([])
  }
  const html = await markup(await DashboardPage())
  expect(html).toContain('Combustible no disponible')
  expect(html).not.toContain('Bases de costo no disponible')
  expect(html).not.toContain('Cotizaciones no disponible')
})

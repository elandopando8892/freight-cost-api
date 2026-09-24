import { act, createElement, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import PartnerBasesPage from '../app/(app)/cost-bases/partners/page'

const http = vi.hoisted(() => ({ api: vi.fn() }))
vi.mock('@/lib/api', () => ({ api: http.api }))
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: ComponentProps<'a'>) => createElement('a', { href, ...props }, children) }))
let host: HTMLDivElement
let root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); http.api.mockReset()
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove() })

it('shows an honest empty state and a creation entry for admin', async () => {
  http.api.mockResolvedValueOnce({ items: [], nextCursor: null }).mockResolvedValueOnce({ role: 'ADMIN' })
  await act(async () => root.render(await PartnerBasesPage({ searchParams: Promise.resolve({}) })))
  expect(host.textContent).toContain('No se han cargado tarifas comerciales')
  expect(host.querySelector('a[href="/cost-bases/partners?new=1"]')).not.toBeNull()
})
it('does not mount an editor for a viewer who manually requests new=1', async () => {
  http.api.mockResolvedValueOnce({ items: [], nextCursor: null }).mockResolvedValueOnce({ role: 'VIEWER' })
  await act(async () => root.render(await PartnerBasesPage({ searchParams: Promise.resolve({ new: '1' }) })))
  expect(host.querySelector('form')).toBeNull()
  expect(host.querySelector('a[href="/cost-bases/partners?new=1"]')).toBeNull()
})
it('does not disguise API or missing-schema errors as an empty list', async () => {
  http.api.mockRejectedValueOnce(new Error('Storage unavailable')).mockResolvedValueOnce({ role: 'ADMIN' })
  await expect(PartnerBasesPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('Storage unavailable')
})

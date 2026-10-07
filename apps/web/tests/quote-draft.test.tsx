import { act, createElement, useLayoutEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuoteDraft, type QuoteDraft } from '../app/(app)/quote/use-quote-draft'
import type { QuoteResult } from '../app/(app)/quote/quote-shared'
import { QuoteModes } from '../app/(app)/quote/quote-modes'
import {ClientApiError} from '../lib/fetcher'

const http = vi.hoisted(() => ({ fetcher: vi.fn() }))
vi.mock('@/lib/fetcher', async original => ({...await original<typeof import('../lib/fetcher')>(),fetcher:http.fetcher}))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))
// Child form renderers are isolated; the actual mode buttons and draft owner mount.
vi.mock('../app/(app)/quote/quote-wizard', () => ({ QuoteWizard: DraftProbe }))
vi.mock('../app/(app)/quote/quote-form', () => ({ QuoteForm: DraftProbe }))

function deferred() {
  let resolve!: (value: QuoteResult) => void
  let reject!: (error: Error) => void
  const promise = new Promise<QuoteResult>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
// The hook treats the server result as opaque; economic fixtures live in API tests.
const result = (previewId: string) => ({ previewId }) as QuoteResult
let draft: QuoteDraft
let root: Root
let host: HTMLDivElement
function DraftProbe({ draft: value }: { draft: QuoteDraft }) {
  useLayoutEffect(() => { draft = value })
  return null
}
function Harness({ mode = 'guided' }: { mode?: string }) {
  const value = useQuoteDraft([])
  useLayoutEffect(() => { draft = value })
  return createElement('output', null, mode, JSON.stringify(value.form))
}
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  http.fetcher.mockReset()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(createElement(Harness)))
})
afterEach(async () => { await act(async () => root.unmount()); host.remove() })
async function calculate(id = 'preview-a') {
  http.fetcher.mockResolvedValueOnce({fuel:null}).mockResolvedValueOnce(result(id))
  await act(async () => { await draft.quote.mutate() })
}

describe('mounted shared quote draft', () => {
  it.each([401,403,409])('clears accepted fuel after HTTP %s and requires a fresh review',async status=>{
    const fuel={contextHash:'a'.repeat(64),serviceDate:'2026-09-30',origin:'Synthetic MX',destination:'Synthetic US',
      outState:'TX',region:null,referencePriceUsdGal:5,observationDate:null,source:'USA_FUEL_CACHE',fscUsdMile:0.8,warning:'Synthetic provisional reference'}
    http.fetcher.mockResolvedValueOnce({fuel})
    await act(async()=>{await draft.quote.mutate()})
    expect(draft.fuelReview?.contextHash).toBe('a'.repeat(64))
    http.fetcher.mockRejectedValueOnce(new ClientApiError(status,null,'synthetic denial'))
    await act(async()=>{await draft.acceptFuel({mode:'REFERENCE',contextHash:'a'.repeat(64),provisionalAccepted:true})})
    expect(draft.fuelReview).toBeNull();expect(draft.reviewed).toBeNull();expect(draft.saveState).toBeNull()
    http.fetcher.mockResolvedValueOnce({fuel})
    await act(async()=>{await draft.quote.mutate()})
    expect(http.fetcher.mock.calls.at(-1)?.[0]).toBe('/api/v1/engine/route-inputs')
    expect(draft.reviewed).toBeNull();expect(draft.fuelReview?.contextHash).toBe('a'.repeat(64))
  })
  it('actual mode buttons preserve every captured field, result and save intent', async () => {
    await act(async () => root.render(createElement(QuoteModes)))
    await act(async () => draft.update(f => ({ ...f, outboundLocation: 'Monterrey', inboundLocation: 'Dallas', mexBorder: 'Nuevo Laredo', usBorder: 'Laredo', fxRate: '18.75', truckType: 'Thorton', trailer: 'Reefer', config: 'Tandem', driver: 'CDL', route: 'fixture-route', service: 'Roundtrip', costBaseId: 'fixture-base' })))
    const capture = { ...draft.form }
    await calculate()
    const intent = draft.saveState?.key
    for (const label of ['Rápido', 'Guiado']) {
      const button = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.includes(label))!
      await act(async () => button.click())
      expect(button.getAttribute('aria-pressed')).toBe('true')
      expect(draft.form).toEqual(capture)
      expect(draft.reviewed?.form).toEqual(capture)
      expect(draft.saveState?.key).toBe(intent)
    }
    expect(http.fetcher).toHaveBeenCalledTimes(2)
  })
  it('retains capture and reviewed result on parent mode rerenders without another request', async () => {
    await act(async () => draft.update(previous => ({ ...previous, outboundLocation: 'Monterrey, NL', inboundLocation: 'Dallas, TX', fxRate: '18.75' })))
    const capture = { ...draft.form }
    await calculate()
    for (const mode of ['fast', 'guided']) {
      await act(async () => root.render(createElement(Harness, { mode })))
      expect(draft.form).toEqual(capture)
      expect(draft.reviewed?.form).toEqual(capture)
      expect(draft.reviewed?.result.previewId).toBe('preview-a')
    }
    expect(http.fetcher).toHaveBeenCalledTimes(2)
  })
  it('invalidates result and saved association only for effective input changes', async () => {
    await act(async () => draft.update(f => ({ ...f, outboundLocation: 'Monterrey' })))
    await calculate()
    await act(async () => { draft.recordSaved('preview-a', 'quote-a') })
    await act(async () => draft.update(f => ({ ...f, outboundLocation: ' Monterrey ' })))
    expect(draft.saveState?.savedId).toBe('quote-a')
    await act(async () => draft.update(f => ({ ...f, fxRate: '20' })))
    expect(draft.reviewed).toBeNull()
    expect(draft.saveState).toBeNull()
  })
  it.each(['success', 'error'])('ignores delayed %s after a newer calculation', async outcome => {
    const old = deferred()
    http.fetcher.mockReturnValueOnce(old.promise)
    let pending!: Promise<void>
    await act(async () => { pending = draft.quote.mutate() })
    await act(async () => draft.update(f => ({ ...f, fxRate: '21' })))
    await calculate('preview-b')
    await act(async () => {
      if (outcome === 'success') old.resolve(result('preview-a'))
      else old.reject(new Error('obsolete error'))
      await pending
    })
    expect(draft.reviewed?.result.previewId).toBe('preview-b')
    expect(draft.reviewed?.form.fxRate).toBe('21')
    expect(draft.quote.isError).toBe(false)
  })
  it('deduplicates synchronous submissions and rejects a response after reset', async () => {
    const old = deferred()
    http.fetcher.mockReturnValueOnce(old.promise)
    let pending!: Promise<void>
    await act(async () => {
      pending = draft.quote.mutate()
      void draft.quote.mutate()
      void draft.quote.mutate()
    })
    expect(http.fetcher).toHaveBeenCalledTimes(1)
    await act(async () => draft.reset())
    await act(async () => { old.resolve(result('obsolete')); await pending })
    expect(draft.reviewed).toBeNull()
    expect(draft.quote.isPending).toBe(false)
  })
  it('reuses uncertain save intent and creates a fresh key only for an explicit copy', async () => {
    await calculate()
    let first!: ReturnType<QuoteDraft['beginSave']>
    let retry!: ReturnType<QuoteDraft['beginSave']>
    await act(async () => { first = draft.beginSave(); retry = draft.beginSave() })
    expect(retry).toEqual(first)
    await act(async () => { draft.recordSaved('preview-a', 'quote-a') })
    let copy!: ReturnType<QuoteDraft['beginSave']>
    await act(async () => { copy = draft.beginSave(); retry = draft.beginSave() })
    expect(copy?.key).not.toBe(first?.key)
    expect(retry).toEqual(copy)
    await act(async () => draft.update(f => ({ ...f, fxRate: '19' })))
    expect(draft.recordSaved('preview-a', 'late-quote')).toBe(false)
  })
})

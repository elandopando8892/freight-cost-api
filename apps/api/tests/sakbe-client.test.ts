import { describe, expect, it, vi } from 'vitest'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createSakbeClient, sakbeTruckClass } from '../src/modules/routing/sakbe.client.js'

// Synthetic contract envelopes only. No source prices or production credential.
const TOKEN = 'SYNTHETIC_ONLY'.padEnd(36, 'X')
const point = { type: 'Point', coordinates: [-99.5, 27.5] }
const shape = { type: 'LineString', coordinates: [[-99.5, 27.5], [-99.4, 27.6]] }
const request = () => ({ origin: { id: 1, label: 'Synthetic MX origin' },
  destination: { id: 2, label: 'Synthetic MX bridge' }, mode: 'optima', axles: 5, additionalAxles: 0,
  equipmentConfirmed: false, direction: 'MX_TO_US', candidateOnly: true })
const summary = () => ({ long_km: '10', tiempo_min: '20', costo_caseta: '100', peaje: 't', geojson: JSON.stringify(shape), advertencia: '' })
const detail = () => [{ direccion: 'Synthetic toll approach', long_m: '10000', tiempo_min: '20', costo_caseta: '100', punto_caseta: JSON.stringify(point) }]
const envelope = (data: unknown) => new Response(JSON.stringify({ response: { success: true, message: 'OK' }, data }))
const clock = () => new Date('2026-09-30T12:00:00Z')
function fixture(s: any = summary(), d: any = detail()) {
  const fetcher = vi.fn(async (url: string) => envelope(url.includes('/detalle_') ? d : s))
  return { fetcher, client: createSakbeClient({ token: TOKEN, fetcher, now: clock }) }
}

describe('SAKBE local server-side routing client', () => {
  it('maps five truck axles to v=8, not the SICT UI selector 12', () => {
    expect(Array.from({ length: 8 }, (_, i) => sakbeTruckClass(i + 2))).toEqual([5, 6, 7, 8, 9, 10, 11, 12])
    expect(sakbeTruckClass(5)).toBe(8)
  })
  it.each([1, 10, 3.5, NaN])('rejects unsupported axle value %s', value => {
    expect(() => sakbeTruckClass(value)).toThrow('INVALID_INPUT')
  })
  it('requires a private valid token before any request', () => {
    const fetcher = vi.fn()
    expect(() => createSakbeClient({ fetcher })).toThrow('MISSING_TOKEN')
    expect(() => createSakbeClient({ token: 'bad', fetcher })).toThrow('INVALID_TOKEN')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it.each(['optima', 'cuota', 'libre'])('pairs %s with the matching detail endpoint and identical profile', async mode => {
    const { client, fetcher } = fixture()
    const output = await client.routeCandidate({ ...request(), mode })
    const detailName = { optima: 'detalle_o', cuota: 'detalle_c', libre: 'detalle_l' }[mode]
    expect(fetcher.mock.calls.map(call => call[0])).toEqual([
      `https://gaia.inegi.org.mx/sakbe_v3.1/${mode}`, `https://gaia.inegi.org.mx/sakbe_v3.1/${detailName}`])
    // Inspect the mock transport, not real secrets or real outbound traffic.
    const transportCalls = fetcher.mock.calls as unknown as [string, RequestInit][]
    for (const [url, init] of transportCalls) {
      const body = init.body as URLSearchParams
      expect(url).not.toContain(TOKEN)
      expect(init).toMatchObject({ method: 'POST', redirect: 'error' })
      expect(init.signal).toBeInstanceOf(AbortSignal)
      expect(Object.fromEntries(body)).toEqual({ dest_i: '1', dest_f: '2', v: '8', e: '0', key: TOKEN, type: 'json', proj: 'GRS80' })
    }
    expect(output.request.sakbeVehicleClass).toBe('8')
  })
  it('normalizes km, meters, ideal minutes and MXN without adopting any trip input', async () => {
    const result = await fixture().client.routeCandidate(request())
    expect(result.observations.summary).toMatchObject({ distanceKm: 10, idealMinutes: 20, observedTollsMxn: 100, geometry: shape })
    expect(result.observations.detailTotals).toEqual({ distanceKm: 10, idealMinutes: 20, observedTollsMxn: 100 })
    expect(result).toMatchObject({ status: 'INCOMPLETE', retrievedAt: '2026-09-30T12:00:00.000Z', currency: 'MXN',
      serviceDate: null, tariffEffectiveDate: null, quoteReady: false, calibrated: false, adoptedValues: 0,
      handoff: { loadedKm: null, emptyKm: null, cycleDays: null, tollsUsd: null } })
    expect(result.observations.summary.observedExtraAxleChargeMxn).toBeNull()
  })
  it('searches without selecting the first result or inventing IDs', async () => {
    const fetcher = vi.fn(async () => envelope([{ id_dest: '42', nombre: 'Synthetic Nuevo Laredo', ent_abr: 'Tams', geojson: point }]))
    const result = await createSakbeClient({ token: TOKEN, fetcher, now: clock }).searchDestinations('Nuevo Laredo')
    expect(result.candidates[0]).toEqual({ id: 42, label: 'Synthetic Nuevo Laredo', state: 'Tams', geometry: point })
    expect(result.selectedDestination).toBeNull()
  })
  it('returns an empty search without fabricating a destination', async () => {
    const result = await createSakbeClient({ token: TOKEN, fetcher: async () => envelope([]) }).searchDestinations('Nuevo Laredo')
    expect(result.candidates).toEqual([])
    expect(result.selectedDestination).toBeNull()
  })
  it('handles HTTP 200 with access denied independently of HTTP success', async () => {
    const client = createSakbeClient({ token: TOKEN, fetcher: async () => new Response(JSON.stringify({
      response: { success: false, message: `Clave NO autorizada ${TOKEN}` } })) })
    await expect(client.searchDestinations('Nuevo Laredo')).rejects.toThrow('ACCESS_DENIED')
  })
  it.each([401, 403, 429, 500])('sanitizes HTTP status %s and never emits error response body', async status => {
    const client = createSakbeClient({ token: TOKEN, fetcher: async () => new Response(TOKEN, { status }) })
    await expect(client.searchDestinations('Nuevo Laredo')).rejects.toThrow(status < 429 ? 'ACCESS_DENIED' : 'HTTP_ERROR')
  })
  it('removes transport failure prose and its secret-bearing cause', async () => {
    const client = createSakbeClient({ token: TOKEN, fetcher: async () => { throw new Error(`request key=${TOKEN}`) } })
    try { await client.searchDestinations('Nuevo Laredo'); throw new Error('Expected rejection') } catch (error) {
      expect(String(error)).toContain('TRANSPORT_ERROR')
      expect(String(error)).not.toContain(TOKEN)
      expect((error as Error).cause).toBeUndefined()
    }
  })
  it('times out without retrying or disclosing request', async () => {
    vi.useFakeTimers()
    try {
      const fetcher = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_, reject) => {
        init.signal!.addEventListener('abort', () => reject(new Error(TOKEN)))
      }))
      const client = createSakbeClient({ token: TOKEN, fetcher })
      const promise = expect(client.searchDestinations('Nuevo Laredo')).rejects.toThrow('REQUEST_TIMEOUT')
      await vi.advanceTimersByTimeAsync(15_000)
      await promise
      expect(fetcher).toHaveBeenCalledTimes(1)
    } finally { vi.useRealTimers() }
  })
  it('rejects oversized body before retaining it as route evidence', async () => {
    const client = createSakbeClient({ token: TOKEN, fetcher: async () => new Response('a'.repeat(2_000_001)) })
    await expect(client.searchDestinations('Nuevo Laredo')).rejects.toThrow('RESPONSE_TOO_LARGE')
  })
  it.each([{}, { response: {} }, { response: { success: true, succes: false }, data: [] }])(
    'rejects absent or conflicting provider success flags', async raw => {
      const client = createSakbeClient({ token: TOKEN, fetcher: async () => new Response(JSON.stringify(raw)) })
      await expect(client.searchDestinations('Nuevo Laredo')).rejects.toThrow()
    })
  it('supports documented succes alias but keeps provider rejection fail-closed', async () => {
    const client = createSakbeClient({ token: TOKEN, fetcher: async () => new Response(JSON.stringify({ response: { succes: true }, data: [] })) })
    expect((await client.searchDestinations('Nuevo Laredo')).candidates).toEqual([])
    const rejected = createSakbeClient({ token: TOKEN, fetcher: async () => new Response(JSON.stringify({ response: { success: false, message: TOKEN } })) })
    await expect(rejected.searchDestinations('Nuevo Laredo')).rejects.toThrow('PROVIDER_REJECTED')
  })
  it('rejects malformed JSON rather than interpreting HTML as route data', async () => {
    const client = createSakbeClient({ token: TOKEN, fetcher: async () => new Response('<html>Unreachable</html>') })
    await expect(client.searchDestinations('Nuevo Laredo')).rejects.toThrow('INVALID_RESPONSE')
  })
  it.each(['', null, true, -1, 'NaN'])('rejects missing/invalid toll %s instead of coercing to zero', async toll => {
    const s = summary(); s.costo_caseta = toll as any
    await expect(fixture(s).client.routeCandidate(request())).rejects.toThrow('INVALID_RESPONSE')
  })
  it('rejects coordinates in meters passed as GRS80 and invalid JSON geometry', async () => {
    const s = summary(); s.geojson = JSON.stringify({ ...shape, coordinates: [[500000, 4000000], [500001, 4000001]] })
    await expect(fixture(s).client.routeCandidate(request())).rejects.toThrow('INVALID_RESPONSE')
    s.geojson = 'not geometry'
    await expect(fixture(s).client.routeCandidate(request())).rejects.toThrow('INVALID_RESPONSE')
  })
  it('strips echoed secrets in labels, instructions and feature properties', async () => {
    const s = summary(); s.geojson = JSON.stringify({ type: 'Feature', geometry: shape, properties: { key: TOKEN } })
    const d = detail(); d[0].direccion = TOKEN
    const result = await fixture(s, d).client.routeCandidate({ ...request(), origin: { id: 1, label: TOKEN } })
    expect(JSON.stringify(result)).not.toContain(TOKEN)
    expect(result.observations.summary.geometry).toEqual({ type: 'Feature', geometry: shape })
    expect(result.request.origin.label).toBe('[REDACTED]')
  })
  it('exposes summary/detail discrepancies without repairing them or double adding totals', async () => {
    const d = detail(); d[0].long_m = '12000'; d[0].tiempo_min = '30'; d[0].costo_caseta = '150'
    const result = await fixture(summary(), d).client.routeCandidate(request())
    expect(result.issues).toEqual(expect.arrayContaining(['DISTANCE_SUMMARY_DETAIL_MISMATCH', 'TIME_SUMMARY_DETAIL_MISMATCH', 'TOLL_SUMMARY_DETAIL_MISMATCH']))
    expect(result.observations.summary.observedTollsMxn).toBe(100)
    expect(result.handoff.tollsUsd).toBeNull()
  })
  it('flags toll zeros, absent charged plaza, provider warning and contradictory toll flag', async () => {
    const s = summary(); s.peaje = 'f'; s.advertencia = TOKEN
    const d = detail(); d.push({ ...d[0], costo_caseta: '0' }); d[0].punto_caseta = ''
    const result = await fixture(s, d).client.routeCandidate(request())
    expect(result.issues).toEqual(expect.arrayContaining(['ZERO_AT_TOLL_POINT_UNVERIFIED', 'CHARGED_TOLL_POINT_MISSING', 'PROVIDER_WARNING_PRESENT', 'TOLL_FLAG_MISMATCH']))
    expect(JSON.stringify(result)).not.toContain(TOKEN)
  })
  it('keeps extra axle charges separate and missing coverage visible', async () => {
    const result = await fixture().client.routeCandidate({ ...request(), additionalAxles: 1 })
    expect(result.issues).toContain('EXTRA_AXLE_COVERAGE_INCOMPLETE')
    expect(result.issues).toContain('EXTRA_AXLE_CHARGES_SEPARATE_NOT_ADDED_TO_BASE_TOLLS')
  })
  it('validates IDs/profile/direction before sending any request', async () => {
    const { client, fetcher } = fixture()
    for (const change of [{ origin: { id: null, label: 'Pending' } }, { direction: 'US_TO_MX' },
      { equipmentConfirmed: true }, { candidateOnly: false }, { mode: 'https://other-host.test' },
      { destination: { id: 1, label: 'Same point' } }]) {
      await expect(client.routeCandidate({ ...request(), ...change })).rejects.toThrow('INVALID_INPUT')
    }
    await expect(client.searchDestinations('MX')).rejects.toThrow('INVALID_INPUT')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('CLI missing-token path stays independent of database configuration', () => {
    const script = fileURLToPath(new URL('../scripts/query-sakbe-route.ts', import.meta.url))
    const tsx = fileURLToPath(new URL('../../../node_modules/tsx/dist/cli.mjs', import.meta.url))
    const result = spawnSync(process.execPath, [tsx, script, '--search=Nuevo Laredo'], {
      encoding: 'utf8', env: { ...process.env, INEGI_SAKBE_TOKEN: '', DATABASE_URL: 'INVALID_NEVER_LOAD', STAGING_DATABASE_URL: 'INVALID_NEVER_LOAD' } })
    expect(result.status).toBe(2)
    expect(result.stderr).toBe('')
    expect(JSON.parse(result.stdout)).toMatchObject({ status: 'BLOCKED', code: 'MISSING_TOKEN', databaseAccessed: false })
    expect(result.stdout).not.toContain('INVALID_NEVER_LOAD')
  })
  it.each(['optima', 'cuota', 'libre'])('explicit %s detail never fabricates a summary or calls a summary endpoint', async mode => {
    const { client, fetcher } = fixture()
    const result = await client.detailCandidate({ ...request(), mode })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][0]).toBe(`https://gaia.inegi.org.mx/sakbe_v3.1/${{optima:'detalle_o',cuota:'detalle_c',libre:'detalle_l'}[mode]}`)
    expect(result.artifact).toBe('FCM_SAKBE_MX_DETAIL_CANDIDATE')
    expect(result.observations.summary).toBeNull()
    expect(result.observations.geometry).toBeNull()
    expect(result.observations.detailTotals).toEqual({ distanceKm:10, idealMinutes:20, observedTollsMxn:100 })
    expect(result.issues).toContain('SUMMARY_DETAIL_RECONCILIATION_PENDING')
    expect(result).toMatchObject({ calibrated:false, quoteReady:false, adoptedValues:0,
      handoff:{loadedKm:null,emptyKm:null,cycleDays:null,tollsUsd:null} })
  })
  it('partial detail preserves zero/unlocated tolls and missing extra axle coverage', async () => {
    const d = detail(); d.push({...d[0],costo_caseta:'0'}); d[0].punto_caseta = ''
    const result = await fixture(summary(),d).client.detailCandidate({...request(),additionalAxles:1})
    expect(result.issues).toEqual(expect.arrayContaining(['ZERO_AT_TOLL_POINT_UNVERIFIED',
      'CHARGED_TOLL_POINT_MISSING','EXTRA_AXLE_COVERAGE_INCOMPLETE']))
  })
  it('rejects partial detail invalid input, bad geometry and absent costs without defaults', async () => {
    const { client, fetcher } = fixture()
    await expect(client.detailCandidate({...request(),candidateOnly:false})).rejects.toThrow('INVALID_INPUT')
    expect(fetcher).not.toHaveBeenCalled()
    const d=detail(); d[0].punto_caseta = 'invalid'
    await expect(fixture(summary(),d).client.detailCandidate(request())).rejects.toThrow('INVALID_RESPONSE')
    delete (d[0] as any).costo_caseta
    await expect(fixture(summary(),d).client.detailCandidate(request())).rejects.toThrow('INVALID_RESPONSE')
  })
  it('partial detail redacts echoed secrets without weakening full route failure', async () => {
    const d=detail(); d[0].direccion=TOKEN
    const result=await fixture(summary(),d).client.detailCandidate({...request(),origin:{id:1,label:TOKEN}})
    expect(JSON.stringify(result)).not.toContain(TOKEN)
    const fetcher=vi.fn(async (url:string)=>{
      if(url.includes('/detalle_')) return envelope(detail())
      throw new Error(TOKEN)
    })
    await expect(createSakbeClient({token:TOKEN,fetcher}).routeCandidate(request())).rejects.toThrow('TRANSPORT_ERROR')
  })
  it('CLI partial detail with explicitly blank token never loads the private human credential', () => {
    const script=fileURLToPath(new URL('../scripts/query-sakbe-route.ts',import.meta.url))
    const tsx=fileURLToPath(new URL('../../../node_modules/tsx/dist/cli.mjs',import.meta.url))
    const result=spawnSync(process.execPath,[tsx,script,'--detail=docs/research/unused.json'],{
      encoding:'utf8',env:{...process.env,INEGI_SAKBE_TOKEN:'',DATABASE_URL:'INVALID_NEVER_LOAD'}})
    expect(result.status).toBe(2)
    expect(JSON.parse(result.stdout)).toMatchObject({status:'BLOCKED',code:'MISSING_TOKEN',databaseAccessed:false})
  })
})

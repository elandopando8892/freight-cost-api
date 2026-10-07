import { afterEach, describe, it, expect, vi } from 'vitest'
const memory = vi.hoisted(() => ({ upsert: vi.fn(async () => ({})) }))
vi.mock('../src/config/prisma.js', () => ({ prisma: new Proxy({}, {
  get(_target, key) {
    if (key === 'regionDiesel') return { upsert: memory.upsert }
    throw new Error('Real database access forbidden in fuel parser tests')
  },
}) }))
import { fetchEiaCurrentDiesel, parseDieselRss, parseDieselRssObservation, writableFuelAssumptionSetWhere } from '../src/modules/market/fuel.service.js'

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

const FIXTURE = `<![CDATA[<br/>
Regular Gasoline Retail Price <br/>
4.490  .. U.S.  <br/>
3.951 ... Gulf Coast  <br/>
On-Highway Diesel Fuel Retail Price <br/>
5.596  .. U.S.  <br/>
5.122 ... Gulf Coast  <br/>
6.524 ... West Coast  <br/>
5.920 ... West Coast less California<br/>
7.222 .... California  ]]>`
const dated = (body = FIXTURE, date = '10/05/26') => `<rss><channel><item>
  <title>Data For ${date}</title><pubDate>Tue, 06 Oct 2026 09:18:36 EST</pubDate>
  <description>${body.replace('On-Highway Diesel Fuel Retail Price', 'On-Highway Diesel Fuel Retail Price<br/>(Dollars per Gallon)')}</description></item></channel></rss>`

describe('EIA diesel RSS parser', () => {
  it('parses the diesel section by region (ignores gasoline)', () => {
    const p = parseDieselRss(FIXTURE)
    expect(p['U.S.']).toBe(5.596)          // diesel, not gasoline 4.49
    expect(p['Gulf Coast']).toBe(5.122)    // diesel, not gasoline 3.951
  })
  it('matches complete region names rather than substrings', () => {
    const p = parseDieselRss(FIXTURE)
    expect(p['West Coast']).toBe(6.524)              // not 5.920 (less California line)
    expect(p['West Coast less California']).toBe(5.920)
    expect(p['California']).toBe(7.222)              // not 5.920
  })
  it('does not replace regional prices with a more expensive overlapping region', () => {
    const p = parseDieselRss(`On-Highway Diesel Fuel Retail Price<br/>
      5.100 .. West Coast<br/>6.200 .. West Coast less California<br/>4.300 .. California`)
    expect(p).toEqual({ 'West Coast': 5.1, 'West Coast less California': 6.2, California: 4.3 })
  })
  it('does not substitute gasoline when the diesel section is missing', () => {
    expect(parseDieselRss('Regular Gasoline Retail Price<br/>4.490 .. U.S.')).toEqual({})
  })
  it('rejects contradictory duplicate prices instead of silently selecting the maximum', () => {
    expect(() => parseDieselRss('On-Highway Diesel Fuel Retail Price<br/>5.100 .. U.S.<br/>5.200 .. U.S.'))
      .toThrow('EIA_RSS_CONFLICTING_REGION')
  })
  it('ignores unknown names, invalid amounts and digits outside the price token', () => {
    expect(parseDieselRss(`On-Highway Diesel Fuel Retail Price<br/>
      -5.100 .. U.S.<br/>0 .. Gulf Coast<br/>Infinity .. Midwest<br/>
      5.1 .. California revised 2026<br/>5.2 .. Unknown Coast`)).toEqual({})
  })
  it('does not merge an older RSS item into the selected diesel observation', () => {
    expect(parseDieselRss(`<description><![CDATA[On-Highway Diesel Fuel Retail Price<br/>
      5.1 .. U.S.]]></description><description><![CDATA[
      On-Highway Diesel Fuel Retail Price<br/>7.2 .. U.S.<br/>8.3 .. Gulf Coast]]></description>`))
      .toEqual({ 'U.S.': 5.1 })
  })
  it('allows identical repeats without inventing a second regional observation', () => {
    expect(parseDieselRss('On-Highway Diesel Fuel Retail Price<br/>5.100 .. U.S.<br/>5.100 .. U.S.'))
      .toEqual({ 'U.S.': 5.1 })
  })
  it('rejects an incomplete cohort before any persistence access', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(dated())))
    await expect(fetchEiaCurrentDiesel()).rejects.toThrow('EIA_RSS_INCOMPLETE_DIESEL_REGIONS')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(memory.upsert).not.toHaveBeenCalled()
  })
  it('rejects upstream failure before parsing or writing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 })))
    await expect(fetchEiaCurrentDiesel()).rejects.toThrow('EIA RSS fetch failed: 503')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(memory.upsert).not.toHaveBeenCalled()
  })
})

describe('dated EIA observation, not cache write date', () => {
  it('uses the observation title, not the different publication or current date', () => {
    expect(parseDieselRssObservation(dated())).toMatchObject({
      observationDate: '2026-10-05', publicationDate: 'Tue, 06 Oct 2026 09:18:36 EST',
      unit: 'USD/US_GALLON', prices: { 'U.S.': 5.596 },
    })
  })
  it.each(['02/30/26', '13/05/26', '10/00/26', 'invalid'])('rejects invalid observation date %s', date => {
    expect(() => parseDieselRssObservation(dated(FIXTURE, date))).toThrow('EIA_RSS_OBSERVATION_DATE_REQUIRED')
  })
  it('accepts a four-digit year and rejects an undated fragment', () => {
    expect(parseDieselRssObservation(dated(FIXTURE, '10/05/2026')).observationDate).toBe('2026-10-05')
    expect(() => parseDieselRssObservation(FIXTURE)).toThrow('EIA_RSS_SINGLE_OBSERVATION_REQUIRED')
  })
  it('does not pair an earlier item date with a later item diesel price', () => {
    expect(() => parseDieselRssObservation(dated('Regular Gasoline Retail Price<br/>4.1 .. U.S.', '09/28/26') + dated()))
      .toThrow('EIA_RSS_SINGLE_OBSERVATION_REQUIRED')
  })
  it('requires a diesel section and never infers publication from observation', () => {
    expect(() => parseDieselRssObservation(dated('Regular Gasoline Retail Price<br/>4.1 .. U.S.')))
      .toThrow('EIA_RSS_DIESEL_SECTION_REQUIRED')
    expect(parseDieselRssObservation(dated().replace(/<pubDate>.*?<\/pubDate>/, '')).publicationDate).toBeNull()
  })
  it('rejects a different price unit instead of relabelling it USD per gallon', () => {
    expect(() => parseDieselRssObservation(dated().replace('Dollars per Gallon', 'Dollars per Liter')))
      .toThrow('EIA_RSS_DIESEL_UNIT_REQUIRED')
  })
  it('rejects a future observation before persistence', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(dated(FIXTURE, '12/31/2099'))))
    await expect(fetchEiaCurrentDiesel()).rejects.toThrow('EIA_RSS_FUTURE_OBSERVATION')
    expect(memory.upsert).not.toHaveBeenCalled()
  })
  it('returns source dates for a complete refresh without claiming date persistence', async () => {
    // Synthetic values, no economic adoption or real database/provider call.
    const regions = ['U.S.', 'East Coast', 'New England', 'Central Atlantic', 'Lower Atlantic',
      'Midwest', 'Gulf Coast', 'Rocky Mountain', 'West Coast', 'West Coast less California', 'California']
    const body = 'On-Highway Diesel Fuel Retail Price<br/>' + regions.map((r, i) => `${1 + i / 10} .. ${r}`).join('<br/>')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(dated(body))))
    const result = await fetchEiaCurrentDiesel()
    expect(result).toMatchObject({ updated: 11, observationDatePersisted: false,
      observation: { observationDate: '2026-10-05', unit: 'USD/US_GALLON' } })
    expect(memory.upsert).toHaveBeenCalledTimes(11)
    result.regions.forEach((row, i) => {
      expect(row).toEqual({ region: regions[i], dieselUsdGal: 1 + i / 10 })
      expect(memory.upsert.mock.calls[i]).toEqual([{
        where: { region: row.region }, create: row, update: { dieselUsdGal: row.dieselUsdGal },
      }])
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe('fuel assumption sync governance', () => {
  it('targets only the editable legacy common draft, never a governed cost-base version', () => {
    expect(writableFuelAssumptionSetWhere('org-1')).toEqual({
      orgId: 'org-1',
      isActive: true,
      costBaseId: null,
      status: 'DRAFT',
    })
  })
})

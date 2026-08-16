import { describe, it, expect } from 'vitest'
import { parseDieselRss, writableFuelAssumptionSetWhere } from '../src/modules/market/fuel.service.js'

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

describe('EIA diesel RSS parser', () => {
  it('parses the diesel section by region (ignores gasoline)', () => {
    const p = parseDieselRss(FIXTURE)
    expect(p['U.S.']).toBe(5.596)          // diesel, not gasoline 4.49
    expect(p['Gulf Coast']).toBe(5.122)    // diesel, not gasoline 3.951
  })
  it('handles substring overlaps via max per region', () => {
    const p = parseDieselRss(FIXTURE)
    expect(p['West Coast']).toBe(6.524)              // not 5.920 (less California line)
    expect(p['West Coast less California']).toBe(5.920)
    expect(p['California']).toBe(7.222)              // not 5.920
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

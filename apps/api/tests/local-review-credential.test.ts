import {afterEach, expect, it, vi} from 'vitest'
import {mkdtempSync,readFileSync,unlinkSync,rmdirSync,existsSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileGoogleReviewBudget,validateReviewCredential} from '../scripts/lib/local-review-credential.js'
import {LOCAL_READ_EXPIRES,LOCAL_READ_HOST,LOCAL_READ_ROLE} from '../src/config/local-read-review.js'
const folders:string[]=[]
afterEach(()=>{vi.useRealTimers();for(const folder of folders.splice(0)){for(const name of ['map.attempt','routes.attempt']){const p=join(folder,name);if(existsSync(p))unlinkSync(p)}rmdirSync(folder)}})
const credential={version:1,role:LOCAL_READ_ROLE,host:LOCAL_READ_HOST,expiresAt:LOCAL_READ_EXPIRES,password:'a'.repeat(64)}
const now=Date.parse('2026-09-30T00:00:00Z')
it('validates the exact role, target and unextended access window',()=>{
  expect(validateReviewCredential(credential,now)).toEqual(credential)
  for(const patch of [{role:'neondb_owner'},{host:'localhost'},{expiresAt:'2026-10-03T00:00:00.000Z'},{version:2},{password:'short'},{extra:'injection'}]){
    expect(()=>validateReviewCredential({...credential,...patch},now)).toThrow()
  }
  expect(()=>validateReviewCredential(credential,Date.parse(LOCAL_READ_EXPIRES))).toThrow()
})
it('preserves independent map/route reservations across new instances without storing route content',()=>{
  vi.useFakeTimers();vi.setSystemTime(now)
  const folder=mkdtempSync(join(tmpdir(),'fcm-review-budget-'));folders.push(folder)
  const first=fileGoogleReviewBudget(folder)
  expect(first.remaining('map')).toBe(1);expect(first.remaining('routes')).toBe(1)
  expect(first.reserve('map')).toBe(true);expect(first.reserve('map')).toBe(false)
  const resumed=fileGoogleReviewBudget(folder)
  expect(resumed.remaining('map')).toBe(0);expect(resumed.remaining('routes')).toBe(1)
  expect(resumed.reserve('routes')).toBe(true);expect(first.reserve('routes')).toBe(false)
  expect(fileGoogleReviewBudget(folder).remaining('routes')).toBe(0)
  expect(readFileSync(join(folder,'routes.attempt'),'utf8')).not.toMatch(/password|coordinates|distance|origin|destination/)
})
it('corrupt existing markers and expiration never replenish a budget',()=>{
  vi.useFakeTimers();vi.setSystemTime(now)
  const folder=mkdtempSync(join(tmpdir(),'fcm-review-budget-'));folders.push(folder)
  writeFileSync(join(folder,'map.attempt'),'corrupt')
  const budget=fileGoogleReviewBudget(folder)
  expect(budget.remaining('map')).toBe(0);expect(budget.reserve('map')).toBe(false)
  vi.setSystemTime(Date.parse(LOCAL_READ_EXPIRES));expect(budget.remaining('routes')).toBe(0);expect(budget.reserve('routes')).toBe(false)
})

import {expect,it} from 'vitest'
import * as environment from './fixtures/tire-test-environment.js'
const g=environment as any
const tireAdmin='postgresql://admin:synthetic@127.0.0.1:5555/fcm_tire_s8'
const tireApp='postgresql://app:synthetic@127.0.0.1:5555/fcm_tire_s8'
it('uses the tire namespace without adopting the simultaneous partner fixture',()=>{
  expect(typeof g.readTireTestEnvironment).toBe('function')
  expect(g.readTireTestEnvironment({FCM_TIRE_TEST_ADMIN_URL:tireAdmin,FCM_TIRE_TEST_APP_URL:tireApp,
    FCM_TEST_DATABASE_URL:'postgresql://admin:synthetic@127.0.0.1:5556/fcm_partner_disposable'}))
    .toEqual({adminUrl:tireAdmin,appUrl:tireApp})
})
it('retains the legacy tire runner pair without broadening its target',()=>{
  expect(typeof g.readTireTestEnvironment).toBe('function')
  expect(g.readTireTestEnvironment({FCM_TEST_ADMIN_DATABASE_URL:tireAdmin,FCM_TEST_DATABASE_URL:tireApp})).toEqual({adminUrl:tireAdmin,appUrl:tireApp})
})
it('does not mix a partial namespaced pair with legacy values',()=>{
  expect(typeof g.readTireTestEnvironment).toBe('function')
  expect(()=>g.readTireTestEnvironment({FCM_TIRE_TEST_APP_URL:tireApp,FCM_TEST_ADMIN_DATABASE_URL:tireAdmin})).toThrow()
})
it('rejects remote and wrong-database explicit targets before creating a client',()=>{
  expect(typeof g.readTireTestEnvironment).toBe('function')
  for(const appUrl of ['postgresql://app:synthetic@external.invalid/fcm_tire_s8',
    'postgresql://app:synthetic@127.0.0.1:5555/fcm_partner_disposable', 'not-a-url'])
    expect(()=>g.readTireTestEnvironment({FCM_TIRE_TEST_ADMIN_URL:tireAdmin,FCM_TIRE_TEST_APP_URL:appUrl})).toThrow()
})
it('returns no URLs for optional consumers while the mandatory RLS consumer still owns its absence guard',()=>{
  expect(typeof g.readTireTestEnvironment).toBe('function')
  expect(g.readTireTestEnvironment({})).toEqual({adminUrl:undefined,appUrl:undefined})
})

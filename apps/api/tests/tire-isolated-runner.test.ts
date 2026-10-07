import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'
import {describe,expect,it} from 'vitest'

// Exercise the real PowerShell entrypoint. Only the external Docker boundary
// is denied, so a mistaken -Plan cannot create or touch any container.
describe.skipIf(process.platform!=='win32')('isolated tire runner plan',()=>{
  function plan(full=false){
    const result=spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',
      `function docker { throw 'Plan must not contact Docker' }; & $env:FCM_RUNNER_TEST_PATH -Plan ${full?'-FullSuite':''}`],
      {encoding:'utf8',windowsHide:true,timeout:15000,env:{...process.env,
        FCM_RUNNER_TEST_PATH:resolve('scripts/test-tire-preview-isolated.ps1'),
        DATABASE_URL:'postgresql://synthetic:synthetic@not-local.invalid/not-authorized',
        STAGING_DATABASE_URL:'postgresql://synthetic:synthetic@not-local.invalid/not-authorized'}})
    expect(result.error).toBeUndefined()
    expect(result.status,result.stderr).toBe(0)
    return JSON.parse(result.stdout.replace(/^\uFEFF/,''))
  }
  it('keeps the focused RLS route as the default without contacting Docker or databases',()=>{
    const p=plan()
    expect(p.mode).toBe('RLS_FOCUSED')
    expect(p.runner).toBe('node-vitest')
    expect(p.arguments).toEqual(['run','tests/tire-calibration-rls-postgres.test.ts',
      'tests/tire-calibration-multitenant-contract.test.ts','tests/tire-cohort-v2-rls-postgres.test.ts'])
    expect(p.database).toBe('fcm_tire_s8');expect(p.localOnly).toBe(true)
  })
  it('selects the actual project test command for the full API instead of filtering out the failing suite',()=>{
    const p=plan(true)
    expect(p.mode).toBe('FULL_API')
    expect(p.runner).toBe('npm');expect(p.arguments).toEqual(['test'])
    expect(p.cwd).toBe('apps/api');expect(p.database).toBe('fcm_tire_s8')
    expect(p.localOnly).toBe(true)
  })
})

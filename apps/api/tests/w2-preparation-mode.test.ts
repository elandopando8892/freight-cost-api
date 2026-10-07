import { expect, it } from 'vitest'
import { w2PreparationMode, w2PreparationAuthority } from '../scripts/lib/w2-preparation-mode.js'
it('keeps readonly, diagnostic and QA preparation distinct',()=>{
  expect(w2PreparationMode([])).toBe('READ_ONLY')
  expect(w2PreparationMode(['--diagnose'])).toBe('DIAGNOSTIC_ROLLBACK')
  expect(w2PreparationMode(['--apply'])).toBe('PERSISTENCE_QA')
})
it.each([['--apply','--diagnose'],['--apply','--apply'],['--unknown'],['--diagnose','--unknown']])('rejects ambiguous or unknown arguments %s',(...args)=>{
  expect(()=>w2PreparationMode(args)).toThrow('Invalid options')
})
it('does not reuse a diagnostic authority for commit or another deadline',()=>{
  const diagnostic=w2PreparationAuthority(true,'release','fixed-deadline')
  expect(diagnostic).not.toBe(w2PreparationAuthority(false,'release','fixed-deadline'))
  expect(diagnostic).not.toBe(w2PreparationAuthority(true,'release','other-deadline'))
})

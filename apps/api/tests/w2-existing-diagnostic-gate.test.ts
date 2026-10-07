import { expect, it } from 'vitest'
import { assertExistingDiagnosticOpen, assertExistingDiagnosticRole, W2_EXISTING_AUTHORITY, W2_EXISTING_START, W2_EXISTING_DEADLINE, W2_EXISTING_MARKER, W2_EXISTING_PREVIOUS_MARKER } from '../scripts/lib/w2-existing-diagnostic-gate.js'
it('requires exact bounded human reference', () => {
  expect(() => assertExistingDiagnosticOpen(W2_EXISTING_AUTHORITY, Date.parse(W2_EXISTING_START))).not.toThrow()
  expect(() => assertExistingDiagnosticOpen(undefined, Date.parse(W2_EXISTING_START))).toThrow()
})
it.each([Date.parse(W2_EXISTING_START)-1, Date.parse(W2_EXISTING_DEADLINE), NaN])('denies clock/window %s', now => {
  expect(() => assertExistingDiagnosticOpen(W2_EXISTING_AUTHORITY, now)).toThrow()
})
it('only reuses closed previous owned role', () => {
  expect(() => assertExistingDiagnosticRole({marker: W2_EXISTING_PREVIOUS_MARKER, login:false,sessions:0})).not.toThrow()
  for (const role of [undefined, {marker: W2_EXISTING_MARKER,login:false,sessions:0}, {marker:'foreign',login:false,sessions:0}, {marker:W2_EXISTING_PREVIOUS_MARKER,login:true,sessions:0}, {marker:W2_EXISTING_PREVIOUS_MARKER,login:false,sessions:1}])
    expect(() => assertExistingDiagnosticRole(role)).toThrow()
})

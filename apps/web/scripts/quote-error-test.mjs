import assert from 'node:assert/strict'
import { test } from 'node:test'
import { quoteErrorCopy } from '../lib/quote-error.ts'

const message = 'Legacy cost-base versions without an applicability profile are restricted to historical snapshot replay.'
test('known profile conflict directs review instead of futile retry', () => {
  const copy = quoteErrorCopy({ status: 409, message })
  assert.equal(copy.reviewBase, true)
  assert.match(copy.description, /Conservamos la captura/)
  assert.match(copy.description, /nueva versión/)
})
test('other failures retain retry without exposing diagnostics', () => {
  for (const error of [null, undefined, 'secret', { status: 500, message }, { status: 409, message: 'private diagnostic' }]) {
    const copy = quoteErrorCopy(error)
    assert.equal(copy.reviewBase, false)
    assert.equal(copy.title, 'No fue posible generar la tarifa')
    assert.ok(!copy.description.includes('private diagnostic'))
  }
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
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

test('entry notices do not promise calculation without a governed profile', async () => {
  const shared = await readFile(new URL('../app/(app)/quote/quote-shared.tsx', import.meta.url), 'utf8')
  const modes = await readFile(new URL('../app/(app)/quote/quote-modes.tsx', import.meta.url), 'utf8')
  assert.ok(!shared.includes('El cálculo seguirá siendo una propuesta'))
  assert.ok(!modes.includes('El cálculo puede continuar como propuesta'))
  assert.ok(shared.includes('un perfil de operación compatible'))
})

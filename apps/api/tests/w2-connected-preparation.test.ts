import { expect, it, vi } from 'vitest'
import { w2WithConnectedPreparation } from '../scripts/lib/w2-connected-preparation.js'
import { W2DiagnosticRollback } from '../scripts/lib/w2-diagnostic-rollback.js'
import { w2SafeDiagnostic } from '../scripts/lib/w2-safe-diagnostic.js'

it('connects once, rechecks authority, then executes exactly once',async()=>{
  const order:string[]=[]
  const client={$connect:vi.fn(async()=>{order.push('connected')})}
  const operation=vi.fn(async()=>{order.push('operation');return {committed:true}})
  const result=await w2WithConnectedPreparation(client,operation,()=>{order.push('guard')},phase=>order.push(phase))
  expect(order).toEqual(['guard','connect','connected','guard','transaction','operation'])
  expect(result).toEqual({committed:true})
  expect(client.$connect).toHaveBeenCalledTimes(1)
  expect(operation).toHaveBeenCalledTimes(1)
})

it('closed authority prevents even a connection attempt',async()=>{
  const client={$connect:vi.fn()},operation=vi.fn(),observe=vi.fn()
  await expect(w2WithConnectedPreparation(client,operation,()=>{throw new Error('W2 gate outside authorized window')},observe)).rejects.toThrow('outside authorized window')
  expect(client.$connect).not.toHaveBeenCalled()
  expect(operation).not.toHaveBeenCalled()
  expect(observe).not.toHaveBeenCalled()
})

it('does not retry a failed connection or start the transaction; sanitizes at connect',async()=>{
  const error={errorCode:'P1001',message:'private URL'},client={$connect:vi.fn().mockRejectedValue(error)},operation=vi.fn()
  let phase:'connect'|'transaction'='transaction'
  await expect(w2WithConnectedPreparation(client,operation,()=>{},next=>{phase=next})).rejects.toBe(error)
  expect(client.$connect).toHaveBeenCalledTimes(1)
  expect(operation).not.toHaveBeenCalled()
  expect(w2SafeDiagnostic(phase,error)).toEqual({event:'W2_PREPARATION_STOPPED',phase:'connect',code:'P1001'})
})

it('expiration during connect prevents transaction execution',async()=>{
  const client={$connect:vi.fn().mockResolvedValue(undefined)},operation=vi.fn(),observe=vi.fn()
  let guards=0
  await expect(w2WithConnectedPreparation(client,operation,()=>{if(++guards===2)throw new Error('W2 gate outside authorized window')},observe)).rejects.toThrow('outside authorized window')
  expect(client.$connect).toHaveBeenCalledTimes(1)
  expect(operation).not.toHaveBeenCalled()
  expect(observe.mock.calls).toEqual([['connect']])
})

it.each([new W2DiagnosticRollback(),{code:'P2028',message:'private SQL'}])('preserves operation failure/rollback without retry',async error=>{
  const client={$connect:vi.fn().mockResolvedValue(undefined)},operation=vi.fn().mockRejectedValue(error),observe=vi.fn()
  await expect(w2WithConnectedPreparation(client,operation,()=>{},observe)).rejects.toBe(error)
  expect(client.$connect).toHaveBeenCalledTimes(1)
  expect(operation).toHaveBeenCalledTimes(1)
  expect(observe.mock.calls).toEqual([['connect'],['transaction']])
})

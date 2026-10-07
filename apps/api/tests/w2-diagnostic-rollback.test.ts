import { expect, it, vi } from 'vitest'
import { W2DiagnosticRollback, W2_DIAGNOSTIC_RECEIPT, w2RollbackAfterPreparation } from '../scripts/lib/w2-diagnostic-rollback.js'
it('requires an intentional rollback after successful preparation and returns no identities',async()=>{
  const prepare=vi.fn(async()=>({password:'secret',baseId:'private',versionId:'private'}))
  await expect(w2RollbackAfterPreparation(prepare)).rejects.toBeInstanceOf(W2DiagnosticRollback)
  expect(prepare).toHaveBeenCalledTimes(1)
  expect(W2_DIAGNOSTIC_RECEIPT).toEqual({event:'W2_DIAGNOSTIC_ROLLBACK',completedPreparation:true,committed:false})
})
it('propagates the exact preparation failure without claiming intentional rollback',async()=>{
  const error=new Error('synthetic preparation failure'),prepare=vi.fn(async()=>{throw error})
  await expect(w2RollbackAfterPreparation(prepare)).rejects.toBe(error)
  expect(prepare).toHaveBeenCalledTimes(1)
})

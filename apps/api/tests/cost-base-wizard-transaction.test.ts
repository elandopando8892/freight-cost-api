import { expect, it, vi } from 'vitest'
const {transaction}=vi.hoisted(()=>({transaction:vi.fn()}))
vi.mock('../src/config/prisma.js',()=>({prisma:{$transaction:transaction}}))
import { versionWizard } from '../src/modules/cost-bases/cost-base-wizard-version.service.js'

it('uses a bounded wizard budget and does not retry an uncertain transaction',async()=>{
  const expired=Object.assign(new Error('transaction expired'),{code:'P2028'})
  transaction.mockRejectedValueOnce(expired)
  await expect(versionWizard.read({orgId:'org-A',sub:'actor-A',role:'ADMIN'},'base-A','version-A')).rejects.toBe(expired)
  expect(transaction).toHaveBeenCalledTimes(1)
  expect(transaction).toHaveBeenCalledWith(expect.any(Function),{maxWait:2000,timeout:15000})
})

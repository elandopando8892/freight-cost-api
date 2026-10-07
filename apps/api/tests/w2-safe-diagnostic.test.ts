import { expect, it } from 'vitest'
import { Prisma } from '@prisma/client'
import { w2ChildDiagnostic, w2SafeDiagnostic } from '../scripts/lib/w2-safe-diagnostic.js'

const transactionError=(detail:string)=>new Prisma.PrismaClientKnownRequestError('private query and values',{code:'P2028',clientVersion:'5.22.0',meta:{error:detail}})
it.each([
  ['Unable to start a transaction in the given time.','ACQUISITION_TIMEOUT'],
  ['Attempted to start a transaction inside of a transaction.','ALREADY_STARTED'],
  ["Transaction not found. Transaction ID is invalid, refers to an old closed transaction Prisma doesn't have information about anymore, or was obtained before disconnecting.",'NOT_FOUND'],
  ['Transaction already closed: A query cannot be executed on a committed transaction.','COMMITTED'],
  ['Transaction already closed: A query cannot be executed on a transaction that was rolled back.','ROLLED_BACK'],
])('retains the exact known transaction category without its message: %s',(detail,reason)=>{
  const safe=w2SafeDiagnostic('wizard-read',transactionError(detail))
  expect(safe.transactionReason).toBe(reason)
  expect(JSON.stringify(safe)).not.toMatch(/private|query and values|meta|message/)
  expect(w2ChildDiagnostic({stderr:JSON.stringify(safe)})).toEqual(safe)
})
it('retains bounded numeric expiry evidence and does not call every P2028 a timeout',()=>{
  const detail='Transaction already closed: A query cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms, however 5234 ms passed since the start of the transaction. Consider increasing the interactive transaction timeout or doing less work in the transaction.'
  const safe=w2SafeDiagnostic('wizard-read',transactionError(detail))
  expect(safe).toMatchObject({transactionReason:'EXPIRED',transactionTimeoutMs:5000,transactionElapsedMs:5234})
  expect(w2ChildDiagnostic({stderr:JSON.stringify(safe)})).toEqual(safe)
  for(const e of [transactionError(detail+' secret'),transactionError('secret'),{code:'P2028',meta:{error:detail}}])
    expect(w2SafeDiagnostic('wizard-read',e).transactionReason).toBeUndefined()
  const untrusted={event:'W2_PREPARATION_STOPPED',phase:'wizard-read',code:'P2028',transactionReason:'EXPIRED',transactionTimeoutMs:'secret',transactionElapsedMs:-1}
  expect(w2ChildDiagnostic({stderr:JSON.stringify(untrusted)})).not.toHaveProperty('transactionTimeoutMs')
})

it('reports only stage and a recognized Prisma code, never error details',()=>{
  const error={code:'P2028',message:'postgres://private:secret@host',meta:{query:'secret SQL'},stack:'secret stack'}
  expect(w2SafeDiagnostic('clone',error)).toEqual({event:'W2_PREPARATION_STOPPED',phase:'clone',code:'P2028'})
  expect(JSON.stringify(w2SafeDiagnostic('clone',error))).not.toContain('secret')
})
it('identifies real Prisma validation errors without exposing their data',()=>{
  const error=new Prisma.PrismaClientValidationError('secret data',{clientVersion:'5.22.0'})
  expect(w2SafeDiagnostic('clone',error)).toEqual({event:'W2_PREPARATION_STOPPED',phase:'clone',code:'UNKNOWN',category:'PRISMA_VALIDATION'})
})
it('maps only exact internal guard messages, not arbitrary messages or prototypes',()=>{
  expect(w2SafeDiagnostic('input',new Error('W2 gate outside authorized window')).reason).toBe('WINDOW_CLOSED')
  expect(w2SafeDiagnostic('input',new Error('W2 gate outside authorized window secret')).reason).toBeUndefined()
  expect(w2SafeDiagnostic('input',new Error('toString')).reason).toBeUndefined()
  expect(w2SafeDiagnostic('source-check',new Error('W2 linked admin required')).reason).toBe('LINKED_ADMIN')
})
it('reports only allowlisted SQLSTATE on a real raw-query error',()=>{
  const error=new Prisma.PrismaClientKnownRequestError('secret SQL',{code:'P2010',clientVersion:'5.22.0',meta:{code:'42601',message:'secret'}})
  expect(w2SafeDiagnostic('role',error)).toEqual({event:'W2_PREPARATION_STOPPED',phase:'role',code:'P2010',sqlState:'42601'})
  expect(w2SafeDiagnostic('role',{code:'P2010',meta:{code:'42601'}}).sqlState).toBeUndefined()
  const unknown=new Prisma.PrismaClientKnownRequestError('secret',{code:'P2010',clientVersion:'5.22.0',meta:{code:'secret'}})
  expect(w2SafeDiagnostic('role',unknown).sqlState).toBeUndefined()
})
it('retains only recognized extra diagnostic fields from the child',()=>{
  const stderr=JSON.stringify({event:'W2_PREPARATION_STOPPED',phase:'rollback',code:'P2010',sqlState:'57014',category:'secret',reason:'secret',message:'secret'})
  expect(w2ChildDiagnostic({stderr})).toEqual({event:'W2_PREPARATION_STOPPED',phase:'rollback',code:'P2010',sqlState:'57014'})
  expect(w2ChildDiagnostic({stderr:JSON.stringify({event:'W2_PREPARATION_STOPPED',phase:'input',code:'UNKNOWN',reason:'WINDOW_CLOSED',category:'PRISMA_VALIDATION'})}))
    .toMatchObject({reason:'WINDOW_CLOSED',category:'PRISMA_VALIDATION'})
})
it('preserves a connection failure phase from the readonly child without its raw details',()=>{
  expect(w2ChildDiagnostic({stderr:JSON.stringify({event:'W2_PREPARATION_STOPPED',phase:'connect',code:'P1001',message:'private connection URL'})}))
    .toEqual({event:'W2_PREPARATION_STOPPED',phase:'connect',code:'P1001'})
})
it.each(['wizard-read','wizard-save'] as const)('retains narrow runtime phase %s, not SQL, headers or request data',phase=>{
  const error=new Prisma.PrismaClientKnownRequestError('private SQL and body',{code:'P2010',clientVersion:'5.22.0',meta:{code:'42501',message:'private'}})
  const safe=w2SafeDiagnostic(phase,error)
  expect(safe).toEqual({event:'W2_PREPARATION_STOPPED',phase,code:'P2010',sqlState:'42501'})
  expect(w2ChildDiagnostic({stderr:JSON.stringify({...safe,authorization:'secret',body:'private'})})).toEqual(safe)
  expect(JSON.stringify(safe)).not.toMatch(/private|secret|authorization|body/)
})
it('does not manufacture a cause for an unknown failure',()=>{
  for(const error of [null, undefined, 'secret', {code:'password'}, {code:'P2028secret'}, new Error('secret')])
    expect(w2SafeDiagnostic('input',error).code).toBe('UNKNOWN')
})
it.each([
  ['Role attributes differ','ROLE_ATTRIBUTES_DIFFER'],
  ['Effective table/column privileges differ','EFFECTIVE_PRIVILEGES_DIFFER'],
  ['Additional write capability','ADDITIONAL_WRITE_CAPABILITY'],
])('classifies a stopped privilege guard without exposing SQL: %s',(message,reason)=>{
  expect(w2SafeDiagnostic('input',new Error(message)).reason).toBe(reason)
  expect(w2SafeDiagnostic('input',new Error(message+' private')).reason).toBeUndefined()
})
it('recognizes the supported initialization code without exposing its message',()=>{
  expect(w2SafeDiagnostic('transaction',{errorCode:'P1001',message:'secret'}).code).toBe('P1001')
})
it('forwards only the child diagnostic allowlist and discards extra fields',()=>{
  const stderr='raw secret\n'+JSON.stringify({event:'W2_PREPARATION_STOPPED',phase:'binding',code:'P2002',password:'secret'})
  expect(w2ChildDiagnostic({stderr})).toEqual({event:'W2_PREPARATION_STOPPED',phase:'binding',code:'P2002'})
})
it('reports a parent child timeout distinctly, not as a database timeout',()=>{
  expect(w2ChildDiagnostic({code:'ETIMEDOUT',stderr:'secret'})).toEqual({event:'W2_CHILD_STOPPED',code:'ETIMEDOUT'})
})
it('rejects unrecognized, malformed and oversized child diagnostics',()=>{
  for(const stderr of ['secret', 'x'.repeat(4097), JSON.stringify({event:'W2_PREPARATION_STOPPED',phase:'secret',code:'P2028'}),
    JSON.stringify({event:'W2_PREPARATION_STOPPED',phase:'clone',code:'secret'}),JSON.stringify({event:'foreign',phase:'clone',code:'P2028'})])
    expect(w2ChildDiagnostic({stderr})).toBeUndefined()
})

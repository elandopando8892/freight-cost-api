export type W2PreparationMode = 'READ_ONLY' | 'DIAGNOSTIC_ROLLBACK' | 'PERSISTENCE_QA'
export function w2PreparationMode(args: string[]): W2PreparationMode {
  if (!args.length) return 'READ_ONLY'
  if (args.length!==1 || !['--diagnose','--apply'].includes(args[0])) throw new Error('Invalid options')
  return args[0]==='--diagnose' ? 'DIAGNOSTIC_ROLLBACK' : 'PERSISTENCE_QA'
}
export function w2PreparationAuthority(diagnosticOnly: boolean, release: string, deadline: string) {
  return `${diagnosticOnly?'DIAGNOSE_REVIEW_CONTEXT_AND_ROLE_ROLLBACK':'PREPARE_REVIEW_CONTEXT_AND_ROLE'}:${release}:${deadline}`
}

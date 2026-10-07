import {writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {composeB2PlanningScenario} from './compose-b2-planning-scenario.js'
import {createOwnRelayFamilyBridge} from '../src/modules/cost-bases/own-relay-family-base.js'
import {readOwnRelayReview} from '../src/modules/engine/b2-own-relay-review.js'
import type {PlanningView} from '../src/modules/cost-bases/version-planning-contract.js'

async function main(){
  const args=process.argv.slice(2)
  if(args.length>1||(args.length===1&&args[0]!=='--write-demo'))throw new Error('Usage: demo-own-relay-family-base.ts [--write-demo]')
  const scope={orgId:'LOCAL-SYNTHETIC-ORG',sub:'LOCAL-SYNTHETIC-REVIEWER'}
  const context={orgId:scope.orgId,baseId:'LOCAL-SYNTHETIC-BASE',versionId:'LOCAL-SYNTHETIC-VERSION-1'}
  const binding={...scope,role:'ADMIN' as const,baseId:context.baseId,versionId:context.versionId,versionFingerprint:'a'.repeat(64)}
  const selection={cycleId:'NETWORK_EXPECTED_EMPTY_PROXY',fundingMode:'CASH',fxDate:'2026-09-30',restInterpretation:'RATE_EXCLUDES_WEEKLY_REST'} as const
  // This deliberately synthetic upstream reader is not a session or a DB receipt.
  // The real adapter must use versionPlanning.read with middleware-verified actor.
  const view:PlanningView={context,scope,versionFingerprint:binding.versionFingerprint,bindingSha256:'b'.repeat(64),
    revision:1,editable:true,appliedToParams:false,latest:{kind:'FCM_VERSION_PLANNING_V1',versionId:context.versionId,context,
      revision:1,requestId:'4acfc9f3-532e-4b4e-9273-d61797b8273c',commandSha256:'c'.repeat(64),savedAt:'2026-10-05T19:13:46Z',savedBy:scope.sub,
      versionFingerprint:binding.versionFingerprint,bindingSha256:'b'.repeat(64),selection,note:'Synthetic upstream view for local bridge demo',
      planningAccepted:true,calculation:readOwnRelayReview(selection,scope)}}
  const bridge=createOwnRelayFamilyBridge(composeB2PlanningScenario(),async()=>structuredClone(view))
  const proposal=await bridge.prepare(binding)
  const recovered=JSON.parse(JSON.stringify(proposal))
  const calculated=await bridge.calculate(recovered,binding)
  const demo={model:'FCM_S2_LOCAL_FAMILY_BASE_BRIDGE_DEMO_V1',syntheticIdentity:true,syntheticPlanningReader:true,
    authenticatedPlanningRead:false,persistedBaseCreated:false,proposal,
    calculation:{status:calculated.status,outputs:calculated.outputs,resources:calculated.resources,
      sharedBoxAllocationCount:calculated.sharedBoxAllocationCount,issues:calculated.issues,calibrated:calculated.calibrated,
      quoteReady:calculated.quoteReady,adoptedValues:calculated.adoptedValues},
    jsonRoundTripVerified:true,externalWrites:false,canonicalParamsWritten:0}
  const summary={method:proposal.method,fingerprint:proposal.fingerprint,syntheticIdentity:true,authenticatedPlanningRead:false,
    fixedExpenseCount:proposal.familyInput.budget.expenses.length,variableConceptCount:proposal.familyInput.variableCosts.length,
    outputs:calculated.outputs,sharedBoxAllocationCount:calculated.sharedBoxAllocationCount,quoteReady:false,adoptedValues:0}
  if(args[0]==='--write-demo'){
    const path=fileURLToPath(new URL('../../../docs/research/S2_OWN_RELAY_FAMILY_BASE_DEMO_2026-10-05.json',import.meta.url))
    writeFileSync(path,JSON.stringify(demo,null,2)+'\n',{encoding:'utf8',flag:'wx'})
    console.log(JSON.stringify({artifact:path,...summary}))
  }else console.log(JSON.stringify(summary))
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Family base demo failed');process.exitCode=1})

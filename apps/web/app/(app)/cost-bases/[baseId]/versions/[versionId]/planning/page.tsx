import Link from 'next/link'
import { api,ApiError } from '@/lib/api'
import { versionWizardHref } from '@/lib/cost-base-wizard-contract'
import { versionPlanningPath,type PlanningView } from '@/lib/version-planning'
import { OwnRelayReview } from '../../../../own-relay-review'

export const dynamic='force-dynamic'
export const metadata={title:'Planeación del viaje'}
export default async function VersionPlanningPage({params}:{params:Promise<{baseId:string;versionId:string}>}) {
  const {baseId,versionId}=await params
  let view:PlanningView|null=null
  // This read verifies audited history inside the existing 15 s transaction,
  // after backend identity lookup. The shared 12 s transport could abort first.
  // Bound only this GET; no retry, Auth change or longer DB/write transaction.
  try { view=await api<PlanningView>(versionPlanningPath(baseId,versionId),{signal:AbortSignal.timeout(30_000)}) }
  catch(error) { if(!(error instanceof ApiError)||![403,404,409,422].includes(error.status))throw error }
  if(!view)return <main className="mx-auto max-w-3xl p-6"><h1 className="text-2xl font-bold">No se puede abrir esta planeación</h1>
    <p role="alert" className="my-4">Comprueba el acceso ADMIN u OPERATOR y la versión de revisión binacional. Si cambió la referencia, recupera su contexto antes de calcular.</p>
    <Link href={versionWizardHref(baseId,versionId)} className="underline">Volver a los supuestos de esta versión</Link></main>
  return <main className="mx-auto max-w-[1200px] px-4 py-6 space-y-4">
    <Link href={versionWizardHref(baseId,versionId)} className="inline-block min-h-11 py-2 underline">← Armar supuestos de esta versión</Link>
    <h1 className="text-2xl font-bold">Planeación del viaje</h1>
    <OwnRelayReview key={`${view.scope.sub}:${view.scope.orgId}:${baseId}:${versionId}`} expectedOrgId={view.scope.orgId} initialPlanning={view}/>
  </main>
}

import Link from 'next/link'
import { api, ApiError } from '@/lib/api'
import { costBasesHref } from '@/lib/cost-base-navigation'
import { versionWizardPath, type VersionWizardView } from '@/lib/cost-base-wizard-contract'
import { VersionWizard } from '../../../../version-wizard'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Armar supuestos de la versión' }

export default async function VersionWizardPage({ params }: { params: Promise<{ baseId: string; versionId: string }> }) {
  const { baseId, versionId } = await params
  let data: [VersionWizardView, { id: string; role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }] | null = null
  try {
    data = await Promise.all([
      api<VersionWizardView>(versionWizardPath(baseId, versionId)),
      api<{ id: string; role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }>('/auth/me'),
    ])
  } catch (error) {
    if (!(error instanceof ApiError) || ![404,409,422].includes(error.status)) throw error
  }
  if (!data) {
    return <main className="mx-auto max-w-3xl p-6"><h1 className="text-2xl font-bold">No se puede abrir este wizard</h1>
      <p role="alert" className="my-4">La versión no está disponible o su perfil no corresponde a las referencias binacionales de caja seca de este corte. No se abrirá otra base en su lugar.</p>
      <Link href={costBasesHref(baseId)} className="underline">Volver a la base solicitada</Link></main>
  }
  const [view, user] = data
  return <main className="mx-auto max-w-[1440px] px-4 py-6">
    <Link href={costBasesHref(view.draft.context.baseId)} className="inline-block min-h-11 py-2 underline">← Volver a esta base</Link>
    <VersionWizard key={`${user.id}:${view.draft.context.orgId}:${baseId}:${versionId}`} initial={view} canEdit={user.role === 'ADMIN'} />
  </main>
}

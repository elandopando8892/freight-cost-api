import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  TireCalibrationWorkbench,
  type TireCalibrationSummary,
} from '../app/(app)/cost-bases/tires/tire-calibration-workbench'
import { fetcher } from '../lib/fetcher'

vi.mock('../lib/fetcher', async importOriginal => ({
  ...(await importOriginal<typeof import('../lib/fetcher')>()),
  fetcher: vi.fn(),
}))

const dossiers: TireCalibrationSummary[] = [
  {
    id: 'dossier-1',
    proposalId: 'XBF-TIRE-LH-001',
    version: 1,
    status: 'PENDING_ECONOMIC',
    revision: 2,
    proposalFingerprint: 'a'.repeat(64),
    sourceAggregationFingerprint: 'b'.repeat(64),
    sourceSnapshotId: 'snapshot-1',
    authorId: 'operator-1',
    economicOwnerId: 'admin-1',
    independentReviewerId: 'admin-2',
    createdAt: '2026-09-27T10:00:00.000Z',
    updatedAt: '2026-09-27T11:00:00.000Z',
    approvalPackage: null,
  },
  {
    id: 'dossier-2',
    proposalId: 'XBF-TIRE-DRAY-002',
    version: 2,
    status: 'REVIEWED',
    revision: 4,
    proposalFingerprint: 'c'.repeat(64),
    sourceAggregationFingerprint: 'd'.repeat(64),
    sourceSnapshotId: 'snapshot-2',
    authorId: 'operator-1',
    economicOwnerId: 'admin-1',
    independentReviewerId: 'admin-2',
    createdAt: '2026-09-26T10:00:00.000Z',
    updatedAt: '2026-09-27T09:00:00.000Z',
    approvalPackage: {
      id: 'package-1',
      packageFingerprint: 'e'.repeat(64),
      quoteEligible: false,
      createdAt: '2026-09-27T09:00:00.000Z',
    },
  },
]

let host: HTMLDivElement
let root: Root

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.mocked(fetcher).mockReset()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(createElement(TireCalibrationWorkbench, {
    initialDossiers: dossiers,
    role: 'OPERATOR',
  })))
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

it('makes the publication boundary explicit and never offers a write action', () => {
  expect(host.textContent).toContain('Publicación bloqueada por diseño')
  expect(host.textContent).toContain('0listos para publicar')
  expect(host.textContent).toContain('Rol OPERATOR · sólo consulta')
  expect(host.textContent).not.toContain('Publicar parámetros')
  expect(host.querySelectorAll('form')).toHaveLength(1)
})

it('filters dossiers without losing the safety context', async () => {
  const input = host.querySelector<HTMLInputElement>('input[placeholder="Buscar propuesta o estado"]')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'revisado')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const dossierList = host.querySelector('aside[aria-label="Expedientes de calibración"]')!
  expect(dossierList.textContent).toContain('XBF-TIRE-DRAY-002')
  expect(dossierList.textContent).not.toContain('XBF-TIRE-LH-001')
  expect(host.textContent).toContain('Publicación bloqueada por diseño')
})

it('loads the tenant-scoped ledger for a selected dossier', async () => {
  vi.mocked(fetcher).mockResolvedValueOnce({
    ...dossiers[1],
    events: [{
      id: 'event-1', sequence: 1, action: 'DRAFT_OPENED', actorId: 'operator-1',
      fromStatus: null, toStatus: 'DRAFT', eventHash: 'f'.repeat(64),
      createdAt: '2026-09-26T10:00:00.000Z',
    }],
  })
  const button = [...host.querySelectorAll('button')].find(item => item.textContent?.includes('XBF-TIRE-DRAY-002'))!
  await act(async () => button.click())
  expect(fetcher).toHaveBeenCalledWith('/api/v1/cost-bases/tire-calibrations/dossier-2', { silent: true })
  expect(host.textContent).toContain('Borrador abierto')
  expect(host.textContent).toContain('Publicación separada')
})

it('verifies the current cohort source without mutating it', async () => {
  vi.mocked(fetcher).mockResolvedValueOnce({
    headId: 'head-1', headRevision: 4, snapshotId: 'snapshot-4', snapshotVersion: 4,
    aggregationFingerprint: '9'.repeat(64),
  })
  const input = host.querySelector<HTMLInputElement>('input[placeholder^="Ej. XBF"]')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'XBF-LH-DRIVE-295-75R22.5')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  expect(fetcher).toHaveBeenCalledWith(
    '/api/v1/cost-bases/tire-cohort-sources/current?cohortKey=XBF-LH-DRIVE-295-75R22.5',
    { silent: true },
  )
  expect(host.textContent).toContain('v4')
  expect(host.textContent).toContain('Revisión de cabeza4')
})

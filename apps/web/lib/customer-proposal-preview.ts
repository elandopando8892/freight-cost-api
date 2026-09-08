import { z } from 'zod'

// Parse only the commercial fields the review screen needs. Internal metadata
// stays out of its view model, and incompatible responses cannot look successful.
export const proposalPreviewSchema = z.object({
  contractVersion: z.literal('fcm.customer-proposal-draft.v1'),
  mode: z.literal('PREVIEW_ONLY'),
  source: z.object({ quoteId: z.string().min(1) }),
  draft: z.object({
    clientName: z.string().min(2),
    contactName: z.string().nullable(),
    contactEmail: z.string().nullable(),
    quoteType: z.string(),
    validUntil: z.string().datetime(),
    notes: z.string().nullable(),
    lines: z.array(z.object({
      origin: z.string().min(1), destination: z.string().min(1),
      equipment: z.string().min(1), config: z.string().min(1),
      operation: z.string().min(1), service: z.string().min(1),
      tariff: z.number().finite().positive(), currency: z.literal('USD'),
      distance: z.string().nullable(),
    })).length(1),
  }),
})

export type ProposalPreview = z.infer<typeof proposalPreviewSchema>

export function proposalPreviewError(status?: number): string {
  if (status === 401) return 'Tu sesión terminó. Inicia sesión para continuar.'
  if (status === 403) return 'Tu rol permite consultar. Un operador puede preparar esta revisión.'
  if (status === 404) return 'Esta cotización ya no está disponible. Vuelve al historial y revisa su estado.'
  if (status === 409) return 'La cotización no está lista para una propuesta. Revisa su confirmación, base de costos y alertas.'
  if (status === 400 || status === 422) return 'Revisa los datos del cliente y elige una vigencia a partir de mañana.'
  return 'No pudimos cargar la propuesta. Tus datos siguen aquí; puedes volver a intentarlo.'
}

import { z } from 'zod'
import crypto from 'crypto'

export const CreateLaneSchema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
  equipmentId: z.string().cuid().optional(),
  operationType: z.string().min(1),
  serviceType: z.string().min(1),
  config: z.enum(['Single', 'Tandem']).default('Single'),
  isD2D: z.boolean().default(false),
  isDrayage: z.boolean().default(false),
  isRoundtrip: z.boolean().default(false),
  isBackhaul: z.boolean().default(false),
  baseKm: z.number().positive().optional(),
  returnKm: z.number().positive().optional(),
  loadedMiles: z.number().positive().optional(),
  transitDays: z.number().positive().optional(),
})

export const UpdateLaneSchema = CreateLaneSchema.partial()

export type CreateLaneInput = z.infer<typeof CreateLaneSchema>
export type UpdateLaneInput = z.infer<typeof UpdateLaneSchema>

export function buildLaneKey(
  orgId: string,
  origin: string,
  destination: string,
  equipmentId: string | undefined,
  operationType: string,
  serviceType: string,
  config: string,
): string {
  const raw = `${orgId}|${origin}|${destination}|${equipmentId ?? ''}|${operationType}|${serviceType}|${config}`
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16)
}

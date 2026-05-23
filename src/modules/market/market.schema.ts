import { z } from 'zod'

export const MarketDataTypeEnum = z.enum(['DIESEL_MX', 'DIESEL_US', 'FX_RATE', 'FSC'])

export const CreateMarketDataSchema = z.object({
  type: MarketDataTypeEnum,
  region: z.string().optional(),
  state: z.string().optional(),
  value: z.number().positive(),
  unit: z.string().min(1),
  date: z.string().datetime(),
  source: z.string().optional(),
})

export type CreateMarketDataInput = z.infer<typeof CreateMarketDataSchema>

import { z } from 'zod'

export const RegisterSchema = z.object({
  orgName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>

export interface JwtPayload {
  sub: string       // userId
  orgId: string
  role: string
  iat?: number
  exp?: number
}

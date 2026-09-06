// Identity is handled by Supabase Auth; the API maps its subject to our User/Org.
// request.user carries our internal identity in this shape.
export interface JwtPayload {
  sub: string       // our internal userId
  orgId: string
  role: Role
  supabaseId?: string  // Supabase Auth user UUID (sub)
  iat?: number
  exp?: number
}
import type { Role } from '@prisma/client'

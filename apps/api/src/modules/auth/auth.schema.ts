// Identity is handled by Kinde; the API maps the Kinde subject to our User/Org.
// request.user carries our internal identity in this shape.
export interface JwtPayload {
  sub: string       // our internal userId, or `svc:<client_id>` for a service client
  orgId: string
  role: Role
  kindeId?: string | null  // Kinde subject (sub); null for service clients
  /** True only for machine-to-machine clients from SERVICE_API_CLIENTS. */
  service?: boolean
  iat?: number
  exp?: number
}
import type { Role } from '@prisma/client'

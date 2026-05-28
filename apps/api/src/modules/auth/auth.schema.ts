// Identity is handled by Kinde; the API maps the Kinde subject to our User/Org.
// request.user carries our internal identity in this shape.
export interface JwtPayload {
  sub: string       // our internal userId
  orgId: string
  role: string
  kindeId?: string  // Kinde subject (sub)
  iat?: number
  exp?: number
}

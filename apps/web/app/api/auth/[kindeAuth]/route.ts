// Kinde auth endpoints: /api/auth/login, /api/auth/logout, /api/auth/register,
// /api/auth/kinde_callback, etc. handleAuth() routes them all.
import { handleAuth } from '@kinde-oss/kinde-auth-nextjs/server'

export const GET = handleAuth()

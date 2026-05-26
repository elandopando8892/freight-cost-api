import { NextResponse } from 'next/server'

const SESSION = process.env.SESSION_COOKIE_NAME ?? 'fcm_session'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set({ name: SESSION, value: '', path: '/', maxAge: 0, httpOnly: true })
  return res
}

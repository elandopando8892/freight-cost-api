import { NextResponse } from 'next/server'
import { api, ApiError } from '@/lib/api'

export async function GET() {
  try {
    const user = await api('/auth/me')
    return NextResponse.json(user)
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500
    return NextResponse.json({ error: 'unauthorized' }, { status: status === 401 ? 401 : 502 })
  }
}

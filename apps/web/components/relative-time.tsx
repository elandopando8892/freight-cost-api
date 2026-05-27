'use client'

import { useEffect, useState } from 'react'

export function formatRelative(iso: string, now: number): string {
  const diffMs = now - new Date(iso).getTime()
  const sec = Math.round(diffMs / 1000)
  if (sec < 0) return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.round(hr / 24)
  return `${days}d ago`
}

/**
 * Auto-updating relative timestamp ("5 min ago"). Renders the absolute timestamp
 * pre-mount to avoid hydration mismatch, then switches to relative + hover tooltip.
 */
export function RelativeTime({ iso }: { iso: string }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  const abs = new Date(iso).toLocaleString()
  if (now == null) return <span>{abs}</span>
  return <span title={abs}>{formatRelative(iso, now)}</span>
}

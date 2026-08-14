'use client'

import { useEffect, useState } from 'react'

const relativeTime = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' })

export function formatAbsolute(iso: string): string {
  const value = new Date(iso)
  if (Number.isNaN(value.getTime())) return iso
  return `${value.toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

export function formatRelative(iso: string, now: number): string {
  const value = new Date(iso)
  if (Number.isNaN(value.getTime())) return iso

  const seconds = Math.round((value.getTime() - now) / 1000)
  const absoluteSeconds = Math.abs(seconds)
  if (absoluteSeconds < 60) return relativeTime.format(seconds, 'second')

  const minutes = Math.round(seconds / 60)
  if (Math.abs(minutes) < 60) return relativeTime.format(minutes, 'minute')

  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relativeTime.format(hours, 'hour')

  return relativeTime.format(Math.round(hours / 24), 'day')
}

/**
 * Marca de tiempo relativa con actualización automática. Antes del montaje
 * muestra una fecha UTC determinista y después cambia al formato relativo.
 */
export function RelativeTime({ iso }: { iso: string }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const update = () => setNow(Date.now())
    const initial = window.setTimeout(update, 0)
    const interval = window.setInterval(update, 60_000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [])
  const abs = formatAbsolute(iso)
  if (now == null) return <span>{abs}</span>
  return <span title={abs}>{formatRelative(iso, now)}</span>
}

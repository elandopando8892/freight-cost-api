/** Formats a business date without allowing a UTC offset to change its day. */
export function formatCivilDate(value: string, locale = 'es-MX'): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return value

  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** Stable calendar key for timestamp-based operational reporting. */
export function dateKeyInTimeZone(
  value: string | Date,
  timeZone = 'America/Mexico_City',
): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone,
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

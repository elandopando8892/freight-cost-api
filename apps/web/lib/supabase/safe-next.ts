/** Resolve an OAuth return path without allowing a different origin. */
export function safeAuthNext(value: string | null, requestUrl: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') ||
    /[\\\u0000-\u001f\u007f]/.test(value) || /%(?:2f|5c)/i.test(value)) {
    return '/'
  }
  try {
    const origin = new URL(requestUrl).origin
    const destination = new URL(value, origin)
    if (destination.origin !== origin) return '/'
    return `${destination.pathname}${destination.search}${destination.hash}`
  } catch {
    return '/'
  }
}

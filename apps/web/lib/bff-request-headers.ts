/** Only forward application headers; identity always comes from the verified session. */
export function buildBffRequestHeaders(incoming: Headers, accessToken: string): Headers {
  const headers = new Headers({ authorization: `Bearer ${accessToken}` })
  for (const name of ['content-type', 'idempotency-key']) {
    const value = incoming.get(name)
    if (value) headers.set(name, value)
  }
  return headers
}

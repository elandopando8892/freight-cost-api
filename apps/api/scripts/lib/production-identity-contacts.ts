export type IdentityContactPin = { id: string; emailHash: string; identityFingerprint: string }
export type IdentityContactRow = IdentityContactPin & { email: string }

export function selectIdentityContacts(records: IdentityContactRow[], targets: IdentityContactPin[]) {
  if (!Array.isArray(targets) || targets.length < 1 || targets.length > 2 ||
      new Set(targets.map(t => t.id)).size !== targets.length) throw new Error('CONTACT_PINS_REQUIRED')
  return targets.map(pin => {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(pin.id) ||
        !/^[a-f0-9]{64}$/.test(pin.emailHash) || !/^[a-f0-9]{64}$/.test(pin.identityFingerprint))
      throw new Error('CONTACT_PIN_INVALID')
    const matches = records.filter(r => r.id === pin.id)
    if (matches.length !== 1) throw new Error('CONTACT_MISSING_OR_DUPLICATED')
    const row = matches[0]
    if (row.emailHash !== pin.emailHash || row.identityFingerprint !== pin.identityFingerprint)
      throw new Error('CONTACT_INVENTORY_DRIFT')
    if (typeof row.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))
      throw new Error('CONTACT_EMAIL_INVALID')
    return { id: row.id, email: row.email, emailHash: row.emailHash }
  })
}

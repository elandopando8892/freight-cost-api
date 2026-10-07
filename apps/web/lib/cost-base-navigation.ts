type NavigableBase = { id: string; isDefault: boolean; status: string }

/** A URL is a selection hint, never a permission or an extra fetch. */
export function resolveCostBaseSelection(bases: NavigableBase[], requested: string[]) {
  if (requested.length) {
    const id = requested[0]
    const available = requested.length === 1 && !!id && bases.some(base => base.id === id)
    return { selectedBaseId: available ? id : '', unavailable: !available }
  }
  return { selectedBaseId: bases.find(base => base.isDefault && base.status === 'ACTIVE')?.id
    ?? bases.find(base => base.status === 'ACTIVE')?.id ?? bases[0]?.id ?? '', unavailable: false }
}

export function costBasesHref(baseId?: string | null) {
  return baseId ? `/cost-bases?${new URLSearchParams({ base: baseId })}` : '/cost-bases'
}

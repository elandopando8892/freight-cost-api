'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'

/**
 * Location field with type-ahead suggestions (MX "City, ST" + US/CA metros).
 * Free text is still allowed (ZIPs, exact strings) — suggestions are a helper,
 * not a constraint.
 */
export function LocationInput({
  value,
  onChange,
  suggestions,
  placeholder,
  ariaInvalid,
}: {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
  ariaInvalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (q.length < 2) return []
    return suggestions
      .filter((s) => {
        const l = s.toLowerCase()
        return l.includes(q) && l !== q
      })
      .slice(0, 8)
  }, [value, suggestions])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const select = (s: string) => { onChange(s); setOpen(false); setActive(-1) }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || matches.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); select(matches[active]) }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1) }
  }

  const showList = open && matches.length > 0

  return (
    <div ref={wrapRef} className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {matches.map((s, i) => (
            <li key={s} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); select(s) }}
                onMouseEnter={() => setActive(i)}
                className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
                  i === active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                }`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetcher } from '@/lib/fetcher'

export function OrgNameForm({ initialName }: { initialName: string }) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const save = useMutation({
    mutationFn: () => fetcher<{ name: string }>('/api/v1/org', { method: 'PUT', json: { name: name.trim() } }),
    onSuccess: (o) => { toast.success(`Organization renamed to “${o.name}”`); router.refresh() },
  })
  const dirty = name.trim() !== initialName && name.trim().length >= 2

  return (
    <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (dirty) save.mutate() }}>
      <div className="grid flex-1 gap-1.5">
        <Label htmlFor="org-name" className="text-xs text-muted-foreground">Organization name</Label>
        <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      </div>
      <Button type="submit" size="sm" disabled={!dirty || save.isPending}>
        {save.isPending ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}

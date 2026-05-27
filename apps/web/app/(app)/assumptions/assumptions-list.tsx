'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { fetcher } from '@/lib/fetcher'

export interface AssumptionSet {
  id: string
  name: string
  version: number
  isActive: boolean
  notes: string | null
  createdAt: string
}

type DialogState =
  | { kind: 'create'; cloneFromId?: string; cloneFromName?: string }
  | { kind: 'rename'; targetId: string; name: string; notes: string }
  | null

const selectCls =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export function AssumptionsList({ initial }: { initial: AssumptionSet[] }) {
  const [items, setItems] = useState(initial)
  const [dialog, setDialog] = useState<DialogState>(null)
  const closeDialog = () => setDialog(null)

  const create = useMutation({
    mutationFn: (body: { name: string; notes?: string; cloneFromId?: string }) =>
      fetcher<AssumptionSet>('/api/v1/assumptions/sets', { method: 'POST', json: body }),
    onSuccess: (s) => {
      setItems((prev) => [s, ...prev])
      toast.success(`Created "${s.name}"`)
      closeDialog()
    },
  })

  const rename = useMutation({
    mutationFn: (body: { id: string; name: string; notes: string }) =>
      fetcher<AssumptionSet>(`/api/v1/assumptions/sets/${body.id}`, {
        method: 'PUT', json: { name: body.name, notes: body.notes || undefined },
      }),
    onSuccess: (s) => {
      setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, name: s.name, notes: s.notes } : x)))
      toast.success(`Renamed to "${s.name}"`)
      closeDialog()
    },
  })

  const activate = useMutation({
    mutationFn: (id: string) =>
      fetcher<AssumptionSet>(`/api/v1/assumptions/sets/${id}/activate`, { method: 'POST', json: {} }),
    onSuccess: (s) => {
      setItems((prev) => prev.map((x) => ({ ...x, isActive: x.id === s.id })))
      toast.success(`Activated "${s.name}"`)
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await fetcher<null>(`/api/v1/assumptions/sets/${id}`, { method: 'DELETE' })
      return id
    },
    onSuccess: (id) => {
      setItems((prev) => prev.filter((x) => x.id !== id))
      toast.success('Set deleted')
    },
  })

  return (
    <>
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assumptions</h1>
          <p className="text-sm text-muted-foreground">Cost cards, factors, and operating assumptions per set.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{items.length} set{items.length === 1 ? '' : 's'}</span>
          <Button size="sm" onClick={() => setDialog({ kind: 'create' })}>New set</Button>
        </div>
      </div>

      {items.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No sets yet</CardTitle>
            <CardDescription>
              Click <strong>New set</strong> to create your first assumption set. It will be seeded with the V3.0
              recommended defaults — you can edit any value afterward and mark it active.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <Card key={s.id} className="flex flex-col">
            <Link href={`/assumptions/${s.id}`} className="block flex-1 transition hover:bg-muted/30">
              <CardHeader>
                <CardTitle className="flex items-baseline justify-between gap-2">
                  <span className="truncate">{s.name}</span>
                  {s.isActive && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      active
                    </span>
                  )}
                </CardTitle>
                <CardDescription>v{s.version} · {new Date(s.createdAt).toLocaleDateString()}</CardDescription>
              </CardHeader>
              {s.notes && (
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{s.notes}</p>
                </CardContent>
              )}
            </Link>
            <div className="flex flex-wrap items-center gap-1 border-t bg-muted/30 px-3 py-2 text-xs">
              {!s.isActive && (
                <Button
                  variant="ghost" size="sm"
                  disabled={activate.isPending}
                  onClick={() => activate.mutate(s.id)}
                >
                  Activate
                </Button>
              )}
              <Button
                variant="ghost" size="sm"
                onClick={() => setDialog({ kind: 'rename', targetId: s.id, name: s.name, notes: s.notes ?? '' })}
              >
                Rename
              </Button>
              <Button
                variant="ghost" size="sm"
                onClick={() => setDialog({ kind: 'create', cloneFromId: s.id, cloneFromName: s.name })}
              >
                Clone
              </Button>
              <div className="ml-auto">
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button variant="ghost" size="sm" disabled={remove.isPending || s.isActive}>Delete</Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{s.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {s.isActive
                          ? 'This set is active — activate another set first.'
                          : 'Every parameter override in this set is removed. Quotes already saved against it keep their snapshot, but cannot recalculate. This cannot be undone.'}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={s.isActive}
                        onClick={() => remove.mutate(s.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create / Clone dialog */}
      <Dialog open={dialog?.kind === 'create'} onOpenChange={(o) => { if (!o) closeDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.kind === 'create' && dialog.cloneFromId ? 'Clone set' : 'New assumption set'}</DialogTitle>
            <DialogDescription>
              {dialog?.kind === 'create' && dialog.cloneFromId
                ? `Cloning from "${dialog.cloneFromName}". Parameter overrides carry over.`
                : 'Creates a set with the V3.0 recommended defaults. You can edit values after creation.'}
            </DialogDescription>
          </DialogHeader>
          <CreateForm
            cloneFromId={dialog?.kind === 'create' ? dialog.cloneFromId : undefined}
            pending={create.isPending}
            onSubmit={(name, notes) =>
              create.mutate({
                name,
                notes: notes || undefined,
                cloneFromId: dialog?.kind === 'create' ? dialog.cloneFromId : undefined,
              })
            }
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={dialog?.kind === 'rename'} onOpenChange={(o) => { if (!o) closeDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename set</DialogTitle>
            <DialogDescription>Edit the name and notes for this assumption set.</DialogDescription>
          </DialogHeader>
          {dialog?.kind === 'rename' && (
            <RenameForm
              initialName={dialog.name}
              initialNotes={dialog.notes}
              pending={rename.isPending}
              onSubmit={(name, notes) => rename.mutate({ id: dialog.targetId, name, notes })}
              onCancel={closeDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function CreateForm({
  cloneFromId, pending, onSubmit, onCancel,
}: {
  cloneFromId?: string
  pending: boolean
  onSubmit: (name: string, notes: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim(), notes.trim())
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="set-name">Name</Label>
        <Input
          id="set-name" required autoFocus
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder={cloneFromId ? 'e.g. Q3 2026 — Carrier A revision' : 'e.g. Q3 2026 Base'}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="set-notes">Notes (optional)</Label>
        <textarea
          id="set-notes"
          className={`${selectCls} h-20 py-2`}
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth recording about this revision"
        />
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" onClick={onCancel} />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? 'Creating…' : cloneFromId ? 'Clone set' : 'Create set'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function RenameForm({
  initialName, initialNotes, pending, onSubmit, onCancel,
}: {
  initialName: string
  initialNotes: string
  pending: boolean
  onSubmit: (name: string, notes: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [notes, setNotes] = useState(initialNotes)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim(), notes.trim())
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="rename-name">Name</Label>
        <Input
          id="rename-name" required autoFocus
          value={name} onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="rename-notes">Notes</Label>
        <textarea
          id="rename-notes"
          className={`${selectCls} h-20 py-2`}
          value={notes} onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" onClick={onCancel} />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}

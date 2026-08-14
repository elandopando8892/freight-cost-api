'use client'

import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { fetcher } from '@/lib/fetcher'

export function DeleteQuoteButton({ id, label }: { id: string; label: string }) {
  const router = useRouter()

  const remove = useMutation({
    mutationFn: () => fetcher<null>(`/api/v1/quotes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Cotización eliminada')
      router.push('/quotes')
      router.refresh()
    },
  })

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="sm" disabled={remove.isPending}>
            {remove.isPending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar esta cotización?</AlertDialogTitle>
          <AlertDialogDescription>
            {label}. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => remove.mutate()}>Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

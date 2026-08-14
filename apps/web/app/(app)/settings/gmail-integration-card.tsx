'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { Mail, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetcher } from '@/lib/fetcher'

type GmailConnection = {
  mailbox_email: string | null
  status: string
  connected: boolean
  token_expires_at: string | null
  last_error: string | null
  configured: boolean
}

type GmailResponse = { configured?: boolean; error?: string; rows?: GmailConnection[]; authorization_url?: string }

export function GmailIntegrationCard({ email }: { email: string }) {
  const connection = useQuery({ queryKey: ['gmail-integration'], queryFn: () => fetcher<GmailResponse>('/api/integrations/gmail') })
  const row = connection.data?.rows?.[0]
  const configured = row?.configured ?? connection.data?.configured ?? false
  const connect = useMutation({
    mutationFn: () => fetcher<GmailResponse>('/api/integrations/gmail', { method: 'POST', json: { operation: 'start' } }),
    onSuccess: (result) => {
      if (!result.authorization_url) throw new Error('Rateware did not return a Gmail authorization URL.')
      window.location.assign(result.authorization_url)
    },
  })
  const disconnect = useMutation({
    mutationFn: () => fetcher<{ row: GmailConnection }>('/api/integrations/gmail', { method: 'POST', json: { operation: 'disconnect' } }),
    onSuccess: () => { toast.success('Gmail disconnected.'); connection.refetch() },
  })

  return (
    <Card className="mb-6 overflow-hidden">
      <CardHeader className="border-b bg-muted/25 pb-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Mail className="h-5 w-5" /></span>
          <div>
            <CardTitle>Integraciones</CardTitle>
            <CardDescription>Gmail para Quote Desk se conecta mediante el broker OAuth cifrado de Rateware.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-medium"><span>Gmail</span>{row?.connected && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">Conectado</span>}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {row?.connected ? `Remitente autorizado: ${row.mailbox_email}` : `Autoriza únicamente la cuenta Gmail que coincide con tu identidad Kinde (${email || 'tu cuenta'}).`}
              </p>
              {row?.last_error && <p className="mt-2 text-sm text-destructive">Se requiere reconectar: {row.last_error}</p>}
              {connection.isError && <p className="mt-2 text-sm text-destructive">No se pudo cargar el estado Gmail de Rateware. No se modificó ninguna conexión.</p>}
              {!configured && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">Este entorno aún no tiene configurado el broker Gmail de Rateware.</p>}
            </div>
            {row?.connected ? (
              <Button variant="outline" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>Desconectar</Button>
            ) : (
              <Button size="sm" onClick={() => connect.mutate()} disabled={connect.isPending || !configured}>{connect.isPending ? 'Abriendo Google…' : 'Conectar Gmail'}</Button>
            )}
          </div>
        </div>
        <p className="flex gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />El inicio de sesión Kinde no otorga acceso a la bandeja. Google muestra los permisos solicitados y Rateware guarda los tokens de renovación cifrados. Desconectar revoca la conexión local; desde aquí no se envía ninguna cotización.</p>
      </CardContent>
    </Card>
  )
}

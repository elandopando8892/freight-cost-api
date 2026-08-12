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
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Mail className="h-5 w-5" /></span>
          <div>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Gmail for Quote Desk is connected through Rateware&apos;s encrypted OAuth broker.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-md border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-medium"><span>Gmail</span>{row?.connected && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700">Connected</span>}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {row?.connected ? `Authorized sender: ${row.mailbox_email}` : `Authorize only the Gmail account matching your Kinde identity (${email || 'your account'}).`}
              </p>
              {row?.last_error && <p className="mt-2 text-sm text-destructive">Reconnect required: {row.last_error}</p>}
              {connection.isError && <p className="mt-2 text-sm text-destructive">Rateware Gmail status could not be loaded. No connection change was made.</p>}
              {!configured && <p className="mt-2 text-sm text-amber-700">This environment has not configured the Rateware Gmail broker yet.</p>}
            </div>
            {row?.connected ? (
              <Button variant="outline" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>Disconnect</Button>
            ) : (
              <Button size="sm" onClick={() => connect.mutate()} disabled={connect.isPending || !configured}>{connect.isPending ? 'Opening Google…' : 'Connect Gmail'}</Button>
            )}
          </div>
        </div>
        <p className="flex gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />Kinde sign-in does not grant inbox access. Google shows the requested scopes, and Rateware stores refresh tokens encrypted. Disconnecting revokes the local connection; no quote is sent from this screen.</p>
      </CardContent>
    </Card>
  )
}

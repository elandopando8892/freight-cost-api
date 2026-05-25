/**
 * Scheduled jobs — invoked by Vercel Cron (see vercel.json `crons`).
 *
 * These run WITHOUT a JWT (cron can't carry a user token). Instead they verify
 * the Vercel-supplied `Authorization: Bearer <CRON_SECRET>` header and fail
 * closed (401) when CRON_SECRET is unset, so the endpoints are never open.
 */
import { FastifyInstance } from 'fastify'
import { env } from '../../config/env.js'
import { prisma } from '../../config/prisma.js'
import {
  fetchEiaCurrentDiesel,
  refreshFuelSurcharge,
  syncSetDieselUsBorder,
  fetchEiaHistory,
} from '../market/fuel.service.js'

/** True only when the request carries the exact Vercel Cron bearer secret. */
function isAuthorizedCron(authHeader?: string): boolean {
  if (!env.CRON_SECRET) return false
  return authHeader === `Bearer ${env.CRON_SECRET}`
}

export async function cronRoutes(app: FastifyInstance) {
  // Weekly fuel refresh — one call keeps current fuel correct everywhere:
  //   EIA diesel-by-region (RSS) → USA state FSC → each org's MX Diesel US Border.
  app.get('/cron/fuel', async (request, reply) => {
    if (!isAuthorizedCron(request.headers.authorization)) {
      return reply.status(401).send({ error: 'unauthorized' })
    }
    try {
      const eia = await fetchEiaCurrentDiesel()
      const refresh = await refreshFuelSurcharge()
      // Sync the MX leg's diesel for every org that has an active assumption set.
      const orgs = await prisma.assumptionSet.findMany({
        where: { isActive: true },
        select: { orgId: true },
        distinct: ['orgId'],
      })
      let syncedOrgs = 0
      for (const o of orgs) {
        const synced = await syncSetDieselUsBorder(o.orgId)
        if (synced) syncedOrgs++
      }
      return reply.send({ ok: true, ranAt: new Date().toISOString(), eia, refresh, syncedOrgs })
    } catch (err) {
      return reply.status(502).send({ ok: false, error: 'fuel cron failed', detail: (err as Error).message })
    }
  })

  // Monthly diesel-history refresh — keeps the FSC trend current. Pulls a rolling
  // ~13-month window (EIA revises recent months); idempotent upsert by area+period.
  app.get('/cron/fuel-history', async (request, reply) => {
    if (!isAuthorizedCron(request.headers.authorization)) {
      return reply.status(401).send({ error: 'unauthorized' })
    }
    try {
      const d = new Date()
      d.setMonth(d.getMonth() - 13)
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const result = await fetchEiaHistory(start)
      return reply.send({ ok: true, ranAt: new Date().toISOString(), start, ...result })
    } catch (err) {
      const msg = (err as Error).message
      // Missing key is a config error (400); upstream EIA failure is 502.
      return reply
        .status(msg.includes('EIA_API_KEY') ? 400 : 502)
        .send({ ok: false, error: 'fuel-history cron failed', detail: msg })
    }
  })
}

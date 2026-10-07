import type { FastifyInstance } from 'fastify'
import { requireRole } from '../../middleware/authorize.js'
import { versionPlanning } from './version-planning.service.js'

/** Registered inside the cost-base authenticated scope; no separate Auth implementation. */
export function registerVersionPlanningRoutes(app: FastifyInstance) {
  const path='/cost-bases/:id/versions/:versionId/planning'
  app.get(path,{preHandler:requireRole('ADMIN','OPERATOR'),onSend:async(_req,reply)=>{reply.header('Cache-Control','no-store')}},async request=>{
    const {id,versionId}=request.params as {id:string;versionId:string}
    return versionPlanning.read(request.user!,id,versionId)
  })
  app.put(path,{bodyLimit:16_000,preHandler:requireRole('ADMIN','OPERATOR'),onSend:async(_req,reply)=>{reply.header('Cache-Control','no-store')}},async request=>{
    const {id,versionId}=request.params as {id:string;versionId:string}
    return versionPlanning.save(request.user!,id,versionId,request.body)
  })
}

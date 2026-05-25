import { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'

export function errorHandler(
  error: FastifyError | ZodError | Error,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation error',
      issues: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    })
  }

  const statusCode = (error as FastifyError).statusCode ?? 500
  const message = statusCode < 500 ? error.message : 'Internal server error'

  if (statusCode >= 500) {
    console.error(error)
  }

  return reply.status(statusCode).send({ error: message })
}

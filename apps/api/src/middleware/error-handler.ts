import { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";

export function errorHandler(
  error: FastifyError | ZodError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "Validation error",
      requestId: request.id,
      issues: error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
  }

  const statusCode = (error as FastifyError).statusCode ?? 500;
  const message = statusCode < 500 ? error.message : "Internal server error";

  if (statusCode >= 500) {
    request.log.error({ err: error }, "Unhandled request error");
  }

  return reply
    .status(statusCode)
    .send({ error: message, requestId: request.id });
}

import fp from 'fastify-plugin'
import { ZodError } from 'zod'
import type { FastifyError } from 'fastify'
import { AppError } from '../lib/errors.js'

export default fp(async (app) => {
  app.setErrorHandler<FastifyError>((err, req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        error: { code: err.code, message: err.message, details: err.details },
      })
    }

    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: err.issues,
        },
      })
    }

    if (err.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: err.validation,
        },
      })
    }

    req.log.error(err)
    const status = err.statusCode ?? 500
    return reply.status(status).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: status === 500 ? 'Internal server error' : err.message,
      },
    })
  })
})
import fp from 'fastify-plugin'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { HttpError } from '../lib/errors.js'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (
      role: 'customer' | 'admin',
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export default fp(async (app) => {
  app.decorate('authenticate', async (req: FastifyRequest) => {
    try {
      await req.jwtVerify()
    } catch {
      throw HttpError.unauthorized('Missing or invalid token')
    }
  })

  app.decorate(
    'requireRole',
    (role: 'customer' | 'admin') =>
      async (req: FastifyRequest) => {
        try {
          await req.jwtVerify()
        } catch {
          throw HttpError.unauthorized('Missing or invalid token')
        }
        if (req.user.role !== role) {
          throw HttpError.forbidden(`Requires role: ${role}`)
        }
      },
  )
})
import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import { env } from '../lib/env.js'

export type JwtPayload = { sub: number; role: 'customer' | 'admin' }

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

export default fp(async (fastify) => {
  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  })
})
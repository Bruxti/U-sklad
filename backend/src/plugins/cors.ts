import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import { env } from '../lib/env.js'

export default fp(async (fastify) => {
  const origin =
    env.CORS_ORIGIN === '*'
      ? true
      : env.CORS_ORIGIN.split(',').map((s) => s.trim())

  await fastify.register(cors, {
    origin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
})
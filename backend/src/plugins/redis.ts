import fp from 'fastify-plugin'
import { Redis } from 'ioredis'
import { env } from '../lib/env.js'

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
  }
}

export default fp(async (fastify) => {
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  })
  fastify.decorate('redis', redis)
  fastify.addHook('onClose', async () => {
    await redis.quit()
  })
})
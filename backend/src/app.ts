import Fastify from 'fastify'
import { env } from './lib/env.js'

import corsPlugin from './plugins/cors.js'
import swaggerPlugin from './plugins/swagger.js'
import prismaPlugin from './plugins/prisma.js'
import redisPlugin from './plugins/redis.js'
import jwtPlugin from './plugins/jwt.js'

export async function buildApp() {
  const app = Fastify({
    logger: { level: env.NODE_ENV === 'development' ? 'info' : 'warn' },
  })

  await app.register(corsPlugin)
  await app.register(swaggerPlugin)
  await app.register(prismaPlugin)
  await app.register(redisPlugin)
  await app.register(jwtPlugin)

  app.get('/healthz', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))

  // Модули подключаем на следующих этапах:
  // await app.register(authRoutes,  { prefix: '/api/auth' })
  // await app.register(productRoutes, { prefix: '/api/products' })
  // await app.register(cartRoutes,  { prefix: '/api/cart' })

  return app
}
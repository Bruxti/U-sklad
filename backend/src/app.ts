import Fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { env } from './lib/env.js'

import corsPlugin from './plugins/cors.js'
import swaggerPlugin from './plugins/swagger.js'
import prismaPlugin from './plugins/prisma.js'
import redisPlugin from './plugins/redis.js'
import jwtPlugin from './plugins/jwt.js'
import authPlugin from './plugins/auth.js'
import { promoCodesRoutes } from './modules/promo-codes/routes.js'
import errorHandlerPlugin from './plugins/error-handler.js'

import { authRoutes } from './modules/auth/routes.js'
import { productsRoutes } from './modules/products/routes.js'
import { cartRoutes } from './modules/cart/routes.js'

export async function buildApp() {
  const app = Fastify({
    logger: { level: env.NODE_ENV === 'development' ? 'info' : 'warn' },
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(errorHandlerPlugin)
  await app.register(corsPlugin)
  await app.register(swaggerPlugin)
  await app.register(prismaPlugin)
  await app.register(redisPlugin)
  await app.register(jwtPlugin)
  await app.register(authPlugin)

  app.get('/healthz', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))

  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(productsRoutes, { prefix: '/api/products' })
  await app.register(cartRoutes, { prefix: '/api/cart' })
  await app.register(promoCodesRoutes, { prefix: '/api/promo-codes' })

  return app
}
import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

export default fp(async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: { title: 'Shop API', version: '1.0.0' },
      servers: [{ url: '/' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  })
  await fastify.register(swaggerUi, { routePrefix: '/docs' })
})
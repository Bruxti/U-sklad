import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { AuthService, toPublicUser } from './service.js'
import { authResponse, loginBody, publicUser, registerBody } from './schema.js'
import { HttpError } from '../../lib/errors.js'

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = new AuthService(app.prisma)

  app.post(
    '/register',
    {
      schema: {
        tags: ['auth'],
        summary: 'Регистрация нового пользователя',
        body: registerBody,
        response: { 201: authResponse },
      },
    },
    async (req, reply) => {
      const user = await service.register(req.body.email, req.body.password)
      const accessToken = await reply.jwtSign({
        sub: user.id,
        role: user.role,
      })
      return reply.status(201).send({ accessToken, user: toPublicUser(user) })
    },
  )

  app.post(
    '/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Авторизация по email и паролю',
        body: loginBody,
        response: { 200: authResponse },
      },
    },
    async (req, reply) => {
      const user = await service.login(req.body.email, req.body.password)
      const accessToken = await reply.jwtSign({
        sub: user.id,
        role: user.role,
      })
      return { accessToken, user: toPublicUser(user) }
    },
  )

  app.get(
    '/me',
    {
      schema: {
        tags: ['auth'],
        summary: 'Текущий пользователь',
        security: [{ bearerAuth: [] }],
        response: { 200: publicUser },
      },
      onRequest: [app.authenticate],
    },
    async (req) => {
      const user = await service.findById(req.user.sub)
      if (!user) throw HttpError.unauthorized('User not found')
      return toPublicUser(user)
    },
  )
}
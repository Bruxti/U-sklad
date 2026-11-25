import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { PromoCodesService, toPromoDTO } from './service.js'
import {
  createPromoBody,
  promoCodeDTO,
  promoIdParam,
  updatePromoBody,
} from './schema.js'

export const promoCodesRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = new PromoCodesService(app.prisma)

  app.addHook('onRequest', app.requireRole('admin'))

  app.get(
    '/',
    {
      schema: {
        tags: ['admin', 'promo-codes'],
        summary: 'Список промокодов (admin)',
        security: [{ bearerAuth: [] }],
        response: { 200: z.array(promoCodeDTO) },
      },
    },
    async () => (await service.list()).map(toPromoDTO),
  )

  app.post(
    '/',
    {
      schema: {
        tags: ['admin', 'promo-codes'],
        summary: 'Создать промокод (admin)',
        security: [{ bearerAuth: [] }],
        body: createPromoBody,
        response: { 201: promoCodeDTO },
      },
    },
    async (req, reply) => {
      const promo = await service.create({
        code: req.body.code,
        discountPercentage: req.body.discountPercentage,
        isActive: req.body.isActive,
      })
      return reply.status(201).send(toPromoDTO(promo))
    },
  )

  app.patch(
    '/:id',
    {
      schema: {
        tags: ['admin', 'promo-codes'],
        summary: 'Обновить промокод (admin)',
        security: [{ bearerAuth: [] }],
        params: promoIdParam,
        body: updatePromoBody,
        response: { 200: promoCodeDTO },
      },
    },
    async (req) => toPromoDTO(await service.update(req.params.id, req.body)),
  )

  app.delete(
    '/:id',
    {
      schema: {
        tags: ['admin', 'promo-codes'],
        summary: 'Удалить промокод (admin)',
        security: [{ bearerAuth: [] }],
        params: promoIdParam,
      },
    },
    async (req, reply) => {
      await service.delete(req.params.id)
      return reply.status(204).send()
    },
  )
}
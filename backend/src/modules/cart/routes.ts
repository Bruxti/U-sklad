import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { CartService } from './service.js'
import {
  addCartItemBody,
  applyPromoBody,
  cartItemIdParam,
  cartResponse,
  checkoutResponse,
  updateCartItemBody,
} from './schema.js'
import { invalidateByPrefix } from '../../lib/cache.js'

export const cartRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = new CartService(app.prisma)

  // JWT для всех маршрутов корзины; и customer, и admin могут покупать
  app.addHook('onRequest', app.authenticate)

  app.get(
    '/',
    {
      schema: {
        tags: ['cart'],
        summary: 'Текущая корзина пользователя',
        security: [{ bearerAuth: [] }],
        response: { 200: cartResponse },
      },
    },
    async (req) => service.getCart(req.user.sub),
  )

  app.post(
    '/items',
    {
      schema: {
        tags: ['cart'],
        summary: 'Добавить товар / увеличить количество',
        security: [{ bearerAuth: [] }],
        body: addCartItemBody,
        response: { 200: cartResponse },
      },
    },
    async (req) => service.addItem(req.user.sub, req.body.productId, req.body.quantity),
  )

  app.patch(
    '/items/:id',
    {
      schema: {
        tags: ['cart'],
        summary: 'Изменить количество товара',
        security: [{ bearerAuth: [] }],
        params: cartItemIdParam,
        body: updateCartItemBody,
        response: { 200: cartResponse },
      },
    },
    async (req) => service.updateItem(req.user.sub, req.params.id, req.body.quantity),
  )

  app.delete(
    '/items/:id',
    {
      schema: {
        tags: ['cart'],
        summary: 'Удалить товар из корзины',
        security: [{ bearerAuth: [] }],
        params: cartItemIdParam,
        response: { 200: cartResponse },
      },
    },
    async (req) => service.removeItem(req.user.sub, req.params.id),
  )

  app.post(
    '/apply-promo',
    {
      schema: {
        tags: ['cart'],
        summary: 'Применить (code) или снять (null/"" ) промокод',
        security: [{ bearerAuth: [] }],
        body: applyPromoBody,
        response: { 200: cartResponse },
      },
    },
    async (req) => service.applyPromo(req.user.sub, req.body.code),
  )

  app.post(
    '/checkout',
    {
      schema: {
        tags: ['cart'],
        summary: 'Оформить: списать сток, очистить корзину и промокод',
        security: [{ bearerAuth: [] }],
        response: { 200: checkoutResponse },
      },
    },
    async (req) => {
      const result = await service.checkout(req.user.sub)
      // Сток изменился — каталог устарел
      await invalidateByPrefix(app.redis, 'products:')
      return result
    },
  )
}
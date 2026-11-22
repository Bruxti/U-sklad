import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { Prisma } from '@prisma/client'
import { ProductsService, toProductDTO } from './service.js'
import {
  createBody,
  idParam,
  listQuery,
  listResponse,
  productDTO,
  updateBody,
} from './schema.js'
import { HttpError } from '../../lib/errors.js'

function isP2025(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025'
}

export const productsRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = new ProductsService(app.prisma)

  app.get(
    '/',
    {
      schema: {
        tags: ['products'],
        summary: 'Каталог: поиск, фильтры, сортировка, пагинация',
        querystring: listQuery,
        response: { 200: listResponse },
      },
    },
    async (req) => {
      const q = req.query
      const result = await service.list({
        page: q.page,
        limit: q.limit,
        search: q.search,
        minPrice: q.min_price,
        maxPrice: q.max_price,
        minRating: q.min_rating,
        sortBy: q.sort_by,
        order: q.order,
      })
      return {
        items: result.items.map(toProductDTO),
        meta: {
          total_items: result.total,
          total_pages: result.totalPages,
          current_page: result.page,
          limit: result.limit,
        },
      }
    },
  )

  app.get(
    '/:id',
    {
      schema: {
        tags: ['products'],
        summary: 'Товар по id',
        params: idParam,
        response: { 200: productDTO },
      },
    },
    async (req) => {
      const product = await service.findById(req.params.id)
      if (!product) throw HttpError.notFound('Product not found')
      return toProductDTO(product)
    },
  )

  app.post(
    '/',
    {
      schema: {
        tags: ['products'],
        summary: 'Создать товар (admin)',
        security: [{ bearerAuth: [] }],
        body: createBody,
        response: { 201: productDTO },
      },
      onRequest: [app.requireRole('admin')],
    },
    async (req, reply) => {
      const body = req.body
      const thumbnail = body.thumbnail ?? body.images[0] ?? ''
      const product = await service.create({
        title: body.title,
        description: body.description,
        fullDescription: body.fullDescription,
        price: body.price,
        rating: body.rating,
        images: body.images,
        thumbnail,
        tags: body.tags,
        specs: body.specs,
        highlights: body.highlights,
        stockQuantity: body.stockQuantity,
      })
      return reply.status(201).send(toProductDTO(product))
    },
  )

  app.patch(
    '/:id',
    {
      schema: {
        tags: ['products'],
        summary: 'Обновить товар (admin)',
        security: [{ bearerAuth: [] }],
        params: idParam,
        body: updateBody,
        response: { 200: productDTO },
      },
      onRequest: [app.requireRole('admin')],
    },
    async (req) => {
      try {
        const body = req.body
        // если пришёл новый images без явного thumbnail — обновим thumbnail
        const thumbnail =
          body.thumbnail ?? (body.images && body.images[0] ? body.images[0] : undefined)
        const updated = await service.update(req.params.id, {
          ...body,
          ...(thumbnail ? { thumbnail } : {}),
        })
        return toProductDTO(updated)
      } catch (e) {
        if (isP2025(e)) throw HttpError.notFound('Product not found')
        throw e
      }
    },
  )

  app.delete(
    '/:id',
    {
      schema: {
        tags: ['products'],
        summary: 'Soft-delete товара (admin)',
        security: [{ bearerAuth: [] }],
        params: idParam,
      },
      onRequest: [app.requireRole('admin')],
    },
    async (req, reply) => {
      try {
        await service.softDelete(req.params.id)
        return reply.status(204).send()
      } catch (e) {
        if (isP2025(e)) throw HttpError.notFound('Product not found')
        throw e
      }
    },
  )
}
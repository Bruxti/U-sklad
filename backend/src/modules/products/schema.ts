import { z } from 'zod'

// DTO: содержит поля в двух вариантах — «как в ТЗ» и «как ждёт фронт».
// Это осознанный компромисс: админ-часть и Swagger читают title/stock_quantity,
// фронт читает name/thumbnail без переделки common.js.
export const productDTO = z.object({
  id: z.number(),
  title: z.string(),
  name: z.string(),
  description: z.string(),
  fullDescription: z.string(),
  price: z.number(),
  rating: z.number(),
  images: z.array(z.string()),
  thumbnail: z.string(),
  tags: z.array(z.string()),
  specs: z.array(z.string()),
  highlights: z.array(z.string()),
  stockQuantity: z.number(),
  stock_quantity: z.number(),
  createdAt: z.string(),
  created_at: z.string(),
})

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().trim().min(1).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  min_rating: z.coerce.number().min(0).max(5).optional(),
  sort_by: z.enum(['price', 'title']).default('title'),
  order: z.enum(['asc', 'desc']).default('asc'),
})

export const listResponse = z.object({
  items: z.array(productDTO),
  meta: z.object({
    total_items: z.number(),
    total_pages: z.number(),
    current_page: z.number(),
    limit: z.number(),
  }),
})

export const idParam = z.object({ id: z.coerce.number().int().positive() })

const imageList = z.array(z.string().url()).min(3, 'at least 3 images required')

export const createBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  fullDescription: z.string().optional().default(''),
  price: z.number().positive(),
  rating: z.number().min(0).max(5).optional().default(0),
  images: imageList,
  thumbnail: z.string().url().optional(),
  tags: z.array(z.string()).optional().default([]),
  specs: z.array(z.string()).optional().default([]),
  highlights: z.array(z.string()).optional().default([]),
  stockQuantity: z.number().int().min(0).optional().default(0),
})

// PATCH — БЕЗ default(), иначе PATCH с пустым body перезапишет поля дефолтами
export const updateBody = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  fullDescription: z.string().optional(),
  price: z.number().positive().optional(),
  rating: z.number().min(0).max(5).optional(),
  images: imageList.optional(),
  thumbnail: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  specs: z.array(z.string()).optional(),
  highlights: z.array(z.string()).optional(),
  stockQuantity: z.number().int().min(0).optional(),
})
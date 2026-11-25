import { z } from 'zod'

export const promoCodeDTO = z.object({
  id: z.number(),
  code: z.string(),
  discountPercentage: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
})

export const createPromoBody = z.object({
  code: z.string().trim().min(1).max(64).transform((s) => s.toUpperCase()),
  discountPercentage: z.number().int().min(1).max(100),
  isActive: z.boolean().optional().default(true),
})

export const updatePromoBody = z.object({
  code: z.string().trim().min(1).max(64).transform((s) => s.toUpperCase()).optional(),
  discountPercentage: z.number().int().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
})

export const promoIdParam = z.object({ id: z.coerce.number().int().positive() })
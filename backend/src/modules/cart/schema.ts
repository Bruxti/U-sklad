import { z } from 'zod'
import { productDTO } from '../products/schema.js'

export const cartItemIdParam = z.object({
  id: z.coerce.number().int().positive(),
})

export const cartItemDTO = z.object({
  id: z.number(),          // CartItem.id — для PATCH/DELETE
  productId: z.number(),
  quantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
  product: productDTO,
})

export const cartResponse = z.object({
  items: z.array(cartItemDTO),
  subtotal: z.number(),
  discount: z.number(),
  total: z.number(),
  promoCode: z.string().nullable(),
  itemCount: z.number(),   // сумма quantity (штук), а не строк
})

export const addCartItemBody = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(9999).optional().default(1),
})

export const updateCartItemBody = z.object({
  quantity: z.number().int().min(1).max(9999),
})

export const applyPromoBody = z.object({
  // null или '' — снять промокод; строка — применить
  code: z.string().max(64).nullable(),
})

export const checkoutResponse = z.object({
  checkoutId: z.number(),   // id корзины — не «настоящий» orderId, ордеров в ТЗ нет
  itemCount: z.number(),
  subtotal: z.number(),
  discount: z.number(),
  total: z.number(),
  promoCode: z.string().nullable(),
})
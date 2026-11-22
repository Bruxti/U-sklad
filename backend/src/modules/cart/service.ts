import { Prisma, type PrismaClient } from '@prisma/client'
import { AppError, HttpError } from '../../lib/errors.js'
import { toProductDTO } from '../products/service.js'

type CartWithRelations = Prisma.CartGetPayload<{
  include: {
    items: { include: { product: true } }
    promoCode: true
  }
}>

const cartInclude = {
  items: { include: { product: true } },
  promoCode: true,
} as const

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function toCartDTO(cart: CartWithRelations) {
  // Soft-deleted товары не показываем: администратор убрал их из каталога,
  // значит и из корзины они должны исчезнуть. Строки CartItem оставляем
  // в БД (не удаляем данные пользователя «молча»), но в ответ не включаем.
  const visible = cart.items.filter((i) => i.product.deletedAt === null)

  const items = visible.map((item) => {
    const unitPrice = Number(item.product.price.toString())
    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice,
      lineTotal: round2(unitPrice * item.quantity),
      product: toProductDTO(item.product),
    }
  })

  const subtotal = round2(items.reduce((s, i) => s + i.lineTotal, 0))
  const percentage = cart.promoCode?.discountPercentage ?? 0
  const discount = round2((subtotal * percentage) / 100)
  const total = round2(subtotal - discount)
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  return {
    items,
    subtotal,
    discount,
    total,
    promoCode: cart.promoCode?.code ?? null,
    itemCount,
  }
}

export class CartService {
  constructor(private prisma: PrismaClient) {}

  private async ensureCart(userId: number) {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    })
  }

  async getCart(userId: number) {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: cartInclude,
    })
    return toCartDTO(cart)
  }

  async addItem(userId: number, productId: number, quantity: number) {
    const cart = await this.ensureCart(userId)

    // findFirst + deletedAt: null — единый «невидимый» ответ на
    // несуществующий и soft-deleted товар, чтобы не палить разницу.
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    })
    if (!product) throw HttpError.notFound('Product not found')

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    })

    const newQuantity = (existing?.quantity ?? 0) + quantity
    if (newQuantity > product.stockQuantity) {
      throw HttpError.badRequest(
        `Not enough stock for "${product.title}": available ${product.stockQuantity}, requested ${newQuantity}`,
      )
    }

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
      })
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
      })
    }

    return this.getCart(userId)
  }

  async updateItem(userId: number, itemId: number, quantity: number) {
    const cart = await this.ensureCart(userId)
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true },
    })
    if (!item) throw HttpError.notFound('Cart item not found')
    if (item.product.deletedAt) throw HttpError.notFound('Product not found')

    if (quantity > item.product.stockQuantity) {
      throw HttpError.badRequest(
        `Not enough stock: available ${item.product.stockQuantity}, requested ${quantity}`,
      )
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    })

    return this.getCart(userId)
  }

  async removeItem(userId: number, itemId: number) {
    const cart = await this.ensureCart(userId)
    const result = await this.prisma.cartItem.deleteMany({
      where: { id: itemId, cartId: cart.id },
    })
    if (result.count === 0) throw HttpError.notFound('Cart item not found')
    return this.getCart(userId)
  }

  async applyPromo(userId: number, code: string | null) {
    const cart = await this.ensureCart(userId)

    if (!code || code.trim() === '') {
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { promoCodeId: null },
      })
      return this.getCart(userId)
    }

    const normalized = code.trim().toUpperCase()
    const promo = await this.prisma.promoCode.findFirst({
      where: { code: normalized, isActive: true },
    })
    if (!promo) throw HttpError.badRequest('Invalid or inactive promo code')

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { promoCodeId: promo.id },
    })
    return this.getCart(userId)
  }

  async checkout(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: cartInclude,
    })
    if (!cart) throw HttpError.badRequest('Cart is empty')

    const activeItems = cart.items.filter((i) => i.product.deletedAt === null)
    if (activeItems.length === 0) throw HttpError.badRequest('Cart is empty')

    // Предварительная проверка — даёт понятное сообщение с quantity.
    // В транзакции ниже повторяем атомарно (updateMany с условием gte),
    // чтобы не проиграть гонку с другим checkout'ом.
    for (const item of activeItems) {
      if (item.product.stockQuantity < item.quantity) {
        throw new AppError(
          409,
          'INSUFFICIENT_STOCK',
          `Not enough stock for "${item.product.title}": available ${item.product.stockQuantity}, requested ${item.quantity}`,
        )
      }
    }

    const summary = toCartDTO(cart)

    await this.prisma.$transaction(async (tx) => {
      for (const item of activeItems) {
        const res = await tx.product.updateMany({
          where: { id: item.productId, stockQuantity: { gte: item.quantity } },
          data: { stockQuantity: { decrement: item.quantity } },
        })
        if (res.count === 0) {
          throw new AppError(
            409,
            'INSUFFICIENT_STOCK',
            `Stock changed for "${item.product.title}", please retry`,
          )
        }
      }
      // Удаляем все строки корзины, включая скрытые (soft-deleted товары)
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
      await tx.cart.update({
        where: { id: cart.id },
        data: { promoCodeId: null },
      })
    })

    return {
      checkoutId: cart.id,
      itemCount: summary.itemCount,
      subtotal: summary.subtotal,
      discount: summary.discount,
      total: summary.total,
      promoCode: summary.promoCode,
    }
  }
}
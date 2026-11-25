import { Prisma, type PrismaClient, type PromoCode } from '@prisma/client'
import { HttpError } from '../../lib/errors.js'

export function toPromoDTO(p: PromoCode) {
  return {
    id: p.id,
    code: p.code,
    discountPercentage: p.discountPercentage,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
  }
}

export class PromoCodesService {
  constructor(private prisma: PrismaClient) {}

  list() {
    return this.prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } })
  }

  async create(data: Prisma.PromoCodeCreateInput) {
    try {
      return await this.prisma.promoCode.create({ data })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw HttpError.conflict(`Promo code "${data.code}" already exists`)
      }
      throw e
    }
  }

  async update(id: number, data: Prisma.PromoCodeUpdateInput) {
    try {
      return await this.prisma.promoCode.update({ where: { id }, data })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') throw HttpError.notFound('Promo code not found')
        if (e.code === 'P2002') throw HttpError.conflict('Promo code already exists')
      }
      throw e
    }
  }

  async delete(id: number) {
    try {
      await this.prisma.promoCode.delete({ where: { id } })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw HttpError.notFound('Promo code not found')
      }
      throw e
    }
  }
}
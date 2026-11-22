import { Prisma, type PrismaClient, type Product } from '@prisma/client'

export interface ListOptions {
  page: number
  limit: number
  search?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  sortBy: 'price' | 'title'
  order: 'asc' | 'desc'
}

export class ProductsService {
  constructor(private prisma: PrismaClient) {}

  async list(opts: ListOptions) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(opts.search && {
        OR: [
          { title: { contains: opts.search, mode: 'insensitive' } },
          { description: { contains: opts.search, mode: 'insensitive' } },
        ],
      }),
      ...((opts.minPrice !== undefined || opts.maxPrice !== undefined) && {
        price: {
          ...(opts.minPrice !== undefined && { gte: opts.minPrice }),
          ...(opts.maxPrice !== undefined && { lte: opts.maxPrice }),
        },
      }),
      ...(opts.minRating !== undefined && { rating: { gte: opts.minRating } }),
    }

    const skip = (opts.page - 1) * opts.limit
    const take = opts.limit

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { [opts.sortBy]: opts.order },
        skip,
        take,
      }),
      this.prisma.product.count({ where }),
    ])

    return {
      items,
      total,
      page: opts.page,
      limit: opts.limit,
      totalPages: Math.max(1, Math.ceil(total / opts.limit)),
    }
  }

  async findById(id: number) {
    return this.prisma.product.findFirst({ where: { id, deletedAt: null } })
  }

  async create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data })
  }

  async update(id: number, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({ where: { id }, data })
  }

  async softDelete(id: number) {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }
}

// Decimal → number, чтобы JSON.stringify не сериализовал как строку
// `createdAt.toISOString()` — стабильно между SQLite/Postgres/Prisma
export function toProductDTO(p: Product) {
  const created = p.createdAt.toISOString()
  const price = typeof p.price === 'number' ? p.price : Number(p.price.toString())
  return {
    id: p.id,
    title: p.title,
    name: p.title,
    description: p.description,
    fullDescription: p.fullDescription,
    price,
    rating: p.rating,
    images: p.images,
    thumbnail: p.thumbnail || p.images[0] || '',
    tags: p.tags,
    specs: p.specs,
    highlights: p.highlights,
    stockQuantity: p.stockQuantity,
    stock_quantity: p.stockQuantity,
    createdAt: created,
    created_at: created,
  }
}
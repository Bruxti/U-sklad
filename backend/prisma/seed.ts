import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const prisma = new PrismaClient()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface SeedProduct {
  id: number
  name: string
  thumbnail: string
  images: string[]
  price: number
  rating: number
  tags: string[]
  description: string
  fullDescription?: string
  specs?: string[]
  highlights?: string[]
}

async function main() {
  const seedPath = path.resolve(__dirname, 'data.json')
  const raw = await fs.readFile(seedPath, 'utf-8')
  const products = JSON.parse(raw) as SeedProduct[]

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        title: p.name,
        description: p.description,
        fullDescription: p.fullDescription ?? '',
        price: p.price,
        rating: p.rating,
        images: p.images ?? [],
        thumbnail: p.thumbnail ?? '',
        tags: p.tags ?? [],
        specs: p.specs ?? [],
        highlights: p.highlights ?? [],
        stockQuantity: 50,
      },
      create: {
        id: p.id,
        title: p.name,
        description: p.description,
        fullDescription: p.fullDescription ?? '',
        price: p.price,
        rating: p.rating,
        images: p.images ?? [],
        thumbnail: p.thumbnail ?? '',
        tags: p.tags ?? [],
        specs: p.specs ?? [],
        highlights: p.highlights ?? [],
        stockQuantity: 50,
      },
    })
  }

  // выравниваем sequence, иначе первый POST /api/products упадёт на PK
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Product"', 'id'), COALESCE(MAX(id), 1)) FROM "Product"`,
  )

  // админ (dev): admin@example.com / admin12345
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: await argon2.hash('admin12345'),
      role: 'admin',
    },
  })

  // промокод из ТЗ
  await prisma.promoCode.upsert({
    where: { code: 'SAVE10' },
    update: { discountPercentage: 10, isActive: true },
    create: { code: 'SAVE10', discountPercentage: 10, isActive: true },
  })

  console.log(`Seeded ${products.length} products, 1 admin, 1 promo code.`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
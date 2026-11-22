import argon2 from 'argon2'
import type { PrismaClient, User } from '@prisma/client'
import { HttpError } from '../../lib/errors.js'

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(email: string, password: string): Promise<User> {
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) throw HttpError.conflict('Email already registered')

    const passwordHash = await argon2.hash(password)
    return this.prisma.user.create({
      data: { email, passwordHash, role: 'customer' },
    })
  }

  async login(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    // одинаковый ответ при «нет email» и «неверный пароль» — не палим,
    // какие аккаунты существуют
    if (!user) throw HttpError.unauthorized('Invalid credentials')

    const ok = await argon2.verify(user.passwordHash, password)
    if (!ok) throw HttpError.unauthorized('Invalid credentials')

    return user
  }

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  }
}
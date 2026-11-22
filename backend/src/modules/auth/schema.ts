import { z } from 'zod'

export const registerBody = z.object({
  email: z.email().toLowerCase(), 
  password: z.string().min(8).max(128),
})

export const loginBody = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1),
})

export const publicUser = z.object({
  id: z.number(),
  email: z.string(),
  role: z.enum(['customer', 'admin']),
  createdAt: z.string(),
})

export const authResponse = z.object({
  accessToken: z.string(),
  user: publicUser,
})
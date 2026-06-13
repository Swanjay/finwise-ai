import { z } from 'zod'

export const transactionSchema = z.object({
  id: z.string().min(1).max(50),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive().max(999999999),
  category: z.string().min(1).max(50),
  note: z.string().max(500).default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  wallet: z.string().max(50).default('cash'),
})

export const telegramLoginRequestSchema = z.object({
  action: z.literal('request'),
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_]+$/),
})

export const telegramVerifyRequestSchema = z.object({
  action: z.literal('verify'),
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_]+$/),
  code: z.string().length(6).regex(/^\d{6}$/),
})

export const telegramLoginSchema = z.discriminatedUnion('action', [
  telegramLoginRequestSchema,
  telegramVerifyRequestSchema,
])

export const scanReceiptSchema = z.object({
  image: z.string().min(1).max(50_000_000), // base64 image (up to ~37MB decoded)
})

export const advisorSchema = z.object({
  finance: z.string().max(5000).optional(),
  question: z.string().min(1).max(2000),
})

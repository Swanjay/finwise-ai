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
  image: z.string().min(1).max(10_000_000), // base64 image (~7.5MB decoded); frontend compresses before upload
})

export const advisorSchema = z.object({
  finance: z.string().max(5000).optional(),
  question: z.string().max(2000).optional(),
})

// Schema for transaction upsert row (used in /api/data bulk sync)
const transactionUpsertSchema = z.object({
  id: z.string().min(1).max(50),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive().max(999999999),
  category: z.string().min(1).max(50),
  note: z.string().max(500).optional().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  wallet: z.string().max(50).optional().default('cash'),
})

const walletUpsertSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(50),
  balance: z.number().min(0).max(999999999).optional().default(0),
  color: z.string().max(20).optional().default('#00ff9d'),
  icon: z.string().max(10).optional().default('💵'),
})

const goalUpsertSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  target: z.number().positive().max(999999999),
  saved: z.number().min(0).optional().default(0),
  color: z.string().max(20).optional().default('#a78bfa'),
  emoji: z.string().max(10).optional().default('🎯'),
  deadline: z.string().nullable().optional(),
})

const recurringUpsertSchema = z.object({
  id: z.string().min(1).max(50),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive().max(999999999),
  category: z.string().min(1).max(50),
  note: z.string().max(500).optional().default(''),
  frequency: z.string().min(1).max(30).optional().default('monthly'),
  wallet: z.string().max(50).optional().default('cash'),
})

export const dataSyncSchema = z.object({
  transactions: z.array(transactionUpsertSchema).optional().default([]),
  wallets: z.array(walletUpsertSchema).optional().default([]),
  goals: z.array(goalUpsertSchema).optional().default([]),
  budgets: z.record(z.string(), z.number().positive().max(999999999)).optional().default({}),
  recurring: z.array(recurringUpsertSchema).optional().default([]),
  settings: z.record(z.string(), z.string()).optional().default({}),
})

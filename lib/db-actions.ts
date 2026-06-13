'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { transactionSchema } from './validate'

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) return null
  const { createClient } = require('@supabase/supabase-js')
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Get Supabase user ID from NextAuth session
async function getSupabaseUserId(): Promise<string | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null

  const { data: { users } } = await supabase.auth.admin.listUsers()
  const user = users.find((u: { email?: string }) => u.email === session.user?.email)

  if (user) return user.id

  // If not found, create user
  const email = session.user.email
  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      name: session.user.name,
      provider: 'google',
    }
  })

  if (error || !newUser.user) return null
  return newUser.user.id
}

// ===== TRANSACTIONS =====
export async function getTransactions() {
  const userId = await getSupabaseUserId()
  const supabase = getSupabase()
  if (!userId || !supabase) return []

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error) return []

  return data.map((t: Record<string, unknown>) => ({
    id: t.id,
    type: t.type as 'income' | 'expense',
    amount: t.amount,
    category: t.category,
    note: t.note || '',
    date: t.date,
    wallet: t.wallet || 'cash',
  }))
}

export async function addTransaction(tx: {
  id: string
  type: string
  amount: number
  category: string
  note: string
  date: string
  wallet?: string
}) {
  // Validate input
  const parsed = transactionSchema.safeParse(tx)
  if (!parsed.success) return false

  const userId = await getSupabaseUserId()
  const supabase = getSupabase()
  if (!userId || !supabase) return false

  const { error } = await supabase
    .from('transactions')
    .insert({
      id: tx.id,
      user_id: userId,
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      note: tx.note,
      date: tx.date,
      wallet: tx.wallet || 'cash',
    })

  return !error
}

export async function deleteTransaction(id: string) {
  const userId = await getSupabaseUserId()
  const supabase = getSupabase()
  if (!userId || !supabase) return false

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  return !error
}

// ===== BUDGETS =====
export async function getBudgets() {
  const userId = await getSupabaseUserId()
  const supabase = getSupabase()
  if (!userId || !supabase) return []

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)

  if (error) return []

  return data.map((b: Record<string, unknown>) => ({
    category: b.category,
    limit: b.limit_amount,
    color: b.color,
  }))
}

export async function setBudgets(budgets: Array<{ category: string; limit: number; color?: string }>) {
  const userId = await getSupabaseUserId()
  const supabase = getSupabase()
  if (!userId || !supabase) return false

  await supabase.from('budgets').delete().eq('user_id', userId)

  const { error } = await supabase
    .from('budgets')
    .insert(budgets.map(b => ({
      user_id: userId,
      category: b.category,
      limit_amount: b.limit,
      color: b.color || '#a78bfa',
    })))

  return !error
}

// ===== GOALS =====
export async function getGoals() {
  const userId = await getSupabaseUserId()
  const supabase = getSupabase()
  if (!userId || !supabase) return []

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)

  if (error) return []

  return data.map((g: Record<string, unknown>) => ({
    id: g.id,
    name: g.name,
    target: g.target,
    saved: g.saved,
    color: g.color,
    emoji: g.emoji,
    deadline: g.deadline,
  }))
}

export async function setGoals(goals: Array<{
  id: string
  name: string
  target: number
  saved: number
  color?: string
  emoji?: string
  deadline?: string
}>) {
  const userId = await getSupabaseUserId()
  const supabase = getSupabase()
  if (!userId || !supabase) return false

  await supabase.from('goals').delete().eq('user_id', userId)

  const { error } = await supabase
    .from('goals')
    .insert(goals.map(g => ({
      id: g.id,
      user_id: userId,
      name: g.name,
      target: g.target,
      saved: g.saved,
      color: g.color || '#a78bfa',
      emoji: g.emoji || '🎯',
      deadline: g.deadline,
    })))

  return !error
}

// ===== WALLETS =====
export async function getWallets() {
  const userId = await getSupabaseUserId()
  const supabase = getSupabase()
  if (!userId || !supabase) return []

  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)

  if (error) return []

  return data.map((w: Record<string, unknown>) => ({
    id: w.id,
    name: w.name,
    balance: w.balance,
    color: w.color,
    icon: w.icon,
  }))
}

export async function setWallets(wallets: Array<{
  id: string
  name: string
  balance: number
  color?: string
  icon?: string
}>) {
  const userId = await getSupabaseUserId()
  const supabase = getSupabase()
  if (!userId || !supabase) return false

  await supabase.from('wallets').delete().eq('user_id', userId)

  const { error } = await supabase
    .from('wallets')
    .insert(wallets.map(w => ({
      id: w.id,
      user_id: userId,
      name: w.name,
      balance: w.balance,
      color: w.color || '#00ff9d',
      icon: w.icon || '💵',
    })))

  return !error
}

// ===== SETTINGS =====
export async function getMonthlyIncome() {
  const userId = await getSupabaseUserId()
  const supabase = getSupabase()
  if (!userId || !supabase) return 0

  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('user_id', userId)
    .eq('key', 'monthly_income')
    .single()

  if (error || !data) return 0
  return Number(data.value) || 0
}

export async function setMonthlyIncome(amount: number) {
  const userId = await getSupabaseUserId()
  const supabase = getSupabase()
  if (!userId || !supabase) return false

  const { error } = await supabase
    .from('settings')
    .upsert({
      user_id: userId,
      key: 'monthly_income',
      value: amount.toString(),
    })

  return !error
}

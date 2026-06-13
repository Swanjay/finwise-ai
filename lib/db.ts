import { supabase } from './supabase'
import type { Transaction, Budget, Goal, Wallet, RecurringItem } from '@/components/finwise-store'

// Get current user ID from session
async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id || null
}

// ===== TRANSACTIONS =====
export async function getTransactions(): Promise<Transaction[]> {
  const userId = await getUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching transactions:', error)
    return []
  }

  return data.map(t => ({
    id: t.id,
    type: t.type as 'income' | 'expense',
    amount: t.amount,
    category: t.category,
    note: t.note || '',
    date: t.date,
    wallet: t.wallet || 'cash',
  }))
}

export async function addTransaction(tx: Transaction): Promise<boolean> {
  const userId = await getUserId()
  if (!userId) return false

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
      wallet: tx.wallet,
    })

  return !error
}

export async function updateTransaction(tx: Transaction): Promise<boolean> {
  const userId = await getUserId()
  if (!userId) return false

  const { error } = await supabase
    .from('transactions')
    .update({
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      note: tx.note,
      date: tx.date,
      wallet: tx.wallet,
    })
    .eq('id', tx.id)
    .eq('user_id', userId)

  return !error
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const userId = await getUserId()
  if (!userId) return false

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  return !error
}

// ===== BUDGETS =====
export async function getBudgets(): Promise<Budget[]> {
  const userId = await getUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching budgets:', error)
    return []
  }

  return data.map(b => ({
    category: b.category,
    limit: b.limit_amount,
    color: b.color,
  }))
}

export async function setBudgets(budgets: Budget[]): Promise<boolean> {
  const userId = await getUserId()
  if (!userId) return false

  // Delete existing budgets
  await supabase
    .from('budgets')
    .delete()
    .eq('user_id', userId)

  // Insert new budgets
  const { error } = await supabase
    .from('budgets')
    .insert(budgets.map(b => ({
      user_id: userId,
      category: b.category,
      limit_amount: b.limit,
      color: b.color,
    })))

  return !error
}

// ===== GOALS =====
export async function getGoals(): Promise<Goal[]> {
  const userId = await getUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching goals:', error)
    return []
  }

  return data.map(g => ({
    id: g.id,
    name: g.name,
    target: g.target,
    saved: g.saved,
    color: g.color,
    emoji: g.emoji,
    deadline: g.deadline,
  }))
}

export async function setGoals(goals: Goal[]): Promise<boolean> {
  const userId = await getUserId()
  if (!userId) return false

  // Delete existing goals
  await supabase
    .from('goals')
    .delete()
    .eq('user_id', userId)

  // Insert new goals
  const { error } = await supabase
    .from('goals')
    .insert(goals.map(g => ({
      id: g.id,
      user_id: userId,
      name: g.name,
      target: g.target,
      saved: g.saved,
      color: g.color,
      emoji: g.emoji,
      deadline: g.deadline,
    })))

  return !error
}

// ===== WALLETS =====
export async function getWallets(): Promise<Wallet[]> {
  const userId = await getUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching wallets:', error)
    return []
  }

  return data.map(w => ({
    id: w.id,
    name: w.name,
    balance: w.balance,
    color: w.color,
    icon: w.icon,
  }))
}

export async function setWallets(wallets: Wallet[]): Promise<boolean> {
  const userId = await getUserId()
  if (!userId) return false

  // Delete existing wallets
  await supabase
    .from('wallets')
    .delete()
    .eq('user_id', userId)

  // Insert new wallets
  const { error } = await supabase
    .from('wallets')
    .insert(wallets.map(w => ({
      id: w.id,
      user_id: userId,
      name: w.name,
      balance: w.balance,
      color: w.color,
      icon: w.icon,
    })))

  return !error
}

// ===== RECURRING =====
export async function getRecurring(): Promise<RecurringItem[]> {
  const userId = await getUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from('recurring')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching recurring:', error)
    return []
  }

  return data.map(r => ({
    id: r.id,
    type: r.type as 'income' | 'expense',
    amount: r.amount,
    category: r.category,
    note: r.note || '',
    frequency: r.frequency as 'daily' | 'weekly' | 'monthly' | 'yearly',
    wallet: r.wallet || 'cash',
  }))
}

export async function setRecurring(items: RecurringItem[]): Promise<boolean> {
  const userId = await getUserId()
  if (!userId) return false

  // Delete existing recurring items
  await supabase
    .from('recurring')
    .delete()
    .eq('user_id', userId)

  // Insert new recurring items
  const { error } = await supabase
    .from('recurring')
    .insert(items.map(r => ({
      id: r.id,
      user_id: userId,
      type: r.type,
      amount: r.amount,
      category: r.category,
      note: r.note,
      frequency: r.frequency,
      wallet: r.wallet,
    })))

  return !error
}

// ===== MONTHLY INCOME =====
export async function getMonthlyIncome(): Promise<number> {
  const userId = await getUserId()
  if (!userId) return 0

  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('user_id', userId)
    .eq('key', 'monthly_income')
    .single()

  if (error || !data) return 0
  return Number(data.value) || 0
}

export async function setMonthlyIncome(amount: number): Promise<boolean> {
  const userId = await getUserId()
  if (!userId) return false

  const { error } = await supabase
    .from('settings')
    .upsert({
      user_id: userId,
      key: 'monthly_income',
      value: amount.toString(),
    })

  return !error
}

// ===== SYNC ALL DATA =====
export async function syncAllData(): Promise<{
  transactions: Transaction[]
  budgets: Budget[]
  goals: Goal[]
  wallets: Wallet[]
  recurring: RecurringItem[]
  monthlyIncome: number
} | null> {
  const userId = await getUserId()
  if (!userId) return null

  const [transactions, budgets, goals, wallets, recurring, monthlyIncome] = await Promise.all([
    getTransactions(),
    getBudgets(),
    getGoals(),
    getWallets(),
    getRecurring(),
    getMonthlyIncome(),
  ])

  return {
    transactions,
    budgets,
    goals,
    wallets,
    recurring,
    monthlyIncome,
  }
}

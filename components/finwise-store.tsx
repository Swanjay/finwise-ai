'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import {
  BUILTIN_CATEGORIES,
  DEFAULT_WALLETS,
  autoCategory,
  generateId,
  type Transaction,
  type Category,
  type Wallet,
  type Goal,
  type RecurringItem,
} from '@/lib/finwise'

// Storage keys
const KEYS = {
  tx: 'fw.tx.v2',
  budgets: 'fw.budgets.v1',
  income: 'fw.income.v1',
  setup: 'fw.setup.v1',
  categories: 'fw.cats.v1',
  wallets: 'fw.wallets.v1',
  goals: 'fw.goals.v1',
  recurring: 'fw.recurring.v1',
  pin: 'fw.pin.v1',
  theme: 'fw.theme.v1',
  tipsDismissed: 'fw.tips.v1',
  initialBalance: 'fw.initBal.v1',
  hideBalance: 'fw.hideBal.v1',
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function saveJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

interface FinwiseStore {
  // Transactions
  transactions: Transaction[]
  addTransaction: (tx: Omit<Transaction, 'id'>) => void
  deleteTransaction: (id: string) => void

  // Categories (built-in + custom)
  allCategories: Record<string, Category>
  addCustomCategory: (cat: Category) => void
  deleteCustomCategory: (id: string) => void

  // Budgets
  budgets: Partial<Record<string, number>>
  setBudget: (id: string, amount: number) => void

  // Income
  monthlyIncome: number
  updateMonthlyIncome: (amount: number) => void

  // Wallets
  wallets: Wallet[]
  addWallet: (w: Wallet) => void
  updateWallet: (id: string, data: Partial<Wallet>) => void
  deleteWallet: (id: string) => void

  // Goals
  goals: Goal[]
  addGoal: (g: Goal) => void
  updateGoal: (id: string, data: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  addToGoal: (id: string, amount: number) => void

  // Recurring
  recurring: RecurringItem[]
  addRecurring: (r: RecurringItem) => void
  toggleRecurring: (id: string) => void
  deleteRecurring: (id: string) => void

  // PIN
  pin: string | null
  setPin: (pin: string | null) => void
  isLocked: boolean
  unlock: () => void

  // Theme
  theme: 'dark' | 'light'
  toggleTheme: () => void

  // Setup
  setupDone: boolean
  completeSetup: (income: number, budgets: Partial<Record<string, number>>) => void

  // Initial Balance
  initialBalance: number
  updateInitialBalance: (amount: number) => void

  // Hide Balance
  hideBalance: boolean
  toggleHideBalance: () => void

  // Tips
  tipsDismissed: boolean
  dismissTips: () => void

  // Reset
  resetAll: () => void

  // State
  loaded: boolean
}

const Ctx = createContext<FinwiseStore | null>(null)

export function FinwiseProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [customCategories, setCustomCategories] = useState<Record<string, Category>>({})
  const [budgets, setBudgets] = useState<Partial<Record<string, number>>>({})
  const [monthlyIncome, setMonthlyIncomeState] = useState(0)
  const [wallets, setWallets] = useState<Wallet[]>(DEFAULT_WALLETS)
  const [goals, setGoals] = useState<Goal[]>([])
  const [recurring, setRecurring] = useState<RecurringItem[]>([])
  const [pin, setPinState] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(true)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [setupDone, setSetupDone] = useState(false)
  const [tipsDismissed, setTipsDismissed] = useState(false)
  const [initialBalance, setInitialBalance] = useState(0)
  const [hideBalance, setHideBalance] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Load all data
  useEffect(() => {
    setTransactions(loadJSON(KEYS.tx, []))
    setCustomCategories(loadJSON(KEYS.categories, {}))
    setBudgets(loadJSON(KEYS.budgets, {}))
    setMonthlyIncomeState(loadJSON(KEYS.income, 0))
    setWallets(loadJSON(KEYS.wallets, DEFAULT_WALLETS))
    setGoals(loadJSON(KEYS.goals, []))
    setRecurring(loadJSON(KEYS.recurring, []))
    setPinState(loadJSON(KEYS.pin, null))
    setTheme(loadJSON(KEYS.theme, 'dark'))
    setSetupDone(loadJSON(KEYS.setup, false))
    setTipsDismissed(loadJSON(KEYS.tipsDismissed, false))
    setInitialBalance(loadJSON(KEYS.initialBalance, 0))
    setHideBalance(loadJSON(KEYS.hideBalance, false))
    setIsLocked(loadJSON(KEYS.pin, null) ? true : false)
    setLoaded(true)
  }, [])

  // Persist helpers
  useEffect(() => { if (loaded) saveJSON(KEYS.tx, transactions) }, [transactions, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.categories, customCategories) }, [customCategories, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.budgets, budgets) }, [budgets, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.income, monthlyIncome) }, [monthlyIncome, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.wallets, wallets) }, [wallets, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.goals, goals) }, [goals, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.recurring, recurring) }, [recurring, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.pin, pin) }, [pin, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.theme, theme) }, [theme, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.initialBalance, initialBalance) }, [initialBalance, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.hideBalance, hideBalance) }, [hideBalance, loaded])
  useEffect(() => { if (loaded) { document.documentElement.classList.toggle('dark', theme === 'dark'); document.documentElement.classList.toggle('light', theme === 'light') } }, [theme, loaded])

  // Initial Balance
  const updateInitialBalance = useCallback((amount: number) => {
    setInitialBalance(amount)
  }, [])

  // Hide Balance
  const toggleHideBalance = useCallback(() => {
    setHideBalance(prev => !prev)
  }, [])

  // Merge categories
  const allCategories: Record<string, Category> = { ...BUILTIN_CATEGORIES, ...customCategories }

  // Transactions
  const addTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    const finalTx = { ...tx, id: generateId(), category: tx.category || autoCategory(tx.description) }
    setTransactions((prev) => [finalTx, ...prev])
  }, [])

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Categories
  const addCustomCategory = useCallback((cat: Category) => {
    setCustomCategories((prev) => ({ ...prev, [cat.id]: { ...cat, isCustom: true } }))
  }, [])

  const deleteCustomCategory = useCallback((id: string) => {
    setCustomCategories((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  // Budgets
  const setBudget = useCallback((id: string, amount: number) => {
    setBudgets((prev) => ({ ...prev, [id]: amount }))
  }, [])

  // Income
  const updateMonthlyIncome = useCallback((amount: number) => {
    setMonthlyIncomeState(amount)
  }, [])

  // Wallets
  const addWallet = useCallback((w: Wallet) => {
    setWallets((prev) => [...prev, w])
  }, [])

  const updateWallet = useCallback((id: string, data: Partial<Wallet>) => {
    setWallets((prev) => prev.map((w) => w.id === id ? { ...w, ...data } : w))
  }, [])

  const deleteWallet = useCallback((id: string) => {
    setWallets((prev) => prev.filter((w) => w.id !== id))
  }, [])

  // Goals
  const addGoal = useCallback((g: Goal) => {
    setGoals((prev) => [...prev, g])
  }, [])

  const updateGoal = useCallback((id: string, data: Partial<Goal>) => {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, ...data } : g))
  }, [])

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }, [])

  const addToGoal = useCallback((id: string, amount: number) => {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g))
  }, [])

  // Recurring
  const addRecurring = useCallback((r: RecurringItem) => {
    setRecurring((prev) => [r, ...prev])
  }, [])

  const toggleRecurring = useCallback((id: string) => {
    setRecurring((prev) => prev.map((r) => r.id === id ? { ...r, active: !r.active } : r))
  }, [])

  const deleteRecurring = useCallback((id: string) => {
    setRecurring((prev) => prev.filter((r) => r.id !== id))
  }, [])

  // PIN
  const setPin = useCallback((newPin: string | null) => {
    setPinState(newPin)
    if (!newPin) setIsLocked(false)
  }, [])

  const unlock = useCallback(() => setIsLocked(false), [])

  // Theme
  const toggleTheme = useCallback(() => {
    setTheme((prev) => prev === 'dark' ? 'light' : 'dark')
  }, [])

  // Setup
  const completeSetup = useCallback((income: number, newBudgets: Partial<Record<string, number>>) => {
    setMonthlyIncomeState(income)
    setBudgets(newBudgets)
    setSetupDone(true)
    saveJSON(KEYS.setup, true)
  }, [])

  // Tips
  const dismissTips = useCallback(() => {
    setTipsDismissed(true)
    saveJSON(KEYS.tipsDismissed, true)
  }, [])

  // Reset all data
  const resetAll = useCallback(() => {
    // Clear all localStorage keys
    Object.values(KEYS).forEach(key => {
      try { localStorage.removeItem(key) } catch { /* ignore */ }
    })
    // Clear guest cookie
    document.cookie = "fw-guest=; path=/; max-age=0"

    // Reset state to defaults
    setTransactions([])
    setCustomCategories({})
    setBudgets({})
    setMonthlyIncomeState(0)
    setWallets(DEFAULT_WALLETS)
    setGoals([])
    setRecurring([])
    setPinState(null)
    setIsLocked(false)
    setTheme('dark')
    setSetupDone(false)
    setTipsDismissed(false)
  }, [])

  return (
    <Ctx.Provider
      value={{
        transactions, addTransaction, deleteTransaction,
        allCategories, addCustomCategory, deleteCustomCategory,
        budgets, setBudget,
        monthlyIncome, updateMonthlyIncome,
        wallets, addWallet, updateWallet, deleteWallet,
        goals, addGoal, updateGoal, deleteGoal, addToGoal,
        recurring, addRecurring, toggleRecurring, deleteRecurring,
        pin, setPin, isLocked, unlock,
        theme, toggleTheme,
        setupDone, completeSetup,
        tipsDismissed, dismissTips,
        initialBalance, updateInitialBalance,
        hideBalance, toggleHideBalance,
        resetAll,
        loaded,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useFinwise() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useFinwise must be used within FinwiseProvider')
  return ctx
}

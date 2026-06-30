'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { useSession } from 'next-auth/react'
import {
  BUILTIN_CATEGORIES,
  DEFAULT_WALLETS,
  autoCategory,
  autoCategoryWithWallet,
  generateId,
  type Transaction,
  type Category,
  type Wallet,
  type Goal,
  type RecurringItem,
} from '@/lib/finwise'
import { logTransactionAudit, logBudgetAudit } from '@/lib/audit'

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
  accent: 'fw.accent.v1',
  tipsDismissed: 'fw.tips.v1',
  initialBalance: 'fw.initBal.v1',
  hideBalance: 'fw.hideBal.v1',
  tags: 'fw.tags.v1',
  fontSize: 'fw.fontSize.v1',
  compactMode: 'fw.compact.v1',
  setupDone: 'fw.setupDone.v1',
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

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = encoder.encode("finwise-pin-v1-" + pin.length)
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"])
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256
  )
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

interface FinwiseStore {
  // Transactions
  transactions: Transaction[]
  addTransaction: (tx: Omit<Transaction, 'id'>) => void
  deleteTransaction: (id: string) => void
  updateTransaction: (id: string, data: Partial<Omit<Transaction, 'id'>>) => void

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
  getWalletBalance: (walletId: string) => number
  getTotalBalance: () => number

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
  updateRecurring: (id: string, data: Partial<RecurringItem>) => void

  // PIN
  pin: string | null
  setPin: (pin: string | null) => Promise<void>
  isLocked: boolean
  unlock: () => void

  // Theme
  theme: 'dark' | 'light'
  toggleTheme: () => void
  accentColor: string
  setAccentColor: (color: string) => void
  fontSize: 'sm' | 'base' | 'lg'
  setFontSize: (size: 'sm' | 'base' | 'lg') => void
  compactMode: boolean
  toggleCompactMode: () => void

  // Setup
  setupDone: boolean

  // Initial Balance
  initialBalance: number
  updateInitialBalance: (amount: number) => void

  // Hide Balance
  hideBalance: boolean
  toggleHideBalance: () => void

  // Tips
  tipsDismissed: boolean
  dismissTips: () => void

  // Tags
  tags: string[]
  addTag: (tag: string) => void
  deleteTag: (tag: string) => void

  // Reset
  resetAll: () => void
  loaded: boolean
  setSetupDone: (v: boolean) => void
  syncNow: (reason?: string) => Promise<void>
}

const Ctx = createContext<FinwiseStore | null>(null)

export function FinwiseProvider({ children }: { children: ReactNode }) {
  const { data: session, status: authStatus } = useSession()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [customCategories, setCustomCategories] = useState<Record<string, Category>>({})
  const [budgets, setBudgets] = useState<Partial<Record<string, number>>>({})
  const [monthlyIncome, setMonthlyIncomeState] = useState(0)
  const [wallets, setWallets] = useState<Wallet[]>(DEFAULT_WALLETS)
  const [goals, setGoals] = useState<Goal[]>([])
  const [recurring, setRecurring] = useState<RecurringItem[]>([])
  const [pin, setPinState] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(true)
  const [theme, setTheme] = useState<'dark' | 'light'>('light')
  const [accentColor, setAccentColorState] = useState('purple')
  const [fontSize, setFontSizeState] = useState<'sm' | 'base' | 'lg'>('base')
  const [compactMode, setCompactModeState] = useState(false)
  const [setupDone, setSetupDone] = useState(true)
  const [tipsDismissed, setTipsDismissed] = useState(false)
  const [initialBalance, setInitialBalance] = useState(0)
  const [hideBalance, setHideBalance] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const cloudSyncedRef = useRef(false)
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null)
  const changeCountRef = useRef(0)

  // Refs to track latest state (avoid stale closures in setTimeout)
  const dataRef = useRef({ transactions, wallets, goals, budgets, recurring, customCategories, monthlyIncome, initialBalance, theme, accentColor, fontSize, compactMode, setupDone, hideBalance })
  useEffect(() => {
    dataRef.current = { transactions, wallets, goals, budgets, recurring, customCategories, monthlyIncome, initialBalance, theme, accentColor, fontSize, compactMode, setupDone, hideBalance }
  })

  // ─── LOAD: localStorage first, then Supabase if logged in ───
  useEffect(() => {
    // Always load from localStorage first (instant)
    setTransactions(loadJSON(KEYS.tx, []))
    setCustomCategories(loadJSON(KEYS.categories, {}))
    setBudgets(loadJSON(KEYS.budgets, {}))
    setMonthlyIncomeState(loadJSON(KEYS.income, 0))
    setWallets(loadJSON(KEYS.wallets, DEFAULT_WALLETS))
    setGoals(loadJSON(KEYS.goals, []))
    setRecurring(loadJSON(KEYS.recurring, []))
    setPinState(loadJSON(KEYS.pin, null))
    setTheme(loadJSON(KEYS.theme, 'light'))
    setAccentColorState(loadJSON(KEYS.accent, 'purple'))
    setFontSizeState(loadJSON(KEYS.fontSize, 'base'))
    setCompactModeState(loadJSON(KEYS.compactMode, false))
    setSetupDone(localStorage.getItem('fw.setupDone.v1') === 'true')
    setTipsDismissed(loadJSON(KEYS.tipsDismissed, false))
    setInitialBalance(loadJSON(KEYS.initialBalance, 0))
    setHideBalance(loadJSON(KEYS.hideBalance, false))
    setTags(loadJSON(KEYS.tags, []))
    setIsLocked(loadJSON(KEYS.pin, null) ? true : false)
    setLoaded(true)
  }, [])

  // ─── SYNC TO CLOUD: reads from refs (always latest data) ───
  async function syncToCloudNow(reason = 'auto') {
    const { transactions, wallets, goals, budgets, recurring, customCategories, monthlyIncome, initialBalance, theme, accentColor, fontSize, compactMode, setupDone, hideBalance } = dataRef.current
    if (authStatus !== 'authenticated' || !session?.user?.email) return
    try {
      const payload = {
        transactions,
        wallets,
        goals,
        budgets,
        recurring,
        categories: Object.values(customCategories).filter((c: any) => c.isCustom),
        settings: {
          income: String(monthlyIncome),
          initialBalance: String(initialBalance),
          theme,
          accentColor,
          fontSize,
          compactMode: String(compactMode),
          setupDone: String(setupDone),
          hideBalance: String(hideBalance),
        },
      }
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.ok) { /* synced */ }
      else console.warn('[store] Sync failed:', data)
    } catch (err) {
      console.warn('[store] Cloud sync failed:', err)
    }
  }

  // ─── FETCH FROM SUPABASE when logged in ───
  useEffect(() => {
    if (authStatus !== 'authenticated' || !session?.user?.email || cloudSyncedRef.current) return

    async function fetchCloud() {
      try {
        const res = await fetch('/api/data')
        if (!res.ok) { cloudSyncedRef.current = true; return }
        const data = await res.json()
        if (!data.ok) { cloudSyncedRef.current = true; return }

        const cloudTx = (data.transactions || []).map((t: any) => ({
          id: t.id, type: t.type, amount: Number(t.amount), category: t.category,
          description: t.note || '', date: t.date, walletId: t.wallet || 'cash',
        }))
        const cloudWallets = (data.wallets || []).map((w: any) => ({
          id: w.id, name: w.name, initialBalance: Number(w.balance || 0),
          color: w.color || '#00ff9d', icon: w.icon || '💵', balance: Number(w.balance || 0),
        }))
        const cloudGoals = (data.goals || []).map((g: any) => ({
          id: g.id, name: g.name, targetAmount: Number(g.target || 0),
          currentAmount: Number(g.saved || 0), color: g.color || '#a78bfa',
          emoji: g.emoji || '🎯', deadline: g.deadline || undefined,
        }))
        const cloudRecurring = (data.recurring || []).map((r: any) => ({
          id: r.id, type: r.type, amount: Number(r.amount), category: r.category,
          description: r.note || '', frequency: r.frequency || 'monthly',
          walletId: r.wallet || 'cash', active: true,
        }))

        // Load local data for comparison
        const localTx = loadJSON(KEYS.tx, [])
        const localWallets = loadJSON(KEYS.wallets, DEFAULT_WALLETS)
        const localGoals = loadJSON(KEYS.goals, [])
        const localRecurring = loadJSON(KEYS.recurring, [])
        const localBudgets = loadJSON(KEYS.budgets, {})
        const localIncome = loadJSON(KEYS.income, 0)
        const localInitBal = loadJSON(KEYS.initialBalance, 0)

        // MERGE STRATEGY: ID-based merge (not count-based!)
        // Cloud is source of truth, but add any local-only items
        function mergeById<T extends { id: string }>(cloud: T[], local: T[]): T[] {
          if (cloud.length === 0 && local.length === 0) return []
          if (cloud.length === 0) return local
          if (local.length === 0) return cloud
          const cloudIds = new Set(cloud.map(c => c.id))
          const localOnly = local.filter(l => !cloudIds.has(l.id))
          return [...cloud, ...localOnly]
        }

        const useTx = mergeById(cloudTx, localTx)
        const useGoals = mergeById(cloudGoals, localGoals)
        const useRecurring = mergeById(cloudRecurring, localRecurring)
        const useWallets = mergeById(cloudWallets, localWallets)
        // Budgets: merge objects (local keys not in cloud)
        const useBudgets = { ...(data.budgets || {}), ...localBudgets }

        // Detect if merge added items (local had data cloud didn't)
        const mergedExtra = (useTx.length > cloudTx.length) || (useGoals.length > cloudGoals.length) || (useRecurring.length > cloudRecurring.length) || (useWallets.length > cloudWallets.length)

        if (useTx.length) setTransactions(useTx)
        if (useWallets.length) setWallets(useWallets)
        if (useGoals.length) setGoals(useGoals)
        if (Object.keys(useBudgets).length) setBudgets(useBudgets)
        if (useRecurring.length) setRecurring(useRecurring)
        // Settings: prefer cloud if it has values, else use local
        if (data.settings?.income && Number(data.settings.income) > 0) setMonthlyIncomeState(Number(data.settings.income))
        else if (localIncome > 0) setMonthlyIncomeState(localIncome)
        if (data.settings?.initialBalance && Number(data.settings.initialBalance) > 0) setInitialBalance(Number(data.settings.initialBalance))
        else if (localInitBal > 0) setInitialBalance(localInitBal)
        if (data.settings?.theme) setTheme(data.settings.theme as 'dark' | 'light')
        // Only upgrade setupDone from cloud (never downgrade to false)
        if (data.settings?.setupDone === 'true') setSetupDone(true)

        cloudSyncedRef.current = true
        // Cloud data loaded & merged

        // If merge added local-only items, sync back to cloud
        if (mergedExtra) {
          // Local had extra data — syncing back to cloud
          setTimeout(() => syncToCloudNow('merge-back'), 500)
        }
      } catch (err) {
        console.warn('[store] Failed to load cloud data:', err)
        cloudSyncedRef.current = true
      }
    }

    fetchCloud()
  }, [authStatus, session])

  // ─── SAVE: localStorage always ───
  useEffect(() => { if (loaded) saveJSON(KEYS.tx, transactions) }, [transactions, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.categories, customCategories) }, [customCategories, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.budgets, budgets) }, [budgets, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.income, monthlyIncome) }, [monthlyIncome, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.wallets, wallets) }, [wallets, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.goals, goals) }, [goals, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.recurring, recurring) }, [recurring, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.pin, pin) }, [pin, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.theme, theme) }, [theme, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.accent, accentColor) }, [accentColor, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.initialBalance, initialBalance) }, [initialBalance, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.hideBalance, hideBalance) }, [hideBalance, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.tags, tags) }, [tags, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.fontSize, fontSize) }, [fontSize, loaded])
  useEffect(() => { if (loaded) saveJSON(KEYS.compactMode, compactMode) }, [compactMode, loaded])
  useEffect(() => { if (loaded) { document.documentElement.classList.toggle('dark', theme === 'dark'); document.documentElement.classList.toggle('light', theme === 'light') } }, [theme, loaded])

  // ─── DEBOUNCE SYNC TO SUPABASE (uses refs for latest data) ───
  const scheduleSync = useCallback(() => {
    if (authStatus !== 'authenticated' || !cloudSyncedRef.current) return

    changeCountRef.current++
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => syncToCloudNow('debounce'), 3000)
  }, [authStatus, session])

  // Trigger sync on data changes (after initial cloud load)
  useEffect(() => { if (loaded && cloudSyncedRef.current) scheduleSync() }, [transactions, wallets, goals, budgets, recurring, monthlyIncome, initialBalance, loaded, scheduleSync])

  // ─── SYNC ON PAGE CLOSE/UNLOAD ───
  useEffect(() => {
    if (authStatus !== 'authenticated') return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && cloudSyncedRef.current) {
        // Flush any pending debounce
        if (syncTimerRef.current) { clearTimeout(syncTimerRef.current); syncTimerRef.current = null }
        // Use sendBeacon for reliable delivery on page close
        const d = dataRef.current
        const payload = JSON.stringify({
          transactions: d.transactions, wallets: d.wallets, goals: d.goals,
          budgets: d.budgets, recurring: d.recurring,
          settings: {
            income: String(d.monthlyIncome), initialBalance: String(d.initialBalance),
            theme: d.theme, accentColor: d.accentColor, fontSize: d.fontSize,
            compactMode: String(d.compactMode), setupDone: String(d.setupDone),
            hideBalance: String(d.hideBalance),
          },
        })
        try {
          navigator.sendBeacon('/api/data', new Blob([payload], { type: 'application/json' }))
          // Sent beacon on page hide
        } catch { /* fallback: syncToCloudNow will catch it next time */ }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleVisibilityChange)
    }
  }, [authStatus, session])

  // Apply font size
  useEffect(() => {
    if (!loaded) return
    const root = document.documentElement
    const sizes: Record<string, string> = { sm: '14px', base: '16px', lg: '18px' }
    root.style.setProperty('--app-font-size', sizes[fontSize] || '16px')
    root.classList.toggle('compact', compactMode)
  }, [fontSize, compactMode, loaded])

  const setAccentColor = useCallback((color: string) => setAccentColorState(color), [])
  const setFontSize = useCallback((size: 'sm' | 'base' | 'lg') => setFontSizeState(size), [])
  const toggleCompactMode = useCallback(() => setCompactModeState(prev => !prev), [])
  const updateInitialBalance = useCallback((amount: number) => setInitialBalance(amount), [])
  const toggleHideBalance = useCallback(() => setHideBalance(prev => !prev), [])

  // Merge categories
  const allCategories: Record<string, Category> = { ...BUILTIN_CATEGORIES, ...customCategories }

  // Transactions
  const addTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    const finalTx = { ...tx, id: generateId(), category: tx.category || autoCategoryWithWallet(tx.description, tx.walletId) }
    setTransactions((prev) => [finalTx, ...prev])
    logTransactionAudit('guest', 'create', finalTx.id, undefined, finalTx as unknown as Record<string, unknown>)
  }, [])

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => {
      const tx = prev.find(t => t.id === id)
      if (tx) logTransactionAudit('guest', 'delete', id, tx as unknown as Record<string, unknown>, undefined)
      return prev.filter((t) => t.id !== id)
    })
  }, [])

  const updateTransaction = useCallback((id: string, data: Partial<Omit<Transaction, 'id'>>) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const updated = { ...t, ...data }
        logTransactionAudit('guest', 'update', id, t as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>)
        return updated
      })
    )
  }, [])

  // Categories
  const addCustomCategory = useCallback((cat: Category) => {
    setCustomCategories((prev) => ({ ...prev, [cat.id]: { ...cat, isCustom: true } }))
  }, [])

  const deleteCustomCategory = useCallback((id: string) => {
    setCustomCategories((prev) => { const next = { ...prev }; delete next[id]; return next })
  }, [])

  // Budgets
  const setBudget = useCallback((id: string, amount: number) => {
    setBudgets((prev) => {
      const oldAmount = prev[id] || 0
      logBudgetAudit('guest', oldAmount > 0 ? 'update' : 'create', id, { amount: oldAmount }, { amount })
      return { ...prev, [id]: amount }
    })
  }, [])

  // Income
  const updateMonthlyIncome = useCallback((amount: number) => setMonthlyIncomeState(amount), [])

  // Wallets
  const addWallet = useCallback((w: Wallet) => setWallets((prev) => [...prev, w]), [])
  const updateWallet = useCallback((id: string, data: Partial<Wallet>) => {
    setWallets((prev) => prev.map((w) => w.id === id ? { ...w, ...data } : w))
  }, [])
  const deleteWallet = useCallback((id: string) => setWallets((prev) => prev.filter((w) => w.id !== id)), [])

  // Computed wallet balance
  const getWalletBalance = useCallback((walletId: string): number => {
    const wallet = wallets.find(w => w.id === walletId)
    if (!wallet) return 0
    const txTotal = transactions.reduce((sum, tx) => {
      if (tx.walletId !== walletId) return sum
      return sum + (tx.type === 'income' ? tx.amount : -tx.amount)
    }, 0)
    return wallet.balance + txTotal
  }, [wallets, transactions])

  const getTotalBalance = useCallback((): number => {
    return wallets.reduce((sum, w) => sum + getWalletBalance(w.id), 0)
  }, [wallets, getWalletBalance])

  // Goals
  const addGoal = useCallback((g: Goal) => setGoals((prev) => [...prev, g]), [])
  const updateGoal = useCallback((id: string, data: Partial<Goal>) => {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, ...data } : g))
  }, [])
  const deleteGoal = useCallback((id: string) => setGoals((prev) => prev.filter((g) => g.id !== id)), [])
  const addToGoal = useCallback((id: string, amount: number) => {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g))
  }, [])

  // Recurring
  const addRecurring = useCallback((r: RecurringItem) => setRecurring((prev) => [r, ...prev]), [])
  const toggleRecurring = useCallback((id: string) => {
    setRecurring((prev) => prev.map((r) => r.id === id ? { ...r, active: !r.active } : r))
  }, [])
  const deleteRecurring = useCallback((id: string) => setRecurring((prev) => prev.filter((r) => r.id !== id)), [])
  const updateRecurring = useCallback((id: string, data: Partial<RecurringItem>) => {
    setRecurring((prev) => prev.map((r) => r.id === id ? { ...r, ...data } : r))
  }, [])

  // PIN
  const setPin = useCallback(async (newPin: string | null) => {
    if (newPin === null) { setPinState(null); setIsLocked(false); return }
    const hashed = await hashPin(newPin)
    setPinState(hashed)
    if (!newPin) setIsLocked(false)
  }, [])

  const unlock = useCallback(() => setIsLocked(false), [])

  // Theme
  const toggleTheme = useCallback(() => setTheme((prev) => prev === 'dark' ? 'light' : 'dark'), [])

  // Tips
  const dismissTips = useCallback(() => { setTipsDismissed(true); saveJSON(KEYS.tipsDismissed, true) }, [])

  // Tags
  const addTag = useCallback((tag: string) => {
    const clean = tag.trim().toLowerCase()
    if (!clean) return
    setTags((prev) => prev.includes(clean) ? prev : [...prev, clean])
  }, [])
  const deleteTag = useCallback((tag: string) => setTags((prev) => prev.filter((t) => t !== tag)), [])

  // Reset
  const resetAll = useCallback(() => {
    Object.values(KEYS).forEach(key => { try { localStorage.removeItem(key) } catch { /* ignore */ } })
    setTransactions([]); setCustomCategories({}); setBudgets({}); setMonthlyIncomeState(0)
    setWallets(DEFAULT_WALLETS); setGoals([]); setRecurring([]); setPinState(null)
    setIsLocked(false); setTheme('light'); setAccentColorState('purple'); setFontSizeState('base')
    setCompactModeState(false); setSetupDone(false); setTipsDismissed(false); setTags([])
  }, [])

  return (
    <Ctx.Provider
      value={{
        transactions, addTransaction, deleteTransaction, updateTransaction,
        allCategories, addCustomCategory, deleteCustomCategory,
        budgets, setBudget,
        monthlyIncome, updateMonthlyIncome,
        wallets, addWallet, updateWallet, deleteWallet, getWalletBalance, getTotalBalance,
        goals, addGoal, updateGoal, deleteGoal, addToGoal,
        recurring, addRecurring, toggleRecurring, deleteRecurring, updateRecurring,
        pin, setPin, isLocked, unlock,
        theme, toggleTheme, accentColor, setAccentColor,
        fontSize, setFontSize, compactMode, toggleCompactMode,
        setupDone,
        tipsDismissed, dismissTips,
        initialBalance, updateInitialBalance,
        hideBalance, toggleHideBalance,
        tags, addTag, deleteTag,
        resetAll,
        loaded,
        setSetupDone,
        syncNow: syncToCloudNow,
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

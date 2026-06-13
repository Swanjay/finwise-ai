import {
  Utensils,
  Bus,
  ShoppingBag,
  Gamepad2,
  ReceiptText,
  HeartPulse,
  GraduationCap,
  Wifi,
  Coffee,
  Home,
  Car,
  Gift,
  Briefcase,
  TrendingUp,
  CreditCard,
  Plane,
  Baby,
  Dumbbell,
  type LucideIcon,
} from 'lucide-react'

// ─── Types ───
export type TxType = 'expense' | 'income'

export type CategoryId = string

export interface Category {
  id: CategoryId
  label: string
  icon: LucideIcon
  color: string
  type: TxType
  isCustom?: boolean
}

export interface Transaction {
  id: string
  type: TxType
  category: CategoryId
  amount: number
  description: string
  date: string // ISO
  walletId?: string
  tags?: string[]
}

export interface Wallet {
  id: string
  name: string
  icon: string
  balance: number
  color: string
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string // ISO date
  icon: string
  color: string
}

export interface RecurringItem {
  id: string
  type: TxType
  category: CategoryId
  amount: number
  description: string
  frequency: 'harian' | 'mingguan' | 'bulanan'
  active: boolean
}

// ─── Built-in Categories ───
export const BUILTIN_CATEGORIES: Record<string, Category> = {
  food: { id: 'food', label: 'Makan & Minum', icon: Utensils, color: 'oklch(0.7 0.18 295)', type: 'expense' },
  transport: { id: 'transport', label: 'Transport', icon: Bus, color: 'oklch(0.78 0.14 200)', type: 'expense' },
  shopping: { id: 'shopping', label: 'Belanja', icon: ShoppingBag, color: 'oklch(0.75 0.16 160)', type: 'expense' },
  entertainment: { id: 'entertainment', label: 'Hiburan', icon: Gamepad2, color: 'oklch(0.8 0.15 75)', type: 'expense' },
  bills: { id: 'bills', label: 'Tagihan', icon: ReceiptText, color: 'oklch(0.68 0.2 18)', type: 'expense' },
  health: { id: 'health', label: 'Kesehatan', icon: HeartPulse, color: 'oklch(0.72 0.15 350)', type: 'expense' },
  education: { id: 'education', label: 'Pendidikan', icon: GraduationCap, color: 'oklch(0.74 0.13 240)', type: 'expense' },
  internet: { id: 'internet', label: 'Internet & Pulsa', icon: Wifi, color: 'oklch(0.78 0.13 180)', type: 'expense' },
  income: { id: 'income', label: 'Pemasukan', icon: Briefcase, color: 'oklch(0.75 0.16 160)', type: 'income' },
}

export const EXPENSE_CATEGORIES = Object.values(BUILTIN_CATEGORIES).filter(
  (c) => c.type === 'expense',
)

export const CATEGORIES = BUILTIN_CATEGORIES

export const ICON_OPTIONS: { name: string; icon: LucideIcon }[] = [
  { name: 'Coffee', icon: Coffee },
  { name: 'Home', icon: Home },
  { name: 'Car', icon: Car },
  { name: 'Gift', icon: Gift },
  { name: 'Dumbbell', icon: Dumbbell },
  { name: 'Baby', icon: Baby },
  { name: 'Plane', icon: Plane },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'TrendingUp', icon: TrendingUp },
]

export const COLOR_PRESETS = [
  'oklch(0.7 0.18 295)',
  'oklch(0.78 0.14 200)',
  'oklch(0.75 0.16 160)',
  'oklch(0.8 0.15 75)',
  'oklch(0.68 0.2 18)',
  'oklch(0.72 0.15 350)',
  'oklch(0.74 0.13 240)',
  'oklch(0.78 0.13 180)',
  'oklch(0.65 0.22 310)',
  'oklch(0.82 0.12 100)',
]

// ─── Auto-Categorize Keywords ───
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: ['makan', 'kopi', 'food', 'resto', 'restaurant', 'cafe', 'warung', 'nasi', 'ayam', 'mie', 'bakso', 'sate', 'grabfood', 'gofood', 'starbucks', 'mcd', 'kfc', 'jco', 'bread', 'roti', 'snack', 'minum', 'jus', 'bubble', 'teh', 'susu'],
  transport: ['grab', 'gojek', 'gocar', 'uber', 'taxi', 'bensin', 'parkir', 'tol', 'ojek', 'bus', 'kereta', 'mrt', 'transjakarta', 'tiket', 'pesawat', 'flight'],
  shopping: ['tokopedia', 'shopee', 'lazada', 'blibli', 'bukalapak', 'mall', 'supermarket', 'indomaret', 'alfamart', 'market', 'grocery', 'belanja'],
  entertainment: ['netflix', 'spotify', 'youtube', 'bioskop', 'cinema', 'game', 'steam', 'playstation', 'konser', 'tiket', 'nonton'],
  bills: ['listrik', 'air', 'pdam', 'pln', 'internet', 'wifi', 'tagihan', 'cicilan', 'kredit', 'pajak', 'bpjs', 'asuransi'],
  health: ['obat', 'apotek', 'rumah sakit', 'dokter', 'vitamin', 'gym', 'fitness', 'medical'],
  education: ['buku', 'kursus', 'sekolah', 'kuliah', 'udemy', 'coursera', 'seminar', 'workshop'],
  internet: ['paket data', 'pulsa', 'top up', 'e-wallet', 'gopay', 'ovo', 'dana', 'shopeepay'],
}

export function autoCategory(description: string): CategoryId {
  const lower = description.toLowerCase()
  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return catId
  }
  return 'shopping' // default fallback
}

// ─── Benchmark Data (Indonesia averages) ───
export const BENCHMARK: Record<string, { label: string; avgPct: number }> = {
  food: { label: 'Makan & Minum', avgPct: 30 },
  transport: { label: 'Transport', avgPct: 12 },
  shopping: { label: 'Belanja', avgPct: 10 },
  entertainment: { label: 'Hiburan', avgPct: 5 },
  bills: { label: 'Tagihan', avgPct: 15 },
  health: { label: 'Kesehatan', avgPct: 5 },
  education: { label: 'Pendidikan', avgPct: 8 },
  internet: { label: 'Internet & Pulsa', avgPct: 5 },
}

// ─── Default Wallets ───
export const DEFAULT_WALLETS: Wallet[] = [
  { id: 'cash', name: 'Cash', icon: '💵', balance: 0, color: 'oklch(0.75 0.16 160)' },
  { id: 'bank', name: 'Rekening Bank', icon: '🏦', balance: 0, color: 'oklch(0.78 0.14 200)' },
  { id: 'ewallet', name: 'E-Wallet', icon: '📱', balance: 0, color: 'oklch(0.7 0.18 295)' },
]

// ─── Helpers ───
export function formatIDR(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatIDRShort(value: number): string {
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1).replace('.0', '')}jt`
  if (value >= 1_000) return `Rp${Math.round(value / 1_000)}rb`
  return `Rp${value}`
}

export function summarize(transactions: Transaction[]) {
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)
  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
  return { income, expense, surplus: income - expense }
}

export function spendingByCategory(transactions: Transaction[], allCategories: Record<string, Category>) {
  const map = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
  }
  return Array.from(map.entries())
    .map(([id, value]) => ({ category: allCategories[id] ?? BUILTIN_CATEGORIES[id] ?? { id, label: id, icon: ReceiptText, color: 'oklch(0.5 0.1 285)', type: 'expense' as TxType }, value }))
    .sort((a, b) => b.value - a.value)
}

export function buildFinanceSummary(
  transactions: Transaction[],
  budgets: Partial<Record<string, number>>,
  allCategories: Record<string, Category>,
): string {
  const { income, expense, surplus } = summarize(transactions)
  const byCat = spendingByCategory(transactions, allCategories)

  const catLines = byCat
    .map((c) => {
      const budget = budgets[c.category.id]
      const budgetStr = budget
        ? ` (budget ${formatIDR(budget)}, terpakai ${Math.round((c.value / budget) * 100)}%)`
        : ''
      return `- ${c.category.label}: ${formatIDR(c.value)}${budgetStr}`
    })
    .join('\n')

  const savingRate = income > 0 ? Math.round((surplus / income) * 100) : 0

  return `Pemasukan: ${formatIDR(income)}
Pengeluaran: ${formatIDR(expense)}
Surplus/Sisa: ${formatIDR(surplus)}
Saving rate: ${savingRate}%
Total transaksi: ${transactions.length}

Pengeluaran per kategori:
${catLines || '- Belum ada pengeluaran'}`
}

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function getMonthLabel(key: string): string {
  const [y, m] = key.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  return `${months[Number(m) - 1]} ${y}`
}

export function filterByMonth(transactions: Transaction[], monthKey: string): Transaction[] {
  return transactions.filter((t) => t.date.startsWith(monthKey))
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

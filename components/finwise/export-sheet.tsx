'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Download, FileText, FileSpreadsheet, Receipt,
  Upload, Camera, Share2, AlertCircle, CheckCircle2,
  X, Eye, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFinwise } from '@/components/finwise-store'
import {
  formatIDR,
  filterByMonth,
  getMonthKey,
  getMonthLabel,
  summarize,
  spendingByCategory,
  BUILTIN_CATEGORIES,
  generateId,
  autoCategory,
  autoCategoryWithWallet,
  resolveCategory,
  type Transaction,
  type TxType,
} from '@/lib/finwise'

// ─── Types ───
interface ImportRow {
  date: string
  type: TxType
  category: string
  amount: number
  description: string
  walletId?: string
  tags?: string[]
  valid: boolean
  error?: string
}

type BankFormat = 'generic' | 'bca' | 'mandiri'

// ─── Helpers ───
function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current.trim())
  return result
}

function parseIDR(val: string): number {
  // Handle "Rp1.000", "Rp 1.000", "1000", "1,000.00", "-50000", "(50000)"
  const cleaned = val
    .replace(/Rp\s*/gi, '')
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/[()]/g, '')
    .trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : Math.abs(num)
}

function detectBankFormat(headers: string[]): BankFormat {
  const joined = headers.join(' ').toLowerCase()
  if (joined.includes('keterangan') && joined.includes('jumlah') && (joined.includes('bca') || joined.includes('cabang'))) return 'bca'
  if (joined.includes('keterangan') && (joined.includes('debet') || joined.includes('kredit')) && joined.includes('saldo')) return 'mandiri'
  return 'generic'
}

function parseDate(str: string): string {
  // Try ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10)
  // Try DD/MM/YYYY or DD-MM-YYYY
  const m = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (m) {
    const day = m[1].padStart(2, '0')
    const month = m[2].padStart(2, '0')
    const year = m[3].length === 2 ? '20' + m[3] : m[3]
    return `${year}-${month}-${day}`
  }
  // Try DD MMM YYYY (Indonesian)
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05',
    jun: '06', jul: '07', agu: '08', aug: '08', sep: '09', okt: '10', oct: '10',
    nov: '11', des: '12', dec: '12',
  }
  const bm = str.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/i)
  if (bm) {
    const day = bm[1].padStart(2, '0')
    const mon = months[bm[2].toLowerCase()] || '01'
    return `${bm[3]}-${mon}-${day}`
  }
  return str
}

// ─── Main Component ───
export function ExportSheet({ onClose }: { onClose: () => void }) {
  const { transactions, allCategories, budgets, addTransaction, wallets } = useFinwise()
  const [exporting, setExporting] = useState<string | null>(null)
  const [tab, setTab] = useState<'export' | 'import' | 'share'>('export')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<ImportRow[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [showImportPreview, setShowImportPreview] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(new Date()))
  const [csvScope, setCsvScope] = useState<'all' | 'month'>('all')
  const reportRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentMonth = getMonthKey(new Date())
  const monthTx = filterByMonth(transactions, currentMonth)

  // Generate month options from transactions
  const allMonths = Array.from(new Set(transactions.map(t => t.date.slice(0, 7)))).sort().reverse()
  if (!allMonths.includes(currentMonth)) allMonths.unshift(currentMonth)

  // ─── Export CSV ───
  function exportCSV() {
    setExporting('csv')
    try {
      const headers = ['Tanggal', 'Tipe', 'Kategori', 'Jumlah', 'Deskripsi', 'Dompet', 'Tags']
      const txList = csvScope === 'month' ? monthTx : transactions
      const rows = txList.map((t) => {
        const wallet = wallets.find(w => w.id === t.walletId)
        return [
          t.date,
          t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
          resolveCategory(t.category, allCategories)?.label ?? t.category,
          String(t.amount),
          t.description,
          wallet?.name || t.walletId || 'Cash',
          (t.tags || []).join('; '),
        ]
      })

      const csv = [headers.map(escapeCSV).join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n')
      const bom = '\uFEFF'
      const scopeLabel = csvScope === 'month' ? currentMonth : 'Semua'
      downloadFile(`FinWise_${scopeLabel}.csv`, bom + csv, 'text/csv;charset=utf-8')
    } finally {
      setExporting(null)
    }
  }

  // ─── Export Monthly Report PDF (HTML printable) ───
  function exportPDF() {
    setExporting('pdf')
    try {
      const targetTx = filterByMonth(transactions, selectedMonth)
      const { income, expense, surplus } = summarize(targetTx)
      const byCat = spendingByCategory(targetTx, allCategories)
      const savingRate = income > 0 ? Math.round((surplus / income) * 100) : 0

      const categoryRows = byCat
        .map((c) => {
          const budget = budgets[c.category.id]
          const pct = budget ? Math.round((c.value / budget) * 100) : null
          return `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee">${c.category.label}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${formatIDR(c.value)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${budget ? formatIDR(budget) : '-'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;color:${pct && pct > 100 ? '#ef4444' : '#22c55e'}">${pct !== null ? pct + '%' : '-'}</td>
          </tr>`
        })
        .join('')

      // Bar chart using CSS
      const maxCatValue = byCat.length > 0 ? Math.max(...byCat.map(c => c.value)) : 1
      const barChart = byCat.map((c) => {
        const pct = Math.round((c.value / maxCatValue) * 100)
        return `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="width:120px;font-size:12px;text-align:right;color:#666">${c.category.label}</span>
            <div style="flex:1;background:#f0f0f0;border-radius:4px;height:20px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#2ead4b,#cdffad);border-radius:4px"></div>
            </div>
            <span style="width:80px;font-size:12px;font-weight:600">${formatIDR(c.value)}</span>
          </div>`
      }).join('')

      const txRows = targetTx
        .slice(0, 200)
        .map((t) => {
          const cat = resolveCategory(t.category, allCategories)?.label ?? t.category
          const isIncome = t.type === 'income'
          return `
          <tr>
            <td style="padding:6px 12px;border-bottom:1px solid #f3f3f3;font-size:13px">${t.date}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f3f3f3;font-size:13px">${cat}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f3f3f3;font-size:13px">${t.description}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f3f3f3;text-align:right;font-size:13px;font-weight:600;color:${isIncome ? '#22c55e' : '#1a1a1a'}">
              ${isIncome ? '+' : '-'}${formatIDR(t.amount)}
            </td>
          </tr>`
        })
        .join('')

      const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>FinWise Laporan ${getMonthLabel(selectedMonth)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 32px 24px; }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { font-size: 24px; margin-bottom: 4px; }
    .header p { color: #666; font-size: 14px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .summary-card { background: #f8f7ff; border-radius: 12px; padding: 16px; text-align: center; }
    .summary-card .label { font-size: 12px; color: #888; margin-bottom: 4px; }
    .summary-card .value { font-size: 18px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f8f7ff; padding: 10px 12px; text-align: left; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; color: #aaa; font-size: 12px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🐱 FinWise — Laporan Keuangan</h1>
    <p>${getMonthLabel(selectedMonth)}</p>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Pemasukan</div>
      <div class="value" style="color:#22c55e">${formatIDR(income)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Pengeluaran</div>
      <div class="value" style="color:#ef4444">${formatIDR(expense)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Surplus</div>
      <div class="value" style="color:${surplus >= 0 ? '#22c55e' : '#ef4444'}">${formatIDR(surplus)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Saving Rate</div>
      <div class="value">${savingRate}%</div>
    </div>
  </div>

  <h2 style="font-size:16px;margin-bottom:12px">📊 Pengeluaran per Kategori</h2>
  <div style="margin-bottom:24px;padding:16px;background:#fafafa;border-radius:12px">
    ${barChart || '<p style="color:#888;font-size:13px">Belum ada pengeluaran</p>'}
  </div>

  <table>
    <thead>
      <tr><th>Kategori</th><th style="text-align:right">Terpakai</th><th style="text-align:right">Budget</th><th style="text-align:right">%</th></tr>
    </thead>
    <tbody>${categoryRows}</tbody>
  </table>

  <h2 style="font-size:16px;margin:24px 0 12px">📋 Detail Transaksi (${targetTx.length})</h2>
  <table>
    <thead>
      <tr><th>Tanggal</th><th>Kategori</th><th>Deskripsi</th><th style="text-align:right">Jumlah</th></tr>
    </thead>
    <tbody>${txRows}</tbody>
  </table>

  <div class="footer">
    <p>Diekspor dari FinWise pada ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <p>finny.biz.id</p>
  </div>
</body>
</html>`

      downloadFile(`FinWise_Laporan_${selectedMonth}.html`, html, 'text/html;charset=utf-8')
    } finally {
      setExporting(null)
    }
  }

  // ─── Export Tax Summary ───
  function exportTaxSummary() {
    setExporting('tax')
    try {
      const allMonths = new Set(transactions.map((t) => t.date.slice(0, 7)))
      const sortedMonths = Array.from(allMonths).sort().reverse()

      let totalIncome = 0
      let totalExpense = 0
      const incomeByCategory: Record<string, number> = {}

      for (const t of transactions) {
        if (t.type === 'income') {
          totalIncome += t.amount
          const cat = resolveCategory(t.category, allCategories)?.label ?? t.category
          incomeByCategory[cat] = (incomeByCategory[cat] || 0) + t.amount
        } else {
          totalExpense += t.amount
        }
      }

      const incomeRows = Object.entries(incomeByCategory)
        .map(([cat, amount]) => `  <tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${cat}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${formatIDR(amount)}</td></tr>`)
        .join('')

      const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>FinWise Ringkasan Pajak</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 32px 24px; }
    h1 { text-align: center; font-size: 22px; margin-bottom: 24px; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 15px; margin-bottom: 8px; color: #666; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f8f7ff; padding: 8px 12px; text-align: left; font-size: 12px; }
    .total-row { font-weight: 700; background: #f8f7ff; }
    .footer { text-align: center; margin-top: 32px; color: #aaa; font-size: 11px; }
  </style>
</head>
<body>
  <h1>🐱 FinWise — Ringkasan Pajak</h1>
  <p style="text-align:center;color:#666;margin-bottom:24px">Periode: ${sortedMonths[sortedMonths.length - 1] || '-'} s/d ${sortedMonths[0] || '-'}</p>

  <div class="section">
    <h2>Ringkasan</h2>
    <table>
      <tr><td style="padding:8px 12px">Total Pemasukan</td><td style="padding:8px 12px;text-align:right;font-weight:600;color:#22c55e">${formatIDR(totalIncome)}</td></tr>
      <tr><td style="padding:8px 12px">Total Pengeluaran</td><td style="padding:8px 12px;text-align:right;font-weight:600;color:#ef4444">${formatIDR(totalExpense)}</td></tr>
      <tr class="total-row"><td style="padding:8px 12px;border-top:2px solid #ddd">Net</td><td style="padding:8px 12px;text-align:right;border-top:2px solid #ddd">${formatIDR(totalIncome - totalExpense)}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Sumber Pemasukan</h2>
    <table>
      <thead><tr><th style="padding:8px 12px;text-align:left">Kategori</th><th style="padding:8px 12px;text-align:right">Jumlah</th></tr></thead>
      <tbody>${incomeRows}</tbody>
    </table>
  </div>

  <div class="footer">
    <p>Dokumen ini bukan pengganti laporan pajak resmi.</p>
    <p>Diekspor dari FinWise — finny.biz.id</p>
  </div>
</body>
</html>`

      downloadFile(`FinWise_RingkasanPajak.html`, html, 'text/html;charset=utf-8')
    } finally {
      setExporting(null)
    }
  }

  // ─── Share as Image ───
  async function shareAsImage() {
    setExporting('share')
    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default

      // Build a shareable summary card
      const targetTx = filterByMonth(transactions, selectedMonth)
      const { income, expense, surplus } = summarize(targetTx)
      const byCat = spendingByCategory(targetTx, allCategories)
      const savingRate = income > 0 ? Math.round((surplus / income) * 100) : 0

      // Create off-screen element
      const container = document.createElement('div')
      container.style.cssText = `
        position: fixed; left: -9999px; top: 0;
        width: 400px; padding: 24px;
        font-family: 'Segoe UI', system-ui, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white; border-radius: 0;
      `

      const topCats = byCat.slice(0, 5)
      const catBars = topCats.map(c => {
        const pct = income > 0 ? Math.round((c.value / (expense || 1)) * 100) : 0
        return `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="width:100px;font-size:12px;opacity:0.9">${c.category.label}</span>
            <div style="flex:1;background:rgba(255,255,255,0.2);border-radius:6px;height:16px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:rgba(255,255,255,0.7);border-radius:6px"></div>
            </div>
            <span style="width:80px;font-size:11px;text-align:right;opacity:0.9">${formatIDR(c.value)}</span>
          </div>`
      }).join('')

      container.innerHTML = `
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:28px;margin-bottom:4px">🐱</div>
          <div style="font-size:18px;font-weight:700">FinWise</div>
          <div style="font-size:13px;opacity:0.8">${getMonthLabel(selectedMonth)}</div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
          <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:11px;opacity:0.7">Pemasukan</div>
            <div style="font-size:16px;font-weight:700;color:#86efac">${formatIDR(income)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:11px;opacity:0.7">Pengeluaran</div>
            <div style="font-size:16px;font-weight:700;color:#fca5a5">${formatIDR(expense)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:11px;opacity:0.7">Surplus</div>
            <div style="font-size:16px;font-weight:700">${formatIDR(surplus)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:11px;opacity:0.7">Saving Rate</div>
            <div style="font-size:16px;font-weight:700">${savingRate}%</div>
          </div>
        </div>

        ${topCats.length > 0 ? `
        <div style="margin-bottom:16px">
          <div style="font-size:13px;font-weight:600;margin-bottom:8px;opacity:0.9">Top Pengeluaran</div>
          ${catBars}
        </div>` : ''}

        <div style="text-align:center;font-size:10px;opacity:0.5;margin-top:16px">
          ${targetTx.length} transaksi · finny.biz.id
        </div>
      `

      document.body.appendChild(container)
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      })
      document.body.removeChild(container)

      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(`FinWise_Share_${selectedMonth}.png`, blob)
        }
        setExporting(null)
      }, 'image/png')
    } catch (err) {
      console.error('Share image error:', err)
      setExporting(null)
    }
  }

  // ─── Import CSV ───
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    setImportSuccess(null)
    setImportErrors([])
    setShowImportPreview(false)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      processImportFile(text, file.name)
    }
    reader.readAsText(file)
  }

  function processImportFile(text: string, filename: string) {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) {
      setImportErrors(['File kosong atau tidak valid'])
      return
    }

    // Remove BOM if present
    if (lines[0].charCodeAt(0) === 0xFEFF) lines[0] = lines[0].slice(1)

    const headers = parseCSVLine(lines[0])
    const bankFormat = detectBankFormat(headers)
    const errors: string[] = []
    const rows: ImportRow[] = []

    if (bankFormat === 'bca') {
      // BCA format: Tanggal, Keterangan, Jumlah, Saldo (or similar)
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i])
        if (cols.length < 3) continue

        const date = parseDate(cols[0])
        const description = cols[1] || ''
        // BCA: positive = money in, negative = money out
        const rawAmount = parseIDR(cols[2])
        const isNegative = cols[2].includes('-') || cols[2].includes('(')
        const type: TxType = isNegative ? 'expense' : 'income'
        const category = autoCategory(description)

        const valid = !!date && rawAmount > 0
        rows.push({
          date,
          type,
          category,
          amount: rawAmount,
          description,
          walletId: 'bca',
          valid,
          error: valid ? undefined : !date ? 'Tanggal tidak valid' : 'Jumlah 0',
        })
      }
    } else if (bankFormat === 'mandiri') {
      // Mandiri format: Tanggal, Keterangan, Cabang, Jumlah, Debet, Kredit, Saldo
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i])
        if (cols.length < 5) continue

        const date = parseDate(cols[0])
        const description = cols[1] || ''
        const debit = parseIDR(cols[4] || '0')
        const credit = parseIDR(cols[5] || '0')
        const amount = debit > 0 ? debit : credit
        const type: TxType = debit > 0 ? 'expense' : 'income'
        const category = autoCategory(description)

        const valid = !!date && amount > 0
        rows.push({
          date,
          type,
          category,
          amount,
          description,
          walletId: 'mandiri',
          valid,
          error: valid ? undefined : !date ? 'Tanggal tidak valid' : 'Jumlah 0',
        })
      }
    } else {
      // Generic CSV: expect headers like date/type/category/amount/description/wallet
      const headerMap: Record<string, number> = {}
      headers.forEach((h, i) => {
        const lower = h.toLowerCase()
        if (lower.includes('tanggal') || lower === 'date') headerMap.date = i
        if (lower.includes('tipe') || lower === 'type') headerMap.type = i
        if (lower.includes('kategori') || lower === 'category') headerMap.category = i
        if (lower.includes('jumlah') || lower === 'amount') headerMap.amount = i
        if (lower.includes('deskripsi') || lower === 'description') headerMap.description = i
        if (lower.includes('dompet') || lower.includes('wallet') || lower === 'sumber') headerMap.wallet = i
        if (lower === 'tags') headerMap.tags = i
      })

      if (headerMap.amount === undefined && headerMap.date === undefined) {
        // Try positional: date, type, category, amount, description, wallet, tags
        headerMap.date = 0
        headerMap.type = 1
        headerMap.category = 2
        headerMap.amount = 3
        headerMap.description = 4
        headerMap.wallet = 5
        headerMap.tags = 6
      }

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i])
        if (cols.length < 2) continue

        const date = parseDate(cols[headerMap.date] || '')
        const typeStr = (cols[headerMap.type] || '').toLowerCase()
        const type: TxType = typeStr.includes('masuk') || typeStr === 'income' ? 'income' : 'expense'
        const category = cols[headerMap.category] || autoCategory(cols[headerMap.description] || '')
        const amount = parseIDR(cols[headerMap.amount] || '0')
        const description = cols[headerMap.description] || ''
        const walletId = cols[headerMap.wallet]?.toLowerCase() || undefined
        const tags = headerMap.tags !== undefined ? (cols[headerMap.tags] || '').split(';').map(t => t.trim()).filter(Boolean) : undefined

        const valid = !!date && amount > 0
        rows.push({
          date,
          type,
          category,
          amount,
          description,
          walletId,
          tags,
          valid,
          error: valid ? undefined : !date ? 'Tanggal tidak valid' : 'Jumlah 0',
        })
      }
    }

    if (rows.length === 0) {
      errors.push('Tidak ada transaksi yang ditemukan di file')
    }

    const detectedLabel = bankFormat === 'bca' ? 'BCA' : bankFormat === 'mandiri' ? 'Mandiri' : 'Generic CSV'
    if (bankFormat !== 'generic') {
      errors.unshift(`Format terdeteksi: ${detectedLabel}`)
    }

    setImportPreview(rows)
    setImportErrors(errors)
    setShowImportPreview(true)
  }

  function executeImport() {
    setImporting(true)
    const validRows = importPreview.filter(r => r.valid)
    let count = 0

    for (const row of validRows) {
      // Resolve wallet ID
      let walletId = row.walletId
      if (walletId) {
        const match = wallets.find(w => w.id.toLowerCase() === walletId || w.name.toLowerCase() === walletId)
        walletId = match?.id
      }

      // Resolve category ID
      let categoryId = row.category
      const catMatch = Object.entries(allCategories).find(([id, c]) =>
        id === categoryId || c.label.toLowerCase() === categoryId.toLowerCase()
      )
      if (catMatch) {
        categoryId = catMatch[0]
      } else {
        categoryId = autoCategoryWithWallet(row.description, walletId)
      }

      addTransaction({
        type: row.type,
        category: categoryId,
        amount: row.amount,
        description: row.description,
        date: row.date,
        walletId,
        tags: row.tags,
      })
      count++
    }

    setImportSuccess(count)
    setImporting(false)
    setShowImportPreview(false)
    setImportFile(null)
    setImportPreview([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─── Render ───
  return (
    <div className="flex flex-col gap-4">
      {/* Tab selector */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {([
          { id: 'export' as const, icon: Download, label: 'Ekspor' },
          { id: 'import' as const, icon: Upload, label: 'Impor' },
          { id: 'share' as const, icon: Share2, label: 'Share' },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              tab === t.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── EXPORT TAB ─── */}
      {tab === 'export' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Ekspor data keuanganmu untuk backup, analisis, atau pelaporan pajak.
          </p>

          {/* CSV Export */}
          <div className="clay-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-green-100">
                <FileSpreadsheet className="size-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Ekspor CSV / Excel</p>
                <p className="text-xs text-muted-foreground">Semua transaksi dengan kolom lengkap</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-xs text-muted-foreground">Cakupan:</label>
              <select
                value={csvScope}
                onChange={(e) => setCsvScope(e.target.value as 'all' | 'month')}
                className="rounded-lg border bg-background px-2 py-1 text-xs"
              >
                <option value="all">Semua Transaksi</option>
                <option value="month">Bulan Ini ({getMonthLabel(currentMonth)})</option>
              </select>
            </div>
            <button
              onClick={exportCSV}
              disabled={exporting !== null}
              className="w-full rounded-xl bg-green-500/10 py-2.5 text-sm font-medium text-green-700 transition hover:bg-green-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              {exporting === 'csv' ? '⏳ Mengekspor...' : '📥 Unduh CSV'}
            </button>
          </div>

          {/* Monthly Report PDF */}
          <div className="clay-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100">
                <FileText className="size-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Laporan Bulanan</p>
                <p className="text-xs text-muted-foreground">Ringkasan lengkap dengan grafik, bisa dicetak PDF</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-xs text-muted-foreground">Bulan:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-lg border bg-background px-2 py-1 text-xs"
              >
                {allMonths.map(m => (
                  <option key={m} value={m}>{getMonthLabel(m)}</option>
                ))}
              </select>
            </div>
            <button
              onClick={exportPDF}
              disabled={exporting !== null}
              className="w-full rounded-xl bg-blue-500/10 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              {exporting === 'pdf' ? '⏳ Membuat laporan...' : '📄 Unduh Laporan'}
            </button>
          </div>

          {/* Tax Summary */}
          <button
            onClick={exportTaxSummary}
            disabled={exporting !== null}
            className="clay-card flex items-center gap-3 p-4 text-left transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-orange-100">
              <Receipt className="size-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Ringkasan Pajak</p>
              <p className="text-xs text-muted-foreground">Rekap pemasukan & pengeluaran untuk pelaporan</p>
            </div>
            {exporting === 'tax' && <span className="ml-auto animate-spin">⏳</span>}
          </button>

          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Tips:</strong> File HTML bisa dibuka di browser lalu dicetak sebagai PDF (Ctrl+P / Cmd+P).
              CSV bisa dibuka di Excel atau Google Sheets. Data tersimpan hanya di browser kamu.
            </p>
          </div>
        </div>
      )}

      {/* ─── IMPORT TAB ─── */}
      {tab === 'import' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Impor transaksi dari file CSV atau rekening bank. Format yang didukung:
          </p>

          <div className="rounded-xl bg-muted/50 p-3 space-y-1">
            <p className="text-xs font-medium">📋 Format yang didukung:</p>
            <p className="text-xs text-muted-foreground">• <strong>CSV umum</strong> — kolom: tanggal, tipe, kategori, jumlah, deskripsi, dompet</p>
            <p className="text-xs text-muted-foreground">• <strong>BCA</strong> — export dari myBCA (auto-detect)</p>
            <p className="text-xs text-muted-foreground">• <strong>Mandiri</strong> — export dari Livin&apos; by Mandiri (auto-detect)</p>
          </div>

          {/* File picker */}
          <div className="clay-card p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-muted-foreground/20 p-6 text-center transition hover:border-primary/40 hover:bg-primary/5"
            >
              <Upload className="mx-auto mb-2 size-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">
                {importFile ? importFile.name : 'Pilih file CSV'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Klik untuk memilih file atau drag & drop
              </p>
            </button>
          </div>

          {/* Import errors */}
          {importErrors.length > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 space-y-1">
              {importErrors.map((err, i) => (
                <p key={i} className="text-xs text-blue-700 flex items-center gap-1.5">
                  {err.includes('terdeteksi') ? <CheckCircle2 className="size-3.5 shrink-0" /> : <AlertCircle className="size-3.5 shrink-0" />}
                  {err}
                </p>
              ))}
            </div>
          )}

          {/* Import success */}
          {importSuccess !== null && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-3">
              <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                <CheckCircle2 className="size-4" />
                Berhasil mengimpor {importSuccess} transaksi!
              </p>
            </div>
          )}

          {/* Import preview */}
          {showImportPreview && importPreview.length > 0 && (
            <div className="clay-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Eye className="size-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Preview ({importPreview.length} transaksi)</p>
                </div>
                <button onClick={() => setShowImportPreview(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Tanggal</th>
                      <th className="p-2 text-left">Tipe</th>
                      <th className="p-2 text-left">Deskripsi</th>
                      <th className="p-2 text-right">Jumlah</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.slice(0, 50).map((row, i) => (
                      <tr key={i} className={`border-t ${row.valid ? '' : 'bg-red-50'}`}>
                        <td className="p-2">{row.date}</td>
                        <td className="p-2">
                          <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] ${
                            row.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {row.type === 'income' ? 'Masuk' : 'Keluar'}
                          </span>
                        </td>
                        <td className="p-2 truncate max-w-[120px]">{row.description || '-'}</td>
                        <td className="p-2 text-right font-medium">{formatIDR(row.amount)}</td>
                        <td className="p-2 text-center">
                          {row.valid ? (
                            <CheckCircle2 className="inline size-3.5 text-green-500" />
                          ) : (
                            <span title={row.error}>
                              <AlertCircle className="inline size-3.5 text-red-500" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importPreview.length > 50 && (
                  <p className="text-xs text-muted-foreground text-center p-2">
                    ...dan {importPreview.length - 50} transaksi lainnya
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-muted-foreground">
                  {importPreview.filter(r => r.valid).length} valid, {importPreview.filter(r => !r.valid).length} error
                </p>
                <Button
                  size="sm"
                  onClick={executeImport}
                  disabled={importing || importPreview.filter(r => r.valid).length === 0}
                >
                  {importing ? '⏳ Mengimpor...' : `Impor ${importPreview.filter(r => r.valid).length} Transaksi`}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SHARE TAB ─── */}
      {tab === 'share' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Buat gambar ringkasan keuangan untuk dibagikan ke media sosial atau chat.
          </p>

          {/* Month selector for share */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Bulan:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border bg-background px-2 py-1 text-xs"
            >
              {allMonths.map(m => (
                <option key={m} value={m}>{getMonthLabel(m)}</option>
              ))}
            </select>
          </div>

          {/* Preview card */}
          <div className="clay-card overflow-hidden">
            {(() => {
              const targetTx = filterByMonth(transactions, selectedMonth)
              const { income, expense, surplus } = summarize(targetTx)
              const byCat = spendingByCategory(targetTx, allCategories)
              const savingRate = income > 0 ? Math.round((surplus / income) * 100) : 0
              const topCats = byCat.slice(0, 5)

              return (
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white">
                  <div className="text-center mb-4">
                    <div className="text-2xl mb-1">🐱</div>
                    <div className="text-lg font-bold">FinWise</div>
                    <div className="text-xs opacity-80">{getMonthLabel(selectedMonth)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl bg-white/15 p-3 text-center">
                      <div className="text-[10px] opacity-70">Pemasukan</div>
                      <div className="text-sm font-bold text-green-300">{formatIDR(income)}</div>
                    </div>
                    <div className="rounded-xl bg-white/15 p-3 text-center">
                      <div className="text-[10px] opacity-70">Pengeluaran</div>
                      <div className="text-sm font-bold text-red-300">{formatIDR(expense)}</div>
                    </div>
                    <div className="rounded-xl bg-white/15 p-3 text-center">
                      <div className="text-[10px] opacity-70">Surplus</div>
                      <div className="text-sm font-bold">{formatIDR(surplus)}</div>
                    </div>
                    <div className="rounded-xl bg-white/15 p-3 text-center">
                      <div className="text-[10px] opacity-70">Saving Rate</div>
                      <div className="text-sm font-bold">{savingRate}%</div>
                    </div>
                  </div>

                  {topCats.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-2 opacity-90">Top Pengeluaran</div>
                      {topCats.map((c) => {
                        const pct = expense > 0 ? Math.round((c.value / expense) * 100) : 0
                        return (
                          <div key={c.category.id} className="flex items-center gap-2 mb-1.5">
                            <span className="w-[90px] text-[10px] opacity-80 truncate">{c.category.label}</span>
                            <div className="flex-1 bg-white/20 rounded-full h-3 overflow-hidden">
                              <div className="h-full bg-white/70 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-[70px] text-[10px] text-right opacity-80">{formatIDR(c.value)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="text-center text-[9px] opacity-40 mt-4">
                    {targetTx.length} transaksi · finny.biz.id
                  </div>
                </div>
              )
            })()}
          </div>

          <Button
            onClick={shareAsImage}
            disabled={exporting !== null}
            className="gap-2"
          >
            {exporting === 'share' ? (
              <>⏳ Membuat gambar...</>
            ) : (
              <>
                <Camera className="size-4" />
                Simpan sebagai Gambar
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Gambar PNG akan diunduh. Bisa langsung dishare ke WhatsApp, Instagram, dll.
          </p>
        </div>
      )}

      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

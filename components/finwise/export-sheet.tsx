'use client'

import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFinwise } from '@/components/finwise-store'
import {
  formatIDR,
  filterByMonth,
  getMonthKey,
  getMonthLabel,
  summarize,
  spendingByCategory,
  BUILTIN_CATEGORIES,
  type Transaction,
} from '@/lib/finwise'

export function ExportSheet({ onClose }: { onClose: () => void }) {
  const { transactions, allCategories, budgets } = useFinwise()
  const [exporting, setExporting] = useState<string | null>(null)

  const currentMonth = getMonthKey(new Date())
  const monthTx = filterByMonth(transactions, currentMonth)

  function downloadFile(filename: string, content: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
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

  // ─── Export CSV (Excel-compatible) ───
  function exportCSV() {
    setExporting('csv')
    try {
      const headers = ['Tanggal', 'Tipe', 'Kategori', 'Deskripsi', 'Jumlah', 'Tags']
      const rows = transactions.map((t) => [
        t.date,
        t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        allCategories[t.category]?.label ?? t.category,
        t.description,
        String(t.amount),
        (t.tags || []).join('; '),
      ])

      const csv = [headers.map(escapeCSV).join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n')
      const bom = '\uFEFF' // BOM for Excel UTF-8
      downloadFile(`FinWise_${currentMonth}.csv`, bom + csv, 'text/csv;charset=utf-8')
    } finally {
      setExporting(null)
    }
  }

  // ─── Export HTML Report (printable as PDF) ───
  function exportPDF() {
    setExporting('pdf')
    try {
      const { income, expense, surplus } = summarize(monthTx)
      const byCat = spendingByCategory(monthTx, allCategories)
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

      const txRows = transactions
        .slice(0, 100)
        .map((t) => {
          const cat = allCategories[t.category]?.label ?? t.category
          const isIncome = t.type === 'income'
          return `
          <tr>
            <td style="padding:6px 12px;border-bottom:1px solid #f3f3f3;font-size:13px">${t.date}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f3f3f3;font-size:13px">${cat}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f3f3f3;font-size:13px">${t.description}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f3f3f3;text-align:right;font-size:13px;font-weight:600;color:${isIncome ? '#22c55e' : '#1a1a1a'}">
              ${isIncome ? '+' : '-'}${formatIDR(t.amount)}
            </td>
            <td style="padding:6px 12px;border-bottom:1px solid #f3f3f3;font-size:12px;color:#888">${(t.tags || []).map((tag) => '#' + tag).join(' ')}</td>
          </tr>`
        })
        .join('')

      const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>FinWise Laporan ${getMonthLabel(currentMonth)}</title>
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
    <p>${getMonthLabel(currentMonth)}</p>
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
  <table>
    <thead>
      <tr><th>Kategori</th><th style="text-align:right">Terpakai</th><th style="text-align:right">Budget</th><th style="text-align:right">%</th></tr>
    </thead>
    <tbody>${categoryRows}</tbody>
  </table>

  <h2 style="font-size:16px;margin:24px 0 12px">📋 Detail Transaksi</h2>
  <table>
    <thead>
      <tr><th>Tanggal</th><th>Kategori</th><th>Deskripsi</th><th style="text-align:right">Jumlah</th><th>Tags</th></tr>
    </thead>
    <tbody>${txRows}</tbody>
  </table>

  <div class="footer">
    <p>Diekspor dari FinWise pada ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <p>finny.biz.id</p>
  </div>
</body>
</html>`

      downloadFile(`FinWise_Laporan_${currentMonth}.html`, html, 'text/html;charset=utf-8')
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
          const cat = allCategories[t.category]?.label ?? t.category
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

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Ekspor data keuanganmu untuk backup, analisis, atau pelaporan pajak.
      </p>

      <div className="flex flex-col gap-3">
        <button
          onClick={exportCSV}
          disabled={exporting !== null}
          className="clay-card flex items-center gap-3 p-4 text-left transition hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-green-100">
            <FileSpreadsheet className="size-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">Ekspor CSV / Excel</p>
            <p className="text-xs text-muted-foreground">Semua transaksi dalam format spreadsheet</p>
          </div>
          {exporting === 'csv' && <span className="ml-auto animate-spin">⏳</span>}
        </button>

        <button
          onClick={exportPDF}
          disabled={exporting !== null}
          className="clay-card flex items-center gap-3 p-4 text-left transition hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100">
            <FileText className="size-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">Laporan Bulanan (PDF)</p>
            <p className="text-xs text-muted-foreground">Ringkasan lengkap bulan ini, bisa dicetak</p>
          </div>
          {exporting === 'pdf' && <span className="ml-auto animate-spin">⏳</span>}
        </button>

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
      </div>

      <div className="rounded-xl bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground">
          💡 <strong>Tips:</strong> File HTML bisa dibuka di browser lalu dicetak sebagai PDF (Ctrl+P / Cmd+P). 
          Data tersimpan hanya di browser kamu — tidak ada yang dikirim ke server.
        </p>
      </div>

      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

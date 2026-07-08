'use client'

import { useState, useCallback, useMemo } from 'react'
import { Upload, Check, Loader2, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react'
import { useFinwise } from '@/components/finwise-store'
import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { parseBankCSV, type ParsedTransaction, type BankType, getDateRange } from '@/lib/bank-parser'
import { formatIDR, type CategoryId, EXPENSE_CATEGORIES, BUILTIN_CATEGORIES } from '@/lib/finwise'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type ImportStep = 'upload' | 'bank' | 'preview' | 'wallet' | 'confirm'

interface ImportSheetProps {
  open: boolean
  onClose: () => void
}

const BANK_OPTIONS: { value: BankType; label: string; icon: string }[] = [
  { value: 'bca', label: 'BCA (KlikBCA)', icon: '🔴' },
  { value: 'mandiri', label: `Mandiri (Livin')`, icon: '🟡' },
  { value: 'bri', label: 'BRI (BRImo)', icon: '🔵' },
  { value: 'generic', label: 'Otomatis (Lainnya)', icon: '📄' },
]

const CATEGORY_OPTIONS = [...EXPENSE_CATEGORIES, BUILTIN_CATEGORIES.income]

const STEP_LABELS = ['File', 'Bank', 'Pratinjau', 'Dompet', 'Konfirmasi'] as const
const STEP_IDS: ImportStep[] = ['upload', 'bank', 'preview', 'wallet', 'confirm']

function ImportSheetContent({ onClose }: { onClose: () => void }) {
  const { wallets, addTransaction, transactions } = useFinwise()

  // State
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState('')
  const [bankType, setBankType] = useState<BankType>('generic')
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([])
  const [selectedWalletId, setSelectedWalletId] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [rowCategories, setRowCategories] = useState<Record<number, CategoryId>>({})
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Derived: existing transaction signatures for duplicate detection
  const existingSignatures = useMemo(() => {
    const set = new Set<string>()
    for (const t of transactions) {
      const sig = `${t.date}|${t.amount}|${t.description.toLowerCase().trim()}`
      set.add(sig)
    }
    return set
  }, [transactions])

  // Duplicate detection
  const isDuplicate = useCallback((tx: ParsedTransaction) => {
    const sig = `${tx.date}|${tx.amount}|${tx.description.toLowerCase().trim()}`
    return existingSignatures.has(sig)
  }, [existingSignatures])

  // Handle file read
  const readFile = useCallback((f: File) => {
    setFile(f)
    setError(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      setCsvText(text)
    }
    reader.onerror = () => setError('Gagal membaca file')
    reader.readAsText(f)
  }, [])

  // Handle file upload
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) readFile(f)
  }, [readFile])

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.type === 'text/csv' || f.name.endsWith('.csv'))) {
      readFile(f)
    } else {
      setError('Hanya file CSV yang didukung')
    }
  }, [readFile])

  // Parse CSV
  const handleParse = useCallback(() => {
    if (!csvText.trim()) return
    setIsProcessing(true)
    setError(null)
    try {
      const parsed = parseBankCSV(csvText, bankType)
      setParsedTransactions(parsed)
      // Init row categories
      const initialCategories: Record<number, CategoryId> = {}
      parsed.forEach((tx, idx) => {
        initialCategories[idx] = tx.category
      })
      setRowCategories(initialCategories)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Format CSV tidak dikenali')
    } finally {
      setIsProcessing(false)
    }
  }, [csvText, bankType])

  // Category change for a row
  const handleCategoryChange = useCallback((rowIdx: number, category: CategoryId) => {
    setRowCategories(prev => ({ ...prev, [rowIdx]: category }))
  }, [])

  // Toggle row expansion
  const toggleExpanded = useCallback((rowIdx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(rowIdx)) next.delete(rowIdx)
      else next.add(rowIdx)
      return next
    })
  }, [])

  // Import transactions
  const handleImport = useCallback(() => {
    if (parsedTransactions.length === 0) return
    if (!selectedWalletId) {
      setError('Pilih dompet terlebih dahulu')
      return
    }

    setIsProcessing(true)
    setError(null)
    let successCount = 0
    let skipCount = 0

    for (let i = 0; i < parsedTransactions.length; i++) {
      const tx = parsedTransactions[i]
      const customCategory = rowCategories[i]

      // Skip duplicates
      if (isDuplicate(tx)) {
        skipCount++
        continue
      }

      const finalCategory = customCategory || tx.category

      try {
        addTransaction({
          type: tx.type,
          category: finalCategory,
          amount: tx.amount,
          description: tx.description,
          date: tx.date,
          walletId: selectedWalletId,
        })
        successCount++
      } catch (err) {
        console.error('[Import] Error adding transaction:', err)
      }
    }

    setIsProcessing(false)
    setImportedCount(successCount)
    setShowSuccess(true)
  }, [parsedTransactions, rowCategories, selectedWalletId, addTransaction, isDuplicate])

  // Reset everything
  const handleReset = useCallback(() => {
    setFile(null)
    setCsvText('')
    setBankType('generic')
    setParsedTransactions([])
    setSelectedWalletId('')
    setRowCategories({})
    setExpandedRows(new Set())
    setStep('upload')
    setShowSuccess(false)
    setImportedCount(0)
    setError(null)
  }, [])

  // Step navigation
  const currentIdx = STEP_IDS.indexOf(step)
  const nextStep = useCallback(() => {
    if (currentIdx < STEP_IDS.length - 1) setStep(STEP_IDS[currentIdx + 1])
  }, [currentIdx])
  const prevStep = useCallback(() => {
    if (currentIdx > 0) setStep(STEP_IDS[currentIdx - 1])
  }, [currentIdx])

  // Summary calculations
  const summary = useMemo(() => {
    const income = parsedTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = parsedTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const net = income - expense
    return { income, expense, net, count: parsedTransactions.length }
  }, [parsedTransactions])

  // Duplicate count
  const duplicateCount = useMemo(() => {
    return parsedTransactions.filter(isDuplicate).length
  }, [parsedTransactions, isDuplicate])

  // ─── Step Renderers ───

  function renderUpload() {
    return (
      <div className="flex flex-col items-center gap-6 text-center py-8">
        <div
          className={cn(
            'relative w-full border-2 border-dashed rounded-2xl p-8 transition-colors',
            dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className="mx-auto size-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium">Seret file CSV ke sini</p>
          <p className="text-sm text-muted-foreground mt-1">atau klik untuk pilih file</p>
        </div>

        <div className="w-full space-y-2 text-xs text-muted-foreground">
          <p>Format didukung:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {BANK_OPTIONS.map(b => (
              <span key={b.value} className="px-2 py-1 rounded-full bg-secondary text-[10px] font-medium">
                {b.icon} {b.label}
              </span>
            ))}
          </div>
        </div>

        {file && (
          <div className="w-full space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <span className="text-lg">📄</span>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <Button className="w-full" size="lg" onClick={() => setStep('bank')}>
              Lanjutkan →
            </Button>
          </div>
        )}
      </div>
    )
  }

  function renderBank() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Pilih bank asal mutasi untuk parsing yang optimal
        </p>

        <div className="grid grid-cols-2 gap-3">
          {BANK_OPTIONS.map(b => (
            <button
              key={b.value}
              onClick={() => setBankType(b.value)}
              className={cn(
                'relative p-4 rounded-xl border-2 transition-all text-left',
                bankType === b.value
                  ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                  : 'border-border hover:border-primary/30 hover:bg-muted/30'
              )}
            >
              {bankType === b.value && (
                <Check className="absolute top-2 right-2 size-4 text-primary" />
              )}
              <span className="text-2xl block mb-1">{b.icon}</span>
              <span className="font-medium text-sm">{b.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={prevStep} className="flex-1">
            ← Kembali
          </Button>
          <Button onClick={handleParse} className="flex-1" disabled={isProcessing}>
            {isProcessing ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Parse CSV
          </Button>
        </div>
      </div>
    )
  }

  function renderPreview() {
    if (parsedTransactions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="size-12 text-destructive/50 mb-3" />
          <p className="font-medium">Tidak ada transaksi valid ditemukan</p>
          <p className="text-sm text-muted-foreground mt-1">Coba pilih bank lain atau periksa file CSV</p>
          <Button variant="outline" onClick={prevStep} className="mt-4">← Pilih Bank Lain</Button>
        </div>
      )
    }

    const displayTransactions = parsedTransactions.slice(0, 20)

    return (
      <div className="space-y-4">
        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/50">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="font-bold text-lg">{parsedTransactions.length}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Masuk</p>
            <p className="font-bold text-sm text-green-600">{formatIDR(summary.income)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Keluar</p>
            <p className="font-bold text-sm text-red-600">{formatIDR(summary.expense)}</p>
          </div>
        </div>

        {/* Date range */}
        <p className="text-xs text-muted-foreground text-center">
          📅 {getDateRange(parsedTransactions)}
          {parsedTransactions.length > 20 && (
            <span className="ml-2">• Menampilkan 20 dari {parsedTransactions.length}</span>
          )}
        </p>

        {/* Transactions table */}
        <div className="max-h-[40vh] overflow-y-auto -mx-1 px-1">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-2 text-[10px] text-muted-foreground uppercase tracking-wider w-6">#</th>
                <th className="text-left pb-2 text-[10px] text-muted-foreground uppercase tracking-wider">Tanggal</th>
                <th className="text-left pb-2 text-[10px] text-muted-foreground uppercase tracking-wider">Deskripsi</th>
                <th className="text-right pb-2 text-[10px] text-muted-foreground uppercase tracking-wider">Jumlah</th>
                <th className="text-center pb-2 text-[10px] text-muted-foreground uppercase tracking-wider">Kategori</th>
              </tr>
            </thead>
            <tbody>
              {displayTransactions.map((tx, idx) => {
                const isDup = isDuplicate(tx)
                const catId = rowCategories[idx] || tx.category
                return (
                  <tr key={idx} className={cn('border-b border-border/30', isDup && 'opacity-40')}>
                    <td className="py-2 text-muted-foreground">{idx + 1}</td>
                    <td className="py-2 font-mono tabular-nums whitespace-nowrap">{tx.date}</td>
                    <td className="py-2 max-w-[120px] truncate" title={tx.description}>
                      {isDup && <span className="text-amber-500 mr-1">⚠</span>}
                      {tx.description}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums font-medium whitespace-nowrap"
                        style={{ color: tx.type === 'income' ? '#22C55E' : '#EF4444' }}>
                      {tx.type === 'income' ? '+' : '-'}{formatIDR(tx.amount)}
                    </td>
                    <td className="py-2 text-center">
                      <Select value={catId} onValueChange={v => handleCategoryChange(idx, v as CategoryId)}>
                        <SelectTrigger className="w-28 h-7 text-[10px] py-0">
                          <SelectValue placeholder="Kategori" />
                        </SelectTrigger>
                        <SelectContent side="bottom" align="end">
                          {CATEGORY_OPTIONS.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              <div className="flex items-center gap-2">
                                <c.icon className="size-3" style={{ color: c.color }} />
                                <span>{c.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={prevStep} className="flex-1">
            ← Kembali
          </Button>
          <Button onClick={nextStep} className="flex-1">
            Lanjutkan →
          </Button>
        </div>
      </div>
    )
  }

  function renderWallet() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Pilih dompet tujuan import transaksi
        </p>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {wallets.map(w => (
            <button
              key={w.id}
              onClick={() => setSelectedWalletId(w.id)}
              className={cn(
                'w-full p-3 rounded-xl border-2 transition-all text-left',
                selectedWalletId === w.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/30 hover:bg-muted/30'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{w.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{w.name}</p>
                </div>
                {selectedWalletId === w.id && <Check className="size-5 text-primary" />}
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={prevStep} className="flex-1">
            ← Kembali
          </Button>
          <Button onClick={nextStep} className="flex-1" disabled={!selectedWalletId}>
            Lanjutkan →
          </Button>
        </div>
      </div>
    )
  }

  function renderConfirm() {
    if (showSuccess) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <Check className="size-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-heading text-xl font-bold mb-2">Import Berhasil!</h3>
          <p className="text-muted-foreground mb-1">
            {importedCount} transaksi berhasil diimpor
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Ke dompet: {wallets.find(w => w.id === selectedWalletId)?.name || '-'}
          </p>
          <div className="flex gap-2 w-full max-w-xs">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Import Lagi
            </Button>
            <Button onClick={onClose} className="flex-1">
              Selesai
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Pemasukan</p>
              <p className="font-bold text-sm text-green-600">{formatIDR(summary.income)}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Pengeluaran</p>
              <p className="font-bold text-sm text-red-600">{formatIDR(summary.expense)}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Bersih</p>
              <p className={cn('font-bold text-sm', summary.net >= 0 ? 'text-green-600' : 'text-red-600')}>
                {summary.net >= 0 ? '+' : ''}{formatIDR(summary.net)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Total transaksi</span>
            <span className="font-medium">{summary.count}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Rentang tanggal</span>
            <span className="font-medium">{getDateRange(parsedTransactions)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Dompet tujuan</span>
            <span className="font-medium">{wallets.find(w => w.id === selectedWalletId)?.name || '-'}</span>
          </div>
        </div>

        {/* Duplicate warning */}
        {duplicateCount > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertCircle className="size-4" />
              <span className="text-sm font-medium">{duplicateCount} transaksi duplikat akan dilewati</span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              (sama tanggal + jumlah + deskripsi dengan data existing)
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={prevStep} className="flex-1">
            ← Kembali
          </Button>
          <Button onClick={handleImport} className="flex-1" disabled={isProcessing}>
            {isProcessing ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Import {summary.count} Transaksi
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1">
        {STEP_IDS.map((s, idx) => (
          <div key={s} className="flex items-center">
            <div className={cn(
              'flex size-8 items-center justify-center rounded-full font-semibold text-xs transition-all',
              step === s
                ? 'bg-primary text-primary-foreground'
                : currentIdx > idx
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
            )}>
              {currentIdx > idx ? <Check className="size-4" /> : idx + 1}
            </div>
            {idx < 4 && (
              <div className={cn(
                'w-8 h-0.5 sm:w-12',
                currentIdx > idx ? 'bg-green-500' : 'bg-border'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground -mt-2 px-1">
        {STEP_LABELS.map((label, idx) => (
          <span key={label} className={cn(
            'w-14 text-center',
            step === STEP_IDS[idx] && 'text-primary font-semibold'
          )}>
            {label}
          </span>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">×</button>
        </div>
      )}

      {/* Step content */}
      {step === 'upload' && renderUpload()}
      {step === 'bank' && renderBank()}
      {step === 'preview' && renderPreview()}
      {step === 'wallet' && renderWallet()}
      {step === 'confirm' && renderConfirm()}
    </div>
  )
}

export function ImportSheet({ open, onClose }: ImportSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Import Mutasi Bank"
      initialSnap={0.9}
    >
      <ImportSheetContent onClose={onClose} />
    </BottomSheet>
  )
}

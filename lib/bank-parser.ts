import { autoCategory, type CategoryId } from './finwise'

export type BankType = 'bca' | 'mandiri' | 'bri' | 'generic'

export interface ParsedTransaction {
  date: string // YYYY-MM-DD
  description: string
  amount: number
  type: 'expense' | 'income'
  category: CategoryId
}

// ─── CSV Helpers ───

/** Parse a single CSV line respecting quoted fields */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
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

/** Split CSV text into rows of cells, skipping empty lines */
function splitCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/)
  const rows: string[][] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    rows.push(parseCSVLine(trimmed))
  }
  return rows
}

/**
 * Parse amount string handling Indonesian number formats:
 * - "1.000.000" → 1000000 (dots as thousand separators)
 * - "1,000,000" → 1000000 (commas as thousand separators)
 * - "1.000.000,50" → 1000000.50 (comma as decimal)
 * - "1,000,000.50" → 1000000.50
 * - "-1.000" → -1000
 * - "CR" / "DB" suffix handling
 */
function parseAmount(raw: string): { amount: number; typeHint: 'income' | 'expense' | null } {
  let s = raw.trim()
  let typeHint: 'income' | 'expense' | null = null

  // Remove currency symbols
  s = s.replace(/[Rr][Pp]\s*/g, '').replace(/IDR\s*/gi, '').trim()

  // Detect DB/CR suffix
  const upperS = s.toUpperCase()
  if (upperS.endsWith(' DB') || upperS.endsWith('DB')) {
    typeHint = 'expense'
    s = s.replace(/\s*DB\s*$/i, '').trim()
  } else if (upperS.endsWith(' CR') || upperS.endsWith('CR')) {
    typeHint = 'income'
    s = s.replace(/\s*CR\s*$/i, '').trim()
  }

  // Remove any whitespace
  s = s.replace(/\s/g, '')

  if (!s || s === '-') return { amount: 0, typeHint }

  // Check for negative
  let negative = false
  if (s.startsWith('-') || s.startsWith('(')) {
    negative = true
    s = s.replace(/^-/, '').replace(/^\(/, '').replace(/\)$/, '')
  }

  // Determine format: Indonesian uses dots for thousands, comma for decimal
  // Western uses commas for thousands, dot for decimal
  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')

  if (lastComma > lastDot) {
    // Indonesian format: 1.000.000,50
    const intPart = s.substring(0, lastComma).replace(/\./g, '')
    const decPart = s.substring(lastComma + 1)
    s = intPart + '.' + decPart
  } else if (lastDot > lastComma) {
    // Could be western (1,000,000.50) or pure dots (1.000.000)
    // Count dots: if more than one, they're thousand separators
    const dotCount = (s.match(/\./g) || []).length
    if (dotCount > 1) {
      // Multiple dots → thousand separators (Indonesian without decimal)
      s = s.replace(/\./g, '')
    } else if (lastComma > 0) {
      // One dot + one comma → comma is thousand separator
      s = s.replace(/,/g, '')
    }
    // else: single dot, no comma → standard decimal
  } else if (lastComma === -1 && lastDot === -1) {
    // No separators, pure number
  } else if (lastComma === lastDot && lastDot === -1) {
    // Nothing to do
  }

  const num = parseFloat(s)
  if (isNaN(num)) return { amount: 0, typeHint }

  return { amount: negative ? -num : num, typeHint }
}

/** Parse date from DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD */
function parseDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // Try DD/MM/YYYY or DD-MM-YYYY
  const match = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (match) {
    let [, day, month, year] = match
    if (year.length === 2) {
      year = (parseInt(year) > 50 ? '19' : '20') + year
    }
    const d = parseInt(day)
    const m = parseInt(month)
    const y = parseInt(year)
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }

  // Try YYYY-MM-DD (already ISO)
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) return s

  return null
}

// ─── Auto-detect bank type from headers ───

function detectBankType(headers: string[]): BankType {
  const joined = headers.map(h => h.toLowerCase()).join(' ')

  if (joined.includes('keterangan') && joined.includes('jumlah') && joined.includes('saldo')) {
    return 'bca'
  }
  if (joined.includes('rincian') || (joined.includes('jumlah') && !joined.includes('debit'))) {
    return 'mandiri'
  }
  if (joined.includes('debit') && joined.includes('kredit')) {
    return 'bri'
  }
  return 'generic'
}

/** Find column index by matching any of the given keywords */
function findCol(headers: string[], keywords: string[]): number {
  for (const kw of keywords) {
    const idx = headers.findIndex(h => h.toLowerCase().includes(kw.toLowerCase()))
    if (idx !== -1) return idx
  }
  return -1
}

// ─── Bank-specific parsers ───

function parseBCA(rows: string[][]): ParsedTransaction[] {
  if (rows.length < 2) return []

  const headers = rows[0]
  const dateCol = findCol(headers, ['tanggal', 'date'])
  const descCol = findCol(headers, ['keterangan', 'description', 'deskripsi'])
  const amountCol = findCol(headers, ['jumlah', 'amount', 'nominal'])

  const results: ParsedTransaction[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length < 2) continue

    const dateStr = dateCol >= 0 ? row[dateCol] : row[0]
    const desc = descCol >= 0 ? row[descCol] : row[1]
    const amtStr = amountCol >= 0 ? row[amountCol] : row[2]

    if (!dateStr && !desc && !amtStr) continue // skip fully empty rows

    const date = parseDate(dateStr)
    if (!date) continue

    const { amount: rawAmount, typeHint } = parseAmount(amtStr || '0')
    const absAmount = Math.abs(rawAmount)
    if (absAmount === 0) continue

    const txType = typeHint ?? (rawAmount >= 0 ? 'income' : 'expense')
    const description = desc?.trim() || 'Transaksi BCA'

    results.push({
      date,
      description,
      amount: absAmount,
      type: txType,
      category: autoCategory(description),
    })
  }

  return results
}

function parseMandiri(rows: string[][]): ParsedTransaction[] {
  if (rows.length < 2) return []

  const headers = rows[0]
  const dateCol = findCol(headers, ['tanggal', 'date'])
  const descCol = findCol(headers, ['rincian', 'keterangan', 'description', 'detail'])
  const amountCol = findCol(headers, ['jumlah', 'amount', 'nominal', 'nilai'])

  const results: ParsedTransaction[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length < 2) continue

    const dateStr = dateCol >= 0 ? row[dateCol] : row[0]
    const desc = descCol >= 0 ? row[descCol] : row[1]
    const amtStr = amountCol >= 0 ? row[amountCol] : row[2]

    if (!dateStr && !desc && !amtStr) continue

    const date = parseDate(dateStr)
    if (!date) continue

    const { amount: rawAmount, typeHint } = parseAmount(amtStr || '0')
    const absAmount = Math.abs(rawAmount)
    if (absAmount === 0) continue

    // Mandiri: positive = income, negative = expense (or use description hints)
    let txType = typeHint ?? (rawAmount >= 0 ? 'income' : 'expense')

    // If the description contains transfer-out or payment keywords, force expense
    const lowerDesc = desc?.toLowerCase() || ''
    if (!typeHint) {
      const expenseHints = ['transfer keluar', 'payment', 'beli', 'bayar', 'debit']
      const incomeHints = ['transfer masuk', 'kredit', 'deposit', 'credit']
      if (expenseHints.some(h => lowerDesc.includes(h))) txType = 'expense'
      else if (incomeHints.some(h => lowerDesc.includes(h))) txType = 'income'
    }

    const description = desc?.trim() || 'Transaksi Mandiri'

    results.push({
      date,
      description,
      amount: absAmount,
      type: txType,
      category: autoCategory(description),
    })
  }

  return results
}

function parseBRI(rows: string[][]): ParsedTransaction[] {
  if (rows.length < 2) return []

  const headers = rows[0]
  const dateCol = findCol(headers, ['waktu', 'tanggal', 'date', 'time'])
  const descCol = findCol(headers, ['keterangan', 'description', 'deskripsi'])
  const debitCol = findCol(headers, ['debit', 'debit/withdrawal', 'pengeluaran'])
  const kreditCol = findCol(headers, ['kredit', 'credit', 'pemasukan', 'deposit'])

  const results: ParsedTransaction[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length < 2) continue

    const dateStr = dateCol >= 0 ? row[dateCol] : row[0]
    const desc = descCol >= 0 ? row[descCol] : row[1]

    if (!dateStr && !desc) continue

    const date = parseDate(dateStr)
    if (!date) continue

    const description = desc?.trim() || 'Transaksi BRI'

    // BRI has separate Debit and Kredit columns
    const debitStr = debitCol >= 0 ? row[debitCol] : ''
    const kreditStr = kreditCol >= 0 ? row[kreditCol] : ''

    const debitAmt = parseAmount(debitStr || '0').amount
    const kreditAmt = parseAmount(kreditStr || '0').amount

    let txType: 'expense' | 'income'
    let amount: number

    if (kreditAmt > 0 && debitAmt > 0) {
      // Both present — shouldn't happen but take the larger
      if (kreditAmt > debitAmt) {
        txType = 'income'
        amount = kreditAmt
      } else {
        txType = 'expense'
        amount = debitAmt
      }
    } else if (kreditAmt > 0) {
      txType = 'income'
      amount = kreditAmt
    } else if (debitAmt > 0) {
      txType = 'expense'
      amount = debitAmt
    } else {
      // Fallback: try combined amount column
      const amtCol = findCol(headers, ['jumlah', 'amount', 'nominal'])
      const amtStr = amtCol >= 0 ? row[amtCol] : ''
      const { amount: rawAmount, typeHint } = parseAmount(amtStr || '0')
      amount = Math.abs(rawAmount)
      if (amount === 0) continue
      txType = typeHint ?? (rawAmount >= 0 ? 'income' : 'expense')
    }

    if (amount === 0) continue

    results.push({
      date,
      description,
      amount,
      type: txType,
      category: autoCategory(description),
    })
  }

  return results
}

function parseGeneric(rows: string[][]): ParsedTransaction[] {
  if (rows.length < 2) return []

  const headers = rows[0]

  // Try to auto-detect columns
  const dateCol = findCol(headers, ['tanggal', 'date', 'waktu', 'time', 'transdate', 'transaction date'])
  const descCol = findCol(headers, ['keterangan', 'description', 'deskripsi', 'detail', 'memo', 'note', 'rincian', 'narrative', 'remarks'])
  const amountCol = findCol(headers, ['jumlah', 'amount', 'nominal', 'nilai', 'value', 'debit', 'credit'])
  const debitCol = findCol(headers, ['debit', 'debit/withdrawal', 'pengeluaran', 'out'])
  const kreditCol = findCol(headers, ['kredit', 'credit', 'pemasukan', 'deposit', 'in'])

  // If we have separate debit/kredit, behave like BRI
  if (debitCol >= 0 && kreditCol >= 0) {
    const briRows = [headers, ...rows.slice(1)]
    return parseBRI(briRows)
  }

  // Find type/flag column
  const typeCol = findCol(headers, ['jenis', 'type', 'tipe', 'flag', 'category'])

  const results: ParsedTransaction[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length < 2) continue

    // Use positional fallback if auto-detect failed
    const dateStr = dateCol >= 0 ? row[dateCol] : row[0]
    const desc = descCol >= 0 ? row[descCol] : row[1]
    const amtStr = amountCol >= 0 ? row[amountCol] : (row[2] || '')

    if (!dateStr && !desc && !amtStr) continue

    const date = parseDate(dateStr)
    if (!date) continue

    const { amount: rawAmount, typeHint } = parseAmount(amtStr || '0')
    const absAmount = Math.abs(rawAmount)
    if (absAmount === 0) continue

    let txType = typeHint ?? (rawAmount >= 0 ? 'income' : 'expense')

    // Check type column if available
    if (!typeHint && typeCol >= 0) {
      const typeVal = (row[typeCol] || '').toLowerCase()
      if (['expense', 'pengeluaran', 'keluar', 'db', 'debit'].some(k => typeVal.includes(k))) {
        txType = 'expense'
      } else if (['income', 'pemasukan', 'masuk', 'cr', 'kredit', 'credit'].some(k => typeVal.includes(k))) {
        txType = 'income'
      }
    }

    const description = desc?.trim() || 'Transaksi'

    results.push({
      date,
      description,
      amount: absAmount,
      type: txType,
      category: autoCategory(description),
    })
  }

  return results
}

// ─── Main Export ───

export function parseBankCSV(csvText: string, bankType: BankType): ParsedTransaction[] {
  if (!csvText || !csvText.trim()) return []

  const rows = splitCSV(csvText)
  if (rows.length < 2) return []

  // Auto-detect if generic
  let effectiveType = bankType
  if (bankType === 'generic') {
    effectiveType = detectBankType(rows[0])
  }

  switch (effectiveType) {
    case 'bca':
      return parseBCA(rows)
    case 'mandiri':
      return parseMandiri(rows)
    case 'bri':
      return parseBRI(rows)
    case 'generic':
    default:
      return parseGeneric(rows)
  }
}

/**
 * Format parsed date range for display
 */
export function getDateRange(transactions: ParsedTransaction[]): string {
  if (transactions.length === 0) return ''
  const dates = transactions.map(t => t.date).sort()
  const first = dates[0]
  const last = dates[dates.length - 1]
  if (first === last) return formatDisplayDate(first)
  return `${formatDisplayDate(first)} — ${formatDisplayDate(last)}`
}

function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`
}

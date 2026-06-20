'use client'

import { useState, useCallback, useEffect, memo } from 'react'

interface CustomKeypadProps {
  value: string
  onChange: (value: string) => void
  onConfirm: () => void
  type: 'expense' | 'income'
}

function formatAmount(val: string): string {
  if (!val) return '0'
  let clean = val.replace(/^0+(?=\d)/, '')
  if (clean.startsWith('.')) clean = '0' + clean
  if (clean === '') clean = '0'
  // Indonesian format: dot for thousands, comma for decimal
  const parts = clean.split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decPart = parts.length > 1 ? ',' + parts[1] : ''
  return intPart + decPart
}

export const CustomKeypad = memo(function CustomKeypad({ value, onChange, onConfirm, type }: CustomKeypadProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [calcBuffer, setCalcBuffer] = useState<string | null>(null)
  const [calcOp, setCalcOp] = useState<string | null>(null)
  const [activeOp, setActiveOp] = useState<string>('')
  const [flash, setFlash] = useState<'income' | 'expense' | null>(null)

  // Sync external value
  useEffect(() => {
    setDisplayValue(value)
  }, [value])

  const evaluate = useCallback(() => {
    if (calcBuffer === null || calcOp === null || displayValue === '') return
    const a = parseFloat(calcBuffer)
    const b = parseFloat(displayValue)
    let result: number
    switch (calcOp) {
      case '+': result = a + b; break
      case '-': result = a - b; break
      case '×': result = a * b; break
      case '÷': result = b !== 0 ? a / b : 0; break
      default: return
    }
    result = Math.round(result * 100) / 100
    const resultStr = result === Math.floor(result) ? String(Math.floor(result)) : String(result)
    setCalcBuffer(null)
    setCalcOp(null)
    setActiveOp('')
    setDisplayValue(resultStr)
    onChange(resultStr)
    setFlash(type)
    setTimeout(() => setFlash(null), 300)
  }, [calcBuffer, calcOp, displayValue, onChange, type])

  const pressOp = useCallback((op: string) => {
    if (calcBuffer !== null && calcOp !== null && displayValue !== '') {
      // Chain calculation
      const a = parseFloat(calcBuffer)
      const b = parseFloat(displayValue)
      let result: number
      switch (calcOp) {
        case '+': result = a + b; break
        case '-': result = a - b; break
        case '×': result = a * b; break
        case '÷': result = b !== 0 ? a / b : 0; break
        default: return
      }
      result = Math.round(result * 100) / 100
      const resultStr = result === Math.floor(result) ? String(Math.floor(result)) : String(result)
      setCalcBuffer(resultStr)
      setDisplayValue('')
      onChange('')
    } else {
      setCalcBuffer(displayValue || '0')
      setDisplayValue('')
      onChange('')
    }
    setCalcOp(op)
    setActiveOp(op)
  }, [calcBuffer, calcOp, displayValue, onChange])

  const press = useCallback((key: string) => {
    setActiveOp('') // Clear operator highlight when pressing number
    if (key === 'del') {
      const newVal = displayValue.slice(0, -1)
      setDisplayValue(newVal)
      onChange(newVal)
    } else if (key === '=') {
      evaluate()
      return
    } else if (key === '000') {
      if (displayValue.replace('.', '').length < 10) {
        const newVal = displayValue + '000'
        setDisplayValue(newVal)
        onChange(newVal)
      }
    } else if (key === '.') {
      if (displayValue.includes('.')) return
      const newVal = displayValue || '0'
      setDisplayValue(newVal + '.')
      onChange(newVal + '.')
    } else {
      // Number key
      if (displayValue.includes('.')) {
        const dec = displayValue.split('.')[1]
        if (dec && dec.length >= 2) return
      }
      if (displayValue.replace('.', '').length >= 10) return
      const newVal = displayValue + key
      setDisplayValue(newVal)
      onChange(newVal)
    }
  }, [displayValue, onChange, evaluate])

  // Ripple effect handler
  const handlePress = useCallback((key: string) => {
    press(key)
    // Subtle haptic on mobile
    if (navigator.vibrate) navigator.vibrate(10)
  }, [press])

  const flashColor = flash === 'income' ? 'text-emerald-400' : flash === 'expense' ? 'text-red-400' : ''

  return (
    <div className="flex flex-col gap-2">
      {/* Amount Display */}
      <div className="text-center py-3">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Jumlah</div>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-lg font-semibold text-muted-foreground">Rp</span>
          <span className={`text-5xl font-extrabold tabular-nums transition-colors duration-300 ${flashColor || 'text-foreground'}`}>
            {formatAmount(displayValue)}
          </span>
          <span className="w-0.5 h-9 bg-primary rounded-full animate-pulse ml-0.5" />
        </div>
        {/* Calc expression hint */}
        {calcBuffer !== null && calcOp !== null && (
          <div className="text-xs text-muted-foreground mt-1">
            {formatAmount(calcBuffer)} {calcOp} {displayValue ? formatAmount(displayValue) : '…'}
          </div>
        )}
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {/* Row 1 */}
        <Key label="1" onClick={() => handlePress('1')} />
        <Key label="2" onClick={() => handlePress('2')} />
        <Key label="3" onClick={() => handlePress('3')} />
        <Key label="÷" onClick={() => handlePressOp('÷')} variant="operator" active={activeOp === '÷'} />

        {/* Row 2 */}
        <Key label="4" onClick={() => handlePress('4')} />
        <Key label="5" onClick={() => handlePress('5')} />
        <Key label="6" onClick={() => handlePress('6')} />
        <Key label="×" onClick={() => handlePressOp('×')} variant="operator" active={activeOp === '×'} />

        {/* Row 3 */}
        <Key label="7" onClick={() => handlePress('7')} />
        <Key label="8" onClick={() => handlePress('8')} />
        <Key label="9" onClick={() => handlePress('9')} />
        <Key label="−" onClick={() => handlePressOp('-')} variant="operator" active={activeOp === '-'} />

        {/* Row 4 */}
        <Key label="." onClick={() => handlePress('.')} variant="special" />
        <Key label="0" onClick={() => handlePress('0')} />
        <Key label="000" onClick={() => handlePress('000')} />
        <Key label="+" onClick={() => handlePressOp('+')} variant="operator" active={activeOp === '+'} />

        {/* Row 5 */}
        <Key
          label="📅"
          onClick={() => {}} // Date picker handled externally
          variant="special"
          sublabel="Hari ini"
        />
        <Key
          label="⌫"
          onClick={() => handlePress('del')}
          variant="delete"
        />
        <Key label="=" onClick={() => handlePress('=')} variant="result" />
        <Key
          label="✓"
          onClick={() => {
            if (calcOp) evaluate()
            onConfirm()
          }}
          variant="confirm"
        />
      </div>
    </div>
  )

  function handlePressOp(op: string) {
    pressOp(op)
    if (navigator.vibrate) navigator.vibrate(10)
  }
})

// Individual key component
function Key({
  label,
  onClick,
  variant = 'default',
  active = false,
  sublabel,
}: {
  label: string
  onClick: () => void
  variant?: 'default' | 'operator' | 'delete' | 'confirm' | 'result' | 'special'
  active?: boolean
  sublabel?: string
}) {
  const baseClasses = 'flex items-center justify-center h-14 rounded-2xl font-semibold text-lg transition-all active:scale-95 select-none'
  const variantClasses = {
    default: 'bg-secondary text-foreground hover:bg-secondary/80',
    operator: active
      ? 'bg-primary text-primary-foreground'
      : 'bg-primary/15 text-primary hover:bg-primary/25',
    delete: 'bg-red-500/15 text-red-400 hover:bg-red-500/25',
    confirm: 'bg-primary text-primary-foreground hover:bg-primary/90',
    result: 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25',
    special: 'bg-secondary text-muted-foreground hover:bg-secondary/80',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {sublabel ? (
        <div className="flex flex-col items-center leading-tight">
          <span className="text-base">{label}</span>
          <span className="text-[9px] opacity-60">{sublabel}</span>
        </div>
      ) : (
        <span>{label}</span>
      )}
    </button>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, TrendingDown, PiggyBank, BarChart3 } from 'lucide-react'
import { useFinwise } from '@/components/finwise-store'
import { buildFinanceSummary } from '@/lib/finwise'
import { cn } from '@/lib/utils'

const QUICK_ACTIONS = [
  { label: 'Analisis keuanganku', icon: BarChart3, prompt: 'Tolong analisis kondisi keuanganku bulan ini.' },
  { label: 'Tips hemat', icon: TrendingDown, prompt: 'Beri aku tips hemat berdasarkan pengeluaranku.' },
  { label: 'Rencana tabungan', icon: PiggyBank, prompt: 'Bantu buat rencana tabungan dari sisa keuanganku.' },
]

interface Msg { id: string; role: 'user' | 'assistant'; text: string }

export function AdvisorChat() {
  const { transactions, budgets, allCategories } = useFinwise()
  const finance = buildFinanceSummary(transactions, budgets, allCategories)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, busy])

  async function submit(text: string) {
    const val = text.trim()
    if (!val || busy) return

    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text: val }
    const aiMsg: Msg = { id: `a-${Date.now()}`, role: 'assistant', text: '' }
    setMessages(prev => [...prev, userMsg, aiMsg])
    setInput('')
    setBusy(true)
    setError('')

    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.text })),
          finance,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Gagal' }))
        setError(err.error || `Error ${res.status}`)
        setMessages(prev => prev.slice(0, -1)) // remove empty ai msg
        setBusy(false)
        return
      }

      const reader = res.body?.getReader()
      const dec = new TextDecoder()
      if (!reader) throw new Error('No stream')

      let buf = '', full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d === '[DONE]') continue
          try {
            const j = JSON.parse(d)
            if (j.type === 'text' && j.text) {
              full += j.text
              setMessages(prev => {
                const up = [...prev]
                const last = up[up.length - 1]
                if (last?.role === 'assistant') last.text = full
                return [...up]
              })
            }
            if (j.type === 'error') {
              setError(j.errorText || 'Error dari AI')
            }
          } catch {}
        }
      }

      if (!full) setError('AI tidak merespons. Coba lagi.')
    } catch (e) {
      setError('Koneksi gagal. Cek internet kamu.')
      setMessages(prev => prev.slice(0, -1))
    }
    setBusy(false)
  }

  return (
    <div className="flex h-[60vh] flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary neon-glow">
              <Sparkles className="size-7" />
            </div>
            <div>
              <p className="font-heading font-semibold">Halo! Aku FinWise AI</p>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                Tanya apa saja soal keuanganmu. Aku sudah baca data bulan ini ✨
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            {messages.map(m => (
              <div key={m.id} className={cn(
                'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'ml-auto rounded-br-md bg-primary text-primary-foreground'
                  : 'mr-auto rounded-bl-md bg-secondary text-foreground',
              )}>
                <p className="whitespace-pre-wrap">{m.text || (busy && m === messages[messages.length - 1] ? '⏳' : '')}</p>
              </div>
            ))}
            {busy && !messages[messages.length - 1]?.text && (
              <div className="mr-auto rounded-2xl rounded-bl-md bg-secondary px-3.5 py-2.5">
                <span className="flex gap-1">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </span>
              </div>
            )}
          </div>
        )}
        {error && (
          <div className="mx-auto my-2 max-w-[85%] rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
            ⚠️ {error}
          </div>
        )}
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 py-3">
          {QUICK_ACTIONS.map(qa => {
            const Icon = qa.icon
            return (
              <button key={qa.label} type="button" onClick={() => submit(qa.prompt)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium transition hover:border-primary/50 hover:text-primary">
                <Icon className="size-3.5" />{qa.label}
              </button>
            )
          })}
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); submit(input) }} className="mt-2 flex items-center gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} disabled={busy}
          placeholder="Tanya soal keuanganmu..."
          className="h-11 flex-1 rounded-full border border-border bg-surface-2 px-4 text-sm outline-none transition focus:border-primary/60 disabled:opacity-50" />
        <button type="submit" disabled={!input.trim() || busy}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition active:scale-95 disabled:opacity-40"
          aria-label="Kirim">
          <Send className="size-4" />
        </button>
      </form>
    </div>
  )
}

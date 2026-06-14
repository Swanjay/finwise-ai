'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Send, Sparkles, TrendingDown, PiggyBank, BarChart3 } from 'lucide-react'
import { useFinwise } from '@/components/finwise-store'
import { buildFinanceSummary } from '@/lib/finwise'
import { cn } from '@/lib/utils'

const QUICK_ACTIONS = [
  { label: 'Analisis keuanganku', icon: BarChart3, prompt: 'Tolong analisis kondisi keuanganku bulan ini secara menyeluruh.' },
  { label: 'Tips hemat', icon: TrendingDown, prompt: 'Beri aku tips hemat yang spesifik berdasarkan pengeluaranku.' },
  { label: 'Rencana tabungan', icon: PiggyBank, prompt: 'Bantu aku buat rencana tabungan yang realistis dari sisa keuanganku.' },
]

function messageText(parts: { type: string; text?: string }[] | undefined) {
  if (!parts) return ''
  return parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text ?? '')
    .join('')
}

export function AdvisorChat() {
  const { transactions, budgets, allCategories } = useFinwise()
  const finance = useMemo(
    () => buildFinanceSummary(transactions, budgets, allCategories),
    [transactions, budgets, allCategories],
  )
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/advisor' }),
  })

  const busy = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  function submit(text: string) {
    const value = text.trim()
    if (!value || busy) return
    sendMessage({ text: value }, { body: { finance } })
    setInput('')
  }

  return (
    <div className="flex h-[60vh] flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary neon-glow">
              <Sparkles className="size-7" />
            </div>
            <div>
              <p className="font-heading font-semibold">Halo! Aku FinWise AI</p>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                Tanya apa saja soal keuanganmu. Aku sudah baca data bulan ini.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'ml-auto rounded-br-md bg-primary text-primary-foreground'
                    : 'mr-auto rounded-bl-md bg-secondary text-foreground',
                )}
              >
                <p className="whitespace-pre-wrap">{messageText(m.parts)}</p>
              </div>
            ))}
            {status === 'submitted' && (
              <div className="mr-auto rounded-2xl rounded-bl-md bg-secondary px-3.5 py-2.5">
                <span className="flex gap-1">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </span>
              </div>
            )}
            {error && (
              <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                ⚠️ {error.message || 'Terjadi kesalahan. Coba lagi.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick actions */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 py-3">
          {QUICK_ACTIONS.map((qa) => {
            const Icon = qa.icon
            return (
              <button
                key={qa.label}
                type="button"
                onClick={() => submit(qa.prompt)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium transition hover:border-primary/50 hover:text-primary"
              >
                <Icon className="size-3.5" />
                {qa.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
        className="mt-2 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanya soal keuanganmu..."
          className="h-11 flex-1 rounded-full border border-border bg-surface-2 px-4 text-sm outline-none transition focus:border-primary/60"
        />
        <button
          type="submit"
          disabled={!input.trim() || busy}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition active:scale-95 disabled:opacity-40"
          aria-label="Kirim"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  )
}

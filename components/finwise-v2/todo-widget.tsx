'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Check, Plus } from 'lucide-react'

interface TodoItem {
  id: string
  text: string
  done: boolean
}

interface TodoWidgetProps {
  initialItems?: TodoItem[]
  className?: string
}

const DEFAULT_TODOS: TodoItem[] = [
  { id: '1', text: 'Pay electricity bill', done: true },
  { id: '2', text: 'Review monthly budget', done: true },
  { id: '3', text: 'Transfer savings to goal', done: false },
  { id: '4', text: 'Check investment portfolio', done: false },
  { id: '5', text: 'Set up auto-pay for bills', done: false },
]

export function TodoWidget({ initialItems, className }: TodoWidgetProps) {
  const [items, setItems] = useState<TodoItem[]>(initialItems || DEFAULT_TODOS)
  const [newText, setNewText] = useState('')

  const toggle = (id: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, done: !item.done } : item))
  }

  const add = () => {
    if (!newText.trim()) return
    setItems((prev) => [...prev, { id: Date.now().toString(), text: newText.trim(), done: false }])
    setNewText('')
  }

  return (
    <div className={cn('bg-card rounded-2xl p-4 border border-border shadow-sm', className)}>
      <h3 className="text-sm font-bold text-foreground mb-3">Todo&apos;s</h3>

      <div
        className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-border-strong cursor-pointer mb-2 hover:border-primary hover:bg-primary/5 transition-colors"
        onClick={add}
      >
        <Plus className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add todo, press Enter"
          className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground text-foreground"
        />
      </div>

      <div className="space-y-0.5">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => toggle(item.id)}
            className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div
              className={cn(
                'w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all',
                item.done
                  ? 'bg-primary border-primary'
                  : 'border-border-strong'
              )}
            >
              {item.done && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
            </div>
            <span
              className={cn(
                'text-xs transition-all',
                item.done ? 'text-muted-foreground line-through' : 'text-foreground'
              )}
            >
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

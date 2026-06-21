"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, Loader2 } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "warning"
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onCancel])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!mounted || !open) return null

  const iconColor = variant === "danger" ? "text-destructive" : "text-amber-500"
  const confirmBg = variant === "danger" ? "bg-destructive hover:bg-destructive/90" : "bg-amber-500 hover:bg-amber-500/90"

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.15s_ease]"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl bg-card border border-border shadow-xl animate-[slideUp_0.2s_ease] p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Icon */}
          <div className={`rounded-full bg-destructive/10 p-3 ${iconColor}`}>
            <AlertTriangle className="size-6" />
          </div>

          {/* Text */}
          <div className="space-y-1.5">
            <h2 id="confirm-title" className="text-base font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 w-full pt-2">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary ${confirmBg}`}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Hook for easy use ───
export function useConfirmDelete() {
  const [state, setState] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({ open: false, title: "", description: "", onConfirm: () => {} })

  const confirm = useCallback((opts: { title: string; description: string; onConfirm: () => void }) => {
    setState({ open: true, ...opts })
  }, [])

  const Dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      description={state.description}
      onConfirm={() => {
        state.onConfirm()
        setState(s => ({ ...s, open: false }))
      }}
      onCancel={() => setState(s => ({ ...s, open: false }))}
    />
  )

  return { confirm, Dialog }
}

'use client'

import React from 'react'
import FinWiseLogo from '@/components/finwise-logo'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('FinWise ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <FinWiseLogo size={80} showText={false} />
          <div className="mt-6 flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            <h2 className="font-heading text-lg font-bold">Terjadi Kesalahan</h2>
          </div>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Sepertinya ada yang tidak beres. Coba muat ulang halaman atau kembali ke beranda.
          </p>
          {this.state.error && (
            <p className="mt-2 max-w-sm rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive font-mono break-all">
              {this.state.error.message}
            </p>
          )}
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={this.handleReset}
            >
              <RefreshCw className="size-4" />
              Coba Lagi
            </Button>
            <Button
              className="gap-2"
              onClick={() => window.location.href = '/'}
            >
              Kembali ke Home
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

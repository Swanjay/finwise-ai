"use client"

import { useEffect } from "react"
import { SessionProvider } from "next-auth/react"
import { initTheme } from "@/lib/themes"

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initTheme()
  }, [])

  return <SessionProvider>{children}</SessionProvider>
}

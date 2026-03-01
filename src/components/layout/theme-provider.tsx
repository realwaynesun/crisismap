'use client'

import { useEffect, useRef } from 'react'
import { useThemeStore } from '@/stores/theme-store'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme)
  const hydrated = useRef(false)

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    const el = document.documentElement
    el.classList.remove('light', 'dark')
    el.classList.add(theme)
  }, [theme])

  return <>{children}</>
}

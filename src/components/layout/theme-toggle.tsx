'use client'

import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/stores/theme-store'

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggleTheme)
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <button
      onClick={toggle}
      className="shrink-0 p-1.5 rounded-md border border-[var(--border)] hover:border-[var(--text-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Icon size={14} />
    </button>
  )
}

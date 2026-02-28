'use client'

import { useLocale } from '@/lib/locale-context'
import { MarketStrip } from '@/components/markets/market-strip'
import { LocaleSwitcher } from './locale-switcher'

export function Header() {
  const { dict } = useLocale()

  return (
    <header className="flex items-center gap-4 px-4 h-12 bg-[var(--bg-secondary)] border-b border-[var(--border)] shrink-0">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-base font-bold text-[var(--text-primary)]">
          {dict.header.title}
        </span>
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-green)]/15 text-[10px] font-semibold text-[var(--accent-green)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-green)] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent-green)]" />
          </span>
          {dict.header.live}
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        <MarketStrip />
      </div>
      <LocaleSwitcher />
    </header>
  )
}

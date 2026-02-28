'use client'

import { useMarkets } from '@/hooks/use-markets'
import { useLocale } from '@/lib/locale-context'

export function PolymarketPanel() {
  const { contracts, error, isLoading } = useMarkets()
  const { dict } = useLocale()

  if (isLoading) {
    return (
      <div className="h-16 flex items-center justify-center text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] border-t border-[var(--border)]">
        {dict.polymarket.loading}
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-16 flex items-center justify-center text-xs text-[var(--accent-red)] bg-[var(--bg-secondary)] border-t border-[var(--border)]">
        {dict.polymarket.error}
      </div>
    )
  }

  if (!contracts.length) return null

  return (
    <div className="flex items-stretch gap-3 overflow-x-auto px-4 py-2 bg-[var(--bg-secondary)] border-t border-[var(--border)] no-scrollbar">
      {contracts.map((c) => {
        const pct = Math.round(c.probability)
        const barColor = pct > 70
          ? 'var(--accent-red)'
          : pct > 40
            ? 'var(--accent-yellow)'
            : 'var(--accent-green)'

        return (
          <a
            key={c.id}
            href={c.url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 w-56 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] p-2.5 hover:border-[var(--accent-blue)] transition-colors"
          >
            <p className="text-xs text-[var(--text-primary)] line-clamp-2 mb-2 leading-tight">
              {c.question}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-primary)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: barColor }}
                />
              </div>
              <span className="text-xs font-bold" style={{ color: barColor }}>
                {pct}%
              </span>
            </div>
          </a>
        )
      })}
    </div>
  )
}

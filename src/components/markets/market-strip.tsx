'use client'

import { useIndicators } from '@/hooks/use-indicators'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function MarketStrip() {
  const { indicators, isLoading } = useIndicators()

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        Loading markets...
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
      {indicators.map((m) => {
        const positive = m.change >= 0
        const color = positive ? 'var(--accent-green)' : 'var(--accent-red)'
        const Icon = positive ? TrendingUp : TrendingDown
        const arrow = positive ? '\u25B2' : '\u25BC'

        return (
          <div
            key={m.symbol}
            className="flex items-center gap-1.5 whitespace-nowrap text-xs shrink-0"
          >
            <span className="font-medium text-[var(--text-secondary)]">
              {m.name}
            </span>
            <span className="text-[var(--text-primary)]">
              {m.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span style={{ color }} className="flex items-center gap-0.5">
              <Icon size={10} />
              {arrow}{Math.abs(m.changePercent).toFixed(1)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

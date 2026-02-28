'use client'

import { useEventStore } from '@/stores/event-store'
import { useLocale } from '@/lib/locale-context'
import { Search } from 'lucide-react'
import { regions } from '@/lib/regions'
import type { Region } from '@/lib/regions'
import type { EventCategory, ThreatLevel } from '@/types'

const categories: EventCategory[] = [
  'conflict', 'military', 'diplomatic', 'economic',
  'terrorism', 'disaster', 'earthquake', 'statement', 'prediction',
]

const levels: ThreatLevel[] = ['critical', 'high', 'medium', 'low', 'info']

const levelColors: Record<ThreatLevel, string> = {
  critical: 'var(--accent-red)',
  high: 'var(--accent-orange)',
  medium: 'var(--accent-yellow)',
  low: 'var(--accent-blue)',
  info: 'var(--accent-green)',
}

export function FeedFilters() {
  const filters = useEventStore((s) => s.filters)
  const setFilters = useEventStore((s) => s.setFilters)
  const region = useEventStore((s) => s.region)
  const setRegion = useEventStore((s) => s.setRegion)
  const { dict } = useLocale()

  const toggleCategory = (c: EventCategory) => {
    const next = filters.categories.includes(c)
      ? filters.categories.filter((x) => x !== c)
      : [...filters.categories, c]
    setFilters({ categories: next })
  }

  const toggleLevel = (l: ThreatLevel) => {
    const next = filters.levels.includes(l)
      ? filters.levels.filter((x) => x !== l)
      : [...filters.levels, l]
    setFilters({ levels: next })
  }

  return (
    <div className="flex flex-col gap-2 pb-2 border-b border-[var(--border)]">
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {regions.map((r: Region) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-colors ${
              region === r
                ? 'bg-[var(--accent-blue)] border-[var(--accent-blue)] text-white'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
            }`}
          >
            {dict.regions[r] ?? r}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          type="text"
          placeholder={dict.filters.search}
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-blue)]"
        />
      </div>

      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => toggleCategory(c)}
            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
              filters.categories.includes(c)
                ? 'bg-[var(--accent-blue)] border-[var(--accent-blue)] text-white'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
            }`}
          >
            {dict.categories[c] ?? c}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        {levels.map((l) => (
          <button
            key={l}
            onClick={() => toggleLevel(l)}
            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
              filters.levels.includes(l)
                ? 'text-white border-transparent'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
            }`}
            style={filters.levels.includes(l) ? { background: levelColors[l] } : undefined}
          >
            {dict.levels[l] ?? l}
          </button>
        ))}
      </div>
    </div>
  )
}

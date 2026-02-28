'use client'

import { useEventStore } from '@/stores/event-store'
import { EventCard } from './event-card'

export function EventFeed() {
  const events = useEventStore((s) => s.events)
  const filters = useEventStore((s) => s.filters)
  const fetchError = useEventStore((s) => s.fetchError)

  const filtered = events.filter((e) => {
    if (filters.categories.length && !filters.categories.includes(e.category))
      return false
    if (filters.levels.length && !filters.levels.includes(e.level))
      return false
    if (filters.sources.length && !filters.sources.includes(e.source))
      return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const text = `${e.title} ${e.summary} ${e.location?.name ?? ''}`.toLowerCase()
      if (!text.includes(q)) return false
    }
    return true
  }).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  if (fetchError && !events.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-[var(--accent-red)]">
        Failed to load events: {fetchError}
      </div>
    )
  }

  if (!filtered.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-[var(--text-secondary)]">
        No events match current filters
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
      {filtered.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </div>
  )
}

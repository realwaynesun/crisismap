'use client'

import { useEventStore } from '@/stores/event-store'
import { useMapStore } from '@/stores/map-store'
import { useLocale } from '@/lib/locale-context'
import { matchesRegion } from '@/lib/regions'
import { formatHour, formatDateTime } from '@/lib/format'
import type { EventCategory } from '@/types'
import {
  Crosshair, MessageSquare, Shield, Handshake, TrendingUp,
  AlertTriangle, CloudLightning, BarChart3, Activity,
} from 'lucide-react'

const categoryIcons: Record<EventCategory, React.ElementType> = {
  conflict: Crosshair, statement: MessageSquare, military: Shield,
  diplomatic: Handshake, economic: TrendingUp, terrorism: AlertTriangle,
  disaster: CloudLightning, prediction: BarChart3, earthquake: Activity,
}

function groupByHour(events: ReturnType<typeof useEventStore.getState>['events']) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
  const groups: Record<string, typeof sorted> = {}
  for (const e of sorted) {
    const key = new Date(e.timestamp).toISOString().slice(0, 13)
    ;(groups[key] ??= []).push(e)
  }
  return groups
}

export function TimelineView() {
  const allEvents = useEventStore((s) => s.events)
  const region = useEventStore((s) => s.region)
  const fetchError = useEventStore((s) => s.fetchError)
  const select = useEventStore((s) => s.setSelectedEvent)
  const flyTo = useMapStore((s) => s.flyTo)
  const { dict, timezone, dateLocale } = useLocale()
  const events = allEvents.filter((e) => {
    const text = `${e.title} ${e.summary} ${e.location?.name ?? ''}`
    return matchesRegion(region, text, e.location?.country)
  })
  const groups = groupByHour(events)
  const fmtOpts = { dict, timezone, dateLocale }

  if (fetchError && !events.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-[var(--accent-red)]">
        {dict.timeline.error}: {fetchError}
      </div>
    )
  }

  if (!Object.keys(groups).length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-[var(--text-secondary)]">
        {dict.timeline.empty}
      </div>
    )
  }

  return (
    <div className="overflow-y-auto flex-1 pr-1">
      {Object.entries(groups).map(([hour, events]) => (
        <div key={hour} className="mb-4">
          <div className="text-[10px] font-semibold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
            {formatDateTime(hour + ':00:00Z', fmtOpts)}
          </div>
          <div className="border-l-2 border-[var(--border)] ml-2 pl-4 flex flex-col gap-1.5">
            {events.map((e) => {
              const Icon = categoryIcons[e.category]
              return (
                <button
                  key={e.id}
                  onClick={() => {
                    select(e.id)
                    if (e.location) flyTo(e.location.lat, e.location.lng)
                  }}
                  className="flex items-center gap-2 text-left group hover:bg-[var(--bg-tertiary)] rounded px-2 py-1 -ml-2 transition-colors"
                >
                  <span className="text-[10px] text-[var(--text-secondary)] w-10 shrink-0">
                    {formatHour(e.timestamp, fmtOpts)}
                  </span>
                  <Icon size={12} className="text-[var(--text-secondary)] shrink-0" />
                  <span className="text-xs text-[var(--text-primary)] truncate group-hover:text-[var(--accent-blue)]">
                    {e.title}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

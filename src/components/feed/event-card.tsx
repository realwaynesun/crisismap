'use client'

import type { CrisisEvent, EventCategory, ThreatLevel } from '@/types'
import { useEventStore } from '@/stores/event-store'
import { useMapStore } from '@/stores/map-store'
import { useLocale } from '@/lib/locale-context'
import { timeAgo } from '@/lib/format'
import {
  Crosshair, MessageSquare, Shield, Handshake, TrendingUp,
  AlertTriangle, CloudLightning, BarChart3, Activity, MapPin,
} from 'lucide-react'

const categoryIcons: Record<EventCategory, React.ElementType> = {
  conflict: Crosshair,
  statement: MessageSquare,
  military: Shield,
  diplomatic: Handshake,
  economic: TrendingUp,
  terrorism: AlertTriangle,
  disaster: CloudLightning,
  prediction: BarChart3,
  earthquake: Activity,
}

const levelColors: Record<ThreatLevel, string> = {
  critical: 'var(--accent-red)',
  high: 'var(--accent-orange)',
  medium: 'var(--accent-yellow)',
  low: 'var(--accent-blue)',
  info: 'var(--accent-green)',
}

export function EventCard({ event }: { event: CrisisEvent }) {
  const selectedId = useEventStore((s) => s.selectedEventId)
  const select = useEventStore((s) => s.setSelectedEvent)
  const flyTo = useMapStore((s) => s.flyTo)
  const { dict } = useLocale()

  const Icon = categoryIcons[event.category]
  const dotColor = levelColors[event.level]
  const isSelected = selectedId === event.id

  const handleClick = () => {
    select(event.id)
    if (event.location) flyTo(event.location.lat, event.location.lng)
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? 'bg-[var(--bg-tertiary)] border-[var(--accent-blue)]'
          : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--text-secondary)]'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
        <Icon size={13} className="text-[var(--text-secondary)] shrink-0" />
        <span className="text-[10px] text-[var(--text-secondary)] ml-auto">
          {timeAgo(event.timestamp, { dict })}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug mb-1">
        {event.title}
      </h3>
      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-2">
        {event.summary}
      </p>

      <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
        {event.location && (
          <span className="flex items-center gap-0.5">
            <MapPin size={10} /> {event.location.name}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          {event.source}
          {event.sourceTier === 'private' && <span title="Private source">&#128274;</span>}
        </span>
      </div>
    </button>
  )
}

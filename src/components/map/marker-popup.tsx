'use client'

import type { CrisisEvent } from '@/types'
import { timeAgo } from '@/lib/format'
import { ExternalLink, MapPin } from 'lucide-react'

export function MarkerPopup({ event }: { event: CrisisEvent }) {
  return (
    <div className="max-w-xs">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1 leading-snug">
        {event.title}
      </h3>
      <p className="text-xs text-[var(--text-secondary)] mb-2 leading-relaxed line-clamp-3">
        {event.summary}
      </p>
      <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
        {event.location && (
          <span className="flex items-center gap-0.5">
            <MapPin size={10} /> {event.location.name}
          </span>
        )}
        <span>{event.source}</span>
        <span>{timeAgo(event.timestamp)}</span>
      </div>
      {event.url && (
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-[10px] text-[var(--accent-blue)] hover:underline"
        >
          Read article <ExternalLink size={10} />
        </a>
      )}
    </div>
  )
}

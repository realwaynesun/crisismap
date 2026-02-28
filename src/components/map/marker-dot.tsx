'use client'

import type { CrisisEvent, ThreatLevel } from '@/types'

const levelColors: Record<ThreatLevel, string> = {
  critical: 'var(--accent-red)',
  high: 'var(--accent-orange)',
  medium: 'var(--accent-yellow)',
  low: 'var(--accent-blue)',
  info: 'var(--accent-green)',
}

const levelSizes: Record<ThreatLevel, number> = {
  critical: 16, high: 12, medium: 10, low: 8, info: 6,
}

export function MarkerDot({ event, onClick }: { event: CrisisEvent; onClick: () => void }) {
  const size = levelSizes[event.level]
  const color = levelColors[event.level]
  return (
    <button
      onClick={onClick}
      className="relative cursor-pointer"
      title={event.title}
    >
      <div
        className="rounded-full border border-black/30"
        style={{ width: size, height: size, background: color }}
      />
      {event.sourceTier === 'private' && (
        <span className="absolute -top-1 -right-1.5 text-[8px]">&#128274;</span>
      )}
    </button>
  )
}

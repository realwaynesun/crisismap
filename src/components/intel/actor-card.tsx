'use client'

import type { ActorStatus } from '@/types'
import { timeAgo } from '@/lib/format'
import { MessageSquare } from 'lucide-react'

export function ActorCard({ actor }: { actor: ActorStatus }) {
  const hasStatement = !!actor.lastStatement

  return (
    <div
      className={`p-3 rounded-lg border transition-colors ${
        hasStatement
          ? 'bg-[var(--bg-secondary)] border-[var(--border)]'
          : 'bg-[var(--bg-tertiary)] border-[var(--accent-yellow)]/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{actor.flag}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {actor.name}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {actor.role}
          </div>
        </div>
        <span className="shrink-0 px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[10px] font-medium text-[var(--text-secondary)] border border-[var(--border)]">
          {actor.eventCount}
        </span>
      </div>

      {hasStatement ? (
        <div className="flex items-start gap-1.5">
          <MessageSquare size={11} className="text-[var(--text-secondary)] mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-primary)] line-clamp-2 leading-relaxed">
              {actor.lastStatement}
            </p>
            {actor.lastStatementTime && (
              <span className="text-[10px] text-[var(--text-secondary)]">
                {timeAgo(actor.lastStatementTime)}
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-[var(--accent-yellow)] italic">
          No recent statements
        </p>
      )}
    </div>
  )
}

'use client'

import { useEventStore } from '@/stores/event-store'
import { useLocale } from '@/lib/locale-context'
import { useEvents } from '@/hooks/use-events'
import { FeedFilters } from '@/components/feed/feed-filters'
import { EventFeed } from '@/components/feed/event-feed'
import { TimelineView } from '@/components/feed/timeline-view'
import { ActorsPanel } from '@/components/intel/actors-panel'
import type { SidebarTab } from '@/types'

export function Sidebar() {
  const activeTab = useEventStore((s) => s.activeTab)
  const setActiveTab = useEventStore((s) => s.setActiveTab)
  const { dict } = useLocale()

  const tabs: { id: SidebarTab; label: string }[] = [
    { id: 'feed', label: dict.tabs.feed },
    { id: 'timeline', label: dict.tabs.timeline },
    { id: 'intel', label: dict.tabs.intel },
  ]

  useEvents()

  return (
    <aside className="flex flex-col h-full bg-[var(--bg-primary)] border-r border-[var(--border)]">
      <div className="flex border-b border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab === t.id
                ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-3 gap-3">
        {activeTab === 'feed' && (
          <>
            <FeedFilters />
            <EventFeed />
          </>
        )}
        {activeTab === 'timeline' && <TimelineView />}
        {activeTab === 'intel' && <ActorsPanel />}
      </div>
    </aside>
  )
}

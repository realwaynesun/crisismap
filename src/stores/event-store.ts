import { create } from 'zustand'
import type { CrisisEvent, FilterState, SidebarTab } from '@/types'
import type { Region } from '@/lib/regions'

interface EventState {
  events: CrisisEvent[]
  fetchError: string | null
  filters: FilterState
  region: Region
  selectedEventId: string | null
  activeTab: SidebarTab
  timezone: string
  setEvents: (events: CrisisEvent[]) => void
  setFetchError: (error: string | null) => void
  setFilters: (filters: Partial<FilterState>) => void
  setRegion: (region: Region) => void
  setSelectedEvent: (id: string | null) => void
  setActiveTab: (tab: SidebarTab) => void
  setTimezone: (tz: string) => void
  filteredEvents: () => CrisisEvent[]
}

const defaultFilters: FilterState = {
  categories: [],
  levels: [],
  sources: [],
  search: '',
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  fetchError: null,
  filters: defaultFilters,
  region: 'middle-east' as Region,
  selectedEventId: null,
  activeTab: 'feed',
  timezone: '',

  setTimezone: (tz) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz })
    } catch {
      return
    }
    set({ timezone: tz })
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('crisismap-timezone', tz) } catch {}
    }
  },

  setEvents: (events) => set({ events, fetchError: null }),
  setFetchError: (error) => set({ fetchError: error }),

  setFilters: (partial) =>
    set((s) => ({ filters: { ...s.filters, ...partial } })),

  setRegion: (region) => set({ region }),

  setSelectedEvent: (id) => set({ selectedEventId: id }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  filteredEvents: () => {
    const { events, filters } = get()
    return events.filter((e) => {
      if (filters.categories.length && !filters.categories.includes(e.category))
        return false
      if (filters.levels.length && !filters.levels.includes(e.level))
        return false
      if (filters.sources.length && !filters.sources.includes(e.source))
        return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const haystack = `${e.title} ${e.summary} ${e.location?.name ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  },
}))

import { create } from 'zustand'
import type { CrisisEvent, FilterState, SidebarTab } from '@/types'

interface EventState {
  events: CrisisEvent[]
  fetchError: string | null
  filters: FilterState
  selectedEventId: string | null
  activeTab: SidebarTab
  setEvents: (events: CrisisEvent[]) => void
  setFetchError: (error: string | null) => void
  setFilters: (filters: Partial<FilterState>) => void
  setSelectedEvent: (id: string | null) => void
  setActiveTab: (tab: SidebarTab) => void
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
  selectedEventId: null,
  activeTab: 'feed',

  setEvents: (events) => set({ events, fetchError: null }),
  setFetchError: (error) => set({ fetchError: error }),

  setFilters: (partial) =>
    set((s) => ({ filters: { ...s.filters, ...partial } })),

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

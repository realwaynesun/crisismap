import useSWR from 'swr'
import { useEffect } from 'react'
import { useEventStore } from '@/stores/event-store'
import type { CrisisEvent } from '@/types'

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json()).then((j) => j.data ?? [])

export function useEvents() {
  const setEvents = useEventStore((s) => s.setEvents)

  const { data, error, isLoading } = useSWR<CrisisEvent[]>(
    '/api/events',
    fetcher,
    { refreshInterval: 30_000 },
  )

  useEffect(() => {
    if (data) setEvents(data)
  }, [data, setEvents])

  return { events: data ?? [], error, isLoading }
}

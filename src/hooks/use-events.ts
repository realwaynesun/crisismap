import useSWR from 'swr'
import { useEffect } from 'react'
import { useEventStore } from '@/stores/event-store'
import { useLocale } from '@/lib/locale-context'
import type { CrisisEvent } from '@/types'

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`API ${r.status}`)
  const j = await r.json()
  if (!j.success) throw new Error(j.error ?? 'API error')
  return j.data ?? []
}

export function useEvents() {
  const setEvents = useEventStore((s) => s.setEvents)
  const setFetchError = useEventStore((s) => s.setFetchError)
  const { locale } = useLocale()

  const url = locale === 'zh-TW' ? '/api/events?locale=zh-TW' : '/api/events'

  const { data, error, isLoading } = useSWR<CrisisEvent[]>(
    url,
    fetcher,
    { refreshInterval: 30_000 },
  )

  useEffect(() => {
    if (data) setEvents(data)
  }, [data, setEvents])

  useEffect(() => {
    setFetchError(error ? String(error.message ?? error) : null)
  }, [error, setFetchError])

  return { events: data ?? [], error, isLoading }
}

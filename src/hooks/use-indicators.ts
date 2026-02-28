import useSWR from 'swr'
import type { MarketIndicator } from '@/types'

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json()).then((j) => j.data ?? [])

export function useIndicators() {
  const { data, error, isLoading } = useSWR<MarketIndicator[]>(
    '/api/indicators',
    fetcher,
    { refreshInterval: 300_000 },
  )

  return { indicators: data ?? [], error, isLoading }
}

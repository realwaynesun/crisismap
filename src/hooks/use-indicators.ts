import useSWR from 'swr'
import type { MarketIndicator } from '@/types'

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`API ${r.status}`)
  const j = await r.json()
  if (!j.success) throw new Error(j.error ?? 'API error')
  return j.data ?? []
}

export function useIndicators() {
  const { data, error, isLoading } = useSWR<MarketIndicator[]>(
    '/api/indicators',
    fetcher,
    { refreshInterval: 300_000 },
  )

  return { indicators: data ?? [], error, isLoading }
}

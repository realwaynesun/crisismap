import useSWR from 'swr'
import type { PolymarketContract } from '@/types'

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json()).then((j) => j.data ?? [])

export function useMarkets() {
  const { data, error, isLoading } = useSWR<PolymarketContract[]>(
    '/api/markets',
    fetcher,
    { refreshInterval: 300_000 },
  )

  return { contracts: data ?? [], error, isLoading }
}

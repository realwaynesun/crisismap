import useSWR from 'swr'
import type { PolymarketContract } from '@/types'

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`API ${r.status}`)
  const j = await r.json()
  if (!j.success) throw new Error(j.error ?? 'API error')
  return j.data ?? []
}

export function useMarkets() {
  const { data, error, isLoading } = useSWR<PolymarketContract[]>(
    '/api/markets',
    fetcher,
    { refreshInterval: 300_000 },
  )

  return { contracts: data ?? [], error, isLoading }
}

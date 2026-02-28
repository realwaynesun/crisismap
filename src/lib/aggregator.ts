import type { CrisisEvent, FetchOptions } from '@/types'
import { getSources } from './sources/registry'
import { getCached, setCache } from './cache'

const CACHE_KEY = 'aggregator:events'
const CACHE_TTL = 30_000

export async function fetchAllEvents(options?: FetchOptions): Promise<CrisisEvent[]> {
  const cached = getCached<CrisisEvent[]>(CACHE_KEY)
  if (cached) return cached

  const sources = await getSources()
  const results = await Promise.allSettled(
    sources.map(s =>
      s.fetch(options).catch(err => {
        console.error(`[${s.id}] fetch failed:`, err.message)
        return [] as CrisisEvent[]
      })
    )
  )

  const events: CrisisEvent[] = []
  const seen = new Set<string>()

  for (const result of results) {
    const items = result.status === 'fulfilled' ? result.value : []
    for (const event of items) {
      if (seen.has(event.id)) continue
      seen.add(event.id)
      events.push(event)
    }
  }

  const sorted = events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  setCache(CACHE_KEY, sorted, CACHE_TTL)
  return sorted
}
